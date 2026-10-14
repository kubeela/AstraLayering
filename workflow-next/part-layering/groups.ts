import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  groupStages, type GroupInput, type GroupNode, type GroupProgress, type GroupsDocument,
  type GroupStage, type GroupStageOutputs, type StepProgress, type Subject,
} from './layering-types.ts';

export async function writeAtomic(path: string, content: string | Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content);
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as Record<string, unknown>;
}

function readProgress<T>(value: unknown, name: string): StepProgress<T> {
  if (value === undefined) return { status: 'pending' };
  const item = record(value, name);
  if (!['pending', 'running', 'completed', 'failed'].includes(String(item.status))) {
    throw new Error(`${name} has an invalid status`);
  }
  if (item.status === 'completed' && item.output === undefined) throw new Error(`${name} is missing its output`);
  const progress = structuredClone(item) as StepProgress<T>;
  if (progress.status === 'running') {
    progress.status = 'pending';
    progress.message = '上次执行中断，等待续跑';
  }
  return progress;
}

function checkOutput(stage: GroupStage | 'merge', progress: StepProgress<unknown>): void {
  if (progress.status !== 'completed') return;
  const output = record(progress.output, `${stage}.output`);
  if (['outline', 'review', 'completion', 'merge'].includes(stage)) {
    if (typeof output.path !== 'string' || !output.path) throw new Error(`${stage}.output requires an SVG path`);
  } else if (stage === 'completionCheck') {
    if (output.passed !== true) throw new Error('completionCheck must pass before being completed');
  } else if (!Array.isArray(output.ids) || output.ids.some(id => typeof id !== 'string')) {
    throw new Error(`${stage}.output requires group ids`);
  }
}

export function normalizeGroups(values: unknown, seen = new Set<string>()): GroupNode[] {
  if (!Array.isArray(values)) throw new Error('groups must be an array');
  return values.map(value => {
    const raw = record(value, 'group');
    const input: Record<string, unknown> = { ...raw, id: raw.id ?? raw.name };
    if (typeof input.id !== 'string' || !/^[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u.test(input.id)) {
      throw new Error('group requires a name or id with safe filename segments');
    }
    if (seen.has(input.id)) throw new Error(`Duplicate group id: ${input.id}`);
    seen.add(input.id);
    for (const field of ['name', 'note']) {
      if (input[field] !== undefined && typeof input[field] !== 'string') throw new Error(`group.${field} must be a string`);
    }
    if (input.metadata !== undefined) record(input.metadata, 'group.metadata');
    const rawSteps = input.steps === undefined ? {} : record(input.steps, 'group.steps');
    const steps = Object.fromEntries(groupStages.map(stage => {
      const progress = readProgress(rawSteps[stage], `${input.id}.${stage}`);
      checkOutput(stage, progress);
      return [stage, progress];
    })) as GroupProgress;
    const group: GroupNode = {
      id: input.id,
      ...(input.name !== undefined ? { name: input.name as string } : {}),
      ...(input.note !== undefined ? { note: input.note as string } : {}),
      ...(input.metadata !== undefined ? { metadata: structuredClone(input.metadata) as Record<string, unknown> } : {}),
      groups: normalizeGroups(input.groups ?? [], seen), steps,
    };
    if (group.groups.length && rawSteps.children === undefined) {
      steps.children = { status: 'completed', output: { ids: group.groups.map(child => child.id) } };
    }
    if (group.groups.length && steps.children.status !== 'completed') {
      throw new Error(`${group.id}: registered children require a completed split`);
    }
    if (steps.children.status === 'completed' &&
        JSON.stringify(steps.children.output!.ids) !== JSON.stringify(group.groups.map(child => child.id))) {
      throw new Error(`${group.id}: completed child ids do not match its groups`);
    }
    return group;
  });
}

export function walkGroups(groups: GroupNode[], depth = 0, parent?: GroupNode): {
  group: GroupNode; depth: number; parent?: GroupNode;
}[] {
  return groups.flatMap(group => [
    { group, depth, parent }, ...walkGroups(group.groups, depth + 1, group),
  ]);
}

export function checkSubject(subject: unknown): void {
  if (subject !== undefined && subject !== 'character' && subject !== 'other') {
    throw new Error('subject must be character or other');
  }
}

export function findGroup(document: GroupsDocument, id: string): GroupNode {
  const entry = walkGroups(document.groups).find(entry => entry.group.id === id);
  if (!entry) throw new Error(`Unknown group: ${id}`);
  return entry.group;
}

export function groupCompleted(group: GroupNode): boolean {
  return groupStages.every(stage => group.steps[stage].status === 'completed');
}

export function setGroupProgress<S extends GroupStage>(
  group: GroupNode, stage: S, progress: StepProgress<GroupStageOutputs[S]>,
): void {
  Object.assign(group.steps, { [stage]: progress });
}

export class GroupStore {
  readonly path: string;
  readonly progressPath: string;
  private document: GroupsDocument;
  private writes = Promise.resolve();
  private savedGroups?: string;

  private constructor(path: string, progressPath: string, document: GroupsDocument, savedGroups?: string) {
    this.path = path;
    this.progressPath = progressPath;
    this.document = document;
    this.savedGroups = savedGroups;
  }

  static async open(directory: string): Promise<GroupStore> {
    const path = join(directory, 'groups.json');
    const progressPath = join(directory, 'progress.json');
    const input = await readDocument(path) ?? { groups: [] };
    if (input.version !== undefined && input.version !== 1) throw new Error('Unsupported groups document version');
    // 兼容原来混合存储的文件；只保留实际组与步骤，不再读取首次完成标记。
    const legacy = 'initial' in input || 'merge' in input;
    const progress = legacy ? input : await readDocument(progressPath) ?? {};
    if (progress.version !== undefined && progress.version !== 1) throw new Error('Unsupported progress document version');
    const groups = legacy ? normalizeGroups(input.groups) : restoreProgress(input.groups, progress.groups);
    const document: GroupsDocument = {
      version: 1,
      ...(input.subject !== undefined ? { subject: input.subject as Subject } : {}),
      groups,
      merge: readProgress(progress.merge, 'merge'),
    };
    checkOutput('merge', document.merge);
    checkSubject(document.subject);
    if (document.merge.status === 'completed' &&
        (!groups.length || !walkGroups(groups).every(entry => groupCompleted(entry.group)))) {
      if (legacy) throw new Error('Completed merge requires groups and completed group steps');
      document.merge = { status: 'pending' };
    }
    const savedGroups = JSON.stringify(input) === JSON.stringify(groupStructure(document)) ? serialize(input) : undefined;
    const store = new GroupStore(path, progressPath, document, savedGroups);
    if (legacy || Object.hasOwn(progress, 'initial')) await store.update(() => {});
    return store;
  }

  snapshot(): GroupsDocument { return structuredClone(this.document); }

  // 工具与调度器共用队列；各文件以临时文件 + rename 保存。
  update(change: (document: GroupsDocument) => void): Promise<void> {
    const write = this.writes.then(async () => {
      const draft = this.snapshot();
      change(draft);
      const groups = serialize(groupStructure(draft));
      await writeAtomic(this.progressPath, serialize({
        version: 1,
        groups: Object.fromEntries(walkGroups(draft.groups).map(({ group }) => [group.id, group.steps])),
        merge: draft.merge,
      }));
      if (groups !== this.savedGroups) await writeAtomic(this.path, groups);
      this.savedGroups = groups;
      this.document = draft;
    });
    this.writes = write.catch(() => {});
    return write;
  }
}

async function readDocument(path: string): Promise<Record<string, unknown> | undefined> {
  try { return record(JSON.parse(await readFile(path, 'utf8')), path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

function serialize(value: unknown): string { return JSON.stringify(value, null, 2) + '\n'; }

function groupStructure(document: GroupsDocument) {
  function tree(groups: GroupNode[]): GroupInput[] {
    return groups.map(({ steps, groups: children, ...group }) => ({ ...group, groups: tree(children) }));
  }
  return { ...(document.subject !== undefined ? { subject: document.subject } : {}), groups: tree(document.groups) };
}

function restoreProgress(values: unknown, value: unknown): GroupNode[] {
  const groups = normalizeGroups(values);
  const progress = value === undefined ? {} : record(value, 'progress.groups');
  function restore(nodes: GroupNode[]): GroupInput[] {
    return nodes.map(group => {
      const saved = Object.hasOwn(progress, group.id) ? progress[group.id] : undefined;
      if (saved === undefined) return { ...group, groups: restore(group.groups) };
      const steps = { ...record(saved, `${group.id}.steps`) };
      const children = steps.children === undefined ? undefined : record(steps.children, `${group.id}.children`);
      if (children?.status === 'completed' && JSON.stringify(record(children.output, 'children.output').ids) !==
          JSON.stringify(group.groups.map(child => child.id))) {
        // 进度比树先落盘时，不把未登记的子组当成已登记。
        delete steps.children;
      }
      return { ...group, groups: restore(group.groups), steps: steps as Partial<GroupProgress> };
    });
  }
  return normalizeGroups(restore(groups));
}

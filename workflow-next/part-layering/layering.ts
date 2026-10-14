import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  checkSubject, findGroup, groupCompleted, GroupStore, normalizeGroups,
  setGroupProgress, walkGroups, writeAtomic,
} from './groups.ts';
import { mergeSvgPlaceholder } from './layering-steps.ts';
import type {
  GroupContext, GroupInput, GroupNode, GroupsDocument, GroupSeed, GroupStage,
  GroupStageOutputs, LayeringResult, LayeringSteps, StepResult, SvgArtifact, SvgMerger,
} from './layering-types.ts';
import type { PreparationReferences } from './preparation.ts';
import { runWorkflow } from './workflow.ts';

const labels = {
  outline: '组轮廓与自检', review: '外轮廓与去噪 review', completion: '直接遮挡补形',
  completionCheck: '补形自检', children: '子组分析',
};

export class GroupExecutionError extends Error {
  readonly groupId: string;
  readonly stage: GroupStage;
  groups: GroupNode[] = [];
  statePath?: string;

  constructor(groupId: string, stage: GroupStage, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`[${groupId}] ${labels[stage]}失败：${reason}`, { cause });
    this.name = 'GroupExecutionError';
    this.groupId = groupId;
    this.stage = stage;
  }
}

async function svgBytes(directory: string, artifact: SvgArtifact): Promise<Buffer> {
  if (!artifact || typeof artifact.path !== 'string' || !artifact.path) throw new Error('SVG output requires a path');
  const path = resolve(directory, artifact.path);
  const bytes = await readFile(path);
  if (!/<svg[\s>]/.test(bytes.toString('utf8'))) throw new Error(`Invalid SVG output: ${path}`);
  return bytes;
}

async function saveSvg(directory: string, artifact: SvgArtifact, outputPath: string): Promise<SvgArtifact> {
  const bytes = await svgBytes(directory, artifact);
  if (resolve(directory, artifact.path) !== outputPath) await writeAtomic(outputPath, bytes);
  return { ...artifact, path: outputPath };
}

function proposal(output: { groups: GroupSeed[] }, document: GroupsDocument): GroupNode[] {
  if (!output || !Array.isArray(output.groups)) throw new Error('Group proposal requires a groups array');
  if ('parts' in output) throw new Error('Agent grouping proposals must contain groups, not parts');
  for (const group of output.groups) {
    if (!group || typeof group !== 'object' || 'groups' in group || 'steps' in group || 'parts' in group ||
        ('kind' in group && group.kind === 'part') || ('type' in group && group.type === 'part')) {
      throw new Error('Agent proposals must contain direct group seeds without children or progress');
    }
  }
  return normalizeGroups(output.groups, new Set(walkGroups(document.groups).map(entry => entry.group.id)));
}

export async function runLayering(input: {
  directory: string;
  references: PreparationReferences;
  groups: GroupInput | GroupInput[] | null;
  steps: LayeringSteps;
  mergeSvg?: SvgMerger;
  concurrency?: number;
  maxDepth?: number;
  progress?: (message: string) => void;
}): Promise<LayeringResult> {
  const directory = resolve(input.directory);
  const store = await GroupStore.open(directory);
  const report = input.progress ?? (() => {});
  const initialContext = { directory, references: input.references, store };
  let selected: Set<string> | undefined;
  const ancestors = new Set<string>();

  function selectedScope(entries: ReturnType<typeof walkGroups>): Set<string> | undefined {
    const scope = selected ? new Set(selected) : undefined;
    if (scope) {
      for (const entry of entries) if (entry.parent && scope.has(entry.parent.id)) scope.add(entry.group.id);
    }
    return scope;
  }

  function context(id: string): GroupContext {
    const entry = walkGroups(store.snapshot().groups).find(entry => entry.group.id === id);
    if (!entry) throw new Error(`Unknown group: ${id}`);
    return { ...initialContext, group: entry.group, parent: entry.parent };
  }

  function artifact(id: string, stage: 'outline' | 'review' | 'completion'): SvgArtifact {
    const progress = findGroup(store.snapshot(), id).steps[stage];
    if (progress.status !== 'completed' || !progress.output) throw new Error(`${id}.${stage} is not completed`);
    return { ...progress.output, path: resolve(directory, progress.output.path) };
  }

  function outputPath(id: string, stage: 'outline' | 'completion'): string {
    return stage === 'completion'
      ? join(directory, 'parts', `${id}.svg`)
      : join(directory, 'stages', stage, `${id}.svg`);
  }

  async function initialize(groups: GroupInput | GroupInput[] | null): Promise<void> {
    if (groups !== null) {
      const requested = normalizeGroups(Array.isArray(groups) ? groups : [groups]);
      if (!requested.length) throw new Error('显式 groups 不能为空；自动流程请使用 null');
      const saved = walkGroups(store.snapshot().groups);
      if (!saved.length) throw new Error('显式 groups 需要本次运行已有的分组结果；请先使用默认流程完成首次分组');
      for (const entry of walkGroups(requested)) {
        const existing = saved.find(item => item.group.id === entry.group.id);
        if (!existing) throw new Error(`指定组尚未登记：${entry.group.id}`);
        if (entry.parent && existing.parent?.id !== entry.parent.id) throw new Error(`指定组父子关系与已有分组不符：${entry.group.id}`);
      }
      selected = new Set(requested.map(group => group.id));
      const byId = new Map(saved.map(entry => [entry.group.id, entry]));
      for (const id of selected) {
        const incomplete: string[] = [];
        let parent = byId.get(id)!.parent;
        while (parent) {
          ancestors.add(parent.id);
          if (!groupCompleted(parent)) incomplete.push(parent.id);
          parent = byId.get(parent.id)!.parent;
        }
        if (incomplete.length) throw new Error(`指定组 ${id} 的祖先组尚未完成：${incomplete.join(', ')}；请先完成这些组`);
      }
      for (const path of [input.references.judgment, input.references.simplifiedSubject, input.references.baseSubject]) {
        try {
          if (!(await stat(resolve(directory, path))).isFile()) throw new Error('不是文件');
        } catch (error) { throw new Error(`显式 groups 缺少前置参考：${path}`, { cause: error }); }
      }
      report(`指定分组：${[...selected].join(', ')}；沿用本次运行的分组与进度`);
    } else if (store.snapshot().groups.length) {
      report('首次分组：沿用已有结果');
    } else {
      report('首次分组：开始');
      const result = await input.steps.initialGroups(initialContext);
      if (result.status === 'pending') {
        report(result.message);
      } else {
        await store.update(document => {
          // write_groups 已通过同一个 store 登记；其他适配器仍可返回提案。
          if (!document.groups.length) {
            const groups = proposal(result.output, document);
            if (!groups.length) throw new Error('Initial grouping must contain at least one group');
            document.groups.push(...groups);
          }
          if (result.output.subject !== undefined) document.subject = result.output.subject;
          checkSubject(document.subject);
          document.merge = { status: 'pending' };
        });
        report('首次分组：完成');
      }
    }

    // 只检查已登记产物是否存在，不进行视觉检查或触发 agent 返修。
    const document = store.snapshot();
    const entries = walkGroups(document.groups);
    const scope = selectedScope(entries);
    for (const { group } of entries) {
      if (scope && !scope.has(group.id) && !ancestors.has(group.id)) continue;
      for (const stage of ['outline', 'review', 'completion'] as const) {
        const progress = group.steps[stage];
        if (progress.status === 'completed') {
          try { await svgBytes(directory, progress.output!); }
          catch (error) { throw new GroupExecutionError(group.id, stage, error); }
        }
      }
    }
    if (document.merge.status === 'completed') await svgBytes(directory, document.merge.output!);
  }

  async function execute<S extends GroupStage>(
    id: string, stage: S, action: () => Promise<StepResult<GroupStageOutputs[S]>>,
    commit?: (document: GroupsDocument) => void,
  ): Promise<boolean> {
    if (findGroup(store.snapshot(), id).steps[stage].status === 'completed') {
      report(`[${id}] ${labels[stage]}：跳过已完成步骤`);
      return true;
    }
    await store.update(document => {
      setGroupProgress(findGroup(document, id), stage, { status: 'running', updatedAt: new Date().toISOString() });
    });
    report(`[${id}] ${labels[stage]}：开始`);
    try {
      const result = await action();
      await store.update(document => {
        const group = findGroup(document, id);
        if (result.status === 'completed') {
          commit?.(document);
          setGroupProgress(group, stage, { status: 'completed', output: result.output, updatedAt: new Date().toISOString() });
          document.merge = { status: 'pending' };
        } else {
          setGroupProgress(group, stage, { status: 'pending', message: result.message });
        }
      });
      report(`[${id}] ${labels[stage]}：${result.status === 'completed' ? '完成' : result.message}`);
      return result.status === 'completed';
    } catch (error) {
      await store.update(document => {
        setGroupProgress(findGroup(document, id), stage, { status: 'failed', message: String(error) });
      });
      throw new GroupExecutionError(id, stage, error);
    }
  }

  async function drawing(
    id: string, stage: 'outline' | 'completion',
    action: (path: string) => Promise<StepResult<SvgArtifact>>,
  ): Promise<boolean> {
    return execute(id, stage, async () => {
      const path = outputPath(id, stage);
      await mkdir(dirname(path), { recursive: true });
      const result = await action(path);
      return result.status === 'pending' ? result : {
        status: 'completed', output: await saveSvg(directory, result.output, path),
      };
    });
  }

  async function runRound(id: string): Promise<void> {
    if (!await drawing(id, 'outline', outputPath => input.steps.drawOutline({ ...context(id), outputPath }))) return;
    if (!await execute(id, 'review', async () => {
      const outline = artifact(id, 'outline');
      const result = await input.steps.reviewOutline({ ...context(id), outline,
        reportPath: join(directory, 'stages', 'review', `${id}.review.json`) });
      if (result.status === 'pending') return result;
      if (resolve(directory, result.output.path) !== outline.path) {
        throw new Error('review 只能引用当前组的轮廓 SVG，不能产出新 SVG');
      }
      await svgBytes(directory, outline);
      return { status: 'completed', output: { ...result.output, path: outline.path } };
    })) return;
    if (!await drawing(id, 'completion', outputPath => input.steps.completeOcclusion({ ...context(id), outputPath, reviewed: artifact(id, 'review') }))) return;
    if (!await execute(id, 'completionCheck', async () => {
      const result = await input.steps.checkCompletion({ ...context(id), before: artifact(id, 'review'), after: artifact(id, 'completion') });
      if (result.status === 'completed' && result.output.passed !== true) throw new Error(`${id}: completion check did not pass`);
      return result;
    })) return;

    let children: GroupSeed[] = [];
    await execute(id, 'children', async () => {
      const result = await input.steps.splitChildren({ ...context(id), completed: artifact(id, 'completion') });
      if (result.status === 'pending') return result;
      // 验证在提交事务中再执行，避免其他并发组刚登记的 ID 被重复使用。
      children = result.output.groups;
      if (!Array.isArray(children)) throw new Error('Child proposal requires a groups array');
      return { status: 'completed', output: { ids: children.map(group => group.id) } };
    }, document => {
      const group = findGroup(document, id);
      if (group.groups.length) throw new Error(`${id}: children are already registered without a completed split`);
      group.groups = proposal({ groups: children }, document);
    });
  }

  try {
    await runWorkflow<GroupInput>(input.groups, {
      initialize,
      async ready() {
        const entries = walkGroups(store.snapshot().groups);
        const scope = selectedScope(entries);
        const completedAncestors = new Set<string>();
        const ready = [];
        // walkGroups 按父节点在前遍历；只有整条祖先链完成才放行当前组。
        for (const entry of entries) {
          if (entry.parent && !completedAncestors.has(entry.parent.id)) continue;
          if (groupCompleted(entry.group)) completedAncestors.add(entry.group.id);
          else if (!scope || scope.has(entry.group.id)) {
            ready.push({ id: entry.group.id, group: entry.group, depth: entry.depth });
          }
        }
        return ready;
      },
      runRound: group => runRound(group.id),
    }, { concurrency: input.concurrency, maxDepth: input.maxDepth });
  } catch (error) {
    if (error instanceof GroupExecutionError) {
      error.groups = store.snapshot().groups;
      error.statePath = store.progressPath;
    }
    throw error;
  } finally { await input.steps.close?.(); }

  const document = store.snapshot();
  if (document.groups.length && walkGroups(document.groups).every(entry => groupCompleted(entry.group))) {
    if (document.merge.status !== 'completed') {
      // 合并依赖整棵树，显式分支之外的缓存产物也在此时校验。
      for (const { group } of walkGroups(document.groups)) await svgBytes(directory, group.steps.completion.output!);
      await store.update(draft => { draft.merge = { status: 'running', updatedAt: new Date().toISOString() }; });
      try {
        const result = await (input.mergeSvg ?? mergeSvgPlaceholder)({
          directory, outputPath: join(directory, 'character.svg'), groups: document.groups,
          parts: walkGroups(document.groups).map(({ group }) => ({ groupId: group.id, svg: artifact(group.id, 'completion') })),
        });
        const output = result.status === 'completed' ? await saveSvg(directory, result.output, join(directory, 'character.svg')) : undefined;
        await store.update(draft => {
          draft.merge = result.status === 'completed'
            ? { status: 'completed', output: output!, updatedAt: new Date().toISOString() }
            : { status: 'pending', message: result.message };
        });
        report(result.status === 'completed' ? '程序 SVG 合并：完成' : result.message);
      } catch (error) {
        await store.update(draft => { draft.merge = { status: 'failed', message: String(error) }; });
        throw error;
      }
    } else report('程序 SVG 合并：沿用已有结果');
  }

  const final = store.snapshot();
  return {
    status: final.merge.status === 'completed' ? 'completed' : 'pending',
    statePath: store.progressPath, groupsPath: store.path, groups: final.groups,
    ...(final.merge.status === 'completed' ? { output: resolve(directory, final.merge.output!.path) } : {}),
  };
}

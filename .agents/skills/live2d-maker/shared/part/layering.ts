import { formatAgentError } from '../codex/diagnostics.ts';
import type { PartProfile } from './profile.ts';
import { lstat, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { checkSubject, findGroup, groupCompleted, GroupStore, nodeSeed, normalizeGroups, setGroupProgress, walkGroups, writeAtomic } from './groups.ts';
import { artifactPath, draftPath, stepDraftPath, mergeSourceHash, publishSvg, readReviewReport, readSvg, reportPath, reviewedArtifact, svgHash } from './artifact-facts.ts';
import { mergePartSvgs } from './merge-svg.ts';
import { publishDepthPreview } from './depth-preview.ts';
import { groupStages, type GroupContext, type GroupInput, type GroupNode, type GroupSeed, type GroupStage, type GroupStageOutputs, type LayeringResult, type LayeringSteps, type StepResult, type SvgArtifact, type SvgMerger } from './layering-types.ts';
import type { PreparationReferences } from './preparation-types.ts';
import { runWorkflow, validateWorkflowOptions } from './workflow.ts';
import { validateGroupSvg } from './svg-tools.ts';
import { assertCompletionPreserves } from './completion-svg.ts';
import { occlusionPath, occlusionSourceHash, restoreOcclusionPlan, validateOcclusionPlan } from './occlusion-plan.ts';
import { completionReferenceGroups, dependenciesMatch } from './completion-inputs.ts';
import { beginStep, checkStep, completeStep, readStep, resetStep, runningInputs, type ChainStep, type StepCheck } from '../step-chain.ts';
import { taskRootOf } from '../task-paths.ts';
import { groupStep, groupStepId, groupSteps, layerStep, parentGroupId, readChildren, readGroupTree, readInitialGroups } from './part-steps.ts';
import { partSteps } from '../step-paths.js';
import { layeringEntries } from './preparation-cache.ts';

const labels = { outline: '组轮廓与自检', review: '外轮廓与去噪 review', reduction: '同层轮廓去重',
  completion: '直接遮挡补形', completionCheck: '补形自检', children: '子组分析' };

export class GroupExecutionError extends Error {
  groups: GroupNode[] = [];
  statePath?: string;
  readonly groupId: string;
  readonly stage: GroupStage;
  constructor(groupId: string, stage: GroupStage, cause: unknown) {
    super(`[${groupId}] ${labels[stage]}失败：${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = 'GroupExecutionError';
    this.groupId = groupId;
    this.stage = stage;
  }
}

function proposal(output: { groups: GroupSeed[] }, seen: Set<string>, allowParts = false): GroupNode[] {
  if (!output || !Array.isArray(output.groups) || 'parts' in output) throw new Error('分组提案必须只包含直属 groups');
  for (const group of output.groups) {
    if (!group || typeof group !== 'object' || 'groups' in group || 'steps' in group || 'parts' in group ||
      (!allowParts && group.kind === 'part') || 'type' in group) {
      throw new Error('Agent proposals must contain direct group seeds without children or progress');
    }
  }
  return normalizeGroups(output.groups, new Set(seen));
}

// Every unit of work is a step directory (part-steps.ts). Steps are checked
// lazily in topological order as the tree grows: a step whose inputs (the
// stamps of the outputs it reads) are unchanged and whose outputs are intact is
// kept; one interrupted against the same inputs continues with its drafts and
// session; anything else is reset, which drops its session, and rerun.
export async function runLayering(input: {
  profile?: PartProfile; directory: string; references: PreparationReferences; groups: GroupInput | GroupInput[] | null;
  steps: LayeringSteps; mergeSvg?: SvgMerger; maxDepth?: number;
  progress?: (message: string) => void;
}): Promise<LayeringResult> {
  validateWorkflowOptions(input);
  const directory = resolve(input.directory);
  const store = await GroupStore.open(directory);
  // 即使本次没有新工作，也将由步骤记录重建的树落盘。
  await store.update(() => {});
  const report = input.progress ?? (() => {});
  const initial = { profile: input.profile, directory, references: input.references, store };
  const promptsDirectory = input.profile?.promptsDirectory;
  const statePath = directory;
  let selected: Set<string> | undefined;
  let completedOcclusion: string | undefined;
  // directory is the part section directory, which sits in the task root.
  const root = taskRootOf(directory);
  const lookup = (id: string): ChainStep => ({ id, root, directory: join(directory, id), dependsOn: [] });

  function context(id: string): GroupContext {
    const entry = walkGroups(store.snapshot().groups).find(entry => entry.group.id === id);
    if (!entry) throw new Error(`Unknown group: ${id}`);
    return { ...initial, group: entry.group, parent: entry.parent };
  }
  function scope(): Set<string> | undefined {
    if (!selected) return;
    const result = new Set(selected);
    for (const entry of walkGroups(store.snapshot().groups)) if (entry.parent && result.has(entry.parent.id)) result.add(entry.group.id);
    return result;
  }
  // Ids a children split of `id` must not reuse: everything outside its own subtree.
  function seenOutside(id: string): Set<string> {
    return new Set(walkGroups(store.snapshot().groups).map(entry => entry.group.id).filter(other => !other.startsWith(`${id}/`)));
  }
  function artifact(id: string, stage: 'outline' | 'review' | 'reduction' | 'completion'): SvgArtifact {
    const saved = context(id).group.steps[stage];
    if (saved.status !== 'completed' || !saved.output) throw new Error(`${id}.${stage} is not completed`);
    return saved.output;
  }
  async function guard<T>(id: string, stage: GroupStage, action: () => Promise<T>): Promise<T> {
    try { return await action(); }
    catch (error) { throw error instanceof GroupExecutionError ? error : new GroupExecutionError(id, stage, error); }
  }
  async function resetProgress(id: string, from: GroupStage) {
    const stages = groupStages.slice(groupStages.indexOf(from));
    await store.update(document => {
      Object.assign(findGroup(document, id).steps, Object.fromEntries(stages.map(stage => [stage, { status: 'pending' }])));
    });
  }
  async function completed<S extends GroupStage>(id: string, stage: S, output: GroupStageOutputs[S]) {
    await store.update(document => setGroupProgress(findGroup(document, id), stage, { status: 'completed', output }));
  }
  // Starts a step that is not kept; a rerun first removes its directory and outputs.
  async function begin(step: ChainStep, check: StepCheck) {
    if (check.action === 'rerun') {
      await rm(join(directory, 'agents', 'steps', step.id), { recursive: true, force: true });
      await resetStep(step);
    }
    await beginStep(step.directory, check.inputs);
  }
  async function execute<S extends GroupStage>(id: string, stage: S, action: () => Promise<StepResult<GroupStageOutputs[S]>>): Promise<boolean> {
    await store.update(document => setGroupProgress(findGroup(document, id), stage, { status: 'running' }));
    report(`[${id}] ${labels[stage]}：开始`);
    try {
      const result = await action();
      await store.update(document => setGroupProgress(findGroup(document, id), stage, result.status === 'completed'
        ? { status: 'completed', output: result.output } : { status: 'pending', message: result.message }));
      report(`[${id}] ${labels[stage]}：${result.status === 'completed' ? '完成' : result.message}`);
      return result.status === 'completed';
    } catch (error) {
      await store.update(document => setGroupProgress(findGroup(document, id), stage, { status: 'failed', message: formatAgentError(error) }));
      report(`[${id}] ${labels[stage]}：失败，等待已启动任务收尾：${formatAgentError(error)}`);
      throw new GroupExecutionError(id, stage, error);
    }
  }
  // A continued step (继续 / 恢复 keep the products) hands its draft back to the
  // agent; only a fresh or rerun step starts from an empty draft.
  async function drawing(id: string, stage: 'outline' | 'completion', continued: boolean,
    action: (draft: string, resumeDraft: boolean) => Promise<StepResult<SvgArtifact>>) {
    return execute(id, stage, async () => {
      const output = artifactPath(directory, id, stage), draft = stepDraftPath(directory, id, stage);
      const before = stage === 'completion' ? (await readSvg(artifact(id, 'reduction').path))! : undefined;
      await mkdir(dirname(draft), { recursive: true });
      if (continued && !await readSvg(draft)) {
        const legacy = await readSvg(output.replace(/\.svg$/, '.draft.svg'));
        if (legacy) await writeAtomic(draft, legacy);
      }
      const resumeDraft = continued && !!await readSvg(draft);
      if (!resumeDraft) await rm(draft, { force: true });
      if (resumeDraft) report(`[${id}] ${labels[stage]}：沿用上次的草稿继续`);
      const result = await action(draft, resumeDraft);
      if (result.status === 'pending') return result;
      const candidate = resolve(directory, result.output.path);
      const meta = await sharp(resolve(directory, input.references.baseSubject)).metadata();
      await validateGroupSvg(candidate, id, { width: meta.autoOrient.width, height: meta.autoOrient.height }, undefined,
        stage !== 'completion' || !context(id).group.hiddenInReference);
      const parent = context(id).parent?.steps.completion.output?.path;
      const source = stage === 'completion' ? artifact(id, 'reduction').path : parent;
      if (before) {
        if (!(await readFile(source!)).equals(before)) throw new Error('补全过程修改了原轮廓');
        assertCompletionPreserves(before.toString(), (await readFile(candidate)).toString());
      }
      if (stage === 'completion' && !await dependenciesMatch(root, result.output.dependencies ?? [])) {
        throw new Error('补全输入已变化，不能发布');
      }
      if (candidate !== draft) await writeAtomic(draft, await readFile(candidate));
      await publishSvg(draft, output, source ? svgHash((await readSvg(source))!) : undefined);
      return { status: 'completed', output: { ...result.output, path: output } };
    });
  }
  // step01: outline + review.
  async function prepare(id: string, run: boolean) {
    const step = groupStep(directory, id, 'outline');
    let check = await guard(id, 'outline', () => checkStep(step, lookup));
    const outline = artifactPath(directory, id, 'outline');
    const hidden = context(id).group.hiddenInReference === true;
    const previousOutline = await readSvg(outline);
    // A visibility change switches between observed outlines and an empty source.
    // Old untagged steps keep their existing markers and review history.
    if (previousOutline && hidden !== previousOutline.toString().includes('data-hidden-in-reference="true"')) check = { ...check, action: 'rerun' };
    if (check.action === 'keep') return;
    await resetProgress(id, 'outline');
    if (!run) return;
    await begin(step, check);
    if (hidden) {
      const meta = await sharp(resolve(directory, input.references.baseSubject)).metadata();
      const width = meta.autoOrient.width, height = meta.autoOrient.height;
      // This is an empty input for completion, not a fabricated drawing or review.
      await writeAtomic(outline, `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-hidden-in-reference="true"><g id="source" data-group-path="${id}"/></svg>\n`);
      const output = { path: outline, note: '原图不可见：跳过描边和轮廓 review，以空底稿直接补全' };
      await completed(id, 'outline', output);
      await completed(id, 'review', output);
      await completeStep(step, lookup);
      report(`[${id}] 原图不可见：跳过描边和轮廓 review，直接补全`);
      return;
    }
    if (check.action === 'continue' && await readSvg(outline)) await completed(id, 'outline', { path: outline });
    else if (!await drawing(id, 'outline', check.action === 'continue',
      (outputPath, resumeDraft) => input.steps.drawOutline({ ...context(id), outputPath, resumeDraft }))) return;
    if (!await execute(id, 'review', async () => {
      const outline = artifact(id, 'outline');
      const path = reportPath(directory, id, 'review');
      const result = await input.steps.reviewOutline({ ...context(id), outline, reportPath: path });
      if (result.status === 'pending') return result;
      if (resolve(result.output.path) !== outline.path) throw new Error('review 只能引用当前组的轮廓 SVG，不能产出新 SVG');
      const verified = reviewedArtifact((await readSvg(outline.path))!, outline.path, await readReviewReport(path, id));
      if (!verified) throw new Error('review 未保存与当前 SVG 对应的完成事实');
      return { status: 'completed', output: verified };
    })) return;
    await guard(id, 'review', () => completeStep(step, lookup));
  }
  // step10_reduce/depthNN: one reduction over every outline at that depth. It is reopened
  // in place; a group whose outline is unchanged keeps its current reduction, and
  // only the outputs whose bytes change rerun the completions that read them.
  async function reduce(depth: number, entries: ReturnType<typeof walkGroups>): Promise<boolean> {
    const ids = entries.map(entry => entry.group.id);
    const step = layerStep(directory, depth, ids);
    const check = await checkStep(step, lookup);
    const finished = () => store.update(document => {
      for (const id of ids) setGroupProgress(findGroup(document, id), 'reduction', { status: 'completed', output: { path: artifactPath(directory, id, 'reduction') } });
    });
    if (check.action === 'keep') { await finished(); return true; }
    report(`第 ${depth} 层轮廓去重：开始`);
    const previous = (check.status === 'running' ? await runningInputs(step.directory) : undefined) ?? check.record?.inputs ?? {};
    await beginStep(step.directory, check.inputs);
    const wanted = new Set(ids.map(id => artifactPath(directory, id, 'reduction')));
    for (const name of await readdir(step.directory, { recursive: true })) {
      if (name.endsWith('.svg') && !wanted.has(join(step.directory, name))) await rm(join(step.directory, name), { force: true });
    }
    await store.update(document => { for (const id of ids) setGroupProgress(findGroup(document, id), 'reduction', { status: 'running' }); });
    const inputs = await Promise.all(entries.map(async entry => {
      const id = entry.group.id, outline = groupStepId(id, 'outline');
      const bytes = (await readSvg(artifactPath(directory, id, 'outline')))!;
      const output = artifactPath(directory, id, 'reduction'), draft = stepDraftPath(directory, id, 'reduction');
      await mkdir(dirname(draft), { recursive: true });
      await rm(draft, { force: true });
      const current = previous[outline] === check.inputs[outline] && await readSvg(output) ? { path: output } : undefined;
      return { ...entry, bytes, output, draft, current };
    }));
    const visible = inputs.filter(entry => !entry.group.hiddenInReference);
    const result = visible.length <= 1 ? { status: 'completed' as const, output: { changed: [], note: '本层可见组不足两个，无跨组轮廓去重' } }
      : input.steps.reduceOutlines ? await input.steps.reduceOutlines({ ...initial, depth,
        entries: visible.map(entry => ({ group: context(entry.group.id).group, parent: context(entry.group.id).parent,
          outline: artifact(entry.group.id, 'outline'), current: entry.current, outputPath: entry.draft })) })
        : { status: 'pending' as const, message: '同层轮廓去重：待接入' };
    if (result.status === 'pending') { report(result.message); return false; }
    if (!Array.isArray(result.output.changed)) throw new Error('去重结果必须包含 changed');
    const changes = new Map<string, string>();
    for (const change of result.output.changed) {
      const entry = inputs.find(entry => entry.group.id === change.groupId);
      if (!entry || entry.group.hiddenInReference || changes.has(change.groupId) || typeof change.path !== 'string') throw new Error('去重结果须指定本层可见组及其 SVG，同一组提交一次');
      changes.set(change.groupId, resolve(directory, change.path));
    }
    // 整批检查后再发布；完成标记最后落盘，部分输出不构成完成。
    const meta = changes.size ? await sharp(resolve(directory, input.references.baseSubject)).metadata() : undefined;
    for (const entry of inputs) {
      if (!(await readFile(artifactPath(directory, entry.group.id, 'outline'))).equals(entry.bytes)) throw new Error('去重修改了原轮廓');
      if (changes.has(entry.group.id)) {
        const candidate = changes.get(entry.group.id)!;
        await validateGroupSvg(candidate, entry.group.id, { width: meta!.autoOrient.width, height: meta!.autoOrient.height }, undefined, true);
        if (candidate !== entry.draft) await writeAtomic(entry.draft, await readFile(candidate));
      }
      else await writeAtomic(entry.draft, entry.current ? await readFile(entry.current.path) : entry.bytes);
    }
    // Unchanged outputs stay untouched, so nothing downstream sees a rewrite.
    for (const entry of inputs) {
      if ((await readSvg(entry.output))?.equals(await readFile(entry.draft))) await rm(entry.draft, { force: true });
      else await publishSvg(entry.draft, entry.output);
    }
    await completeStep(step, lookup);
    await finished();
    report(`第 ${depth} 层轮廓去重：完成`);
    return true;
  }
  // step02: completion + check; step03: children split.
  async function finish(id: string) {
    const step = groupStep(directory, id, 'completion', await completionReferenceGroups(id, parentGroupId(id), promptsDirectory));
    const check = await guard(id, 'completion', () => checkStep(step, lookup));
    if (check.action !== 'keep') {
      await resetProgress(id, 'completion');
      await begin(step, check);
      const reduced = artifact(id, 'reduction');
      const mask = await sharp(await readFile(reduced.path)).ensureAlpha().extractChannel('alpha').raw().toBuffer();
      // 去重删空的重复节点无需恢复；原本完全遮挡的空轮廓仍须交给补全。
      const removedByReduction = !mask.some(value => value >= 128) &&
        (await sharp(await readFile(artifact(id, 'outline').path)).ensureAlpha().extractChannel('alpha').raw().toBuffer()).some(value => value >= 128);
      const completion = artifactPath(directory, id, 'completion');
      if (check.action === 'continue' && await readSvg(completion)) await completed(id, 'completion', { path: completion });
      else if (!await drawing(id, 'completion', check.action === 'continue', async (outputPath, resumeDraft) => {
        if (removedByReduction) { await writeAtomic(outputPath, await readFile(reduced.path)); return { status: 'completed', output: { path: outputPath } }; }
        return input.steps.completeOcclusion({ ...context(id), outputPath, resumeDraft, reviewed: reduced });
      })) return;
      if (!await execute(id, 'completionCheck', async () => {
        const after = artifact(id, 'completion');
        const result = removedByReduction ? { status: 'completed' as const, output: { passed: true as const, note: '去重后为空组' } }
          : await input.steps.checkCompletion({ ...context(id), before: reduced, after });
        if (result.status === 'completed') {
          if (result.output.passed !== true) throw new Error(`${id}: completion check did not pass`);
          await writeAtomic(reportPath(directory, id, 'completion-check'), JSON.stringify({ groupId: id, ...result.output }, null, 2) + '\n');
        }
        return result;
      })) return;
      await guard(id, 'completionCheck', () => completeStep(step, lookup));
    }
    const split = groupStep(directory, id, 'children');
    const splitCheck = await guard(id, 'children', () => checkStep(split, lookup));
    if (splitCheck.action === 'keep') {
      // An interrupted rerun of step02 that reproduced the same part keeps the split;
      // the tree then lacks its children until they are read back.
      const { groups } = await guard(id, 'children', () => readChildren(directory, id));
      if (JSON.stringify(context(id).group.groups.map(child => child.id)) !== JSON.stringify(groups.map(child => child.id))) {
        const children = normalizeGroups(await Promise.all(groups.map(seed => readGroupTree(directory, seed, new Map()))), seenOutside(id));
        await store.update(document => { findGroup(document, id).groups = children; });
      }
      await completed(id, 'children', { ids: groups.map(child => child.id) });
      return;
    }
    await resetProgress(id, 'children');
    await begin(split, splitCheck);
    await execute(id, 'children', async () => {
      const completed = artifact(id, 'completion');
      const source = (await readSvg(completed.path))!;
      const completedMask = await sharp(source).ensureAlpha().extractChannel('alpha').raw().toBuffer();
      const result = context(id).group.kind === 'part' || !completedMask.some(value => value >= 128)
        ? { status: 'completed' as const, output: { groups: [] as GroupSeed[], note: undefined } }
        : await input.steps.splitChildren({ ...context(id), completed });
      if (result.status === 'pending') return result;
      if (!(await readFile(completed.path)).equals(source)) throw new Error('子组分析修改了父组完成 SVG');
      const children = proposal(result.output, seenOutside(id), true);
      if (children.some(child => !child.id.startsWith(`${id}/`) || child.id.slice(id.length + 1).includes('/'))) {
        throw new Error('子组 ID 必须是父组 ID 下的直属路径');
      }
      await writeAtomic(join(split.directory, 'children.json'), JSON.stringify({ groupId: id, groups: children.map(nodeSeed),
        ...(result.output.note ? { note: result.output.note } : {}) }, null, 2) + '\n');
      // Children kept by id keep their subtrees (their own steps decide what reruns);
      // removed children lose their step directories and parts.
      const previous = context(id).group.groups;
      for (const old of previous) if (!children.some(child => child.id === old.id)) {
        for (const step of groupSteps) await rm(join(directory, groupStepId(old.id, step)), { recursive: true, force: true });
        for (const { group } of walkGroups([old])) await rm(artifactPath(directory, group.id, 'completion'), { force: true });
      }
      await store.update(draft => {
        findGroup(draft, id).groups = children.map(child => {
          const kept = previous.find(old => old.id === child.id);
          const seed = normalizeGroups([nodeSeed(child)])[0];
          return kept ? { ...seed, groups: kept.groups, steps: kept.steps } : seed;
        });
      });
      await completeStep(split, lookup);
      return { status: 'completed', output: { ids: children.map(child => child.id) } };
    });
  }
  async function batch(entries: ReturnType<typeof walkGroups>, action: (id: string) => Promise<void>) {
    await runWorkflow(null, {
      async initialize() {}, async ready() { return entries.map(entry => ({ ...entry, id: entry.group.id })); },
      runRound: group => action(group.id),
    }, { maxDepth: input.maxDepth });
  }


  try {
    if (input.groups !== null) {
      const requested = normalizeGroups(Array.isArray(input.groups) ? input.groups : [input.groups]);
      if (!requested.length) throw new Error('显式 groups 不能为空；自动流程请使用 null');
      const existing = walkGroups(store.snapshot().groups);
      for (const entry of walkGroups(requested)) {
        const saved = existing.find(item => item.group.id === entry.group.id);
        if (!saved) throw new Error(`指定组尚未登记：${entry.group.id}`);
        if (entry.parent && saved.parent?.id !== entry.parent.id) throw new Error('指定组父子关系与已有分组不符');
      }
      selected = new Set(requested.map(group => group.id));
      const firstDepth = Math.min(...existing.filter(entry => selected!.has(entry.group.id)).map(entry => entry.depth));
      const incompletePrior = existing.filter(entry => entry.depth < firstDepth && !groupCompleted(entry.group));
      if (incompletePrior.length) throw new Error(`指定组的前层尚未全部完成：${incompletePrior.map(entry => entry.group.id).join(', ')}`);
      for (const id of selected) {
        let parent = context(id).parent;
        while (parent) {
          if (!groupCompleted(parent)) throw new Error(`指定组 ${id} 的祖先组尚未完成：${parent.id}`);
          parent = context(parent.id).parent;
        }
      }
      for (const path of [input.references.simplifiedSubject, input.references.baseSubject]) {
        if (!(await stat(resolve(directory, path))).isFile()) throw new Error(`显式 groups 缺少前置参考：${path}`);
      }
    } else {
      const step: ChainStep = { id: partSteps.initial, root, directory: join(directory, partSteps.initial), dependsOn: [], outputs: ['groups.json'] };
      const check = await checkStep(step, lookup);
      if (check.action === 'keep') report('首次分组：沿用已有结果');
      else {
        if (check.action === 'rerun') {
          // Everything else hangs off the first grouping.
          for (const entry of layeringEntries.filter(entry => entry !== partSteps.initial)) {
            await rm(join(directory, entry), { recursive: true, force: true });
          }
          await store.update(document => { document.groups = []; delete document.subject; document.merge = { status: 'pending' }; });
        }
        await begin(step, check);
        // A turn that saved its grouping before failing continues from that file.
        const saved = check.action === 'continue' && await exists(join(step.directory, 'groups.json'));
        const result = saved ? { status: 'completed' as const, output: await readInitialGroups(directory) } : await input.steps.initialGroups(initial);
        if (result.status === 'completed') {
          const groups = proposal(result.output, new Set());
          if (!groups.length) throw new Error('Initial grouping must contain at least one group');
          checkSubject(result.output.subject);
          await writeAtomic(join(step.directory, 'groups.json'), JSON.stringify({
            ...(result.output.subject !== undefined ? { subject: result.output.subject } : {}), groups: groups.map(nodeSeed) }, null, 2) + '\n');
          // The tree is what a later run rebuilds from groups.json, kinds included.
          await store.update(document => {
            document.groups = normalizeGroups(groups.map(nodeSeed));
            if (result.output.subject !== undefined) document.subject = result.output.subject;
          });
          await completeStep(step, lookup);
        } else report(result.message);
      }
    }

    for (let depth = 0; depth < (input.maxDepth ?? Infinity); depth++) {
      const entries = walkGroups(store.snapshot().groups).filter(entry => entry.depth === depth);
      if (!entries.length) break;
      // --groups only filters the work; every group of the layer is still checked.
      const selectedIds = scope();
      await batch(entries, id => prepare(id, !selectedIds || selectedIds.has(id)));
      if (entries.some(entry => context(entry.group.id).group.steps.review.status !== 'completed')) {
        report(`第 ${depth} 层仍有未完成轮廓，等待本层齐备后去重`);
        break;
      }
      try { if (!await reduce(depth, entries)) break; }
      catch (error) { throw new GroupExecutionError(`第 ${depth} 层`, 'reduction', error); }
      // Started completions whose reduced inputs changed rerun even when not selected.
      if (selected) for (const entry of entries) {
        const id = entry.group.id;
        if (scope()!.has(id)) continue;
        const step = groupStep(directory, id, 'completion', await completionReferenceGroups(id, parentGroupId(id), promptsDirectory));
        if ((await readStep(step.directory, root)).status === 'absent') continue;
        // Only completions whose inputs changed; an unfinished one is not a change.
        if ((await checkStep(step, lookup).catch(() => undefined))?.action === 'rerun') selected.add(id);
      }
      const finishIds = scope();
      const finishTargets = entries.filter(entry => !finishIds || finishIds.has(entry.group.id));
      await batch(finishTargets, finish);
      if (finishTargets.some(entry => !groupCompleted(context(entry.group.id).group))) break;
      // 下一层必须等待整层；显式选择也不会自动派发未选分支。
      if (entries.some(entry => !groupCompleted(context(entry.group.id).group))) {
        report(`第 ${depth} 层还有未完成分支，下一层等待`);
        break;
      }
    }
    const document = store.snapshot(), all = walkGroups(document.groups);
    if (all.length && all.every(entry => groupCompleted(entry.group))) {
      const step: ChainStep = { id: partSteps.merge, root, directory: join(directory, partSteps.merge), outputs: ['../preview.svg'],
        dependsOn: [...all.map(entry => groupStepId(entry.group.id, 'children')),
          ...all.filter(entry => !entry.group.groups.length).map(entry => groupStepId(entry.group.id, 'completion'))] };
      const output = join(directory, 'preview.svg');
      const check = await checkStep(step, lookup);
      if (check.action === 'keep') report('最终预览合并：沿用');
      else {
        await begin(step, check);
        const draft = draftPath(output);
        await rm(draft, { force: true });
        report('最终预览合并：开始');
        const result = await (input.mergeSvg ?? mergePartSvgs)({ directory, outputPath: draft, groups: document.groups,
          parts: all.filter(({ group }) => !group.groups.length).map(({ group }) => ({ groupId: group.id, svg: artifact(group.id, 'completion') })) });
        if (result.status === 'completed') {
          const candidate = resolve(directory, result.output.path);
          if (candidate !== draft) await writeAtomic(draft, await readFile(candidate));
          await publishSvg(draft, output, await mergeSourceHash(directory, document));
          await completeStep(step, lookup);
          report(`最终预览合并：完成 ${output}`);
        } else report(result.message);
      }
      const merged = (await readStep(step.directory, root)).status === 'completed';
      await store.update(draft => { draft.merge = merged ? { status: 'completed', output: { path: output } } : { status: 'pending' }; });
    } else if (document.merge.status !== 'pending') await store.update(draft => { draft.merge = { status: 'pending' }; });
    // 独立的最后一步。raster 会改写层级表中的深度，因此不登记产物哈希，
    // 只要 merge 未变且层级表完整、输入指纹一致就沿用。
    const merged = store.snapshot();
    if (merged.merge.status === 'completed') {
      const context = { ...initial, groups: merged.groups, preview: merged.merge.output! };
      const step: ChainStep = { id: partSteps.occlusion, root, directory: join(directory, partSteps.occlusion), dependsOn: [partSteps.merge] };
      const check = await checkStep(step, lookup);
      if (check.action === 'keep' && await restoreOcclusionPlan(context)) {
        completedOcclusion = occlusionPath(directory);
        report('遮挡层级规划：沿用完整且输入一致的独立层级表');
      } else {
        if (check.action !== 'continue') await rm(occlusionPath(directory), { force: true });
        await begin(step, check.action === 'keep' ? { ...check, action: 'rerun' } : check);
        report('遮挡层级规划：开始');
        const sourceHash = await occlusionSourceHash(context);
        const result = input.steps.planOcclusion ? await input.steps.planOcclusion(context)
          : { status: 'pending' as const, message: '遮挡层级规划：待接入' };
        if (result.status === 'completed') {
          if (await occlusionSourceHash(context) !== sourceHash) throw new Error('层级规划期间输入发生变化');
          const plan = validateOcclusionPlan(result.output, context, sourceHash);
          completedOcclusion = occlusionPath(directory);
          await writeAtomic(completedOcclusion, JSON.stringify(plan, null, 2) + '\n');
          await completeStep(step, lookup);
          report(`遮挡层级规划：完成 ${completedOcclusion}`);
        } else report(`遮挡层级规划：${result.message}`);
      }
      if (completedOcclusion) {
        const plan = JSON.parse(await readFile(completedOcclusion, 'utf8'));
        await publishDepthPreview(directory, merged.groups, plan);
      }
    }
  } catch (error) {
    if (error instanceof GroupExecutionError) { error.groups = store.snapshot().groups; error.statePath = statePath; }
    throw error;
  } finally { await input.steps.close?.(); }
  const final = store.snapshot();
  return { status: final.merge.status === 'completed' && completedOcclusion ? 'completed' : 'pending', statePath, groupsPath: store.path,
    ...(completedOcclusion ? { occlusionPath: completedOcclusion } : {}),
    groups: final.groups, ...(final.merge.status === 'completed' ? { output: final.merge.output!.path } : {}) };
}

async function exists(path: string): Promise<boolean> {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}

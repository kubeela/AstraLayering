import { groupStepId } from './part-steps.ts';
import { prepareFileInputs } from '../agents/inputs.ts';
import {renderPrompt} from '../prompts/render.ts';
import { partStep } from '../agents/models.ts';
import { agentOutcomeError } from '../codex/diagnostics.ts';
import { toolDefinition } from '../codex/tool-config.ts';
import { partProfile } from './profile.ts';
import { readFile, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import type { CodexAgents } from '../codex/agents.ts';
import { createBitmapTool } from './bitmap-tool.ts';
import { svgHash } from './artifact-facts.ts';
import { assertCompletionPreserves, composeCompletion, completionPaths } from './completion-svg.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import { readGroupPrompt, readGroupReferences } from './group-prompts.ts';
import { nodeSeed, writeAtomic } from './groups.ts';
import { dependenciesMatch, fileDependency } from './completion-inputs.ts';
import type { DrawingContext, GroupContext, SvgArtifact, CompletionCheck } from './layering-types.ts';
import { taskRootOf, toAgentPath } from '../task-paths.ts';
import { createSvgPreviewTool, createSvgReadTool, parentBoundsSource, validateGroupSvg, type SvgObservation } from './svg-tools.ts';


// 同级参考只取本层已审查、去重的只读底形，避免依赖并发补全的完成顺序。
export async function readCompletionReferences(groupDirectory: string, context?: GroupContext) {
  return readGroupReferences(groupDirectory, 'completion', context ? async (name, description) => {
    const sibling = context.parent?.groups.find(group => group.id === `${context.parent!.id}/${name}`);
    if (!sibling || sibling.id === context.group.id) throw new Error(`补全参考不是当前节点的其他直属同级：${name}`);
    const reduced = sibling.steps.reduction;
    if (reduced.status !== 'completed' || !reduced.output) throw new Error(`补全同级参考尚未完成整层去重：${sibling.id}`);
    const sourceSvg = await realpath(reduced.output.path);
    const bytes = await readFile(sourceSvg);
    const filename = `${name}.png`;
    const inputFiles = await prepareFileInputs(join(context.directory, groupStepId(context.group.id, 2)),
      [{ name: filename, content: await sharp(bytes, { limitInputPixels: 100_000_000 }).png().toBuffer() }]);
    const path = inputFiles[filename];
    return { path, description, groupId: sibling.id, sourceSvg, sourceHash: svgHash(bytes), sourceStage: 'reduction' };
  } : undefined);
}

export async function completeGroupOcclusion(context: DrawingContext & { reviewed: SvgArtifact }, agents: Pick<CodexAgents, 'run'>): Promise<SvgArtifact> {
  const profile = partProfile(context);
  const rulesPath = join(profile.promptsDirectory, '9-补全操作约定.md');
  const reference = resolve(context.directory, context.references.baseSubject);
  const meta = await sharp(reference).metadata();
  const canvas = { width: meta.autoOrient.width, height: meta.autoOrient.height };
  const sourcePath = await realpath(context.reviewed.path), source = await readFile(sourcePath);
  const draft = resolve(context.outputPath);
  if (draft === sourcePath) throw new Error('补全输出与输入 SVG 须使用不同路径，保留原形作为补全基准');
  const parent = context.parent?.steps.completion.output?.path;
  const boundsParent = parentBoundsSource(context.group, parent);
  const prompt = await readGroupPrompt(context.group.id, 'completion', profile.promptsDirectory);
  const rules = await readFile(rulesPath, 'utf8');
  if (!rules.trim()) throw new Error(`补全操作约定提示词为空：${rulesPath}`);
  const references = await readCompletionReferences(prompt.groupDirectory, context);
  const dependencies = await Promise.all([fileDependency(context.directory, reference),
    ...references.map(ref => 'sourceSvg' in ref ? fileDependency(context.directory, ref.sourceSvg,
      { groupId: ref.groupId, stage: 'reduction' }) : fileDependency(context.directory, ref.path))]);
  const root = taskRootOf(context.directory), task = (path: string) => toAgentPath(root, path);
  const observations: SvgObservation[] = [];
  let submitted: SvgArtifact | undefined, submittedHash: string | undefined;
  // A continued step keeps the additions drawn so far when they still sit on the
  // unchanged source; otherwise the draft starts as the source itself.
  const resumed = !!context.resumeDraft && await readFile(draft).then(bytes => {
    try { assertCompletionPreserves(source.toString(), bytes.toString()); return true; } catch { return false; }
  }, () => false);
  if (!resumed) await writeAtomic(draft, source);
  const preview = createSvgPreviewTool({ directory: context.directory, reference, canvas, parent: boundsParent,
    allowGeneratedReference: true,
    observationDirectory: join(context.directory, 'observations', 'completion', context.group.id),
    observed: entry => observations.push(entry) });
  async function verifySource() {
    if (!(await readFile(sourcePath)).equals(source)) throw new Error('补全过程修改了原轮廓');
  }
  const set: FunctionTool = {
    ...toolDefinition('set_completion_paths'),
    async execute(value, signal) {
      signal.throwIfAborted();
      if (submitted) throw new Error('补全已提交');
      if (!value || typeof value !== 'object' || Object.keys(value).some(key => key !== 'paths')) throw new Error('无效补全参数');
      await verifySource();
      const paths = completionPaths((value as { paths: unknown }).paths);
      await writeAtomic(draft, composeCompletion(source.toString(), paths));
      observations.length = 0; // 改过新增形状后，必须重新观察当前候选。
      await validateGroupSvg(draft, context.group.id, canvas, boundsParent, !context.group.hiddenInReference);
      return textResult({ path: await task(draft), additions: paths.length });
    },
  };
  const submit: FunctionTool = {
    ...toolDefinition('submit_completion'),
    async execute(value, signal) {
      signal.throwIfAborted();
      if (submitted) throw new Error('补全已提交');
      const raw = value as { note?: unknown };
      if (!raw || typeof raw.note !== 'string' || !raw.note.trim() || Object.keys(raw).some(key => key !== 'note')) throw new Error('须提交补全依据');
      await verifySource();
      const bytes = await validateGroupSvg(draft, context.group.id, canvas, boundsParent, !context.group.hiddenInReference);
      assertCompletionPreserves(source.toString(), bytes.toString());
      if (!observations.some(entry => entry.source === draft && entry.mode === 'blend' && !entry.reference) ||
          !observations.some(entry => entry.source === draft && entry.mode === 'svg')) throw new Error('须预览当前补全草稿与人物/衣服参考图的默认 blend 和 SVG 独显');
      const original = await realpath(reference);
      const referenceViews = observations.filter(entry => entry.source === draft && entry.reference && entry.reference !== original);
      if (context.group.hiddenInReference || referenceViews.length) {
        const shapeReferences = new Map(referenceViews.filter(entry => entry.mode === 'edge').map(entry => [entry.reference!, entry]));
        if (!shapeReferences.size) throw new Error('须用 preview_svg 的 edge、reference 与 referenceRegion 对照生成图，检查边缘一致性');
        const checkedDependencies = [];
        for (const entry of shapeReferences.values()) {
          const dependency = await fileDependency(context.directory, entry.reference!);
          if (dependency.hash !== entry.referenceHash) throw new Error('生成参考图在预览后被修改，请重新查看');
          checkedDependencies.push(dependency);
        }
        for (const dependency of checkedDependencies) if (!dependencies.some(item => item.path === dependency.path)) dependencies.push(dependency);
      }
      submitted = { path: draft, note: raw.note };
      submittedHash = svgHash(bytes);
      return textResult({ ...submitted, path: await task(draft) });
    },
  };
  const response = await agents.run({ step: partStep(partProfile(context).id, 'completion'), name: `正面遮挡补全-${context.group.id}`, cwd: context.directory, outputDirectory: join(context.directory, groupStepId(context.group.id, 2)), imageGeneration: true,
    images: [{ path: reference, description: profile.references.completion }, ...references.map(({ path, description }) => ({ path, description }))],
    tools: [preview, set, submit, createSvgReadTool(context.directory),
      createBitmapTool(context.directory, join(context.directory, 'observations', 'completion', context.group.id, 'bitmaps'))], prompt: renderPrompt(prompt.text, {prompt_source: prompt.path,
      runtime_context: JSON.stringify({
      group: nodeSeed(context.group),
      reference: await task(reference), canvas, sourceSvg: await task(sourcePath), outputDraft: await task(draft),
      additionalReferences: await Promise.all(references.map(async ref => ({ ...ref, path: await task(ref.path),
        ...('sourceSvg' in ref ? { sourceSvg: await task(ref.sourceSvg) } : {}) }))),
      parentSvg: parent ? await task(parent) : null,
      ...(resumed ? { resumedDraft: 'outputDraft 已含上次中断前补上的形状：先用 read_svg 读取、preview_svg 对照；set_completion_paths 会替换全部新增形状，需保留的已有形状要一并提交。' } : {}),
    }, null, 2),
      fixed_rules: rules,
      fixed_rules_source: rulesPath}, prompt.path, ["prompt_source","runtime_context","fixed_rules","fixed_rules_source"]) });
  if (!submitted) throw agentOutcomeError('补全未通过 submit_completion 提交', response);
  await verifySource();
  if (svgHash(await readFile(draft)) !== submittedHash) throw agentOutcomeError('补全提交后草稿被修改', response);
  if (!await dependenciesMatch(context.directory, dependencies)) throw agentOutcomeError('补全过程参考输入发生变化', response);
  return { ...submitted, dependencies };
}

export async function checkGroupCompletion(context: GroupContext & { before: SvgArtifact; after: SvgArtifact }): Promise<CompletionCheck> {
  const [before, after, meta] = await Promise.all([readFile(context.before.path), readFile(context.after.path),
    sharp(resolve(context.directory, context.references.baseSubject)).metadata()]);
  const count = assertCompletionPreserves(before.toString(), after.toString());
  await validateGroupSvg(context.after.path, context.group.id, { width: meta.autoOrient.width, height: meta.autoOrient.height },
    undefined, !context.group.hiddenInReference);
  return { passed: true, note: `程序核对：原 SVG 正文保留，${count} 条新增闭合路径位于原形下方；补形视觉自检在提交前完成。` };
}

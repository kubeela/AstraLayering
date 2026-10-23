import {renderPrompt,renderPromptFile} from '../prompts/render.ts';
import { partStep } from '../agents/models.ts';
import { agentOutcomeError, validateAgentOutcome } from '../codex/diagnostics.ts';
import { toolDefinition } from '../codex/tool-config.ts';
import { partProfile } from './profile.ts';
import { mkdir, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import type { CodexAgents } from '../codex/agents.ts';
import { createBitmapTool } from './bitmap-tool.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import { readGroupPrompt } from './group-prompts.ts';
import { findGroup, writeAtomic } from './groups.ts';
import type { DrawingContext, GroupContext, ReviewContext, ReviewedSvgArtifact, StepResult, SvgArtifact } from './layering-types.ts';
import { createSvgPreviewTool, createSvgReadTool, validateGroupSvg, type Canvas, type SvgObservation } from './svg-tools.ts';
import { completedReviewCount, draftPath, matchesHash, publishSvg, readReviewReport, svgHash as hash, type Review } from './artifact-facts.ts';

const maxOutlineReviews = 2;

async function recordRepair(output: string, feedback: string, prompt: string) {
  const directory = output.replace(/\.svg$/, '.repairs');
  await mkdir(directory, { recursive: true });
  const entries = await readdir(directory, { withFileTypes: true });
  let sequence = entries.reduce((max, entry) =>
    entry.isDirectory() && /^[1-9]\d*$/.test(entry.name) ? Math.max(max, Number(entry.name)) : max, 0) + 1;
  let attempt: string;
  while (true) {
    attempt = join(directory, String(sequence));
    try { await mkdir(attempt); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      sequence++;
    }
  }
  await writeAtomic(join(attempt, 'feedback.txt'), feedback + '\n');
  await writeAtomic(join(attempt, 'prompt.txt'), prompt);
}

async function inputs(context: GroupContext) {
  const reference = resolve(context.directory, context.references.baseSubject);
  const metadata = await sharp(reference).metadata();
  const canvas: Canvas = { width: metadata.autoOrient.width, height: metadata.autoOrient.height };
  const completion = context.parent?.steps.completion;
  if (context.parent && (completion?.status !== 'completed' || !completion.output)) {
    throw new Error(`父组 ${context.parent.id} 尚未产出完成 SVG`);
  }
  const parent = completion?.output ? await realpath(resolve(context.directory, completion.output.path)) : undefined;
  return { reference, canvas, parent };
}

function runtime(context: GroupContext, input: Awaited<ReturnType<typeof inputs>>, paths: { outputSvg?: string; candidate?: string }) {
  return JSON.stringify({
    group: { id: context.group.id, kind: context.group.kind ?? 'group', name: context.group.name, note: context.group.note, metadata: context.group.metadata },
    reference: input.reference, groups: join(context.directory, 'groups.json'),
    parentGroup: context.parent?.id ?? null, parentSvg: input.parent ?? null,
    canvas: input.canvas, ...paths,
  }, null, 2);
}

function groupNoteTool(context: GroupContext): FunctionTool | undefined {
  const store = context.store;
  if (!store) return;
  return {
    ...toolDefinition('update_group_note'),
    async execute(value, signal) {
      signal.throwIfAborted();
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('仅提交 oldText 和 newText');
      const args = value as Record<string, unknown>;
      if (Object.keys(args).some(key => !['oldText', 'newText'].includes(key)) ||
          typeof args.oldText !== 'string' || !args.oldText.trim() || typeof args.newText !== 'string' || !args.newText.trim()) {
        throw new Error('仅提交非空 oldText 和 newText');
      }
      const before = context.group.note ?? '', index = before.indexOf(args.oldText);
      if (index < 0 || before.indexOf(args.oldText, index + 1) >= 0) throw new Error('oldText 必须唯一匹配当前组 note');
      const note = before.slice(0, index) + args.newText + before.slice(index + args.oldText.length);
      await store.update(document => {
        signal.throwIfAborted();
        const group = findGroup(document, context.group.id);
        if ((group.note ?? '') !== before) throw new Error('当前组 note 已变化，未覆盖其他修改');
        group.note = note;
      });
      // 同一轮返修后的 reviewer 也须读取新说明，而不是旧的上下文快照。
      context.group.note = note;
      return textResult({ groupId: context.group.id, note });
    },
  };
}

export async function drawGroupOutline(
  context: DrawingContext, agents: Pick<CodexAgents, 'run'>,
  repair?: { candidate: string; feedback: string },
): Promise<SvgArtifact> {
  const profile = partProfile(context);
  const repairPromptPath = join(profile.promptsDirectory, '7-轮廓返修.md');
  const input = await inputs(context);
  const prompt = await readGroupPrompt(context.group.id, 'outline', profile.promptsDirectory);
  const output = resolve(context.outputPath);
  if (!output.endsWith('.svg')) throw new Error('轮廓输出路径须以 .svg 结尾');
  const draft = output.endsWith('.draft.svg') ? output : draftPath(output);
  await mkdir(dirname(draft), { recursive: true });
  await rm(draft, { force: true });
  if (repair) await writeAtomic(draft, await readFile(repair.candidate));
  const observations: SvgObservation[] = [];
  // 首次绘制和返修使用同一组工具，均允许修正本组 note。
  const noteRepair = groupNoteTool(context);
  const preview = createSvgPreviewTool({ ...input, directory: context.directory,
    observationDirectory: join(context.directory, 'observations', 'outline', context.group.id),
    observed: entry => observations.push(entry) });
  const write: FunctionTool = {
    ...toolDefinition('write_outline_svg'),
    async execute(value, signal) {
      signal.throwIfAborted();
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => key !== 'svg') ||
          typeof (value as { svg?: unknown }).svg !== 'string' || !(value as { svg: string }).svg.trim()) throw new Error('仅提交非空 svg 文本，草稿路径由程序绑定');
      await writeAtomic(draft, (value as { svg: string }).svg);
      const bytes = await validateGroupSvg(draft, context.group.id, input.canvas, input.parent);
      return textResult({ path: draft, bytes: bytes.length, note: '草稿结构检查通过，仍须预览和视觉自检' });
    },
  };
  const taskPrompt = renderPrompt(prompt.text, {
    prompt_source: prompt.path, runtime_context: runtime(context, input, {outputSvg: draft}),
    repair_context: repair ? renderPromptFile(new URL('../prompts/outline-repair-context.md',import.meta.url), {
      feedback:repair.feedback, repair_rules:await readFile(repairPromptPath,'utf8'), repair_source:repairPromptPath,
    }) : '',
    note_repair_rule: noteRepair ? renderPromptFile(new URL('../prompts/outline-note-repair.md',import.meta.url)) : '',
  }, prompt.path, ['prompt_source','runtime_context','repair_context','note_repair_rule']);
  if (repair) {
    await recordRepair(output, repair.feedback, taskPrompt);
  }
  const response = await agents.run({
    step: partStep(profile.id, repair ? 'outline_repair' : 'outline'),
    name: `${repair ? '组轮廓返修' : '组轮廓绘制'}-${context.group.id}`, cwd: context.directory,
    sandboxMode: 'workspace-write', tools: [preview, write, createSvgReadTool(context.directory, [input.parent, repair?.candidate, draft]),
      createBitmapTool(context.directory, join(context.directory, 'observations', 'outline', context.group.id)),
      ...(noteRepair ? [noteRepair] : [])], imageGeneration: true,
    images: [{ path: input.reference, description: profile.references.outline }],
    prompt: taskPrompt,
  });
  const actualDraft = await validateAgentOutcome(response, async () => {
    try { return await realpath(draft); }
    catch (error) { throw new Error(`模型回合已结束，但没有生成轮廓文件：${draft}`, { cause: error }); }
  });
  if (!observations.some(entry => entry.source === actualDraft && entry.mode === 'blend')) {
    throw agentOutcomeError('轮廓绘制未通过 preview_svg 完成混合叠加自检', response);
  }
  const bytes = await validateAgentOutcome(response, () => validateGroupSvg(draft, context.group.id, input.canvas, input.parent));
  if (draft !== output) await publishSvg(draft, output, input.parent ? hash(await readFile(input.parent)) : undefined);
  return { path: output };
}

async function reviewOnce(
  context: GroupContext, candidate: string, reportPath: string, agents: Pick<CodexAgents, 'run'>,
): Promise<Review> {
  const profile = partProfile(context);
  const input = await inputs(context);
  const prompt = await readGroupPrompt(context.group.id, 'review', profile.promptsDirectory);
  const bytes = await validateGroupSvg(candidate, context.group.id, input.canvas, input.parent);
  const candidateHash = hash(bytes);
  const observations: SvgObservation[] = [];
  const preview = createSvgPreviewTool({ ...input, directory: context.directory,
    observationDirectory: join(context.directory, 'observations', 'review', context.group.id),
    observed: entry => observations.push(entry) });
  let submitted: Review | undefined;
  const submit: FunctionTool = {
    ...toolDefinition('submit_review'),
    async execute(value, signal) {
      signal.throwIfAborted();
      if (submitted) throw new Error('本轮审查已提交');
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('审查结论须为对象');
      const raw = value as Record<string, unknown>;
      if (typeof raw.verdict !== 'string' || !['pass', 'revise', 'blocked'].includes(raw.verdict) || typeof raw.feedback !== 'string' || !raw.feedback.trim() ||
          Object.keys(raw).some(key => !['verdict', 'feedback'].includes(key))) throw new Error('无效审查结论或意见');
      if (raw.verdict !== 'blocked' && !observations.some(entry => entry.source === candidate && entry.mode !== 'svg')) {
        throw new Error('必须先用 preview_svg 实际对照候选与参考图');
      }
      if (hash(await readFile(candidate)) !== candidateHash) throw new Error('审查期间候选 SVG 被修改，不能提交');
      const review: Review = { verdict: raw.verdict as Review['verdict'], feedback: raw.feedback,
        candidateHash, observations: [...observations], updatedAt: new Date().toISOString() };
      const report = await readReviewReport(reportPath, context.group.id);
      report.reviews.push(review);
      signal.throwIfAborted();
      await writeAtomic(reportPath, JSON.stringify(report, null, 2) + '\n');
      submitted = review;
      return textResult({ path: reportPath, verdict: review.verdict });
    },
  };
  const response = await agents.run({
    step: partStep(profile.id, 'outline_review'), name: `组轮廓review-${context.group.id}`, cwd: context.directory,
    sandboxMode: 'read-only', tools: [preview, submit, createSvgReadTool(context.directory, [input.parent, candidate]),
      createBitmapTool(context.directory, join(context.directory, 'observations', 'review', context.group.id))], imageGeneration: false,
    images: [{ path: input.reference, description: profile.references.review }],
    prompt: renderPrompt(prompt.text, {prompt_source:prompt.path, runtime_context:runtime(context,input,{candidate}), report_path:reportPath},
      prompt.path, ['prompt_source','runtime_context','report_path']),
  });
  if (!submitted) throw agentOutcomeError('独立 review 未通过 submit_review 保存结论', response);
  if (hash(await readFile(candidate)) !== candidateHash) throw agentOutcomeError('独立 review 修改了候选 SVG', response);
  return submitted;
}

export async function reviewGroupOutline(
  context: ReviewContext, agents: Pick<CodexAgents, 'run'>,
  drawing: Pick<CodexAgents, 'run'> = agents,
): Promise<StepResult<ReviewedSvgArtifact>> {
  const candidate = await realpath(resolve(context.directory, context.outline.path));
  const reportPath = context.reportPath;
  const report = await readReviewReport(reportPath, context.group.id);
  let previous = report.reviews.at(-1);
  async function repair(review: Review) {
    // 记录实际完成返修的文件；续跑不能仅凭 SVG 变过就认定意见已落实。
    if (matchesHash(await readFile(candidate), review.repairedCandidateHash)) return;
    await drawGroupOutline({ ...context, outputPath: candidate }, drawing, { candidate, feedback: review.feedback });
    review.repairedCandidateHash = hash(await readFile(candidate));
    await writeAtomic(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
  const passed = (): StepResult<ReviewedSvgArtifact> => ({
    status: 'completed', output: { ...context.outline, reviewOutcome: 'pass' },
  });
  // 已提交结论但进度尚未保存时，从报告恢复，不重复消费审查轮次。
  if (previous?.verdict === 'pass' && matchesHash(await readFile(candidate), previous.candidateHash)) return passed();
  if (previous?.verdict === 'revise') await repair(previous);
  while (completedReviewCount(report) < maxOutlineReviews) {
    previous = await reviewOnce(context, candidate, reportPath, agents);
    report.reviews.push(previous);
    if (previous.verdict === 'pass') return passed();
    if (previous.verdict === 'blocked') {
      return { status: 'pending', message: `轮廓 review ${previous.verdict}：${previous.feedback}；报告：${reportPath}` };
    }
    // 第二轮的意见也必须返修并自检；完成后直接进入下一步，不再审查。
    await repair(previous);
  }
  if (previous?.verdict === 'revise') {
    return { status: 'completed', output: { ...context.outline, reviewOutcome: 'repaired',
      note: `已按第 ${completedReviewCount(report)} 轮意见返修并自检，不再复审` } };
  }
  return { status: 'pending', message: `轮廓 review blocked：${previous?.verdict === 'blocked'
    ? previous.feedback : '当前 SVG 与已通过的审查候选不一致'}；已用完 ${maxOutlineReviews} 轮审查；报告：${reportPath}` };
}

import { normalizeGeneratedReference } from '../shared/part/reference-normalization.ts';
import type { ImageProcessingOptions } from '../shared/image-processing.ts';
import { sectionDirectory, resolveInput, taskDirectory } from '../shared/paths.ts';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { clearPreparedParts, fileHash, readPreparationOptions } from '../shared/part/preparation-cache.ts';
import { modifiedError, type ChainPlan, type ChainStep } from '../shared/step-chain.ts';
import { inspectSection, runSection } from '../shared/step-section.ts';
import type { PreparationInput, PreparationReferences } from '../shared/part/preparation-types.ts';
import { checkStandardJudgment, copyAsPng, exists, findImage, poseJudgmentPath, preparationSteps, present, produce,
  sectionOf, stageNumber, stageStep, stepStage, writeJson, type PreparationStage, type StandardJudgment } from './preparation-state.ts';
import type { DressupDecision } from '../shared/part/dressup.ts';

export type { PreparationInput, PreparationReferences, StandardJudgment };
export type ProcessGenerated = (image: string) => Promise<void>;
// A reference step either generated its image or copied its input.
export type ReferenceChoice = { generated: boolean; reason: string };
export type PreparationSteps = {
  judgeStandard(image: string, prompt: string): Promise<StandardJudgment>;
  standardize(inputImage: string, outputImage: string, prompt: string): Promise<void>;
  simplify(inputImage: string, outputImage: string, prompt: string, processGenerated?: ProcessGenerated): Promise<void>;
  // Returns whether a dress-up base body was drawn (false: the reference was copied).
  baseSubject(inputImage: string, outputImage: string, prompt: string, processGenerated?: ProcessGenerated): Promise<ReferenceChoice | void>;
};

function readPrompt(name: string): Promise<string> {
  return readFile(new URL(`prompts/${name}`, import.meta.url), 'utf8');
}
const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'));
export function getPreparationDirectory(runName: string, root?: string): string {
  return join(sectionDirectory(runName, 'part-layering', root), 'references');
}
const inputDirectory = (runName: string, root?: string) => join(taskDirectory(runName, root), 'input');
async function references(runName: string, root?: string): Promise<PreparationReferences> {
  const directory = getPreparationDirectory(runName, root);
  const standard = join(directory, 'standard.png');
  return { directory, originalImage: await findImage(inputDirectory(runName, root), 'original'),
    ...(await exists(standard) ? { standardImage: standard } : {}),
    simplifiedSubject: await findImage(directory, 'simplified-subject') ?? join(directory, 'simplified-subject.png'),
    baseSubject: join(directory, 'base-subject.png') };
}
const output = (step: ChainStep) => resolve(step.directory, step.outputs![0]);
const unfinished = (plan: ChainPlan, id: string) => plan.reset.includes(id) || plan.statuses.get(id) !== 'completed';

function modeError(directory: string, saved: boolean): Error {
  return new Error(`preparation 已按 --${saved ? '' : 'no-'}standard 制作，不能直接切换。需要切换时请对 options 步骤执行重试：删除 ${join(sectionOf(directory), stageStep('options'), '.completed')} 后带新选项重跑，之后的参考会随之重做；或使用新的 --name。已有文件已保留。`);
}

// Explicit groups only read prepared inputs; no conversion, model call, copying or cache reset.
export async function loadPreparedReferences(runName: string, root?: string, standard?: boolean): Promise<PreparationReferences> {
  const refs = await references(runName, root), directory = refs.directory;
  const saved = await readPreparationOptions(directory);
  if (standard !== undefined && saved !== undefined && standard !== saved) throw modeError(directory, saved);
  const plan = await inspectSection(sectionOf(directory), taskDirectory(runName, root), await preparationSteps(refs, saved ?? standard ?? false, inputDirectory(runName, root)), { scan: false });
  const modified = modifiedError(plan, plan.chain);
  if (modified) throw modified;
  const missing = plan.chain.filter(step => plan.defined.has(step.id) && unfinished(plan, step.id))
    .map(step => `${step.id}：${step.outputs ? output(step) : step.directory}`);
  if (missing.length) throw new Error(`显式 groups 的前置参考未完成：\n${missing.join('\n')}\n请先使用默认流程完成参考准备。`);
  return refs;
}

// Each preparation step is one link of the shared step chain: a step whose
// output or marker is gone reruns with everything built on it, and outputs
// replaced while the run was interrupted stop the run until that step is retried.
export async function prepareReferences(input: PreparationInput, steps: PreparationSteps,
  progress?: (message: string) => void, options: ImageProcessingOptions = {}): Promise<PreparationReferences> {
  const normalization = { ...options, runsRoot: input.dir ?? options.runsRoot, progress: progress ?? options.progress };
  const directory = getPreparationDirectory(input.runName, input.dir), inputs = inputDirectory(input.runName, input.dir);
  const source = input.image === undefined ? undefined : resolveInput(input.runName, input.image, input.dir);
  if (source) {
    if (!await exists(source)) throw new Error(`Input image is missing: ${source}`);
    const original = await findImage(inputs, 'original');
    if (original && await fileHash(source) !== await fileHash(original)) {
      throw new Error(`任务已有不同的原图：${original}。制作另一张图请使用新的 --name。`);
    }
  }
  await mkdir(directory, { recursive: true });
  const standard = input.standard ?? await readPreparationOptions(directory) ?? false;
  const initial = await references(input.runName, input.dir);
  let partsBuilt = false;
  await runSection({
    directory: sectionOf(directory), root: taskDirectory(input.runName, input.dir), steps: await preparationSteps(initial, standard, inputs, source), progress,
    // The layering steps after ready check themselves; resetting ready clears them.
    last: stageNumber('ready'),
    async check(plan) {
      const saved = await readPreparationOptions(directory);
      if (saved !== undefined && saved !== standard && !unfinished(plan, stageStep('options'))) throw modeError(directory, saved);
      // Refuse before deleting anything when the step cannot be redone.
      const pending = plan.chain.find(step => plan.defined.has(step.id) && unfinished(plan, step.id));
      const stage = pending && stepStage(pending.id), has = (stage: PreparationStage) => plan.defined.has(stageStep(stage));
      if ((stage === 'original' && !source && (plan.reset.includes(pending!.id) || !initial.originalImage))
        || ((stage === 'pose' || stage === 'standard') && !has('original'))
        || ((stage === 'simplified' || stage === 'base') && !has('standard'))) {
        throw new Error('首次启动或原图缺失时，需要 --image <角色图片路径>');
      }
      partsBuilt = plan.reset.includes(stageStep('ready'));
    },
    async step(step, status) {
      const refs = await references(input.runName, input.dir), stage = stepStage(step.id);
      if (status === 'completed') { reuse(stage); return; }
      return () => run(stage, step, refs);
    },
  });
  return references(input.runName, input.dir);

  function reuse(id: PreparationStage) {
    if (id === 'standard') progress?.('标准参考：沿用已有 standard.png');
    if (id === 'simplified') progress?.('简化图片：沿用已有参考');
    if (id === 'base') progress?.('素体换装：沿用已有参考');
  }
  async function prepared(stage: 'simplified' | 'base', target: string, refs: PreparationReferences,
    generate: (output: string, processGenerated: ProcessGenerated) => Promise<void>) {
    await produce(target, temporary => generate(temporary, async image => {
      if (!refs.standardImage) throw new Error('参考后处理缺少 standard.png');
      // Raw generation is retained outside the final reference filenames for diagnosis.
      await normalizeGeneratedReference(image, refs.standardImage, join(sectionOf(directory), stageStep(stage)), stage, normalization);
    }));
  }
  async function run(id: PreparationStage, step: ChainStep, refs: PreparationReferences) {
    switch (id) {
      case 'original':
        await mkdir(inputs, { recursive: true });
        if (!await exists(output(step))) await produce(output(step), temporary => copyFile(source!, temporary));
        return;
      case 'options': return writeJson(output(step), { standard });
      case 'pose': {
        const decision = await steps.judgeStandard(refs.originalImage!, await readPrompt('0-姿态判断.md'));
        checkStandardJudgment(decision);
        return writeJson(output(step), decision);
      }
      case 'standard': {
        let adjust = false;
        if (standard) {
          const decision = await readJson(poseJudgmentPath(directory));
          checkStandardJudgment(decision);
          adjust = decision.needsAdjustment;
          progress?.(`姿态判断：${adjust ? '需要调整' : '已经标准，复制原图'}${decision.reason ? `；${decision.reason}` : ''}`);
        }
        const original = refs.originalImage!;
        await produce(output(step), async temporary => {
          if (adjust) await steps.standardize(original, temporary, await readPrompt('0-标准姿态.md'));
          else await copyAsPng(original, temporary);
          if ((await sharp(temporary).metadata()).format !== 'png') throw new Error('标准姿态输出必须为 PNG');
        });
        if (!standard) progress?.('标准参考：未启用姿态调整，复制原图为 standard.png');
        return;
      }
      case 'simplified':
        return prepared('simplified', output(step), refs, async (temporary, processGenerated) =>
          steps.simplify(refs.standardImage!, temporary, await readPrompt('2-简化图片.md'), processGenerated));
      case 'base': {
        let choice: ReferenceChoice | undefined;
        await prepared('base', output(step), refs, async (temporary, processGenerated) => {
          choice = await steps.baseSubject(refs.simplifiedSubject, temporary, await readPrompt('3-素体参考.md'), processGenerated) || undefined;
        });
        // Read by the scheduler to decide whether the clothing lane runs.
        const records = join(sectionOf(directory), stageStep('base'));
        const made = choice as ReferenceChoice | undefined;
        if (made) await mkdir(records, { recursive: true }).then(() => writeJson(join(records, 'decision.json'),
          { version: 1, dressed: made.generated, reason: made.reason } satisfies DressupDecision));
        return;
      }
      case 'ready':
        await clearPreparedParts(dirname(directory));
        if (partsBuilt) progress?.('preparation：参考内容已重新生成，已重置本人物 part 的拆分缓存。');
    }
  }
}

import { normalizeGeneratedReference } from '../shared/part/reference-normalization.ts';
import { pipelineDirectory, resolveInput, taskDirectory } from '../shared/paths.ts';
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, extname, join } from 'node:path';
import sharp from 'sharp';
import { clearPreparedParts, fileHash, writePreparationRecord } from '../shared/part/preparation-cache.ts';
import type { PreparationInput, PreparationReferences } from '../shared/part/preparation-types.ts';
import { changedReference, checkStandardJudgment, readPreparationState, referenceInputHash,
  type PreparationState, type ReferenceFingerprint, type ReferenceStage, type StandardJudgment } from './preparation-state.ts';

export type { PreparationInput, PreparationReferences, StandardJudgment };
export type ReferenceJudgment = { needsSimplification: boolean; reason?: string };
export type PreparationSteps = {
  judgeStandard(image: string, prompt: string): Promise<StandardJudgment>;
  standardize(inputImage: string, outputImage: string, prompt: string): Promise<void>;
  judge(image: string, prompt: string): Promise<ReferenceJudgment>;
  simplify(inputImage: string, outputImage: string, prompt: string): Promise<void>;
  baseSubject(inputImage: string, outputImage: string, prompt: string): Promise<void>;
};

function readPrompt(name: string): Promise<string> {
  return readFile(new URL(`prompts/${name}`, import.meta.url), 'utf8');
}
async function exists(path: string): Promise<boolean> {
  try { return (await stat(path)).isFile(); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}
async function findImage(directory: string, name: string): Promise<string | undefined> {
  let names: string[];
  try { names = await readdir(directory); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  const matches: string[] = [];
  for (const file of names) {
    if (file.startsWith(`${name}.`) && !file.endsWith('.tmp') && await exists(join(directory, file))) matches.push(join(directory, file));
  }
  if (matches.length > 1) throw new Error(`Multiple ${name} images found in ${directory}`);
  return matches[0];
}
function checkJudgment(value: unknown): asserts value is ReferenceJudgment {
  if (!value || typeof value !== 'object' || typeof (value as ReferenceJudgment).needsSimplification !== 'boolean') {
    throw new Error('judgment must contain a boolean needsSimplification');
  }
  if ((value as ReferenceJudgment).reason !== undefined && typeof (value as ReferenceJudgment).reason !== 'string') {
    throw new Error('judgment reason must be a string');
  }
}
export function getPreparationDirectory(runName: string, root?: string): string {
  return join(pipelineDirectory(runName, 'part-layering', root), 'references');
}
async function references(runName: string, root?: string): Promise<PreparationReferences> {
  const directory = getPreparationDirectory(runName, root);
  const standard = join(directory, 'standard.png');
  return { directory, originalImage: await findImage(join(taskDirectory(runName, root), 'input'), 'original'),
    ...(await exists(standard) ? { standardImage: standard } : {}), judgment: join(directory, 'judgment.json'),
    simplifiedSubject: await findImage(directory, 'simplified-subject') ?? join(directory, 'simplified-subject.png'),
    baseSubject: join(directory, 'base-subject.png') };
}
function stagePaths(refs: PreparationReferences): Record<ReferenceStage, string> {
  return { standard: join(refs.directory, 'standard.png'), judgment: refs.judgment,
    simplified: refs.simplifiedSubject, base: refs.baseSubject };
}
async function fingerprints(refs: PreparationReferences, standard: boolean): Promise<PreparationState['files']> {
  const files: PreparationState['files'] = {};
  for (const [stage, path] of Object.entries(stagePaths(refs))) {
    if (await exists(path)) files[stage as ReferenceStage] = { outputHash: await fileHash(path) };
  }
  if (files.standard && refs.originalImage) files.standard.inputHash = referenceInputHash(await fileHash(refs.originalImage), standard);
  if (files.judgment) {
    const decision: unknown = JSON.parse(await readFile(refs.judgment, 'utf8'));
    checkJudgment(decision);
    if (files.standard) {
      files.judgment.inputHash = referenceInputHash(files.standard.outputHash);
      if (files.simplified) files.simplified.inputHash = referenceInputHash(files.standard.outputHash, decision.needsSimplification);
    }
  }
  if (files.base && files.simplified) files.base.inputHash = referenceInputHash(files.simplified.outputHash);
  return files;
}
function verifyReferences(refs: PreparationReferences, state: PreparationState, current: PreparationState['files'], standard: boolean): void {
  const paths = stagePaths(refs);
  if (current.standard && state.standard !== standard) throw changedReference(paths.standard);
  for (const stage of Object.keys(current) as ReferenceStage[]) {
    const saved = state.files[stage], actual = current[stage]!;
    if (!saved || saved.outputHash !== actual.outputHash
      || (saved.inputHash !== undefined && actual.inputHash !== undefined && saved.inputHash !== actual.inputHash)) {
      throw changedReference(paths[stage]);
    }
  }
}
function partReferencesHash(files: PreparationState['files']): string | undefined {
  return files.simplified && files.base ? referenceInputHash(files.simplified.outputHash, files.base.outputHash) : undefined;
}

// Explicit groups only read prepared inputs; no migration, model call, copying or cache reset.
export async function loadPreparedReferences(runName: string, root?: string, standard?: boolean): Promise<PreparationReferences> {
  const refs = await references(runName, root), state = await readPreparationState(refs.directory);
  const missing: string[] = [];
  if (!await exists(refs.judgment)) missing.push(refs.judgment);
  if (!await exists(refs.simplifiedSubject)) missing.push(join(refs.directory, 'simplified-subject.*'));
  if (!await exists(refs.baseSubject)) missing.push(refs.baseSubject);
  if ((state?.files.standard || state?.standard || standard) && !refs.standardImage) missing.push(join(refs.directory, 'standard.png'));
  if (missing.length) throw new Error(`显式 groups 的前置参考未完成：\n${missing.join('\n')}\n请先使用默认流程完成参考准备。`);
  const current = await fingerprints(refs, standard ?? state?.standard ?? false);
  if (state) {
    verifyReferences(refs, state, current, standard ?? state.standard);
    if (state.partReferencesHash !== partReferencesHash(current)) {
      throw new Error('preparation 已重新生成，拆分缓存尚未更新；请先不带 --groups 运行默认流程。');
    }
  } else if (standard) throw changedReference(join(refs.directory, 'standard.png'));
  return refs;
}

async function copyAsPng(source: string, output: string): Promise<void> {
  const bytes = await readFile(source);
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) await writeFile(output, bytes);
  else await sharp(bytes).autoOrient().png().toFile(output);
}

export async function prepareReferences(input: PreparationInput, steps: PreparationSteps,
  progress?: (message: string) => void): Promise<PreparationReferences> {
  const refs = await references(input.runName, input.dir), paths = stagePaths(refs);
  let state = await readPreparationState(refs.directory);
  const standard = input.standard ?? state?.standard ?? false;
  const source = input.image === undefined ? undefined : resolveInput(input.runName, input.image, input.dir);
  if (source) {
    if (!await exists(source)) throw new Error(`Input image is missing: ${source}`);
    if (refs.originalImage && await fileHash(source) !== await fileHash(refs.originalImage)) {
      throw new Error(`任务已有不同的原图：${refs.originalImage}。制作另一张图请使用新的 --name。`);
    }
  }
  // Check all existing outputs before copying inputs, writing state or making model calls.
  const current = await fingerprints({ ...refs, originalImage: refs.originalImage ?? source }, standard);
  if (state) verifyReferences(refs, state, current, standard);
  if (standard && ((!state && Object.keys(current).length > 0)
    || (current.judgment && !state?.files.judgment?.inputHash)
    || (current.simplified && !state?.files.simplified?.inputHash))) {
    throw new Error(`旧 preparation 未记录标准姿态，不能直接启用 --standard。请使用新的 --name，或移除 ${refs.directory} 中的旧参考后重做。已有文件已保留。`);
  }
  if (!refs.originalImage && source) {
    const folder = join(taskDirectory(input.runName, input.dir), 'input');
    await mkdir(folder, { recursive: true });
    refs.originalImage = join(folder, `original${extname(source) || '.png'}`);
    await copyFile(source, refs.originalImage);
  }
  if (!refs.originalImage && !refs.standardImage && (standard || !current.judgment || !current.simplified || !current.base || state?.files.standard)) {
    throw new Error('首次启动或原图缺失时，需要 --image <角色图片路径>');
  }
  await mkdir(refs.directory, { recursive: true });
  const recordPath = join(refs.directory, 'preparation.json');
  if (!state) {
    // Adopt old references once without redrawing them. A PNG copy of the raw input keeps their pose unchanged.
    const legacy = !!(current.judgment || current.simplified || current.base);
    if (legacy && refs.originalImage && !refs.standardImage) {
      const temporary = `${paths.standard}.${randomUUID()}.tmp`;
      try { await copyAsPng(refs.originalImage, temporary); await rename(temporary, paths.standard); }
      finally { await rm(temporary, { force: true }); }
      refs.standardImage = paths.standard;
    }
    const baseline = await fingerprints(refs, standard);
    state = { version: 1, standard, files: baseline, partReferencesHash: partReferencesHash(baseline) };
    if (legacy) progress?.(`preparation：旧任务首次建立当前文件指纹，沿用已有参考${refs.originalImage ? '' : '；原图缺失，暂不补 standard.png'}。`);
  }
  state.standard = standard;
  const save = () => writePreparationRecord(recordPath, state);
  await save(); // Persist the mode even when the first judgment/generation is interrupted.
  const check = async () => {
    const actual = await fingerprints(refs, standard);
    verifyReferences(refs, state!, actual, standard);
    return actual;
  };
  const produce = async (stage: ReferenceStage, inputHash: string, generate: (output: string) => Promise<void>) => {
    const temporary = `${paths[stage]}.${randomUUID()}.tmp`;
    try {
      await generate(temporary);
      if (!await exists(temporary)) throw new Error(`Preparation output was not produced: ${paths[stage]}`);
      if (stage === 'base' || stage === 'simplified') {
        if (!refs.standardImage) throw new Error('参考后处理缺少 standard.png');
        // Raw generation is retained outside the final reference filenames for diagnosis.
        await normalizeGeneratedReference(temporary, refs.standardImage, refs.directory, stage);
      }
      const fingerprint: ReferenceFingerprint = { inputHash, outputHash: await fileHash(temporary) };
      state!.files[stage] = fingerprint;
      // Recording first makes a crash between these writes a missing output, never an untracked one.
      await save();
      await rename(temporary, paths[stage]);
    } finally { await rm(temporary, { force: true }); }
  };

  if (!refs.standardImage && refs.originalImage) {
    const original = refs.originalImage, originalHash = await fileHash(original);
    let adjust = false;
    if (standard) {
      if (state.standardJudgment?.inputHash !== originalHash) {
        const decision = await steps.judgeStandard(original, await readPrompt('0-姿态判断.md'));
        checkStandardJudgment(decision);
        state.standardJudgment = { inputHash: originalHash, decision };
        await save();
      }
      const decision = state.standardJudgment!.decision;
      adjust = decision.needsAdjustment;
      progress?.(`姿态判断：${adjust ? '需要调整' : '已经标准，复制原图'}${decision.reason ? `；${decision.reason}` : ''}`);
    }
    await produce('standard', referenceInputHash(originalHash, standard), async output => {
      if (adjust) await steps.standardize(original, output, await readPrompt('0-标准姿态.md'));
      else await copyAsPng(original, output);
      if ((await sharp(output).metadata()).format !== 'png') throw new Error('标准姿态输出必须为 PNG');
    });
    refs.standardImage = paths.standard;
    if (!standard) progress?.('标准参考：未启用姿态调整，复制原图为 standard.png');
  } else if (refs.standardImage) progress?.('标准参考：沿用已有 standard.png');
  await check();

  let decision: unknown;
  if (await exists(refs.judgment)) {
    decision = JSON.parse(await readFile(refs.judgment, 'utf8'));
    progress?.('参考判断：沿用已有 judgment.json');
  } else {
    if (!refs.standardImage) throw new Error('参考判断缺少 standard.png；请提供 --image 补齐原图。');
    decision = await steps.judge(refs.standardImage, await readPrompt('1-参考判断.md'));
    checkJudgment(decision);
    await produce('judgment', referenceInputHash(await fileHash(refs.standardImage)), output =>
      writeFile(output, JSON.stringify(decision, null, 2) + '\n', 'utf8'));
  }
  checkJudgment(decision);
  progress?.(`参考判断：${decision.needsSimplification ? '需要转换 Live2D 画风' : '沿用原图画风'}${decision.reason ? `；${decision.reason}` : ''}`);
  await check();

  if (!await exists(refs.simplifiedSubject)) {
    if (!refs.standardImage) throw new Error('简化参考与 standard.png 均缺失；请提供 --image 补齐原图。');
    const image = refs.standardImage, simplify = decision.needsSimplification;
    await produce('simplified', referenceInputHash(await fileHash(image), simplify), async output => {
      if (simplify) await steps.simplify(image, output, await readPrompt('2-简化图片.md'));
      else { await copyFile(image, output); progress?.('简化图片：无需转换，复制 standard.png'); }
    });
  } else progress?.('简化图片：沿用已有参考');
  await check();

  if (!await exists(refs.baseSubject)) {
    await produce('base', referenceInputHash(await fileHash(refs.simplifiedSubject)), async output =>
      steps.baseSubject(refs.simplifiedSubject, output, await readPrompt('3-素体参考.md')));
  } else progress?.('素体换装：沿用已有参考');
  const ready = await check();
  const readyHash = partReferencesHash(ready)!;
  if (state.partReferencesHash !== readyHash) {
    await clearPreparedParts(dirname(refs.directory));
    if (state.partReferencesHash) progress?.('preparation：参考内容已重新生成，已重置本人物 part 的拆分缓存。');
  }
  state.files = ready;
  state.partReferencesHash = readyHash;
  await save();
  return refs;
}

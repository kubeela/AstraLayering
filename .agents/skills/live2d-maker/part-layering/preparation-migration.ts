import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileHash, preparationHash } from '../shared/part/preparation-cache.ts';
import { completeStep, startStep } from '../shared/step-chain.ts';
import type { PreparationReferences } from '../shared/part/preparation-types.ts';
import { checkJudgment, checkStandardJudgment, copyAsPng, exists, poseJudgmentPath, preparationChain, present, produce,
  stepsDirectory, writeJson, type PreparationStage, type StandardJudgment } from './preparation-state.ts';

// One-time conversion into step-chain markers, from the preparation.json hash
// records of earlier runs, or from bare references of tasks older than those.
// Valid steps are marked completed in chain order; the first stale or missing
// one and everything after it are left to rerun. preparation.json is deleted
// last, so an interrupted conversion simply starts over.
type LegacyStage = 'standard' | 'judgment' | 'simplified' | 'base';
type LegacyState = {
  version: 1; standard: boolean;
  files: Partial<Record<LegacyStage, { inputHash?: string; outputHash: string }>>;
  standardJudgment?: { inputHash: string; decision: StandardJudgment };
  partReferencesHash?: string;
};
const legacyHash = (...inputs: (string | boolean | undefined)[]) =>
  inputs.includes(undefined) ? undefined : preparationHash(JSON.stringify(inputs));

async function readLegacyState(path: string): Promise<LegacyState | undefined> {
  let text: string;
  try { text = await readFile(path, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  const value = JSON.parse(text) as LegacyState;
  if (value?.version !== 1 || typeof value.standard !== 'boolean' || !value.files || typeof value.files !== 'object'
    || Object.values(value.files).some(file => !file || typeof file.outputHash !== 'string')) {
    throw new Error(`无效的 preparation 指纹记录：${path}`);
  }
  if (value.standardJudgment) checkStandardJudgment(value.standardJudgment.decision);
  return value;
}

export async function migratePreparation(refs: PreparationReferences, inputDirectory: string,
  progress?: (message: string) => void): Promise<void> {
  const record = join(refs.directory, 'preparation.json'), state = await readLegacyState(record);
  if (!state) {
    if (await present(stepsDirectory(refs.directory))) return;
    if (!(await Promise.all([refs.judgment, refs.simplifiedSubject, refs.baseSubject].map(exists))).some(Boolean)) return;
    // Adopt bare references without redrawing them. A PNG copy of the raw input keeps their pose unchanged.
    if (refs.originalImage && !refs.standardImage) {
      const standard = join(refs.directory, 'standard.png');
      await produce(standard, temporary => copyAsPng(refs.originalImage!, temporary));
      refs.standardImage = standard;
    }
  } else await rm(stepsDirectory(refs.directory), { recursive: true, force: true });

  const paths = { original: refs.originalImage, standard: refs.standardImage, judgment: refs.judgment,
    simplified: refs.simplifiedSubject, base: refs.baseSubject };
  const hashes: Partial<Record<keyof typeof paths, string>> = {};
  for (const [stage, path] of Object.entries(paths)) if (path && await exists(path)) hashes[stage as keyof typeof paths] = await fileHash(path);
  for (const stage of ['standard', 'judgment', 'simplified', 'base'] as const) {
    if (state && hashes[stage] && state.files[stage]?.outputHash !== hashes[stage]) {
      throw new Error(`preparation 参考与记录不一致，不能续跑：${paths[stage]}\n请删除该文件后重做，依赖它的后续参考会随之重做。已有文件已保留。`);
    }
  }
  // A recorded input hash must still match the current upstream output.
  const follows = (stage: LegacyStage, expected: string | undefined) => !!hashes[stage]
    && (!state || state.files[stage]!.inputHash === undefined || expected === undefined || state.files[stage]!.inputHash === expected);
  const decision = hashes.judgment ? JSON.parse(await readFile(refs.judgment, 'utf8')) : undefined;
  if (decision !== undefined) checkJudgment(decision);
  const standard = state?.standard ?? false;
  const valid: Record<PreparationStage, () => boolean> = {
    original: () => !!hashes.original,
    options: () => true,
    pose: () => state?.standardJudgment?.inputHash === hashes.original,
    standard: () => follows('standard', legacyHash(hashes.original, standard)),
    judgment: () => follows('judgment', legacyHash(hashes.standard)),
    simplified: () => follows('simplified', legacyHash(hashes.standard, decision?.needsSimplification)),
    base: () => follows('base', legacyHash(hashes.simplified)),
    ready: () => !state || state.partReferencesHash === legacyHash(hashes.simplified, hashes.base),
  };
  const chain = await preparationChain(refs, standard, inputDirectory);
  let kept = 0;
  for (const step of chain) {
    const id = step.id as PreparationStage;
    if (!valid[id]()) break;
    await mkdir(step.directory, { recursive: true });
    if (id === 'options') await writeJson(join(refs.directory, 'options.json'), { standard });
    if (id === 'pose') await writeJson(poseJudgmentPath(refs.directory), state!.standardJudgment!.decision);
    await startStep(step.directory, 'absent');
    await completeStep(step, chain);
    kept++;
  }
  if (state) await rm(record);
  progress?.(`preparation：已将${state ? ' preparation.json' : '旧任务的已有参考'}转换为步骤记录，沿用 ${kept}/${chain.length} 步${kept < chain.length ? '，其后的步骤重做' : ''}${refs.originalImage ? '' : '；原图缺失，暂不补 standard.png'}。`);
}

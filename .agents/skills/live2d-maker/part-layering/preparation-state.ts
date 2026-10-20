import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { preparationHash } from '../shared/part/preparation-cache.ts';

export type StandardJudgment = { needsAdjustment: boolean; reason?: string };
export type ReferenceStage = 'standard' | 'judgment' | 'simplified' | 'base';
export type ReferenceFingerprint = { inputHash?: string; outputHash: string };
export type PreparationState = {
  version: 1;
  standard: boolean;
  files: Partial<Record<ReferenceStage, ReferenceFingerprint>>;
  standardJudgment?: { inputHash: string; decision: StandardJudgment };
  partReferencesHash?: string;
};

export async function readPreparationState(directory: string): Promise<PreparationState | undefined> {
  const path = join(directory, 'preparation.json');
  let text: string;
  try { text = await readFile(path, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  const value = JSON.parse(text) as PreparationState;
  if (value?.version !== 1 || typeof value.standard !== 'boolean' || !value.files || typeof value.files !== 'object'
    || Object.values(value.files).some(file => !file || typeof file.outputHash !== 'string'
      || (file.inputHash !== undefined && typeof file.inputHash !== 'string'))
    || (value.partReferencesHash !== undefined && typeof value.partReferencesHash !== 'string')) {
    throw new Error(`无效的 preparation 指纹记录：${path}`);
  }
  if (value.standardJudgment) {
    if (typeof value.standardJudgment.inputHash !== 'string') throw new Error(`无效的姿态判断指纹：${path}`);
    checkStandardJudgment(value.standardJudgment.decision);
  }
  return value;
}

export function checkStandardJudgment(value: unknown): asserts value is StandardJudgment {
  if (!value || typeof value !== 'object' || typeof (value as StandardJudgment).needsAdjustment !== 'boolean'
    || ((value as StandardJudgment).reason !== undefined && typeof (value as StandardJudgment).reason !== 'string')) {
    throw new Error('姿态判断须包含 boolean needsAdjustment，reason 须为字符串');
  }
}

export function referenceInputHash(...inputs: (string | boolean)[]): string {
  return preparationHash(JSON.stringify(inputs));
}

export function changedReference(path: string): Error {
  return new Error(`preparation 参考或选项已变化，不能复用：${path}\n请使用新的 --name，或删除该文件后重做 preparation；依赖它的后续参考也会逐项校验。已有文件已保留。`);
}

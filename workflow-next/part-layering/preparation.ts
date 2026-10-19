import { pipelineDirectory, resolveInput } from '../shared/paths.ts';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ReferenceJudgment = { needsSimplification: boolean; reason?: string };

export type PreparationInput = { image?: string; runName: string };

export type PreparationSteps = {
  judge(image: string, prompt: string): Promise<ReferenceJudgment>;
  simplify(inputImage: string, outputImage: string, prompt: string): Promise<void>;
  baseSubject(inputImage: string, outputImage: string, prompt: string): Promise<void>;
};

export type PreparationReferences = {
  directory: string;
  originalImage?: string;
  judgment: string;
  simplifiedSubject: string;
  baseSubject: string;
};

function readPrompt(name: string): Promise<string> {
  return readFile(new URL(`prompts/${name}`, import.meta.url), 'utf8');
}

async function exists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function findImage(directory: string, name: string): Promise<string | undefined> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  const matches: string[] = [];
  for (const file of names) {
    if (file.startsWith(`${name}.`) && !file.endsWith('.tmp') && await exists(join(directory, file))) {
      matches.push(join(directory, file));
    }
  }
  if (matches.length > 1) throw new Error(`Multiple ${name} images found in ${directory}`);
  return matches[0];
}

function checkJudgment(value: unknown): asserts value is ReferenceJudgment {
  if (!value || typeof value !== 'object' ||
      typeof (value as ReferenceJudgment).needsSimplification !== 'boolean') {
    throw new Error('judgment must contain a boolean needsSimplification');
  }
  if ((value as ReferenceJudgment).reason !== undefined &&
      typeof (value as ReferenceJudgment).reason !== 'string') {
    throw new Error('judgment reason must be a string');
  }
}

export function getPreparationDirectory(runName: string): string {
  return join(pipelineDirectory(runName, 'part-layering'), 'references');
}

// 显式指定组时只读取已完成参考；缺失就报错，不调用 agent 或复制补齐。
export async function loadPreparedReferences(runName: string): Promise<PreparationReferences> {
  const directory = getPreparationDirectory(runName);
  const judgment = join(directory, 'judgment.json');
  const simplifiedSubject = await findImage(directory, 'simplified-subject');
  const baseSubject = join(directory, 'base-subject.png');
  const missing: string[] = [];
  if (!await exists(judgment)) missing.push(judgment);
  if (!simplifiedSubject) missing.push(join(directory, 'simplified-subject.*'));
  if (!await exists(baseSubject)) missing.push(baseSubject);
  if (missing.length) throw new Error(`显式 groups 的前置参考未完成：\n${missing.join('\n')}\n请先使用默认流程完成参考准备。`);
  checkJudgment(JSON.parse(await readFile(judgment, 'utf8')));
  return { directory, originalImage: await findImage(directory, 'original'), judgment,
    simplifiedSubject: simplifiedSubject!, baseSubject };
}

export async function prepareReferences(
  input: PreparationInput,
  steps: PreparationSteps,
  progress?: (message: string) => void,
): Promise<PreparationReferences> {
  const directory = getPreparationDirectory(input.runName);
  const judgment = join(directory, 'judgment.json');
  let image = await findImage(directory, 'original');
  if (!image && input.image) {
    const source = resolveInput(input.runName, input.image);
    if (!await exists(source)) throw new Error(`Input image is missing: ${source}`);
    await mkdir(directory, { recursive: true });
    image = join(directory, `original${extname(source) || '.png'}`);
    await copyFile(source, image);
  }

  let decision: unknown;
  if (await exists(judgment)) {
    decision = JSON.parse(await readFile(judgment, 'utf8'));
    progress?.('参考判断：沿用已有 judgment.json');
  } else {
    if (!image) throw new Error('首次启动或原图缺失时，需要 --image <角色图片路径>');
    decision = await steps.judge(image, await readPrompt('1-参考判断.md'));
    checkJudgment(decision);
    await writeFile(judgment, JSON.stringify(decision, null, 2) + '\n', 'utf8');
  }
  checkJudgment(decision);
  progress?.(`参考判断：${decision.needsSimplification ? '需要转换 Live2D 画风' : '沿用原图画风'}${decision.reason ? `；${decision.reason}` : ''}`);

  // A direct copy keeps the original extension; generated images use PNG.
  const extension = decision.needsSimplification ? '.png' : extname(image ?? '') || '.png';
  const simplifiedSubject = await findImage(directory, 'simplified-subject')
    ?? join(directory, `simplified-subject${extension}`);
  const baseSubject = join(directory, 'base-subject.png');

  if (!await exists(simplifiedSubject)) {
    if (!image) throw new Error('简化参考与原图均缺失，需要 --image <角色图片路径>');
    if (decision.needsSimplification) {
      await steps.simplify(image, simplifiedSubject, await readPrompt('2-简化图片.md'));
    } else {
      await copyFile(image, simplifiedSubject);
      progress?.('简化图片：无需转换，复制原图');
    }
    if (!await exists(simplifiedSubject)) {
      throw new Error(`Simplified image was not produced: ${simplifiedSubject}`);
    }
  } else {
    progress?.('简化图片：沿用已有参考');
  }

  if (!await exists(baseSubject)) {
    await steps.baseSubject(simplifiedSubject, baseSubject, await readPrompt('3-素体参考.md'));
    if (!await exists(baseSubject)) {
      throw new Error(`Base subject was not produced: ${baseSubject}`);
    }
  } else {
    progress?.('素体换装：沿用已有参考');
  }

  return { directory, originalImage: image, judgment, simplifiedSubject, baseSubject };
}

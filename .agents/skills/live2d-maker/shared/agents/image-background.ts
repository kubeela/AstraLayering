import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { normalizeReference } from '../part/reference-normalization.ts';
import type { FfmpegOptions } from '../ffmpeg.ts';
import { imageModelProviders, type ImageModel } from './models.ts';
import type { ImageArguments } from './images.ts';
import { recommendBackground, type BackgroundRecommendation } from './background-selection.ts';

export type ImageProcessingOptions = FfmpegOptions & { directory: string };

export function needsSolidBackground(model: ImageModel, args: ImageArguments): boolean {
  return imageModelProviders[model] === 'google' && (args.background ?? 'transparent') === 'transparent';
}

// Keep the caller's task verbatim; only the provider's output-background contract changes.
export async function providerImageArguments(model: ImageModel, args: ImageArguments, selection?: BackgroundRecommendation): Promise<ImageArguments> {
  if (!needsSolidBackground(model, args)) return args;
  const instructions = await readFile(new URL('../prompts/nano-solid-background.md', import.meta.url), 'utf8');
  const background = selection ?? await recommendBackground([]);
  return { ...args, prompt: args.prompt + '\n\n' + instructions.trim().replaceAll('{background_hex}', background.hex), background: 'opaque' };
}

export async function transparentGeneratedImage(png: Buffer, model: ImageModel, original: ImageArguments,
  request: ImageArguments, options: ImageProcessingOptions, signal: AbortSignal, selection: BackgroundRecommendation): Promise<Buffer> {
  signal.throwIfAborted();
  const directory = options.directory;
  await mkdir(directory, { recursive: true });
  const source = join(directory, 'original.png'), output = join(directory, 'transparent.png');
  await writeFile(source, png, { mode: 0o600 });
  const record = { model, originalPrompt: original.prompt, providerPrompt: request.prompt,
    requestedBackground: original.background ?? 'transparent', generatedBackground: request.background, selection };
  try {
    // A real alpha channel, if returned, is authoritative; never key it a second time.
    if (!(await sharp(png).stats()).isOpaque) {
      await writeFile(join(directory, 'normalization.json'), JSON.stringify({ ...record, nativeAlphaPreserved: true }, null, 2) + '\n', { mode: 0o600 });
      return png;
    }
    // The same image is the size reference: keying never scales or registers the output.
    const normalization = await normalizeReference(source, source, output, options);
    await writeFile(join(directory, 'normalization.json'), JSON.stringify({ ...record, normalization }, null, 2) + '\n', { mode: 0o600 });
    signal.throwIfAborted();
    if (!normalization.key || (await sharp(output).stats()).isOpaque) {
      throw new Error('生成图片没有可靠的纯色背景或抠图后没有实际透明区域。');
    }
    return await readFile(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeFile(join(directory, 'error.json'), JSON.stringify({ ...record, error: message }, null, 2) + '\n', { mode: 0o600 });
    throw new Error(`Nano 透明背景处理失败：${message} 原始生图保留在 ${source}。`, { cause: error });
  }
}

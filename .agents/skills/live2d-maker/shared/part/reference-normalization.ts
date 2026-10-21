import sharp from 'sharp';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';

import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ImageProcessingOptions } from '../image-processing.ts';
import { keyReferencePixels } from './reference-key.ts';
import { pipelineDirectory, type PipelineId } from '../paths.ts';

// This only decides whether preparation may generate a new reference. Its own
// fingerprint checks remain authoritative; no cache or artifact is changed here.
export async function referenceNeedsGeneration(pipeline: PipelineId, name: string, root?: string): Promise<boolean> {
  if (pipeline !== 'part-layering' && pipeline !== 'clothing-part-layering') return false;
  const directory = join(pipelineDirectory(name, pipeline, root), 'references');
  let names: string[];
  try { names = await readdir(directory); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true; throw error; }
  const files = new Set(await Promise.all(names.map(async name => {
    try { return (await stat(join(directory, name))).isFile() ? name : ''; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw error; }
  })));
  return pipeline === 'part-layering'
    ? !files.has('base-subject.png') || ![...files].some(name => name.startsWith('simplified-subject.') && !name.endsWith('.tmp'))
    : !files.has('clothing.png') || !files.has('preparation.json');
}

// Archives are write-only history, never preparation inputs or recovery checkpoints.
export async function normalizeGeneratedReference(input: string, standard: string, references: string, name: string, options: ImageProcessingOptions = {}): Promise<void> {
  const archive = join(references, 'archive', `${name}-${Date.now()}-${randomUUID()}`);
  await mkdir(archive, { recursive: true });
  await copyFile(input, join(archive, 'original.png'));
  const report = await normalizeReference(input, standard, input, options);
  await writeFile(join(archive, 'normalization.json'), JSON.stringify(report, null, 2) + '\n');
}

export type NormalizationReport = {
  version: 2; source: [number, number]; target: [number, number]; scale: number;
  offset: [number, number]; key: number[] | null; borderSupport: number;
  transparentBorder: number; keySkipped: boolean; resized: boolean;
  method: 'node-chroma-despill' | 'node-rgb-key' | null; removed: number; decontaminated: number;
};

// Detect the perimeter's modal colour in small bins, then refine it from nearby samples.
// Fully transparent pixels carry arbitrary RGB and must not vote for a key colour.
export async function normalizeReference(input: string, standard: string, output: string, options: ImageProcessingOptions = {}): Promise<NormalizationReport> {
  const bytes = await readFile(input);
  const target = (await sharp(standard).metadata()).autoOrient;
  const { data, info } = await sharp(bytes).rotate().toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const samples: number[] = [], bins = new Map<number, number[]>();
  const border = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    samples.push(i);
    if (data[i + 3] < 240) return;
    const key = (data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4);
    const bin = bins.get(key) ?? []; bin.push(i); bins.set(key, bin);
  };
  for (let x = 0; x < w; x++) { border(x, 0); if (h > 1) border(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { border(0, y); if (w > 1) border(w - 1, y); }
  const modal = [...bins.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const mean = (indices: number[]) => [0, 1, 2].map(c => indices.reduce((sum, i) => sum + data[i + c], 0) / indices.length);
  const distance = (i: number, key: number[]) => Math.hypot(data[i] - key[0], data[i + 1] - key[1], data[i + 2] - key[2]);
  const center = modal.length ? mean(modal) : [0, 0, 0];
  const cluster = samples.filter(i => data[i + 3] >= 240 && distance(i, center) <= 32);
  const support = cluster.length / samples.length;
  // A photograph or multicoloured border has no reliable single key. Preserve it.
  const transparentBorder = samples.filter(i => data[i + 3] <= 8).length / samples.length;
  const key = (await sharp(bytes).stats()).isOpaque && transparentBorder < 0.8 && support >= 0.6 ? mean(cluster) : null;
  const keyed = key ? keyReferencePixels(data, w, h, key) : { method: null, removed: 0, decontaminated: 0 };
  if (!data.some((value, i) => i % 4 === 3 && value > 0)) throw new Error('背景抠图后没有可见前景；请检查生成图片。');
  const scale = Math.min(target.width / w, target.height / h);
  const rw = Math.max(1, Math.round(w * scale)), rh = Math.max(1, Math.round(h * scale));
  const left = Math.floor((target.width - rw) / 2), top = Math.floor((target.height - rh) / 2);
  // Avoid recompression or resampling when the image already meets the contract.
  if (!key && w === target.width && h === target.height && (await sharp(bytes).metadata()).format === 'png' && !(await sharp(bytes).metadata()).orientation) {
    await writeFile(output, bytes);
  } else {
    const result = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .resize(rw, rh).extend({ left, right: target.width - rw - left, top, bottom: target.height - rh - top,
        background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await writeFile(output, result);
  }
  return { version: 2, source: [w, h], target: [target.width, target.height], scale, offset: [left, top],
    key, borderSupport: support, transparentBorder, keySkipped: !key, resized: w !== target.width || h !== target.height, ...keyed };
}

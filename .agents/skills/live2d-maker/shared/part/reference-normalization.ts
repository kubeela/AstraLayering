import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
const execute = promisify(execFile);
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';

import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Archives are write-only history, never preparation inputs or recovery checkpoints.
export async function normalizeGeneratedReference(input: string, standard: string, references: string, name: string): Promise<void> {
  const archive = join(references, 'archive', `${name}-${Date.now()}-${randomUUID()}`);
  await mkdir(archive, { recursive: true });
  await copyFile(input, join(archive, 'original.png'));
  const report = await normalizeReference(input, standard, input);
  await writeFile(join(archive, 'normalization.json'), JSON.stringify(report, null, 2) + '\n');
}

export type NormalizationReport = {
  version: 1; source: [number, number]; target: [number, number]; scale: number;
  offset: [number, number]; key: number[] | null; borderSupport: number;
  transparentBorder: number; keySkipped: boolean; resized: boolean;
  filter: string | null; removed: number; decontaminated: number;
};

// Detect the perimeter's modal colour in small bins, then refine it from nearby samples.
// Fully transparent pixels carry arbitrary RGB and must not vote for a key colour.
export async function normalizeReference(input: string, standard: string, output: string): Promise<NormalizationReport> {
  const bytes = await readFile(input);
  const target = (await sharp(standard).metadata()).autoOrient;
  const { data, info } = await sharp(bytes).rotate().toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info, n = w * h;
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
  const key = transparentBorder < 0.8 && support >= 0.6 ? mean(cluster) : null;
  let removed = 0, decontaminated = 0;
  let filter: string | null = null;
  if (key) {
    const color = '0x' + key.map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
    const green = key[1] - Math.max(key[0], key[2]) > 40;
    const blue = key[2] - Math.max(key[0], key[1]) > 40;
    // Chroma key plus conservative despill is the validated green/blue-screen path.
    // RGB keying also distinguishes neutral backgrounds, where chroma alone cannot.
    filter = green || blue
      ? 'format=yuva444p,chromakey=' + color + ':0.08:0.12,format=rgba,despill=type=' + (green ? 'green' : 'blue') + ':mix=0.2:alpha=0'
      : 'format=rgba,colorkey=' + color + ':0.12:0.15';
    const directory = await mkdtemp(join(tmpdir(), 'reference-key-'));
    try {
      const source = join(directory, 'source.png'), keyed = join(directory, 'keyed.png');
      await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(source);
      try {
        await execute(process.env.FFMPEG_PATH || 'ffmpeg', ['-v', 'error', '-nostdin', '-y', '-i', source,
          '-vf', filter, '-frames:v', '1', keyed], { windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
      } catch (error) {
        throw new Error('参考图抠图失败：请检查 FFmpeg（PATH 或 FFMPEG_PATH）及 chromakey/colorkey/despill 滤镜。', { cause: error });
      }
      const result = await sharp(keyed).ensureAlpha().raw().toBuffer();
      if (result.length !== data.length) throw new Error('FFmpeg 输出尺寸不匹配');
      for (let p = 0; p < n; p++) {
        const i = p * 4, originalAlpha = data[i + 3];
        if (originalAlpha && !result[i + 3]) removed++;
        if (result[i + 3] && [0, 1, 2].some(c => result[i + c] !== data[i + c])) decontaminated++;
        result[i + 3] = Math.round(result[i + 3] * originalAlpha / 255);
      }
      result.copy(data);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
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
  return { version: 1, source: [w, h], target: [target.width, target.height], scale, offset: [left, top],
    key, borderSupport: support, transparentBorder, keySkipped: !key, resized: w !== target.width || h !== target.height, filter, removed, decontaminated };
}

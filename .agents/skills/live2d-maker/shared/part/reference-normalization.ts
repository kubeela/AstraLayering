import sharp from 'sharp';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

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
  thresholds: [number, number]; removed: number; decontaminated: number;
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
  const low = 40, high = 120;
  const original = Buffer.from(data);
  let removed = 0, decontaminated = 0;
  if (key) {
    const dist = new Float32Array(n);
    const boundaryDistance = new Int16Array(n).fill(-1);
    const queue = new Uint32Array(n); let head = 0, tail = 0;
    for (let p = 0; p < n; p++) {
      const i = p * 4, d = dist[p] = distance(i, key);
      const t = Math.max(0, Math.min(1, (d - low) / (high - low)));
      data[i + 3] = Math.round(original[i + 3] * t * t * (3 - 2 * t));
      if (d <= low && original[i + 3]) removed++;
      if (data[i + 3] === 0) { boundaryDistance[p] = 0; queue[tail++] = p; }
    }
    const neighbors = (p: number) => {
      const x = p % w, y = Math.floor(p / w);
      return [x ? p - 1 : -1, x + 1 < w ? p + 1 : -1, y ? p - w : -1, y + 1 < h ? p + w : -1];
    };
    // Bound edge processing to a sixteen-pixel band; interior colours are untouched.
    while (head < tail) {
      const p = queue[head++]; if (boundaryDistance[p] >= 16) continue;
      for (const q of neighbors(p)) if (q >= 0 && boundaryDistance[q] < 0) {
        boundaryDistance[q] = boundaryDistance[p] + 1; queue[tail++] = q;
      }
    }
    for (let p = 0; p < n; p++) {
      if (boundaryDistance[p] <= 0 || boundaryDistance[p] > 6 || !data[p * 4 + 3]) continue;
      const x = p % w, y = Math.floor(p / w); let best = -1, bestDistance = Infinity;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx, d = dx * dx + dy * dy;
        if ((boundaryDistance[q] < 0 || boundaryDistance[q] >= 4) && dist[q] >= high && original[q * 4 + 3] >= 240 && d < bestDistance) {
          best = q; bestDistance = d;
        }
      }
      if (best < 0) continue;
      const i = p * 4, j = best * 4;
      const v = key.map((b, c) => original[j + c] - b);
      const denominator = v.reduce((sum, a) => sum + a * a, 0);
      const alpha = Math.max(0, Math.min(1, v.reduce((sum, a, c) => sum + a * (original[i + c] - key[c]), 0) / denominator));
      const residual = Math.hypot(...key.map((b, c) => original[i + c] - (b + alpha * v[c])));
      if (alpha <= 0.02 || alpha >= 0.99 || residual > 24) continue;
      // Recover foreground RGB from C = alpha F + (1-alpha) B to avoid coloured fringes.
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(Math.max(0, Math.min(255, (original[i + c] - (1 - alpha) * key[c]) / alpha)));
      data[i + 3] = Math.round(original[i + 3] * alpha);
      decontaminated++;
    }
    // Estimate clean local foreground for JPEG spill. Neutralising a channel alone
    // loses the actual hair/skin colour; nearby uncontaminated pixels provide it.
    const dominant = key.indexOf(Math.max(...key));
    const others = [0, 1, 2].filter(c => c !== dominant);
    const keyExcess = key[dominant] - Math.max(...others.map(c => key[c]));
    if (keyExcess > 40) {
      const nearest = new Int32Array(n).fill(-1), reach = new Uint8Array(n);
      head = 0; tail = 0;
      for (let p = 0; p < n; p++) {
        const i = p * 4;
        if (original[i + 3] >= 240 && dist[p] >= high && (boundaryDistance[p] < 0 || boundaryDistance[p] >= 4)
          && original[i + dominant] - Math.max(...others.map(c => original[i + c])) <= 4) {
          nearest[p] = p; queue[tail++] = p;
        }
      }
      while (head < tail) {
        const p = queue[head++]; if (reach[p] >= 20) continue;
        for (const q of neighbors(p)) if (q >= 0 && nearest[q] < 0) {
          nearest[q] = nearest[p]; reach[q] = reach[p] + 1; queue[tail++] = q;
        }
      }
      for (let p = 0; p < n; p++) {
        if (boundaryDistance[p] <= 0 || boundaryDistance[p] > 16 || !data[p * 4 + 3] || nearest[p] < 0) continue;
        const i = p * 4, j = nearest[p] * 4;
        const excess = original[i + dominant] - Math.max(...others.map(c => original[i + c]));
        if (excess < 4) continue;
        const vector = key.map((b, c) => original[j + c] - b);
        const denominator = vector.reduce((sum, a) => sum + a * a, 0);
        const alpha = Math.max(0, Math.min(1, vector.reduce((sum, a, c) => sum + a * (original[i + c] - key[c]), 0) / denominator));
        const residual = Math.hypot(...key.map((b, c) => original[i + c] - (b + alpha * vector[c])));
        if (alpha <= 0.02 || residual > 70) continue;
        // Retain recoverable detail, using the local estimate to regularise JPEG error.
        const confidence = Math.max(0, 1 - residual / 35);
        for (let c = 0; c < 3; c++) {
          const recovered = (original[i + c] - (1 - alpha) * key[c]) / alpha;
          data[i + c] = Math.round(Math.max(0, Math.min(255, confidence * recovered + (1 - confidence) * original[j + c])));
        }
        const expectedExcess = original[j + dominant] - Math.max(...others.map(c => original[j + c]));
        data[i + dominant] = Math.min(data[i + dominant], Math.max(0, Math.max(...others.map(c => data[i + c])) + expectedExcess));
        data[i + 3] = Math.round(original[i + 3] * alpha);
        decontaminated++;
      }
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
    key, borderSupport: support, transparentBorder, keySkipped: !key, resized: w !== target.width || h !== target.height, thresholds: [low, high], removed, decontaminated };
}

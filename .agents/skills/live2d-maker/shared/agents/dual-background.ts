import sharp from 'sharp';

type RGB = [number, number, number];
type Observation = { data: Buffer; width: number; height: number };

// Known-background matting: C_j = alpha * F + (1 - alpha) * B_j.
// Estimate actual backgrounds rather than keying away a foreground colour.
function background({ data, width, height }: Observation): RGB {
  if (width < 2 || height < 2) throw new Error('双背景差分需要至少 2×2 的图像。');
  const border: number[] = [];
  for (let x = 0; x < width; x++) border.push(x * 3, ((height - 1) * width + x) * 3);
  for (let y = 1; y < height - 1; y++) border.push(y * width * 3, (y * width + width - 1) * 3);
  const rgb = [0, 1, 2].map(channel => {
    const bins = new Uint32Array(256);
    for (const offset of border) bins[data[offset + channel]]++;
    let total = 0;
    for (let value = 0; value < 256; value++) {
      total += bins[value];
      if (total > border.length / 2) return value;
    }
    return 255;
  }) as RGB;
  const consistent = border.filter(offset => rgb.every((value, c) => Math.abs(data[offset + c] - value) <= 16)).length;
  // A border may include foreground contact or a thin generated grey frame.
  // Require a dominant background, as in the existing reference colour sampler.
  if (consistent / border.length < 0.6) throw new Error('生成图片边缘没有可靠的均匀纯色背景，不能执行双背景差分。');
  return rgb;
}

async function observe(png: Buffer): Promise<Observation> {
  const { data, info } = await sharp(png).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// For fixed alpha, the least-squares premultiplied foreground is the mean
// observation minus the background. Enforce 0 <= P <= 255 * alpha jointly:
// clipping RGB after solving alpha creates saturated colour at uncertain edges.
function boundedAlpha(first: RGB, second: RGB, backgrounds: RGB[], mean: number[], initial: number): number {
  const d = mean.map((v, c) => (first[c] + second[c]) / 2 - v);
  if (d.every((v, c) => v + initial * mean[c] >= 0 && v + initial * mean[c] <= 255 * initial)) return initial;
  const points = [0, 1];
  for (let c = 0; c < 3; c++) {
    if (mean[c]) { const p = -d[c] / mean[c]; if (p > 0 && p < 1) points.push(p); }
    if (mean[c] < 255) { const p = d[c] / (255 - mean[c]); if (p > 0 && p < 1) points.push(p); }
  }
  points.sort((a, b) => a - b);
  let best = initial, loss = Infinity;
  const evaluate = (alpha: number) => {
    let value = 0;
    for (let c = 0; c < 3; c++) {
      const foreground = Math.max(0, Math.min(255 * alpha, d[c] + alpha * mean[c]));
      for (let j = 0; j < 2; j++) value += ((j ? second : first)[c] - foreground - (1 - alpha) * backgrounds[j][c]) ** 2;
    }
    if (value < loss) { best = alpha; loss = value; }
  };
  // Each interval has a fixed set of active channel bounds and a quadratic loss.
  for (let k = 0; k < points.length - 1; k++) {
    const lo = points[k], hi = points[k + 1], midpoint = (lo + hi) / 2;
    let linear = 0, quadratic = 0;
    for (let c = 0; c < 3; c++) {
      const candidate = d[c] + midpoint * mean[c];
      const mode = candidate < 0 ? 0 : candidate > 255 * midpoint ? 2 : 1;
      for (let j = 0; j < 2; j++) {
        const colour = (j ? second : first)[c], bg = backgrounds[j][c];
        const offset = mode === 1 ? colour - bg - d[c] : colour - bg;
        const slope = mode === 1 ? bg - mean[c] : mode === 2 ? bg - 255 : bg;
        linear += offset * slope; quadratic += slope * slope;
      }
    }
    evaluate(lo); evaluate(hi);
    if (quadratic) evaluate(Math.max(lo, Math.min(hi, -linear / quadratic)));
  }
  return best;
}

function opaqueInterior(alphas: Float32Array, p: number, width: number, height: number): boolean {
  const x = p % width, y = Math.floor(p / width);
  if (!x || !y || x === width - 1 || y === height - 1) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (alphas[p + dy * width + dx] <= 0.98) return false;
  }
  return true;
}

export async function counterpartBackground(png: Buffer): Promise<string> {
  const rgb = background(await observe(png));
  const white = rgb.reduce((sum, v) => sum + (255 - v) ** 2, 0);
  const black = rgb.reduce((sum, v) => sum + v ** 2, 0);
  return white >= black ? '#FFFFFF' : '#000000';
}

export async function recoverDualBackground(first: Buffer, second: Buffer, signal: AbortSignal) {
  signal.throwIfAborted();
  const [a, b] = await Promise.all([observe(first), observe(second)]);
  if (a.width !== b.width || a.height !== b.height) throw new Error('第二次换背景的画布尺寸与原始生图不同，不能逐像素差分。');
  const backgrounds = [background(a), background(b)];
  const delta = backgrounds[1].map((v, c) => v - backgrounds[0][c]);
  const squaredDistance = delta.reduce((sum, v) => sum + v * v, 0);
  if (squaredDistance < 64 ** 2) throw new Error('两次生图的实际背景颜色过于接近，不能可靠恢复透明度。');
  const meanBackground = backgrounds[0].map((v, c) => (v + backgrounds[1][c]) / 2);
  const rgba = Buffer.alloc(a.width * a.height * 4);
  const alphas = new Float32Array(a.width * a.height);
  for (let p = 0; p < alphas.length; p++) {
    if (p % 65536 === 0) signal.throwIfAborted();
    const i = p * 3;
    alphas[p] = Math.max(0, Math.min(1, 1 - delta.reduce((sum, v, c) => sum + (b.data[i + c] - a.data[i + c]) * v, 0) / squaredDistance));
  }
  // Reference-guided colour-difference despill. Fit disagreement between the
  // observations as a neutral brightness shift plus spill in the key direction.
  // A foreground colour shared by both observations has no spill to remove.
  const minimum = Math.min(...backgrounds[0]);
  const key = backgrounds[0].map(v => v - minimum);
  const keyMean = key.reduce((sum, v) => sum + v, 0) / 3;
  const centredKey = key.map(v => v - keyMean);
  const keyNorm = centredKey.reduce((sum, v) => sum + v * v, 0);
  let clippedPixels = 0, transparentPixels = 0, constrainedPixels = 0, despilledPixels = 0, preservedOpaquePixels = 0;
  for (let p = 0; p < a.width * a.height; p++) {
    if (p % 65536 === 0) signal.throwIfAborted();
    const i = p * 3, out = p * 4;
    const first: RGB = [a.data[i], a.data[i + 1], a.data[i + 2]];
    const second: RGB = [b.data[i], b.data[i + 1], b.data[i + 2]];
    if (alphas[p] > 0.98 && opaqueInterior(alphas, p, a.width, a.height)) {
      for (let c = 0; c < 3; c++) rgba[out + c] = first[c];
      rgba[out + 3] = 255; preservedOpaquePixels++;
      continue;
    }
    if (alphas[p] > 1 / 255 && keyNorm) {
      const difference = first.map((v, c) => v - second[c] + (1 - alphas[p]) * delta[c]);
      let spill = Math.max(0, centredKey.reduce((sum, v, c) => sum + v * difference[c], 0) / keyNorm);
      for (let c = 0; c < 3; c++) if (key[c]) spill = Math.min(spill, first[c] / key[c]);
      if (spill * Math.max(...key) > 0.5) {
        for (let c = 0; c < 3; c++) first[c] -= spill * key[c];
        despilledPixels++;
      }
    }
    const transmission = delta.reduce((sum, v, c) => sum + (second[c] - first[c]) * v, 0) / squaredDistance;
    if (transmission < 0 || transmission > 1) clippedPixels++;
    let alpha = Math.max(0, Math.min(1, 1 - transmission));
    // Keep the existing clear endpoint: fitting background noise must not turn
    // an already transparent pixel into a newly visible low-alpha speck.
    const constrained = alpha < 1 / 255 ? 0 : boundedAlpha(first, second, backgrounds, meanBackground, alpha);
    if (Math.abs(constrained - alpha) > 1e-10) constrainedPixels++;
    alpha = constrained;
    // Preserve 90%/95% translucent material; snap only the nearly opaque endpoint.
    if (alpha > 0.98) alpha = 1;
    if (alpha < 1 / 255) alpha = 0;
    rgba[out + 3] = Math.round(alpha * 255);
    if (!rgba[out + 3]) { transparentPixels++; continue; }
    // Keep the first artwork at the opaque endpoint. Fractional-alpha colour
    // uses both observations after despill and the joint constrained fit.
    for (let c = 0; c < 3; c++) {
      const premultiplied = (first[c] + second[c]) / 2 - (1 - alpha) * meanBackground[c];
      rgba[out + c] = Math.round(alpha === 1 ? first[c] : Math.max(0, Math.min(255, premultiplied / alpha)));
    }
  }
  signal.throwIfAborted();
  const image = sharp(rgba, { raw: { width: a.width, height: a.height, channels: 4 } });
  const [png, alpha] = await Promise.all([image.clone().png().toBuffer(), image.extractChannel(3).png().toBuffer()]);
  return { png, alpha, report: { method: 'dual-background', size: [a.width, a.height], backgrounds,
    alphaSolver: 'bounded-least-squares', despill: 'reference-colour-difference',
    solidThreshold: 0.98, clearThreshold: 1 / 255, clippedPixels, transparentPixels,
    constrainedPixels, despilledPixels, preservedOpaquePixels } };
}

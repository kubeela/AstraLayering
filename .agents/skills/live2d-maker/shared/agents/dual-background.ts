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
  let clippedPixels = 0, transparentPixels = 0;
  for (let p = 0; p < a.width * a.height; p++) {
    if (p % 65536 === 0) signal.throwIfAborted();
    const i = p * 3, out = p * 4;
    const transmission = delta.reduce((sum, v, c) => sum + (b.data[i + c] - a.data[i + c]) * v, 0) / squaredDistance;
    if (transmission < 0 || transmission > 1) clippedPixels++;
    let alpha = Math.max(0, Math.min(1, 1 - transmission));
    // Preserve 90%/95% translucent material; snap only the nearly opaque endpoint.
    if (alpha > 0.98) alpha = 1;
    if (alpha < 1 / 255) alpha = 0;
    rgba[out + 3] = Math.round(alpha * 255);
    if (!rgba[out + 3]) { transparentPixels++; continue; }
    // Refit foreground RGB after constraining alpha, using both observations.
    for (let c = 0; c < 3; c++) {
      const premultiplied = (a.data[i + c] + b.data[i + c]) / 2 - (1 - alpha) * meanBackground[c];
      rgba[out + c] = Math.round(Math.max(0, Math.min(255, premultiplied / alpha)));
    }
  }
  signal.throwIfAborted();
  const image = sharp(rgba, { raw: { width: a.width, height: a.height, channels: 4 } });
  const [png, alpha] = await Promise.all([image.clone().png().toBuffer(), image.extractChannel(3).png().toBuffer()]);
  return { png, alpha, report: { method: 'dual-background', size: [a.width, a.height], backgrounds,
    solidThreshold: 0.98, clearThreshold: 1 / 255, clippedPixels, transparentPixels } };
}

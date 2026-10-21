import sharp from 'sharp';
import type { ImageInput } from './images.ts';

const candidates = [
  { name: 'green', hex: '#00FF00', rgb: [0, 255, 0] },
  { name: 'blue', hex: '#0000FF', rgb: [0, 0, 255] },
  { name: 'red', hex: '#FF0000', rgb: [255, 0, 0] },
] as const;
export type BackgroundRecommendation = {
  version: 1; name: string; hex: string; rgb: readonly number[]; reason: string;
  reference: 'first-image' | 'none'; sourceBackground: number[] | null;
  foregroundPixels: number; anchorPixels: number;
  candidates: { name: string; hex: string; score: number; collisionPixels: number; hueRisk: number }[];
};

function distance(a: readonly number[], b: readonly number[]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// The first image is the edit target. Later control maps/style references must not
// vote with their instruction colours. Actual transparent RGB never votes either.
export async function recommendBackground(inputs: readonly ImageInput[]): Promise<BackgroundRecommendation> {
  const result: BackgroundRecommendation = { version: 1, ...candidates[0], reason: '没有目标参考的有效主体颜色，使用纯绿。',
    reference: inputs.length ? 'first-image' : 'none', sourceBackground: null, foregroundPixels: 0, anchorPixels: 0, candidates: [] };
  if (!inputs.length) return result;
  const { data, info } = await sharp(inputs[0].bytes).rotate().toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const hasActualAlpha = data.some((v, i) => i % 4 === 3 && v < 255);
  if (!hasActualAlpha) {
    const border: number[] = [], bins = new Map<number, number[]>();
    const sample = (x: number, y: number) => {
      const i = (y * width + x) * 4; border.push(i);
      const key = (data[i] >> 4) * 256 + (data[i + 1] >> 4) * 16 + (data[i + 2] >> 4);
      const bin = bins.get(key) ?? []; bin.push(i); bins.set(key, bin);
    };
    for (let x = 0; x < width; x++) { sample(x, 0); if (height > 1) sample(x, height - 1); }
    for (let y = 1; y < height - 1; y++) { sample(0, y); if (width > 1) sample(width - 1, y); }
    const modal = [...bins.values()].sort((a, b) => b.length - a.length)[0];
    const mean = (indices: number[]) => [0, 1, 2].map(c => indices.reduce((s, i) => s + data[i + c], 0) / indices.length);
    const center = mean(modal), cluster = border.filter(i => distance([data[i], data[i + 1], data[i + 2]], center) <= 32);
    if (cluster.length / border.length >= 0.6) result.sourceBackground = mean(cluster);
  }
  const palette = new Map<number, { color: number[]; count: number; anchors: number }>();
  const backgroundMean = result.sourceBackground ? result.sourceBackground.reduce((s, v) => s + v, 0) / 3 : 0;
  const coloredBackground = result.sourceBackground && Math.hypot(...result.sourceBackground.map(v => v - backgroundMean)) >= 24;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const color = [data[i], data[i + 1], data[i + 2]];
    if (result.sourceBackground && distance(color, result.sourceBackground) <= 48) continue;
    result.foregroundPixels++;
    let anchor = 1;
    if (coloredBackground) {
      // A gamut bound only selects near-opaque colour anchors; it is not an alpha
      // reconstruction. It reduces the influence of backdrop-tinted sheer pixels.
      anchor = Math.max(...color.map((v, c) => {
        const b = result.sourceBackground![c];
        return v >= b ? (v - b) / Math.max(255 - b, 1) : (b - v) / Math.max(b, 1);
      })) >= 0.8 ? 1 : 0;
    }
    result.anchorPixels += anchor;
    const key = (color[0] >> 4) * 256 + (color[1] >> 4) * 16 + (color[2] >> 4);
    const bin = palette.get(key) ?? { color: [0, 0, 0], count: 0, anchors: 0 };
    bin.count++; bin.anchors += anchor;
    for (let c = 0; c < 3; c++) bin.color[c] += color[c];
    palette.set(key, bin);
  }
  if (!result.foregroundPixels) return result;
  const colors = [...palette.values()].map(bin => ({ ...bin, color: bin.color.map(v => v / bin.count) }));
  const hasColorAnchors = colors.some(bin => {
    const mean = bin.color.reduce((s, v) => s + v, 0) / 3;
    return bin.anchors && Math.hypot(...bin.color.map(v => v - mean)) >= 12;
  });
  result.candidates = candidates.map(candidate => {
    const direction = candidate.rgb.map(v => v - 85), norm = Math.hypot(...direction);
    let collisionPixels = 0, maxRisk = 0, riskSum = 0, weights = 0;
    for (const bin of colors) {
      if (distance(bin.color, candidate.rgb) <= 64) collisionPixels += bin.count;
      const mean = bin.color.reduce((s, v) => s + v, 0) / 3;
      const chroma = bin.color.map(v => v - mean), magnitude = Math.hypot(...chroma);
      if (magnitude < 12) continue;
      const weight = hasColorAnchors ? bin.anchors : bin.count;
      if (!weight) continue;
      const risk = Math.max(0, Math.min(1, (1 + chroma.reduce((s, v, c) => s + v * direction[c], 0) / (magnitude * norm)) / 2));
      maxRisk = Math.max(maxRisk, risk);
      riskSum += risk * magnitude * weight; weights += magnitude * weight;
    }
    const hueRisk = 0.65 * maxRisk + 0.35 * (weights ? riskSum / weights : 0);
    // Even a small saturated detail must veto an otherwise attractive key colour.
    // If all three collide, minimize the affected area rather than claim a safe key.
    const score = (collisionPixels ? 1000 + 1000 * collisionPixels / result.foregroundPixels : 0) + 100 * hueRisk;
    return { name: candidate.name, hex: candidate.hex, score, collisionPixels, hueRisk };
  });
  const ranked = [...result.candidates].sort((a, b) => a.score - b.score);
  const selected = candidates.find(c => c.name === ranked[0].name)!;
  Object.assign(result, selected);
  result.reason = ranked[0].collisionPixels
    ? '三个候选均有主体近色，选择冲突面积和色相混淆综合风险最低者；仍需检查同色细节。'
    : '优先避开主体近色细节，再选择与主体色相分离最明显的候选；使用近不透明颜色锚点降低背景透色的干扰。';
  return result;
}

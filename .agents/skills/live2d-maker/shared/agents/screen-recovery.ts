export type ForegroundEnvelope = { channel: number; resolution: number; values: number[] };
export type ScreenRecovery = {
  rgba: Uint8Array;
  report: { method: 'reference-screen-recovery-v1'; background: number[]; adjustedPixels: number; clearedPixels: number; unresolvedPixels: number };
};

// Bound the keyed channel by colours actually present in the target reference,
// conditional on the other two channels. Genuine keyed-colour artwork remains
// represented; a single global "remove green" threshold cannot provide this.
export function foregroundEnvelope(colors: readonly (readonly number[])[], channel: number): ForegroundEnvelope {
  const resolution = 32, bins = new Map<number, number>(), other = [0, 1, 2].filter(value => value !== channel);
  const add = (color: readonly number[]) => {
    const x = Math.min(31, Math.floor(color[other[0]] / 8)), y = Math.min(31, Math.floor(color[other[1]] / 8));
    const key = y * resolution + x, excess = color[channel] - (color[other[0]] + color[other[1]]) / 2;
    bins.set(key, Math.max(bins.get(key) ?? -255, excess));
  };
  for (const color of colors) add(color);
  for (let value = 0; value <= 255; value += 8) add([value, value, value]);
  add([255, 255, 255]);
  const values = Array.from({ length: resolution * resolution }, (_, index) => {
    if (bins.has(index)) return bins.get(index)!;
    const x = index % resolution, y = Math.floor(index / resolution);
    let distance = Infinity, result = -255;
    for (const [key, excess] of bins) {
      const d = (x - key % resolution) ** 2 + (y - Math.floor(key / resolution)) ** 2;
      if (d < distance) { distance = d; result = excess; }
      else if (d === distance) result = Math.max(result, excess);
    }
    return result;
  });
  return { channel, resolution, values };
}

export function recoverScreenEdges(rgb: Uint8Array, rgba: Uint8Array, width: number, height: number,
  background: readonly number[], envelope?: ForegroundEnvelope): ScreenRecovery {
  const size = width * height;
  if (rgb.length !== size * 3 || rgba.length !== size * 4 || background.length !== 3
    || !background.every(value => Number.isFinite(value) && value >= 0 && value <= 255)) throw new Error('Invalid screen recovery image or background');
  const output = Uint8Array.from(rgba), channel = background.indexOf(Math.max(...background));
  const report: ScreenRecovery['report'] = { method: 'reference-screen-recovery-v1', background: [...background], adjustedPixels: 0, clearedPixels: 0, unresolvedPixels: 0 };
  if (!envelope || envelope.channel !== channel || envelope.values.length !== envelope.resolution ** 2) return { rgba: output, report };
  const other = [0, 1, 2].filter(value => value !== channel), resolution = envelope.resolution;
  const bound = (color: ArrayLike<number>, offset = 0) => {
    const x = Math.max(0, Math.min(resolution - 1, color[offset + other[0]] * resolution / 256));
    const y = Math.max(0, Math.min(resolution - 1, color[offset + other[1]] * resolution / 256));
    const ix = Math.floor(x), iy = Math.floor(y);
    const at = (x: number, y: number) => envelope.values[Math.min(y, resolution - 1) * resolution + Math.min(x, resolution - 1)];
    // This is an upper envelope, not a colour interpolant. Averaging a genuine
    // coloured anchor with a neutral neighbour can erase that accent at an edge.
    return Math.max(at(ix, iy), at(ix + 1, iy), at(ix, iy + 1), at(ix + 1, iy + 1));
  };
  const excess = (color: ArrayLike<number>, offset = 0) => color[offset + channel] - (color[offset + other[0]] + color[offset + other[1]]) / 2;

  // Generated solid screens vary slightly. Recover the local screen from the
  // nearest confidently removed pixel instead of assuming a perfectly flat RGB.
  const nearest = new Int32Array(size).fill(-1), distance = new Uint16Array(size).fill(65535), queue = new Int32Array(size);
  let head = 0, tail = 0;
  for (let i = 0; i < size; i++) {
    if (rgba[i * 4 + 3] !== 0 || Math.max(...background.map((v, c) => Math.abs(v - rgb[i * 3 + c]))) > 48) continue;
    nearest[i] = i; distance[i] = 0; queue[tail++] = i;
  }
  if (!tail) return { rgba: output, report };
  while (head < tail) {
    const i = queue[head++];
    const visit = (next: number) => {
      if (nearest[next] >= 0) return;
      nearest[next] = nearest[i]; distance[next] = distance[i] + 1; queue[tail++] = next;
    };
    if (i % width > 0) visit(i - 1);
    if (i % width < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < size - width) visit(i + width);
  }
  const edgeRadius = Math.max(3, Math.min(12, Math.ceil(Math.min(width, height) / 128)));
  for (let i = 0; i < size; i++) {
    const alpha = rgba[i * 4 + 3] / 255;
    if (!alpha || alpha === 1 && distance[i] > edgeRadius) continue;
    if (excess(rgba, i * 4) <= bound(rgba, i * 4) + 3) continue;
    const screen = [0, 1, 2].map(c => rgb[nearest[i] * 3 + c]), observed = [0, 1, 2].map(c => rgb[i * 3 + c]);
    // Screen variation must never turn an almost transparent background pixel
    // opaque. Refine within the existing coverage; do not raise alpha to satisfy
    // a gamut bound computed from a slightly different neighbouring backdrop.
    const minimum = Math.min(alpha, 1 / 255), upper = alpha;
    const colourAt = (a: number) => observed.map((v, c) => Math.max(0, Math.min(255, (v - (1 - a) * screen[c]) / a)));
    const valid = (color: number[]) => excess(color) <= bound(color) + 3;
    let chosen = -1, previous = upper, color: number[] = [];
    for (let step = 0; step <= 32; step++) {
      const candidate = upper - (upper - minimum) * step / 32, value = colourAt(candidate);
      if (valid(value)) {
        chosen = candidate; color = value;
        if (step) {
          let low = candidate, high = previous;
          for (let n = 0; n < 10; n++) { const mid = (low + high) / 2; if (valid(colourAt(mid))) low = mid; else high = mid; }
          chosen = low; color = colourAt(low);
        }
        break;
      }
      previous = candidate;
    }
    if (chosen < 0) { report.unresolvedPixels++; continue; }
    if (chosen <= 1 / 255) { output.fill(0, i * 4, i * 4 + 4); report.clearedPixels++; }
    else { for (let c = 0; c < 3; c++) output[i * 4 + c] = Math.round(color[c]); output[i * 4 + 3] = Math.round(chosen * 255); }
    report.adjustedPixels++;
  }
  return { rgba: output, report };
}

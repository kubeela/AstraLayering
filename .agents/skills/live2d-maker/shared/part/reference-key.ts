// Legacy opaque reference cleanup in Node. Retains the established key/blend widths
// and conservative spill mix; Nano generations use dual-background matting instead.
export function keyReferencePixels(data: Buffer, width: number, height: number, key: number[]) {
  const green = key[1] - Math.max(key[0], key[2]) > 40;
  const blue = key[2] - Math.max(key[0], key[1]) > 40;
  const chroma = green || blue;
  const uv = (r: number, g: number, b: number) => [128 - .148 * r - .291 * g + .439 * b, 128 + .439 * r - .368 * g - .071 * b];
  const keyUv = uv(...key as [number, number, number]);
  const diff = new Float32Array(width * height);
  for (let p = 0; p < diff.length; p++) {
    const i = p * 4;
    if (chroma) {
      const c = uv(data[i], data[i + 1], data[i + 2]);
      diff[p] = Math.hypot(c[0] - keyUv[0], c[1] - keyUv[1]) / (255 * Math.SQRT2);
    } else diff[p] = Math.hypot(data[i] - key[0], data[i + 1] - key[1], data[i + 2] - key[2]) / (255 * Math.sqrt(3));
  }
  let removed = 0, decontaminated = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x, i = p * 4;
    let distance = diff[p];
    if (chroma) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        sum += diff[Math.max(0, Math.min(height - 1, y + dy)) * width + Math.max(0, Math.min(width - 1, x + dx))];
      }
      distance = sum / 9;
    }
    const alpha = Math.round(Math.max(0, Math.min(1, (distance - (chroma ? .08 : .12)) / (chroma ? .12 : .15))) * data[i + 3]);
    if (data[i + 3] && !alpha) removed++;
    if (chroma) {
      const spill = Math.max(0, (green ? data[i + 1] : data[i + 2]) - (.2 * data[i] + .8 * data[i + (green ? 2 : 1)]));
      // The previous despill filter used its default green scale even with a blue key.
      const value = Math.max(0, Math.round(data[i + 1] - spill));
      if (alpha && value !== data[i + 1]) decontaminated++;
      data[i + 1] = value;
    }
    data[i + 3] = alpha;
  }
  return { method: chroma ? 'node-chroma-despill' as const : 'node-rgb-key' as const, removed, decontaminated };
}

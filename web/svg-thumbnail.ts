import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

// Crop the rendered alpha, not path/control-point bounds: include strokes, clips,
// transforms and translucent paint, while ignoring invisible SVG geometry.
export async function renderContentThumbnail(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (!data[(y * info.width + x) * info.channels + info.channels - 1]) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) return sharp({ create: { width: 1, height: 1, channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const cropped = await sharp(data, { raw: info })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width: 512, height: 512, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  const horizontal = Math.max(1, Math.ceil(cropped.info.width * .06));
  const vertical = Math.max(1, Math.ceil(cropped.info.height * .06));
  return sharp(cropped.data).extend({ left: horizontal, right: horizontal, top: vertical, bottom: vertical,
    background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

export const renderSVGThumbnail = renderContentThumbnail;

export class SVGThumbnails {
  // One version per file, bounded LRU and two renders at once. Polling unchanged
  // artifacts shares the same promise; drafts invalidate on actual file changes.
  private cache = new Map<string, { version: string; image: Promise<Buffer | undefined> }>();
  private active = 0;
  private waiting: Array<() => void> = [];

  get(file: string, version: string): Promise<Buffer | undefined> {
    const previous = this.cache.get(file);
    this.cache.delete(file);
    const entry = previous?.version === version ? previous : { version, image: this.render(file) };
    this.cache.set(file, entry);
    if (this.cache.size > 32) this.cache.delete(this.cache.keys().next().value!);
    return entry.image;
  }

  private async render(file: string): Promise<Buffer | undefined> {
    if (this.active >= 2) await new Promise<void>(resolve => this.waiting.push(resolve));
    else this.active++;
    try {
      return await renderSVGThumbnail(await readFile(file));
    } catch {
      // An unfinished/unsupported draft keeps its original preview and link.
      return undefined;
    } finally {
      const next = this.waiting.shift();
      if (next) next(); else this.active--;
    }
  }
}

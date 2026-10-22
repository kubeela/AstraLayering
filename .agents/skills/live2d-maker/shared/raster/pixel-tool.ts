import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { toolDefinition } from '../codex/tool-config.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import { canonicalPath, within } from './run-store.ts';

type Box = [number, number, number, number];
type Region = { kind: 'missing' | 'extra' | 'color'; bounds: Box; pixels: number };
const kinds = ['missing', 'extra', 'color'] as const;
const colors = ['#ff4040', '#00b8ff', '#ffbd00'];

// Coordinates stay in the original canvas. These are candidate differences,
// never an automatic acceptance verdict or a generated painting repair.
export function createPixelTool(directory: string, taskRoot: string, output: string): FunctionTool {
  const definition = toolDefinition('locate_pixel_differences');
  return {
    ...definition,
    async execute(value, signal) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('参数须为对象');
      const args = value as Record<string, unknown>;
      const root = await realpath(taskRoot);
      const source = async (key: string) => {
        if (typeof args[key] !== 'string' || !args[key].trim()) throw new Error(`${key} 须为图片路径`);
        const path = await realpath(resolve(directory, args[key]));
        if (!within(root, path)) throw new Error('输入图片必须位于本次任务目录内');
        return path;
      };
      const image = async (path: string) => sharp(path, { limitInputPixels: 16_000_000 })
        .toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const reference = await source('reference'), current = await source('current');
      signal.throwIfAborted();
      const ref = await image(reference), cur = await image(current);
      const { width, height } = ref.info;
      if (width !== cur.info.width || height !== cur.info.height) throw new Error('画布尺寸不同；请导出同一画布坐标的 PNG，不要缩放或平移参考图');
      const maskPath = args.visible_mask === undefined ? undefined : await source('visible_mask');
      const mask = maskPath ? await image(maskPath) : undefined;
      if (mask && (mask.info.width !== width || mask.info.height !== height)) throw new Error('visible_mask 必须与参考图同尺寸');
      const crop = args.crop ?? [0, 0, width, height];
      if (!Array.isArray(crop) || crop.length !== 4 || crop.some(n => !Number.isSafeInteger(n) || n < 0)
        || !crop[2] || !crop[3] || crop[0] + crop[2] > width || crop[1] + crop[3] > height) throw new Error('crop 须为画布内的 [x,y,width,height]');
      const [left, top, w, h] = crop as Box;
      const setting = (key: string, fallback: number, max: number) => {
        const properties = definition.inputSchema.properties as Record<string, { default?: unknown }> | undefined;
        const n = args[key] ?? properties?.[key]?.default ?? fallback;
        if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 1 || n > max) throw new Error(`${key} 须为 1 至 ${max} 的整数`);
        return n;
      };
      const colorThreshold = setting('color_threshold', 80, 255), alphaThreshold = setting('alpha_threshold', 96, 255);
      const minPixels = setting('min_region_pixels', 64, 16_000_000), maxRegions = setting('max_regions', 40, 200);
      const labels = new Uint8Array(w * h), heat = Buffer.alloc(w * h * 4), counts = { missing: 0, extra: 0, color: 0 };
      for (let y = 0; y < h; y++) {
        if (y % 128 === 0) signal.throwIfAborted();
        for (let x = 0; x < w; x++) {
          const i = ((top + y) * width + left + x) * 4, j = y * w + x;
          if (mask && Math.max(mask.data[i], mask.data[i + 1], mask.data[i + 2]) * mask.data[i + 3] / 255 < 128) continue;
          const ra = ref.data[i + 3], ca = cur.data[i + 3];
          let kind = 0;
          if (ra >= 128 && ra - ca >= alphaThreshold) kind = 1;
          else if (ca >= 128 && ca - ra >= alphaThreshold) kind = 2;
          else if (ra >= 128 && ca >= 128) {
            let difference = 0;
            for (let c = 0; c < 3; c++) difference = Math.max(difference, Math.abs(ref.data[i + c] - cur.data[i + c]));
            if (difference >= colorThreshold) kind = 3;
          }
          if (!kind) continue;
          labels[j] = kind; counts[kinds[kind - 1]]++;
          const rgb = kind === 1 ? [255, 64, 64] : kind === 2 ? [0, 184, 255] : [255, 189, 0];
          for (let c = 0; c < 3; c++) heat[j * 4 + c] = rgb[c];
          heat[j * 4 + 3] = 220;
        }
      }
      const regions: Region[] = [], queue = new Int32Array(labels.length);
      for (let seed = 0; seed < labels.length; seed++) {
        const kind = labels[seed]; if (!kind) continue;
        signal.throwIfAborted();
        let read = 0, size = 1, x0 = w, y0 = h, x1 = 0, y1 = 0;
        queue[0] = seed; labels[seed] = 0;
        while (read < size) {
          const pos = queue[read++], x = pos % w, y = Math.floor(pos / w);
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
            for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
              const next = yy * w + xx;
              if (labels[next] === kind) { labels[next] = 0; queue[size++] = next; }
            }
        }
        if (size >= minPixels) regions.push({ kind: kinds[kind - 1], bounds: [left + x0, top + y0, x1 - x0 + 1, y1 - y0 + 1], pixels: size });
      }
      regions.sort((a, b) => b.pixels - a.pixels);
      const selected = regions.slice(0, maxRegions);
      const destination = await canonicalPath(output);
      if (!within(root, destination)) throw new Error('诊断输出必须位于本次任务目录内');
      await mkdir(destination, { recursive: true });
      const folder = join(await realpath(destination), randomUUID());
      await mkdir(folder);
      const files = { diagnostics: join(folder, 'differences.json'), heatmap: join(folder, 'heatmap.png'),
        marked: join(folder, 'marked.png'), comparison: join(folder, 'comparison.png') };
      const meta = { reference, current, visibleMask: maskPath, canvas: [width, height], crop,
        thresholds: { color: colorThreshold, alpha: alphaThreshold, minRegionPixels: minPixels },
        counts, regions, note: '候选差异须看图确认。补全区不能按不可见原图判错；细微柔边留给 step02。' };
      await writeFile(files.diagnostics, JSON.stringify(meta, null, 2) + '\n');
      const raw = { width: w, height: h, channels: 4 as const };
      await sharp(heat, { raw }).png().toFile(files.heatmap);
      const rectangles = selected.map((r, i) => {
        const [x, y, rw, rh] = r.bounds, color = colors[kinds.indexOf(r.kind)];
        return `<rect x="${x - left}" y="${y - top}" width="${rw}" height="${rh}" fill="none" stroke="${color}" stroke-width="2"/><text x="${x - left}" y="${Math.max(12, y - top)}" fill="${color}" font-size="14">${i + 1}</text>`;
      }).join('');
      const overlay = Buffer.from(`<svg width="${w}" height="${h}">${rectangles}</svg>`);
      const extract = { left, top, width: w, height: h };
      const marked = await sharp(current).extract(extract).composite([{ input: overlay }]).png().toBuffer();
      await writeFile(files.marked, marked);
      const original = await sharp(reference).extract(extract).png().toBuffer();
      await sharp({ create: { width: w * 2, height: h, channels: 4, background: '#888888' } })
        .composite([{ input: original, left: 0, top: 0 }, { input: marked, left: w, top: 0 }]).png().toFile(files.comparison);
      signal.throwIfAborted();
      return textResult({ ...meta, regions: selected, totalRegions: regions.length, files,
        comparisonLayout: '左参考、右当前标记；两侧同尺寸，坐标为原画布坐标；热图是 crop 区域。' });
    },
  };
}

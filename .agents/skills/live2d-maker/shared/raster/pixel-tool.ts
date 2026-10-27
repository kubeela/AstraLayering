import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { toolDefinition } from '../codex/tool-config.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import { canonicalPath } from './run-store.ts';
import { exportKraLayers, partScope, type PartScopeOptions } from './pixel-part-scope.ts';

type Box = [number, number, number, number];
type Region = { kind: 'missing' | 'extra' | 'color'; bounds: Box; pixels: number };
const kinds = ['missing', 'extra', 'color'] as const;
const colors = ['#ff4040', '#00b8ff', '#ffbd00'];

// Coordinates stay in the original canvas. These are candidate differences,
// never an automatic acceptance verdict or a generated painting repair.
export function createPixelTool(directory: string, _taskRoot: string, output: string,
  options: PartScopeOptions & { namespace?: 'character' | 'clothing' } = {}): FunctionTool {
  const definition = toolDefinition('locate_pixel_differences');
  return {
    ...definition,
    async execute(value, signal, context) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('参数须为对象');
      const args = value as Record<string, unknown>;
      const source = async (key: string, fallback?: string) => {
        const requested = args[key] ?? fallback;
        if (typeof requested !== 'string' || !requested.trim()) throw new Error(`${key} 须为文件路径`);
        const path = await realpath(resolve(directory, requested));
        return path;
      };
      const image = async (bytes: Buffer) => sharp(bytes, { limitInputPixels: 16_000_000 })
        .toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const reference = await source('reference'), current = await source('current');
      signal.throwIfAborted();
      const referenceBytes = await readFile(reference), currentBytes = await readFile(current);
      const ref = await image(referenceBytes), cur = await image(currentBytes);
      const { width, height } = ref.info;
      if (width !== cur.info.width || height !== cur.info.height) throw new Error('画布尺寸不同；请导出同一画布坐标的 PNG，不要缩放或平移参考图');
      const maskPath = args.visible_mask === undefined ? undefined : await source('visible_mask');
      const mask = maskPath ? await image(await readFile(maskPath)) : undefined;
      if (mask && (mask.info.width !== width || mask.info.height !== height)) throw new Error('visible_mask 必须与参考图同尺寸');
      const crop = args.crop ?? [0, 0, width, height];
      if (!Array.isArray(crop) || crop.length !== 4 || crop.some(n => !Number.isSafeInteger(n) || n < 0)
        || !crop[2] || !crop[3] || crop[0] + crop[2] > width || crop[1] + crop[3] > height) throw new Error('crop 须为画布内的 [x,y,width,height]');
      const [left, top, w, h] = crop as Box;
      const setting = (key: string, fallback: number, max: number, min = 1) => {
        const properties = definition.inputSchema.properties as Record<string, { default?: unknown }> | undefined;
        const n = args[key] ?? properties?.[key]?.default ?? fallback;
        if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${key} 须为 ${min} 至 ${max} 的整数`);
        return n;
      };
      const colorThreshold = setting('color_threshold', 80, 255), alphaThreshold = setting('alpha_threshold', 96, 255);
      const coarseThreshold = setting('coarse_color_threshold', 32, 255), gap = setting('region_gap_pixels', 1, 8, 0);
      const minPixels = setting('min_region_pixels', 64, 16_000_000), maxRegions = setting('max_regions', 40, 200);
      if (args.parts !== undefined && (!Array.isArray(args.parts) || args.parts.length > 100
        || args.parts.some(part => typeof part !== 'string' || !part.trim()) || new Set(args.parts).size !== args.parts.length)) {
        throw new Error('parts 须为最多 100 个不重复的部件路径；不填或空数组表示全图');
      }
      const parts = (args.parts ?? []) as string[], padding = setting('part_padding', 8, 64, 0);
      const destination = await canonicalPath(context ? join(context.workspace, 'pixel-review') : output);
      await mkdir(destination, { recursive: true });
      const folder = join(await realpath(destination), randomUUID());
      await mkdir(folder);
      const currentKra = parts.length ? await source('current_kra', current.slice(0, current.length - extname(current).length) + '.kra') : undefined;
      let selection: Awaited<ReturnType<typeof partScope>> | undefined;
      if (currentKra) {
        if (!options.krita) throw new Error('按部件检测需要当前工作流已配置的 Krita');
        const sources = options.sources ?? (options.namespace ? [{ namespace: options.namespace, document: currentKra }] : []);
        const ora = await (options.exportLayers ?? exportKraLayers)(currentKra, folder, options.krita, options.env ?? process.env, signal);
        selection = await partScope(ora, parts, padding, [width, height], sources, signal);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const pos = y * width + x, i = pos * 4;
          if (x < left || x >= left + w || y < top || y >= top + h
            || mask && Math.max(mask.data[i], mask.data[i + 1], mask.data[i + 2]) * mask.data[i + 3] / 255 < 128) selection.mask[pos] = 0;
        }
      }
      // Compare coherent local differences as well as sharp ones. Flattening
      // removes invisible RGB; this diagnostic smoothing never edits artwork.
      const coarse = async (bytes: Buffer) => sharp(bytes, { limitInputPixels: 16_000_000 })
        .toColourspace('srgb').flatten({ background: '#808080' }).removeAlpha().blur(2).raw().toBuffer();
      const refCoarse = await coarse(referenceBytes), curCoarse = await coarse(currentBytes);
      const labels = new Uint8Array(w * h), heat = Buffer.alloc(w * h * 4), counts = { missing: 0, extra: 0, color: 0 };
      for (let y = 0; y < h; y++) {
        if (y % 128 === 0) signal.throwIfAborted();
        for (let x = 0; x < w; x++) {
          const i = ((top + y) * width + left + x) * 4, j = y * w + x;
          if (selection && !selection.mask[(top + y) * width + left + x]) continue;
          if (mask && Math.max(mask.data[i], mask.data[i + 1], mask.data[i + 2]) * mask.data[i + 3] / 255 < 128) continue;
          const ra = ref.data[i + 3], ca = cur.data[i + 3];
          let kind = 0;
          if (ra >= 128 && ra - ca >= alphaThreshold) kind = 1;
          else if (ca >= 128 && ca - ra >= alphaThreshold) kind = 2;
          else if (ra >= 128 && ca >= 128) {
            let difference = 0, coherentDifference = 0;
            const k = ((top + y) * width + left + x) * 3;
            for (let c = 0; c < 3; c++) {
              difference = Math.max(difference, Math.abs(ref.data[i + c] - cur.data[i + c]));
              coherentDifference = Math.max(coherentDifference, Math.abs(refCoarse[k + c] - curCoarse[k + c]));
            }
            if (difference >= colorThreshold || coherentDifference >= coarseThreshold) kind = 3;
          }
          if (!kind) continue;
          labels[j] = kind; counts[kinds[kind - 1]]++;
          const rgb = kind === 1 ? [255, 64, 64] : kind === 2 ? [0, 184, 255] : [255, 189, 0];
          for (let c = 0; c < 3; c++) heat[j * 4 + c] = rgb[c];
          heat[j * 4 + 3] = 220;
        }
      }
      const regions: Region[] = [], queue = new Int32Array(labels.length), expanded = new Uint8Array(labels.length);
      for (let kind = 1; kind <= kinds.length; kind++) {
        expanded.fill(0);
        for (let pos = 0; pos < labels.length; pos++) {
          if (labels[pos] !== kind) continue;
          const x = pos % w, y = Math.floor(pos / w);
          for (let yy = Math.max(0, y - gap); yy <= Math.min(h - 1, y + gap); yy++)
            for (let xx = Math.max(0, x - gap); xx <= Math.min(w - 1, x + gap); xx++) {
              if (!selection || selection.mask[(top + yy) * width + left + xx]) expanded[yy * w + xx] = 1;
            }
        }
        for (let seed = 0; seed < expanded.length; seed++) {
          if (!expanded[seed]) continue;
          signal.throwIfAborted();
          let read = 0, size = 1, pixels = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
          queue[0] = seed; expanded[seed] = 0;
          while (read < size) {
            const pos = queue[read++], x = pos % w, y = Math.floor(pos / w);
            if (labels[pos] === kind) {
              pixels++;
              x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            }
            for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++)
              for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
                const next = yy * w + xx;
                if (expanded[next]) { expanded[next] = 0; queue[size++] = next; }
              }
          }
          // Count and bound real candidates, not pixels introduced by grouping.
          if (pixels >= minPixels) regions.push({ kind: kinds[kind - 1], bounds: [left + x0, top + y0, x1 - x0 + 1, y1 - y0 + 1], pixels });
        }
      }
      regions.sort((a, b) => b.pixels - a.pixels);
      const selected = regions.slice(0, maxRegions);
      const files = { diagnostics: join(folder, 'differences.json'), heatmap: join(folder, 'heatmap.png'),
        marked: join(folder, 'marked.png'), comparison: join(folder, 'comparison.png'),
        ...(selection ? { scope: join(folder, 'scope.png'), scopePreview: join(folder, 'scope-preview.png') } : {}) };
      const meta = { reference, current, visibleMask: maskPath, canvas: [width, height], crop,
        ...(selection ? { partSelection: { parts, padding, currentKra, layers: selection.bounds } } : {}),
        thresholds: { color: colorThreshold, coarseColor: coarseThreshold, blurSigma: 2, regionGapPixels: gap, alpha: alphaThreshold, minRegionPixels: minPixels },
        counts, regions, note: '以候选框为局部检查入口，依据当前阶段职责和参考确认修复范围。候选不决定通过或内容归属；选择部件时只统计其当前范围及周边。' };
      await writeFile(files.diagnostics, JSON.stringify(meta, null, 2) + '\n');
      if (selection) {
        await sharp(selection.mask, { raw: { width, height, channels: 1 } }).png().toFile(files.scope!);
        const tint = Buffer.alloc(width * height * 4);
        for (let pos = 0; pos < selection.mask.length; pos++) {
          if (selection.mask[pos]) { tint[pos * 4 + 1] = 190; tint[pos * 4 + 2] = 140; tint[pos * 4 + 3] = 70; }
          else tint[pos * 4 + 3] = 110;
        }
        await sharp(currentBytes).composite([{ input: tint, raw: { width, height, channels: 4 } }]).png().toFile(files.scopePreview!);
      }
      const raw = { width: w, height: h, channels: 4 as const };
      await sharp(heat, { raw }).png().toFile(files.heatmap);
      const rectangles = selected.map((r, i) => {
        const [x, y, rw, rh] = r.bounds, color = colors[kinds.indexOf(r.kind)];
        return `<rect x="${x - left}" y="${y - top}" width="${rw}" height="${rh}" fill="none" stroke="${color}" stroke-width="2"/><text x="${x - left}" y="${Math.max(12, y - top)}" fill="${color}" font-size="14">${i + 1}</text>`;
      }).join('');
      const overlay = Buffer.from(`<svg width="${w}" height="${h}">${rectangles}</svg>`);
      const extract = { left, top, width: w, height: h };
      const marked = await sharp(currentBytes).extract(extract).composite([{ input: overlay }]).png().toBuffer();
      await writeFile(files.marked, marked);
      const original = await sharp(referenceBytes).extract(extract).png().toBuffer();
      await sharp({ create: { width: w * 2, height: h, channels: 4, background: '#888888' } })
        .composite([{ input: original, left: 0, top: 0 }, { input: marked, left: w, top: 0 }]).png().toFile(files.comparison);
      signal.throwIfAborted();
      return textResult({ ...meta, regions: selected, totalRegions: regions.length, files,
        comparisonLayout: '左参考、右当前标记；两侧同尺寸，坐标为原画布坐标；热图是 crop 区域。' });
    },
  };
}

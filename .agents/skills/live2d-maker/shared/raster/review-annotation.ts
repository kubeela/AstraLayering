import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { toolDefinition } from '../codex/tool-config.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import { canonicalPath, within } from './run-store.ts';

type Box = [number, number, number, number];
type Annotation = { id: string; bounds: Box; layers: string[]; description: string };

// The reviewer supplies the findings and coordinates. This tool only publishes
// evidence; it never searches for differences or changes source artwork.
export function createReviewAnnotationTool(directory: string, taskRoot: string, output: string): FunctionTool {
  const definition = toolDefinition('annotate_review_regions');
  return {
    ...definition,
    async execute(value, signal) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('参数须为对象');
      const args = value as Record<string, unknown>, root = await realpath(taskRoot);
      const source = async (key: string) => {
        if (typeof args[key] !== 'string' || !args[key].trim()) throw new Error(`${key} 须为图片路径`);
        const path = await realpath(resolve(directory, args[key]));
        if (!within(root, path)) throw new Error('输入图片必须位于本次任务目录内');
        return { path, bytes: await readFile(path) };
      };
      signal.throwIfAborted();
      const image = await source('image'), reference = args.reference === undefined ? undefined : await source('reference');
      const options = { limitInputPixels: 16_000_000 };
      const { width, height } = await sharp(image.bytes, options).metadata();
      if (!width || !height) throw new Error('无法读取图片画布');
      if (reference) {
        const info = await sharp(reference.bytes, options).metadata();
        if (info.width !== width || info.height !== height) throw new Error('参考与当前图片画布尺寸不同；请使用同画布导出，不要缩放或移动参考');
      }
      const properties = definition.inputSchema.properties as Record<string, { default?: unknown }>;
      const padding = args.padding ?? properties.padding.default ?? 16;
      if (typeof padding !== 'number' || !Number.isSafeInteger(padding) || padding < 0 || padding > 256) throw new Error('padding 须为 0 至 256 的整数');
      if (!Array.isArray(args.regions) || !args.regions.length || args.regions.length > 100) throw new Error('regions 须包含 1 至 100 个已确认问题');
      const ids = new Set<string>();
      const regions = args.regions.map((value): Annotation => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('问题项须为对象');
        const { id, bounds, layers, description } = value as Record<string, unknown>;
        if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,24}$/.test(id) || ids.has(id)) throw new Error('问题 id 须为唯一的字母/数字/下划线/连字符编号');
        ids.add(id);
        if (!Array.isArray(bounds) || bounds.length !== 4 || bounds.some(n => !Number.isSafeInteger(n) || n < 0)
          || !bounds[2] || !bounds[3] || bounds[0] + bounds[2] > width || bounds[1] + bounds[3] > height) throw new Error(`${id} 的 bounds 须为原画布内 [x,y,width,height]`);
        if (!Array.isArray(layers) || !layers.length || layers.some(name => typeof name !== 'string' || !name.trim())) throw new Error(`${id} 需要相关 layers`);
        if (typeof description !== 'string' || !description.trim()) throw new Error(`${id} 需要问题 description`);
        return { id, bounds: bounds as Box, layers: layers as string[], description };
      });
      const destination = await canonicalPath(output);
      if (!within(root, destination)) throw new Error('标记证据输出必须位于本次任务目录内');
      await mkdir(destination, { recursive: true });
      const folder = join(await realpath(destination), randomUUID());
      await mkdir(folder);
      const rectangles = regions.map(({ id, bounds: [x, y, w, h] }) => {
        const labelY = y >= 20 ? y - 20 : y, labelWidth = id.length * 9 + 8;
        const labelX = Math.min(x, Math.max(0, width - labelWidth));
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ed474c" stroke-width="2"/>`
          + `<rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="18" fill="#ed474c"/>`
          + `<text x="${labelX + 4}" y="${labelY + 14}" fill="white" font-size="14">${id}</text>`;
      }).join('');
      const marked = join(folder, 'marked.png'), manifest = join(folder, 'regions.json');
      await sharp(image.bytes, options).composite([{ input: Buffer.from(`<svg width="${width}" height="${height}">${rectangles}</svg>`) }]).png().toFile(marked);
      const evidence = [];
      for (const region of regions) {
        signal.throwIfAborted();
        const [x, y, w, h] = region.bounds, left = Math.max(0, x - padding), top = Math.max(0, y - padding);
        const crop = { left, top, width: Math.min(width, x + w + padding) - left, height: Math.min(height, y + h + padding) - top };
        const current = join(folder, `${region.id}-current.png`), ref = reference ? join(folder, `${region.id}-reference.png`) : undefined;
        const comparison = reference ? join(folder, `${region.id}-comparison.png`) : undefined;
        const currentBytes = await sharp(image.bytes, options).extract(crop).png().toBuffer();
        await writeFile(current, currentBytes);
        if (reference) {
          const refBytes = await sharp(reference.bytes, options).extract(crop).png().toBuffer();
          await writeFile(ref!, refBytes);
          await sharp({ create: { width: crop.width * 2, height: crop.height, channels: 4, background: '#888888' } })
            .composite([{ input: refBytes, left: 0, top: 0 }, { input: currentBytes, left: crop.width, top: 0 }]).png().toFile(comparison!);
        }
        evidence.push({ ...region, crop: [crop.left, crop.top, crop.width, crop.height], files: { current, reference: ref, comparison } });
      }
      const result = { image: image.path, reference: reference?.path, canvas: [width, height], marked, manifest, regions: evidence,
        note: '问题及坐标由 reviewer 看图确认后提供；左参考、右当前，局部图含上下文，不改变问题 bounds。' };
      await writeFile(manifest, JSON.stringify(result, null, 2) + '\n');
      signal.throwIfAborted();
      return textResult(result);
    },
  };
}

import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { rendererVersion, validateSettings } from '../../../../web/studio/lighting-model.js';
import { validateLight } from '../../../../web/studio/light-model.js';
import { toolDefinition } from '../shared/codex/tool-config.ts';
import type { FunctionTool } from '../shared/codex/function-tools.ts';
import { fileHash, type ShadowInput } from './input.ts';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
export async function rendererFingerprint() {
  const hashes = await Promise.all(['renderer.js', 'lighting-model.js', 'render-tool.js'].map(name => fileHash(join(root, 'web/studio', name))));
  return createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
}
async function atomic(path: string, bytes: string | Uint8Array) {
  await mkdir(dirname(path), { recursive: true }); const tmp = path + '.' + randomUUID() + '.tmp';
  await writeFile(tmp, bytes); await rename(tmp, path);
}
export function createLightingTool(output: string, input: ShadowInput): FunctionTool {
  return { ...toolDefinition('render_lighting'), async execute(value, signal) {
    const args = value as { settings?: unknown; final?: unknown } | null;
    if (!args || typeof args.final !== 'boolean') throw Error('final 必须是布尔值');
    const settings = validateSettings(args.settings), maps = join(output, '../step01');
    const paths = { color: input.characterColor, normal: join(maps, 'normal.png'), depth: join(maps, 'depth.png') };
    const inputs = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await fileHash(path)])));
    const images = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, 'data:image/png;base64,' + (await readFile(path)).toString('base64')])));
    const files: Record<string, string> = {
      '/studio/renderer.js': 'web/studio/renderer.js', '/studio/lighting-model.js': 'web/studio/lighting-model.js',
      '/studio/render-tool.js': 'web/studio/render-tool.js', '/vendor/three.module.js': 'node_modules/three/build/three.module.js',
      '/vendor/three.core.js': 'node_modules/three/build/three.core.js',
      '/vendor/mtoon.js': 'node_modules/@pixiv/three-vrm-materials-mtoon/lib/three-vrm-materials-mtoon.module.js',
    };
    const server = createServer(async (request, response) => {
      try {
        if (request.url === '/') {
          response.setHeader('Content-Type', 'text/html');
          response.end('<!doctype html><link rel="icon" href="data:,"><script type="importmap">{"imports":{"three":"/vendor/three.module.js","@pixiv/three-vrm-materials-mtoon":"/vendor/mtoon.js"}}</script><div style="width:512px;height:768px"><canvas></canvas></div><script type="module" src="/studio/render-tool.js"></script>');
        } else if (files[request.url || '']) {
          response.setHeader('Content-Type', 'text/javascript'); response.end(await readFile(join(root, files[request.url!])));
        } else { response.writeHead(404); response.end(); }
      } catch { response.writeHead(500); response.end('Render module unavailable'); }
    });
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    const stop = () => { void browser?.close(); };
    signal.addEventListener('abort', stop, { once: true });
    try {
      signal.throwIfAborted();
      await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
      signal.throwIfAborted();
      const page = await browser.newPage(), errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:' + (server.address() as any).port);
      await page.waitForFunction(() => typeof (window as any).astraRenderLighting === 'function');
      const render = await page.evaluate(async data => (window as any).astraRenderLighting(data), { images, settings });
      if (errors.length) throw Error(errors.join('\n'));
      const png = Buffer.from(render.data.split(',')[1], 'base64'), id = randomUUID();
      signal.throwIfAborted();
      for (const [key, path] of Object.entries(paths)) if (await fileHash(path) !== inputs[key]) throw Error('渲染期间贴图改变，请重新调校');
      const recipe = { version: 1, renderer: rendererVersion, rendererFingerprint: await rendererFingerprint(), inputs, settings,
        previewHash: createHash('sha256').update(png).digest('hex'), renderRecord: 'renders/' + id + '.json',
        width: render.geometry.width, height: render.geometry.height };
      await atomic(join(output, 'renders', id + '.png'), png);
      await atomic(join(output, recipe.renderRecord), JSON.stringify(recipe, null, 2) + '\n');
      if (args.final) {
        await atomic(join(output, 'preview.png'), png);
        await atomic(join(output, 'light.json'), JSON.stringify(recipe, null, 2) + '\n');
      }
      return { success: true, contentItems: [
        { type: 'inputText', text: JSON.stringify({ ...recipe, savedPath: join(output, 'renders', id + '.png'), final: args.final }) },
        { type: 'inputImage', imageUrl: 'data:image/png;base64,' + png.toString('base64') },
      ] };
    } finally {
      signal.removeEventListener('abort', stop); await browser?.close();
      server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    }
  } };
}
export async function validateLighting(output: string, input: ShadowInput) {
  const recipe = validateLight(JSON.parse(await readFile(join(output, 'light.json'), 'utf8')));
  if (recipe.rendererFingerprint !== await rendererFingerprint()) throw Error('光照渲染器已变化，请重新调校');
  const paths = { color: input.characterColor, normal: join(output, '../step01/normal.png'), depth: join(output, '../step01/depth.png') };
  for (const key of ['color', 'normal', 'depth'] as const) if (recipe.inputs[key] !== await fileHash(paths[key])) throw Error('light.json 与当前贴图不匹配');
  const trace = validateLight(JSON.parse(await readFile(join(output, recipe.renderRecord), 'utf8')));
  if (JSON.stringify(trace) !== JSON.stringify(recipe)) throw Error('light.json 与实际渲染参数不一致');
  if (recipe.previewHash !== await fileHash(join(output, 'preview.png'))) throw Error('光照预览与选定渲染不一致');
  const source = await sharp(input.characterColor).metadata(), preview = await sharp(join(output, 'preview.png')).metadata();
  if (preview.width !== source.width || preview.height !== source.height || preview.format !== 'png') throw Error('光照预览必须保持原尺寸 PNG');
}

import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { join, relative, resolve, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { WorkflowEnvironment } from '../codex/environment.ts';
import type { FunctionTool } from '../codex/function-tools.ts';
import { imageModelProviders, type AgentStep, type ImageApi, type ImageModel } from './models.ts';
import { toolDefinition } from '../codex/tool-config.ts';
import { needsSolidBackground, providerImageArguments, transparentGeneratedImage } from './image-background.ts';
import type { ImageProcessingOptions } from '../image-processing.ts';
import { requireMattingKrita } from '../matting/runtime.ts';
import { recommendBackground, type BackgroundRecommendation } from './background-selection.ts';

export function validateImageSelection(settings: WorkflowEnvironment, step: AgentStep): void {
  const image = settings.stepImages[step];
  if (!image) return;
  const provider = imageModelProviders[image], agent = settings.stepModels[step];
  if (provider === 'codex' && agent.harness !== 'codex') {
    throw new Error(`${step}：生图步骤选取 Codex 内置 imagegen，harness 却选择 ${agent.harness}（${agent.model}）。请选择 Codex 模型或自定义生图模型。`);
  }
  if (provider !== 'codex' && !settings.imageApis[provider]) {
    throw new Error(`${step}：${image} 缺少 ${provider} 生图 API URL / API key；请填写 live2d-maker/.env。`);
  }
}

export function imageGenerationTool(settings: WorkflowEnvironment, step: AgentStep, output: string,
  roots: readonly string[], normalization: ImageProcessingOptions = {}): FunctionTool | undefined {
  const model = settings.stepImages[step];
  if (!model || model === 'codex-native') return;
  validateImageSelection(settings, step);
  const provider = imageModelProviders[model] as 'openai' | 'google';
  const api = settings.imageApis[provider]!;
  return {
    ...toolDefinition('image_generation'),
    async execute(raw, signal) {
      const args = raw as { prompt?: unknown; input_images?: unknown; background?: string; size?: string };
      if (!args || typeof args.prompt !== 'string' || !args.prompt.trim() || !Array.isArray(args.input_images)
        || args.input_images.some(x => typeof x !== 'string') || Object.keys(args).some(key => !['prompt', 'input_images', 'background', 'size'].includes(key))
        || args.background !== undefined && !['transparent', 'auto'].includes(args.background) || args.size !== undefined && typeof args.size !== 'string') {
        throw new Error('生图参数必须包含 prompt 和 input_images，并遵循工具 schema。');
      }
      if ((args.input_images as string[]).some(path => !isAbsolute(path))) throw new Error('生图参考图必须使用绝对路径。');
      const allowed = await Promise.all(roots.map(p => realpath(p)));
      const inputs = [];
      for (const path of args.input_images as string[]) {
        const actual = await realpath(resolve(path));
        if (!allowed.some(root => { const r = relative(root, actual); return !isAbsolute(r) && r !== '..' && !r.startsWith('../'); })) {
          throw new Error(`参考图不在本次任务允许范围内：${path}`);
        }
        const bytes = await readFile(actual), meta = await sharp(bytes).metadata();
        inputs.push({ bytes, mime: meta.format === 'jpeg' ? 'image/jpeg' : meta.format === 'webp' ? 'image/webp' : 'image/png' });
      }
      const png = await generateImage(api, model, step === 'shadow_maps' ? { ...args, background: 'opaque' } as ImageArguments : args as ImageArguments, inputs, signal,
        { ...normalization, env: normalization.env ?? settings.codex.env, directory: output });
      const meta = await sharp(png).metadata();
      await mkdir(join(output, 'images'), { recursive: true });
      const savedPath = join(output, 'images', `${randomUUID()}.png`);
      await writeFile(savedPath, png, { mode: 0o600 });
      return { success: true, contentItems: [{ type: 'inputText', text: JSON.stringify({ savedPath, model,
        width: meta.width, height: meta.height, hasAlpha: meta.hasAlpha }) }] };
    },
  };
}

export type ImageInput = { bytes: Buffer; mime: string };
export type ImageArguments = { prompt: string; background?: 'transparent' | 'auto' | 'opaque'; size?: string; quality?: string };

// The native Codex route and registered tools share the same provider transport.
export async function generateImage(api: ImageApi, model: ImageModel, args: ImageArguments,
  inputs: ImageInput[], signal: AbortSignal, processing?: ImageProcessingOptions & { directory: string }): Promise<Buffer> {
  const original = args;
  const solidBackground = needsSolidBackground(model, original);
  let selection: BackgroundRecommendation | undefined;
  if (solidBackground) {
    if (!processing) throw new Error('Nano 透明背景处理缺少本次任务的产物目录。');
    requireMattingKrita(processing);
    selection = await recommendBackground(inputs);
    processing = { ...processing, directory: join(processing.directory, 'image-processing', randomUUID()) };
  }
  args = await providerImageArguments(model, original, selection);
  if (solidBackground) {
    await mkdir(processing!.directory, { recursive: true });
    await writeFile(join(processing!.directory, 'background-selection.json'), JSON.stringify({ selection,
      originalPrompt: original.prompt, providerPrompt: args.prompt }, null, 2) + '\n', { mode: 0o600 });
  }
  const base = api.baseUrl.replace(/\/+$/, '');
  let url: string, body: BodyInit, headers: Record<string, string>;
  if (api.protocol === 'gemini') {
    url = `${base}/models/${encodeURIComponent(model)}:generateContent`;
    headers = { 'content-type': 'application/json', 'x-goog-api-key': api.apiKey };
    body = JSON.stringify({ contents: [{ role: 'user', parts: [
      { text: args.prompt }, ...inputs.map(i => ({ inlineData: { mimeType: i.mime, data: i.bytes.toString('base64') } })),
    ] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } });
  } else if (inputs.length) {
    url = `${base}/images/edits`; headers = { authorization: `Bearer ${api.apiKey}` };
    const form = new FormData(); form.set('model', model); form.set('prompt', args.prompt); form.set('n', '1');
    form.set('background', args.background || 'transparent'); form.set('output_format', 'png');
    if (args.size) form.set('size', args.size);
    if (args.quality) form.set('quality', args.quality);
    for (const [index, input] of inputs.entries()) form.append(inputs.length === 1 ? 'image' : 'image[]',
      new Blob([new Uint8Array(input.bytes)], { type: input.mime }), `reference-${index}.png`);
    body = form;
  } else {
    url = `${base}/images/generations`; headers = { authorization: `Bearer ${api.apiKey}`, 'content-type': 'application/json' };
    body = JSON.stringify({ model, prompt: args.prompt, n: 1, background: args.background || 'transparent',
      output_format: 'png', ...(args.size ? { size: args.size } : {}), ...(args.quality ? { quality: args.quality } : {}) });
  }
  const response = await fetch(url, { method: 'POST', headers, body, signal });
  if (!response.ok) throw new Error(`生图 ${model} HTTP ${response.status}：${(await response.text()).replaceAll(api.apiKey, '[redacted]').slice(-3000)}`);
  const result = await response.json() as any;
  let bytes: Buffer;
  if (api.protocol === 'gemini') {
    const data = result.candidates?.flatMap((c: any) => c.content?.parts || [])
      .map((p: any) => p.inlineData || p.inline_data).find((i: any) => i?.data);
    if (!data) throw new Error(`生图 ${model} 没有返回图片：${JSON.stringify(result).replaceAll(api.apiKey, '[redacted]').slice(-3000)}`);
    bytes = Buffer.from(data.data, 'base64');
  } else {
    const image = result.data?.[0];
    if (image?.b64_json) bytes = Buffer.from(image.b64_json, 'base64');
    else if (typeof image?.url === 'string') {
      const download = await fetch(image.url, { signal });
      if (!download.ok) throw new Error(`生图结果下载失败：HTTP ${download.status}`);
      bytes = Buffer.from(await download.arrayBuffer());
    } else throw new Error(`生图 ${model} 没有返回图片。`);
  }
  const png = await sharp(bytes).png().toBuffer();
  return solidBackground ? transparentGeneratedImage(png, model, original, args, processing!, signal, selection!) : png;
}

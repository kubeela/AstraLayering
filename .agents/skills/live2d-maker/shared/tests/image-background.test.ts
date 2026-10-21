import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { imageGenerationTool } from '../agents/images.ts';
import { createCodexImageRoute } from '../agents/codex-images.ts';
import { transparentGeneratedImage, providerImageArguments } from '../agents/image-background.ts';
import { normalizeReference } from '../part/reference-normalization.ts';
import { recommendBackground } from '../agents/background-selection.ts';
import { loadWorkflowEnvironment } from '../codex/environment.ts';

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'image-background-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const executable = join(root, 'codex.mjs');
  await writeFile(executable, `#!${process.execPath}\nconsole.log(JSON.stringify({version:1,image_provider:true,image_provider_version:2}));\n`, { mode: 0o700 });
  return { root, executable };
}

async function solidImage(color: number[]) {
  const width = 48, height = 64, data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const hole = x >= 22 && x <= 26 && y >= 30 && y <= 34;
    const alpha = x >= 12 && x <= 36 && y >= 12 && y <= 52 && !hole ? 1
      : x === 11 && y >= 16 && y <= 48 ? 0.5 : 0;
    const i = (y * width + x) * 4;
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(alpha * 65 + (1 - alpha) * color[c]);
    data[i + 3] = 255;
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

test('background adaptation keeps original tasks, GPT alpha requests and explicit auto/opaque requests', async () => {
  const original = { prompt: '绿色绣线、蓝宝石与红色缎带保持原色，正常开口完全透明。最终只输出透明 PNG。', background: 'transparent' as const, size: '1024x1536' };
  const nano = await providerImageArguments('gemini-nano-banana-2.1', original);
  assert.ok(nano.prompt.startsWith(original.prompt + '\n\n'));
  assert.match(nano.prompt, /背景使用高纯度纯色 #00FF00/);
  assert.ok(!nano.prompt.includes('{background_hex}'));
  assert.equal(nano.background, 'opaque'); assert.equal(nano.size, original.size);
  assert.equal(original.background, 'transparent');
  for (const model of ['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst', 'codex-native'] as const) {
    assert.equal(await providerImageArguments(model, original), original);
  }
  for (const background of ['auto', 'opaque'] as const) {
    const request = { ...original, background };
    assert.equal(await providerImageArguments('gemini-nano-banana-2.1', request), request);
  }
});

test('both tool routes key model-selected RGB backgrounds over Gemini and OpenAI protocols at generated dimensions', async t => {
  const { root, executable } = await fixture(t);
  const reference = join(root, 'reference.png');
  const input = await sharp({ create: { width: 8, height: 10, channels: 4, background: '#ffaabb80' } }).png().toBuffer();
  await writeFile(reference, input);
  let protocol = 'gemini', png = await solidImage([11, 246, 12]), calls = 0;
  const server = createServer(async (req, res) => {
    try {
      let bytes = Buffer.alloc(0); for await (const chunk of req) bytes = Buffer.concat([bytes, chunk]);
      let prompt: string;
      if (protocol === 'gemini') {
        assert.equal(req.url, '/v1beta/models/gemini-nano-banana-2.1:generateContent');
        const parts = JSON.parse(bytes.toString()).contents[0].parts;
        prompt = parts[0].text;
        for (const part of parts.slice(1)) assert.deepEqual(Buffer.from(part.inlineData.data, 'base64'), input);
      } else if (req.url?.endsWith('/edits')) {
        const form = await new Request('http://localhost', { method: 'POST', headers: { 'content-type': req.headers['content-type']! }, body: new Uint8Array(bytes) }).formData();
        prompt = String(form.get('prompt')).replaceAll('\r\n', '\n'); assert.equal(form.get('background'), 'opaque');
        const picture = form.get('image') || form.get('image[]');
        assert.deepEqual(Buffer.from(await (picture as File).arrayBuffer()), input);
      } else {
        const args = JSON.parse(bytes.toString()); prompt = args.prompt; assert.equal(args.background, 'opaque');
      }
      assert.ok(prompt.startsWith('保留主体和正常开口，输出透明 PNG。\n\n'), JSON.stringify({ protocol, url: req.url, prompt }));
      assert.match(prompt, /背景使用高纯度纯色 #[0-9A-F]{6}/); calls++;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(protocol === 'gemini'
        ? { candidates: [{ content: { parts: [{ inlineData: { data: png.toString('base64') } }] } }] }
        : { data: [{ b64_json: png.toString('base64') }] }));
    } catch (error) { res.writeHead(500).end(String(error)); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(done => server.close(() => done())); });
  const processing = { krita: executable, matte: async (input: string, output: string) => { const r = await normalizeReference(input, input, output); return { ...r }; } };
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (protocol of ['gemini', 'openai']) for (const color of [[11, 246, 12], [4, 9, 254], [249, 5, 9]]) {
    png = await solidImage(color);
    const settings = loadWorkflowEnvironment({ layering_codex_path: executable, PATH: process.env.PATH,
      layering_part_simplify_image_model: 'gemini-nano-banana-2.1',
      layering_google_image_base_url: base + (protocol === 'gemini' ? '/v1beta' : '/v1'),
      layering_google_image_api_key: 'fixture-secret', layering_google_image_protocol: protocol }, root);
    for (const native of [false, true]) for (const edit of [false, true]) {
      const directory = join(root, `${protocol}-${color[0]}-${native}-${edit}`);
      let output: Buffer;
      const prompt = '保留主体和正常开口，输出透明 PNG。';
      if (native) {
        const route = await createCodexImageRoute(settings, 'part_simplify', directory, settings.codex, undefined, processing);
        try {
          const form = new FormData(); form.set('model', 'gemini-nano-banana-2.1'); form.set('prompt', prompt); form.set('background', 'transparent');
          form.append('image', new Blob([new Uint8Array(input)], { type: 'image/png' }), 'reference.png');
          const response = await fetch(route.env.LAYERING_IMAGE_BASE_URL + `/images/${edit ? 'edits' : 'generations'}`, {
            method: 'POST', headers: { authorization: `Bearer ${route.env.LAYERING_IMAGE_API_KEY}`,
              ...(!edit ? { 'content-type': 'application/json' } : {}) },
            body: edit ? form : JSON.stringify({ model: 'gemini-nano-banana-2.1', prompt, background: 'transparent' }) });
          const value = await response.json(); assert.equal(response.status, 200, JSON.stringify(value));
          output = Buffer.from(value.data[0].b64_json, 'base64');
        } finally { await route.close(); }
      } else {
        const tool = imageGenerationTool(settings, 'part_simplify', directory, [root], processing)!;
        const result = await tool.execute({ prompt, input_images: edit ? [reference] : [], background: 'transparent' }, new AbortController().signal);
        const value = JSON.parse((result.contentItems[0] as { text: string }).text);
        assert.equal(value.hasAlpha, true); output = await readFile(value.savedPath);
      }
      const image = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(image.info.width, 48); assert.equal(image.info.height, 64);
      assert.equal(image.data[3], 0); assert.equal(image.data[(32 * 48 + 24) * 4 + 3], 0);
      assert.deepEqual([...image.data.subarray((20 * 48 + 20) * 4, (20 * 48 + 20) * 4 + 4)], [65, 65, 65, 255]);
      const alpha = image.data[(20 * 48 + 11) * 4 + 3]; assert.ok(alpha > 0 && alpha < 255);
      const records = await readdir(join(directory, 'image-processing')); assert.equal(records.length, 1);
      const recordDirectory = join(directory, 'image-processing', records[0]);
      assert.deepEqual(await readFile(join(recordDirectory, 'original.png')), png);
      const report = JSON.parse(await readFile(join(recordDirectory, 'normalization.json'), 'utf8'));
      assert.deepEqual(report.normalization.key, color); assert.equal(report.normalization.scale, 1);
      assert.equal(report.originalPrompt, prompt); assert.equal(report.requestedBackground, 'transparent');
      assert.equal(report.selection.reference, edit ? 'first-image' : 'none');
      assert.equal(report.selection.hex, '#00FF00');
    }
  }
  assert.equal(calls, 24); assert.deepEqual(await readFile(reference), input);
});

test('program recommends green for pink, avoids small same-colour details and ignores control maps/transparent RGB', async () => {
  const rgba = Buffer.alloc(32 * 32 * 4);
  for (let p = 0; p < 1024; p++) {
    rgba[p * 4] = 0; rgba[p * 4 + 1] = 255;
    if (p % 32 >= 8 && p % 32 < 24 && Math.floor(p / 32) >= 8 && Math.floor(p / 32) < 24) {
      rgba.set([235, 150, 195, 128], p * 4);
    }
  }
  const input = async () => ({ bytes: await sharp(rgba, { raw: { width: 32, height: 32, channels: 4 } }).png().toBuffer(), mime: 'image/png' });
  const pink = await input();
  const selected = await recommendBackground([pink]); assert.equal(selected.hex, '#00FF00');
  assert.equal(selected.foregroundPixels, 256); assert.equal(selected.sourceBackground, null);
  const control = { bytes: await solidImage([0, 255, 0]), mime: 'image/png' };
  assert.deepEqual(await recommendBackground([pink, control]), selected);
  // One visible green stitch must still disqualify a green key.
  rgba.set([0, 255, 0, 255], (16 * 32 + 16) * 4);
  const withStitch = await recommendBackground([await input()]);
  assert.notEqual(withStitch.hex, '#00FF00');
  assert.equal(withStitch.candidates.find(c => c.hex === '#00FF00')!.collisionPixels, 1);
  // A white backdrop is neutral and must not hide bright opaque material colours.
  const pale = { bytes: await sharp({ create: { width: 32, height: 32, channels: 3, background: '#ffffff' } })
    .composite([{ input: Buffer.from('<svg width="32" height="32"><rect x="8" y="8" width="16" height="16" fill="#ebb4dc"/></svg>') }]).png().toBuffer(), mime: 'image/png' };
  assert.equal((await recommendBackground([pale])).hex, '#00FF00');
  const greenAndBlue = { bytes: await sharp({ create: { width: 32, height: 32, channels: 3, background: '#00ff00' } })
    .composite([{ input: Buffer.from('<svg width="32" height="32"><rect x="16" width="16" height="32" fill="#0000ff"/></svg>') }]).png().toBuffer(), mime: 'image/png' };
  assert.equal((await recommendBackground([greenAndBlue])).hex, '#FF0000');
});

test('Nano fails explicitly with retained raw generation when no reliable solid background is returned', async t => {
  const { root } = await fixture(t);
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#00ff00' } })
    .composite([{ input: Buffer.from('<svg width="32" height="32"><rect x="16" width="16" height="32" fill="#0000ff"/></svg>') }]).png().toBuffer();
  const server = createServer((_req, res) => res.end(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] })));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(done => server.close(() => done())); });
  const settings = loadWorkflowEnvironment({ layering_part_simplify_image_model: 'gemini-nano-banana-2.1', PATH: process.env.PATH,
    layering_google_image_base_url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    layering_google_image_api_key: 'fixture', layering_google_image_protocol: 'openai' }, root);
  const tool = imageGenerationTool(settings, 'part_simplify', root, [root], { krita: join(root,'krita'), matte: async () => { throw new Error('生成图片没有可靠纯色背景'); } })!;
  await assert.rejects(tool.execute({ prompt: '主体透明 PNG', input_images: [] }, new AbortController().signal), /Nano 透明背景处理失败.*原始生图保留在/);
  const [id] = await readdir(join(root, 'image-processing'));
  assert.deepEqual(await sharp(join(root, 'image-processing', id, 'original.png')).raw().toBuffer(), await sharp(png).raw().toBuffer());
  assert.ok((await readFile(join(root, 'image-processing', id, 'error.json'), 'utf8')).includes('主体透明 PNG'));
});

test('missing explicit Krita is reported before image API calls or native route startup', async t => {
  const { root, executable } = await fixture(t);
  let calls = 0;
  const server = createServer((_req, res) => { calls++; res.writeHead(500).end(); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise<void>(done => server.close(() => done())); });
  const settings = loadWorkflowEnvironment({ layering_codex_path: executable, PATH: '',
    layering_part_simplify_image_model: 'gemini-nano-banana-2.1', layering_google_image_protocol: 'openai',
    layering_google_image_base_url: `http://127.0.0.1:${(server.address() as { port: number }).port}`, layering_google_image_api_key: 'fixture' }, root);
  const tool = imageGenerationTool(settings, 'part_simplify', root, [root])!;
  await assert.rejects(tool.execute({ prompt: '透明 PNG', input_images: [] }, new AbortController().signal), /Nano 透明后处理需要 Krita/);
  await assert.rejects(createCodexImageRoute(settings, 'part_simplify', root), /Nano 透明后处理需要 Krita/);
  assert.equal(calls, 0);
});

test('原生半透明 alpha 原字节保留，不触发 Krita、安装或缩放', async t => {
  const { root } = await fixture(t);
  const png = await sharp({ create: { width: 32, height: 24, channels: 4, background: '#ee88aa80' } }).png().toBuffer();
  const args = { prompt: '透明部件 PNG', background: 'transparent' as const };
  let called = false;
  const output = await transparentGeneratedImage(png, 'gemini-nano-banana-2.1', args, args,
    { directory: root, runsRoot: root, matte: async () => { called = true; throw new Error('不应该初始化'); } },
    new AbortController().signal, await recommendBackground([]));
  assert.equal(called, false); assert.deepEqual(output, png);
  assert.ok(!(await readdir(root)).includes('.runtime'));
  const record = JSON.parse(await readFile(join(root, 'normalization.json'), 'utf8'));
  assert.equal(record.nativeAlphaPreserved, true);
});

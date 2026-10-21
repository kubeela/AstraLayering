import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createCodexImageRoute, usesPatchedImageTool } from '../agents/codex-images.ts';
import { loadWorkflowEnvironment, checkCodexCapabilities } from '../codex/environment.ts';
import { CodexAgents } from '../codex/agents.ts';
import { fakeAppServer } from '../../part-layering/tests/fake-app-server.ts';

const capabilities = { version: 1, image_provider: true, image_provider_version: 2, image_compaction: true, image_compaction_version: 2 };
async function fixture(t: { after(fn: () => Promise<unknown>): void }) {
  const root = await mkdtemp(join(tmpdir(), 'codex-native-images-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const executable = join(root, 'codex.mjs');
  await writeFile(executable, `#!${process.execPath}\nconsole.log(${JSON.stringify(JSON.stringify(capabilities))});\n`, { mode: 0o700 });
  return { root, executable };
}

test('codex-native does not enable image patches; custom Codex models require current image capabilities', async t => {
  const { root, executable } = await fixture(t);
  const native = loadWorkflowEnvironment({ layering_codex_path: '/missing/codex', LAYERING_IMAGE_BASE_URL: 'https://stale.example',
    layering_image_base_url: 'https://legacy.example/v1', layering_image_api_key: 'fixture', layering_default_image_model: 'codex-native' }, root);
  assert.equal(usesPatchedImageTool(native, 'part_simplify'), false);
  assert.equal(native.codex.env!.LAYERING_IMAGE_BASE_URL, undefined);
  await checkCodexCapabilities(native);
  const custom = loadWorkflowEnvironment({ layering_codex_path: executable,
    layering_part_simplify_image_model: 'gpt-image-2.5-flare', layering_openai_image_base_url: 'https://image.example/v1',
    layering_openai_image_api_key: 'fixture' }, root);
  assert.equal(usesPatchedImageTool(custom, 'part_simplify'), true);
  await checkCodexCapabilities(custom, custom.codex, { image: true });
  await assert.rejects(checkCodexCapabilities(custom, { codexPathOverride: '/missing/codex' }, { image: true }), /补丁能力检查/);
  const noBinary = loadWorkflowEnvironment({}, root);
  await assert.rejects(checkCodexCapabilities(noBinary, noBinary.codex, { image: true }), /需要补丁版/);
});

test('native routes share OpenAI/Gemini transports, preserve image bytes/alpha and isolate concurrent models', async t => {
  const { root, executable } = await fixture(t);
  const png = await sharp({ create: { width: 8, height: 12, channels: 4, background: '#d03e7780' } }).png().toBuffer();
  const calls: { url: string; prompt: string; model: string; refs: number }[] = [];
  const server = createServer(async (req, res) => {
    let bytes = Buffer.alloc(0); for await (const chunk of req) bytes = Buffer.concat([bytes, chunk]);
    let args: any, inputs: Buffer[];
    if (req.url?.includes(':generateContent')) {
      assert.equal(req.headers['x-goog-api-key'], 'google-secret');
      const body = JSON.parse(bytes.toString());
      args = { prompt: body.contents[0].parts[0].text, model: 'gemini-nano-banana-2.1' };
      inputs = body.contents[0].parts.slice(1).map((p: any) => Buffer.from(p.inlineData.data, 'base64'));
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: png.toString('base64') } }] } }] }));
    } else {
      assert.equal(req.headers.authorization, 'Bearer openai-secret');
      if (req.url?.endsWith('/edits')) {
        const form = await new Request('http://localhost', { method: 'POST', headers: { 'content-type': req.headers['content-type']! }, body: new Uint8Array(bytes) }).formData();
        args = Object.fromEntries(form); inputs = [];
        for (const [key, value] of form) if (key.startsWith('image')) inputs.push(Buffer.from(await (value as File).arrayBuffer()));
      } else { args = JSON.parse(bytes.toString()); inputs = []; }
      res.end(JSON.stringify({ created: 1, data: [{ b64_json: png.toString('base64') }] }));
    }
    for (const input of inputs) assert.deepEqual(input, png);
    calls.push({ url: req.url!, prompt: args.prompt, model: args.model, refs: inputs.length });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>(done => server.close(() => done())));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const settings = loadWorkflowEnvironment({ layering_codex_path: executable,
    layering_part_simplify_image_model: 'gpt-image-2.5-flare', layering_part_base_subject_image_model: 'gemini-nano-banana-2.1',
    layering_openai_image_base_url: base + '/v1', layering_openai_image_api_key: 'openai-secret',
    layering_google_image_base_url: base + '/v1beta', layering_google_image_api_key: 'google-secret' }, root);
  const openai = await createCodexImageRoute(settings, 'part_simplify', join(root, 'openai'));
  const google = await createCodexImageRoute(settings, 'part_base_subject', join(root, 'google'));
  try {
    assert.notEqual(openai.env.LAYERING_IMAGE_API_KEY, google.env.LAYERING_IMAGE_API_KEY);
    const invoke = async (route: typeof openai, count: number) => {
      const form = new FormData(); form.set('model', route.env.LAYERING_IMAGE_MODEL); form.set('prompt', '不改写的原始提示词');
      for (let i = 0; i < count; i++) form.append('image[]', new Blob([new Uint8Array(png)], { type: 'image/png' }), `input-${i}.png`);
      const result = await fetch(route.env.LAYERING_IMAGE_BASE_URL + `/images/${count ? 'edits' : 'generations'}`, { method: 'POST',
        headers: { authorization: `Bearer ${route.env.LAYERING_IMAGE_API_KEY}`, ...(count ? {} : { 'content-type': 'application/json' }) },
        body: count ? form : JSON.stringify({ model: route.env.LAYERING_IMAGE_MODEL, prompt: '不改写的原始提示词', background: 'transparent' }) });
      assert.equal(result.status, 200);
      const data = await result.json(); const output = Buffer.from(data.data[0].b64_json, 'base64');
      assert.equal((await sharp(output).metadata()).hasAlpha, true);
      assert.deepEqual(await sharp(output).raw().toBuffer(), await sharp(png).raw().toBuffer());
    };
    await Promise.all([invoke(openai, 0), invoke(google, 0)]);
    await Promise.all([invoke(openai, 2), invoke(google, 2)]);
    assert.equal(calls.length, 4);
    assert.ok(calls.every(c => c.prompt === '不改写的原始提示词'));
    assert.equal((await fetch(openai.env.LAYERING_IMAGE_BASE_URL + '/images/generations', { method: 'POST' })).status, 401);
  } finally { await openai.close(); await google.close(); }
  await assert.rejects(fetch(openai.env.LAYERING_IMAGE_BASE_URL + '/images/generations'));
});

test('Codex drawing/repair uses native image events, resumes after changing image model and keeps products', async t => {
  const { root } = await fixture(t);
  const savedPath = join(root, 'existing.png'); await writeFile(savedPath, 'keep');
  const server = await fakeAppServer(root, [], 'completed', [{ type: 'imageGeneration', status: 'completed', savedPath }]);
  let source = await readFile(server.executable, 'utf8');
  source = source.replace('#!/usr/bin/env node', `#!${process.execPath}`);
  source = source.replace('const calls =', `if (process.argv[2] === 'debug') { console.log(${JSON.stringify(JSON.stringify(capabilities))}); process.exit(0); }\nconst calls =`);
  await writeFile(server.executable, source);
  const settings = loadWorkflowEnvironment({ layering_codex_path: server.executable,
    layering_part_outline_image_model: 'gpt-image-2.5-flare', layering_part_outline_repair_image_model: 'gpt-image-2.5-sunburst',
    layering_openai_image_base_url: 'https://image.example/v1', layering_openai_image_api_key: 'fixture' }, root);
  const session = new CodexAgents({ environment: settings, cwd: root, logDirectory: join(root, 'logs') }).createSession();
  try {
    const a = await session.run({ step: 'part_outline', name: 'draw', prompt: '原绘图任务' });
    const b = await session.run({ step: 'part_outline_repair', name: 'repair', prompt: '原返修任务' });
    assert.equal(a.threadId, b.threadId); assert.deepEqual(b.images, [{ savedPath }]);
    assert.equal(await readFile(savedPath, 'utf8'), 'keep');
    const records = (await readFile(server.capture, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    const starts = records.filter(r => ['thread/start', 'thread/resume'].includes(r.method));
    assert.deepEqual(starts.map(r => r.method), ['thread/start', 'thread/resume']);
    for (const r of starts) {
      assert.equal(r.params.config['features.image_generation'], true);
      assert.ok(!r.params.dynamicTools.some((tool: any) => tool.name === 'image_generation'));
    }
  } finally { await session.close(); }
});

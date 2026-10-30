import '../../shared/tests/ignore-local-env.ts';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { createServer } from 'node:http';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { cropUpperBody, extractTurnFrame, ffmpegPath, generateVideo, resolveTurnInput, upperBodyBox, turnOutputs } from '../turn.ts';
import { requireVideoApi, runWorkflow, turnPrompt } from '../run.ts';
import { MissingDependencyError } from '../../shared/missing-dependency.ts';
import { loadWorkflowEnvironment } from '../../shared/codex/environment.ts';

const rect = (w: number, h: number, x: number, y: number, rw: number, rh: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="#000"/></svg>`;
async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'astra-nine-axis-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const task = join(root, 'case'), assembly = join(task, 'character-assembly/step01'), parts = join(task, 'part-layering/parts');
  await mkdir(assembly, { recursive: true }); await mkdir(parts, { recursive: true });
  await writeFile(join(assembly, 'character-assembled.png'), await sharp({ create: { width: 200, height: 400, channels: 4, background: { r: 200, g: 100, b: 50, alpha: 1 } } }).png().toBuffer());
  await writeFile(join(assembly, '.completed'), JSON.stringify({ stamp: 'assembly-1', inputs: {} }));
  await writeFile(join(parts, 'face.svg'), rect(200, 400, 80, 60, 40, 50));
  await writeFile(join(parts, 'hair.svg'), rect(200, 400, 60, 30, 70, 70));
  return { root, task };
}

test('上半身从头顶截到胸口，以脸为中心并留边', async t => {
  const { root } = await fixture(t);
  const input = await resolveTurnInput('case', root);
  assert.equal(input.source.id, 'character-assembly/step01');
  assert.equal(input.parts.length, 2, '缺少头饰形状时只用脸与头发');
  const box = await upperBodyBox(input, 200, 400);
  // Hair top 30, face 60–110 → chest at 110 + 2×50 = 210; height 180 / 0.88.
  assert.equal(box.size, Math.ceil(180 / 0.88));
  assert.equal(box.x, Math.round(100 - box.size / 2));
  assert.equal(box.y, Math.round(30 - box.size * 0.06));
  const image = sharp(await cropUpperBody(input.color, { x: -10, y: 0, size: 50 }));
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([info.width, info.height], [50, 50]);
  assert.deepEqual([...data.subarray(0, 3)], [128, 128, 128], '画布外补灰');
  assert.deepEqual([...data.subarray(30 * 3, 30 * 3 + 3)], [200, 100, 50]);
});

test('阴影蒙版完成时用阴影角色图', async t => {
  const { root, task } = await fixture(t);
  const shadow = join(task, 'shadow/step01_mask');
  await mkdir(shadow, { recursive: true });
  await writeFile(join(shadow, 'character-shadowed.png'), await readFile(join(task, 'character-assembly/step01/character-assembled.png')));
  assert.equal((await resolveTurnInput('case', root)).source.id, 'character-assembly/step01', '未完成的阴影不作来源');
  await writeFile(join(shadow, '.completed'), JSON.stringify({ stamp: 'shadow-1', inputs: {} }));
  const input = await resolveTurnInput('case', root);
  assert.equal(input.source.id, 'shadow/step01_mask');
  assert.equal(input.color, join(shadow, 'character-shadowed.png'));
});

test('缺少生视频接口或 ffmpeg 时直接拒绝', async () => {
  assert.throws(() => requireVideoApi({}), /layering_video_base_url 与 layering_video_api_key/);
  assert.throws(() => loadWorkflowEnvironment({ layering_video_base_url: 'https://example.com/v1' }), /同时填写/);
  const env = loadWorkflowEnvironment({ layering_video_base_url: 'https://example.com/v1', layering_video_api_key: 'k' });
  assert.deepEqual(env.videoApi, { baseUrl: 'https://example.com/v1', apiKey: 'k', model: 'seedance-2.5' });
  await assert.rejects(ffmpegPath({ PATH: '' }), (error: unknown) => error instanceof MissingDependencyError);
  assert.match(turnPrompt(), /90/);
});

test('生视频提交、轮询并下载，错误中不含密钥', async t => {
  const requests: string[] = [];
  let polls = 0;
  const server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url} ${request.headers.authorization}`);
    let body = ''; request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      if (request.method === 'POST') {
        const json = JSON.parse(body);
        assert.equal(json.model, 'seedance-test'); assert.equal(json.seconds, '5'); assert.match(json.input_reference, /^data:image\/png;base64,/);
        response.end(JSON.stringify({ id: 'v1', status: 'queued' }));
      } else if (request.url === '/videos/v1') response.end(JSON.stringify({ id: 'v1', status: ++polls < 2 ? 'in_progress' : 'completed' }));
      else if (request.url === '/videos/v1/content') response.end('mp4');
      else { response.statusCode = 500; response.end('bad secret-key'); }
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const api = { baseUrl: base, apiKey: 'secret-key', model: 'seedance-test' };
  const video = await generateVideo(api, 'orbit', Buffer.from('png'), { poll: 1 });
  assert.equal(video.bytes.toString(), 'mp4');
  assert.equal(requests[0], 'POST /videos Bearer secret-key');
  await assert.rejects(generateVideo({ ...api, baseUrl: base + '/x' }, 'orbit', Buffer.from('png'), { poll: 1 }),
    (error: Error) => !error.message.includes('secret-key') && error.message.includes('[redacted]'));
});

test('按帧序取出 30° 帧', async t => {
  const ffmpeg = await ffmpegPath().catch(() => undefined);
  if (!ffmpeg) { t.skip('没有 ffmpeg'); return; }
  const root = await mkdtemp(join(tmpdir(), 'astra-turn-frame-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { spawnSync } = await import('node:child_process');
  const video = join(root, 'turn.mp4');
  assert.equal(spawnSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=32x32:rate=10', '-frames:v', '61', '-pix_fmt', 'yuv420p', video]).status, 0);
  const frame = await extractTurnFrame(ffmpeg, video, join(root, 'turn-30.png'));
  assert.deepEqual(frame, { frameCount: 61, frameIndex: 20, angle: 30 });
  assert.equal((await sharp(join(root, 'turn-30.png')).metadata()).width, 32);
});

test('step01 完成后沿用，来源角色图变化后重做', async t => {
  const { root, task } = await fixture(t);
  let produced = 0;
  const produce = async (directory: string) => {
    produced++;
    for (const file of turnOutputs) await writeFile(join(directory, file), file);
    return { frameCount: 121, frameIndex: 40, angle: 30 };
  };
  const deps = { environment: { videoApi: { baseUrl: 'https://example.com/v1', apiKey: 'k', model: 'm' } }, ffmpeg: '/bin/true', produce };
  assert.match(await runWorkflow({ name: 'case', dir: root }, deps), /第 40\/120 帧/);
  await access(join(task, 'nine-axis/step01_turn/.completed'));
  assert.match(await runWorkflow({ name: 'case', dir: root }, deps), /沿用/);
  assert.equal(produced, 1);
  await writeFile(join(task, 'character-assembly/step01/.completed'), JSON.stringify({ stamp: 'assembly-2', inputs: {} }));
  await runWorkflow({ name: 'case', dir: root }, deps);
  assert.equal(produced, 2);
});

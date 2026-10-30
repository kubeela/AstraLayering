import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, constants, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { delimiter, dirname, join } from 'node:path';
import sharp from 'sharp';
import { MissingDependencyError } from '../shared/missing-dependency.ts';
import { requireUpstream } from '../shared/upstream.ts';
import { readStep, type ChainStep } from '../shared/step-chain.ts';
import { taskDirectory } from '../shared/paths.ts';
import { taskRootOf, toTaskPath } from '../shared/task-paths.ts';
import type { VideoApi } from '../shared/codex/environment.ts';

// step01_turn: the upper body around the head goes to a video model as the first
// frame; the model orbits the camera 0→90° at constant speed in a fixed time, so
// the 30° view is the frame a third of the way through. Later steps fit the
// head deformers to that view.
export const turnAngle = 30, orbitAngle = 90, turnSeconds = '5';
const background = 128, margin = 0.06, chestFaces = 2;
const terminal = new Set(['completed', 'failed', 'cancelled', 'expired']);

export type TurnInput = { color: string; source: ChainStep; parts: string[] };
export type Box = { x: number; y: number; size: number };

// The same colour the workbench shows: the delivered shadow mask when it is
// complete, otherwise the assembled character.
export async function resolveTurnInput(name: string, root: string): Promise<TurnInput> {
  const task = taskDirectory(name, root), shadow = join(task, 'shadow/step01_mask');
  const color = join(shadow, 'character-shadowed.png');
  let source: ChainStep;
  if ((await readStep(shadow, task)).status === 'completed' && await exists(color)) {
    source = { id: 'shadow/step01_mask', root: task, directory: shadow, dependsOn: [] };
  } else {
    const assembly = join(await requireUpstream(name, 'character-assembly', [{ path: 'step01/character-assembled.png' }], root), 'step01');
    source = { id: 'character-assembly/step01', root: task, directory: assembly, dependsOn: [] };
  }
  const parts = await requireUpstream(name, 'part-layering', [{ path: 'parts/face.svg' }], root);
  const optional = ['hair.svg', 'head_accessories.svg'].map(file => join(parts, 'parts', file));
  return { color: source.id.startsWith('shadow') ? color : join(source.directory, 'character-assembled.png'), source,
    parts: [join(parts, 'parts/face.svg'), ...(await Promise.all(optional.map(async path => await exists(path) ? path : ''))).filter(Boolean)] };
}

async function alphaBounds(svg: string, width: number, height: number) {
  const { data, info } = await sharp(await readFile(svg)).resize(width, height, { fit: 'fill' }).ensureAlpha()
    .extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[y * info.width + x] < 128) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? undefined : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

// A square from the top of the head to the chest, centred on the face: the
// video model keeps the shoulders as a turning reference, and the head stays large.
export async function upperBodyBox(input: TurnInput, width: number, height: number): Promise<Box> {
  const [face, ...rest] = await Promise.all(input.parts.map(path => alphaBounds(path, width, height)));
  if (!face) throw new Error(`脸部形状为空：${input.parts[0]}`);
  const head = [face, ...rest].filter(b => !!b);
  const top = Math.min(...head.map(b => b.y0)), left = Math.min(...head.map(b => b.x0)), right = Math.max(...head.map(b => b.x1));
  const bottom = face.y1 + chestFaces * (face.y1 - face.y0), cx = (face.x0 + face.x1) / 2;
  const size = Math.ceil(Math.max(bottom - top, 2 * Math.max(cx - left, right - cx)) / (1 - 2 * margin));
  return { x: Math.round(cx - size / 2), y: Math.round(top - size * margin), size };
}

// Outside the canvas and behind the character is plain grey, as the prompt says.
export async function cropUpperBody(color: string, box: Box): Promise<Buffer> {
  const image = sharp(await readFile(color)), { width = 0, height = 0 } = await image.metadata();
  const left = Math.max(0, box.x), top = Math.max(0, box.y);
  const right = Math.min(width, box.x + box.size), bottom = Math.min(height, box.y + box.size);
  if (right <= left || bottom <= top) throw new Error('上半身裁切框落在画布之外');
  const part = await image.extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer();
  return sharp({ create: { width: box.size, height: box.size, channels: 3, background: { r: background, g: background, b: background } } })
    .composite([{ input: part, left: left - box.x, top: top - box.y }]).removeAlpha().png().toBuffer();
}

const redact = (text: string, api: VideoApi) => text.replaceAll(api.apiKey, '[redacted]').slice(-2000);
async function call(api: VideoApi, method: string, path: string, signal: AbortSignal | undefined, body?: unknown) {
  const response = await fetch(api.baseUrl.replace(/\/+$/, '') + path, { method, signal,
    headers: { authorization: `Bearer ${api.apiKey}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`生视频 ${method} ${path} HTTP ${response.status}：${redact(await response.text(), api)}`);
  return response;
}
const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
});

export type VideoResult = { id: string; status: Record<string, unknown>; bytes: Buffer };
// OpenAI Videos API: the first frame goes as a data URL in JSON (the proxy
// ignores multipart files); the result is polled, then downloaded.
export async function generateVideo(api: VideoApi, prompt: string, image: Buffer,
  { signal, progress, poll = 10_000, timeout = 30 * 60_000 }: { signal?: AbortSignal; progress?: (message: string) => void; poll?: number; timeout?: number } = {}): Promise<VideoResult> {
  const created = await (await call(api, 'POST', '/videos', signal,
    { model: api.model, prompt, seconds: turnSeconds, input_reference: 'data:image/png;base64,' + image.toString('base64') })).json() as Record<string, unknown>;
  const id = String(created.id ?? '');
  if (!id) throw new Error(`生视频没有返回任务 id：${redact(JSON.stringify(created), api)}`);
  progress?.(`已提交生视频 ${id}（${api.model}）`);
  const started = Date.now();
  let status = created;
  while (!terminal.has(String(status.status))) {
    if (Date.now() - started > timeout) throw new Error(`生视频等待超时：${id} 仍为 ${status.status}`);
    await wait(poll, signal);
    status = await (await call(api, 'GET', `/videos/${encodeURIComponent(id)}`, signal)).json() as Record<string, unknown>;
  }
  if (status.status !== 'completed') throw new Error(`生视频失败：${redact(JSON.stringify(status), api)}`);
  // The proxy sometimes cuts a download short.
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await call(api, 'GET', `/videos/${encodeURIComponent(id)}/content`, signal);
      const bytes = Buffer.from(await response.arrayBuffer()), length = Number(response.headers.get('content-length'));
      if (length && bytes.length !== length) throw new Error(`下载不完整（${bytes.length}/${length} 字节）`);
      return { id, status, bytes };
    } catch (error) {
      if (attempt >= 3 || signal?.aborted) throw new Error(`生视频 ${id} 下载失败`, { cause: error });
      progress?.(`生视频下载中断，重试 ${attempt}`);
    }
  }
}

export async function ffmpegPath(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const command = env.ASTRA_STUDIO_FFMPEG || 'ffmpeg';
  const candidates = command.includes('/') ? [command] : (env.PATH ?? '').split(delimiter).filter(Boolean).map(directory => join(directory, command));
  for (const candidate of candidates) if (await access(candidate, constants.X_OK).then(() => true, () => false)) return candidate;
  throw new MissingDependencyError(`找不到 ffmpeg（${command}），无法从转头视频取出 ${turnAngle}° 关键帧。`,
    '请安装 ffmpeg：macOS 运行 brew install ffmpeg；Debian/Ubuntu 运行 sudo apt install ffmpeg；Windows 运行 winget install ffmpeg。已装在其他位置时用 ASTRA_STUDIO_FFMPEG 指定路径。');
}
function run(ffmpeg: string, args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-nostdin', ...args], { stdio: ['ignore', 'ignore', 'pipe'], signal });
    let log = ''; child.stderr.on('data', chunk => { log = (log + chunk).slice(-20_000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(log) : reject(new Error(`ffmpeg 退出码 ${code}：${log.slice(-1500)}`)));
  });
}
// The orbit is uniform from the first frame to the last, so frame k of N is at
// k/(N-1) of the orbit. Frames are counted by decoding, not from container metadata.
export async function extractTurnFrame(ffmpeg: string, video: string, output: string, signal?: AbortSignal) {
  const log = await run(ffmpeg, ['-i', video, '-map', '0:v:0', '-f', 'null', '-'], signal);
  const count = Number([...log.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1]);
  if (!(count > 3)) throw new Error(`转头视频帧数无效：${video}`);
  const index = Math.round((count - 1) * turnAngle / orbitAngle);
  await run(ffmpeg, ['-y', '-i', video, '-vf', `select=eq(n\\,${index})`, '-frames:v', '1', '-update', '1', output], signal);
  return { frameCount: count, frameIndex: index, angle: index / (count - 1) * orbitAngle };
}

export const fileHash = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');
const bufferHash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
async function exists(path: string) { return access(path).then(() => true, () => false); }
async function atomic(path: string, bytes: Buffer | string) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, bytes); await rename(tmp, path);
}

export const turnOutputs = ['upper-body.png', 'crop.json', 'turn.mp4', 'turn.json', 'turn-30.png'] as const;
// The whole step: crop, generate, take the 30° frame. Paths in records are task-relative.
export async function produceTurn(directory: string, input: TurnInput, api: VideoApi, prompt: string,
  { signal, progress, ffmpeg }: { signal?: AbortSignal; progress?: (message: string) => void; ffmpeg: string }) {
  const task = taskRootOf(dirname(directory)), { width = 0, height = 0 } = await sharp(input.color).metadata();
  const box = await upperBodyBox(input, width, height), image = await cropUpperBody(input.color, box);
  await atomic(join(directory, 'upper-body.png'), image);
  await atomic(join(directory, 'crop.json'), JSON.stringify({ version: 1, source: toTaskPath(task, input.color), sourceHash: await fileHash(input.color),
    parts: input.parts.map(path => toTaskPath(task, path)), canvas: [width, height], box, background }, null, 2) + '\n');
  progress?.(`上半身裁切 ${box.size}×${box.size}，提交生视频（约 5 分钟）`);
  const started = Date.now(), video = await generateVideo(api, prompt, image, { signal, progress });
  const mp4 = join(directory, 'turn.mp4');
  await rm(join(directory, 'turn-30.png'), { force: true });
  await atomic(mp4, video.bytes);
  const frame = await extractTurnFrame(ffmpeg, mp4, join(directory, 'turn-30.png'), signal);
  const { url: _url, ...status } = video.status;
  await atomic(join(directory, 'turn.json'), JSON.stringify({ version: 1, model: api.model, seconds: turnSeconds, orbitAngle, prompt,
    videoId: video.id, status, input: { path: 'upper-body.png', sha256: bufferHash(image) },
    video: { path: 'turn.mp4', sha256: bufferHash(video.bytes), bytes: video.bytes.length }, frame: { path: 'turn-30.png', ...frame },
    elapsedSeconds: Math.round((Date.now() - started) / 100) / 10 }, null, 2) + '\n');
  return frame;
}

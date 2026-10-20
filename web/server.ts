import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { extname, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({ options: { port: { type: 'string', default: '4387' } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port must be between 1 and 65535');
const git = async (...args: string[]) => (await promisify(execFile)('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 })).stdout;
const configRoots = ['.agents/skills/live2d-maker', 'workflow-next'];
const isConfig = (path: string) => /(^|\/)(prompts|templates)\/.*\.md$/.test(path)
  || /(^|\/)tools\/.*\/(description\.md|schema\.json)$/.test(path) || path === 'SKILL.md';
// Inventory the archive, so intermediate previews never link to invented artifacts.
const archiveFiles = readdir(resolve(root, 'demos/jianma'), { recursive: true })
  .then(paths => paths.filter(path => /\.(png|jpg|svg|json|md|kra)$/.test(path)).sort());
async function revision(ref: string): Promise<string> {
  if (!ref || ref.startsWith('-') || ref.includes('\0')) throw new Error('无效的版本');
  return (await git('rev-parse', '--verify', ref + '^{commit}')).trim();
}
async function configSnapshot(ref: string) {
  const commit = ref === 'worktree' ? 'HEAD' : await revision(ref);
  for (const directory of configRoots) {
    const listing = ref === 'worktree' ? await git('ls-files', '-z', '--', directory)
      : await git('ls-tree', '-r', '-z', '--name-only', commit, '--', directory);
    const paths = listing.split('\0').filter(Boolean).map(path => path.slice(directory.length + 1)).filter(isConfig);
    if (paths.length) return { directory, paths, commit };
  }
  return { directory: configRoots[0], paths: [], commit };
}
async function api(path: string, params: URLSearchParams) {
  if (path === '/api/demo') {
    const groups = await Promise.all(['part-layering', 'clothing-part-layering'].map(async id =>
      JSON.parse(await readFile(resolve(root, 'demos/jianma', id, 'groups.json'), 'utf8'))));
    return { directory: resolve(root, '.run'), character: groups[0], clothing: groups[1], files: await archiveFiles };
  }
  if (path === '/api/config/versions') {
    const branches = (await git('for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes')).trim().split('\n')
      .filter(ref => ref && !ref.endsWith('/HEAD'));
    const ref = params.get('ref') ?? 'HEAD';
    const commit = await revision(ref === 'worktree' ? 'HEAD' : ref);
    const commits = (await git('log', '-15', '--format=%H%x09%h%x09%s', commit)).trim().split('\n').map(line => {
      const [sha, short, ...title] = line.split('\t'); return { sha, short, title: title.join('\t') };
    });
    return { branches, commits };
  }
  if (path === '/api/config/files') return configSnapshot(params.get('ref') ?? 'worktree');
  if (path === '/api/config/content' || path === '/api/config/diff') {
    const ref = params.get('ref') ?? 'worktree', selected = params.get('path') ?? '';
    const snapshot = await configSnapshot(ref);
    if (!snapshot.paths.includes(selected)) throw new Error('所选版本没有这个配置文件');
    const file = snapshot.directory + '/' + selected;
    if (path.endsWith('/diff')) {
      const base = await revision(params.get('base') ?? 'HEAD~2');
      return { text: await git('diff', '--no-ext-diff', '--no-color', base, ...(ref === 'worktree' ? [] : [snapshot.commit]), '--', file) };
    }
    return { text: ref === 'worktree' ? await readFile(resolve(root, file), 'utf8') : await git('show', snapshot.commit + ':' + file) };
  }
  throw new Error('Unknown API');
}

// Visual prototypes only. Serving them never launches agents or changes task data.
const files: Record<string, [string, string]> = {
  '/': ['web/index.html', 'text/html; charset=utf-8'],
  '/app.js': ['web/app.js', 'text/javascript; charset=utf-8'],
  '/progress.js': ['web/progress.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['web/styles.css', 'text/css; charset=utf-8'],
  '/images/reference.png': ['demos/jianma/part-layering/references/simplified-subject.png', 'image/png'],
  '/images/original.jpg': ['demos/jianma/input/original.jpg', 'image/jpeg'],
  '/images/clothing.png': ['demos/jianma/clothing-raster-layering/step02/composite.png', 'image/png'],
  '/images/clothing-parts.svg': ['demos/jianma/clothing-part-layering/preview.svg', 'image/svg+xml'],
  '/images/character-parts.svg': ['demos/jianma/part-layering/preview.svg', 'image/svg+xml'],
  '/images/body.png': ['demos/jianma/raster-layering/step03/character-dressup-base.png', 'image/png'],
  '/images/assembled.png': ['demos/jianma/character-assembly/step01/character-assembled.png', 'image/png'],
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost'), path = url.pathname;
  if (request.method !== 'GET') { response.writeHead(405); response.end('Read-only demo'); return; }
  if (path === '/healthz') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ status: 'ok', application: 'astra-layering', mode: 'prototype' }));
    return;
  }
  if (path.startsWith('/api/')) {
    try { const data = await api(path, url.searchParams); response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)); }
    catch (error) { response.writeHead(400, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: error instanceof Error ? error.message.split('\n')[0] : '读取失败' })); }
    return;
  }
  if (path.startsWith('/artifact/')) {
    try {
      const archive = resolve(root, 'demos/jianma'), file = resolve(archive, decodeURIComponent(path.slice('/artifact/'.length)));
      const types: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.kra': 'application/octet-stream' };
      const type = types[extname(file)];
      if (!file.startsWith(archive + sep) || !type || !(await stat(file)).isFile()) throw new Error('Not found');
      response.writeHead(200, { 'Content-Type': type });
      createReadStream(file).on('error', () => response.destroy()).pipe(response);
    } catch { response.writeHead(404); response.end('Artifact not found'); }
    return;
  }
  if (path === '/demo-config.json') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ directory: resolve(root, '.run') }));
    return;
  }
  const entry = files[path];
  if (!entry) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const bytes = await readFile(resolve(root, entry[0]));
    response.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-cache' });
    response.end(bytes);
  } catch {
    response.writeHead(404); response.end('Demo asset is unavailable');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`AstraLayering UI demo: http://127.0.0.1:${port}`);
  console.log('Visual prototype with example progress. Does not execute workflows or modify existing runs.');
});

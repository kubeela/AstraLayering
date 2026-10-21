import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { safePath } from './files.ts';
const root = fileURLToPath(new URL('../', import.meta.url));
const git = async (...args: string[]) => (await promisify(execFile)('git', args, { cwd: root, maxBuffer: 8 * 1024 * 1024 })).stdout;
const configRoots = ['.agents/skills/live2d-maker', 'workflow-next'];
const isConfig = (path: string) => /(^|\/)(prompts|templates)\/.*\.md$/.test(path)
  || /(^|\/)tools\/.*\/(description\.md|schema\.json)$/.test(path)
  || /^presets\/[^/]+\.env$/.test(path)
  || ['SKILL.md', 'example.env', 'references/agent-models.md', 'references/model-presets.md'].includes(path);
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
export async function configAPI(path: string, params: URLSearchParams) {
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
    return { text: ref === 'worktree' ? await readFile(await safePath(root, file), 'utf8') : await git('show', snapshot.commit + ':' + file) };
  }
  throw new Error('Unknown API');
}

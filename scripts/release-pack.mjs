// Packs one release tag into .release/AstraLayering-vX.Y.Z.zip.
// The tag is the version: package.json at that tag must carry the same number, and the archive
// is taken from the tagged commit (not the working tree), with .gitattributes export-ignore applied.
// The tagged Pink Doll archive is placed in .run/pink-doll for the default workbench directory.
//   pnpm release:pack            -> tag v<package.json version>
//   pnpm release:pack v0.1.0
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

export function packRelease({ root = dirname(dirname(fileURLToPath(import.meta.url))), tag, gitCommand = 'git' } = {}) {
  const git = (...args) => execFileSync(gitCommand, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }).trim();
  tag ??= 'v' + JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`发布标签必须是 vX.Y.Z：${tag}`);
  try { git('rev-parse', '--verify', '--quiet', `refs/tags/${tag}`); }
  catch { throw new Error(`没有标签 ${tag}；先在 main 上更新 package.json 与 CHANGELOG.md，提交后执行 git tag ${tag}`); }
  const tagged = JSON.parse(git('show', `${tag}:package.json`)).version;
  if ('v' + tagged !== tag) throw new Error(`${tag} 的 package.json 版本是 ${tagged}，与标签不一致`);
  if (!git('show', `${tag}:CHANGELOG.md`).includes(`## ${tag}`)) throw new Error(`${tag} 的 CHANGELOG.md 缺少“## ${tag}”一节`);

  const name = `AstraLayering-${tag}`, output = join(root, '.release', name + '.zip');
  mkdirSync(dirname(output), { recursive: true });
  // Build an unreferenced tree from tagged objects: preserve file bytes and modes,
  // and leave both the checkout's demos and any local .run tasks untouched.
  const writeTree = entries => execFileSync(gitCommand, ['mktree', '-z'], {
    cwd: root, encoding: 'utf8', input: entries.join('\0') + '\0',
  }).trim();
  const example = git('rev-parse', `${tag}:demos/pink-doll`);
  const runs = writeTree([`040000 tree ${example}\tpink-doll`]);
  const entries = git('ls-tree', '-z', tag).split('\0').filter(Boolean)
    .filter(entry => !['demos', '.run'].includes(entry.slice(entry.indexOf('\t') + 1)));
  const tree = writeTree([...entries, `040000 tree ${runs}\t.run`]);
  git('archive', '--format=zip', `--prefix=${name}/`, '-o', output, tree);
  const files = [];
  // Inspect ZIP entries without decompressing the artwork or requiring a platform unzip command.
  unzipSync(readFileSync(output), { filter: entry => { files.push(entry.name); return false; } });
  for (const required of ['start-workbench.sh', 'web/server.ts', '.agents/skills/live2d-maker/SKILL.md', '.run/pink-doll/run.json', 'LICENSE', 'COPYING'])
    if (!files.includes(`${name}/${required}`)) throw new Error(`发布包缺少 ${required}`);
  const stray = files.find(file => /^[^/]+\/(tutorial|rigging|sam_veirfy|archive|svg-previewer|demos)\//.test(file) || /^[^/]+\/\.run\/(?!pink-doll\/)./.test(file));
  if (stray) throw new Error(`发布包含有应排除的文件：${stray}`);
  return { output, files: files.filter(file => !file.endsWith('/')).length, bytes: statSync(output).size };
}

if (import.meta.main) {
  const result = packRelease({ tag: process.argv[2] });
  console.log(`${result.output}\n${result.files} 个文件，${(result.bytes / 1048576).toFixed(1)} MB`);
}

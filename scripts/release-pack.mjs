// Packs one release tag into .release/AstraLayering-vX.Y.Z.zip.
// The tag is the version: package.json at that tag must carry the same number, and the archive
// is taken from the tagged commit (not the working tree), with .gitattributes export-ignore applied.
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
  git('archive', '--format=zip', `--prefix=${name}/`, '-o', output, tag);
  const files = [];
  // Inspect ZIP entries without decompressing the artwork or requiring a platform unzip command.
  unzipSync(readFileSync(output), { filter: entry => { files.push(entry.name); return false; } });
  for (const required of ['start-workbench.sh', 'web/server.ts', '.agents/skills/live2d-maker/SKILL.md', 'demos/pink-doll/run.json', 'LICENSE', 'COPYING'])
    if (!files.includes(`${name}/${required}`)) throw new Error(`发布包缺少 ${required}`);
  const stray = files.find(file => /^[^/]+\/(tutorial|rigging|sam_veirfy|archive|svg-previewer)\//.test(file) || /^[^/]+\/demos\/(?!pink-doll\/)./.test(file));
  if (stray) throw new Error(`发布包含有应排除的文件：${stray}`);
  return { output, files: files.filter(file => !file.endsWith('/')).length, bytes: statSync(output).size };
}

if (import.meta.main) {
  const result = packRelease({ tag: process.argv[2] });
  console.log(`${result.output}\n${result.files} 个文件，${(result.bytes / 1048576).toFixed(1)} MB`);
}

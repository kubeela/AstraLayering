import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
import { packRelease } from '../release-pack.mjs';

const project = fileURLToPath(new URL('../../', import.meta.url));
const attributes = readFileSync(join(project, '.gitattributes'), 'utf8');
const prefix = 'AstraLayering-v0.1.0/';

function fixture(t, { excludePreviewer = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'astra-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    'package.json': '{"name":"astra-layering-web","version":"0.1.0"}\n',
    'CHANGELOG.md': '## v0.1.0\n',
    '.gitattributes': excludePreviewer ? attributes : attributes.replace('/svg-previewer export-ignore', ''),
    'start-workbench.sh': '#!/bin/sh\n', 'web/server.ts': '// tagged entry point\n',
    '.agents/skills/live2d-maker/SKILL.md': '# Skill\n',
    'demos/pink-doll/run.json': '{"archive":true}\n', 'demos/other/run.json': '{}\n',
    'svg-previewer/part-preview.html': '<!doctype html>\n',
    'archive/old.md': 'history\n', 'rigging/old.md': 'research\n',
    'tutorial/old.md': 'tutorial\n', 'sam_veirfy/old.md': 'experiment\n',
    'LICENSE': 'license\n', 'COPYING': 'copying\n',
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), content);
  }
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Release Test', '-c', 'user.email=release@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${join(root, 'no-hooks')}`, ...args], { cwd: root, encoding: 'utf8' });
  git('init', '-q'); git('add', '.'); git('commit', '-qm', 'release'); git('tag', 'v0.1.0');
  return root;
}

test('the tagged release keeps Pink Doll and excludes svg-previewer and research', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'web/server.ts'), '// uncommitted change\n');
  const result = packRelease({ root, tag: 'v0.1.0' });
  const files = unzipSync(readFileSync(result.output));
  assert.equal(new TextDecoder().decode(files[prefix + 'web/server.ts']), '// tagged entry point\n');
  assert.ok(files[prefix + 'demos/pink-doll/run.json']);
  assert.ok(files[prefix + '.agents/skills/live2d-maker/SKILL.md']);
  assert.equal(Object.keys(files).some(name => /^AstraLayering-v0\.1\.0\/(svg-previewer|archive|rigging|tutorial|sam_veirfy)\//.test(name)), false);
  assert.equal(Object.keys(files).some(name => name.startsWith(prefix + 'demos/other/')), false);
});

test('packaging rejects svg-previewer when its archive exclusion is missing', t => {
  const root = fixture(t, { excludePreviewer: false });
  assert.throws(() => packRelease({ root, tag: 'v0.1.0' }), /发布包含有应排除的文件：.*svg-previewer\//);
});

test('packaging succeeds with Node and Git when no unzip command is available', t => {
  const root = fixture(t), emptyPath = join(root, 'empty-bin'); mkdirSync(emptyPath);
  const gitName = process.platform === 'win32' ? 'git.exe' : 'git';
  const gitCommand = (process.env.PATH ?? '').split(delimiter).map(path => join(path, gitName)).find(path => existsSync(path));
  assert.ok(gitCommand, 'Git is required for release packaging');
  const module = new URL('../release-pack.mjs', import.meta.url).href;
  const code = `import { packRelease } from ${JSON.stringify(module)}; console.log(JSON.stringify(packRelease(${JSON.stringify({ root, tag: 'v0.1.0', gitCommand })})));`;
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root, env: { ...process.env, PATH: emptyPath }, encoding: 'utf8',
  }));
  assert.ok(result.files > 0);
  assert.ok(unzipSync(readFileSync(result.output))[prefix + 'demos/pink-doll/run.json']);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix, win32 } from 'node:path';
import { inventory, webFilePath } from '../files.ts';

test('Windows and POSIX artifact paths resolve to the same inventory and version keys', async t => {
  const root = await mkdtemp(join(tmpdir(), 'web-paths-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const keys = [
    'part-layering/step09_outline/face/children/eye_left/children/iris/outline.svg',
    'part-layering/step09_outline/face/children/eye_left/children/iris/workspace/outline.draft.svg',
    'part-layering/step10_reduce/depth03/face/eye_left/iris.svg',
    'part-layering/step10_reduce/depth03/workspace/face/eye_left/iris.draft.svg',
    'part-layering/parts/face/eye_left/iris.svg',
    'part-layering/step09_outline/face/children/eye_left/children/iris/review.json',
    'raster-layering/step01/参考 对照.png',
  ];
  for (const key of keys) {
    const path = join(root, key);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, 'test');
  }
  const versions: Record<string, string> = {}, files = new Set(await inventory(root, versions));
  for (const paths of [win32, posix]) for (const key of keys) {
    const native = paths.join(...key.split('/')), indexed = webFilePath(native);
    assert.equal(indexed, key);
    assert.ok(files.has(indexed), `${native} must find its published file`);
    assert.ok(versions[indexed], `${native} must find its preview version`);
    assert.equal(webFilePath(paths.relative(paths.resolve('task'), paths.resolve('task', native))), key);
  }
});

test('large directory trees keep all artifacts and versions in sorted order, including observations', async t => {
  const root = await mkdtemp(join(tmpdir(), 'web-inventory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const paths = Array.from({ length: 37 }, (_, i) => [
    `part-layering/step09_outline/group-${i}/outline.svg`,
    `part-layering/step09_outline/group-${i}/workspace/inspect/local.png`,
    `part-layering/observations/group-${i}/closeup.png`,
  ]).flat();
  for (const path of paths) {
    const file = join(root, path);
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, 'evidence');
  }
  const versions: Record<string, string> = {};
  assert.deepEqual(await inventory(root, versions), paths.sort());
  assert.deepEqual(Object.keys(versions).sort(), paths);
  assert.ok(Object.values(versions).every(value => value.endsWith(':8')));
});

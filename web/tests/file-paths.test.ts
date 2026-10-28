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
    'part-layering/groups/face/children/eye_left/children/iris/step01/outline.svg',
    'part-layering/groups/face/children/eye_left/children/iris/step01/workspace/outline.draft.svg',
    'part-layering/layers/depth03/face/eye_left/iris.svg',
    'part-layering/layers/depth03/workspace/face/eye_left/iris.draft.svg',
    'part-layering/parts/face/eye_left/iris.svg',
    'part-layering/groups/face/children/eye_left/children/iris/step01/review.json',
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

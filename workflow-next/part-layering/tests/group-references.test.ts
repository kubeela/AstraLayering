import assert from 'node:assert/strict';
import { mkdir, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { readGroupReferences } from '../../shared/part/group-prompts.ts';
import { writeAtomic } from '../../shared/part/groups.ts';
import { fixture } from './layering-fixture.ts';

test('参考图片按当前组与步骤显式读取，相对清单定位且不继承', async t => {
  const f = await fixture(t), directory = join(f.directory, 'prompts', 'hair');
  await mkdir(directory, { recursive: true });
  const config = [{ path: '../../references/base.png', description: '完整长发片；有粒度疑问时参考' }];
  await writeAtomic(join(directory, 'children.references.json'), JSON.stringify(config));
  assert.deepEqual(await readGroupReferences(directory, 'children'), [
    { path: await realpath(f.references.baseSubject), description: config[0].description },
  ]);
  assert.deepEqual(await readGroupReferences(directory, 'completion'), []);
  assert.deepEqual(await readGroupReferences(join(directory, 'child'), 'children'), []);
});

test('错误或缺失的已配置图片明确报错，不静默跳过', async t => {
  const f = await fixture(t), directory = join(f.directory, 'prompts');
  await mkdir(directory);
  const path = join(directory, 'children.references.json');
  for (const config of [{}, [null], [{ path: 'a.png', description: ' ' }],
    [{ path: 'a.png', description: 'ref', scope: 'subtree' }]]) {
    await writeAtomic(path, JSON.stringify(config));
    await assert.rejects(readGroupReferences(directory, 'children'), /无效 children 参考清单/);
  }
  await writeAtomic(path, '[{"path":"missing.png","description":"ref"}]');
  await assert.rejects(readGroupReferences(directory, 'children'), { code: 'ENOENT' });
  await writeAtomic(join(directory, 'not-image.txt'), 'not an image');
  await writeAtomic(path, '[{"path":"not-image.txt","description":"ref"}]');
  await assert.rejects(readGroupReferences(directory, 'children'), /unsupported|format/i);
});

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ToolCatalog, toolsDirectory } from '../codex/tool-config.ts';
import { profile as clothing } from '../../clothing-part-layering/profile.ts';

test('工具配置逐文件覆盖；衣服的 subject 限制不会污染共享定义', () => {
  const shared = new ToolCatalog(), specialized = new ToolCatalog(toolsDirectory, clothing.toolsDirectory);
  const subjects = (catalog: ToolCatalog) => (catalog.get('write_groups').inputSchema.properties as any).subject.enum;
  assert.deepEqual(subjects(shared), ['character', 'other']);
  assert.deepEqual(subjects(specialized), ['other']);
  assert.equal(shared.get('write_groups').description, specialized.get('write_groups').description);
  assert.deepEqual(shared.get('preview_svg'), specialized.get('preview_svg'));
});

test('修改本地配置在新 catalog 生效；已加载定义不被文件或调用者修改', async t => {
  const root = await mkdtemp(join(tmpdir(), 'tool-config-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = join(root, 'update_group_note');
  await mkdir(dir);
  await writeFile(join(dir, 'description.md'), '初始说明');
  const schema = await readFile(join(toolsDirectory, 'update_group_note/schema.json'));
  await writeFile(join(dir, 'schema.json'), schema);
  const before = new ToolCatalog(root);
  await writeFile(join(dir, 'description.md'), '修改后的工具说明');
  assert.equal(new ToolCatalog(root).get('update_group_note').description, '修改后的工具说明');
  assert.equal(before.get('update_group_note').description, '初始说明');
  before.get('update_group_note').inputSchema.required = [];
  assert.deepEqual(before.get('update_group_note').inputSchema.required, ['oldText', 'newText']);
  await writeFile(join(dir, 'schema.json'), '{ broken');
  assert.throws(() => new ToolCatalog(root), /update_group_note.*schema.json/);
});

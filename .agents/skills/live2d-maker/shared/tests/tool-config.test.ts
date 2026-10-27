import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { ToolCatalog, toolsDirectory } from '../codex/tool-config.ts';
import { profile as clothing } from '../../clothing-part-layering/profile.ts';
import { CodexAgents } from '../codex/agents.ts';
import { textResult } from '../codex/function-tools.ts';
import { fakeAppServer } from '../../part-layering/tests/fake-app-server.ts';
import { nodeExecutables } from '../../part-layering/tests/node-executables.ts';
import { createSvgPreviewTool } from '../part/svg-tools.ts';

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

test('本地工具定义实际注册到 App Server，续轮保留定义并使用本轮回调', async t => {
  nodeExecutables(t);
  const root = await mkdtemp(join(tmpdir(), 'tool-registration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const overrides = join(root, 'tools'), dir = join(overrides, 'update_group_note');
  await mkdir(dir, { recursive: true });
  const schema = { type: 'object', properties: { oldText: { type: 'string', const: 'before' }, newText: { type: 'string' } },
    required: ['oldText', 'newText'], additionalProperties: false };
  await writeFile(join(dir, 'description.md'), '本地编辑的说明');
  await writeFile(join(dir, 'schema.json'), JSON.stringify(schema));
  const server = await fakeAppServer(root, [{ tool: 'update_group_note', arguments: { oldText: 'before', newText: 'after' } }]);
  const agents = new CodexAgents({ cwd: root, toolsDirectory: overrides, codexPathOverride: server.executable, logDirectory: join(root, 'logs') });
  const session = agents.createSession(), calls: string[] = [];
  try {
    for (const phase of ['draw', 'repair']) {
      await session.run({ name: phase, prompt: phase, tools: [{ name: 'update_group_note', description: '旧说明', inputSchema: { type: 'object' },
        async execute(value) { assert.deepEqual(value, { oldText: 'before', newText: 'after' }); calls.push(phase); return textResult(phase); },
      }] });
      await writeFile(join(dir, 'description.md'), '下一次进程启动后才生效');
    }
  } finally { await session.close(); }
  const protocol = (await readFile(server.capture, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const starts = protocol.filter(message => message.method === 'thread/start');
  assert.equal(starts.length, 1);
  assert.equal(starts[0].params.cwd, root);
  assert.deepEqual(starts[0].params.dynamicTools, [{ type: 'function', name: 'update_group_note', description: '本地编辑的说明', inputSchema: schema }]);
  assert.equal(protocol.filter(message => message.method === 'turn/start').length, 2);
  assert.deepEqual(calls, ['draw', 'repair']);
});

test('阶段限制在加载 section 工具配置后仍保留，普通预览只注册原图参数', async t => {
  nodeExecutables(t);
  const root = await mkdtemp(join(tmpdir(), 'preview-tool-registration-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const server = await fakeAppServer(root, []);
  const tool = createSvgPreviewTool({ directory: root, reference: join(root, 'reference.png'),
    canvas: { width: 100, height: 100 }, observationDirectory: join(root, 'observations') });
  const agents = new CodexAgents({ cwd: root, toolsDirectory: clothing.toolsDirectory,
    codexPathOverride: server.executable, logDirectory: join(root, 'logs') });
  await agents.run({ name: 'ordinary-preview', prompt: 'fixture', tools: [tool] });
  const protocol = (await readFile(server.capture, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  const start = protocol.find(message => message.method === 'thread/start');
  const properties = start.params.dynamicTools[0].inputSchema.properties;
  assert.ok(properties.crop);
  assert.equal(properties.reference, undefined);
  assert.equal(properties.referenceRegion, undefined);
  assert.equal(properties.referenceOffset, undefined);
  const completion = createSvgPreviewTool({ directory: root, reference: join(root, 'reference.png'),
    canvas: { width: 100, height: 100 }, observationDirectory: root, allowGeneratedReference: true });
  assert.ok((completion.inputSchema.properties as Record<string, unknown>).referenceRegion);
});

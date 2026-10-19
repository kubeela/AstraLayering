import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { createOcclusionTools } from '../raster/occlusion-tools.ts';
import { validateOcclusionDocument } from '../part/occlusion-plan.ts';
import { runWorkflow } from '../raster/workflow.ts';
import { pipeline as character } from '../../raster-layering/run.ts';
import { pipeline as clothing } from '../../clothing-raster-layering/run.ts';
import { seedUpstream } from './upstream-fixture.ts';
import { rasterCodexConfig, type AgentRequest } from '../raster/agent.ts';
import type { FunctionTool } from '../codex/function-tools.ts';
import { migrateRunInputs } from '../../tools/migrate-upstream-inputs.ts';

const signal = new AbortController().signal;
const change = { id: 'fixture', note: '在 Krita 中拆为前后两层，保持同一运动身份',
  levels: [{ level: 0, region: '后方衣料' }, { level: 2, region: '向前翻出的衣料，与后方连续' }],
  regions: [{ level: 0, note: '后片已独显检查' }, { level: 2, note: '前片与后片连续' }] };
async function read(tools: FunctionTool[]) {
  const result = await tools.find(t => t.name === 'read_occlusion')!.execute({}, signal);
  return JSON.parse((result.contentItems[0] as { text: string }).text);
}
async function scratch(t: { after(callback: () => Promise<unknown>): void }) {
  const root = await mkdtemp(join(tmpdir(), 'multidepth-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('精确更新拒绝旧版本读数与越界字段，保留其他记录、输入指纹和逻辑 ID', async t => {
  const root = await scratch(t), source = await seedUpstream('case', 'part-layering', root);
  const file = join(source, 'occlusion.json');
  const plan = JSON.parse(await readFile(file, 'utf8'));
  plan.layers.push({ id: 'other', level: 1, note: '中间部件', check: { passed: true, note: '原检查' } });
  await writeFile(file, JSON.stringify(plan));
  const tools = createOcclusionTools(source, true), update = tools[1];
  const current = await read(tools);
  for (const invalid of [
    { ...change, level: 3 }, { ...change, id: 'new-part' }, { ...change, regions: [] },
    { ...change, groups: [] }, { ...change, levels: [{ level: 0, region: '' }, { level: 2, region: '前' }] },
  ]) await assert.rejects(update.execute({ revision: current.revision, changes: [invalid] }, signal));
  assert.equal((await read(tools)).revision, current.revision);
  await update.execute({ revision: current.revision, changes: [change] }, signal);
  const updated = await read(tools);
  assert.equal(updated.plan.version, 3);
  assert.equal(updated.plan.sourceHash, plan.sourceHash);
  assert.deepEqual(updated.plan.layers[1], plan.layers[1]);
  assert.equal('level' in updated.plan.layers[0], false);
  assert.equal(updated.plan.layers[0].levels.length, 2);
  validateOcclusionDocument(updated.plan);
  await assert.rejects(update.execute({ revision: current.revision, changes: [change] }, signal), /已变化/);
  await assert.rejects(createOcclusionTools(source, false)[1].execute({ revision: updated.revision, changes: [change] }, signal), /只有 step01/);
});

test('两套 raster 中断与主动重跑均保留上游深度修正', async t => {
  for (const pipeline of [character, clothing]) await t.test(pipeline.id, async t => {
    const root = await scratch(t), source = await seedUpstream('case', pipeline.inputPipeline, root);
    const output = join(root, 'case', pipeline.id), groups = await readFile(join(source, 'groups.json'));
    const deps = { runsDirectory: root, steps: [pipeline.steps[0]], preflight: async (executable: string) => ({ executable, version: 'fixture' }) };
    await assert.rejects(runWorkflow(pipeline, { name: 'case', krita: process.execPath }, { ...deps, agent: async request => {
      await request.onEvent({ type: 'thread.started', thread_id: 'fixed-thread' });
      const current = await read(request.tools!);
      await request.tools![1].execute({ revision: current.revision, changes: [change] }, signal);
      throw new Error('模拟修改深度后中断');
    } }), /模拟修改深度后中断/);
    const corrected = await readFile(join(source, 'occlusion.json'));
    async function deliver(request: AgentRequest) {
      assert.deepEqual(await readFile(join(source, 'occlusion.json')), corrected);
      assert.ok(request.prompt.includes(JSON.stringify(source)));
      await request.onEvent({ type: 'thread.started', thread_id: request.threadId ?? 'new-thread' });
      for (const file of pipeline.steps[0].requiredFiles) await writeFile(join(output, 'step01', file), 'fixture delivery');
      return { status: 'completed' as const, summary: '完成' };
    }
    await runWorkflow(pipeline, { name: 'case' }, { ...deps, agent: async request => {
      assert.equal(request.threadId, 'fixed-thread'); return deliver(request);
    } });
    await rm(join(output, 'step01/.completed'));
    await runWorkflow(pipeline, { name: 'case' }, { ...deps, agent: async request => {
      assert.equal(request.threadId, undefined); return deliver(request);
    } });
    assert.deepEqual(await readFile(join(source, 'occlusion.json')), corrected);
    assert.deepEqual(await readFile(join(source, 'groups.json')), groups);
    await assert.rejects(readdir(join(output, 'input')), { code: 'ENOENT' });
  });
});

test('每次 SDK 启动的 MCP 工具可读写同一上游，后续阶段只提供读取工具', { timeout: 5000 }, async t => {
  const root = await scratch(t), source = await seedUpstream('case', 'part-layering', root);
  for (const editable of [true, false]) {
    const config = rasterCodexConfig({ occlusion: { upstream: source, editable } });
    assert.equal(config.features.image_generation, true);
    const server = config.mcp_servers!.layering_occlusion;
    const child = spawn(server.command, server.args, { stdio: ['pipe', 'pipe', 'pipe'] });
    t.after(() => { child.kill(); });
    const pending = new Map<number, (value: any) => void>();
    let nextId = 0;
    const reader = createInterface({ input: child.stdout });
    const consume = (async () => {
      for await (const line of reader) {
        const message = JSON.parse(line);
        pending.get(message.id)?.(message);
        pending.delete(message.id);
      }
    })();
    const request = (method: string, params = {}) => new Promise<any>(resolve => {
      const id = ++nextId; pending.set(id, resolve);
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
    try {
      const init = await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
      assert.ok(init.result.capabilities.tools);
      const listed = await request('tools/list');
      assert.deepEqual(listed.result.tools.map((tool: { name: string }) => tool.name), editable ? ['read_occlusion', 'update_occlusion'] : ['read_occlusion']);
      const current = await request('tools/call', { name: 'read_occlusion', arguments: {} });
      const record = JSON.parse(current.result.content[0].text);
      assert.equal(record.path, join(source, 'occlusion.json'));
      const updated = await request('tools/call', { name: 'update_occlusion', arguments: { revision: record.revision, changes: [change] } });
      assert.equal(updated.result.isError, !editable);
      assert.equal(JSON.parse(await readFile(join(source, 'occlusion.json'), 'utf8')).layers[0].levels.length, 2);
    } finally { child.stdin.end(); await consume; }
  }
});

test('旧输入迁移保留上下文和产物，冲突时不覆盖，重复执行安全', async t => {
  const root = await scratch(t), dir = join(root, 'case');
  const paths = ['part-layering/references/original.png', 'raster-layering/input/parts/fixture.svg', 'raster-layering/input/references/original.png'];
  for (const path of paths) { await mkdir(join(dir, path, '..'), { recursive: true }); await writeFile(join(dir, path), path.includes('original') ? 'original' : 'part'); }
  await writeFile(join(dir, 'raster-layering/run.json'), JSON.stringify({ threadId: 'keep-thread', sourceInput: { directory: 'old', parts: 'old/parts' } }));
  const preview = await migrateRunInputs('case', root, true);
  assert.equal(preview.length, 3);
  await migrateRunInputs('case', root);
  assert.equal(await readFile(join(dir, 'input/original.png'), 'utf8'), 'original');
  assert.equal(await readFile(join(dir, 'part-layering/parts/fixture.svg'), 'utf8'), 'part');
  await assert.rejects(readdir(join(dir, 'raster-layering/input')), { code: 'ENOENT' });
  assert.equal(JSON.parse(await readFile(join(dir, 'raster-layering/run.json'), 'utf8')).threadId, 'keep-thread');
  assert.deepEqual(await migrateRunInputs('case', root), []);
  await mkdir(join(dir, 'raster-layering/input/parts'), { recursive: true });
  await writeFile(join(dir, 'raster-layering/input/parts/fixture.svg'), 'conflicting copy');
  await assert.rejects(migrateRunInputs('case', root), /未覆盖任何文件/);
  assert.equal(await readFile(join(dir, 'part-layering/parts/fixture.svg'), 'utf8'), 'part');
});

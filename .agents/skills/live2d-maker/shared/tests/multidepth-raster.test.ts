import {deliverRasterStep, isRasterReview} from './raster-delivery.ts';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { runWorkflow } from '../raster/workflow.ts';
import { pipeline as character } from '../../raster-layering/run.ts';
import { pipeline as clothing } from '../../clothing-raster-layering/run.ts';
import { seedUpstream } from './upstream-fixture.ts';
import { splitStructure } from './structure-fixture.ts';
import { rasterCodexConfig, type AgentRequest } from '../raster/agent.ts';

test('两套 raster 经受控工具新增分组及 SVG 后，中断与主动重跑保留上游修改', async t => {
  for (const pipeline of [character, clothing]) await t.test(pipeline.id, async t => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'structure-resume-')));
    t.after(() => rm(root, { recursive: true, force: true }));
    const source = await seedUpstream('case', pipeline.inputPipeline, root);
    const output = join(root, 'case', pipeline.id);
    const deps = { runsDirectory: root, steps: [pipeline.steps[0]], preflight: async (executable: string) => ({ executable, version: 'fixture' }) };
    let changed: Record<string, string> = {};
    await assert.rejects(runWorkflow(pipeline, { name: 'case', krita: process.execPath }, { ...deps, agent: async request => {
      await request.onEvent({ type: 'thread.started', thread_id: 'fixed-thread' });
      changed = await splitStructure(source);
      throw new Error('结构保存后中断');
    } }), /结构保存后中断/);
    async function deliver(request: AgentRequest) {
      for (const [file, bytes] of Object.entries(changed)) assert.equal(await readFile(join(source, file), 'utf8'), bytes);
      return deliverRasterStep(request, pipeline.steps[0], 'new-thread');
    }
    await runWorkflow(pipeline, { name: 'case' }, { ...deps, agent: async request => {
      if (!isRasterReview(request)) assert.equal(request.threadId, 'fixed-thread'); return deliver(request);
    } });
    await rm(join(output, 'step01/.completed'));
    await runWorkflow(pipeline, { name: 'case' }, { ...deps, agent: async request => {
      assert.equal(request.threadId, undefined); return deliver(request);
    } });
    for (const [file, bytes] of Object.entries(changed)) assert.equal(await readFile(join(source, file), 'utf8'), bytes);
  });
});

test('栅格调用不注册分层专用 MCP，使用宿主现有工具', () => {
  assert.deepEqual(rasterCodexConfig(), { features: { image_generation: true } });
});

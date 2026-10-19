import { seedUpstream } from './upstream-fixture.ts';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pipelineDirectory, resolveInput, taskDirectory } from '../paths.ts';
import { runWorkflow } from '../../raster-layering/run.ts';
import { steps } from '../../raster-layering/steps.ts';

test('相对输入总是从任务根解析，不受管线或启动目录影响', () => {
  assert.equal(resolveInput('sample', 'part-layering/parts'), join(taskDirectory('sample'), 'part-layering/parts'));
  assert.equal(resolveInput('sample', '/tmp/external'), '/tmp/external');
  assert.equal(pipelineDirectory('sample', 'raster-layering'), join(taskDirectory('sample'), 'raster-layering'));
});

test('同名任务的管线互为输入；raster 直接读取且重跑仅清理自身目录', async t => {
  const root = await mkdtemp(join(tmpdir(), 'shared-run-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const name = 'case', part = pipelineDirectory(name, 'part-layering', root);
  const raster = pipelineDirectory(name, 'raster-layering', root);
  const clothing = pipelineDirectory(name, 'clothing-raster-layering', root);
  await seedUpstream(name, 'part-layering', root);
  await writeFile(join(part, 'parts/face.svg'), 'original part');
  await mkdir(clothing, { recursive: true });
  await writeFile(join(clothing, '.completed'), 'another pipeline');
  let calls = 0;
  const deps = { runsDirectory: root, steps: [steps[0]], preflight: async (executable: string) => ({ executable, version: 'fixture' }),
    agent: async (request: import('../raster/agent.ts').AgentRequest) => {
      calls++;
      assert.equal(request.threadId, undefined);
      await request.onEvent({ type: 'thread.started', thread_id: `thread-${calls}` });
      for (const file of steps[0].requiredFiles) await writeFile(join(request.directory, 'step01', file), 'result');
      return { status: 'completed' as const, summary: '完成' };
    } };
  await runWorkflow({ name, krita: process.execPath }, deps);
  assert.equal(await readFile(join(part, 'parts/face.svg'), 'utf8'), 'original part');
  await rm(join(raster, 'step01/.completed'));
  await runWorkflow({ name }, deps);
  assert.equal(calls, 2);
  assert.equal(await readFile(join(part, 'parts/face.svg'), 'utf8'), 'original part');
  assert.equal(await readFile(join(clothing, '.completed'), 'utf8'), 'another pipeline');
});

import { seedUpstream } from './upstream-fixture.ts';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pipelineDirectory, pipelineIds } from '../paths.ts';
import { AgentCallError, AgentRuntime, retryableAgentError } from '../codex/agent-runtime.ts';
import { recognizeInitialGroups } from '../part/initial-groups.ts';
import { runWorkflow as runRaster } from '../../raster-layering/run.ts';
import { runWorkflow as runClothingRaster } from '../../clothing-raster-layering/run.ts';
import { initializeRun, newConfig } from '../raster/run-store.ts';
import { profile as character } from '../../part-layering/profile.ts';
import { profile as clothing } from '../../clothing-part-layering/profile.ts';
import { fixture } from '../../part-layering/tests/layering-fixture.ts';

test('共享目录保留 part 原有任务名范围，raster 仍执行自己的命名限制', () => {
  for (const name of ['demo 2', '_demo', '.draft', '衣服👕']) {
    for (const id of ['part-layering', 'clothing-part-layering'] as const) {
      assert.equal(pipelineDirectory(name, id, '/tmp/runs'), join('/tmp/runs', name, id));
    }
    for (const id of ['raster-layering', 'clothing-raster-layering'] as const) {
      assert.throws(() => pipelineDirectory(name, id, '/tmp/runs'), /--name/);
    }
  }
  for (const id of pipelineIds) {
    for (const name of ['', '.', '..', '../other', 'a/b', 'a\\b', 'a:b']) {
      assert.throws(() => pipelineDirectory(name, id, '/tmp/runs'));
    }
  }
});

test('生图服务的速率限制会重试，单次输入图片上限仍直接报错', async () => {
  const info = { rateLimitExceeded: { httpStatusCode: 429 } };
  for (const message of ['image_generation rate limit exceeded', 'Rate limit exceeded: maximum 10 images per minute']) {
    let attempts = 0;
    const waits: number[] = [];
    assert.equal(await new AgentRuntime(1, async ms => { waits.push(ms); }).run(async () => {
      if (++attempts === 1) throw new AgentCallError(message, info);
      return 'continued';
    }), 'continued');
    assert.deepEqual(waits, [5000]);
    assert.equal(attempts, 2);
  }
  for (const message of ['maximum of 50 images', 'Too many images: maximum 50 images per request',
    'Rate limit exceeded: maximum 50 images per request', 'input image count limit exceeded']) {
    assert.equal(retryableAgentError(new AgentCallError(message, info)), false, message);
  }
});

test('首次分组拒绝非字符串 subject，错误参数不能写坏 groups.json', async t => {
  for (const profile of [character, clothing]) {
    const f = await fixture(t);
    await recognizeInitialGroups({ ...f, profile }, { run: async task => {
      const write = task.tools!.find(tool => tool.name === 'write_groups')!;
      const signal = new AbortController().signal;
      const groups = [{ name: 'shape', groups: [], note: '独立实体' }];
      await assert.rejects(write.execute({ subject: ['other'], groups }, signal), /subject/);
      await assert.rejects(readFile(join(f.directory, 'groups.json')), { code: 'ENOENT' });
      await write.execute({ subject: 'other', groups }, signal);
      return { text: 'saved', images: [] };
    } });
    assert.equal(JSON.parse(await readFile(join(f.directory, 'groups.json'), 'utf8')).subject, 'other');
  }
});

test('两套 raster 的缺失输入提示各自指向对应的 part 管线', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pipeline-input-errors-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const empty = join(root, 'empty');
  await mkdir(empty);
  for (const [run, inputId] of [[runRaster, 'part-layering'], [runClothingRaster, 'clothing-part-layering']] as const) {
    const dependencies = { runsDirectory: join(root, 'runs'), preflight: async () => { throw new Error('preflight must not run'); } };
    await assert.rejects(run({ name: 'case' }, dependencies), error => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(` ${inputId} --name`));
      assert.ok(error.message.includes(join(dependencies.runsDirectory, 'case', inputId, 'occlusion.json')));
      assert.ok(error.message.includes('手动放置'));
      return true;
    });
  }
});

test('续跑时显式传空 Krita 路径仍报错，不静默沿用旧配置', async t => {
  const root = await mkdtemp(join(tmpdir(), 'krita-empty-override-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = { directory: join(root, 'source'), parts: join(root, 'source/parts') };
  await mkdir(input.parts, { recursive: true });
  const runsDirectory = join(root, 'runs');
  for (const [run, id] of [[runRaster, 'raster-layering'],
    [runClothingRaster, 'clothing-raster-layering']] as const) {
    await seedUpstream('saved', id === 'raster-layering' ? 'part-layering' : 'clothing-part-layering', runsDirectory);
    const directory = pipelineDirectory('saved', id, runsDirectory);
    await initializeRun(directory, newConfig('saved', input, { executable: process.execPath, version: 'fixture' }));
    for (const krita of ['', '   ']) {
      await assert.rejects(run({ name: 'saved', krita, dryRun: true }, { runsDirectory,
        preflight: async () => { throw new Error('preflight must not run'); },
      }), /首次运行必须提供 --krita/);
    }
  }
});

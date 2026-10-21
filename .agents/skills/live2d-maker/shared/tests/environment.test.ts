import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { loadWorkflowEnvironment, checkCodexCapabilities } from '../codex/environment.ts';
import { formatAgentError } from '../codex/diagnostics.ts';
import { runAgent } from '../raster/agent.ts';
import { runWorkflow } from '../raster/workflow.ts';
import { pipeline as character } from '../../raster-layering/run.ts';
import { pipeline as clothing } from '../../clothing-raster-layering/run.ts';
import { seedUpstream } from './upstream-fixture.ts';

async function fixture(t: { after(callback: () => Promise<unknown>): void }) {
  const root = await mkdtemp(join(tmpdir(), 'layering-env-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('默认继承 Codex 配置，.env 模型后缀是力度，shell 优先且不会改写进程环境', async t => {
  const root = await fixture(t);
  const baseline = loadWorkflowEnvironment({ CODEX_HOME: '/existing/codex' }, root);
  assert.deepEqual(baseline.codex.config, {});
  assert.equal(baseline.codex.env!.CODEX_HOME, '/existing/codex');
  assert.deepEqual(baseline.models.medium, { model: 'gpt-6.1-sol', effort: 'xhigh' });
  assert.equal(baseline.imageCompactThreshold, undefined);
  await writeFile(join(root, '.env'), 'layering_medium_model=gpt-6.1-sol-low\nlayering_high_model=gpt-6-astra-high\nlayering_codex_path=bin/codex\n');
  const settings = loadWorkflowEnvironment({ layering_medium_model: 'gpt-6.1-sol-medium' }, root);
  assert.deepEqual(settings.models.medium, { model: 'gpt-6.1-sol', effort: 'medium' });
  assert.deepEqual(settings.models.high, { model: 'gpt-6-astra', effort: 'high' });
  assert.equal(settings.codex.codexPathOverride, join(root, 'bin/codex'));
  assert.equal(process.env.layering_high_model, undefined);
});

test('主模型与生图分别鉴权；只填生图模型不启用，未补丁时明确失败', async t => {
  const root = await fixture(t);
  const onlyModel = loadWorkflowEnvironment({ layering_image_model: 'another-image-model' }, root);
  assert.equal(onlyModel.stepImages.part_simplify, 'codex-native');
  assert.deepEqual(onlyModel.imageApis, {});
  const settings = loadWorkflowEnvironment({ layering_custom_provider: 'true', layering_provider_base_url: 'https://chat.example/v1',
    layering_provider_api_key: 'chat-secret', layering_image_base_url: 'https://images.example/v1', layering_image_api_key: 'image-secret',
    layering_image_compact_threshold: '49' }, root);
  const provider = (settings.codex.config!.model_providers as any).layering_custom;
  assert.equal(provider.base_url, 'https://chat.example/v1');
  assert.equal(provider.env_key, 'layering_provider_api_key');
  assert.equal(settings.codex.env!.LAYERING_IMAGE_BASE_URL, undefined);
  assert.equal(settings.codex.env!.LAYERING_IMAGE_API_KEY, undefined);
  assert.equal(settings.stepImages.part_simplify, 'gpt-image-2.5-sunburst');
  assert.equal(settings.imageApis.openai!.baseUrl, 'https://images.example/v1');
  assert.equal(settings.imageApis.openai!.apiKey, 'image-secret');
  assert.equal(settings.codex.env!.LAYERING_IMAGE_COMPACT_THRESHOLD, '49');
  assert.ok(!JSON.stringify(settings.codex.config).includes('secret'));
  await assert.rejects(checkCodexCapabilities(settings), /需要补丁版 Codex/);
  assert.throws(() => loadWorkflowEnvironment({ layering_custom_provider: 'true' }, root), /需要填写/);
  assert.throws(() => loadWorkflowEnvironment({ layering_image_api_key: 'secret' }, root), /同时填写/);
  for (const invalid of ['0', '-1', '49.2', 'NaN']) assert.throws(() => loadWorkflowEnvironment({ layering_image_compact_threshold: invalid }, root), /正整数/);
  assert.throws(() => loadWorkflowEnvironment({ layering_medium_model: 'model-invalid-effort' }, root), /思考力度/);
});

test('图片压缩拒绝旧去图补丁，生图能力缓存不能绕过 v2 检查', { skip: process.platform === 'win32' }, async t => {
  const root = await fixture(t);
  const executable = join(root, 'codex-fixture');
  const capabilities = { version: 1, image_provider: true, image_provider_version: 2, image_compaction: true };
  const install = async (value: object) => {
    await writeFile(executable, `#!${process.execPath}\nconsole.log(${JSON.stringify(JSON.stringify(value))});\n`);
    await chmod(executable, 0o755);
  };
  await install(capabilities);
  const provider = loadWorkflowEnvironment({ layering_codex_path: executable,
    layering_image_base_url: 'https://images.example/v1', layering_image_api_key: 'fixture' }, root);
  await checkCodexCapabilities(provider, provider.codex, { image: true });
  const compact = loadWorkflowEnvironment({ layering_codex_path: executable, layering_image_compact_threshold: '49' }, root);
  await assert.rejects(checkCodexCapabilities(compact), /补丁能力检查/);
  await install({ ...capabilities, image_compaction_version: 2 });
  await checkCodexCapabilities(compact);
});

test('两套 raster 续跑读取当前环境模型，仍恢复原 threadId，缺产物诊断带最后消息', async t => {
  for (const pipeline of [character, clothing]) await t.test(pipeline.id, async t => {
    const root = await fixture(t); await seedUpstream('case', pipeline.inputPipeline, root);
    const environment = loadWorkflowEnvironment({ layering_high_model: 'gpt-6-astra-high' }, root);
    const directory = join(root, 'case', pipeline.id);
    const deps = { runsDirectory: root, steps: [pipeline.steps[0]], environment,
      preflight: async (executable: string) => ({ executable, version: 'fixture' }) };
    let failure: unknown;
    try {
      await runWorkflow(pipeline, { name: 'case', krita: process.execPath }, { ...deps, agent: async request => {
        assert.equal(request.model, 'gpt-6-astra'); assert.equal(request.effort, 'high');
        assert.ok(request.imageRoots?.includes(join(root, 'case')));
        await request.onEvent({ type: 'thread.started', thread_id: 'persistent-thread' });
        await request.onEvent({ type: 'item.completed', item: { type: 'agent_message', id: 'message', text: '当前没有 image_generation 工具，无法绘制。' } });
        return { status: 'completed', summary: '回合已结束' };
      } });
    } catch (error) { failure = error; }
    assert.ok(failure);
    assert.match(formatAgentError(failure), /缺少有效交付/);
    assert.match(formatAgentError(failure), /没有 image_generation 工具/);
    assert.match(formatAgentError(failure), /persistent-thread/);
    assert.match(await readFile(join(directory, 'step01/error.txt'), 'utf8'), /模型最后消息/);
    await assert.rejects(readFile(join(directory, 'step01/.completed')), { code: 'ENOENT' });
    const changed = loadWorkflowEnvironment({ layering_high_model: 'gpt-6.1-sol-low' }, root);
    await runWorkflow(pipeline, { name: 'case' }, { ...deps, environment: changed, agent: async request => {
      assert.equal(request.threadId, 'persistent-thread');
      assert.equal(request.model, 'gpt-6.1-sol'); assert.equal(request.effort, 'low');
      await request.onEvent({ type: 'thread.started', thread_id: 'persistent-thread' });
      for (const file of pipeline.steps[0].requiredFiles) await writeFile(join(directory, 'step01', file), 'fixture');
      return { status: 'completed', summary: '完成' };
    } });
    const config = JSON.parse(await readFile(join(directory, 'run.json'), 'utf8'));
    assert.equal(config.threadId, 'persistent-thread');
    assert.deepEqual(config.models.step01, { model: 'gpt-6.1-sol', effort: 'low' });
  });
});

test('raster 正常退出却只返回自然语言时报告原文，不变成晦涩 JSON 错误或重试', async () => {
  const client = { startThread() { return { async runStreamed() { return { events: (async function* () {
    yield { type: 'thread.started' as const, thread_id: 'diagnostic-thread' };
    yield { type: 'item.completed' as const, item: { type: 'agent_message' as const, id: 'm', text: '没有可用的 image_generation。' } };
    yield { type: 'turn.completed' as const, usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, cache_write_input_tokens: 0, reasoning_output_tokens: 0 } };
  })() }; } }; }, resumeThread() { throw new Error('unexpected'); } };
  await assert.rejects(runAgent({ prompt: 'test', directory: '/tmp', model: 'fixture', effort: 'xhigh', onEvent: async () => {} }, client), error => {
    assert.match(formatAgentError(error), /没有返回有效的步骤结果 JSON/);
    assert.match(formatAgentError(error), /没有可用的 image_generation/);
    assert.match(formatAgentError(error), /diagnostic-thread/); return true;
  });
});

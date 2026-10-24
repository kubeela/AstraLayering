import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { callbackEntry, ensureLitellmCallback, withCallback } from '../../patches/litellm/install.ts';
import { loadWorkflowEnvironment } from '../codex/environment.ts';

test('LiteLLM callbacks 只追加一项，保留已有回调、注释和其他设置', () => {
  assert.equal(withCallback('litellm_settings:\n  callbacks: [images_compat.proxy_handler] # keep\n  num_retries: 0\n'),
    `litellm_settings:\n  callbacks: [images_compat.proxy_handler, ${callbackEntry}] # keep\n  num_retries: 0\n`);
  assert.equal(withCallback('litellm_settings:\n  callbacks: []\n'), `litellm_settings:\n  callbacks: [${callbackEntry}]\n`);
  assert.equal(withCallback('litellm_settings:\n  callbacks:\n    - a.handler\n    # note\n    - "b.handler"\n  num_retries: 0\n'),
    `litellm_settings:\n  callbacks:\n    - a.handler\n    # note\n    - "b.handler"\n    - ${callbackEntry}\n  num_retries: 0\n`);
  assert.equal(withCallback('model_list: []\nlitellm_settings:\n  num_retries: 0\n'),
    `model_list: []\nlitellm_settings:\n  callbacks:\n    - ${callbackEntry}\n  num_retries: 0\n`);
  assert.equal(withCallback('model_list: []\n'), `model_list: []\nlitellm_settings:\n  callbacks:\n    - ${callbackEntry}\n`);
  for (const ready of [`litellm_settings:\n  callbacks: [a, '${callbackEntry}']\n`, `litellm_settings:\n  callbacks:\n  - ${callbackEntry}\n`]) {
    assert.equal(withCallback(ready), ready);
  }
  assert.throws(() => withCallback('litellm_settings:\n  callbacks: custom_callbacks\n'), /不是列表/);
});

test('layering_litellm_config 同步回调文件，已就绪时不写入，并保留配置权限', async t => {
  const root = await mkdtemp(join(tmpdir(), 'litellm-install-')); t.after(() => rm(root, { recursive: true, force: true }));
  const config = join(root, 'litellm.yaml');
  await writeFile(config, 'litellm_settings:\n  callbacks: [images_compat.proxy_handler]\n', { mode: 0o600 });
  assert.equal(loadWorkflowEnvironment({ layering_litellm_config: 'litellm.yaml' }, root).litellmConfig, config);
  assert.deepEqual(await ensureLitellmCallback(config), ['responses_compat.py', 'responses_error_events.py', config]);
  assert.match(await readFile(config, 'utf8'), /images_compat\.proxy_handler, responses_compat\.proxy_handler/);
  assert.equal((await stat(config)).mode & 0o777, 0o600);
  assert.equal(await readFile(join(root, 'responses_compat.py'), 'utf8'),
    await readFile(new URL('../../patches/litellm/responses_compat.py', import.meta.url), 'utf8'));
  assert.deepEqual(await ensureLitellmCallback(config), []);
  await assert.rejects(ensureLitellmCallback(join(root, 'missing.yaml')), /无法读取 layering_litellm_config/);
});

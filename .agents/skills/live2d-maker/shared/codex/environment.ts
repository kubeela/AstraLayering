import { readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import type { CodexOptions, ThreadOptions } from '@openai/codex-sdk';
import { workflowsDirectory } from '../paths.ts';

export type ModelTier = 'medium' | 'high';
export type ModelSelection = { model: string; effort: NonNullable<ThreadOptions['modelReasoningEffort']> };
export const defaultModels = {
  medium: { model: 'gpt-6.1-sol', effort: 'xhigh' },
  high: { model: 'gpt-6-astra', effort: 'xhigh' },
} as const satisfies Record<ModelTier, ModelSelection>;

export type WorkflowEnvironment = {
  models: Record<ModelTier, ModelSelection>;
  codex: CodexOptions;
  imageProvider?: { model: string };
  imageCompactThreshold?: number;
};

export function parseModel(value: string | undefined, fallback: ModelSelection, name: string): ModelSelection {
  if (!value?.trim()) return { ...fallback };
  const match = value.trim().match(/^(.+)-(none|minimal|low|medium|high|xhigh)$/);
  if (!match || /\s/.test(match[1])) throw new Error(`${name} 必须为 <模型 ID>-<思考力度>，例如 gpt-6-astra-xhigh。`);
  return { model: match[1], effort: match[2] as ModelSelection['effort'] };
}

// Never change process.env or ~/.codex. The captured environment belongs to this invocation.
// Shell variables override .env; relative configuration paths are based on live2d-maker.
export function loadWorkflowEnvironment(env: NodeJS.ProcessEnv = process.env, directory = workflowsDirectory): WorkflowEnvironment {
  let file: NodeJS.ProcessEnv = {};
  try { file = parseEnv(readFileSync(join(directory, '.env'), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('无法读取 live2d-maker/.env', { cause: error }); }
  const effective = Object.fromEntries(Object.entries({ ...file, ...env }).filter((entry): entry is [string, string] => entry[1] !== undefined));
  const get = (name: string) => effective[name]?.trim();
  const flag = get('layering_custom_provider');
  if (flag && !['true', 'false', '1', '0'].includes(flag)) throw new Error('layering_custom_provider 只能为 true 或 false。');
  const config: NonNullable<CodexOptions['config']> = {};
  if (flag === 'true' || flag === '1') {
    const baseUrl = get('layering_provider_base_url'), key = get('layering_provider_api_key');
    if (!baseUrl || !key) throw new Error('启用自定义 provider 需要填写 layering_provider_base_url 和 layering_provider_api_key。');
    validateApiUrl(baseUrl, 'layering_provider_base_url');
    config.model_provider = 'layering_custom';
    config.model_providers = { layering_custom: {
      name: 'Layering custom provider', base_url: baseUrl, env_key: 'layering_provider_api_key',
      wire_api: 'responses', requires_openai_auth: false,
    } };
  }
  const path = (value: string) => isAbsolute(value) ? value : resolve(directory, value);
  const home = get('layering_codex_home');
  if (home) effective.CODEX_HOME = path(home);
  const executable = get('layering_codex_path');
  const imageUrl = get('layering_image_base_url'), imageKey = get('layering_image_api_key');
  const imageModel = get('layering_image_model') || 'gpt-image-2.5-sunburst';
  if (imageUrl || imageKey) {
    if (!imageUrl || !imageKey) throw new Error('自定义生图需要同时填写 layering_image_base_url 和 layering_image_api_key。');
    validateApiUrl(imageUrl, 'layering_image_base_url');
    effective.LAYERING_IMAGE_BASE_URL = imageUrl;
    effective.LAYERING_IMAGE_API_KEY = imageKey;
    effective.LAYERING_IMAGE_MODEL = imageModel;
  }
  const limit = get('layering_image_compact_threshold');
  const threshold = limit ? Number(limit) : undefined;
  if (threshold !== undefined && (!/^\d+$/.test(limit!) || !Number.isSafeInteger(threshold) || threshold < 1)) {
    throw new Error('layering_image_compact_threshold 必须是正整数；留空表示不启用。');
  }
  if (threshold !== undefined) effective.LAYERING_IMAGE_COMPACT_THRESHOLD = String(threshold);
  return {
    models: {
      medium: parseModel(get('layering_medium_model'), defaultModels.medium, 'layering_medium_model'),
      high: parseModel(get('layering_high_model'), defaultModels.high, 'layering_high_model'),
    },
    codex: { env: effective, config, ...(executable ? { codexPathOverride: path(executable) } : {}) },
    ...(imageUrl ? { imageProvider: { model: imageModel } } : {}),
    ...(threshold === undefined ? {} : { imageCompactThreshold: threshold }),
  };
}

const checkedCapabilities = new Map<string, Promise<void>>();
export async function checkCodexCapabilities(settings: WorkflowEnvironment, options = settings.codex): Promise<void> {
  if (!settings.imageProvider && settings.imageCompactThreshold === undefined) return;
  const executable = options.codexPathOverride;
  const instruction = '请先执行 pnpm build:codex，并在 live2d-maker/.env 设置 layering_codex_path 指向生成的补丁版 Codex。';
  if (!executable) throw new Error(`自定义生图或按图片数 compact 需要补丁版 Codex。${instruction}`);
  let check = checkedCapabilities.get(executable);
  if (!check) {
    check = (async () => {
      try {
        const { stdout } = await promisify(execFile)(executable, ['debug', 'layering-capabilities'],
          { env: options.env, timeout: 10_000, maxBuffer: 64 * 1024 });
        const value = JSON.parse(stdout);
        if (value.version !== 1 || value.image_provider !== true || value.image_compaction !== true) throw new Error('unsupported');
      } catch { throw new Error(`配置的 Codex 未通过 Layering 补丁能力检查。${instruction}`); }
    })();
    checkedCapabilities.set(executable, check);
    void check.catch(() => checkedCapabilities.delete(executable));
  }
  await check;
}

export function validateApiUrl(value: string, name: string): void {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${name} 必须为完整的 HTTP(S) API 地址。`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) {
    throw new Error(`${name} 必须为不含凭据、查询参数或片段的 HTTP(S) API 地址。`);
  }
}

export function workflowCodexOptions(settings: WorkflowEnvironment, overrides: CodexOptions = {}): CodexOptions {
  return { ...settings.codex, ...overrides,
    env: { ...settings.codex.env, ...overrides.env },
    config: { ...settings.codex.config, ...overrides.config },
  };
}

import { join, dirname } from 'node:path';
import { defaultModels } from '../shared/codex/environment.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
import type { KritaInstallation } from '../shared/raster/krita.ts';
import type { ShadowInput } from './input.ts';
import type { ShadowMode } from '../shared/shadow.ts';
import { maskSteps, mapSteps, buildPrompt as basePrompt } from './steps.ts';

// Extending normal/depth must not invalidate accepted mask drawing fingerprints.
export const lightingStep = { id: 'step02', title: '光照调校与初始参数', ...defaultModels.medium,
  modelStep: 'shadow_lighting', prompt: new URL('./prompts/lighting.md', import.meta.url),
  requiredFiles: ['light.json', 'preview.png', 'report.md'],
} as const satisfies StepDefinition;
export const stepsFor = (mode: ShadowMode): readonly StepDefinition[] => mode === 'mask' ? maskSteps : [...mapSteps, lightingStep];
export async function buildPrompt(step: StepDefinition, input: ShadowInput, output: string, krita: KritaInstallation) {
  const prompt = await basePrompt(step, input, output, krita);
  return step.modelStep !== 'shadow_lighting' ? prompt : prompt + `\n本步只调整光照；只读贴图为 ${JSON.stringify(join(dirname(output), 'step01/normal.png'))} 和 ${JSON.stringify(join(dirname(output), 'step01/depth.png'))}。调用已注册 render_lighting 工具，每次返回原尺寸渲染与完整参数；选定后用 final=true 保存 light.json 与 preview.png，不手写这两个产物。\n`;
}

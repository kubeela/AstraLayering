import {renderPrompt, renderPromptFile} from '../shared/prompts/render.ts';
import {kritaEnvironmentPrompt} from '../shared/krita/environment.ts';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defaultModels } from '../shared/codex/environment.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
import type { KritaInstallation } from '../shared/raster/krita.ts';
import type { ShadowMode } from '../shared/shadow.ts';
import type { ShadowInput } from './input.ts';

export const maskSteps = [{ id: 'step01', title: '投影分析、阴影补全与原生裁切', ...defaultModels.medium,
  modelStep: 'shadow_mask', prompt: new URL('./prompts/mask.md', import.meta.url),
  requiredFiles: ['character-shadowed.kra', 'character-shadowed.png', 'shadows.json', 'face-review.png', 'report.md'],
}] as const satisfies readonly StepDefinition[];
export const mapSteps = [{ id: 'step01', title: '生成配准的整图法线与深度', ...defaultModels.medium,
  modelStep: 'shadow_maps', prompt: new URL('./prompts/normal-depth.md', import.meta.url),
  requiredFiles: ['normal.png', 'depth.png', 'report.md'],
}] as const satisfies readonly StepDefinition[];
export const stepsFor = (mode: ShadowMode): readonly StepDefinition[] => mode === 'mask' ? maskSteps : mapSteps;
export async function buildPrompt(step: StepDefinition, input: ShadowInput, output: string, krita: KritaInstallation): Promise<string> {
  const quote = (s: string) => "'" + s.replace(/'/g, "'\"'\"'") + "'";
  const inspection = step.modelStep === 'shadow_mask' ? renderPromptFile(new URL('../shared/prompts/shadow-inspection.md',import.meta.url), {
    reference_files:['inputs.json', 'production.md', 'skirt.png', 'hair.png'].map(p=>JSON.stringify(join(output,'references',p))).join('、'),
    inspection_command:[process.execPath,fileURLToPath(new URL('./inspect.ts',import.meta.url)),'--output',output,'--krita',krita.executable].map(quote).join(' '),
  }) : '';
  return renderPrompt(await readFile(step.prompt, 'utf8'), {
    krita_environment: await kritaEnvironmentPrompt(krita),
    runtime_context: renderPromptFile(new URL('../shared/prompts/shadow-runtime.md', import.meta.url), {
      pipeline_directory: JSON.stringify(dirname(output)),
      character_kra: JSON.stringify(input.characterKra),
      character_color: JSON.stringify(input.characterColor),
      simplified_character: JSON.stringify(input.simplifiedCharacter),
      structure_files: JSON.stringify(input.structureFiles),
      krita_executable: JSON.stringify(krita.executable),
      krita_version: krita.version,
      inspection_instructions: inspection,
      output_directory: JSON.stringify(output),
      required_files: JSON.stringify(step.requiredFiles.map(file => join(output, file)))
    })
  }, String(step.prompt), ['krita_environment','runtime_context']);
}

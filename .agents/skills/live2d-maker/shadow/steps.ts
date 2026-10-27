import {renderPrompt, renderPromptFile} from '../shared/prompts/render.ts';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { defaultModels } from '../shared/codex/environment.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
import type { ShadowMode } from '../shared/shadow.ts';
import type { ShadowInput } from './input.ts';
import { referencesDirectory } from '../shared/agents/inputs.ts';
import { agentPath } from '../shared/raster/run-store.ts';
import { taskRootOf } from '../shared/task-paths.ts';

export const maskSteps = [{ id: 'step01', title: '投影分析、阴影补全与原生裁切', ...defaultModels.medium,
  modelStep: 'shadow_mask', prompt: new URL('./prompts/mask.md', import.meta.url),
  requiredFiles: ['character-shadowed.kra', 'character-shadowed.png', 'shadows.json', 'face-review.png', 'report.md'],
  previewFiles: ['inspection/overview.png', 'inspection/relation-*-review.png'],
}] as const satisfies readonly StepDefinition[];
export const mapSteps = [{ id: 'step01', title: '生成配准的整图法线与深度', ...defaultModels.medium,
  modelStep: 'shadow_maps', prompt: new URL('./prompts/normal-depth.md', import.meta.url),
  requiredFiles: ['normal.png', 'depth.png', 'report.md'], krita: false,
}] as const satisfies readonly StepDefinition[];
export const stepsFor = (mode: ShadowMode): readonly StepDefinition[] => mode === 'mask' ? maskSteps : mapSteps;
export async function buildPrompt(step: StepDefinition, input: ShadowInput, output: string): Promise<string> {
  // Task paths are shown absolute under the task root.
  const root = taskRootOf(dirname(output)), at = (path: string) => agentPath(root, path), json = async (path: string) => JSON.stringify(await at(path));
  const inspection = step.modelStep === 'shadow_mask' ? renderPromptFile(new URL('../shared/prompts/shadow-inspection.md',import.meta.url), {
    reference_files:(await Promise.all(['inputs.json', 'production.md', 'skirt.png', 'hair.png'].map(p=>json(join(referencesDirectory(output),p))))).join('、'),
    inspection_receipt:await at(join(output,'inspection.json')), inspection_directory:await at(join(output,'inspection')),
  }) : '';
  return renderPrompt(await readFile(step.prompt, 'utf8'), {
    runtime_context: renderPromptFile(new URL('../shared/prompts/shadow-runtime.md', import.meta.url), {
      pipeline_directory: await json(dirname(output)),
      character_kra: await json(input.characterKra),
      character_color: await json(input.characterColor),
      simplified_character: await json(input.simplifiedCharacter),
      structure_files: JSON.stringify(await Promise.all(input.structureFiles.map(at))),
      inspection_instructions: inspection,
      output_directory: await json(output),
      required_files: JSON.stringify(await Promise.all(step.requiredFiles.map(file => at(join(output, file)))))
    })
  }, String(step.prompt), ['runtime_context']);
}

import {renderPrompt, renderPromptFile} from '../shared/prompts/render.ts';
import {kritaEnvironmentPrompt} from '../shared/krita/environment.ts';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { defaultModels } from '../shared/codex/environment.ts';
import type { KritaInstallation } from '../shared/raster/krita.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
import type { AssemblyInput } from './input.ts';
import { taskPath } from '../shared/raster/run-store.ts';
import { taskRootOf } from '../shared/task-paths.ts';

export const steps = [{
  id: 'step01', title: '人物与衣服 KRA 组装', ...defaultModels.high, modelStep: 'assembly',
  prompt: new URL('./prompts/01-人物与衣服组装.md', import.meta.url),
  requiredFiles: ['character-assembled.kra', 'character-assembled.png', 'report.md'],
  previewFiles: ['final-overall-comparison.jpg'],
}] as const satisfies readonly StepDefinition[];

export async function buildPrompt(step: StepDefinition, input: AssemblyInput, output: string, krita: KritaInstallation): Promise<string> {
  const root = taskRootOf(output), json = async (path: string) => JSON.stringify(await taskPath(root, path));
  return renderPrompt(await readFile(step.prompt, 'utf8'), {
    krita_environment: await kritaEnvironmentPrompt(krita),
    runtime_context: renderPromptFile(new URL('../shared/prompts/assembly-runtime.md', import.meta.url), {
      pipeline_directory: await json(dirname(output)),
      character_kra: await json(input.characterKra),
      clothing_kra: await json(input.clothingKra),
      simplified_character: await json(input.simplifiedCharacter),
      krita_executable: JSON.stringify(krita.executable),
      krita_version: krita.version,
      output_directory: await json(output),
      required_files: JSON.stringify(await Promise.all(step.requiredFiles.map(file => taskPath(root, join(output, file)))))
    })
  }, String(step.prompt), ['krita_environment','runtime_context']);
}

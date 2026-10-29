import type { PipelineId } from '../paths.ts';
import { isPartLayeringInput, resolvePartInput, type PartLayeringInput } from './input.ts';
import { buildPrompt, type StepDefinition } from './steps.ts';
import type { KritaPipeline } from './workflow.ts';
import { dirname, join } from 'node:path';
import { taskRootOf } from '../task-paths.ts';
import { createReviewAnnotationTool } from './review-annotation.ts';
import { createPixelTool } from './pixel-tool.ts';
import { createStructureTools, validateRasterStructure } from './structure-tools.ts';
import { readDressup } from '../part/dressup.ts';
import { copyDelivery } from './passthrough.ts';
import { partSteps } from '../step-paths.js';

type PartRasterDefinition = {
  id: Extract<PipelineId, 'raster-layering' | 'clothing-raster-layering'>;
  inputPipeline: Extract<PipelineId, 'part-layering' | 'clothing-part-layering'>;
  steps: readonly StepDefinition[];
};

// Keep part-specific prompts and occlusion editing out of downstream assembly.
export function partRasterPipeline<T extends PartRasterDefinition>(definition: T): T & KritaPipeline<PartLayeringInput> {
  return {
    ...definition,
    resolveInput: (name, root) => resolvePartInput(name, definition.inputPipeline, root),
    validateInput: isPartLayeringInput,
    inputDirectories: input => [input.directory],
    // occlusion is the last part step, so its stamp changes whenever the parts are redone.
    upstreamStep: input => ({ id: `${definition.inputPipeline}/${partSteps.occlusion}`, root: taskRootOf(input.directory), directory: join(input.directory, partSteps.occlusion), dependsOn: [] }),
    tools: (output, input, step, phase) => step.id === 'step01' && phase.startsWith('review-')
      ? [createReviewAnnotationTool(dirname(output), dirname(dirname(output)), join(output, 'review-evidence'))]
      : step.id === 'step01' && (phase === 'draw' || phase.startsWith('repair-'))
        ? createStructureTools(input)
      : step.id === 'step02' && phase === 'draw'
        ? [createPixelTool(dirname(output), dirname(dirname(output)), join(output, 'pixel-review'), {
          namespace: definition.id === 'raster-layering' ? 'character' : 'clothing',
        })] : [],
    deliveryWarnings: async (input, step) => {
      if (step.id !== 'step01') return [];
      try { await validateRasterStructure(input); return []; }
      catch (error) { return [error instanceof Error ? error.message : String(error)]; }
    },
    // Without a dress-up base body there is no bodysuit to remove: step03
    // delivers the soft-edged character as it is.
    passthrough: async (output, input, step) => {
      if (definition.id !== 'raster-layering' || step.id !== 'step03' || await readDressup(taskRootOf(input.directory)) !== false) return;
      const previous = join(dirname(output), 'step02');
      return copyDelivery(output, '素体换装沿用了简化参考，没有连体服需要去除', [
        [join(previous, 'character-soft-edges.kra'), 'character-dressup-base.kra'],
        [join(previous, 'character-soft-edges.png'), 'character-dressup-base.png'],
      ]);
    },
    buildPrompt,
  };
}

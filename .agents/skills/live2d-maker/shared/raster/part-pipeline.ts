import type { PipelineId } from '../paths.ts';
import { isPartLayeringInput, resolvePartInput, type PartLayeringInput } from './input.ts';
import { buildPrompt, type StepDefinition } from './steps.ts';
import type { KritaPipeline } from './workflow.ts';
import { dirname, join } from 'node:path';
import { createPixelTool } from './pixel-tool.ts';

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
    tools: (output, _input, step) => step.id === 'step01'
      ? [createPixelTool(dirname(output), dirname(dirname(output)), join(output, 'pixel-review'))] : [],
    buildPrompt,
  };
}

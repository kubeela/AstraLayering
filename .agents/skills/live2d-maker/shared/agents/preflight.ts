import { checkCodexCapabilities, type WorkflowEnvironment } from '../codex/environment.ts';
import type { PipelineId } from '../paths.ts';
import { imageModelProviders, stepDefaults, type AgentStep } from './models.ts';
import { requireMattingKrita } from '../matting/runtime.ts';
import { checkKrita } from '../raster/krita.ts';
import { cliExecutable } from './cli.ts';
import { validateImageSelection } from './images.ts';
import { usesPatchedImageTool } from './codex-images.ts';
import type { ImageProcessingOptions } from '../image-processing.ts';
import { access } from 'node:fs/promises';

export function pipelineAgentSteps(pipeline: PipelineId, standard = false, shadowMode: 'mask' | 'normal-depth' = 'mask'): AgentStep[] {
  return (Object.keys(stepDefaults) as AgentStep[]).filter(step => {
    if (pipeline === 'part-layering') return step.startsWith('part_') && (standard || !['part_pose_judgment', 'part_standardize'].includes(step));
    if (pipeline === 'clothing-part-layering') return step.startsWith('clothing_') && !step.startsWith('clothing_raster_');
    if (pipeline === 'raster-layering') return step.startsWith('raster_');
    if (pipeline === 'clothing-raster-layering') return step.startsWith('clothing_raster_');
    if (pipeline === 'physics') return step.startsWith('physics_');
    if (pipeline === 'shadow') return step === (shadowMode === 'mask' ? 'shadow_mask' : 'shadow_maps');
    return step === 'assembly';
  });
}
export async function preflightAgentSteps(settings: WorkflowEnvironment, steps: readonly AgentStep[], normalization: ImageProcessingOptions = {}): Promise<void> {
  if(steps.some(step=>step.startsWith('physics_')))try{await access(new URL('../../../../../web/studio/component-physics-model.js',import.meta.url));}catch{throw Error('组件物理需要同版本 AstraLayering 工作台代码；请从完整仓库（含 web/）执行，保留原 --dir。独立 skill 的其他管线不受影响。');}
  for (const step of steps) {
    validateImageSelection(settings, step);
    const harness = settings.stepModels[step].harness;
    if (harness !== 'codex') await cliExecutable(settings, harness);
    else await checkCodexCapabilities(settings, settings.codex, { image: usesPatchedImageTool(settings, step) });
  }
  if (steps.some(step => step !== 'shadow_maps' && settings.stepImages[step] && imageModelProviders[settings.stepImages[step]!] === 'google')) {
    await checkKrita(requireMattingKrita(normalization), undefined, normalization.env ?? settings.codex.env);
  }
}

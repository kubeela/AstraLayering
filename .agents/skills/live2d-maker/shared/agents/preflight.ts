import type { WorkflowEnvironment } from '../codex/environment.ts';
import type { PipelineId } from '../paths.ts';
import { stepDefaults, type AgentStep } from './models.ts';
import { cliExecutable } from './cli.ts';
import { validateImageSelection } from './images.ts';

export function pipelineAgentSteps(pipeline: PipelineId, standard = false): AgentStep[] {
  return (Object.keys(stepDefaults) as AgentStep[]).filter(step => {
    if (pipeline === 'part-layering') return step.startsWith('part_') && (standard || !['part_pose_judgment', 'part_standardize'].includes(step));
    if (pipeline === 'clothing-part-layering') return step.startsWith('clothing_') && !step.startsWith('clothing_raster_');
    if (pipeline === 'raster-layering') return step.startsWith('raster_');
    if (pipeline === 'clothing-raster-layering') return step.startsWith('clothing_raster_');
    return step === 'assembly';
  });
}
export async function preflightAgentSteps(settings: WorkflowEnvironment, steps: readonly AgentStep[]): Promise<void> {
  for (const step of steps) {
    validateImageSelection(settings, step);
    const harness = settings.stepModels[step].harness;
    if (harness !== 'codex') await cliExecutable(settings, harness);
  }
}

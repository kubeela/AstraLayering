import { defaultModels } from '../shared/codex/environment.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
export type { StepDefinition } from '../shared/raster/steps.ts';
export { buildPrompt } from '../shared/raster/steps.ts';

export const stepModels = {
  1: defaultModels.high,
  2: defaultModels.high,
} as const;

export const steps = [{
  id: 'step01', title: '衣服分件、补全与 Krita 拼装', ...defaultModels.high, modelStep: 'clothing_raster_step01',
  prompt: new URL('./prompts/01-衣服分层与补全.md', import.meta.url),
  requiredFiles: ['clothing-depth.kra', 'report.md'],
  review: {
    ...defaultModels.high, modelStep: 'clothing_raster_step01_review', repairModelStep: 'clothing_raster_step01_repair',
    prompt: new URL('./prompts/01-review.md', import.meta.url),
    repairPrompt: new URL('./prompts/01-repair.md', import.meta.url),
  },
}, {
  id: 'step02', title: '衣服边缘与衔接修画', ...defaultModels.high, modelStep: 'clothing_raster_step02',
  prompt: new URL('./prompts/02-边缘柔化.md', import.meta.url),
  inputFiles: ['step01/clothing-depth.kra', 'step01/report.md'],
  requiredFiles: ['clothing-soft-edges.kra', 'report.md'],
}] as const satisfies readonly StepDefinition[];

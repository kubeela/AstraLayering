import { defaultModels } from '../shared/codex/environment.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
export type { StepDefinition } from '../shared/raster/steps.ts';
export { buildPrompt } from '../shared/raster/steps.ts';

export const stepModels = {
  1: defaultModels.high,
  2: defaultModels.medium,
  3: defaultModels.medium,
} as const;

export const steps = [{
  id: 'step01',
  title: '分层、补全与 Krita 交付',
  ...stepModels[1], modelStep: 'raster_step01',
  prompt: new URL('./prompts/01-分层与补全.md', import.meta.url),
  requiredFiles: ['character-depth.kra', 'report.md'],
  review: {
    prompt: new URL('./prompts/01-review.md', import.meta.url),
    repairPrompt: new URL('./prompts/01-repair.md', import.meta.url),
    ...defaultModels.high, modelStep: 'raster_step01_review', repairModelStep: 'raster_step01_repair',
  },
}, {
  id: 'step02',
  title: '边缘柔化与去锯齿',
  ...stepModels[2], modelStep: 'raster_step02',
  prompt: new URL('./prompts/02-边缘柔化与去锯齿.md', import.meta.url),
  inputFiles: ['step01/character-depth.kra', 'step01/report.md'],
  requiredFiles: ['character-soft-edges.kra', 'character-soft-edges.png', 'report.md'],
}, {
  id: 'step03',
  title: '去除连体服与补全身体底层',
  ...stepModels[3], modelStep: 'raster_step03',
  prompt: new URL('./prompts/03-去除连体服.md', import.meta.url),
  inputFiles: ['step02/character-soft-edges.kra', 'step02/report.md'],
  requiredFiles: ['character-dressup-base.kra', 'character-dressup-base.png', 'report.md'],
}] as const satisfies readonly StepDefinition[];

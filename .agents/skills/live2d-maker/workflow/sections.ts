import { runWorkflow as shadow } from '../shadow/run.ts';
import { shadowMode } from '../shared/shadow.ts';
import { join } from 'node:path';
import { shadowStep } from '../shared/step-paths.js';
import { toTaskPath } from '../shared/task-paths.ts';
import { runPartLayering } from '../part-layering/run.ts';
import { runClothingPartLayering } from '../clothing-part-layering/run.ts';
import { formatLayeringSummary } from '../shared/part/run.ts';
import { runWorkflow as characterRaster } from '../raster-layering/run.ts';
import { runWorkflow as clothingRaster } from '../clothing-raster-layering/run.ts';
import { runWorkflow as assemble } from '../character-assembly/run.ts';
import type { SectionId } from '../shared/paths.ts';
import type { TaskRun } from './state.ts';

// output is the delivered file relative to the task root.
export type SectionResult = { summary: string; output?: string };
// prepared(): part-layering has its references; the clothing lane may start.
export async function executeSection(id: SectionId, run: TaskRun, progress: (message: string) => void,
  events: { prepared?(): void } = {}): Promise<SectionResult> {
  if (id === 'shadow') {
    const mode = shadowMode(run.shadowMode);
    const summary = await shadow({ name: run.name, dir: run.dir, krita: run.krita, shadowMode: mode, progress });
    return { summary, output: `shadow/${shadowStep(mode)}/${mode === 'mask' ? 'character-shadowed.kra' : 'normal.png'}` };
  }
  if (id === 'part-layering' || id === 'clothing-part-layering') {
    const execute = id === 'part-layering' ? runPartLayering : runClothingPartLayering;
    const result = await execute({
      reference: { runName: run.name, dir: run.dir, ...(id === 'part-layering' ? { image: run.image, standard: run.standard } : {}) },
      groups: null,
    }, { prepared: events.prepared }, { agentConcurrency: run.jobs, progress });
    if (result.layering.status !== 'completed') {
      throw new Error('管线尚未完成：' + id + '\n' + formatLayeringSummary(result.layering.groups).join('\n')
        + '\n进度目录：' + join(run.dir, run.name, id));
    }
    return { summary: id + ' 已完成', output: result.layering.output && toTaskPath(join(run.dir, run.name), result.layering.output) };
  }
  const execute = id === 'raster-layering' ? characterRaster : id === 'clothing-raster-layering' ? clothingRaster : assemble;
  const summary = await execute({ name: run.name, dir: run.dir, krita: run.krita, progress });
  const output = id === 'raster-layering' ? 'step03/character-dressup-base.kra'
    : id === 'clothing-raster-layering' ? 'step02/clothing-soft-edges.kra' : 'step01/character-assembled.kra';
  return { summary, output: `${id}/${output}` };
}

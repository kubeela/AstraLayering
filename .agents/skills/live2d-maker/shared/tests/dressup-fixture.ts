import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dressupDecisionPath } from '../part/dressup.ts';
import { stageStep } from '../part/preparation-steps.ts';

// Marks the base-subject step completed, with a dress-up decision unless omitted (an older run).
export async function markBaseStep(task: string, dressed?: boolean) {
  const step = join(task, 'part-layering', 'preparation', stageStep('base'));
  await mkdir(step, { recursive: true });
  await writeFile(join(step, '.completed'), JSON.stringify({ stamp: 'fixture', inputs: {} }));
  if (dressed !== undefined) await writeFile(dressupDecisionPath(task), JSON.stringify({ version: 1, dressed, reason: 'fixture' }));
}

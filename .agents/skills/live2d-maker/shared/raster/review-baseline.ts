import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileInfo } from './run-store.ts';
import type { StepDefinition } from './steps.ts';

// Migration from the previous step02-review layout: its drawing turn had
// succeeded and published the staged report, but the removed review was stopped.
export async function legacyEdgeDrawingReady(output: string, step: StepDefinition): Promise<boolean> {
  if (step.id !== 'step02' || step.review || !await fileInfo(join(output, 'report.md'))) return false;
  const records = await fileInfo(join(output, 'result.json')) ? output : join(output, '../agents/steps/step02');
  if (!await fileInfo(join(records, 'result.json')) || !await fileInfo(join(records, 'prompt.md'))) return false;
  const result = JSON.parse(await readFile(join(records, 'result.json'), 'utf8'));
  return result.status === 'completed' && (await readFile(join(records, 'prompt.md'), 'utf8')).includes('step02/report.md.tmp');
}

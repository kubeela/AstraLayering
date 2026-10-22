import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileInfo, type RunPlan } from './run-store.ts';
import type { StepDefinition } from './steps.ts';

const baselineFile = 'review-baseline.json';
async function artwork(directory: string, step: StepDefinition) {
  const files: Record<string, string> = {};
  for (const file of step.requiredFiles.filter(file => /\.(kra|png)$/i.test(file))) {
    files[file] = createHash('sha256').update(await readFile(join(directory, file))).digest('hex');
  }
  return files;
}

export async function beginReview(directory: string, step: StepDefinition) {
  if (!await fileInfo(join(directory, baselineFile))) {
    const text = JSON.stringify(await artwork(directory, step));
    await writeFile(join(directory, baselineFile + '.tmp'), text + '\n');
    await rename(join(directory, baselineFile + '.tmp'), join(directory, baselineFile));
  }
}

export async function finishReview(directory: string, step: StepDefinition, plan: RunPlan, progress?: (message: string) => void) {
  const output = join(directory, step.id);
  const before = JSON.parse(await readFile(join(output, baselineFile), 'utf8'));
  if (JSON.stringify(before) !== JSON.stringify(await artwork(output, step))) {
    const descendants = [...plan.statuses].reverse().filter(([id, status]) => id > step.id && status !== 'absent');
    if (descendants.length) {
      const archive = join(directory, 'recovery', `${step.id}-review-${randomUUID()}`);
      await mkdir(archive, { recursive: true });
      await writeFile(join(archive, 'reason.json'), JSON.stringify({ reason: '上游步骤 review 修复后工程变化', step: step.id,
        archivedSteps: descendants.map(([id]) => id), at: new Date().toISOString() }) + '\n');
      // Move the furthest descendants first. A restart retains the baseline and
      // continues invalidation without losing the active drawing session.
      for (const [id] of descendants) {
        await rename(join(directory, id), join(archive, id));
        plan.statuses.set(id, 'absent');
      }
      progress?.(`${step.id} 工程已修正；后续旧成果保留到 ${archive}，从修正后的工程继续。`);
    }
  }
  await rm(join(output, baselineFile), { force: true });
}

// Migration from the previous step02-review layout: its drawing turn had
// succeeded and published the staged report, but the removed review was stopped.
export async function legacyEdgeDrawingReady(output: string, step: StepDefinition): Promise<boolean> {
  if (step.id !== 'step02' || step.review || !await fileInfo(join(output, 'report.md'))) return false;
  if (!await fileInfo(join(output, 'result.json')) || !await fileInfo(join(output, 'prompt.md'))) return false;
  const result = JSON.parse(await readFile(join(output, 'result.json'), 'utf8'));
  return result.status === 'completed' && (await readFile(join(output, 'prompt.md'), 'utf8')).includes('step02/report.md.tmp');
}

import { parseArgs } from 'node:util';
import { directoryFor, acquireTaskLock, taskStatus } from '../workflow/state.ts';
import { applyWorkspaceMigration, planWorkspaceMigration } from '../shared/workspace-migration.ts';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makePipeline } from '../shadow/run.ts';

const { values } = parseArgs({ options: { name: { type: 'string' }, dir: { type: 'string' }, apply: { type: 'boolean' } } });
if (!values.name) throw new Error('需要 --name；默认仅预览，加 --apply 执行迁移。');
const options = { name: values.name, dir: values.dir }, directory = directoryFor(options);
const status = await taskStatus(options);
if (status.status !== 'completed' || status.runnerAlive) throw new Error('仅迁移已完成且没有运行进程的任务。');
const release = await acquireTaskLock(directory);
try {
  const plan = await planWorkspaceMigration(directory);
  if (values.apply) {
    await applyWorkspaceMigration(directory, plan);
    // The shadow setup fingerprint includes preparation code. This migration
    // changes its paths, while retaining the validated artwork and inputs.
    for (const mode of ['mask', 'normal-depth'] as const) {
      const path = join(directory, 'shadow', mode, 'run.json');
      let config: any;
      try { config = JSON.parse(await readFile(path, 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
      config.inputFingerprint = await makePipeline(mode).fingerprintInput!(config.sourceInput);
      await writeFile(path, JSON.stringify(config, null, 2) + '\n');
    }
  }
  console.log(JSON.stringify({ applied: !!values.apply, files: plan.length, plan }, null, 2));
} finally { await release(); }

import { readRun, pipelineId } from './state.ts';
import { executePipeline } from './pipelines.ts';
import { formatAgentError } from '../shared/codex/diagnostics.ts';
import { GroupExecutionError } from '../shared/part/layering.ts';
import { formatLayeringSummary } from '../shared/part/run.ts';
import { shareAgentSlots } from '../shared/codex/agent-runtime.ts';
import { agentSlotsVariable, ipcAgentSlots } from './agent-slots.ts';
import { releaseAllSectionKrita } from '../shared/krita/section-krita.ts';

// An orphan must not continue drawing after its supervisor has exited.
process.on('disconnect', () => {
  if (process.platform !== 'win32') process.kill(-process.pid, 'SIGTERM');
  else process.exit(1);
});

// A stop signals the whole process group; close the sections' Krita
// normally first so their profiles and records do not stay behind.
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => {
  void releaseAllSectionKrita().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143));
});

try {
  const [directory, name, requested, execution] = process.argv.slice(2);
  const run = await readRun(directory, name);
  if (!run || run.runner?.id !== execution) throw new Error('总控执行记录已改变，拒绝启动过期子进程。');
  // Agents of all concurrent pipelines share the scheduler's slots.
  if (process.send && process.env[agentSlotsVariable] === 'ipc') shareAgentSlots(ipcAgentSlots(process));
  const result = await executePipeline(pipelineId(requested), run, message => console.log(message),
    { prepared: () => process.send?.({ type: 'prepared' }) });
  process.send?.({ type: 'result', result });
} catch (error) {
  let message = formatAgentError(error);
  if (error instanceof GroupExecutionError) message += '\n' + formatLayeringSummary(error.groups).join('\n');
  console.error(message);
  process.send?.({ type: 'failure', message });
  process.exitCode = 1;
} finally {
  // Some library resources may keep the event loop alive after a logical result.
  // End the worker only after its IPC result has been flushed.
  process.removeAllListeners('disconnect');
  if (process.connected) process.disconnect();
}

import { realpath } from 'node:fs/promises';
import { toolDefinition } from '../codex/tool-config.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import { fromTaskPath } from '../task-paths.ts';
import { bridgeSubmitScript, type SectionKrita } from './section-krita.ts';
import { BridgeError, submitJob } from './bridge/client.mjs';

// The agent's handle on its section's Krita: status, lazy start, restart after
// a crash, and running scripts. The section releases the Krita afterwards.
export function createKritaTool(krita: SectionKrita, taskRoot: string): FunctionTool {
  const definition = toolDefinition('krita');
  const status = () => ({ ...krita.status(), submit: bridgeSubmitScript });
  return {
    ...definition,
    async execute(value, signal, context) {
      const args = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
      const action = args.action ?? 'status';
      if (action === 'status') return textResult(status());
      if (action === 'start') { await krita.start(signal); return textResult(status()); }
      if (action === 'restart') { await krita.restart(signal); return textResult(status()); }
      if (action !== 'run') throw new Error('action 须为 status、start、restart 或 run');
      if (typeof args.script !== 'string' || !args.script.trim()) throw new Error('run 需要 script（Python 文件路径）');
      const timeout = args.timeout_seconds ?? 600;
      if (typeof timeout !== 'number' || !Number.isSafeInteger(timeout) || timeout < 1 || timeout > 3600) throw new Error('timeout_seconds 须为 1 至 3600 的整数');
      const script = await realpath(fromTaskPath(context?.root ?? taskRoot, args.script));
      await krita.start(signal);
      try {
        const result = await submitJob(krita.bridge!, script, { timeoutSeconds: timeout, signal });
        return { ...textResult(result), success: !!result.ok };
      } catch (error) {
        if (!(error instanceof BridgeError)) throw error;
        throw new Error(`${(error as Error).message}\n${JSON.stringify(status())}`);
      }
    },
  };
}

import { resolveRunsDirectory } from '../paths.ts';
import { checkKrita } from './krita.ts';
import { loadWorkflowEnvironment } from '../codex/environment.ts';
import { runWorkflow, type KritaPipeline } from './workflow.ts';
import { parseArgs } from 'node:util';

export function parseRunArguments(args: string[]) {
  const { values } = parseArgs({ args, options: {
    name: { type: 'string' }, dir: { type: 'string' }, krita: { type: 'string' },
    'dry-run': { type: 'boolean' }, 'check-krita': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  } });
  if (!values.help) {
    if (values['check-krita'] && !values.krita?.trim()) throw new Error('必须提供 --krita <已安装的 Krita 可执行文件路径>。');
    if (!values['check-krita'] && !values.name?.trim()) throw new Error('必须提供 --name <任务名>。');
  }
  if (values.dir !== undefined) resolveRunsDirectory(values.dir);
  return values;
}

export async function runCli<Input>(pipeline: KritaPipeline<Input>, help: string): Promise<void> {
  const args = parseRunArguments(process.argv.slice(2));
  if (args.help) { console.log(help); return; }
  if (args['check-krita']) {
    console.log(JSON.stringify(await checkKrita(args.krita!, undefined, loadWorkflowEnvironment().codex.env), null, 2));
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort(new Error('运行已中断；使用同一 --name 和运行根目录（--dir）继续原会话。'));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    console.log(await runWorkflow(pipeline, {
      name: args.name!, dir: args.dir, krita: args.krita,
      dryRun: args['dry-run'], signal: controller.signal, progress: message => console.log(message),
    }));
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkKrita } from './krita.ts';
import { runWorkflow } from './workflow.ts';

export const help = `raster-layering — 按顺序执行 Krita 栅格分层流程

首次运行：pnpm start --input <part-layering运行目录> --output <交付目录> --krita <可执行文件路径>
继续运行：pnpm start --output <原交付目录> --krita <可执行文件路径> --resume
只查安装：pnpm start --krita <可执行文件路径> --check-krita
查看提示词：首次运行参数后加 --dry-run（检查路径和 Krita，不调用模型、不写文件）

--krita 必须显式提供；不会自动下载、安装或搜索 Krita。
--input 通常传 .run/test，自动使用其 parts/；直接传 .run/test/parts 也可以。
第一步：gpt-6-astra / xhigh。第二、三步尚待提示词定义。
`;

export function parseRunArguments(args: string[]) {
  const { values } = parseArgs({ args, options: {
    input: { type: 'string' }, output: { type: 'string' }, krita: { type: 'string' },
    resume: { type: 'boolean' }, 'dry-run': { type: 'boolean' }, 'check-krita': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  } });
  if (!values.help) {
    if (!values.krita?.trim()) throw new Error('必须提供 --krita <已安装的 Krita 可执行文件路径>。');
    if (!values['check-krita']) {
      if (!values.output?.trim()) throw new Error('必须提供 --output <交付目录>。');
      if (!values.resume && !values.input?.trim()) throw new Error('首次运行必须提供 --input <part-layering运行目录>。');
    }
  }
  return values;
}

async function main(): Promise<void> {
  const args = parseRunArguments(process.argv.slice(2));
  if (args.help) { console.log(help); return; }
  if (args['check-krita']) {
    console.log(JSON.stringify(await checkKrita(args.krita!), null, 2));
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort(new Error('运行已中断；使用同一 --output 和 --resume 继续。'));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    console.log(await runWorkflow({
      input: args.input, output: args.output!, krita: args.krita!, resume: args.resume,
      dryRun: args['dry-run'], signal: controller.signal, progress: message => console.log(message),
    }));
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

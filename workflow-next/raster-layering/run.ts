import { runCli } from '../shared/raster/cli.ts';
import { runWorkflow as runSharedWorkflow, type WorkflowOptions, type Dependencies } from '../shared/raster/workflow.ts';
import { steps } from './steps.ts';
export { parseRunArguments } from '../shared/raster/cli.ts';

export const help = `raster-layering — 按顺序执行 Krita 栅格分层流程

首次运行：pnpm start --name <任务名> --input <part-layering运行目录> --krita <可执行文件路径>
继续运行：pnpm start --name <任务名>
只查安装：pnpm start --krita <可执行文件路径> --check-krita
查看提示词：首次运行参数后加 --dry-run（检查路径和 Krita，不调用模型、不写文件）

任务固定保存到 workflow-next/.run/<任务名>/raster-layering/，不受启动时的工作目录影响。
--krita 首次必须显式提供，后续读取记录，也可显式更新；不会自动下载、安装或搜索 Krita。
--input 可传同任务下的 part-layering，自动使用其 parts/。相对输入路径均以 workflow-next/.run/<name>/ 为基准，也支持绝对路径。
首次保存输入副本；run.json 保存配置和共用 threadId，步骤状态由 .running / .completed 决定。
中断保留 .running 并继续原 thread；删除某步 .completed 后，下次启动清空该步及后续目录，开启新 thread。
第一步分层与补全、第二步边缘柔化均使用 gpt-6-astra / xhigh；第三步去除连体服使用 gpt-6.1-sol / xhigh。
第二步 reviewer 使用 gpt-6-astra / xhigh，每次新会话；反馈由原 thread 全部修完。最多检查两次，无问题即结束，第二次修完不再检查。
第二步完成 review / 修复后，第三步沿用绘制 thread，交付 character-dressup-base.kra、同名 PNG 和 report.md，不设 reviewer。
`;

export const pipeline = { id: 'raster-layering', inputPipeline: 'part-layering', steps } as const;

export function runWorkflow(options: WorkflowOptions, dependencies: Dependencies = {}) {
  return runSharedWorkflow(pipeline, options, dependencies);
}

if (import.meta.main) {
  runCli(pipeline, help).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

import { formatAgentError } from '../shared/codex/diagnostics.ts';
import { runCli } from '../shared/raster/cli.ts';
import { runWorkflow as runSharedWorkflow, type WorkflowOptions, type Dependencies } from '../shared/raster/workflow.ts';
import { steps } from './steps.ts';
export { parseRunArguments } from '../shared/raster/cli.ts';

export const help = `clothing-raster-layering — 按顺序执行 Krita 栅格分层流程

首次运行：pnpm start --name <任务名> --krita <可执行文件路径>
继续运行：pnpm start --name <任务名>
只查安装：pnpm start --krita <可执行文件路径> --check-krita
查看提示词：首次运行参数后加 --dry-run（检查路径和 Krita，不调用模型、不写文件）

任务固定保存到 workflow-next/.run/<任务名>/clothing-raster-layering/，不受启动时的工作目录影响。
--krita 首次必须显式提供，后续读取记录，也可显式更新；不会自动下载、安装或搜索 Krita。
按 --name 直接读取同名 clothing-part-layering/ 的 parts、参考、groups.json 与 occlusion.json，无需指定输入路径。缺少产物时提示上游命令与手动放置路径。
不复制上游输入；run.json 保存配置和共用 threadId，步骤状态由 .running / .completed 决定。
中断保留 .running 并继续原 thread；删除某步 .completed 后，下次启动清空该步及后续目录，开启新 thread；上游 occlusion.json 的修正保留。
两步绘制及 reviewer 使用 gpt-6-astra / xhigh。provider、鉴权和内置 image_generation 由外部 Codex 配置，脚本不接管。
第二步 reviewer 使用 gpt-6-astra / xhigh，每次新会话；反馈由原 thread 全部修完。最多检查两次，无问题即结束，第二次修完不再检查。
第二步完成 review / 修复后结束，交付 step02/clothing-soft-edges.kra 和验收记录，不制作身体装配或身体插层说明。
`;

export const pipeline = { id: 'clothing-raster-layering', inputPipeline: 'clothing-part-layering', steps } as const;

export function runWorkflow(options: WorkflowOptions, dependencies: Dependencies = {}) {
  return runSharedWorkflow(pipeline, options, dependencies);
}

if (import.meta.main) {
  runCli(pipeline, help).catch(error => {
    console.error(formatAgentError(error));
    process.exitCode = 1;
  });
}

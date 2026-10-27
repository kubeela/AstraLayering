import { formatAgentError } from '../shared/codex/diagnostics.ts';
import { runCli } from '../shared/raster/cli.ts';
import { runWorkflow as runSharedWorkflow, type WorkflowOptions, type Dependencies } from '../shared/raster/workflow.ts';
import { steps } from './steps.ts';
import { partRasterPipeline } from '../shared/raster/part-pipeline.ts';
export { parseRunArguments } from '../shared/raster/cli.ts';

export const help = `raster-layering — 按顺序执行 Krita 栅格分层流程

首次运行：pnpm raster-layering --name <任务名> --krita <可执行文件路径>
继续运行：pnpm raster-layering --name <任务名>
只查安装：pnpm raster-layering --krita <可执行文件路径> --check-krita
查看提示词：首次运行参数后加 --dry-run（检查路径和 Krita，不调用模型、不写文件）

默认任务保存到 <skill上一级>/<任务名>/raster-layering/，不受启动工作目录影响。
--dir <绝对路径> 可指定运行根目录，任务保存到 <dir>/<任务名>/raster-layering/；后续管线与续跑使用相同 --dir。
--krita 首次必须显式提供，后续读取记录，也可显式更新；不会自动下载、安装或搜索 Krita。
按 --name 直接读取同名 part-layering/ 的 parts、参考、groups.json 与 occlusion.json，无需指定输入路径。缺少产物时提示上游命令与手动放置路径。
不复制上游输入；run.json 保存配置，各步 thread 记在 agents/steps/<stepNN>/session.json，步骤状态由 .running / .completed 决定。
中断保留 .running 并继续原 thread；删除某步 .completed 后，下次启动清空该步及后续目录，开启新 thread；上游 occlusion.json 的修正保留。
step01 依赖上游 part 的最后一步 occlusion：part 重做后 step01 及后续重跑、开启新 thread；上游该步未完成时拒绝运行。
第一步分层与补全、第二步边缘柔化均使用 gpt-6-astra / xhigh；第三步去除连体服使用 gpt-6.1-sol / xhigh。
第一步 reviewer 使用 gpt-6-astra / xhigh，每次新会话；反馈由原 thread 全部修完。最多检查两次，无问题即结束，第二次修完不再检查。
第一步完成 review / 修复、第二步边缘精修后，第三步沿用绘制 thread，交付 character-dressup-base.kra、同名 PNG 和 report.md，不设 reviewer。
`;

export const pipeline = partRasterPipeline({ id: 'raster-layering', inputPipeline: 'part-layering', steps });

export function runWorkflow(options: WorkflowOptions, dependencies: Dependencies = {}) {
  return runSharedWorkflow(pipeline, options, dependencies);
}

if (import.meta.main) {
  runCli(pipeline, help).catch(error => {
    console.error(formatAgentError(error));
    process.exitCode = 1;
  });
}

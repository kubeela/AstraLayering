import type { ModelSelection, ModelTier } from '../codex/environment.ts';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PartLayeringInput } from './input.ts';
import type { KritaInstallation } from './krita.ts';

export type StepDefinition = {
  id: string;
  title: string;
  model: string;
  effort: ModelSelection['effort'];
  modelTier?: ModelTier;
  prompt: URL;
  inputFiles?: readonly string[]; // Relative to the named run root; previous deliveries are read-only.
  requiredFiles: readonly string[];
  review?: { prompt: URL; repairPrompt: URL; model: string; effort: ModelSelection['effort']; modelTier?: ModelTier };
};

export async function buildPrompt(step: StepDefinition, input: PartLayeringInput, output: string, krita: KritaInstallation, previous: readonly string[] = []): Promise<string> {
  // The final report also checkpoints the initial drawing before review begins.
  // Publish it only after the agent turn and all delivery checks have succeeded.
  const report = step.review ? 'report.md.tmp' : 'report.md';
  const body = (await readFile(step.prompt, 'utf8')).replaceAll(`${step.id}/report.md`, `${step.id}/${report}`);
  const requiredFiles = step.requiredFiles.map(file => file === 'report.md' ? report : file);
  return `${body}\n---\n本次运行信息（上方为完整步骤提示词）：
- 本管线目录：${JSON.stringify(dirname(output))}。正文中的步骤目录相对此目录；../part-layering/ 或 ../clothing-part-layering/ 指同名任务的上游管线。
- 本步输入文件（绝对路径，只读）：${JSON.stringify((step.inputFiles ?? []).map(file => join(dirname(output), file)))}。
- 上游产物目录：${JSON.stringify(input.directory)}。直接读取，不建立输入副本。${step.id === 'step01' ? '本步可通过配套工具精准修正此目录的 occlusion.json；修正写回上游，主动重跑也保留。' : '本步只读使用上游产物与已修正的深度表。'}
- 主要产物路径：${JSON.stringify(input.parts)}。以这里已完成的分层 part 作为部件形状与补全标准；保留输入文件。
- 参考图目录：${JSON.stringify(join(input.directory, 'references'))}。读取上游 groups.json、occlusion.json；parts/ 是主要部件产物，单深度用 level，多深度按 levels 的区域说明与实际拼层核对。${input.originalCharacter ? `原穿衣角色辅助参考：${JSON.stringify(input.originalCharacter)}。` : ''}
- 输出目录：${JSON.stringify(output)}。已有合格成果应继续使用；中间文件、每件生成记录和最终交付均放在这里。
- 前序已完成步骤：${JSON.stringify(previous.map(directory => ({ directory, report: join(directory, 'report.md') })))}。需要时读取这些交付和报告，不修改前序成果；即使本次是新会话，也从这些文件接续任务。
- Krita 已检查：${JSON.stringify(krita.executable)}，版本 ${krita.version}；沿用当前显示环境。
- 本步必须交付（绝对路径）：${JSON.stringify(requiredFiles.map(file => join(output, file)))}。按本步正文逐层验收、重开核对，并将修改、偏差和未解决问题写入 ${JSON.stringify(join(output, report))}。${step.review ? '报告先写暂存文件，调度器检查通过后发布为 report.md；不要自行写入正式报告或 review / repair 报告。' : ''}
- run.json、各步的 .running / .completed 及 prompt.md、attempts.jsonl、events.jsonl、result.json、error.txt 由调度器维护，不要改写它们；不要自行推进后续步骤。
- 最后按输出 schema 返回 status 和 summary。只有完成上述交付与验收才返回 completed；若工具不可用或存在无法继续的问题，返回 blocked 并说明已保存进度和原因，不得冒充完成。\n`;
}

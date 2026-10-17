import { readFile } from 'node:fs/promises';
import type { PartLayeringInput } from './input.ts';
import type { KritaInstallation } from './krita.ts';

export const stepModels = {
  1: { model: 'gpt-6-astra', effort: 'xhigh' },
  2: { model: 'gpt-6-astra', effort: 'xhigh' },
  3: { model: 'gpt-6.1-sol', effort: 'xhigh' },
} as const;

// Only add later steps when their prompts have been defined.
export const steps = [{
  id: '01-layering',
  title: '分层、补全与 Krita 交付',
  ...stepModels[1],
  prompt: new URL('./prompts/01-分层与补全.md', import.meta.url),
  requiredFiles: ['character-depth.kra', 'report.md'],
}] as const;

export async function buildPrompt(step: typeof steps[number], input: PartLayeringInput, output: string, krita: KritaInstallation): Promise<string> {
  const body = await readFile(step.prompt, 'utf8');
  return `${body}\n---\n本次运行信息（上方为完整步骤提示词）：
- 输入运行目录：${JSON.stringify(input.directory)}。
- 主要产物路径：${JSON.stringify(input.parts)}。以这里已完成的分层 part 作为部件形状与补全标准；保留输入文件。
- 从输入运行目录的 references/ 读取参考图，并读取同目录的 groups.json、occlusion.json 等已有说明与深度表。parts/ 是主要部件产物，层级依据仍以运行目录提供的标准为准。
- 输出目录：${JSON.stringify(output)}。已有合格成果应继续使用；中间文件、每件生成记录和最终交付均放在这里。
- Krita 已检查：${JSON.stringify(krita.executable)}，版本 ${krita.version}；沿用当前显示环境。
- 最终 KRA 保存为 character-depth.kra；逐层验收、重开核对及与色块标准的偏差写入 report.md。
- .workflow/ 是调度器的会话与日志目录，不要改写它。
- 最后按输出 schema 返回 status 和 summary。只有完成上述交付与验收才返回 completed；若工具不可用或存在无法继续的问题，返回 blocked 并说明已保存进度和原因，不得冒充完成。\n`;
}

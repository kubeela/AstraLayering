import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { defaultModels } from '../shared/codex/environment.ts';
import type { KritaInstallation } from '../shared/raster/krita.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
import type { AssemblyInput } from './input.ts';

export const steps = [{
  id: 'step01', title: '人物与衣服 KRA 组装', ...defaultModels.high, modelTier: 'high',
  prompt: new URL('./prompts/01-人物与衣服组装.md', import.meta.url),
  requiredFiles: ['character-assembled.kra', 'character-assembled.png', 'report.md'],
}] as const satisfies readonly StepDefinition[];

export async function buildPrompt(step: StepDefinition, input: AssemblyInput, output: string, krita: KritaInstallation): Promise<string> {
  return `${await readFile(step.prompt, 'utf8')}\n---\n本次运行信息（以下均为绝对路径）：
- 工作目录：${JSON.stringify(dirname(output))}。
- 人物素体 KRA：${JSON.stringify(input.characterKra)}。
- 衣服 KRA：${JSON.stringify(input.clothingKra)}。
- 简化穿衣角色参考图：${JSON.stringify(input.simplifiedCharacter)}。
- Krita：${JSON.stringify(krita.executable)}，版本 ${krita.version}；沿用当前显示环境。
- 本次输出目录：${JSON.stringify(output)}；中间文件也放在这里。必须交付：${JSON.stringify(step.requiredFiles.map(file => join(output, file)))}。
- 若已有进度，继续已有工程和本 thread 的工作。输入工程保持只读；run.json、.running、.completed 与调度日志由程序维护，不要改写。
- 本流程由你独立完成，无后续 reviewer。完成交付后按输出 schema 返回 status=completed 和 summary；不能继续时返回 blocked 并说明原因和已保存进度。\n`;
}

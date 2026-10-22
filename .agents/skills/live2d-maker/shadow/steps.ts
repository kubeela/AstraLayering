import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defaultModels } from '../shared/codex/environment.ts';
import type { StepDefinition } from '../shared/raster/steps.ts';
import type { KritaInstallation } from '../shared/raster/krita.ts';
import type { ShadowMode } from '../shared/shadow.ts';
import type { ShadowInput } from './input.ts';

export const maskSteps = [{ id: 'step01', title: '投影分析、阴影补全与原生裁切', ...defaultModels.medium,
  modelStep: 'shadow_mask', prompt: new URL('./prompts/mask.md', import.meta.url),
  requiredFiles: ['character-shadowed.kra', 'character-shadowed.png', 'shadows.json', 'report.md'],
}] as const satisfies readonly StepDefinition[];
export const mapSteps = [{ id: 'step01', title: '生成配准的整图法线与深度', ...defaultModels.medium,
  modelStep: 'shadow_maps', prompt: new URL('./prompts/normal-depth.md', import.meta.url),
  requiredFiles: ['normal.png', 'depth.png', 'report.md'],
}] as const satisfies readonly StepDefinition[];
export const stepsFor = (mode: ShadowMode): readonly StepDefinition[] => mode === 'mask' ? maskSteps : mapSteps;
export async function buildPrompt(step: StepDefinition, input: ShadowInput, output: string, krita: KritaInstallation): Promise<string> {
  const quote = (s: string) => "'" + s.replace(/'/g, "'\"'\"'") + "'";
  const inspection = step.modelStep === 'shadow_mask' ? `
- 制作参考：${['inputs.json', 'production.md', 'skirt.png', 'hair.png'].map(p => JSON.stringify(join(output, 'references', p))).join('、')}。
- 原生检查：${[process.execPath, fileURLToPath(new URL('./inspect.ts', import.meta.url)), '--output', output, '--krita', krita.executable].map(quote).join(' ')}。查看 inspection/overview.png 与每处 relation-*-review.png，必要时打开其中原尺寸 PNG。` : '';
  return `${await readFile(step.prompt, 'utf8')}\n---\n本次运行（路径均为绝对路径）：
- 管线分支目录：${JSON.stringify(dirname(output))}。
- 已组装、分层的角色 KRA（只读）：${JSON.stringify(input.characterKra)}。
- 对应原尺寸合成 PNG（几何配准基准，只读）：${JSON.stringify(input.characterColor)}。
- simplified 参考（分析画法与投影范围，只读）：${JSON.stringify(input.simplifiedCharacter)}。
- part 分组与遮挡顺序：${JSON.stringify(input.structureFiles)}。人物 ID 记为 character:<原 part ID>，衣服 ID 记为 clothing:<原 part ID>。
- Krita：${JSON.stringify(krita.executable)}，版本 ${krita.version}，沿用当前显示环境。
${inspection}
- 输出目录：${JSON.stringify(output)}。必须交付 ${JSON.stringify(step.requiredFiles.map(file => join(output, file)))}。
- 已有进度继续使用；仅在本分支输出目录写文件，不修改上游，也不操作另一阴影分支。
- run.json、.running、.completed、prompt.md、events.jsonl、result.json 由程序维护，不要修改。
- 最后返回 schema 中的 status 和 summary；只有完成交付并逐图检查才能返回 completed；遇到无法恢复的输入或工具故障返回 blocked 并写明路径、错误及已保存进度。\n`;
}

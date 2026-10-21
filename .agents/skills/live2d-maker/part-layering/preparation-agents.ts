import { validateAgentOutcome } from '../shared/codex/diagnostics.ts';
import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { CodexAgents, GeneratedImage } from '../shared/codex/agents.ts';
import type { PreparationSteps } from './preparation.ts';
import { checkStandardJudgment } from './preparation-state.ts';

function imageTaskPrompt(drawingPrompt: string): string {
  return `【绘制提示词】\n${drawingPrompt.trim()}\n\n【执行规则】\n将绘制提示词原样传给 image_generation，不增补绘制要求。传入两张参考图，启用透明背景，输出 PNG。只调用一次；完成后直接返回路径，不检查、不返修、不重试。成功时 savedPath 为真实路径、error 为 null；失败时 savedPath 为 null、error 填原因。`;
}

async function saveImage(image: GeneratedImage | undefined, output: string): Promise<void> {
  if (!image) throw new Error('image_generation did not produce an image');
  const bytes = await readFile(image.savedPath);
  if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    throw new Error('image_generation did not produce a PNG image');
  }
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes);
    await rename(temporary, output);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

export function createPreparationSteps(agents: Pick<CodexAgents, 'run'>): PreparationSteps {
  const imageOutputSchema = {
    type: 'object', properties: { savedPath: { type: ['string', 'null'] }, error: { type: ['string', 'null'] } },
    required: ['savedPath', 'error'], additionalProperties: false,
  };
  const styleReference = fileURLToPath(new URL('resources/简化参考图片.png', import.meta.url));
  return {
    judgeStandard: async (image, prompt) => {
      const result = await agents.run({
        step: 'part_pose_judgment', name: '姿态判断', prompt, images: [{ path: image, description: '角色原始参考图。' }],
        outputSchema: {
          type: 'object', properties: { needsAdjustment: { type: 'boolean' }, reason: { type: 'string' } },
          required: ['needsAdjustment', 'reason'], additionalProperties: false,
        },
      });
      return validateAgentOutcome(result, () => {
        const decision: unknown = JSON.parse(result.text);
        checkStandardJudgment(decision);
        return decision;
      });
    },
    standardize: async (image, output, prompt) => {
      const result = await agents.run({
        step: 'part_standardize', name: '标准姿态', imageGeneration: true, outputSchema: imageOutputSchema,
        images: [{ path: image, description: '角色原始参考图。' }],
        prompt: `【绘制提示词】\n${prompt.trim()}\n\n【执行规则】\n将绘制提示词原样传给本步骤配置的 image_generation，不增补绘制要求。传入这张参考图，输出 PNG。只调用一次；完成后直接返回路径，不检查、不返修。工具不可用或生成失败时返回 error，不用原图替代生成结果。成功时 savedPath 为真实路径、error 为 null；失败时 savedPath 为 null、error 填原因。`,
      });
      await validateAgentOutcome(result, () => saveImage(result.images.at(-1), output));
    },
    judge: async (image, prompt) => {
      const result = await agents.run({
        step: 'part_reference_judgment', name: '参考判断', prompt, images: [
          { path: image, description: '图 1：角色原始参考图。' },
          { path: styleReference, description: '图 2：目标 Live2D 立绘画风参考，只比较画法。' },
        ],
        outputSchema: {
          type: 'object', properties: { needsSimplification: { type: 'boolean' }, reason: { type: 'string' } },
          required: ['needsSimplification', 'reason'], additionalProperties: false,
        },
      });
      return validateAgentOutcome(result, () => JSON.parse(result.text));
    },
    simplify: async (image, output, prompt) => {
      const result = await agents.run({
        step: 'part_simplify', name: '简化图片', prompt: imageTaskPrompt(prompt), imageGeneration: true, outputSchema: imageOutputSchema,
        images: [
          { path: image, description: '图 1：角色设计参考。' },
          { path: styleReference,
            description: '图 2：目标画风参考。' },
        ],
      });
      await validateAgentOutcome(result, () => saveImage(result.images.at(-1), output));
    },
    baseSubject: async (image, output, prompt) => {
      const result = await agents.run({
        step: 'part_base_subject', name: '素体换装', prompt: imageTaskPrompt(prompt), imageGeneration: true, outputSchema: imageOutputSchema,
        images: [
          { path: image, description: '图 1：已准备的角色参考图。' },
          { path: fileURLToPath(new URL('resources/连体服参考.jpg', import.meta.url)),
            description: '图 2：连体服款式参考。' },
        ],
      });
      await validateAgentOutcome(result, () => saveImage(result.images.at(-1), output));
    },
  };
}

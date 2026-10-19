import { fileURLToPath } from 'node:url';
import type { PartProfile } from '../shared/part/profile.ts';

export const profile: PartProfile = {
  attachChildrenReferences: false,
  referenceLabel: '素体参考图',
  promptsDirectory: fileURLToPath(new URL('prompts/', import.meta.url)),
  id: 'part-layering',
  subjects: ['character', 'other'],
  attachInitialReference: false,
  references: {
    initial: '本次角色素体参考。',
    outline: '本组的素体参考图，沿用其画布与可见形状。',
    review: '用于独立核对本组可见外轮廓的素体参考图。',
    completion: '正面素体参考；只补当前正面被遮住的轮廓。',
    children: '角色正面参考；结合当前父组完成轮廓分析直属结构。',
    occlusion: '本次角色原姿势参考，用于确定每个完整 part 的固定前后深度。'
  }
};

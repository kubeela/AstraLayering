import { fileURLToPath } from 'node:url';
import type { PartProfile } from '../shared/part/profile.ts';

export const profile: PartProfile = {
  attachChildrenReferences: true,
  referenceLabel: '纯衣服参考图',
  originalChildrenReference: '原穿衣角色：用于辨认衣物与身体的穿插和随动，衣片形状以纯衣服图为准。',
  promptsDirectory: fileURLToPath(new URL('prompts/', import.meta.url)),
  toolsDirectory: fileURLToPath(new URL('tools/', import.meta.url)),
  id: 'clothing-part-layering',
  subjects: ['other'],
  attachInitialReference: true,
  references: {
    initial: '纯衣服参考：本次轮廓与衣片形状的标准。',
    outline: '本组的纯衣服参考图，沿用其画布与可见形状。',
    review: '用于独立核对本组可见外轮廓的纯衣服参考图。',
    completion: '正面纯衣服参考；只补当前衣片被遮住的轮廓。',
    children: '纯衣服参考；结合父组完成轮廓分析直属衣片。',
    occlusion: '本次纯衣服参考，用于确定每个完整衣片的固定前后深度。'
  },
  originalReference: '原穿衣角色：只辅助判断衣物环绕身体的结构和随动关系，不是输出内容。'
};

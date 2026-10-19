import type { InitialContext, Subject } from './layering-types.ts';

export type PartProfile = {
  id: 'part-layering' | 'clothing-part-layering';
  promptsDirectory: string;
  toolsDirectory?: string;
  subjects: readonly Subject[];
  attachInitialReference: boolean;
  attachChildrenReferences: boolean;
  referenceLabel: string;
  originalChildrenReference?: string;
  originalReference?: string;
  references: { initial: string; outline: string; review: string; completion: string; children: string; occlusion: string };
};

export function partProfile(context: Pick<InitialContext, 'profile'>): PartProfile {
  if (!context.profile) throw new Error('绘制步骤缺少管线配置（提示词、工具定义与参考语义）。');
  return context.profile;
}

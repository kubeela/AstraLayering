import type { InitialContext, Subject } from './layering-types.ts';

export type PartProfile = {
  id: 'part-layering' | 'clothing-part-layering';
  toolsDirectory?: string;
  subjects: readonly Subject[];
  attachInitialReference: boolean;
  attachChildrenReferences: boolean;
  referenceLabel: string;
  originalChildrenReference?: string;
  originalReference?: string;
  references: { initial: string; outline: string; review: string; completion: string; children: string; occlusion: string };
};

// A profile that names an original-image reference always attaches it; the
// pipeline must have provided that image.
export function originalImageReference(context: Pick<InitialContext, 'references'>, description: string | undefined) {
  if (!description) return [];
  const path = context.references.originalImage;
  if (!path) throw new Error('本管线需要原图参考，但准备阶段没有提供原图。');
  return [{ path, description }];
}

export function partProfile(context: Pick<InitialContext, 'profile'>): PartProfile {
  if (!context.profile) throw new Error('绘制步骤缺少管线配置（提示词、工具定义与参考语义）。');
  return context.profile;
}

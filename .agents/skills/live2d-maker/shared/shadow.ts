export const shadowModes = ['mask', 'normal-depth'] as const;
export type ShadowMode = typeof shadowModes[number];
export function shadowMode(value: unknown = 'mask'): ShadowMode {
  if (!shadowModes.includes(value as ShadowMode)) throw new Error('shadow-mode 必须为 mask 或 normal-depth。');
  return value as ShadowMode;
}
export const shadowArtifacts = {
  selection: 'shadow/selection.json',
  maskDocument: 'shadow/mask/step01/character-shadowed.kra',
  maskColor: 'shadow/mask/step01/character-shadowed.png',
  bindings: 'shadow/mask/step01/shadows.json',
  draftNormal: 'shadow/normal-depth/step01/normal.png',
  draftDepth: 'shadow/normal-depth/step01/depth.png',
} as const;

export type ShadowDraftPreview = {
  version: 1; mode: 'normal-depth'; status: 'draft-awaiting-visual-review' | 'awaiting-publication'; reason: string;
  inputFingerprint: string; sourceKraHash: string; sourceColorHash: string;
  normalHash: string; depthHash: string; width: number; height: number;
  normalLengthMaxError: number; updatedAt: string;
};
export function isShadowDraftPreview(value: unknown): value is ShadowDraftPreview {
  const r = value as ShadowDraftPreview | null;
  return !!r && r.version === 1 && r.mode === 'normal-depth' && ['draft-awaiting-visual-review', 'awaiting-publication'].includes(r.status)
    && typeof r.reason === 'string' && !!r.reason.trim()
    && [r.inputFingerprint, r.sourceKraHash, r.sourceColorHash, r.normalHash, r.depthHash]
      .every(hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash))
    && [r.width, r.height].every(n => Number.isInteger(n) && n > 0)
    && Number.isFinite(r.normalLengthMaxError) && r.normalLengthMaxError >= 0 && r.normalLengthMaxError <= 0.02;
}

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
} as const;

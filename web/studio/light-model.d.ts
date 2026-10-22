import type { LightingSettings } from './lighting-model.js';
export type LightRecipe = { version: 1; renderer: string; rendererFingerprint: string;
  inputs: { color: string; normal: string; depth: string }; settings: LightingSettings;
  previewHash: string; renderRecord: string; width: number; height: number };
export function validateLight(value: unknown): LightRecipe;

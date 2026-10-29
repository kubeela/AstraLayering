import { access } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { ShadowDraftPreview } from '../shared/shadow.ts';
import { taskDirectory } from '../shared/paths.ts';
import { assemblyStep, fileHash, resolveShadowInput } from './input.ts';
import { inspectChain } from '../shared/step-chain.ts';
import { shadowStep } from '../shared/step-paths.js';

// Read-only discovery for the unified studio. Never complete or publish a workflow.
export async function inspectDraftPreview(name: string, root: string): Promise<ShadowDraftPreview | undefined> {
  const task = taskDirectory(name, root), output = join(task, 'shadow', shadowStep('normal-depth'));
  const input = await resolveShadowInput(name, root), upstream = assemblyStep(input);
  // Maps made from an assembly that has since been redone are not shown.
  const maps = { id: shadowStep('normal-depth'), root: upstream.root, directory: output, dependsOn: [upstream.id] };
  if ((await inspectChain([upstream, maps])).reset.includes(maps.id)) return;
  const source = await sharp(input.characterColor).metadata();
  const alpha = await sharp(input.characterColor).ensureAlpha().raw().toBuffer();
  let maxError = 0, visible = 0;
  for (const name of ['normal.png', 'depth.png']) {
    const map = await sharp(join(output, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (map.info.width !== source.width || map.info.height !== source.height) return;
    for (let i = 0; i < map.data.length; i += 4) {
      if (!alpha[i + 3]) continue;
      if (name === 'depth.png') {
        if (map.data[i] !== map.data[i + 1] || map.data[i + 1] !== map.data[i + 2]) return;
      } else {
        const length = Math.hypot(map.data[i] / 127.5 - 1, map.data[i + 1] / 127.5 - 1, map.data[i + 2] / 127.5 - 1);
        maxError = Math.max(maxError, Math.abs(length - 1)); visible++;
      }
    }
  }
  if (!visible || maxError > 0.02) return;
  let mapsComplete = false;
  try { await access(join(output, '.completed')); mapsComplete = true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return {
    version: 1, mode: 'normal-depth', status: mapsComplete ? 'awaiting-publication' : 'draft-awaiting-visual-review',
    reason: mapsComplete ? '贴图已完成验收，正式交付记录待恢复' : '贴图尚未完成视觉复核',
    sourceKraHash: await fileHash(input.characterKra), sourceColorHash: await fileHash(input.characterColor),
    normalHash: await fileHash(join(output, 'normal.png')), depthHash: await fileHash(join(output, 'depth.png')),
    width: source.width!, height: source.height!, normalLengthMaxError: maxError,
    updatedAt: new Date().toISOString(),
  };
}

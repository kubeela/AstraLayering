import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { partSteps } from '../step-paths.js';
import { normalizeGroups, walkGroups, writeAtomic } from './groups.ts';
import { artifactPath } from './artifact-facts.ts';
import { mergePartSvgs } from './merge-svg.ts';
import { depthRegions, type OcclusionPlan } from './occlusion-plan.ts';
import type { GroupNode } from './layering-types.ts';

export const depthPreviewPath = (directory: string) => join(directory, partSteps.occlusion, 'preview.svg');

// This is the planning preview, not raster's geometric depth slices. Each whole
// SVG appears once at its rearmost depth, just as in propose_occlusion.
export async function publishDepthPreview(directory: string, groups: GroupNode[], plan: OcclusionPlan): Promise<string> {
  const leaves = new Map(walkGroups(normalizeGroups(groups)).filter(({ group }) => !group.groups.length).map(({ group }) => [group.id, group]));
  // Rendering needs geometry/order, not the producer's audit annotations. Old
  // archived checks can use an earlier format without changing their depths.
  if (plan.direction !== 'back-to-front' || !Array.isArray(plan.layers) || plan.layers.some(row =>
    !depthRegions(row).length || depthRegions(row).some(region => !Number.isFinite(region.level) || region.level < 0))) throw new Error('深度预览需要有效的前后深度');
  const rows = [...plan.layers].sort((a, b) =>
    Math.min(...depthRegions(a).map(region => region.level)) - Math.min(...depthRegions(b).map(region => region.level)));
  if (rows.length !== leaves.size || rows.some(row => !leaves.has(row.id))) throw new Error('深度预览的终止部件与当前分组不一致');
  const outputPath = depthPreviewPath(directory);
  await mergePartSvgs({ directory, outputPath, groups: rows.map(row => leaves.get(row.id)!),
    parts: rows.map(row => ({ groupId: row.id, svg: { path: artifactPath(directory, row.id, 'completion') } })) });
  const hash = createHash('sha256').update(JSON.stringify(plan)).digest('hex');
  const svg = (await readFile(outputPath, 'utf8')).replace('<svg ', `<svg data-depth-plan-sha256="${hash}" data-depth-preview="whole-parts" `);
  await writeAtomic(outputPath, svg);
  return outputPath;
}

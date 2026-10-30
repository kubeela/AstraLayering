import { lstat, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readStep } from './step-chain.ts';
import { clothingPreparationStep, groupStepId, partSteps } from './step-paths.js';
import { artifactPath, reportPath } from './part/artifact-facts.ts';
import { occlusionPath } from './part/occlusion-plan.ts';
import { preparationOptionsPath } from './part/preparation-cache.ts';
import type { SectionId } from './paths.ts';
import { steps as personSteps } from '../raster-layering/steps.ts';
import { steps as clothingSteps } from '../clothing-raster-layering/steps.ts';
import { steps as assemblySteps } from '../character-assembly/steps.ts';
import { maskSteps, mapSteps } from '../shadow/steps.ts';

// The files a completed step must still hold. A run refuses to keep a completed
// step that lost one; retry is how such a step is redone. Paths are absolute;
// some part products live outside the step directory.
const rasterSteps: Partial<Record<SectionId, readonly { id: string; requiredFiles: readonly string[] }[]>> = {
  'raster-layering': personSteps, 'clothing-raster-layering': clothingSteps,
  'character-assembly': assemblySteps, shadow: [...maskSteps, ...mapSteps],
};
const references = (root: string, name: string) => join(root, 'references', name);
const itemGroup = (item: string) => item.split('/children/').join('/');
const present = (path: string) => lstat(path).then(info => info.isFile(), () => false);

export async function stepDeliveries(root: string, section: SectionId, id: string): Promise<string[]> {
  const raster = rasterSteps[section];
  if (raster) return raster.find(step => step.id === id)?.requiredFiles.map(file => join(root, id, file)) ?? [];
  const [step, ...items] = id.split('/'), item = items.join('/');
  if (section === 'clothing-part-layering' && step === clothingPreparationStep) return [references(root, 'clothing.png')];
  if (section === 'part-layering') {
    if (step === partSteps.options) return [preparationOptionsPath(join(root, 'references'))];
    if (step === partSteps.standard) return [references(root, 'standard.png')];
    if (step === partSteps.simplified) return [references(root, 'simplified-subject.png')];
    if (step === partSteps.base) return [references(root, 'base-subject.png')];
  }
  if (step === partSteps.outline && item) return [artifactPath(root, itemGroup(item), 'outline')];
  if (step === partSteps.completion && item) {
    const group = itemGroup(item);
    return [artifactPath(root, group, 'completion'), reportPath(root, group, 'completion-check')];
  }
  if (step === partSteps.reduce && item) {
    // A group split off later (drawing-stage edit_groups) had no outline when its layer was reduced.
    const depth = Number(item.slice('depth'.length)) - 1, groups: string[] = [];
    let document;
    try { document = JSON.parse(await readFile(join(root, 'groups.json'), 'utf8')); } catch { return []; }
    const walk = (nodes: any[], level: number): void => {
      for (const node of Array.isArray(nodes) ? nodes : []) {
        if (typeof node?.id === 'string' && level === depth) groups.push(node.id);
        walk(node?.groups, level + 1);
      }
    };
    walk(document?.groups, 0);
    const delivered: string[] = [];
    for (const group of groups) {
      if ((await readStep(join(root, groupStepId(group, 'outline')))).status === 'completed') delivered.push(artifactPath(root, group, 'reduction'));
    }
    return delivered;
  }
  if (step === partSteps.merge) return [join(root, 'preview.svg')];
  if (step === partSteps.occlusion) return [occlusionPath(root)];
  return [];
}

export async function missingDeliveries(root: string, section: SectionId, id: string): Promise<string[]> {
  const missing: string[] = [];
  for (const path of await stepDeliveries(root, section, id)) if (!await present(path)) missing.push(path);
  return missing;
}

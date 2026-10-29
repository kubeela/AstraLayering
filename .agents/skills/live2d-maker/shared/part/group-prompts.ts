import { readFile, realpath } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { stepKnowledge } from '../knowledge.ts';
import type { PartProfile } from './profile.ts';

// Prior knowledge of each part stage: knowledge/<section>/<step>/.
const knowledgeSteps = { initial: 'step08_initial', outline: 'step09_outline', reduction: 'step10_reduce',
  completion: 'step11_completion', children: 'step12_children', occlusion: 'step14_occlusion' } as const;
export type PartStage = keyof typeof knowledgeSteps;
export function partKnowledge(profile: Pick<PartProfile, 'id'>, stage: PartStage) {
  return stepKnowledge(profile.id, knowledgeSteps[stage]);
}

// A group prior lives in the step's prompts/groups/<full id>/.
export function groupPromptDirectory(profile: Pick<PartProfile, 'id'>, stage: PartStage, id: string): string {
  if (!/^[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u.test(id)) throw new Error('Invalid group prompt id');
  return join(partKnowledge(profile, stage).directory, 'prompts', 'groups', id);
}

export type ReferenceImage = { path: string; description: string };
export type SiblingReference = ReferenceImage & {
  groupId: string; sourceSvg: string; sourceHash: string; sourceStage: 'reduction';
};

// References are explicit for this exact group and stage; no ancestor lookup.
export async function readGroupReferences(
  groupDirectory: string, stage: 'completion' | 'children',
  resolveSibling?: (name: string, description: string) => Promise<SiblingReference>,
): Promise<(ReferenceImage | SiblingReference)[]> {
  const path = join(groupDirectory, `${stage}.references.json`);
  let config: unknown;
  try { config = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  if (!Array.isArray(config) || config.some(item => {
    if (!item || typeof item.description !== 'string' || !item.description.trim()) return true;
    if (typeof item.path === 'string' && item.path.trim()) {
      return Object.keys(item).some(key => !['path', 'description'].includes(key));
    }
    return stage !== 'completion' || typeof item.sibling !== 'string' || !/^[\p{L}\p{N}_-]+$/u.test(item.sibling) ||
      Object.keys(item).some(key => !['sibling', 'description'].includes(key));
  })) {
    throw new Error(`无效 ${stage} 参考清单：${path}`);
  }
  return Promise.all(config.map(async item => {
    if (item.sibling !== undefined) {
      if (!resolveSibling) throw new Error(`补全同级参考需要本次运行上下文：${path}`);
      return resolveSibling(item.sibling, item.description);
    }
    const image = await realpath(resolve(dirname(path), item.path));
    await sharp(image, { limitInputPixels: 100_000_000 }).metadata();
    return { path: image, description: item.description };
  }));
}

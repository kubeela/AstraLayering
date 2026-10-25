import { partProfile } from './profile.ts';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { artifactPath, readOptional, svgHash } from './artifact-facts.ts';
import { walkGroups } from './groups.ts';
import type { OcclusionContext } from './layering-types.ts';

export const occlusionPath = (directory: string) => join(directory, 'occlusion.json');
export type DepthRegion = { level: number; region: string };
export type DepthCheck = { passed: true; note: string; regions?: { level: number; note: string }[] };
export type OcclusionLayer = {
  id: string;
  note: string;
  check: DepthCheck;
} & ({ level: number; levels?: never } | { level?: never; levels: DepthRegion[] });
export type OcclusionPlan = {
  version: 2 | 3;
  direction: 'back-to-front';
  sourceHash: string;
  layers: OcclusionLayer[];
};
export const terminalParts = (context: OcclusionContext) => walkGroups(context.groups).filter(({ group }) => !group.groups.length);

export function depthRegions(row: OcclusionLayer): DepthRegion[] {
  return row.levels ?? [{ level: row.level!, region: '整个部件' }];
}

function nonempty(value: unknown): value is string { return typeof value === 'string' && !!value.trim(); }
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function keys(value: object, allowed: string[]): boolean { return Object.keys(value).every(key => allowed.includes(key)); }

// Independent of the group scheduler: raster uses the same contract when updating the upstream table.
export function validateOcclusionDocument(value: unknown): OcclusionPlan {
  if (!object(value)) throw new Error('层级表必须是对象');
  const plan = value as unknown as OcclusionPlan;
  if (![2, 3].includes(plan.version) || plan.direction !== 'back-to-front' || !nonempty(plan.sourceHash) ||
      !Array.isArray(plan.layers) || !plan.layers.length || !keys(plan, ['version', 'direction', 'sourceHash', 'layers'])) {
    throw new Error('层级表版本、方向或输入指纹不符');
  }
  const ids = new Set<string>(), levels = new Set<number>();
  for (const [index, row] of plan.layers.entries()) {
    if (!object(row) || !nonempty(row.id) || ids.has(row.id) || !keys(row, ['id', 'level', 'levels', 'note', 'check'])) {
      throw new Error('层级表包含重复 ID 或不支持的字段');
    }
    ids.add(row.id);
    if (('level' in row) === ('levels' in row) || (plan.version === 2 && row.level !== index)) {
      throw new Error(`${row.id} 必须且只能提供 level 或 levels；旧版 level 必须对应数组位置`);
    }
    if (row.levels !== undefined && (!Array.isArray(row.levels) || row.levels.length < 2)) {
      throw new Error(`${row.id} 多深度 levels 至少包含两个区域`);
    }
    for (const region of depthRegions(row)) {
      if (!object(region) || !keys(region, ['level', 'region']) || !Number.isFinite(region.level) || region.level < 0 ||
          levels.has(region.level) || !nonempty(region.region)) throw new Error(`${row.id} 深度值重复、非法或缺少区域描述`);
      levels.add(region.level);
    }
    const check = row.check;
    if (!nonempty(row.note) || !object(check) || check.passed !== true || !nonempty(check.note) ||
        !keys(check, ['passed', 'note', 'regions'])) throw new Error(`${row.id} 缺少深度依据或逐件检查`);
    if (row.levels) {
      const checked = check.regions;
      if (!Array.isArray(checked) || checked.length !== row.levels.length ||
          new Set(checked.map(item => item?.level)).size !== checked.length ||
          checked.some(item => !object(item) || !keys(item, ['level', 'note']) || !nonempty(item.note) ||
            !row.levels!.some(region => region.level === item.level))) {
        throw new Error(`${row.id} 必须逐个检查全部深度区域`);
      }
    } else if (check.regions !== undefined) throw new Error(`${row.id} 单深度不应附带多区域检查`);
  }
  return structuredClone(plan);
}

// 层级是独立的最后一步：绑定语义、两类轮廓、参考、已有预览及提示词，不改变上游事实。
export async function occlusionSourceHash(context: OcclusionContext): Promise<string> {
  const occlusionPromptPath = join(partProfile(context).promptsDirectory, '11-遮挡层级规划.md');
  const files = [resolve(context.directory, context.references.baseSubject), resolve(context.directory, context.preview.path), occlusionPromptPath];
  const inputs = [];
  for (const { group, parent } of walkGroups(context.groups)) {
    inputs.push({ id: group.id, parent: parent?.id, kind: group.kind, name: group.name, note: group.note, metadata: group.metadata,
      children: group.groups.map(child => child.id) });
    if (!group.groups.length) files.push(artifactPath(context.directory, group.id, 'reduction'), artifactPath(context.directory, group.id, 'completion'));
  }
  const hashes = await Promise.all(files.map(async path => ({ path: path === occlusionPromptPath ? 'planning-prompt' : relative(context.directory, path),
    hash: createHash('sha256').update(await readFile(path)).digest('hex') })));
  const tree = await readOptional(join(context.directory, 'groups.json'));
  if (tree) hashes.push({ path: 'groups.json', hash: svgHash(tree) });
  return svgHash(JSON.stringify({ schema: 2, inputs, files: hashes }));
}

export function validateOcclusionPlan(value: unknown, context: OcclusionContext, sourceHash: string): OcclusionPlan {
  const plan = validateOcclusionDocument(value);
  if (plan.sourceHash !== sourceHash) throw new Error('层级表输入指纹不符');
  const ids = new Set(terminalParts(context).map(({ group }) => group.id));
  if (!ids.size || plan.layers.length !== ids.size) throw new Error('层级表必须完整覆盖全部终止 part');
  if (plan.layers.some(row => !ids.has(row.id))) throw new Error('层级表包含非终止节点');
  return structuredClone(plan);
}

export async function restoreOcclusionPlan(context: OcclusionContext): Promise<OcclusionPlan | undefined> {
  const bytes = await readOptional(occlusionPath(context.directory));
  if (!bytes) return;
  const sourceHash = await occlusionSourceHash(context);
  try { return validateOcclusionPlan(JSON.parse(bytes.toString()), context, sourceHash); }
  catch { return; } // 不完整、旧版本、损坏或过期的表只重做最后一步。
}

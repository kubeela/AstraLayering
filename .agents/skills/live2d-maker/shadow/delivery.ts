import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import sharp from 'sharp';
import type { ShadowMode } from '../shared/shadow.ts';
import type { ShadowInput } from './input.ts';

// Decompress the document directory and saved composite only, never every paint tile.
export function kraContents(bytes: Uint8Array) {
  const files = unzipSync(bytes, { filter: file => {
    if (!['maindoc.xml', 'mergedimage.png'].includes(file.name)) return false;
    if (file.originalSize > (file.name.endsWith('.xml') ? 4_000_000 : 280_000_000)) throw new Error('KRA 元数据或合成图过大');
    return true;
  } });
  if (!files['maindoc.xml'] || !files['mergedimage.png']) throw new Error('KRA 缺少 maindoc.xml 或 mergedimage.png');
  return { xml: strFromU8(files['maindoc.xml']), merged: files['mergedimage.png'] };
}
const uuid = (value: string) => value.replace(/[{}]/g, '').toLowerCase();
export function kraLayers(xml: string) {
  const layers = new Map<string, Record<string, string>>(), parents: string[] = [];
  // Krita stores mask children as <mask>, rather than <layer>.
  for (const token of xml.matchAll(/<\/?(?:layer|mask)\b[^>]*>/g)) {
    const tag = token[0];
    if (tag.startsWith('</')) { parents.pop(); continue; }
    const decode = (s: string) => s.replace(/&(quot|apos|amp|lt|gt);/g, (_m, k: string) => ({quot:'"',apos:"'",amp:'&',lt:'<',gt:'>'}[k]!));
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
    const id = uuid(attrs.uuid ?? '');
    if (!id || layers.has(id)) throw new Error('KRA 图层 UUID 缺失或重复');
    layers.set(id, { ...attrs, parent: parents.at(-1) ?? '', order: String(layers.size) });
    if (!tag.endsWith('/>')) parents.push(id);
  }
  return layers;
}
async function rgba(input: string | Uint8Array) {
  return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}
async function matchedPng(path: string, width: number, height: number) {
  const meta = await sharp(path).metadata();
  if (meta.format !== 'png' || meta.width !== width || meta.height !== height) throw new Error('贴图必须为原尺寸 PNG：' + path);
  return rgba(path);
}
export async function prepareMaps(output: string, input: ShadowInput): Promise<void> {
  const source = await rgba(input.characterColor);
  for (const name of ['normal.png', 'depth.png']) {
    const path = join(output, name), map = await matchedPng(path, source.info.width, source.info.height);
    // The source owns coverage. Keep generated RGB at its original resolution.
    for (let i = 3; i < map.data.length; i += 4) map.data[i] = source.data[i];
    await sharp(map.data, { raw: map.info }).png().toFile(path + '.tmp');
    const { rename } = await import('node:fs/promises');
    await rename(path + '.tmp', path);
  }
}
export async function validateDelivery(output: string, input: ShadowInput, mode: ShadowMode): Promise<void> {
  const source = await rgba(input.characterColor), { width, height } = source.info;
  if (mode === 'normal-depth') {
    for (const name of ['normal.png', 'depth.png']) {
      const map = await matchedPng(join(output, name), width, height);
      for (let i = 3; i < map.data.length; i += 4) {
        if (map.data[i] !== source.data[i]) throw new Error('贴图 alpha 与组装原画不匹配：' + name);
        if (name === 'depth.png' && map.data[i] && (map.data[i - 3] !== map.data[i - 2] || map.data[i - 2] !== map.data[i - 1])) {
          throw new Error('深度图必须为灰度数据：' + name);
        }
      }
    }
    return;
  }
  const kra = kraContents(await readFile(join(output, 'character-shadowed.kra')));
  const merged = await rgba(kra.merged), exported = await matchedPng(join(output, 'character-shadowed.png'), width, height);
  if (merged.info.width !== width || merged.info.height !== height || !merged.data.equals(exported.data)) {
    throw new Error('阴影 KRA 保存合成图与原尺寸 PNG 不一致，请重开工程并重新导出');
  }
  const image = kra.xml.match(/<IMAGE\b[^>]*>/)?.[0] ?? '';
  if (!image.includes(`width="${width}"`) || !image.includes(`height="${height}"`)) throw new Error('阴影 KRA 画布尺寸改变');
  const layers = kraLayers(kra.xml), parts = new Set<string>();
  const original = kraLayers(kraContents(await readFile(input.characterKra)).xml);
  for (const path of input.structureFiles.filter(path => path.endsWith('groups.json'))) {
    const namespace = path.includes('clothing-part-layering') ? 'clothing:' : 'character:';
    const visit = (nodes: any[]) => { for (const node of nodes) { parts.add(namespace + node.id); visit(node.groups ?? []); } };
    visit(JSON.parse(await readFile(path, 'utf8')).groups ?? []);
  }
  const bindings = JSON.parse(await readFile(join(output, 'shadows.json'), 'utf8'));
  validateMaskStructure(layers, original, parts, bindings);
}

export function validateMaskStructure(layers: ReturnType<typeof kraLayers>, original: Map<string, Record<string,string>>, parts: Set<string>, bindings: any) {
  for (const [id, node] of original) {
    const retained = layers.get(id);
    if (retained?.nodetype !== node.nodetype) throw new Error('原有部件或蒙版被删除或合并：' + node.name);
    if (node.nodetype.endsWith('mask')) {
      if (node.parent !== undefined && retained.parent !== node.parent) throw new Error('原有蒙版脱离原部件：' + node.name);
      for (const key of ['visible', 'x', 'y', 'opacity', 'compositeop', 'channelflags', 'alphainherit']) {
        if (node[key] !== undefined && retained[key] !== node[key]) throw new Error('原有蒙版状态改变（' + key + '）：' + node.name);
      }
    }
  }
  if (![1, 2].includes(bindings.version) || !Array.isArray(bindings.shadows) || !Array.isArray(bindings.excluded)) throw new Error('shadows.json 格式无效');
  if (!bindings.shadows.length && !bindings.excluded.length) throw new Error('需要记录投影关系或明确说明没有适用关系');
  const ids = new Set<string>(), shadowLayers = new Set<string>();
  for (const relation of bindings.shadows) {
    if (typeof relation.id !== 'string' || !relation.id || ids.has(relation.id)) throw new Error('阴影关系 ID 缺失或重复');
    ids.add(relation.id);
    const receivers = relation.receiverPartIds ?? [relation.receiverPartId];
    if (!parts.has(relation.casterPartId) || !Array.isArray(receivers) || !receivers.length
      || receivers.some((id: unknown) => typeof id !== 'string' || !parts.has(id))
      || new Set(receivers).size !== receivers.length
      || relation.receiverPartIds !== undefined && relation.receiverPartId !== undefined
      || relation.follow !== 'caster') throw new Error('投影关系必须引用真实 part，记录投影运动来源与全部受影部件：' + relation.id);
    for (const key of ['casterLayerUuids', 'receiverLayerUuids']) {
      if (!Array.isArray(relation[key]) || !relation[key].length || relation[key].some((id: unknown) => typeof id !== 'string' || !layers.has(uuid(id)))) throw new Error('投影关系引用不存在的图层：' + relation.id);
    }
    if (typeof relation.shadowLayerUuid !== 'string' || typeof relation.clipBaseLayerUuid !== 'string') throw new Error('缺少阴影或受影裁切图层 UUID');
    const shadowId = uuid(relation.shadowLayerUuid), shadow = layers.get(shadowId), base = layers.get(uuid(relation.clipBaseLayerUuid));
    const parent = shadow && layers.get(shadow.parent);
    // Krita 5.x serializes inheritAlpha as disabled alpha writes in RGBA channel flags.
    const inheritAlpha = shadow && (shadow.alphainherit === '1' || shadow.colorspacename === 'RGBA' && shadow.channelflags === '1110');
    if (!shadow || !base || shadow.nodetype !== 'paintlayer' || !inheritAlpha
      || shadow.parent !== base.parent || parent?.nodetype !== 'grouplayer' || parent.passthrough === '1') throw new Error('阴影必须使用隔离组内的原生透明度继承裁切：' + relation.id);
    validateClipBase(layers, relation);
    if (shadowLayers.has(shadowId)) throw new Error('不同运动关系需要独立阴影图层：' + relation.id);
    shadowLayers.add(shadowId);
    const allowed = relation.blendMode === 'normal' ? ['normal'] : relation.blendMode === 'multiply' ? ['multiply', 'mul'] : [];
    if (!allowed.includes(shadow.compositeop)) throw new Error('阴影混合模式与工程不一致：' + relation.id);
  }
}

export function validateClipBase(layers: ReturnType<typeof kraLayers>, relation: any) {
  const shadow = layers.get(uuid(relation.shadowLayerUuid)), baseId = uuid(relation.clipBaseLayerUuid), base = layers.get(baseId);
  if (!shadow || !base || Number(base.order) <= Number(shadow.order)) throw new Error('受影裁切底层必须在阴影下方：' + relation.id);
  const inherits = (n: Record<string,string>) => n.alphainherit === '1' || n.colorspacename === 'RGBA' && n.channelflags === '1110';
  const writers = [...layers].filter(([, n]) => n.parent === shadow.parent && Number(n.order) > Number(shadow.order)
    && !n.nodetype.endsWith('mask') && n.visible !== '0' && n.opacity !== '0' && !inherits(n));
  if (writers.some(([id]) => id !== baseId)) throw new Error('阴影下方混入了非受影的 alpha 来源，请整理隔离组：' + relation.id);
  for (const id of relation.receiverLayerUuids) {
    let current = uuid(id); const visited = new Set<string>();
    while (current !== baseId && layers.has(current) && !visited.has(current)) { visited.add(current); current = layers.get(current)!.parent; }
    if (current !== baseId) throw new Error('受影图层不属于实际裁切底层：' + relation.id);
  }
  if (relation.testOffsets !== undefined) {
    const offsets = relation.testOffsets;
    if (!Array.isArray(offsets) || offsets.length < 2 || offsets.length > 9
      || offsets.some((p: unknown) => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isInteger(v) || Math.abs(v) > 16384))
      || !offsets.some(p => p[0] === 0 && p[1] === 0) || !offsets.some(p => p[0] !== 0 || p[1] !== 0)) throw new Error('testOffsets 需要复位点和实际像素偏移：' + relation.id);
  }
}

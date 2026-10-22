import { bindingDefaults, validateBinding, physicsVersion } from './physics-model.js';

const uuid = value => String(value || '').replace(/[{}]/g, '').toLowerCase();
const validUuid = value => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bounds = b => [b?.x, b?.y, b?.width, b?.height];

function reference(layer, context) {
  if (!layer.uuid) return { kind: 'fixture', id: layer.id, sourceHash: context.sourceHash, size: context.size };
  const id = uuid(layer.uuid);
  if (!validUuid(id) || !/^[a-f0-9]{64}$/.test(layer.contentHash || '')) throw Error('部件缺少稳定身份或源像素指纹');
  return { kind: 'layer', uuid: id, partPath: layer.partPath || null, bounds: bounds(layer.bounds), size: context.size,
    contentHash: layer.contentHash, members: (layer.sourceLayerUuids || [id]).map(uuid).sort() };
}
const keyFor = ref => ref.kind === 'layer' ? 'uuid:' + ref.uuid : 'fixture:' + ref.sourceHash + ':' + ref.id;

export function physicsRecipe(parts, bindings, context, pending = new Map()) {
  const records = new Map();
  for (const layer of parts) {
    const ref = reference(layer, context), key = keyFor(ref);
    if (records.has(key)) throw Error('部件稳定身份重复');
    records.set(key, { ref, binding: validateBinding(bindings.get(layer.id)) });
  }
  // Unresolved authoring stays in the saved recipe until it can be resolved or
  // the user explicitly authors that part again. Never overwrite it with defaults.
  for (const [key, record] of pending) records.set(key, record);
  return { schema: 2, solver: physicsVersion, sourceHash: context.sourceHash, size: context.size, records: Object.fromEntries(records) };
}

export function restorePhysicsRecipe(recipe, parts, context, initial = new Map()) {
  if (![1, 2].includes(recipe?.schema) || recipe.solver !== physicsVersion) throw Error('物理配置版本不匹配');
  const bindings = new Map(parts.map(l => [l.id, initial.get(l.id) || bindingDefaults()]));
  if (recipe.schema === 1) {
    // A positional recipe has no provenance. Migrate only against the exact
    // original bytes and canvas, using the native bridge's legacy index aliases.
    if (recipe.sourceHash !== context.sourceHash || !same(recipe.size, context.size)) throw Error('旧物理配置需要原始工程才能迁移');
    const aliases = new Map(parts.flatMap(l => [[l.id, l], ...(l.legacyId ? [[l.legacyId, l]] : [])]));
    const entries = Object.entries(recipe.bindings || {}), seen = new Set();
    if (entries.length !== parts.length) throw Error('旧物理配置的部件身份不匹配');
    for (const [id, value] of entries) {
      const layer = aliases.get(id);
      if (!layer || seen.has(layer.id)) throw Error('旧物理配置的部件身份不匹配');
      seen.add(layer.id); bindings.set(layer.id, validateBinding(value));
    }
    return { bindings, pending: new Map(), issues: [], migrated: true };
  }
  if (!recipe.records || typeof recipe.records !== 'object' || Array.isArray(recipe.records)) throw Error('物理配置缺少稳定层引用');
  const current = new Map(parts.map(l => [keyFor(reference(l, context)), l]));
  if (current.size !== parts.length) throw Error('部件稳定身份重复');
  const pending = new Map(), issues = [];
  for (const [key, record] of Object.entries(recipe.records)) {
    const ref = record?.ref;
    if (!ref || !['layer', 'fixture'].includes(ref.kind) || keyFor(ref) !== key
      || !Array.isArray(ref.size) || ref.size.length !== 2 || ref.size.some(n => !Number.isSafeInteger(n) || n <= 0)
      || (ref.kind === 'fixture' && (typeof ref.id !== 'string' || !ref.id || typeof ref.sourceHash !== 'string' || !ref.sourceHash))
      || (ref.kind === 'layer' && (!validUuid(ref.uuid) || !/^[a-f0-9]{64}$/.test(ref.contentHash || '')
        || !Array.isArray(ref.members) || !ref.members.length || ref.members.some(id => !validUuid(id))
        || new Set(ref.members).size !== ref.members.length || !Array.isArray(ref.bounds) || ref.bounds.length !== 4
        || ref.bounds.some(n => !Number.isFinite(n))))) throw Error('物理配置的稳定层引用无效');
    const binding = validateBinding(record.binding), layer = current.get(key);
    const next = layer && reference(layer, context);
    const compatible = next && same(ref.size, next.size) && (ref.kind === 'fixture'
      ? ref.sourceHash === next.sourceHash
      : ref.contentHash === next.contentHash && same(ref.bounds, next.bounds) && same(ref.members, next.members));
    if (compatible) bindings.set(layer.id, binding);
    else {
      if (layer) bindings.set(layer.id, bindingDefaults());
      pending.set(key, { ref, binding });
      if (binding.enabled) issues.push({ key, partPath: ref.partPath, reason: layer ? !same(ref.members, next.members) ? '部件合成结构已变化' : '部件像素或几何已变化'
        : parts.some(l => l.sourceLayerUuids?.includes(ref.uuid)) ? '部件合成结构已变化' : '原图层未找到' });
    }
  }
  return { bindings, pending, issues, migrated: false };
}

export function physicsRecordKey(layer, context) { return keyFor(reference(layer, context)); }

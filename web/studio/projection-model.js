import { layerFields } from './layer-model.js';
export const canonicalUuid = value => String(value || '').replace(/[{}]/g, '').toLowerCase();

export function projectionLayers(bindings, layers) {
  const byUuid = new Map(layers.filter(l => l.uuid).map(l => [canonicalUuid(l.uuid), l]));
  return (bindings?.shadows || []).map(s => ({ ...s,
    layer: byUuid.get(canonicalUuid(s.shadowLayerUuid)),
    casters: (s.casterLayerUuids || []).map(id => byUuid.get(canonicalUuid(id))).filter(Boolean),
    receivers: (s.receiverLayerUuids || []).map(id => byUuid.get(canonicalUuid(id))).filter(Boolean),
  }));
}

// Editing an authored shadow changes color, not the represented surface.
// Any other layer or field change still invalidates the baseline data maps.
export function projectionOnlyEdit(bindings, baseline, current) {
  if (!bindings?.shadows?.length || !baseline || baseline.length !== current.length) return false;
  const allowed = new Set(bindings.shadows.map(s => canonicalUuid(s.shadowLayerUuid)));
  const original = new Map(baseline.map(l => [l.id, l]));
  return current.every(l => {
    const b = original.get(l.id);
    return b && layerFields.every(k => l[k] === b[k] ||
      (allowed.has(canonicalUuid(l.uuid)) && ['visible', 'opacity'].includes(k)));
  });
}

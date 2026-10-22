import type { LayerState } from './layer-model.js';
type NativeLayer = LayerState & { uuid?: string };
type Shadow = { shadowLayerUuid: string; casterLayerUuids?: string[]; receiverLayerUuids?: string[] };
type Bindings = { shadows: Shadow[] } | null;
export function canonicalUuid(value: unknown): string;
export function projectionLayers<T extends NativeLayer>(bindings: Bindings, layers: T[]): (Shadow & { layer?: T; casters: T[]; receivers: T[] })[];
export function projectionOnlyEdit(bindings: Bindings, baseline: NativeLayer[] | undefined, current: NativeLayer[]): boolean;

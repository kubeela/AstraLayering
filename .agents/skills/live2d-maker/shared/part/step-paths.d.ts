export const initialStepId: 'initial/step01';
export function groupDepth(id: string): number;
export function groupSegments(id: string): string[];
export function groupStepId(id: string, step: 1 | 2 | 3): string;
export function layerStepId(depth: number): string;
export function parentGroupId(id: string): string | undefined;

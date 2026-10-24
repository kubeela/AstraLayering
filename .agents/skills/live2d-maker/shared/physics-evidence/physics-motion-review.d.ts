export const motionReviewVersion: string;
export const motionStepBasis: string;
export class MotionStepTracker {
  constructor(canvas: {width: number; height: number}, length: number);
  maxStep: number;
  maxWorldStep: number;
  update(positions: ArrayLike<number>, pose: {x: number; y: number; angle: number}): void;
}
export function motionIssues(test: string, component: any, metric: {invalid: number;root: number;fallback: number;limited: number;peak: number;final: number;maxStep: number}, steps?: number): string[];

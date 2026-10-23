export class InochiPendulum {
  constructor(body: any);
  angle: number;
  speed: number;
  lastPivot: number[] | null;
  lastFrameAngle: number | null;
  frameAngle: number;
  frameSpeed: number;
  step(h: number): void;
  reset(): void;
  reconcile(): void;
}

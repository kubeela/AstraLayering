export class InochiPendulum {
  constructor(body: any);
  angle: number;
  speed: number;
  step(h: number): void;
  reset(): void;
  reconcile(): void;
}

export function createEnvEditor(options: {
  get(path: string): Promise<unknown>;
  post(path: string, value: { revision: string; changes: Record<string, string> }): Promise<unknown>;
  toast(message: string): void;
  render(): void;
}): {
  load(): Promise<void>;
  view(): string;
  bind(): void;
};

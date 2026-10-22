export interface TaskSelectionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function selectedTask(
  directory: string,
  tasks: ReadonlyArray<{ name: string }>,
  requested?: string | null,
  storage?: TaskSelectionStorage,
): string;

export function rememberTask(
  directory: string,
  name: string,
  storage?: TaskSelectionStorage,
): void;

export function processFileList(files: readonly string[], roots: readonly string[], versions?: Record<string, string>, folderLimit?: number, totalLimit?: number): {
  total: number; shown: number; folders: { folder: string; total: number; files: string[] }[];
};

import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const workflowsDirectory = fileURLToPath(new URL('../', import.meta.url));
export const runsDirectory = join(workflowsDirectory, '.run');
export const pipelineIds = ['part-layering', 'raster-layering', 'clothing-part-layering', 'clothing-raster-layering'] as const;
export type PipelineId = typeof pipelineIds[number];

export function taskDirectory(name: string, root = runsDirectory): string {
  if (!name || name === '.' || name === '..' || /[\\/:]/.test(name)) throw new Error('--name 必须是单个目录名。');
  return resolve(root, name);
}

export function pipelineDirectory(name: string, pipeline: PipelineId, root = runsDirectory): string {
  // The part entrypoints historically accept any single directory name. Keep
  // raster's stricter startup rule local to those pipelines when sharing paths.
  if ((pipeline === 'raster-layering' || pipeline === 'clothing-raster-layering')
    && !/^[\p{L}\p{N}][\p{L}\p{N}._-]{0,127}$/u.test(name)) {
    throw new Error('--name 必须是单个任务名，以字母或数字开头，只含字母、数字、点、下划线或短横线（最多 128 字符）。');
  }
  return join(taskDirectory(name, root), pipeline);
}

// All user-supplied input paths use the named task as their base, regardless of cwd.
export function resolveInput(name: string, path: string, root = runsDirectory): string {
  return isAbsolute(path) ? resolve(path) : resolve(taskDirectory(name, root), path);
}

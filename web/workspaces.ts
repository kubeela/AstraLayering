import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { legacyOutputDirectory } from '../.agents/skills/live2d-maker/shared/agents/workspace.ts';
import { inside, safePath } from './files.ts';

// Compatibility for existing requests. New workspaces live directly in a step;
// old ones are associated through the request, rather than guessed UI layouts.
export async function legacyWorkspaces(directory: string, files: readonly string[]): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {};
  for (const request of files.filter(path => /\/agents\/[^/]+\/request\.json$/.test(path))) {
    const workspace = request.replace(/request\.json$/, 'workspace');
    if (!files.some(path => path.startsWith(workspace + '/'))) continue;
    const value = JSON.parse(await readFile(await safePath(directory, request), 'utf8'));
    const pipeline = request.split('/agents/')[0];
    // New requests record outputDirectory task-relative; old ones hold it absolute.
    const output = value.outputDirectory ? resolve(directory, value.outputDirectory) : legacyOutputDirectory({ ...value.task, cwd: resolve(directory, pipeline) }, resolve(directory, pipeline));
    if (!inside(resolve(directory), output)) continue;
    const key = relative(directory, output).split('\\').join('/');
    (result[key] ||= []).push(workspace);
  }
  return result;
}

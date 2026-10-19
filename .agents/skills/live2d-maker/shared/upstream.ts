import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pipelineDirectory, resolveRunsDirectory, workflowsDirectory, type PipelineId } from './paths.ts';

const shellQuote = (value: string) => "'" + value.replaceAll("'", "'\"'\"'") + "'";

export function missingUpstream(name: string, pipeline: PipelineId, paths: string[], root?: string): Error {
  return new Error(`缺少上游产物：\n${paths.join('\n')}\n请先执行上游管线：\npnpm --dir ${shellQuote(workflowsDirectory)} ${pipeline} --name ${shellQuote(name)} --dir ${shellQuote(resolveRunsDirectory(root))}\n${pipeline === 'part-layering' ? '人物 part 首次运行需另提供 --image <原图路径>。\n' : ''}或将对应产物手动放置到以上具体路径，再运行当前管线。`);
}

export async function requireUpstream(name: string, pipeline: PipelineId, entries: { path: string; directory?: boolean }[], root?: string): Promise<string> {
  const directory = pipelineDirectory(name, pipeline, root), missing: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.path);
    try {
      const info = await stat(path);
      if (entry.directory ? !info.isDirectory() || !(await readdir(path)).length : !info.isFile() || info.size === 0) missing.push(path);
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') missing.push(path); else throw error; }
  }
  if (missing.length) throw missingUpstream(name, pipeline, missing, root);
  return directory;
}

export async function simplifiedCharacter(name: string, root?: string): Promise<string> {
  const directory = join(pipelineDirectory(name, 'part-layering', root), 'references');
  let names: string[] = [];
  try { names = await readdir(directory); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const matches = names.filter(file => /^simplified-subject\.(png|jpe?g|webp)$/i.test(file));
  if (matches.length > 1) throw new Error(`上游简化角色参考不唯一：${matches.map(file => join(directory, file)).join(', ')}`);
  if (!matches.length) throw missingUpstream(name, 'part-layering', [join(directory, 'simplified-subject.png')], root);
  await requireUpstream(name, 'part-layering', [{ path: `references/${matches[0]}` }], root);
  return join(directory, matches[0]);
}

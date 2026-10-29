import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { sectionDirectory, resolveRunsDirectory, workflowsDirectory, type SectionId } from './paths.ts';

const shellQuote = (value: string) => "'" + value.replaceAll("'", "'\"'\"'") + "'";

export function missingUpstream(name: string, section: SectionId, paths: string[], root?: string): Error {
  return new Error(`缺少上游产物：\n${paths.join('\n')}\n请先执行上游管线：\npnpm --dir ${shellQuote(workflowsDirectory)} ${section} --name ${shellQuote(name)} --dir ${shellQuote(resolveRunsDirectory(root))}\n${section === 'part-layering' ? '人物 part 首次运行需另提供 --image <原图路径>。\n' : ''}或将对应产物手动放置到以上具体路径，再运行当前管线。`);
}

export async function requireUpstream(name: string, section: SectionId, entries: { path: string; directory?: boolean }[], root?: string): Promise<string> {
  const directory = sectionDirectory(name, section, root), missing: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.path);
    try {
      const info = await stat(path);
      if (entry.directory ? !info.isDirectory() || !(await readdir(path)).length : !info.isFile() || info.size === 0) missing.push(path);
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') missing.push(path); else throw error; }
  }
  if (missing.length) throw missingUpstream(name, section, missing, root);
  return directory;
}

export async function simplifiedCharacter(name: string, root?: string): Promise<string> {
  const directory = await requireUpstream(name, 'part-layering', [{ path: 'references/simplified-subject.png' }], root);
  return join(directory, 'references/simplified-subject.png');
}

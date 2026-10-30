import { realpath } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { safePath, webFilePath } from './files.ts';
import { reportTargets } from '../.agents/skills/live2d-maker/shared/report-paths.ts';
import { reportReferences, reportSummary, type ReportImage } from './report-markdown.js';

export type ReportPreview = { path: string; summary: string; images: ReportImage[]; draft: boolean };
export async function reportPreview(directory: string, path: string, text: string, files: Set<string>): Promise<ReportPreview> {
  const root = resolve(directory), images: ReportImage[] = [], seen = new Set<string>();
  // Agents wrote absolute links with the task's real path; map them back when the task is opened through a symlink.
  const aliases = await realpath(root).then(real => real === root ? [] : [real], () => []);
  for (const ref of reportReferences(text)) {
    if (seen.has(ref.target)) continue;
    seen.add(ref.target);
    for (const candidate of reportTargets(root, path, ref.target, aliases)) {
      const local = webFilePath(relative(root, candidate));
      if (!files.has(local)) continue;
      try { await safePath(root, local); }
      catch { continue; }
      images.push({ target: ref.target, path: local, label: ref.label || local.split('/').at(-1)! });
      break;
    }
  }
  return { path, summary: reportSummary(text), images, draft: path.endsWith('.tmp') };
}

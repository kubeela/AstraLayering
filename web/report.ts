import { relative, resolve } from 'node:path';
import { safePath } from './files.ts';
import { reportTargets } from '../.agents/skills/live2d-maker/shared/report-paths.ts';
import { reportReferences, reportSummary, type ReportImage } from './report-markdown.js';

export type ReportPreview = { path: string; summary: string; images: ReportImage[]; draft: boolean };
export async function reportPreview(directory: string, path: string, text: string, files: Set<string>): Promise<ReportPreview> {
  const root = resolve(directory), images: ReportImage[] = [], seen = new Set<string>();
  for (const ref of reportReferences(text)) {
    if (seen.has(ref.target)) continue;
    seen.add(ref.target);
    for (const candidate of reportTargets(root, path, ref.target)) {
      const local = relative(root, candidate).split('\\').join('/');
      if (!files.has(local)) continue;
      try { await safePath(root, local); }
      catch { continue; }
      images.push({ target: ref.target, path: local, label: ref.label || local.split('/').at(-1)! });
      break;
    }
  }
  return { path, summary: reportSummary(text), images, draft: path.endsWith('.tmp') };
}

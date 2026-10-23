import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { inside, safePath } from './files.ts';
import { reportReferences, reportSummary, type ReportImage } from './report-markdown.js';

export type ReportPreview = { path: string; summary: string; images: ReportImage[]; draft: boolean };
export async function reportPreview(directory: string, path: string, text: string, files: Set<string>): Promise<ReportPreview> {
  const root = resolve(directory), images: ReportImage[] = [], seen = new Set<string>();
  for (const ref of reportReferences(text)) {
    if (seen.has(ref.target) || /^[a-z][a-z\d+.-]*:/i.test(ref.target)) continue;
    seen.add(ref.target);
    let target: string;
    try { target = decodeURIComponent(ref.target); } catch { continue; }
    let base = dirname(resolve(root, path));
    const candidates: string[] = [];
    if (isAbsolute(target)) candidates.push(target);
    else while (inside(root, base)) {
      candidates.push(resolve(base, target));
      if (base === root) break;
      base = dirname(base);
    }
    for (const candidate of candidates) {
      if (!inside(root, candidate)) continue;
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

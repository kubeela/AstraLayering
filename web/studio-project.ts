import { lstat, readFile } from "node:fs/promises";
import { createHash } from 'node:crypto';
import { studioArtifacts } from "../.agents/skills/live2d-maker/shared/studio-artifacts.ts";
import { shadowArtifacts, shadowMode } from '../.agents/skills/live2d-maker/shared/shadow.ts';
import { safePath } from "./files.ts";

export async function studioProject(
  directory: string,
  name: string,
  dir: string,
) {
  let selection: { version: number; mode: 'mask' | 'normal-depth'; sourceKraHash: string; sourceColorHash: string } | undefined;
  try {
    selection = JSON.parse(await readFile(await safePath(directory, shadowArtifacts.selection), 'utf8'));
    if (selection?.version !== 1 || !/^[a-f0-9]{64}$/.test(selection.sourceKraHash) || !/^[a-f0-9]{64}$/.test(selection.sourceColorHash)) throw Error('无效的阴影交付记录');
    shadowMode(selection.mode);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  let shadowStale = false;
  if (selection) {
    try {
      const hashes = await Promise.all([studioArtifacts.document, studioArtifacts.color].map(async path =>
        createHash('sha256').update(await readFile(await safePath(directory, path))).digest('hex')));
      shadowStale = hashes[0] !== selection.sourceKraHash || hashes[1] !== selection.sourceColorHash;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; shadowStale = true; }
  }
  const paths = selection?.mode === 'mask' && !shadowStale ? {
    ...studioArtifacts, document: shadowArtifacts.maskDocument, color: shadowArtifacts.maskColor,
  } : studioArtifacts;
  const files = Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(async ([kind, path]) => {
        // Both outputs may coexist. The last successful route controls this preview.
        if ((kind === 'normal' || kind === 'depth') && selection && (selection.mode === 'mask' || shadowStale)) {
          return [kind, { path, available: false, version: null }];
        }
        try {
          const info = await lstat(await safePath(directory, path));
          if (!info.isFile()) throw Error("项目产物不是文件：" + path);
          return [
            kind,
            {
              path,
              available: info.size > 0,
              version: `${info.mtimeMs}:${info.size}`,
            },
          ];
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          return [kind, { path, available: false, version: null }];
        }
      }),
    ),
  );
  return { name, dir, files, ...(selection ? { shadowMode: selection.mode, shadowStale } : {}) };
}

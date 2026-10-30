import { copyFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { taskRootOf, toTaskPath } from '../task-paths.ts';
import { randomUUID } from 'node:crypto';
import type { Passthrough } from './workflow.ts';
import { copyAsPng } from '../png.ts';

// Copies upstream files into the step under their delivery names, then writes
// the report; each file is replaced atomically.
export function copyDelivery(output: string, reason: string, copies: readonly (readonly [source: string, name: string])[]): Passthrough {
  return { reason, async deliver() {
    for (const [source, name] of copies) await atomically(join(output, name), temporary => (/\.png$/i.test(name) ? copyAsPng : copyFile)(source, temporary));
    const root = taskRootOf(dirname(output));
    const lines = copies.map(([source, name]) => `- \`${name}\` ← \`${toTaskPath(root, source)}\``);
    await atomically(join(output, 'report.md'), temporary => writeFile(temporary,
      `# 直接沿用上游结果\n\n${reason}，本步不调用 agent，按原样复制：\n\n${lines.join('\n')}\n`));
  } };
}

async function atomically(path: string, write: (temporary: string) => Promise<void>) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await write(temporary); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
}

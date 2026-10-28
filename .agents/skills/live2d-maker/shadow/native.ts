import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { submitJob } from '../shared/krita/bridge/client.mjs';

export type NativeResult = { success: boolean; error?: string; width: number; height: number; nativeVersion: string;
  relations: { id: string; bounds: number[]; fullPaint: string; receiver: string; clipBase: string; frames: { offset: number[]; file: string; clipped: string }[] }[] };
export type NativeInspect = (document: string, relations: any[], output: string, bridge: string, signal?: AbortSignal) => Promise<NativeResult>;

const jobScript = fileURLToPath(new URL('./native_job.py', import.meta.url));

// Runs the fixed inspection as one job in the section's own Krita (started by
// the agent through the krita tool). The job toggles and moves layers, so it
// opens a copy of the saved KRA and closes it again; documents the agent has
// open are never touched.
export const inspectNative: NativeInspect = async (document, relations, output, bridge, signal) => {
  await mkdir(output, { recursive: true });
  const script = join(output, 'inspect-job.py'), copy = join(output, 'inspected-copy.kra');
  await copyFile(document, copy);
  // A JSON string literal is also a valid Python string literal.
  await writeFile(script, `import json\nJOB = json.loads(${JSON.stringify(JSON.stringify({ document: copy, relations, output }))})\n` + await readFile(jobScript, 'utf8'));
  const outcome = await submitJob(bridge, script, { timeoutSeconds: 600, signal }).finally(() => rm(copy, { force: true }));
  await writeFile(join(output, 'native.log'), JSON.stringify(outcome, null, 2) + '\n');
  if (!outcome.ok) throw new Error('原生阴影检查脚本失败：' + [outcome.error, ...(outcome.hints ?? [])].filter(Boolean).join('\n'));
  const result = outcome.result as NativeResult | null;
  if (!result?.success) throw new Error('原生阴影检查失败：' + (result?.error ?? '没有返回结果'));
  return result;
};

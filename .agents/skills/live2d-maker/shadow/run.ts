import { parseArgs } from 'node:util';
import { lstat, mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { formatAgentError } from '../shared/codex/diagnostics.ts';
import { acquireTaskLock } from '../workflow/state.ts';
import { pipelineDirectory, taskDirectory, resolveRunsDirectory } from '../shared/paths.ts';
import { shadowMode, type ShadowMode } from '../shared/shadow.ts';
import { runWorkflow as runSharedWorkflow, type KritaPipeline, type WorkflowOptions, type Dependencies } from '../shared/raster/workflow.ts';
import { inputDirectories, isShadowInput, resolveShadowInput, shadowInputFingerprint, compatibleShadowFingerprint, fileHash, type ShadowInput } from './input.ts';
import { buildPrompt, stepsFor } from './steps.ts';
import { prepareMaps, validateDelivery } from './delivery.ts';
import { loadWorkflowEnvironment } from '../shared/codex/environment.ts';
import { prepareMaskReferences, referenceNames, referenceUrl } from './preparation.ts';
import { inspectMask } from './inspection.ts';
import type { NativeInspect } from './native.ts';

export const help = `shadow — Live2D 投影阴影或整图法线＋深度
pnpm shadow --name <任务名> --krita <可执行文件> [--dir <绝对运行根目录>]
--shadow-mode mask|normal-depth 选择分支，独立入口默认 mask。
--dry-run 只检查输入和 Krita、展示提示词，不调用模型、不写文件。
读取同名 character-assembly 的 KRA / PNG 和 simplified 参考。
mask 另读取两套 part 的分组和遮挡顺序；产物位于 shadow/<模式>/step01/。
分支独立保存 thread 和完成标记；已完成产物必须通过原尺寸、配准与绑定检查。
输入改变时保留旧分支到 .previous-* 后重新制作，不覆盖上游或另一分支。
总入口：pnpm start --name <任务名> --from shadow --to shadow --shadow-mode <模式>。
`;
export function makePipeline(mode: ShadowMode, env: NodeJS.ProcessEnv = process.env, signal?: AbortSignal, native?: NativeInspect): KritaPipeline<ShadowInput> {
  const steps = stepsFor(mode);
  return { id: 'shadow', directorySuffix: mode, steps,
    resolveInput: (name, root) => resolveShadowInput(name, root, mode), validateInput: isShadowInput,
    inputDirectories, buildPrompt,
    fingerprintInput: input => shadowInputFingerprint(input, mode, steps[0].prompt, mode === 'mask' ? referenceNames.map(referenceUrl) : []),
    compatibleInputFingerprint: (input, saved) => compatibleShadowFingerprint(input, saved, mode, steps[0].prompt, mode === 'mask' ? referenceNames.map(referenceUrl) : []),
    ...(mode === 'normal-depth' ? { prepareDelivery: async (output, input, step) => { if (step.id === 'step01') await prepareMaps(output, input); } } : { prepareStep: prepareMaskReferences }),
    validateDelivery: async (output, input, step, krita, dryRun) => {
      await validateDelivery(output, input, mode);
      if (mode === 'mask' && !dryRun) await inspectMask(output, krita.executable, env, signal, native);
    } };
}
async function atomicFile(path: string, bytes: Uint8Array | string) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = path + '.' + randomUUID() + '.tmp';
  await writeFile(tmp, bytes); await rename(tmp, path);
}
export async function runWorkflow(options: WorkflowOptions & { shadowMode?: ShadowMode }, dependencies: Dependencies & { inspectNative?: NativeInspect } = {}) {
  const mode = shadowMode(options.shadowMode), root = resolveRunsDirectory(options.dir ?? dependencies.runsDirectory);
  const environment = dependencies.environment ?? loadWorkflowEnvironment();
  if (mode === 'normal-depth' && !options.dryRun) {
    // Archive the retired step before the shared runner sees it as a descendant
    // to reset. Completed maps and their drawing session remain reusable.
    const legacy = join(pipelineDirectory(options.name, 'shadow', root), mode, 'step02');
    let info;
    try { info = await lstat(legacy); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (info) {
      if (!info.isDirectory() || info.isSymbolicLink()) throw Error('旧光照步骤目录无效：' + legacy);
      await resolveShadowInput(options.name, root, mode);
      options.signal?.throwIfAborted();
      const archive = join(dirname(legacy), 'lighting.previous-' + randomUUID());
      await rename(legacy, archive);
      options.progress?.('旧光照调校步骤已保留到 ' + archive + '；后续仅检查法线与深度。');
    }
  }
  const result = await runSharedWorkflow(makePipeline(mode, environment.codex.env, options.signal, dependencies.inspectNative), options, { ...dependencies, environment });
  if (options.dryRun) return result;
  const input = await resolveShadowInput(options.name, root, mode), output = join(pipelineDirectory(options.name, 'shadow', root), mode, 'step01');
  const selection = { version: 1, mode, sourceKraHash: await fileHash(input.characterKra),
    sourceColorHash: await fileHash(input.characterColor), updatedAt: new Date().toISOString(),
    ...(mode === 'normal-depth' ? { normalEncoding: 'rgb-xyz', normalY: 'up', depthEncoding: 'white-near-black-far', dataColorSpace: 'linear' } : {}) };
  if (mode === 'normal-depth') {
    const { readFile } = await import('node:fs/promises');
    for (const name of ['normal.png', 'depth.png']) await atomicFile(join(taskDirectory(options.name, root), 'lighting', name), await readFile(join(output, name)));
  }
  await atomicFile(join(output, 'source.json'), JSON.stringify(selection, null, 2) + '\n');
  await atomicFile(join(pipelineDirectory(options.name, 'shadow', root), 'selection.json'), JSON.stringify(selection, null, 2) + '\n');
  return result;
}
export function parseRunArguments(args: string[]) {
  const { values } = parseArgs({ args, options: { name: { type: 'string' }, dir: { type: 'string' }, krita: { type: 'string' },
    'shadow-mode': { type: 'string' }, 'dry-run': { type: 'boolean' }, help: { type: 'boolean', short: 'h' } }, allowPositionals: false });
  if (!values.help && !values.name?.trim()) throw new Error('必须提供 --name <任务名>。');
  if (values.dir !== undefined) resolveRunsDirectory(values.dir);
  return { ...values, shadowMode: shadowMode(values['shadow-mode']) };
}
if (import.meta.main) {
  (async () => {
    const args = parseRunArguments(process.argv.slice(2));
    if (args.help) { console.log(help); return; }
    const controller = new AbortController(), stop = () => controller.abort(new Error('阴影制作已中断；同名同分支续跑保留进度。'));
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    // CLI shares the coordinator lock. The coordinator calls the exported runner under its own lock.
    const release = args['dry-run'] ? undefined : await acquireTaskLock(taskDirectory(args.name!, args.dir));
    try { console.log(await runWorkflow({ name: args.name!, dir: args.dir, krita: args.krita,
      shadowMode: args.shadowMode, dryRun: args['dry-run'], signal: controller.signal, progress: console.log })); }
    finally { await release?.(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
  })().catch(error => { console.error(formatAgentError(error)); process.exitCode = 1; });
}

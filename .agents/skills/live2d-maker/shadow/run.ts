import { parseArgs } from 'node:util';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { formatAgentError } from '../shared/codex/diagnostics.ts';
import { acquireTaskLock } from '../workflow/state.ts';
import { sectionDirectory, taskDirectory, resolveRunsDirectory } from '../shared/paths.ts';
import { shadowMode, type ShadowMode } from '../shared/shadow.ts';
import { shadowStep } from '../shared/step-paths.js';
import { runWorkflow as runSharedWorkflow, type KritaSection, type WorkflowOptions, type Dependencies } from '../shared/raster/workflow.ts';
import { assemblyStep, inputDirectories, isShadowInput, resolveShadowInput, fileHash, type ShadowInput } from './input.ts';
import { buildPrompt, stepsFor } from './steps.ts';
import { prepareMaps, validateDelivery } from './delivery.ts';
import { loadWorkflowEnvironment } from '../shared/codex/environment.ts';
import { prepareMaskReferences } from './preparation.ts';
import { createInspectionTool } from './inspection.ts';

export const help = `shadow — Live2D 投影阴影或整图法线＋深度
pnpm shadow --name <任务名> --krita <可执行文件> [--dir <绝对运行根目录>]
--shadow-mode mask|normal-depth 选择本次走哪个 step01，独立入口默认 mask。
--dry-run 只检查输入和 Krita、展示提示词，不调用模型、不写文件。
读取同名 character-assembly 的 KRA / PNG、simplified 参考和两套 part 的分组与遮挡顺序；产物位于 shadow/step01_<模式>/。
两种模式共用 shadow/run.json，各自的 step01 保存 thread 和完成标记；已完成产物必须通过原尺寸、配准与绑定检查。
character-assembly 重做后 step01 随之重做。
总入口：pnpm start --name <任务名> --from shadow --to shadow --shadow-mode <模式>。
`;
export function makeSection(mode: ShadowMode): KritaSection<ShadowInput> {
  const steps = stepsFor(mode);
  return { id: 'shadow', steps,
    resolveInput: resolveShadowInput, validateInput: isShadowInput,
    inputDirectories, buildPrompt,
    upstreamStep: assemblyStep,
    ...(mode === 'normal-depth' ? { prepareDelivery: async (output, input, step) => { if (step.id === shadowStep(mode)) await prepareMaps(output, input); } } : { prepareStep: prepareMaskReferences }),
    // The mask agent inspects its own work in the section's Krita whenever it chooses.
    ...(mode === 'mask' ? { tools: (output, _input, _step, _phase, krita) => krita?.reserved ? [createInspectionTool(output, krita)] : [] } : {}),
    validateDelivery: (output, input) => validateDelivery(output, input, mode) };
}
async function atomicFile(path: string, bytes: Uint8Array | string) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = path + '.' + randomUUID() + '.tmp';
  await writeFile(tmp, bytes); await rename(tmp, path);
}
export async function runWorkflow(options: WorkflowOptions & { shadowMode?: ShadowMode }, dependencies: Dependencies = {}) {
  const mode = shadowMode(options.shadowMode), root = resolveRunsDirectory(options.dir ?? dependencies.runsDirectory);
  const environment = dependencies.environment ?? loadWorkflowEnvironment();
  const result = await runSharedWorkflow(makeSection(mode), options, { ...dependencies, environment });
  if (options.dryRun) return result;
  const input = await resolveShadowInput(options.name, root), output = join(sectionDirectory(options.name, 'shadow', root), shadowStep(mode));
  const selection = { version: 1, mode, sourceKraHash: await fileHash(input.characterKra),
    sourceColorHash: await fileHash(input.characterColor), updatedAt: new Date().toISOString(),
    ...(mode === 'normal-depth' ? { normalEncoding: 'rgb-xyz', normalY: 'up', depthEncoding: 'white-near-black-far', dataColorSpace: 'linear' } : {}) };
  if (mode === 'normal-depth') {
    const { readFile } = await import('node:fs/promises');
    for (const name of ['normal.png', 'depth.png']) await atomicFile(join(taskDirectory(options.name, root), 'lighting', name), await readFile(join(output, name)));
  }
  await atomicFile(join(output, 'source.json'), JSON.stringify(selection, null, 2) + '\n');
  await atomicFile(join(sectionDirectory(options.name, 'shadow', root), 'selection.json'), JSON.stringify(selection, null, 2) + '\n');
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
    const controller = new AbortController(), stop = () => controller.abort(new Error('阴影制作已中断；同名同模式续跑保留进度。'));
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    // CLI shares the coordinator lock. The coordinator calls the exported runner under its own lock.
    const release = args['dry-run'] ? undefined : await acquireTaskLock(taskDirectory(args.name!, args.dir));
    try { console.log(await runWorkflow({ name: args.name!, dir: args.dir, krita: args.krita,
      shadowMode: args.shadowMode, dryRun: args['dry-run'], signal: controller.signal, progress: console.log })); }
    finally { await release?.(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
  })().catch(error => { console.error(formatAgentError(error)); process.exitCode = 1; });
}

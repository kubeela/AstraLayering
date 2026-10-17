import { appendFile, mkdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runAgent, type Agent } from './agent.ts';
import { resolvePartInput } from './input.ts';
import { checkKrita, type KritaInstallation } from './krita.ts';
import { buildPrompt, steps, type StepDefinition } from './steps.ts';
import { canonicalPath, initializeRun, inspectRun, loadConfig, newConfig, resetSteps, runDirectory, saveConfig, within } from './run-store.ts';

export type WorkflowOptions = {
  name: string;
  input?: string;
  krita?: string;
  dryRun?: boolean;
  signal?: AbortSignal;
  progress?: (message: string) => void;
};
type Dependencies = {
  agent?: Agent;
  preflight?: (path: string) => Promise<KritaInstallation>;
  steps?: readonly StepDefinition[];
  runsDirectory?: string; // Test isolation only; the CLI always uses the module's .run/.
};

async function checkFiles(directory: string, files: readonly string[]): Promise<void> {
  for (const file of files) {
    const path = join(directory, file);
    try {
      const info = await stat(path);
      if (!info.isFile() || info.size === 0 || !within(directory, await realpath(path))) throw new Error('交付文件为空或位于输出目录以外');
    } catch (error) { throw new Error(`步骤尚不能完成，缺少有效交付：${file}`, { cause: error }); }
  }
}

export async function runWorkflow(options: WorkflowOptions, dependencies: Dependencies = {}): Promise<string> {
  const requested = runDirectory(options.name, dependencies.runsDirectory);
  const saved = await loadConfig(requested, options.name);
  const directory = await canonicalPath(requested);
  const definitions = dependencies.steps ?? steps;
  const plan = await inspectRun(directory, definitions);
  let source = saved?.sourceInput;
  if (!saved) {
    if (!options.input?.trim()) throw new Error('首次运行必须提供 --input <part-layering运行目录>。');
    source = await resolvePartInput(options.input);
    if (within(source.directory, directory) || within(directory, source.directory)
      || within(source.parts, directory) || within(directory, source.parts)) throw new Error('输入与任务目录必须分开，不能相同或相互包含。');
  } else if (options.input) {
    const supplied = await resolvePartInput(options.input);
    if (supplied.directory !== saved.sourceInput.directory || supplied.parts !== saved.sourceInput.parts) {
      throw new Error('该 --name 已绑定另一份输入；请为新输入使用新的 --name。');
    }
  }
  const reference = saved ? await resolvePartInput(join(directory, 'input')) : { directory: join(directory, 'input'), parts: join(directory, 'input/parts') };
  const kritaPath = options.krita ?? saved?.krita.executable;
  if (!kritaPath?.trim()) throw new Error('首次运行必须提供 --krita <已安装的 Krita 可执行文件路径>。');
  const krita = await (dependencies.preflight ?? checkKrita)(kritaPath);
  const config = saved ?? newConfig(options.name, source!, krita, definitions);
  config.krita = krita;
  for (const step of definitions) config.models[step.id] ??= { model: step.model, effort: step.effort };
  options.progress?.(`前置检查通过：Krita ${krita.version} (${krita.executable})`);
  options.progress?.(`任务目录：${directory}；输入${saved ? '副本' : '将保存到'}：${reference.directory}`);
  if (plan.resetFrom !== undefined) options.progress?.(`${options.dryRun ? '预览：将' : '将'}重置 step${String(plan.resetFrom).padStart(2, '0')} 及后续步骤，并清除旧 threadId。`);

  const previous: string[] = [];
  const previews: string[] = [];
  // Validate retained deliveries before making any reset destructive.
  for (const [index, step] of definitions.entries()) {
    if ((plan.resetFrom === undefined || index + 1 < plan.resetFrom) && plan.statuses.get(step.id) === 'completed') {
      try { await checkFiles(join(directory, step.id), step.requiredFiles); }
      catch (error) { throw new Error(`${step.id} 已标记完成但交付缺失；请恢复文件，或删除 ${step.id}/.completed 触发重跑。`, { cause: error }); }
    }
  }
  if (!options.dryRun) {
    options.signal?.throwIfAborted();
    if (!saved) await initializeRun(directory, config);
    else await saveConfig(directory, config);
    await resetSteps(directory, config, plan);
  }

  for (const [index, step] of definitions.entries()) {
    options.signal?.throwIfAborted();
    const output = join(directory, step.id);
    const status = plan.resetFrom !== undefined && index + 1 >= plan.resetFrom ? 'absent' : plan.statuses.get(step.id);
    if (status === 'completed') {
      options.progress?.(`${step.id}：.completed 已存在，跳过`);
      previous.push(output);
      continue;
    }
    const prompt = await buildPrompt(step, reference, output, krita, previous);
    const model = config.models[step.id];
    if (options.dryRun) {
      options.progress?.(`${step.id}：${status === 'running' ? '恢复未完成步骤' : '开始步骤'} (${model.model} / ${model.effort})`);
      previews.push(prompt);
      previous.push(output);
      continue;
    }
    await mkdir(output, { recursive: true });
    if (status !== 'running') await writeFile(join(output, '.running'), '', { flag: 'wx' });
    const attempt = randomUUID();
    await writeFile(join(output, 'prompt.md'), prompt);
    await appendFile(join(output, 'attempts.jsonl'), JSON.stringify({ attempt, startedAt: new Date().toISOString(), ...model, krita, threadId: config.threadId }) + '\n');
    await rm(join(output, 'result.json'), { force: true });
    await rm(join(output, 'error.txt'), { force: true });
    options.progress?.(`${step.id} ${step.title}：${config.threadId ? '继续原 thread' : '新建 thread'} (${model.model} / ${model.effort})`);
    try {
      const result = await (dependencies.agent ?? runAgent)({
        prompt, directory, ...model, threadId: config.threadId ?? undefined, signal: options.signal,
        onEvent: async event => {
          if (event.type === 'thread.started') {
            if (!event.thread_id.trim() || (config.threadId && config.threadId !== event.thread_id)) throw new Error('SDK 返回了不同的 threadId；拒绝替换当前会话。');
            config.threadId = event.thread_id;
            await saveConfig(directory, config);
          }
          await appendFile(join(output, 'events.jsonl'), JSON.stringify({ attempt, event }) + '\n');
          if (event.type === 'item.completed' && event.item.type === 'agent_message') options.progress?.(event.item.text);
          if (event.type === 'error') options.progress?.(`SDK：${event.message}`);
        },
      });
      await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
      if (result.status !== 'completed') throw new Error(`步骤未完成：${result.summary}`);
      if (!config.threadId) throw new Error('SDK 未返回 threadId，不能完成步骤。');
      await checkFiles(output, step.requiredFiles);
      options.signal?.throwIfAborted();
      await rename(join(output, '.running'), join(output, '.completed'));
      options.progress?.(`${step.id}：交付检查通过，已写入 .completed`);
      previous.push(output);
    } catch (error) {
      await writeFile(join(output, 'error.txt'), (error instanceof Error ? error.message : String(error)) + '\n');
      throw error;
    }
  }
  if (options.dryRun) return previews.join('\n\n') || '当前已定义步骤均已完成；无需调用模型。';
  return `已完成当前已定义步骤。交付目录：${previous.at(-1) ?? directory}`;
}

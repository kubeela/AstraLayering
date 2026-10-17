import { appendFile, mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { runAgent, type Agent } from './agent.ts';
import { checkKrita, type KritaInstallation } from './krita.ts';
import { buildPrompt, steps } from './steps.ts';

type StepState = { status: 'running' | 'completed' | 'blocked' | 'failed'; attempt: number; threadId?: string; message?: string };
type RunState = { version: 1; input: string; steps: Record<string, StepState> };
export type WorkflowOptions = {
  input?: string;
  output: string;
  krita: string;
  resume?: boolean;
  dryRun?: boolean;
  signal?: AbortSignal;
  progress?: (message: string) => void;
};
type Dependencies = { agent?: Agent; preflight?: (path: string) => Promise<KritaInstallation> };

function within(parent: string, path: string): boolean {
  const name = relative(parent, path);
  return name === '' || (!name.startsWith(`..${sep}`) && name !== '..' && !isAbsolute(name));
}

async function loadState(file: string): Promise<RunState | undefined> {
  let text: string;
  try { text = await readFile(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  const state = JSON.parse(text) as RunState;
  if (state.version !== 1 || typeof state.input !== 'string' || !state.steps || typeof state.steps !== 'object') {
    throw new Error(`无效的运行记录：${file}`);
  }
  return state;
}

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
  let output = resolve(options.output);
  try { output = await realpath(output); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const saved = await loadState(join(output, '.workflow/run.json'));
  if (saved && !options.resume && !options.dryRun) throw new Error('输出目录已有运行记录；请用 --resume 继续，或选择新的 --output。');
  if (options.resume && !saved) throw new Error('该输出目录没有可续跑的记录。');
  const source = options.input ?? saved?.input;
  if (!source) throw new Error('首次运行必须提供 --input 参考目录。');
  const input = await realpath(resolve(source));
  if (!(await stat(input)).isDirectory()) throw new Error('--input 必须是包含分层与补全标准的目录。');
  if (saved && input !== saved.input) throw new Error('续跑的输入目录与原记录不同；请为另一份输入选择新的 --output。');
  if (within(input, output) || within(output, input)) throw new Error('输入与输出目录必须分开，不能相同或相互包含。');

  const krita = await (dependencies.preflight ?? checkKrita)(options.krita);
  options.progress?.(`前置检查通过：Krita ${krita.version} (${krita.executable})`);
  if (options.dryRun) {
    return (await Promise.all(steps.map(step => buildPrompt(step, input, output, krita)))).join('\n\n');
  }

  await mkdir(output, { recursive: true });
  output = await realpath(output);
  if (within(input, output) || within(output, input)) throw new Error('输入与输出目录经符号链接解析后重叠。');
  const metadata = join(output, '.workflow');
  await mkdir(metadata, { recursive: true });
  const state: RunState = saved ?? { version: 1, input, steps: {} };
  const save = async () => {
    const file = join(metadata, 'run.json');
    await writeFile(`${file}.tmp`, JSON.stringify(state, null, 2) + '\n');
    await rename(`${file}.tmp`, file);
  };
  const agent = dependencies.agent ?? runAgent;
  for (const step of steps) {
    options.signal?.throwIfAborted();
    const previous = state.steps[step.id];
    if (previous?.status === 'completed') {
      try {
        await checkFiles(output, step.requiredFiles);
        options.progress?.(`${step.title}：沿用已完成交付`);
        continue;
      } catch (error) {
        previous.status = 'failed';
        previous.message = error instanceof Error ? error.message : String(error);
        options.progress?.(`${previous.message}；继续原会话补齐`);
        await save();
      }
    }
    const current: StepState = { status: 'running', attempt: (previous?.attempt ?? 0) + 1, threadId: previous?.threadId };
    state.steps[step.id] = current;
    const attempt = join(metadata, step.id, `attempt-${current.attempt}`);
    await mkdir(attempt, { recursive: true });
    const prompt = await buildPrompt(step, input, output, krita);
    await writeFile(join(attempt, 'prompt.md'), prompt);
    await writeFile(join(attempt, 'config.json'), JSON.stringify({ model: step.model, effort: step.effort, krita, threadId: current.threadId ?? null }, null, 2) + '\n');
    await save();
    options.progress?.(`${step.title}：${current.threadId ? '继续' : '开始'} (${step.model} / ${step.effort})`);
    try {
      const result = await agent({
        prompt, directory: output, model: step.model, effort: step.effort,
        threadId: current.threadId, signal: options.signal,
        onEvent: async event => {
          await appendFile(join(attempt, 'events.jsonl'), JSON.stringify(event) + '\n');
          if (event.type === 'thread.started') { current.threadId = event.thread_id; await save(); }
          if (event.type === 'item.completed' && event.item.type === 'agent_message') options.progress?.(event.item.text);
          if (event.type === 'error') options.progress?.(`SDK：${event.message}`);
        },
      });
      await writeFile(join(attempt, 'result.json'), JSON.stringify(result, null, 2) + '\n');
      current.message = result.summary;
      if (result.status === 'blocked') {
        current.status = 'blocked';
        throw new Error(`步骤未完成：${result.summary}`);
      }
      await checkFiles(output, step.requiredFiles);
      current.status = 'completed';
      await save();
    } catch (error) {
      if (current.status !== 'blocked') current.status = 'failed';
      current.message = error instanceof Error ? error.message : String(error);
      await save();
      throw error;
    }
  }
  return `已完成当前已定义步骤。交付目录：${output}`;
}

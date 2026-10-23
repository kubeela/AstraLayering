import { checkCodexCapabilities, defaultModels, loadWorkflowEnvironment, workflowCodexOptions, type WorkflowEnvironment } from './environment.ts';
import { agentCallError, formatAgentError } from './diagnostics.ts';
import { errorDetails, errorMessage } from '../agents/errors.ts';
import { toolDefinition } from './tool-config.ts';
import { workflowsDirectory } from '../paths.ts';
import { Codex, type CodexOptions, type Usage, type UserInput } from '@openai/codex-sdk';
import { join, resolve } from 'node:path';
import { AgentLog } from './agent-log.ts';
import { AgentCallError, AgentRuntime, continuationPrompt, retryableAgentError, type AgentRetry } from './agent-runtime.ts';
import { createFunctionToolSession } from './tool-agent.ts';
import type { FunctionTool } from './function-tools.ts';
import { parseAgentModel, type AgentStep, type AgentModel } from '../agents/models.ts';
import { runCliTask, unavailableSession } from '../agents/cli.ts';
import { imageGenerationTool, validateImageSelection } from '../agents/images.ts';
import { createCodexImageRoute, usesPatchedImageTool } from '../agents/codex-images.ts';
import { randomUUID } from 'node:crypto';
import type { ThreadEvent } from '@openai/codex-sdk';
import type { ImageProcessingOptions } from '../image-processing.ts';

export const agentDefaults = defaultModels.medium;

export type AgentTask = {
  step?: AgentStep;
  name: string;
  prompt: string;
  recoveryPrompt?: string;
  images?: { path: string; description: string }[];
  imageRoots?: readonly string[];
  imageGeneration?: boolean;
  outputSchema?: Record<string, unknown>;
  timeoutMs?: number;
  cwd?: string;
  tools?: FunctionTool[];
  sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
};

export type GeneratedImage = { savedPath: string };
export type AgentResult = {
  text: string; images: GeneratedImage[]; threadId?: string | null; logDirectory?: string; harness?: AgentModel['harness'];
};
export type AgentSession = {
  run(task: AgentTask, signal?: AbortSignal): Promise<AgentResult>;
  close(): Promise<void>;
};
export type AgentOptions = CodexOptions & {
  imageNormalization?: ImageProcessingOptions;
  resumeHarness?: AgentModel['harness'];
  onSessionStarted?: (id: string, harness: AgentModel['harness']) => Promise<void>;
  selectedModel?: AgentModel;
  onEvent?: (event: ThreadEvent) => Promise<void>;
  onRetry?: (retry: AgentRetry) => Promise<void> | void;
  onThreadReplacement?: (oldId: string, reason: string) => Promise<void>;
  environment?: WorkflowEnvironment;
  cwd?: string;
  progress?: (message: string) => void;
  logDirectory?: string;
  agentConcurrency?: number;
  toolsDirectory?: string;
  runtime?: AgentRuntime;
};

export class CodexAgents {
  private options: AgentOptions;
  private runtime: AgentRuntime;

  constructor(options: AgentOptions = {}) {
    const environment = options.environment ?? loadWorkflowEnvironment(options.env);
    this.options = { ...options, ...workflowCodexOptions(environment, options), environment };
    this.runtime = options.runtime ?? new AgentRuntime(options.agentConcurrency);
  }

  private async invoke<T>(task: AgentTask, signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
    return this.runtime.run(operation, { signal, onRetry: async ({ attempt, nextAttempt, delayMs, error }) => {
      const failure = error as AgentCallError;
      this.options.progress?.(`[${task.name}] 临时服务错误；${delayMs / 1000} 秒后第 ${nextAttempt} 次尝试，沿用会话与已有产物：${failure.message}`);
      if (failure.logDirectory) await AgentLog.retry(failure.logDirectory,
        { attempt, nextAttempt, delayMs, error: failure.message });
      await this.options.onRetry?.({ attempt, nextAttempt, delayMs, error });
    } });
  }

  // 延续原生 function tools 会话；每次 run 是同一 thread 的一个新 turn。
  private createCodexSession(selectedModel?: AgentModel, resumeThreadId?: string): AgentSession {
    const sessionOptions = { ...this.options, ...(selectedModel ? { selectedModel } : {}), onEvent: async (event: ThreadEvent) => {
      if (event.type === 'thread.started') await this.options.onSessionStarted?.(event.thread_id, 'codex');
      await this.options.onEvent?.(event);
    } };
    let session: AgentSession | undefined;
    let route: Awaited<ReturnType<typeof createCodexImageRoute>> | undefined;
    let imageModel: string | undefined;
    let id = resumeThreadId;
    const functionOptions = () => ({ ...sessionOptions,
      env: { ...sessionOptions.env, ...route?.env } });
    const closing = new AbortController();
    let closed = false, busy = false;
    return {
      run: async (task, externalSignal) => {
        if (this.options.toolsDirectory && task.tools) task = { ...task, tools: task.tools.map(tool => ({ ...tool, ...toolDefinition(tool.name, this.options.toolsDirectory) })) };
        await checkCodexCapabilities(this.options.environment!, this.options);
        if (closed) throw new Error('会话已关闭');
        if (busy) throw new Error('同一会话不能并发运行');
        busy = true;
        const signal = taskSignal(task, [closing.signal, ...(externalSignal ? [externalSignal] : [])]);
        let interrupted = false;
        const savedImages = new Set<string>();
        try {
          const nextImage = usesPatchedImageTool(this.options.environment!, task.step)
            ? this.options.environment!.stepImages[task.step!] : undefined;
          if (nextImage !== imageModel) {
            await session?.close(); session = undefined;
            await route?.close(); route = undefined;
            if (nextImage) route = await createCodexImageRoute(this.options.environment!, task.step!,
              join(this.options.logDirectory || join(task.cwd || this.options.cwd!, 'agents'), 'generated'), this.options, closing.signal, this.options.imageNormalization);
            imageModel = nextImage;
          }
          session ||= createFunctionToolSession(functionOptions(), id);
          return await this.invoke(task, signal, async () => {
            try {
              const result = await session!.run(interrupted ? { ...task,
                prompt: continuationPrompt([...savedImages]), images: undefined } : task, signal);
              id = result.threadId || id;
              for (const image of result.images) savedImages.add(image.savedPath);
              return { ...result, images: [...savedImages].map(savedPath => ({ savedPath })) };
            } catch (error) {
              if (retryableAgentError(error) && !signal.aborted) {
                const failure = error as AgentCallError;
                id = failure.threadId || id;
                for (const path of failure.savedImagePaths) savedImages.add(path);
                interrupted = !!failure.threadId;
                if (failure.sessionBroken) {
                  await session!.close();
                  session = createFunctionToolSession(functionOptions(), failure.threadId);
                }
              }
              throw error;
            }
          });
        } finally { busy = false; }
      },
      close: async () => {
        closed = true;
        closing.abort(new Error('会话已结束'));
        try { await session?.close(); } finally { await route?.close(); }
      },
    };
  }

  createSession(resumeThreadId?: string, callbacks?: Pick<AgentOptions, 'resumeHarness' | 'onEvent' | 'onSessionStarted' | 'onThreadReplacement'>): AgentSession {
    if (callbacks) return new CodexAgents({ ...this.options, ...callbacks, runtime: this.runtime }).createSession(resumeThreadId);
    let inner: AgentSession | undefined, selection: AgentModel | undefined, id = resumeThreadId, closed = false;
    let busy = false;
    const closing = new AbortController();
    return {
      run: async (original, externalSignal) => {
        if (closed) throw new Error('会话已关闭');
        if (busy) throw new Error('同一会话不能并发运行');
        busy = true;
        try {
          const settings = this.options.environment!;
          const selected = this.options.selectedModel || (original.step ? settings.stepModels[original.step]
            : parseAgentModel(`${settings.models.medium.model}-${settings.models.medium.effort}`, '默认模型'));
          if (original.step) validateImageSelection(settings, original.step);
          if ((selection?.harness || this.options.resumeHarness) && (selection?.harness || this.options.resumeHarness) !== selected.harness) {
            if (id) await this.options.onThreadReplacement?.(id, '模型配置切换到其他 CLI');
            id = undefined;
          }
          if (selection && JSON.stringify(selection) !== JSON.stringify(selected)) { await inner?.close(); inner = undefined; }
          selection = selected;
          const generated: GeneratedImage[] = [];
          const image = original.step && selected.harness !== 'codex' ? imageGenerationTool(settings, original.step,
            join(this.options.logDirectory || join(original.cwd || this.options.cwd!, 'agents'), 'generated', randomUUID()),
            [original.cwd || this.options.cwd!, ...(original.imageRoots || []), ...(original.images || []).map(i => i.path)], this.options.imageNormalization) : undefined;
          if (image) {
            const execute = image.execute;
            image.execute = async (args, signal) => {
              const result = await execute(args, signal);
              for (const item of result.contentItems) if (item.type === 'inputText') {
                const value = JSON.parse(item.text); if (value.savedPath) generated.push({ savedPath: value.savedPath });
              }
              return result;
            };
          }
          let task = image ? { ...original, imageGeneration: false, tools: [...original.tools || [], image] }
            : usesPatchedImageTool(settings, original.step) ? { ...original, imageGeneration: true } : original;
          if (!id && original.recoveryPrompt) task = { ...task, prompt: original.recoveryPrompt };
          const signal = taskSignal(task, [closing.signal, ...(externalSignal ? [externalSignal] : [])]);
          let replaced = false;
          for (;;) {
            try {
              let result: AgentResult;
              if (selected.harness === 'codex') {
                inner ||= this.createCodexSession(selected, id);
                result = await inner.run(task, signal);
              } else {
                let interrupted = false;
                result = await this.invoke(task, signal, async () => {
                  try { return await runCliTask(interrupted ? { ...task, prompt: continuationPrompt(generated.map(i => i.savedPath)), images: undefined } : task,
                    selected, settings, { ...this.options, onEvent: async event => {
                      if (event.type === 'thread.started') await this.options.onSessionStarted?.(event.thread_id, selected.harness);
                      await this.options.onEvent?.(event);
                    } }, signal, id); }
                  catch (error) {
                    if (error instanceof AgentCallError && error.threadId) { id = error.threadId; interrupted = true; }
                    throw error;
                  }
                });
              }
              id = result.threadId || id;
              return { ...result, harness: selected.harness, images: [...result.images, ...generated] };
            } catch (error) {
              if (!replaced && id && unavailableSession(error)) {
                await this.options.onThreadReplacement?.(id, '原 thread/session 不可用');
                this.options.progress?.(`[${task.name}] 原会话不可用，保留旧记录与产物并新建会话。`);
                id = undefined; await inner?.close(); inner = undefined; replaced = true;
                if (original.recoveryPrompt) task = { ...task, prompt: original.recoveryPrompt };
                continue;
              }
              if (error instanceof AgentCallError && error.threadId) id = error.threadId;
              throw error;
            }
          }
        } finally { busy = false; }
      },
      close: async () => { closed = true; closing.abort(new Error('会话已结束')); await inner?.close(); },
    };
  }

  async run(task: AgentTask): Promise<AgentResult> {
    const selected = this.options.selectedModel || (task.step ? this.options.environment!.stepModels[task.step] : undefined);
    if (task.step) validateImageSelection(this.options.environment!, task.step);
    if (task.tools?.length || selected?.harness !== undefined && selected.harness !== 'codex'
      || task.step && this.options.environment!.stepImages[task.step] && this.options.environment!.stepImages[task.step] !== 'codex-native') {
      const session = this.createSession();
      try { return await session.run(task); }
      finally { await session.close(); }
    }
    await checkCodexCapabilities(this.options.environment!, this.options);
    const { cwd, progress, logDirectory, config, agentConcurrency: _concurrency, runtime: _runtime, toolsDirectory: _tools, environment, ...options } = this.options;
    const workingDirectory = resolve(task.cwd ?? cwd ?? workflowsDirectory);
    const codex = new Codex({
      ...options,
      config: {
        ...config,
        features: {
          image_generation: task.imageGeneration ?? false,
          shell_tool: false, unified_exec: false, multi_agent: false, memories: false,
        },
      },
    });
    const threadOptions = {
      skipGitRepoCheck: true,
      model: selected?.model || environment!.models.medium.model, modelReasoningEffort: selected?.effort || environment!.models.medium.effort,
      workingDirectory,
      sandboxMode: task.sandboxMode ?? 'read-only', approvalPolicy: 'never', webSearchMode: 'disabled',
    } as const;
    const thread = codex.startThread(threadOptions);
    const signal = taskSignal(task);
    const savedImages = new Set<string>();
    let interrupted = false;
    return this.invoke(task, signal, async () => {
      const attemptTask = interrupted && thread.id ? { ...task,
        prompt: continuationPrompt([...savedImages]), images: undefined } : task;
      try { return await runSdkAttempt(attemptTask); }
      catch (error) {
        if (error instanceof AgentCallError) {
          interrupted = true;
          for (const path of error.savedImagePaths) savedImages.add(path);
        }
        throw error;
      }
    });

    async function runSdkAttempt(task: AgentTask): Promise<AgentResult> {
      const input: UserInput[] = [{ type: 'text', text: task.prompt }];
      for (const image of task.images ?? []) {
        input.push({ type: 'text', text: image.description });
        input.push({ type: 'local_image', path: resolve(image.path) });
      }
      const timeoutMs = task.timeoutMs;
      const log = await AgentLog.create(resolve(logDirectory ?? join(workingDirectory, '.run/agents')), task.name, {
        task: { ...task, timeoutMs: timeoutMs ?? null }, input,
        // Persist the exact prompt sent by the SDK, without credentials or environment variables.
        prompt: input.filter(item => item.type === 'text').map(item => item.text).join('\n\n'),
        threadOptions, sessionThreadId: thread.id,
      });
      progress?.(`开始：${task.name}；记录：${log.directory}`);
      let finalResponse = '';
      let usage: Usage | null = null;
      let completed = false;
      let lastError: unknown;
      try {
        const { events } = await thread.runStreamed(input, {
          outputSchema: task.outputSchema,
          signal,
        });
        for await (const event of events) {
          const description = await log.record(event);
          if (description) progress?.(`[${task.name}] ${description}`);
          if (event.type === 'item.completed' && event.item.type === 'agent_message') {
            finalResponse = event.item.text;
          } else if (event.type === 'item.completed') {
            const item = event.item as unknown as Record<string, unknown>;
            if (['image_generation', 'imageGeneration'].includes(String(item.type)) && typeof item.savedPath === 'string') {
              savedImages.add(resolve(workingDirectory, item.savedPath));
            }
          } else if (event.type === 'turn.completed') {
            completed = true;
            usage = event.usage;
          } else if (event.type === 'turn.failed') {
            throw agentCallError(event.error, 'Codex 回合失败');
          } else if (event.type === 'error') {
            // CLI 的内置重连也会发出 error。等待终态，不能提前切断它的重试。
            lastError = event;
          }
        }
        if (!completed) throw lastError ? agentCallError(lastError, 'Codex 事件流未完成') : new Error(`${task.name} 的事件流结束，但未收到 turn.completed`);
        const images: GeneratedImage[] = [];
        if (task.imageGeneration) {
          const output = JSON.parse(finalResponse) as { savedPath?: unknown; error?: unknown };
          if (typeof output.error === 'string' && output.error) throw new Error(`${task.name}：${output.error}`);
          if (typeof output.savedPath !== 'string' || !output.savedPath.trim()) {
            throw new Error(`${task.name} 没有返回生成图片的 savedPath`);
          }
          images.push({ savedPath: resolve(workingDirectory, output.savedPath) });
        }
        for (const image of images) savedImages.add(image.savedPath);
        await log.finish({ status: 'completed', threadId: thread.id, usage, finalResponse, images });
        progress?.(`agent 回合结束：${task.name}`);
        return { text: finalResponse, images: [...savedImages].map(savedPath => ({ savedPath })), threadId: thread.id, logDirectory: log.directory };
      } catch (error) {
        const message = errorMessage(error, String(error));
        const reported = error instanceof AgentCallError ? error : new AgentCallError(message,
          completed || signal.aborted ? 'localError' : undefined, { cause: error });
        reported.details ??= errorDetails(error);
        if (lastError) reported.details = { terminal: reported.details, notification: errorDetails(lastError) };
        await log.finish({ status: 'failed', threadId: thread.id, usage, finalResponse, error: message,
          errorDetails: reported.details,
          images: [...savedImages].map(savedPath => ({ savedPath })) });
        progress?.(`失败：${task.name}；${message}；记录：${log.directory}`);
        reported.logDirectory = log.directory;
        reported.threadId = thread.id ?? undefined;
        reported.finalResponse = finalResponse;
        reported.savedImagePaths = [...savedImages];
        progress?.(formatAgentError(reported));
        throw reported;
      }
    }
  }
}

function taskSignal(task: AgentTask, signals: AbortSignal[] = []): AbortSignal {
  return AbortSignal.any([...signals, ...(task.timeoutMs === undefined ? [] : [AbortSignal.timeout(task.timeoutMs)])]);
}

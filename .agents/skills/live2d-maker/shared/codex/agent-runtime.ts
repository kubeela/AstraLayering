import {renderPromptFile} from '../prompts/render.ts';
import { setTimeout as delay } from 'node:timers/promises';
import { fromTaskPath } from '../task-paths.ts';

export const defaultAgentConcurrency = 3;
// Retry n waits about initial * 2^(n-1): 5 s doubling up to 2560 s on the tenth; after that the call fails.
export const retryDelays = { initial: 5_000, retries: 10 } as const;

export class AgentCallError extends Error {
  readonly info?: unknown;
  details?: unknown;
  logDirectory?: string;
  threadId?: string;
  threadPath?: string;
  finalResponse?: string;
  savedImagePaths: string[] = [];
  sessionBroken = false;
  constructor(message: string, info?: unknown, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AgentCallError';
    this.info = info;
  }
}

const imageBlocked = /image (?:processing |input )?blocked|blocked due to content policy|content[\s_-]*policy[\s_-]*violation/i;
// 内容策略拦截图片：重连只会重发同一张图，要换掉历史里的图片再继续。
export function blockedAgentError(error: unknown): boolean {
  const seen = new Set<unknown>();
  for (let current = error; current instanceof Error && !seen.has(current); current = current.cause) {
    seen.add(current);
    if (imageBlocked.test(current.message)) return true;
  }
  return false;
}

// Structured codes whose meaning is a temporary channel or capacity failure.
const retryableCodes = new Set(['serverOverloaded', 'internalServerError', 'rateLimitExceeded', 'responseStreamDisconnected',
  'responseStreamConnectionFailed', 'httpConnectionFailed', 'responseTooManyFailedAttempts', 'apiError', 'processKilled', 'transportTimeout']);

const errorCode = (info: unknown) => typeof info === 'string' ? info : info && typeof info === 'object' ? Object.keys(info)[0] : undefined;
const httpStatus = (info: unknown, code: string) => info && typeof info === 'object' ? (info as Record<string, any>)[code]?.httpStatusCode : undefined;

export function retryableAgentError(error: unknown): boolean {
  // 只按调用通道给出的结构化错误码判断；没有错误码的错误（本地校验、工具、文件、模型回复）一律不重试。
  if (!(error instanceof AgentCallError) || blockedAgentError(error)) return false;
  const info = error.info;
  const code = errorCode(info);
  if (!code || !retryableCodes.has(code)) return false;
  // 文本只能否决重试、不能触发重试：结构化 429 也可能是额度耗尽或单次输入图数上限，重试要等很久。
  if (/quota|usage limit|credits|billing|spend limit|unauthori[sz]ed|authentication|context.*(?:length|window)|invalid.*(?:request|input)/i.test(error.message)) return false;
  const imageCountLimit = /too many (?:input )?images|(?:maximum|max|limit).{0,30}\b\d+\b.{0,12}images|\bimages?\b.{0,20}(?:limit|maximum)/i.test(error.message);
  const throughputLimit = /\brate[\s_-]*limit\b|\bper\s+(?:second|minute|hour|day)\b/i.test(error.message);
  if (imageCountLimit && (!throughputLimit || /\bper\s+request\b/i.test(error.message))) return false;
  const status = httpStatus(info, code);
  // 401/403/400 等不是重连就能解决的问题；429、5xx 和无 HTTP 状态的断流才重试。
  return status == null ? code !== 'apiError' : status === 429 || (status >= 500 && status <= 599);
}

// A retryable 429: the service is throttling. Every retryable error waits the same way and the page shows
// 限流等待; this only names the reason.
export function rateLimitedAgentError(error: unknown): boolean {
  if (!(error instanceof AgentCallError)) return false;
  const code = errorCode(error.info);
  return code === 'rateLimitExceeded' || !!code && httpStatus(error.info, code) === 429;
}

export type AgentRetry = { attempt: number; nextAttempt: number; delayMs: number; error: unknown; rateLimited: boolean };
type Waiter = { start(): void; cancel(): void };

// Agent slots shared by every pipeline process of one task. The total scheduler
// installs them in its pipeline workers, so concurrent pipelines together run at
// most jobs agents; each AgentRuntime still applies its own limit first.
export type AgentSlots = (signal?: AbortSignal) => Promise<() => void>;
let sharedSlots: AgentSlots | undefined;
export function shareAgentSlots(slots: AgentSlots | undefined) { sharedSlots = slots; }

// 只管理 agent 调用与临时错误，不依赖 group、步骤、树或 progress.json。
export class AgentRuntime {
  private active = 0;
  private waiting: Waiter[] = [];
  readonly concurrency: number;
  private wait: (ms: number, signal?: AbortSignal) => Promise<void>;
  private random: () => number;
  constructor(
    concurrency = defaultAgentConcurrency,
    wait: (ms: number, signal?: AbortSignal) => Promise<void> = async (ms, signal) => { await delay(ms, undefined, { signal }); },
    // Jitter source, 0 to 1; tests pin it.
    random: () => number = Math.random,
  ) {
    if (!Number.isSafeInteger(concurrency) || concurrency < 1) throw new Error('agentConcurrency 必须是正整数');
    this.concurrency = concurrency;
    this.wait = wait;
    this.random = random;
  }

  private acquire(signal?: AbortSignal): Promise<() => void> {
    signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        start: () => {
          signal?.removeEventListener('abort', waiter.cancel);
          this.active++;
          let released = false;
          resolve(() => {
            if (released) return;
            released = true;
            this.active--;
            this.dispatch();
          });
        },
        cancel: () => {
          this.waiting = this.waiting.filter(item => item !== waiter);
          reject(signal?.reason);
        },
      };
      this.waiting.push(waiter);
      signal?.addEventListener('abort', waiter.cancel, { once: true });
      this.dispatch();
    });
  }

  private dispatch() {
    while (this.active < this.concurrency && this.waiting.length) this.waiting.shift()!.start();
  }

  async run<T>(
    operation: (attempt: number) => Promise<T>,
    options: { signal?: AbortSignal; onRetry?(retry: AgentRetry): Promise<void> | void } = {},
  ): Promise<T> {
    const local = await this.acquire(options.signal);
    let shared: (() => void) | undefined;
    // Without a shared pool the operation starts in the same turn as before.
    try { if (sharedSlots) shared = await sharedSlots(options.signal); }
    catch (error) { local(); throw error; }
    // The slots stay held through backoff until the call succeeds, fails or is cancelled. Handing them back let a queued call start in the gap, so
    // under 429 the groups of one layer took turns instead of finishing one by one.
    try {
      for (let attempt = 1; ; attempt++) {
        let error: unknown;
        try {
          options.signal?.throwIfAborted();
          return await operation(attempt);
        } catch (caught) {
          options.signal?.throwIfAborted();
          if (!retryableAgentError(caught) || attempt > retryDelays.retries) throw caught;
          error = caught;
        }
        // Equal jitter: half the step is fixed, half random, so calls that failed together do not retry together.
        const step = retryDelays.initial * 2 ** (attempt - 1);
        const delayMs = Math.round(step / 2 + this.random() * step / 2);
        await options.onRetry?.({ attempt, nextAttempt: attempt + 1, delayMs, error, rateLimited: rateLimitedAgentError(error) });
        await this.wait(delayMs, options.signal);
      }
    } finally { shared?.(); local(); }
  }
}

export const interruptedTaskPrompt = renderPromptFile(new URL('../prompts/interrupted-task.md',import.meta.url)).trim();

// With the task root, saved images are shown absolute like every other path.
export function continuationPrompt(savedImagePaths: string[], taskPrompt: string, root?: string): string {
  if (root) savedImagePaths = savedImagePaths.map(path => fromTaskPath(root, path));
  return renderPromptFile(new URL('../prompts/continuation.md',import.meta.url), {
    interrupted_task:interruptedTaskPrompt,
    task_prompt:taskPrompt,
    saved_images_context:savedImagePaths.length?renderPromptFile(new URL('../prompts/continuation-images.md',import.meta.url),{saved_image_paths:savedImagePaths.join('\n')}):'',
  }).trimEnd();
}

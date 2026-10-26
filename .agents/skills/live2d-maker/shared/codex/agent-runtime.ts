import {renderPromptFile} from '../prompts/render.ts';
import { setTimeout as delay } from 'node:timers/promises';

export const defaultAgentConcurrency = 3;
export const retryDelays = { initial: 5_000, maximum: 60_000 } as const;

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

export function retryableAgentError(error: unknown): boolean {
  // 只处理调用通道报告的错误，不能把绘图/工具/文件校验异常当成服务过载。
  if (!(error instanceof AgentCallError) || blockedAgentError(error)) return false;
  // Even a structured 429 can describe exhausted credit or an input image cap.
  if (/quota|usage limit|credits|billing|spend limit|unauthori[sz]ed|authentication|context.*(?:length|window)|invalid.*(?:request|input)/i.test(error.message)) return false;
  const imageCountLimit = /too many (?:input )?images|(?:maximum|max|limit).{0,30}\b\d+\b.{0,12}images|\bimages?\b.{0,20}(?:limit|maximum)/i.test(error.message);
  const throughputLimit = /\brate[\s_-]*limit\b|\bper\s+(?:second|minute|hour|day)\b/i.test(error.message);
  // A service's image rate limit is temporary; a per-request input cap is not.
  if (imageCountLimit && (!throughputLimit || /\bper\s+request\b/i.test(error.message))) return false;
  const info = error.info;
  const code = typeof info === 'string' ? info : info && typeof info === 'object' ? Object.keys(info)[0] : undefined;
  if (code) {
    if (['serverOverloaded', 'server_overloaded', 'server_is_overloaded', 'serverError', 'internalServerError',
      'responseStreamDisconnected', 'responseStreamConnectionFailed', 'httpConnectionFailed', 'responseTooManyFailedAttempts', 'rateLimitExceeded'].includes(code)) {
      const detail = info && typeof info === 'object' ? (info as Record<string, any>)[code] : undefined;
      const status = detail?.httpStatusCode;
      // 401/403/400 等不是重连就能解决的问题；429、5xx 和无 HTTP 状态的断流才重试。
      return status == null || status === 429 || (status >= 500 && status <= 599);
    }
    if (code !== 'other') return false;
  }
  // SDK 流错误只提供 message；先排除需要用户处理的认证、额度和输入错误。
  return /selected model is at capacity|server.*overload|currently experiencing high demand|service unavailable|\b50[0234]\b|stream disconnected|stream idle timeout|websocket.*closed|ECONNRESET|ETIMEDOUT|timeout awaiting response headers|EAI_AGAIN|fetch failed|too many requests|rate limit exceeded/i.test(error.message);
}

export type AgentRetry = { attempt: number; nextAttempt: number; delayMs: number; error: unknown };
type Waiter = { start(): void; cancel(): void };

// 只管理 agent 调用与临时错误，不依赖 group、步骤、树或 progress.json。
export class AgentRuntime {
  private active = 0;
  private waiting: Waiter[] = [];
  readonly concurrency: number;
  private wait: (ms: number, signal?: AbortSignal) => Promise<void>;
  constructor(
    concurrency = defaultAgentConcurrency,
    wait: (ms: number, signal?: AbortSignal) => Promise<void> = async (ms, signal) => { await delay(ms, undefined, { signal }); },
  ) {
    if (!Number.isSafeInteger(concurrency) || concurrency < 1) throw new Error('agentConcurrency 必须是正整数');
    this.concurrency = concurrency;
    this.wait = wait;
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
    for (let attempt = 1; ; attempt++) {
      const release = await this.acquire(options.signal);
      let error: unknown;
      try {
        options.signal?.throwIfAborted();
        return await operation(attempt);
      } catch (caught) {
        options.signal?.throwIfAborted();
        if (!retryableAgentError(caught)) throw caught;
        error = caught;
      } finally { release(); }
      const delayMs = Math.min(retryDelays.initial * 2 ** Math.min(attempt - 1, 4), retryDelays.maximum);
      await options.onRetry?.({ attempt, nextAttempt: attempt + 1, delayMs, error });
      await this.wait(delayMs, options.signal);
    }
  }
}

export const interruptedTaskPrompt = renderPromptFile(new URL('../prompts/interrupted-task.md',import.meta.url)).trim();

export function continuationPrompt(savedImagePaths: string[], taskPrompt: string): string {
  return renderPromptFile(new URL('../prompts/continuation.md',import.meta.url), {
    interrupted_task:interruptedTaskPrompt,
    task_prompt:taskPrompt,
    saved_images_context:savedImagePaths.length?renderPromptFile(new URL('../prompts/continuation-images.md',import.meta.url),{saved_image_paths:savedImagePaths.join('\n')}):'',
  }).trimEnd();
}

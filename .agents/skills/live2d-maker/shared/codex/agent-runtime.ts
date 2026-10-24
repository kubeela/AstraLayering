import {renderPromptFile} from '../prompts/render.ts';
import { setTimeout as delay } from 'node:timers/promises';

export const defaultAgentConcurrency = 3;
export const retryDelays = { initial: 5_000, maximum: 60_000 } as const;

export class AgentCallError extends Error {
  readonly info?: unknown;
  details?: unknown;
  logDirectory?: string;
  threadId?: string;
  finalResponse?: string;
  savedImagePaths: string[] = [];
  sessionBroken = false;
  constructor(message: string, info?: unknown, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AgentCallError';
    this.info = info;
  }
}

// 调用失败分三类，先排除不可恢复的，再认定临时故障：
// - blocked：上游内容审查拒绝图片（经 LiteLLM 透传补丁可见）。常以 stream disconnected 开头，
//   但原会话重放同一批历史图片只会再被拒；不在此重试，交调用方决定（零件轮廓会清理产物后换新会话）。
// - fatal：认证、额度、请求/上下文、单次请求的图片数与体积上限，以及本地工具、绘图和文件校验异常。直接报错。
//   图片数与体积本由 patches 的压缩保护在发包前控制；仍被上游拒绝说明预算与上游不符，原样重发不会通过。
// - transient：容量、5xx、429 速率限制与断流。AgentRuntime 在原会话内退避重试。
export type AgentErrorKind = 'transient' | 'blocked' | 'fatal';

const contentBlocked = /image (?:processing |input )?blocked|blocked due to content policy|content[\s_-]*policy[\s_-]*violation/i;
// 即使带 429/5xx 状态，也可能是额度耗尽、认证失败或输入本身有误。
const accountOrInput = /quota|usage limit|credits|billing|spend limit|unauthori[sz]ed|authentication|context.*(?:length|window)|invalid.*(?:request|input)/i;
const imageCount = /too many (?:input )?images|(?:maximum|max|limit).{0,30}\b\d+\b.{0,12}images|\bimages?\b.{0,20}(?:limit|maximum)/i;
const requestSize = /request[\s_-]*(?:entity[\s_-]*)?too[\s_-]*large|payload too large|(?:maximum|max|exceeds?|limit).{0,30}\b\d+(?:\.\d+)?\s*(?:MiB|MB)\b/i;
const throughput = /\brate[\s_-]*limit\b|\bper\s+(?:second|minute|hour|day)\b/i;
const transientCodes = new Set(['serverOverloaded', 'server_overloaded', 'server_is_overloaded', 'serverError', 'internalServerError',
  'responseStreamDisconnected', 'responseStreamConnectionFailed', 'httpConnectionFailed', 'responseTooManyFailedAttempts', 'rateLimitExceeded']);
// SDK 流错误只提供 message。
const transientMessage = /selected model is at capacity|server.*overload|currently experiencing high demand|service unavailable|\b50[0234]\b|stream disconnected|stream idle timeout|websocket.*closed|ECONNRESET|ETIMEDOUT|timeout awaiting response headers|EAI_AGAIN|fetch failed|too many requests|rate limit exceeded/i;

function causeMessages(error: unknown): string[] {
  const texts: string[] = [];
  for (let current = error, depth = 0; current && depth < 5; current = (current as { cause?: unknown }).cause, depth++) {
    texts.push(current instanceof Error ? current.message : String(current));
  }
  return texts;
}

export function agentErrorKind(error: unknown): AgentErrorKind {
  // 步骤层可能再包一层错误，审查拒绝沿 cause 链识别。
  if (causeMessages(error).some(text => contentBlocked.test(text))) return 'blocked';
  // 只信任调用通道报告的错误，不把绘图、工具或文件校验异常当成服务过载。
  if (!(error instanceof AgentCallError)) return 'fatal';
  const { message, info } = error;
  if (accountOrInput.test(message)) return 'fatal';
  // 服务的图片速率限制会过去，单次请求的图片数量与体积上限不会；后者常以 stream disconnected 开头。
  if (requestSize.test(message)) return 'fatal';
  if (imageCount.test(message) && (!throughput.test(message) || /\bper\s+request\b/i.test(message))) return 'fatal';
  const code = typeof info === 'string' ? info : info && typeof info === 'object' ? Object.keys(info)[0] : undefined;
  if (code && code !== 'other') {
    if (!transientCodes.has(code)) return 'fatal';
    const status = typeof info === 'object' ? (info as Record<string, { httpStatusCode?: number } | undefined>)[code]?.httpStatusCode : undefined;
    // 400/401/403 等重连无法解决；429、5xx 和无 HTTP 状态的断流才重试。
    return status == null || status === 429 || (status >= 500 && status <= 599) ? 'transient' : 'fatal';
  }
  return transientMessage.test(message) ? 'transient' : 'fatal';
}

export const retryableAgentError = (error: unknown) => agentErrorKind(error) === 'transient';

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

export function continuationPrompt(savedImagePaths: string[]): string {
  return renderPromptFile(new URL('../prompts/continuation.md',import.meta.url), {
    interrupted_task:interruptedTaskPrompt,
    saved_images_context:savedImagePaths.length?renderPromptFile(new URL('../prompts/continuation-images.md',import.meta.url),{saved_image_paths:savedImagePaths.join('\n')}):'',
  }).trimEnd();
}

import { AgentCallError } from './agent-runtime.ts';

type AgentContext = { text?: string; threadId?: string | null; logDirectory?: string };

export function agentOutcomeError(message: string, context: AgentContext = {}, cause?: unknown): AgentCallError {
  const error = new AgentCallError(message, 'localError', cause === undefined ? undefined : { cause });
  error.finalResponse = context.text;
  error.threadId = context.threadId ?? undefined;
  error.logDirectory = context.logDirectory;
  return error;
}

export async function validateAgentOutcome<T>(context: AgentContext, validate: () => T | Promise<T>): Promise<T> {
  try { return await validate(); }
  catch (error) { throw agentOutcomeError(error instanceof Error ? error.message : String(error), context, error); }
}

export function formatAgentError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const contexts: AgentCallError[] = [];
  const seen = new Set<unknown>();
  for (let current = error; current instanceof Error && !seen.has(current); current = current.cause) {
    seen.add(current);
    if (current instanceof AgentCallError) contexts.push(current);
  }
  const last = contexts.find(context => context.finalResponse?.trim());
  const thread = contexts.find(context => context.threadId)?.threadId;
  const log = contexts.find(context => context.logDirectory)?.logDirectory;
  return [message, ...(last ? [`模型最后消息：\n${last.finalResponse}`] : []),
    ...(thread ? [`threadId：${thread}`] : []), ...(log ? [`调用记录：${log}`] : [])].join('\n');
}

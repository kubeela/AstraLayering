import { checkCodexCapabilities, loadWorkflowEnvironment, workflowCodexOptions, type WorkflowEnvironment, type ModelSelection } from '../codex/environment.ts';
import { agentOutcomeError } from '../codex/diagnostics.ts';
import { Codex, type Thread, type ThreadEvent, type ThreadOptions } from '@openai/codex-sdk';
import type { FunctionTool } from '../codex/function-tools.ts';
import { fileURLToPath } from 'node:url';
import { AgentCallError, AgentRuntime, continuationPrompt, type AgentRetry } from '../codex/agent-runtime.ts';

export type StepResult = { status: 'completed' | 'blocked'; summary: string };
export type AgentRequest = {
  prompt: string;
  directory: string;
  model: string;
  effort: ModelSelection['effort'];
  environment?: WorkflowEnvironment;
  threadId?: string;
  signal?: AbortSignal;
  onEvent: (event: ThreadEvent) => Promise<void>;
  onRetry?: (retry: AgentRetry) => Promise<void> | void;
};
export type Agent = (request: AgentRequest) => Promise<StepResult>;
type Client = {
  startThread(options: ThreadOptions): Pick<Thread, 'runStreamed'>;
  resumeThread(id: string, options: ThreadOptions): Pick<Thread, 'runStreamed'>;
};

export async function runAgent(request: AgentRequest, client?: Client, runtime = new AgentRuntime(1)): Promise<StepResult> {
  // Keep the configured login and tool providers; enable the native image tool.
  const environment = request.environment ?? loadWorkflowEnvironment();
  if (!client) await checkCodexCapabilities(environment);
  const codex = client ?? new Codex(workflowCodexOptions(environment, { config: rasterCodexConfig() }));
  const options: ThreadOptions = {
    model: request.model,
    modelReasoningEffort: request.effort,
    workingDirectory: request.directory,
    skipGitRepoCheck: true,
    sandboxMode: 'danger-full-access',
    approvalPolicy: 'never',
  };
  const thread = request.threadId ? codex.resumeThread(request.threadId, options) : codex.startThread(options);
  let threadId = request.threadId;
  const savedImages = new Set<string>();
  return runtime.run(async attempt => {
    let text = '', completed = false, lastError = '';
    try {
      const { events } = await thread.runStreamed(attempt > 1 && threadId ? continuationPrompt([...savedImages]) : request.prompt, {
        signal: request.signal,
        outputSchema: {
          type: 'object', additionalProperties: false,
          properties: { status: { type: 'string', enum: ['completed', 'blocked'] }, summary: { type: 'string' } },
          required: ['status', 'summary'],
        },
      });
      for await (const event of events) {
        if (event.type === 'thread.started') {
          if (!event.thread_id.trim() || (threadId && threadId !== event.thread_id)) {
            throw new AgentCallError('重试返回了不同的 threadId', 'localError');
          }
          threadId = event.thread_id;
        }
        try { await request.onEvent(event); }
        catch (error) { throw new AgentCallError(error instanceof Error ? error.message : String(error), 'localError', { cause: error }); }
        if (event.type === 'item.completed') {
          const item = event.item as unknown as Record<string, unknown>;
          if (['image_generation', 'imageGeneration'].includes(String(item.type)) && typeof item.savedPath === 'string') savedImages.add(item.savedPath);
        }
        if (event.type === 'item.completed' && event.item.type === 'agent_message') text = event.item.text;
        if (event.type === 'error') lastError = event.message; // The CLI may still reconnect.
        if (event.type === 'turn.failed') throw new AgentCallError(event.error.message);
        if (event.type === 'turn.completed') completed = true;
      }
      if (!completed) throw new AgentCallError(lastError || 'response stream disconnected：未收到 turn.completed');
    } catch (error) {
      const reported = error instanceof AgentCallError ? error : new AgentCallError(error instanceof Error ? error.message : String(error), undefined, { cause: error });
      reported.threadId = threadId;
      reported.finalResponse = text;
      throw reported;
    }
    let result: unknown;
    try { result = JSON.parse(text); }
    catch (error) { throw agentOutcomeError('模型回合已结束，但没有返回有效的步骤结果 JSON。', { text, threadId }, error); }
    if (!result || typeof result !== 'object' || !('status' in result) || !('summary' in result)
      || typeof result.status !== 'string' || !['completed', 'blocked'].includes(result.status) || typeof result.summary !== 'string' || !result.summary.trim()) {
      throw agentOutcomeError('步骤未返回有效的完成或受阻说明', { text, threadId });
    }
    return result as StepResult;
  }, { signal: request.signal, onRetry: request.onRetry });
}

// Drawing agents use the configured filesystem and image tools directly.
export function rasterCodexConfig() {
  return { features: { image_generation: true } };
}

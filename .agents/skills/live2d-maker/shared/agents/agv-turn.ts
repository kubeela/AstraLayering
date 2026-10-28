type Step = { state: string; type: string; text: string };

// agy's result includes errors from earlier turns and retries in this turn.
// The streamed user_input boundary and following steps describe this turn.
export class AgvTurn {
  private boundary?: number;
  private steps = new Map<number, Step>();
  private protocolError = false;

  record(event: Record<string, any>): string | undefined {
    if (event.error || event.event === 'error') this.protocolError = true;
    const update = event.step_update;
    if (!update || !Number.isSafeInteger(update.step_index)) return;
    const index = update.step_index;
    if (update.step_type === 'user_input' && update.state === 'DONE') {
      if (this.boundary === undefined) this.boundary = index;
      else if (index !== this.boundary) this.protocolError = true; // One input per CLI invocation.
      return;
    }
    if (this.boundary === undefined || index <= this.boundary) return;
    const previous = this.steps.get(index);
    const step = { state: update.state, type: update.step_type,
      text: (previous?.text || '') + (typeof update.text_delta === 'string' ? update.text_delta : '') };
    this.steps.set(index, step);
    if (step.type === 'agent_response' && step.state === 'DONE' && step.text) return step.text;
  }

  recoveredError(result: Record<string, any>, conversationId: string | undefined): boolean {
    if (!conversationId || result.conversation_id !== conversationId || result.status !== 'ERROR'
      || result.is_error || this.boundary === undefined || this.protocolError || !this.steps.size) return false;
    const response = this.completedResponse;
    if (!response || typeof result.response !== 'string') return false;
    // Some CLI versions return only the final response; others concatenate all
    // visible replies in this turn, including progress messages before a retry.
    const aggregate = [...this.steps].sort((a, b) => a[0] - b[0])
      .filter(([, step]) => step.type === 'agent_response').map(([, step]) => step.text).join('');
    return result.response.trim() === response.trim() || result.response.trim() === aggregate.trim();
  }

  get completedResponse(): string | undefined {
    if (this.boundary === undefined || this.protocolError || !this.steps.size) return;
    const steps = [...this.steps].sort((a, b) => a[0] - b[0]);
    if (steps.some(([, step]) => step.state !== 'DONE')) return;
    // A schema response can be followed by the CLI's completed finish event.
    // Other trailing tools or errors still mean that the reply is not final.
    while (steps.at(-1)?.[1].type === 'finish') steps.pop();
    const last = steps.at(-1)?.[1];
    if (last?.type === 'agent_response' && last.text.trim()) return last.text;
  }

  // Steps of this turn other than replies, errors and the finish marker: the tool calls it made.
  get toolSteps(): number {
    return [...this.steps.values()].filter(step => !['agent_response', 'error_message', 'finish'].includes(step.type)).length;
  }

  get userStepIndex(): number | undefined { return this.boundary; }
  get recoveredErrorStepIndices(): number[] {
    return [...this.steps].filter(([, step]) => step.type === 'error_message').map(([index]) => index);
  }
}

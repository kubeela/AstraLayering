type Step = { state: string; type: string; text: string };

// agy 1.3.5's result summarizes the whole conversation, including old errors.
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

  historicalError(result: Record<string, any>, resumed: string | undefined): boolean {
    if (!resumed || result.conversation_id !== resumed || result.status !== 'ERROR'
      || result.is_error || this.boundary === undefined || this.protocolError || !this.steps.size) return false;
    const steps = [...this.steps.entries()];
    if (steps.some(([, step]) => step.state !== 'DONE' || step.type === 'error_message')) return false;
    const last = steps.reduce((a, b) => a[0] > b[0] ? a : b)[1];
    return last.type === 'agent_response' && !!last.text.trim()
      && typeof result.response === 'string' && result.response.trim() === last.text.trim();
  }

  get userStepIndex(): number | undefined { return this.boundary; }
}

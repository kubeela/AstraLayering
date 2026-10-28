export class BridgeError extends Error {}
export type BridgeResult = { id: string; ok: boolean; result?: unknown; stdout?: string; stderr?: string; error?: string;
  hints?: string[]; dialogs?: { title: string; class: string }[]; seconds?: number };
export function submitJob(bridge: string, script: string, options?: { timeoutSeconds?: number; signal?: AbortSignal }): Promise<BridgeResult>;

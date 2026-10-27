export type ToolContent =
  | { type: 'inputText'; text: string }
  | { type: 'inputImage'; imageUrl: string };

export type ToolResult = { contentItems: ToolContent[]; success: boolean };

export type FunctionTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  // Stage restrictions also apply after section-specific tool definitions load.
  omitParameters?: readonly string[];
  execute(argumentsValue: unknown, signal: AbortSignal,
    context?: { directory: string; outputDirectory: string; workspace: string }): Promise<ToolResult>;
};

export function textResult(value: unknown): ToolResult {
  return { success: true, contentItems: [{ type: 'inputText', text: JSON.stringify(value) }] };
}

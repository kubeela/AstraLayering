import { readFile } from 'node:fs/promises';
import { renderPromptFile } from '../prompts/render.ts';

// Content-policy image blocks. The turn fails at once (no reconnects) and every
// later turn in the same thread would resend the image, so the agent continues
// in a new thread whose history has the offending images replaced with text.
type Content = { type?: string; text?: string; image_url?: string; file_id?: string };
type Item = { type?: string; role?: string; content?: Content[]; output?: unknown; call_id?: string; name?: string;
  arguments?: string; input?: string };
type Image = { item: Item; index: number; field: 'content' | 'output'; origin: string };
export type BlockedImages = { items: Item[]; origins: string[] };

const modelOutputs = new Set(['reasoning', 'function_call', 'custom_tool_call', 'local_shell_call', 'tool_search_call',
  'web_search_call', 'image_generation_call']);
const modelOutput = (item: Item) => modelOutputs.has(item.type!) || item.type === 'message' && item.role === 'assistant';
// The next thread adds its own instructions and environment context.
const threadContext = (item: Item) => item.type === 'message' && (item.role === 'developer'
  || item.role === 'user' && !!item.content?.some(part => part.type === 'input_text' && part.text?.startsWith('<environment_context>')));

// The model-visible history as Codex rebuilds it: compaction replaces what came before.
export function rolloutHistory(rollout: string): Item[] {
  let items: Item[] = [];
  for (const line of rollout.split('\n')) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line) as { type?: string; payload?: any };
    if (entry.type === 'response_item') items.push(entry.payload);
    else if (entry.type === 'compacted') items = entry.payload?.replacement_history
      ?? [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: String(entry.payload?.message ?? '') }] }];
  }
  return items.filter(item => !threadContext(item));
}

function images(items: Item[]): Image[] {
  const calls = new Map(items.filter(item => item.call_id && item.name).map(item => [item.call_id!, item]));
  const found: Image[] = [];
  for (const item of items) {
    const field = Array.isArray(item.content) ? 'content' : Array.isArray(item.output) ? 'output' : undefined;
    if (!field) continue;
    const parts = item[field] as Content[];
    parts.forEach((part, index) => {
      if (part?.type !== 'input_image') return;
      const call = item.call_id ? calls.get(item.call_id) : undefined;
      const tag = parts[index - 1]?.type === 'input_text' ? /<image\b[^>]*\bpath="([^"]*)"/.exec(parts[index - 1].text ?? '') : null;
      const origin = call ? `工具 ${call.name} 的返回（参数：${call.arguments ?? call.input ?? ''}）`
        : tag ? `输入图片 ${tag[1]}` : '输入图片';
      found.push({ item, index, field, origin });
    });
  }
  return found;
}

// The batch is what the model was given since its last output; when that holds
// no image, every image still in history is a candidate. Returns undefined when
// the history has no image at all: then the block is fatal.
export function replaceBlockedImages(rollout: string): BlockedImages | undefined {
  const items = rolloutHistory(rollout).map(item => structuredClone(item));
  const last = items.findLastIndex(modelOutput);
  const all = images(items);
  const recent = all.filter(image => items.indexOf(image.item) > last);
  const batch = recent.length ? recent : all;
  if (!batch.length) return undefined;
  for (const image of batch) (image.item[image.field] as Content[])[image.index] = { type: 'input_text',
    text: renderPromptFile(new URL('../prompts/image-blocked-placeholder.md', import.meta.url), { origin: image.origin }).trimEnd() };
  return { items, origins: batch.map(image => image.origin) };
}

export async function readBlockedImages(rolloutPath: string): Promise<BlockedImages | undefined> {
  return replaceBlockedImages(await readFile(rolloutPath, 'utf8'));
}

export function blockedImagesPrompt({ origins }: BlockedImages): string {
  const stop = renderPromptFile(new URL('../prompts/image-blocked-stop.md', import.meta.url)).trimEnd();
  const list = origins.map(origin => `- ${origin}`).join('\n');
  return (origins.length > 1
    ? renderPromptFile(new URL('../prompts/image-blocked-multiple.md', import.meta.url), { count: String(origins.length), images: list, stop })
    : renderPromptFile(new URL('../prompts/image-blocked-single.md', import.meta.url), { images: list, stop })).trimEnd();
}

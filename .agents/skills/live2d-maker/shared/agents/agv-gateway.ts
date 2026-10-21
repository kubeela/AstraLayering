import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, realpath } from 'node:fs/promises';
import { relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { FunctionTool } from '../codex/function-tools.ts';

const helper = fileURLToPath(new URL('./agv-tool.ts', import.meta.url));
const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
const resultMarker = /ASTRA_TOOL_RESULT:([^\s"'\\]+)/;
export async function prepareGenaiTools(body: any, tools: readonly FunctionTool[], logsRoot: string) {
  // Keep all native tools and append the exact workflow descriptions and schemas.
  body.tools ||= [];
  const registered = new Set(body.tools.flatMap((t: any) => (t.functionDeclarations || t.function_declarations || []).map((f: any) => f.name)));
  const added = tools.filter(t => !registered.has(t.name));
  if (added.length) body.tools.push({ functionDeclarations: added.map(({ name, description, inputSchema }) => ({ name, description, parameters: inputSchema })) });
  const root = await realpath(logsRoot);
  for (const content of body.contents || []) {
    const parts = [];
    for (const part of content.parts || []) {
      const call = part.functionCall || part.function_call;
      if (call?.name === 'run_command' && call.args?.CommandLine?.includes(quote(helper))) {
        try {
          const input = JSON.parse(Buffer.from(call.args.CommandLine.trim().split(/\s+/).at(-1), 'base64url').toString());
          if (typeof input.name === 'string') {
            parts.push({ ...part, [part.functionCall ? 'functionCall' : 'function_call']: { ...call, name: input.name, args: input.arguments } });
            continue;
          }
        } catch {}
      }
      const response = part.functionResponse || part.function_response;
      const marker = response && resultMarker.exec(JSON.stringify(response.response));
      if (marker) {
        const path = await realpath(marker[1]);
        const rel = relative(root, path);
        if (!rel || rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('工具结果不在任务记录目录内');
        const { name, result } = JSON.parse(await readFile(path, 'utf8'));
        const images = (result.content || []).filter((p: any) => p.type === 'image').map((p: any) => ({ inlineData: { mimeType: p.mimeType, data: p.data } }));
        parts.push({ functionResponse: { ...response, name, response: { output: (result.content || []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n'),
          isError: !!result.isError }, ...(images.length ? { parts: images } : {}) } });
        continue;
      }
      parts.push(part);
    }
    content.parts = parts;
  }
}
export function rewriteGenaiTools(event: any, tools: readonly FunctionTool[]) {
  for (const candidate of event.candidates || []) for (const part of candidate.content?.parts || []) {
    const key = part.functionCall ? 'functionCall' : part.function_call ? 'function_call' : undefined;
    if (!key || !tools.some(t => t.name === part[key].name)) continue;
    const call = part[key];
    const encoded = Buffer.from(JSON.stringify({ name: call.name, arguments: call.args || {}, invocation: randomUUID() })).toString('base64url');
    part[key] = { ...call, name: 'run_command', args: { CommandLine: `${quote(process.execPath)} ${quote(helper)} ${encoded}`,
      WaitMsBeforeAsync: 10000, toolSummary: `Call ${call.name}` } };
  }
  return event;
}

export async function genaiGateway(env: NodeJS.ProcessEnv, tools: readonly FunctionTool[], logsRoot: string, signal: AbortSignal,
  inputImages: readonly { path: string; description: string }[] = [], workspace = '') {
  if (!env.AGY_LLM_GATEWAY_URL || env.AGY_LLM_GATEWAY_WIRE_PROTOCOL !== 'genai') return;
  const images = await Promise.all(inputImages.map(async image => {
    const bytes = await readFile(image.path);
    return { inlineData: { mimeType: bytes[0] === 0xff ? 'image/jpeg' : 'image/png', data: bytes.toString('base64') } };
  }));
  const upstream = env.AGY_LLM_GATEWAY_URL.replace(/\/+$/, '');
  const controllers = new Set<AbortController>();
  const server = createServer(async (req, res) => {
    const controller = new AbortController(); controllers.add(controller);
    res.once('close', () => controller.abort());
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (body.contents) await prepareGenaiTools(body, tools, logsRoot);
      // agy's stream-json currently accepts text only. On a configured GenAI
      // gateway attach the originals to this turn's user message directly.
      for (const content of body.contents || []) if (content.role === 'user' && content.parts?.some((p: any) => p.text?.includes(workspace))) {
        content.parts.push(...images); break;
      }
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([key, value]) => !['host', 'content-length', 'connection'].includes(key) && typeof value === 'string')) as Record<string, string>;
      const response = await fetch(upstream + req.url, { method: req.method, headers, body: JSON.stringify(body), signal: AbortSignal.any([signal, controller.signal]) });
      res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' });
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        let pending = ''; const decoder = new TextDecoder();
        const emit = (line: string) => {
          if (line.startsWith('data:') && line.slice(5).trim() !== '[DONE]') line = 'data: ' + JSON.stringify(rewriteGenaiTools(JSON.parse(line.slice(5)), tools));
          res.write(line + '\n');
        };
        for await (const chunk of response.body!) {
          pending += decoder.decode(chunk, { stream: true }); let index;
          while ((index = pending.indexOf('\n')) >= 0) { emit(pending.slice(0, index)); pending = pending.slice(index + 1); }
        }
        pending += decoder.decode(); if (pending) emit(pending);
      } else {
        const text = await response.text();
        res.write(response.ok ? JSON.stringify(rewriteGenaiTools(JSON.parse(text), tools)) : text);
      }
      res.end();
    } catch (error) {
      if (!res.headersSent) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: String(error).replaceAll(env.AGY_LLM_GATEWAY_API_KEY || '\0', '[redacted]') } })); }
      else res.destroy();
    } finally { controllers.delete(controller); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    async close() { for (const controller of controllers) controller.abort(); server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); } };
}

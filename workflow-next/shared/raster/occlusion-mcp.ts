import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { isAbsolute } from 'node:path';
import { createOcclusionTools } from './occlusion-tools.ts';

// Launched only by this invocation's Codex config; no global server installation.
// Upstream scope comes from the workflow, never from the model's tool arguments.
export async function serveOcclusion(upstream: string, editable: boolean) {
  if (!isAbsolute(upstream)) throw new Error('MCP upstream must be an absolute path');
  const tools = createOcclusionTools(upstream, editable);
  const signal = new AbortController().signal;
  const send = (message: unknown) => process.stdout.write(JSON.stringify(message) + '\n');
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    let message: { id?: string | number | null; method: string; params?: Record<string, any> };
    try { message = JSON.parse(line); }
    catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON' } }); continue; }
    if (message.id === undefined) continue;
    const reply = (result: unknown) => send({ jsonrpc: '2.0', id: message.id, result });
    if (message.method === 'initialize') {
      reply({ protocolVersion: message.params?.protocolVersion ?? '2024-11-05', capabilities: { tools: {} },
        serverInfo: { name: 'astra-layering-occlusion', version: '1.0.0' } });
    } else if (message.method === 'ping') reply({});
    else if (message.method === 'tools/list') reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    else if (message.method === 'tools/call') {
      try {
        const tool = tools.find(tool => tool.name === message.params?.name);
        if (!tool) throw new Error('此阶段未提供该深度工具');
        const result = await tool.execute(message.params?.arguments ?? {}, signal);
        reply({ content: result.contentItems.map(item => {
          if (item.type !== 'inputText') throw new Error('Unexpected non-text occlusion result');
          return { type: 'text', text: item.text };
        }), isError: !result.success });
      } catch (error) {
        reply({ content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true });
      }
    } else send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Unknown method' } });
  }
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { upstream: { type: 'string' }, editable: { type: 'boolean' } } });
  if (!values.upstream) throw new Error('缺少上游目录');
  await serveOcclusion(values.upstream, values.editable ?? false);
}

import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { FunctionTool } from '../codex/function-tools.ts';

export async function createMcpBridge(tools: readonly FunctionTool[], signal: AbortSignal,
  record?: (event: any) => Promise<unknown>) {
  const token = randomBytes(24).toString('hex'), byName = new Map(tools.map(t => [t.name, t]));
  const server = createServer(async (req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end(); return; }
    let message: any;
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      message = JSON.parse(Buffer.concat(chunks).toString());
      if (message.id === undefined) { res.writeHead(202); res.end(); return; }
      let result: unknown;
      if (message.method === 'initialize') result = { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'layering', version: '1' } };
      else if (message.method === 'tools/list') result = { tools: [...byName.values()].map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
      else if (message.method === 'ping') result = {};
      else if (message.method === 'tools/call') {
        const tool = byName.get(message.params.name); if (!tool) throw new Error('未注册的工具');
        let value;
        try { value = await tool.execute(message.params.arguments, signal); }
        catch (error) { value = { success: false, contentItems: [{ type: 'inputText' as const, text: String(error) }] }; }
        result = { isError: !value.success, content: value.contentItems.map(i => i.type === 'inputText' ? { type: 'text', text: i.text } :
          { type: 'image', mimeType: i.imageUrl.slice(5, i.imageUrl.indexOf(';')), data: i.imageUrl.slice(i.imageUrl.indexOf(',') + 1) }) };
        await record?.({ method: 'layering/tool', params: { name: tool.name, arguments: message.params.arguments, success: value.success } });
      } else throw new Error('不支持的 MCP 请求');
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }));
    } catch (error) {
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ jsonrpc: '2.0', id: message?.id, error: { code: -32603, message: String(error) } }));
    }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const env = { LAYERING_MCP_URL: `http://127.0.0.1:${(server.address() as { port: number }).port}`, LAYERING_MCP_TOKEN: token };
  return { env, config: { command: process.execPath, args: [fileURLToPath(new URL('./mcp-stdio.ts', import.meta.url))], env },
    async close() { server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); } };
}

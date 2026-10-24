import { createServer } from 'node:http';
import { once } from 'node:events';
import { gatewayRequestUrl } from '../../shared/agents/agv-gateway.ts';
import { VisualContext, readVisualSummary, visualErrorStatus } from '../shared/visual-context.ts';

// An opt-in transport wrapper; authentication headers remain owned by Claude.
// Requests and native SSE are forwarded unchanged unless image protection acts.
export async function claudeGateway(upstream: string, context: VisualContext, signal: AbortSignal,
  redact: (value: string) => string = value => value) {
  const controllers = new Set<AbortController>();
  const server = createServer(async (req, res) => {
    const controller = new AbortController(); controllers.add(controller);
    res.once('close', () => controller.abort());
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks), target = gatewayRequestUrl(upstream, req.url ?? '/');
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([key, value]) =>
        !['host', 'content-length', 'connection'].includes(key) && typeof value === 'string')) as Record<string, string>;
      let body: string | Buffer = bytes;
      if (/\/messages(?:\/count_tokens)?$/.test(target.pathname)) {
        const original = JSON.parse(bytes.toString());
        const prepared = await context.prepare(original, async summary => {
          const url = new URL(target); url.pathname = url.pathname.replace(/\/count_tokens$/, '');
          summary.max_tokens ??= 8192;
          return readVisualSummary(await fetch(url, { method: 'POST', headers, body: JSON.stringify(summary),
            signal: AbortSignal.any([signal, controller.signal]) }), 'anthropic');
        });
        body = JSON.stringify(prepared);
      }
      const response = await fetch(target, { method: req.method, headers,
        ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body: typeof body === 'string' ? body : new Uint8Array(body) }), signal: AbortSignal.any([signal, controller.signal]) });
      const responseHeaders = Object.fromEntries([...response.headers.entries()].filter(([key]) =>
        !['content-length', 'content-encoding', 'transfer-encoding', 'connection'].includes(key)));
      res.writeHead(response.status, responseHeaders); res.flushHeaders();
      for await (const chunk of response.body ?? []) {
        if (!res.write(chunk)) await Promise.race([once(res, 'drain'), once(res, 'close')]);
      }
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        const status = visualErrorStatus(error);
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ type: 'error', error: { type: status === 413 ? 'request_too_large' : status < 500 ? 'invalid_request_error' : 'api_error', message: redact(String(error)) } }));
      } else res.destroy();
    } finally { controllers.delete(controller); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    async close() { for (const controller of controllers) controller.abort(); server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); } };
}

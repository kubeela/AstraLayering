import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createMcpBridge } from '../agents/mcp.ts';
import { genaiGateway, prepareGenaiTools, rewriteGenaiTools } from '../agents/agv-gateway.ts';
import { toolDefinition } from '../codex/tool-config.ts';

test('agv gateway retains original function schema, arguments, signatures, text and every returned image across turns', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agv-bridge-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const results = join(root, '.run/case/agents/turn/bridge-results'); await mkdir(results, { recursive: true });
  const images = ['first-image', 'second-image'].map(s => Buffer.from(s).toString('base64'));
  let calls = 0;
  const args = { svg: '<svg>原始文本</svg>' };
  const tool = { name: 'fixture_render', description: '保留工具说明', inputSchema: { type: 'object', properties: { svg: { type: 'string' } }, required: ['svg'] },
    async execute(input: unknown) {
      assert.deepEqual(input, args); calls++;
      return { success: true, contentItems: [{ type: 'inputText' as const, text: '原始结果说明' },
        ...images.map(data => ({ type: 'inputImage' as const, imageUrl: `data:image/png;base64,${data}` }))] };
    } };
  const bridge = await createMcpBridge([tool], new AbortController().signal);
  t.after(() => bridge.close());
  const request = { tools: [{ functionDeclarations: [{ name: 'run_command' }] }], contents: [{ role: 'user', parts: [{ text: '完整任务提示词' }] }] };
  await prepareGenaiTools(request, [tool], root);
  assert.deepEqual(request.tools[1].functionDeclarations[0], { name: tool.name, description: tool.description, parametersJsonSchema: tool.inputSchema });
  assert.equal(request.contents[0].parts[0].text, '完整任务提示词');
  const event = rewriteGenaiTools({ candidates: [{ content: { parts: [{ thoughtSignature: 'retain-signature', functionCall: { name: tool.name, args } }] } }] }, [tool]);
  const part = event.candidates[0].content.parts[0], encoded = part.functionCall.args.CommandLine.split(' ').at(-1);
  assert.equal(part.thoughtSignature, 'retain-signature');
  const output = await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../agents/agv-tool.ts', import.meta.url)), encoded],
    { env: { ...process.env, ...bridge.env, LAYERING_BRIDGE_RESULTS: results } });
  const file = output.stdout.trim().slice('ASTRA_TOOL_RESULT:'.length);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).name, tool.name);
  const next: any = { contents: [{ role: 'model', parts: [part] }, { role: 'user', parts: [{ functionResponse: { id: 'function-id', name: 'run_command', response: { output: output.stdout } } }] }] };
  // Later stages need to restore history even when the image/drawing tool is no longer registered.
  await prepareGenaiTools(next, [], root);
  assert.deepEqual(next.contents[0].parts[0].functionCall, { name: tool.name, args });
  const response = next.contents[1].parts[0].functionResponse;
  assert.equal(response.id, 'function-id'); assert.equal(response.name, tool.name);
  assert.equal(response.response.output, '原始结果说明');
  assert.deepEqual(response.parts.map((p: any) => p.inlineData.data), images);
  assert.equal(calls, 1);
});

test('agv HTTP gateway sends the real grouping union schema as JSON Schema and retains native declarations', async t => {
  const root = await mkdtemp(join(tmpdir(), 'agv-schema-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const definition = toolDefinition('write_groups');
  const tool = { ...definition, async execute() { throw new Error('not called'); } };
  const schema = definition.inputSchema as any;
  assert.deepEqual(schema.properties.groups.items.properties.note.type, ['string', 'null']);
  let received: any;
  const upstream = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    received = JSON.parse(Buffer.concat(chunks).toString());
    const declarations = received.tools.flatMap((entry: any) => entry.functionDeclarations || []);
    const group = declarations.find((entry: any) => entry.name === definition.name);
    // Model the Google protobuf rejection that stopped the first grouping call.
    if (group?.parameters) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Schema.type cannot start list' })); return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [
      { functionCall: { name: definition.name, args: { groups: [{ id: 'hair', name: '头发', note: null }] } } },
    ] } }] }));
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  t.after(() => { upstream.closeAllConnections(); upstream.close(); });
  const gateway = await genaiGateway({ AGY_LLM_GATEWAY_URL: `http://127.0.0.1:${(upstream.address() as { port: number }).port}`,
    AGY_LLM_GATEWAY_WIRE_PROTOCOL: 'genai' }, [tool], root, new AbortController().signal);
  assert.ok(gateway); t.after(() => gateway.close());
  const native = { name: 'run_command', parameters: { type: 'OBJECT', properties: { CommandLine: { type: 'STRING' } } } };
  const prompt = '本次真实分组提示词';
  const response = await fetch(gateway.url + '/models/gemini-4-argon:generateContent', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      tools: [{ functionDeclarations: [native] }], contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }) });
  assert.equal(response.status, 200);
  assert.deepEqual(received.tools[0].functionDeclarations, [native]);
  const declaration = received.tools[1].functionDeclarations[0];
  assert.deepEqual(declaration.parametersJsonSchema, definition.inputSchema);
  assert.equal(Object.hasOwn(declaration, 'parameters'), false);
  assert.equal(declaration.description, definition.description);
  assert.equal(received.contents[0].parts[0].text, prompt);
  const result: any = await response.json();
  const call = result.candidates[0].content.parts[0].functionCall;
  assert.equal(call.name, 'run_command');
  const input = JSON.parse(Buffer.from(call.args.CommandLine.split(' ').at(-1), 'base64url').toString());
  assert.equal(input.name, definition.name);
  assert.equal(input.arguments.groups[0].note, null);
});

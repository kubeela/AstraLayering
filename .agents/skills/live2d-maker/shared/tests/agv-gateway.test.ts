import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createMcpBridge } from '../agents/mcp.ts';
import { prepareGenaiTools, rewriteGenaiTools } from '../agents/agv-gateway.ts';

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
  assert.deepEqual(request.tools[1].functionDeclarations[0], { name: tool.name, description: tool.description, parameters: tool.inputSchema });
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

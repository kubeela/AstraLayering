import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import sharp from 'sharp';
import { loadWorkflowEnvironment } from '../codex/environment.ts';
import { modelHarnesses, stepDefaults, imageSteps, parseAgentModel } from '../agents/models.ts';
import { imageGenerationTool, validateImageSelection } from '../agents/images.ts';
import { cliExecutable, runCliTask } from '../agents/cli.ts';
import { CodexAgents } from '../codex/agents.ts';
import { AgentRuntime } from '../codex/agent-runtime.ts';
import { runAgent } from '../raster/agent.ts';
import { pipelineAgentSteps } from '../agents/preflight.ts';

async function fixture(t: { after(callback: () => Promise<unknown>): void }) {
  const root = await mkdtemp(join(tmpdir(), 'step-models-'));
  t.after(() => rm(root, { recursive: true, force: true })); return root;
}

test('all enumerated models and efforts resolve to their harness; step overrides remain independent', async t => {
  for (const [id, harness] of Object.entries(modelHarnesses)) for (const effort of ['low', 'medium', 'high', 'xhigh']) {
    assert.deepEqual(parseAgentModel(`${id}-${effort}`, 'fixture'), { model: id, harness, effort });
  }
  assert.throws(() => parseAgentModel('gemini-4-argon-max', 'fixture'));
  assert.throws(() => parseAgentModel('unlisted-high', 'fixture'));
  assert.throws(() => parseAgentModel('constructor-high', 'fixture'));
  const root = await fixture(t);
  await writeFile(join(root, '.env'), 'layering_part_outline_review_model=gemini-4-argon-high\nlayering_clothing_outline_review_model=claude-sonnet-5.5-low\n');
  const settings = loadWorkflowEnvironment({ layering_part_outline_review_model: 'claude-haiku-5.5-medium' }, root);
  assert.equal(settings.stepModels.part_outline_review.model, 'claude-haiku-5.5');
  assert.equal(settings.stepModels.clothing_outline_review.model, 'claude-sonnet-5.5');
  assert.equal(settings.stepModels.part_outline.model, 'gpt-6.1-sol');
  assert.equal(settings.stepModels.raster_step01.model, 'gpt-6-astra');
  assert.equal(Object.keys(settings.stepModels).length, Object.keys(stepDefaults).length);
  assert.ok(!pipelineAgentSteps('clothing-part-layering').some(step => step.startsWith('clothing_raster_')));
  assert.ok(!pipelineAgentSteps('part-layering').includes('part_standardize'));
  assert.ok(pipelineAgentSteps('part-layering', true).includes('part_standardize'));
});

test('native imagegen forbids non-Codex image steps; text-only review can select agv', async t => {
  const root = await fixture(t);
  const settings = loadWorkflowEnvironment({ layering_part_simplify_model: 'gemini-4-argon-high',
    layering_part_outline_review_model: 'gemini-4-argon-high' }, root);
  assert.throws(() => validateImageSelection(settings, 'part_simplify'), /Codex 内置 imagegen.*harness.*agv/);
  validateImageSelection(settings, 'part_outline_review');
  await assert.rejects(cliExecutable(loadWorkflowEnvironment({ PATH: '' }, root), 'claude'), /全局入口.*不会自动安装/);
  const custom = loadWorkflowEnvironment({ layering_part_simplify_image_model: 'gemini-nano-banana-2.1' }, root);
  assert.throws(() => validateImageSelection(custom, 'part_simplify'), /缺少 google/);
});

test('example.env loads and enumerates every step and image choice', async t => {
  const contents = await readFile(new URL('../../example.env', import.meta.url), 'utf8');
  for (const step of Object.keys(stepDefaults)) assert.match(contents, new RegExp(`^layering_${step}_model=`, 'm'));
  for (const step of imageSteps) assert.match(contents, new RegExp(`^layering_${step}_image_model=`, 'm'));
  const root = await fixture(t);
  await writeFile(join(root, '.env'), contents);
  const settings = loadWorkflowEnvironment({}, root);
  assert.equal(Object.keys(settings.stepModels).length, Object.keys(stepDefaults).length);
  assert.ok(imageSteps.every(step => settings.stepImages[step] === 'codex-native'));
});

test('custom image edit transports original prompts and images over both protocols and preserves inputs', async t => {
  const root = await fixture(t), source = join(root, 'input.png');
  const png = await sharp({ create: { width: 4, height: 4, channels: 4, background: '#ff000080' } }).png().toBuffer();
  await writeFile(source, png);
  let protocol = 'openai', called = 0;
  const server = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk); const bytes = Buffer.concat(chunks); called++;
    if (protocol === 'gemini') {
      assert.equal(req.url, '/v1beta/models/gemini-nano-banana-2.1:generateContent');
      assert.equal(req.headers['x-goog-api-key'], 'image-test-secret');
      const body = JSON.parse(bytes.toString());
      assert.equal(body.contents[0].parts[0].text, '原样的绘制提示词');
      assert.deepEqual(Buffer.from(body.contents[0].parts[1].inlineData.data, 'base64'), png);
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: png.toString('base64') } }] } }] }));
    } else {
      assert.equal(req.url, '/v1/images/edits'); assert.equal(req.headers.authorization, 'Bearer image-test-secret');
      assert.ok(bytes.includes(Buffer.from('原样的绘制提示词'))); assert.ok(bytes.includes(png));
      res.end(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }));
    }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>(done => server.close(() => done())));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (const mode of ['openai', 'gemini']) {
    protocol = mode;
    const settings = loadWorkflowEnvironment({ layering_part_simplify_image_model: 'gemini-nano-banana-2.1',
      layering_google_image_base_url: base + (mode === 'gemini' ? '/v1beta' : '/v1'),
      layering_google_image_api_key: 'image-test-secret', layering_google_image_protocol: mode }, root);
    const tool = imageGenerationTool(settings, 'part_simplify', join(root, mode), [root])!;
    const result = await tool.execute({ prompt: '原样的绘制提示词', input_images: [source] }, new AbortController().signal);
    const output = JSON.parse((result.contentItems[0] as { text: string }).text);
    assert.ok(relative(root, output.savedPath).startsWith(mode));
    assert.equal((await sharp(output.savedPath).metadata()).format, 'png');
    assert.deepEqual(await readFile(source), png);
    await assert.rejects(tool.execute({ prompt: 'test', input_images: ['/etc/passwd'] }, new AbortController().signal), /允许范围/);
  }
  assert.equal(called, 2);
});

const fakeCli = `#!${process.execPath}
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
const args=process.argv.slice(2), kind=args.includes('--mcp-config')?'claude':'agv';
const resumeFlag=kind==='claude'?'--resume':'--conversation';
const resumed=args.includes(resumeFlag)?args[args.indexOf(resumeFlag)+1]:undefined;
if(resumed==='missing'){console.log(JSON.stringify({type:'result',is_error:true,session_id:resumed,error:'session not found'}));process.exit(1);}
let input='';for await(const chunk of process.stdin)input+=chunk;
const config=kind==='claude'?args[args.indexOf('--mcp-config')+1]:join(process.env.ANTIGRAVITY_GEMINI_DIR,'config/mcp_config.json');
const registry=JSON.parse(await readFile(config,'utf8')).mcpServers.layering.env;
const rpc=async(method,params)=>{const response=await fetch(registry.LAYERING_MCP_URL,{method:'POST',headers:{authorization:'Bearer '+registry.LAYERING_MCP_TOKEN},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});return (await response.json()).result;};
const list=await rpc('tools/list',{});
if(list.tools.length)await rpc('tools/call',{name:list.tools[0].name,arguments:{}});
const id=resumed||randomUUID();
console.log(JSON.stringify(kind==='claude'?{type:'system',subtype:'init',session_id:id}:{event:'init',conversation_id:id}));
const meta={args,cwd:process.cwd(),data:process.env.CLAUDE_CONFIG_DIR,agvData:process.env.ANTIGRAVITY_APP_DATA_DIR,input:JSON.parse(input),id,resumed};
await writeFile(join(process.cwd(),'invocation.json'),JSON.stringify(meta));
console.log(JSON.stringify(kind==='claude'?{type:'result',session_id:id,result:'完成'}:{event:'result',result:{conversation_id:id,status:'SUCCESS',response:'完成'}}));
`;

test('Claude and agv use isolated request workspaces, original MCP schemas and resumable local session data', async t => {
  const root = await fixture(t), cwd = join(root, '.run/case/part-layering'), cli = join(root, 'fake-cli.mjs');
  await mkdir(cwd, { recursive: true }); await writeFile(cli, fakeCli, { mode: 0o700 });
  const settings = loadWorkflowEnvironment({ layering_claude_path: cli, layering_agv_path: cli }, root);
  let called = 0;
  for (const id of ['claude-sonnet-5.5-high', 'gemini-4-argon-xhigh']) {
    const model = parseAgentModel(id, 'test'), options = { cwd, logDirectory: join(cwd, 'agents') };
    const task = { name: 'fixture', cwd, prompt: '完整任务提示词', tools: [{ name: 'fixture_echo', description: '原始工具说明',
      inputSchema: { type: 'object' }, async execute() { called++; return { success: true, contentItems: [] }; } }] };
    const first = await runCliTask(task, model, settings, options, new AbortController().signal);
    const second = await runCliTask(task, model, settings, options, new AbortController().signal, first.threadId!);
    assert.equal(second.threadId, first.threadId);
    const a = JSON.parse(await readFile(join(first.logDirectory!, 'workspace/invocation.json'), 'utf8'));
    const b = JSON.parse(await readFile(join(second.logDirectory!, 'workspace/invocation.json'), 'utf8'));
    assert.notEqual(a.cwd, b.cwd); assert.equal(a.data, b.data);
    for (const path of [a.cwd, a.data, a.agvData, b.cwd]) assert.ok(path.startsWith(join(cwd, 'agents')));
    assert.ok(a.input.message.content[0].text.startsWith(task.prompt));
    assert.equal(a.args[a.args.indexOf('--effort') + 1], model.effort);
    assert.equal((await stat(join(first.logDirectory!, 'mcp.json'))).mode & 0o777, 0o600);
  }
  assert.equal(called, 4);
});

test('unavailable CLI sessions are replaced once without deleting existing deliveries', async t => {
  const root = await fixture(t), cwd = join(root, '.run/case/part-layering'), cli = join(root, 'fake-cli.mjs');
  await mkdir(cwd, { recursive: true }); await writeFile(cli, fakeCli, { mode: 0o700 });
  await writeFile(join(cwd, 'keep.svg'), 'existing');
  const settings = loadWorkflowEnvironment({ layering_claude_path: cli, layering_part_outline_review_model: 'claude-sonnet-5.5-high' }, root);
  await mkdir(join(cwd, 'agents'), { recursive: true });
  await mkdir(join(cwd, 'agents/old-data'), { recursive: true });
  await mkdir(join(cwd, 'agents/old-workspace'), { recursive: true });
  await writeFile(join(cwd, 'agents/sessions.json'), JSON.stringify({ missing: { harness: 'claude', data: join(cwd, 'agents/old-data'), workspace: join(cwd, 'agents/old-workspace') } }));
  let replacements = 0;
  const agents = new CodexAgents({ environment: settings, cwd, logDirectory: join(cwd, 'agents'),
    onThreadReplacement: async () => { replacements++; } });
  const session = agents.createSession('missing');
  try {
    const result = await session.run({ step: 'part_outline_review', name: 'review', cwd, prompt: '继续任务' });
    assert.notEqual(result.threadId, 'missing'); assert.equal(replacements, 1);
    assert.equal(await readFile(join(cwd, 'keep.svg'), 'utf8'), 'existing');
  } finally { await session.close(); }
});

test('model/effort changes resume within a harness, switching harness creates a recorded session and retains files', async t => {
  const root = await fixture(t), cwd = join(root, '.run/case/part-layering'), cli = join(root, 'fake-cli.mjs');
  await mkdir(cwd, { recursive: true }); await writeFile(cli, fakeCli, { mode: 0o700 });
  await writeFile(join(cwd, 'keep.svg'), 'existing');
  const settings = loadWorkflowEnvironment({ layering_claude_path: cli, layering_agv_path: cli,
    layering_part_outline_model: 'claude-sonnet-5.5-high', layering_part_outline_repair_model: 'claude-opus-5.5-xhigh',
    layering_part_outline_review_model: 'gemini-4-argon-high' }, root);
  const replaced: string[] = [];
  const agent = new CodexAgents({ environment: settings, cwd, logDirectory: join(cwd, 'agents'), onThreadReplacement: async id => { replaced.push(id); } });
  const session = agent.createSession();
  try {
    const first = await session.run({ step: 'part_outline', name: 'drawing', cwd, prompt: 'draw' });
    const repair = await session.run({ step: 'part_outline_repair', name: 'repair', cwd, prompt: 'repair' });
    const switched = await session.run({ step: 'part_outline_review', name: 'handoff', cwd, prompt: 'continue from file' });
    assert.equal(first.threadId, repair.threadId); assert.notEqual(first.threadId, switched.threadId);
    assert.deepEqual(replaced, [first.threadId]);
    const records = JSON.parse(await readFile(join(cwd, 'agents/sessions.json'), 'utf8'));
    assert.equal(records[first.threadId!].harness, 'claude'); assert.equal(records[switched.threadId!].harness, 'agv');
    assert.equal(await readFile(join(cwd, 'keep.svg'), 'utf8'), 'existing');
  } finally { await session.close(); }
});

test('CLI cancellation and early failures finish logs and stop the request process', async t => {
  const root = await fixture(t), cwd = join(root, '.run/case'), cli = join(root, 'waiting.mjs');
  await mkdir(cwd, { recursive: true });
  await writeFile(cli, `#!${process.execPath}\nsetInterval(()=>{},10000);`, { mode: 0o700 });
  const settings = loadWorkflowEnvironment({ layering_claude_path: cli }, root);
  const options = { cwd, logDirectory: join(cwd, 'agents') };
  let error: any;
  try { await runCliTask({ name: 'cancel', cwd, prompt: 'test' }, parseAgentModel('claude-sonnet-5.5-high', 'fixture'), settings, options, AbortSignal.timeout(200)); }
  catch (failure) { error = failure; }
  assert.match(String(error), /Timeout|abort/i);
  assert.equal(JSON.parse(await readFile(join(error.logDirectory, 'result.json'), 'utf8')).status, 'failed');
  await assert.rejects(cliExecutable(loadWorkflowEnvironment({ layering_claude_path: root }, root), 'claude'), /没有可用/);
});

test('raster CLI service retries retain the session and report retry progress', async t => {
  const root = await fixture(t), cwd = join(root, '.run/case/raster-layering'), cli = join(root, 'retry.mjs');
  await mkdir(cwd, { recursive: true });
  const script = fakeCli.replace("const meta=", `const flag=join(process.env.CLAUDE_CONFIG_DIR,'retried');
try { await readFile(flag); } catch {
  await writeFile(flag,'yes');
  console.log(JSON.stringify({type:'result',session_id:id,is_error:true,error:'503 service unavailable'}));process.exit(1);
}
const meta=`).replace("result:'完成'", "result:'{\"status\":\"completed\",\"summary\":\"recovered\"}'");
  await writeFile(cli, script, { mode: 0o700 });
  const settings = loadWorkflowEnvironment({ layering_claude_path: cli, layering_raster_step02_model: 'claude-sonnet-5.5-high' }, root);
  const ids: string[] = [], retries: number[] = [];
  const result = await runAgent({ directory: cwd, step: 'raster_step02', model: 'claude-sonnet-5.5', effort: 'high',
    environment: settings, prompt: 'continue', async onEvent(event) {
      if (event.type === 'thread.started') ids.push(event.thread_id);
    }, onRetry: retry => { retries.push(retry.nextAttempt); } }, undefined, new AgentRuntime(1, async () => {}));
  assert.equal(result.summary, 'recovered');
  assert.deepEqual(retries, [2]);
  assert.equal(ids.length, 1);
  const records = JSON.parse(await readFile(join(cwd, 'agents/sessions.json'), 'utf8'));
  assert.deepEqual(Object.keys(records), ids);
});

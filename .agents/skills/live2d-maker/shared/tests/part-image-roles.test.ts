import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { CodexAgents } from '../codex/agents.ts';
import { loadWorkflowEnvironment } from '../codex/environment.ts';
import { drawGroupOutline } from '../part/outline-agent.ts';
import { completeGroupOcclusion } from '../part/completion-agent.ts';
import { assertCompletionPreserves } from '../part/completion-svg.ts';
import { findGroup, GroupStore } from '../part/groups.ts';
import { fixture, seedInitialGroups } from '../../part-layering/tests/layering-fixture.ts';
import { profile as clothingProfile } from '../../clothing-part-layering/profile.ts';

// Exercise actual request isolation, tool registration, image transport, bitmap
// viewing and SVG submission without asking a live model to change an asset.
const cli = `#!${process.execPath}
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
const args=process.argv.slice(2),claude=args.includes('--mcp-config');
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const prompt=JSON.parse(raw).message.content[0].text;
const input=JSON.parse(prompt.match(/【本次输入】\\n([\\s\\S]*?\\n})\\n/)[1]);
const config=claude?args[args.indexOf('--mcp-config')+1]:join(process.env.ANTIGRAVITY_GEMINI_DIR,'config/mcp_config.json');
const env=JSON.parse(await readFile(config,'utf8')).mcpServers.layering.env;
const rpc=async(method,params)=>{
 const response=await fetch(env.LAYERING_MCP_URL,{method:'POST',headers:{authorization:'Bearer '+env.LAYERING_MCP_TOKEN},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
 const value=await response.json();assert.ok(!value.error,JSON.stringify(value.error));assert.ok(!value.result.isError,JSON.stringify(value.result));return value.result;
};
const list=await rpc('tools/list',{}),names=list.tools.map(tool=>tool.name);
const call=(name,arguments_)=>rpc('tools/call',{name,arguments:arguments_});
const id=randomUUID();console.log(JSON.stringify(claude?{type:'system',subtype:'init',session_id:id}:{event:'init',conversation_id:id}));
if(input.outputSvg){
 assert.ok(!names.includes('imagegen'));assert.ok(!prompt.includes('imagegen'));
 await call('write_outline_svg',{svg:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><g id="shape" data-group-path="'+input.group.id+'"><path fill="#55b9ad" d="M10 10H90V90H10Z"/></g></svg>'});
 await call('preview_svg',{path:input.outputSvg,mode:'blend'});
}else{
 assert.ok(names.includes('imagegen'));assert.ok(names.includes('view_bitmap'));
 assert.ok(prompt.includes('必须先基于本次参考生成露出该'+(input.group.id==='face'?'部件':'衣片')+'的结构辅助图并查看'));
 const crop=await call('view_bitmap',{path:input.reference,crop:[10,10,20,20],scale:2});
 const cropPath=JSON.parse(crop.content.find(item=>item.type==='text').text).savedPath;
 const generated=await call('imagegen',{prompt:'Reveal the hidden structure while retaining visible shapes.',input_images:[cropPath],background:'auto'});
 const imagePath=JSON.parse(generated.content.find(item=>item.type==='text').text).savedPath;
 const viewed=await call('view_bitmap',{path:imagePath});assert.ok(viewed.content.some(item=>item.type==='image'));
 await call('set_completion_paths',{paths:[{d:'M5 40H20V60H5Z'}]});
 await call('preview_svg',{path:input.outputDraft,mode:'blend'});
 await call('preview_svg',{path:input.outputDraft,mode:'svg'});
 await call('submit_completion',{note:'Checked generated reference and retained the source SVG.'});
}
await writeFile(join(process.cwd(),'registered-tools.json'),JSON.stringify(names));
console.log(JSON.stringify(claude?{type:'result',session_id:id,result:'完成'}:{event:'result',result:{conversation_id:id,status:'SUCCESS',response:'完成'}}));
`;

for (const harness of ['claude', 'agv'] as const) for (const pipeline of ['character', 'clothing'] as const) {
  test(`${harness} ${pipeline}: only completion can generate and view references, original SVG remains intact`, async t => {
    const f = await fixture(t), executable = join(f.directory, 'fixture-cli.mjs');
    await writeFile(executable, cli, { mode: 0o700 });
    const png = await sharp({ create: { width: 40, height: 40, channels: 4, background: '#ffccaa' } }).png().toBuffer();
    let imageCalls = 0;
    const server = createServer(async (req, res) => {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const form = await new Request('http://localhost', { method: 'POST',
        headers: { 'content-type': req.headers['content-type']! }, body: new Uint8Array(Buffer.concat(chunks)) }).formData();
      assert.equal(req.url, '/v1/images/edits');
      assert.equal(form.get('model'), 'gemini-nano-banana-2.1');
      assert.equal(form.get('background'), 'auto');
      assert.equal((await sharp(Buffer.from(await (form.get('image') as File).arrayBuffer())).metadata()).width, 40);
      imageCalls++; res.end(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }));
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    t.after(() => { server.closeAllConnections(); return new Promise<void>(done => server.close(() => done())); });
    const model = harness === 'claude' ? 'claude-sonnet-5-5-high' : 'gemini-4-argon-high';
    const settings = loadWorkflowEnvironment({ [`layering_${harness}_path`]: executable,
      layering_agent_part_draw_model: model, layering_agent_part_completion_model: model,
      layering_part_completion_image_model: 'gemini-nano-banana-2.1', layering_clothing_completion_image_model: 'gemini-nano-banana-2.1',
      layering_google_image_base_url: `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`,
      layering_google_image_api_key: 'fixture', layering_google_image_protocol: 'openai' }, f.directory);
    const agents = new CodexAgents({ environment: settings, cwd: f.directory, logDirectory: join(f.directory, 'agents') });
    // face deliberately uses a specialized completion prompt; clothing uses its
    // own generic prompt. Both must receive the shared per-pipeline reference rule.
    const id = pipeline === 'character' ? 'face' : 'outerwear';
    await seedInitialGroups(f.directory, [{ id }]);
    const store = await GroupStore.open(f.directory);
    const context = { ...f, ...(pipeline === 'clothing' ? { profile: clothingProfile } : {}), store, group: findGroup(store.snapshot(), id) };
    await mkdir(join(f.directory, 'stages'), { recursive: true });
    const outline = await drawGroupOutline({ ...context, outputPath: join(f.directory, 'stages/outline.svg') }, agents);
    assert.equal(imageCalls, 0);
    const before = await readFile(outline.path, 'utf8');
    const completion = await completeGroupOcclusion({ ...context, reviewed: outline, outputPath: join(f.directory, 'stages/complete.draft.svg') }, agents);
    assert.equal(imageCalls, 1);
    assert.equal(await readFile(outline.path, 'utf8'), before);
    assert.equal(assertCompletionPreserves(before, await readFile(completion.path, 'utf8')), 1);
  });
}

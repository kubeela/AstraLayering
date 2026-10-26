import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {ComponentScene} from '../../shared/physics-core/component-physics-model.js';
import {componentDefaults} from '../../shared/physics-core/component-physics-schema.js';
import {preparePointerBrush} from '../../shared/physics-evidence/pointer-brush.js';
import {pointerCommand} from '../../shared/physics-evidence/physics-pointer-contact.js';
import {applyTestInput,legacyTestNames,testNames} from '../../shared/physics-evidence/physics-test-input.js';
import {advancePhysicsJob} from '../../shared/physics-evidence/component-physics-worker.js';
import {simulate,traceReplayWindow} from '../evidence.ts';
const c={id:'cloth',name:'cloth',kind:'cloth',priority:'primary',enabled:true,layerRefs:[{uuid:'cloth',contentHash:'a'.repeat(64)}],sourcePartIds:['cloth'],supports:[{id:'root',at:[50,15]}],...componentDefaults('cloth'),authoring:{freeLength:65,transitionPixels:10,fixedRegions:[[[25,5],[75,5],[75,25],[25,25]]],contour:[[25,5],[75,5],[75,90],[25,90]],controlGrid:[3,6],subdivisions:1}};
const config={kind:'astra-component-physics',version:1,solver:'astra-component-physics-1',source:{canvas:{width:100,height:100}},components:[c]};
const layer={id:'layer',uuid:'cloth',contentHash:'a'.repeat(64),visible:true,opacity:255,bounds:{x:20,y:0,width:60,height:100},maskedAlpha:Uint8Array.from({length:6000},(_,i)=>i%60>=5&&i%60<55&&Math.floor(i/60)>=5&&Math.floor(i/60)<90?255:0)};
test('original nine tests remain in order; continuous pointer brush is an additional test',()=>{assert.deepEqual(testNames,[...legacyTestNames,'pointer-brush']);assert.equal(legacyTestNames.length,9);});
test('all 960 original commands match the preserved v3 input signatures',async()=>{
  const baseline=JSON.parse(await readFile(new URL('legacy-input-v3.json',import.meta.url),'utf8'));
  for(const test of legacyTestNames){const record:number[][]=[],body={component:{supports:[{at:[10,20]}],authoring:{}},freeLength:100,weights:[0,.3,1],rest:[10,20,20,60,35,100],positions:[10,20,20,60,35,100],impulse(...args:number[]){record.push(args);}},scene:any={bodies:new Map([['body',body]]),inputs:new Map()},h=createHash('sha256');for(let step=1;step<=960;step++){record.length=0;applyTestInput(scene,test,step);h.update(JSON.stringify({step,sourcePose:scene.sourcePose,airflow:scene.airflow,impulses:record}));}assert.equal(h.digest('hex'),baseline.hashes[test],test);}
});
test('contact plan uses visible free source pixels and reports fully occluded components',()=>{
  const scene=new ComponentScene(config),p=preparePointerBrush(scene,[layer]);assert.equal(p.basis,'source-alpha');assert.equal(p.paths[0].status,'reachable');assert(p.paths[0].source.exposedAlpha>32);assert(p.paths[0].source.mobility>=.15);assert(p.paths[0].sourcePoint[1]>25);
  const cover={...layer,id:'cover',uuid:'cover',maskedAlpha:new Uint8Array(6000).fill(255)};
  assert.equal(preparePointerBrush(scene,[layer,cover]).paths[0].status,'no-visible-free-pixel');
  assert.equal(preparePointerBrush(scene,[{...layer,maskedAlpha:new Uint8Array(6000)}]).paths[0].status,'no-visible-free-pixel');
});
test('swept contact rejects transparent space and keeps elapsed-time force weighting',()=>{
  const body=new ComponentScene(config).bodies.get('cloth');assert.equal(pointerCommand(body,[layer],[0,0],[1,0],1/120,2),null);
  const a=pointerCommand(body,[layer],[50,65],[50.1,65],1/120,2),b=pointerCommand(body,[layer],[50,65],[50.2,65],1/60,2);
  assert(a&&b);assert(Math.abs(a.args[2]-b.args[2])<1e-9);assert.equal(b.args[5],a.args[5]*2);assert.equal(pointerCommand(body,[layer],[50,65],[51,65],.2,2),null);
});
test('worker replay preserves real alpha contacts, root constraints and all mesh positions',()=>{
  const a=new ComponentScene(config),b=new ComponentScene(config),context=preparePointerBrush(a,[layer]);a.pointerBrush=context;b.pointerBrush=structuredClone(context);
  let contacts=0;for(let step=1;step<=180;step++){applyTestInput(a,'pointer-brush',step);contacts+=a.pointerCommands.length;a.step();advancePhysicsJob(b,{steps:1,elapsed:(step-1)/120,replayStep:step-1,playback:'pointer-brush',commands:[]});assert.deepEqual(a.bodies.get('cloth').positions,b.bodies.get('cloth').positions);assert.equal(a.bodies.get('cloth').stats.root,0);}
  assert(contacts>0&&contacts<=30);assert.equal(a.pointerCommands.length,0);
});
test('standalone source adapter retains dimensions, records commands and invalidates changed source alpha',async()=>{
  const root=await mkdtemp(join(tmpdir(),'astra-pointer-brush-')),source=join(root,'source'),out=join(root,'evidence');try{
    await mkdir(source);const rgba=new Uint8Array(6000*4);for(let i=0;i<6000;i++)rgba[i*4+3]=layer.maskedAlpha[i];
    await sharp(rgba,{raw:{width:60,height:100,channels:4}}).png().toFile(join(source,'masked.png'));
    await writeFile(join(source,'catalog.json'),JSON.stringify({canvas:config.source.canvas,layers:[{...layer,maskedAlpha:undefined,masked:'masked.png'}]}));
    const m=await simulate(config,out,undefined,source);assert.equal(m.runs.length,10);assert.equal(m.pointerBrush.basis,'source-alpha');const run=m.runs.find((r:any)=>r.test==='pointer-brush'),metric=run.metrics.motionReview.components.cloth;assert(metric.contacts>0);assert(metric.sourcePixelPeak>0);assert.equal(metric.recovery.passed,true);assert.equal(metric.root,0);
    const replay=await traceReplayWindow(out,'pointer-brush',[59,60,89,90]);assert.equal(replay.inputs[59].pointerCommands.length,0);assert(replay.inputs[60].pointerCommands.length>0);assert.equal(replay.inputs[90].pointerCommands.length,0);
    assert.equal((await simulate(config,out,undefined,source)).createdAt,m.createdAt);
    await sharp({create:{width:60,height:100,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile(join(source,'masked.png'));
    const changed=await simulate(config,out,undefined,source);assert.notEqual(changed.pointerBrush.sourceHash,m.pointerBrush.sourceHash);assert.equal(changed.pointerBrush.paths[0].status,'no-visible-free-pixel');
    assert.equal(JSON.parse(await readFile(join(out,'manifest.json'),'utf8')).coverage.human,'unreviewed');
  }finally{await rm(root,{recursive:true,force:true});}
});

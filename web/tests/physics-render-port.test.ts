import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { componentDefaults } from '../studio/component-physics-schema.js';
import { simulate } from '../../.agents/skills/live2d-maker/physics/evidence.ts';
import { renderFrames } from '../../.agents/skills/live2d-maker/physics/render.ts';

for(const kind of ['cloth','strand'])test(kind+' workflow renderer loads the vendored solver and reproduces offline mesh states with all surface channels',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'astra-physics-render-'));
  try{
    const source=join(directory,'source'),evidence=join(directory,'evidence');await mkdir(source);
    const component={id:'cloth',name:'cloth',kind,enabled:true,priority:'primary',sourcePartIds:['cloth'],layerRefs:[{uuid:'cloth',contentHash:'a'.repeat(64)}],supports:[{id:'root',at:[32,8]}],...componentDefaults('cloth'),authoring:{freeLength:72,fixedRegions:[[[6,8],[58,8],[58,20],[6,20]]],transitionPixels:12,contour:[[6,8],[58,8],[58,88],[6,88]],subdivisions:0,controlGrid:kind==='cloth'?[3,5]:undefined,centerline:[[32,8],[32,20],[32,40],[32,60],[32,80]],widths:[52,52,52,52,52]}};
    const config={kind:'astra-component-physics',version:1,solver:'astra-component-physics-1',source:{canvas:{width:64,height:96}},components:[component]};
    const png=await sharp({create:{width:52,height:80,channels:4,background:{r:48,g:128,b:192,alpha:1}}}).png().toBuffer();
    for(const file of ['part-0-original.png','part-0-masked.png'])await writeFile(join(source,file),png);
    await sharp({create:{width:64,height:96,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:png,left:6,top:8}]).png().toFile(join(source,'color.png'));
    for(const[kind,color]of [['normal',{r:128,g:128,b:255,alpha:1}],['depth',{r:180,g:180,b:180,alpha:1}]] as const)await sharp({create:{width:64,height:96,channels:4,background:color}}).png().toFile(join(source,kind+'.png'));
    await writeFile(join(source,'catalog.json'),JSON.stringify({canvas:{width:64,height:96},layers:[{id:'cloth',uuid:'cloth',contentHash:'a'.repeat(64),visible:true,opacity:255,bounds:{x:6,y:8,width:52,height:80},original:'part-0-original.png',masked:'part-0-masked.png'}]}));
    await simulate(config,evidence);
    const files=await renderFrames(config,source,evidence,[{test:'tip-impulse',steps:[0,72],modes:['color','lit','normal','depth']}]);
    assert.equal(files.filter(f=>!f.component).length,8);
    const manifest=JSON.parse(await readFile(join(evidence,'manifest.json'),'utf8'));
    assert.equal(manifest.replayVerification,'all-rendered-mesh-vertices');assert.equal(manifest.coverage.render,'partial');
  }finally{await rm(directory,{recursive:true,force:true});}
});

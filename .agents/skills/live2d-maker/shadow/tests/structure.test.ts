import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {zipSync,strToU8} from 'fflate';
import {kraLayers,validateClipBase,validateMaskStructure} from '../delivery.ts';
import {alphaGain} from '../inspection.ts';
import {inputIndex} from '../preparation.ts';
const xml = (extra='',reverse=false) => `<layers><layer uuid="group" name="Clipping" nodetype="grouplayer" passthrough="0"><layers>${reverse?'<layer uuid="base" name="Base" nodetype="grouplayer"/>':''}<layer uuid="shadow" name="Shadow" nodetype="paintlayer" colorspacename="RGBA" channelflags="1110" compositeop="normal"/>${!reverse?'<layer uuid="base" name="Base" nodetype="grouplayer"><layers><layer uuid="left" name="人物 | 001 legs/left" nodetype="paintlayer"/><layer uuid="right" name="人物 | 002 legs/right" nodetype="paintlayer"/></layers></layer>':''}${extra}</layers></layer></layers>`;
const relation = {id:'skirt',casterPartId:'clothing:skirt',receiverPartIds:['character:legs/left','character:legs/right'],casterLayerUuids:['right'],receiverLayerUuids:['left','right'],shadowLayerUuid:'shadow',clipBaseLayerUuid:'base',follow:'caster',blendMode:'normal',testOffsets:[[0,0],[10,0]],notes:'test'};
test('裁切 base 必须在影层下方，接收层在 base 中，下方没有其他 alpha 来源',()=>{
 assert.doesNotThrow(()=>validateClipBase(kraLayers(xml()),relation));
 assert.throws(()=>validateClipBase(kraLayers(xml('',true)),relation),/下方/);
 assert.throws(()=>validateClipBase(kraLayers(xml('<layer uuid="unrelated" nodetype="paintlayer"/>')),relation),/alpha 来源/);
 assert.throws(()=>validateClipBase(kraLayers(xml()),{...relation,receiverLayerUuids:['shadow']}),/不属于/);
 assert.doesNotThrow(()=>validateClipBase(kraLayers(xml('<layer uuid="extra" nodetype="paintlayer" colorspacename="RGBA" channelflags="1110"/>')),relation));
});
test('原生透明度继承不可只声明 JSON，像素偏移必须真实有效',()=>{
 const bindings={version:2,shadows:[relation],excluded:[]},parts=new Set(['clothing:skirt',...relation.receiverPartIds]);
 assert.doesNotThrow(()=>validateMaskStructure(kraLayers(xml()),new Map(),parts,bindings));
 assert.throws(()=>validateMaskStructure(kraLayers(xml().replace('1110','1111')),new Map(),parts,bindings),/透明度继承/);
 for(const testOffsets of [[[0,0]],[[0,0],[0,0]],[[0,0],[1.2,0]],[[0,0],[17000,0]]]) assert.throws(()=>validateClipBase(kraLayers(xml()),{...relation,testOffsets}),/testOffsets/);
});
test('alpha 检查只比较覆盖变化，允许阴影改变已有像素的颜色',()=>{
 assert.equal(alphaGain(new Uint8Array([255,200,100,255]),new Uint8Array([0,0,0,255])),0);
 assert.equal(alphaGain(new Uint8Array([255,200,100,0]),new Uint8Array([0,0,0,128])),1);
 assert.throws(()=>alphaGain(new Uint8Array(4),new Uint8Array(8)),/画布/);
});
test('部件索引保留多深度，命名空间明确时匹配，模糊名称留空',async t=>{
 const root=await mkdtemp(join(tmpdir(),'shadow-index-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const source=join(root,'source.kra');await writeFile(source,zipSync({'maindoc.xml':strToU8(xml().replace('人物 | 002 legs/right','legs/right')),'mergedimage.png':new Uint8Array([1])}));
 const structureFiles=[];
 for(const namespace of ['part-layering','clothing-part-layering']){
  const p=join(root,namespace);await mkdir(p);
  await writeFile(join(p,'groups.json'),JSON.stringify({groups:[{id:'legs',groups:[{id:'legs/left'},{id:'legs/right'}]}]}));
  await writeFile(join(p,'occlusion.json'),JSON.stringify({layers:[{id:'legs/left',levels:[{level:1,region:'front'},{level:3,region:'back'}]}]}));
  structureFiles.push(join(p,'groups.json'),join(p,'occlusion.json'));
 }
 const index=await inputIndex({characterKra:source,characterColor:source,simplifiedCharacter:source,structureFiles});
 assert.equal(index.layers.find(l=>l.uuid==='left')?.nameMatch,'character:legs/left');
 assert.equal(index.layers.find(l=>l.uuid==='base')?.nameMatch,null);
 assert.equal(index.layers.find(l=>l.uuid==='right')?.nameMatch,null);
 assert.deepEqual(index.parts.find(p=>p.id==='character:legs/left')?.depth,[{level:1,region:'front'},{level:3,region:'back'}]);
});

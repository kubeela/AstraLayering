import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {prepareProjectionPreview,selectPhysicsPreview} from '../input.ts';

test('explicit assembled review preserves optional projection assets and discards a stale preview without importing Krita',async()=>{
  const task=await mkdtemp(join(tmpdir(),'astra-physics-preview-'));
  const save=async(p:string,v:string|Uint8Array)=>{await mkdir(join(p,'..'),{recursive:true});await writeFile(p,v);};
  const digest=(v:string|Uint8Array)=>createHash('sha256').update(v).digest('hex');
  try{
    const document=join(task,'character-assembly/step01/character-assembled.kra'),color=join(task,'character-assembly/step01/character-assembled.png');
    const directory=join(task,'physics'),source=join(directory,'source');
    const colorBytes=await sharp({create:{width:4,height:4,channels:4,background:'#8080ff'}}).png().toBuffer();
    await save(document,'assembled');await save(color,colorBytes);
    await save(join(source,'catalog.json'),JSON.stringify({version:1,documentHash:digest('assembled'),colorHash:digest(colorBytes),canvas:{width:4,height:4},layers:[],parts:[]}));
    const mask=join(task,'shadow/mask/step01/character-shadowed.kra');
    await save(mask,'native composition requiring other groups');
    await save(join(task,'shadow/mask/step01/character-shadowed.png'),'mask color');
    await save(join(task,'shadow/mask/step01/shadows.json'),'{}');
    await save(join(task,'shadow/selection.json'),JSON.stringify({version:1,mode:'mask',sourceKraHash:digest('assembled'),sourceColorHash:digest(colorBytes)}));
    await save(join(directory,'preview/catalog.json'),'stale preview');
    await selectPhysicsPreview(directory,'assembled');
    await prepareProjectionPreview({task,document,color,profile:'all',structures:[]},directory,'/nonexistent-krita');
    assert.equal(await readFile(mask,'utf8'),'native composition requiring other groups');
    await assert.rejects(access(join(directory,'preview/catalog.json')));
    const catalog=JSON.parse(await readFile(join(source,'catalog.json'),'utf8'));
    assert.equal(catalog.documentHash,digest('assembled'));
    assert.equal(catalog.previewSelection.mode,'assembled');
    assert.equal(catalog.previewSelection.projectionReviewRequested,false);
    await assert.rejects(selectPhysicsPreview(directory,'invalid' as any),/auto 或 assembled/);
    await selectPhysicsPreview(directory,'auto');
    assert.equal(JSON.parse(await readFile(join(directory,'preview-selection.json'),'utf8')).mode,'auto');
  }finally{await rm(task,{recursive:true,force:true});}
});

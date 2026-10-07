/** Rebuild disposable preview textures from the pinned, layered SVG. The separately authored repair SVG is applied to a clone. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { classify } from '../deformer.mjs';
import { prepareArtwork } from './prepare-artwork.mjs';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourcePath=process.argv[2];
if(!sourcePath) throw new Error('Usage: ASTRA_PLAYWRIGHT=/path/to/playwright/index.mjs node tools/build-atlas.mjs source.svg');
const driver=await import(process.env.ASTRA_PLAYWRIGHT||'playwright');
const { chromium }=driver.default??driver;
const rig=JSON.parse(await fs.readFile(path.join(dir,'rig.json')));
const svg=await fs.readFile(sourcePath,'utf8');
const inputSha256=createHash('sha256').update(svg).digest('hex');
const source=JSON.parse(await fs.readFile(path.join(dir,'source.json')));
if(inputSha256!==source.sourceSha256)throw Error('Source SVG does not match source.json; refusing to repair another drawing.');
const supplemental=await fs.readFile(path.join(dir,'artwork-repairs.svg'),'utf8');
const browser=await chromium.launch({headless:true,...(process.env.ASTRA_CHROMIUM?{executablePath:process.env.ASTRA_CHROMIUM}:{}),args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1024,height:1536},deviceScaleFactor:1});
 await page.setContent('<!doctype html><style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style>'+svg,{timeout:120000});
 await page.addScriptTag({content:'window.prepareArtwork = '+prepareArtwork.toString()});
 const repairs=await page.evaluate(s=>window.prepareArtwork(document.querySelector('svg'),s),supplemental);
 const groups=await page.evaluate(()=>[...document.querySelector('svg').children].filter(e=>e.tagName==='g').map((g,i)=>{
  g.dataset.atlasIndex=i;const b=g.getBBox();
  return {index:i,id:g.id||g.dataset.renderingLayer||('group-'+i),receivers:g.dataset.renderingReceivers||'',blend:g.style.mixBlendMode==='multiply'?'multiply':'normal',box:[b.x,b.y,b.width,b.height]};
 }));
 const clip=[210,-60,620,1120],batches=[];
 const skin=groups.filter(g=>/^(neck_skin|body_chest(?:_|$)|body_(left|right)_breast$|arms_(left|right)_arm_(left|right)_upper_arm$|repair-neck-shoulder)/.test(g.id));
 const skinIndices=new Set(skin.map(g=>g.index));
 let addedSkin=false;
 for(const g of groups){
  if(skinIndices.has(g.index)) {
   if(!addedSkin){batches.push({kind:'skin',blend:'normal',groups:skin});addedSkin=true;}
   continue;
  }
  // The portrait owns head/hair and an upper-body context, not the full-body rig.
  if(!/head|face|eye_|mouth_cast|neck_chin/.test(g.id+' '+g.receivers))continue;
  const [x,y,w,h]=g.box;if(x+w<clip[0]||x>clip[0]+clip[2]||y+h<clip[1]||y>clip[1]+clip[3])continue;
  g.kind=classify(g.id,g.receivers);
  // Consecutive sibling groups share a texture only when their field and compositing agree.
  const prior=batches.at(-1);
  if(prior&&prior.kind===g.kind&&prior.blend===g.blend){prior.groups.push(g);}
  else batches.push({kind:g.kind,blend:g.blend,groups:[g]});
 }
 await fs.mkdir(path.join(dir,'textures'),{recursive:true});
 const layers=[];
 for(const [i,b] of batches.entries()){
  const minX=Math.max(clip[0],Math.floor(Math.min(...b.groups.map(g=>g.box[0]))-5));
  const minY=Math.max(clip[1],Math.floor(Math.min(...b.groups.map(g=>g.box[1]))-5));
  const maxX=Math.min(clip[0]+clip[2],Math.ceil(Math.max(...b.groups.map(g=>g.box[0]+g.box[2]))+5));
  const maxY=Math.min(clip[1]+clip[3],Math.ceil(Math.max(...b.groups.map(g=>g.box[1]+g.box[3]))+5));
  const box=[minX,minY,maxX-minX,maxY-minY],scale=['rear','sideL','sideR','ribbonL','ribbonR','skin'].includes(b.kind)?2:rig.preview.textureScale;
  const width=box[2]*scale,height=box[3]*scale;
  await page.setViewportSize({width,height});
  await page.evaluate(({indices,box,width,height})=>{
   const s=document.querySelector('svg');s.setAttribute('viewBox',box.join(' '));s.setAttribute('width',width);s.setAttribute('height',height);
   for(const g of s.children)if(g.tagName==='g')g.style.display=indices.includes(Number(g.dataset.atlasIndex))?'inline':'none';
  },{indices:b.groups.map(g=>g.index),box,width,height});
  const file=`textures/${String(i).padStart(2,'0')}-${b.kind}.png`;
  await page.screenshot({path:path.join(dir,file),omitBackground:true});
  layers.push({file,kind:b.kind,blend:b.blend,box,scale,groups:b.groups.map(g=>g.id)});
  if(i%10===0)console.log(`Rendered ${i+1}/${batches.length}`);
 }
 await fs.writeFile(path.join(dir,'layers.json'),JSON.stringify({schema:'astra.svg-preview-textures.v2',inputSha256,supplementalSha256:createHash('sha256').update(supplemental).digest('hex'),repairs,scale:rig.preview.textureScale,clip,layers},null,2)+'\n');
 const retained=new Set(layers.map(l=>path.basename(l.file)));
 for(const file of await fs.readdir(path.join(dir,'textures')))if(/^\d{2}-[A-Za-z]+\.png$/.test(file)&&!retained.has(file))await fs.unlink(path.join(dir,'textures',file));
 console.log(`Wrote ${layers.length} layers. SVG remains the authoring source.`);
} finally {await browser.close();}

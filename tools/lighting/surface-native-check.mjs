import assert from 'node:assert/strict';
import { writePsdUint8Array } from 'ag-psd';
import { mkdir,writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { layerState } from '../../web/studio/layer-model.js';
const base=new URL(process.argv[2]||'http://127.0.0.1:4390/'),out='.web/surface-native';await mkdir(out,{recursive:true});
const image=fn=>{const data=new Uint8ClampedArray(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++)data.set(fn(x,y),(y*32+x)*4);return{width:32,height:32,data};};
const bytes=writePsdUint8Array({width:32,height:32,imageData:image(()=>[30,60,90,255]),children:[
 {name:'receiver',imageData:image(()=>[30,60,90,255])},
 {name:'hand/palm',opacity:.5,imageData:image(()=>[210,40,30,255]),mask:{top:0,left:0,imageData:image((x,y)=>[x>=12&&x<20&&y>=12&&y<20?0:255,0,0,255])}},
]},{generateThumbnail:false});await writeFile(out+'/fixture.psd',bytes);
async function post(op,value){const r=await fetch(new URL('api/studio/layers/'+op,base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}),d=await r.json();if(!r.ok)throw Error(d.error);return d;}
const response=await fetch(new URL('api/studio/layers/open?format=psd',base),{method:'POST',body:bytes}),s=await response.json();assert(response.ok,s.error);
try{
 const packet=await post('surfaces',{session:s.session,revision:s.revision});assert.equal(packet.layers.length,2);
 const hand=packet.layers.find(l=>l.name==='hand/palm');assert(hand);assert.equal(hand.opacity,128);
 async function get(file,revision=0){return fetch(new URL('studio-surface-asset?'+new URLSearchParams({session:s.session,revision:String(revision),file}),base));}
 const original=await sharp(Buffer.from(await(await get(hand.original)).arrayBuffer())).ensureAlpha().raw().toBuffer();
 const masked=await sharp(Buffer.from(await(await get(hand.masked)).arrayBuffer())).ensureAlpha().raw().toBuffer();
 assert.deepEqual([...original.subarray((16*32+16)*4,(16*32+16)*4+4)],[210,40,30,255]);
 assert.equal(masked[(16*32+16)*4+3],0);assert.equal(masked[3],255);
 assert.equal((await get('../source.psd')).status,400);assert.equal((await get(hand.original,1)).status,400);
 const state=layerState(s.layers);state.find(l=>l.id===hand.id).visible=false;await post('edit',{session:s.session,revision:0,state});
 await assert.rejects(post('surfaces',{session:s.session,revision:1}),/还原图层/);
 assert.equal((await get(hand.original)).status,400);
 const result={status:'passed',checks:['native source RGB and alpha retained','wearing mask footprint separate from source painting','opacity retained once as metadata','snapshot path and revision boundaries reject stale/escaping reads','changed layer graph cannot reuse baseline maps']};
 await writeFile(out+'/verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await post('close',{session:s.session});}

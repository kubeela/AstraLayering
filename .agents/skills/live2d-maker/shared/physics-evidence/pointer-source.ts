// Node adapter: standalone skill reads the same masked source PNGs as rendering.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {preparePointerBrush} from './pointer-brush.js';
export async function pointerSource(source:string) {
  const catalogBytes=await readFile(join(source,'catalog.json')),catalog=JSON.parse(catalogBytes.toString()),layers:any[]=[],digest=createHash('sha256').update(catalogBytes);
  for(const l of catalog.layers) {
    const bytes=await readFile(join(source,l.masked));digest.update(bytes);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if(info.width!==l.bounds.width||info.height!==l.bounds.height)throw Error('轻扫源图尺寸与图层 bounds 不一致：'+l.id);
    layers.push({...l,maskedAlpha:Uint8Array.from({length:info.width*info.height},(_,i)=>l.visible?Math.round(data[i*4+3]*l.opacity/255):0)});
  }
  return {layers,sourceHash:digest.digest('hex')};
}
export function pointerContext(scene:any,source?:Awaited<ReturnType<typeof pointerSource>>) {return preparePointerBrush(scene,source?.layers,source?.sourceHash);}

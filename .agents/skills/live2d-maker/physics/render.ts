import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { put, json } from './input.ts';
import { ComponentScene } from '../../../../web/studio/component-physics-model.js';
import { hash } from './input.ts';
import { configHash, traceWindow,simulationHash } from './evidence.ts';

// Private tool session: uses the exact public studio modules. It does not add
// a separate editor entry or run a second renderer implementation.
export async function renderFingerprint(source:string,catalog:any=undefined){
  catalog??=await json(join(source,'catalog.json'));
  const sourceFiles=[...new Set(catalog.layers.flatMap((l:any)=>[l.original,l.masked,...(l.projection?[l.projection.base,...l.projection.shadows.map((s:any)=>s.original)]:[])]))] as string[];
  return hash(JSON.stringify(await Promise.all([new URL('render.ts',import.meta.url),...['renderer.js','physics-renderer.js','projection-field.js','component-physics-binding.js','lighting-model.js','part-maps.js','harmonic-fill.js'].map(n=>new URL('../../../../web/studio/'+n,import.meta.url)),new URL('../../../../pnpm-lock.yaml',import.meta.url),...['catalog.json','color.png','normal.png','depth.png',...sourceFiles].map(n=>join(source,n))].map(async p=>{try{return hash(await readFile(p));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;return null;}}))));
}
export async function renderFrames(config:any, source:string, evidence:string, requests:{test:string;steps:number[];modes:string[];cropSteps?:number[];components?:string[]}[], signal?:AbortSignal) {
  const catalog=await json(join(source,'catalog.json')),manifest=await json(join(evidence,'manifest.json'));
  if(manifest.configHash!==configHash(config))throw Error('模拟证据已过期');
  if(manifest.simulationHash!==await simulationHash())throw Error('运行时或输入已改变，请重新模拟再取图');
  const root=fileURLToPath(new URL('../../../../',import.meta.url)),renderHash=await renderFingerprint(source,catalog);
  const vendors:any={'/vendor/three.module.js':'node_modules/three/build/three.module.js','/vendor/three.core.js':'node_modules/three/build/three.core.js','/vendor/mtoon.js':'node_modules/@pixiv/three-vrm-materials-mtoon/lib/three-vrm-materials-mtoon.module.js'};
  const server=createServer(async(req,res)=>{
    try {
      const path=new URL(req.url||'/','http://localhost').pathname;
      if(path==='/') {res.setHeader('Content-Type','text/html');res.end('<script type="importmap">{"imports":{"three":"/vendor/three.module.js","@pixiv/three-vrm-materials-mtoon":"/vendor/mtoon.js"}}</script><div style="width:100vw;height:100vh"><canvas></canvas></div>');return;}
      let file:string|undefined;
      if(vendors[path])file=join(root,vendors[path]);
      else if(/^\/studio\/[a-z-]+\.js$/.test(path))file=join(root,'web',path);
      else if(/^\/source\/(color|normal|depth|part-\d+-(original|masked))\.png$/.test(path))file=join(source,path.split('/').at(-1)!);
      if(!file)throw Error('无效资源');
      res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'image/png');res.end(await readFile(file));
    }catch {res.writeHead(404);res.end();}
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address() as any).port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:Math.min(1400,catalog.canvas.width),height:Math.min(1200,catalog.canvas.height)},deviceScaleFactor:1});
  const sourceScene=new ComponentScene(config);
  const padding=Math.ceil(Math.max(0,...[...sourceScene.bodies.values()].map(b=>b.maxDistance+b.freeLength*.05))+Math.hypot(catalog.canvas.width,catalog.canvas.height)*.04)+2;
  const parentMargin=Math.max(1,...[...sourceScene.bodies.values()].map(b=>b.freeLength))*.05+Math.hypot(catalog.canvas.width,catalog.canvas.height)*.04;
  const cropRects=[...sourceScene.bodies].map(([id,body])=>{const c=body.component,b=Array.from(body.rest) as number[],xs=b.filter((_:number,i:number)=>i%2===0),ys=b.filter((_:number,i:number)=>i%2===1),margin=Math.ceil(c.authoring.freeLength*c.limits.maxTravel+parentMargin)+8;const x=Math.max(-padding,Math.floor(Math.min(...xs))-margin),y=Math.max(-padding,Math.floor(Math.min(...ys))-margin),width=Math.min(catalog.canvas.width+padding-x,Math.ceil(Math.max(...xs))+margin-x),height=Math.min(catalog.canvas.height+padding-y,Math.ceil(Math.max(...ys))+margin-y);return {id,left:x+padding,top:y+padding,width,height};});
  const files:any[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:'+port);
    const neutralCheck=await page.evaluate(async({config,catalog}:any)=>{
      const base='/studio/';const {LightingStage,loadImage}=await import(base+'renderer.js');
      const {PhysicsRenderer}=await import(base+'physics-renderer.js');const {ComponentScene}=await import(base+'component-physics-model.js');
      const {extractPartMaps}=await import(base+'part-maps.js');const {applyTestInput}=await import(base+'physics-test-input.js');
      const {resolveComponentBindings}=await import(base+'component-physics-binding.js');
      const pixels=(image:any)=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      const [color,normal,depth]=await Promise.all(['color','normal','depth'].map(async kind=>{try{return await loadImage('/source/'+kind+'.png');}catch{return null;}}));
      const stage=new LightingStage(document.querySelector('canvas'));await stage.load({color,normal,depth});
      const {width:w,height:h}=catalog.canvas,flat=(rgba:number[])=>{const result=new Uint8ClampedArray(w*h*4);for(let i=0;i<result.length;i+=4)result.set(rgba,i);return result;};
      const layers=[];for(const l of catalog.layers){const [a,b]=await Promise.all([l.original,l.masked].map(async f=>pixels(await loadImage('/source/'+f))));for(let i=3;i<a.length;i+=4){a[i]=Math.round(a[i]*l.opacity/255);b[i]=l.visible?Math.round(b[i]*l.opacity/255):0;}let projection=null;if(l.projection){const rgba=pixels(await loadImage('/source/'+l.projection.base));for(let i=3;i<rgba.length;i+=4)rgba[i]=l.visible?Math.round(rgba[i]*l.opacity/255):0;const shadows=[];for(const s of l.projection.shadows){const data=pixels(await loadImage('/source/'+s.original));for(let i=3;i<data.length;i+=4)data[i]=s.visible?Math.round(data[i]*s.opacity/255):0;shadows.push({...s,rgba:data});}projection={...l.projection,rgba,shadows};}layers.push({...l,rgba:a,maskedRgba:b,projection});}
      const maps=extractPartMaps(w,h,layers,normal?pixels(normal):flat([128,128,255,255]),depth?pixels(depth):flat([128,128,128,255]));for(const l of layers)l.map=maps.get(l.id);
      const scene=new ComponentScene(config),bodies=new Map(),bindings=resolveComponentBindings(config,layers);if(bindings.issues.length)throw Error('动态来源映射未完成：'+JSON.stringify(bindings.issues));for(const[id,c]of bindings.assignments){const b=scene.bodies.get(c);if(b)bodies.set(id,b);}
      const renderer=new PhysicsRenderer(stage,layers,bodies,[w,h],scene);
      const neutral=renderer.verifyNeutral(pixels(color));
      (window as any).evidence={stage,scene,renderer,applyTestInput,w,h,layers};
      return {...neutral,padding:renderer.padding,outputSize:renderer.outputSize};
    },{config,catalog});
    for(const request of requests) {
      const run=manifest.runs.find((r:any)=>r.test===request.test);if(!run)throw Error('未知证据测试');
      const steps=[...new Set(request.steps)].sort((a,b)=>a-b);if(steps.length>600||steps.some(n=>!Number.isInteger(n)||n<0||n>960))throw Error('证据帧超出范围');
      const expectedRows=new Map((await traceWindow(evidence,request.test,steps,600)).map((r:any)=>[r.step,r]));
      if(request.modes.some(m=>!['color','lit','normal','depth'].includes(m)))throw Error('无效渲染模式');
      await page.evaluate(()=>{const e=(window as any).evidence;e.scene.reset();e.step=0;});
      for(const step of steps) {
        signal?.throwIfAborted();
        for(const mode of request.modes) {
          const bytes=await page.evaluate(({step,test,mode,expected}:any)=>{
            const e=(window as any).evidence;while(e.step<step){e.applyTestInput(e.scene,test,++e.step);e.scene.step();}
            if(!expected.sourcePose||Object.keys(e.scene.sourcePose).some(k=>Math.abs(e.scene.sourcePose[k]-expected.sourcePose[k])>1e-9))throw Error('父级姿态与离线轨迹不一致；需要重新生成证据');
            for(const[id,body]of e.scene.bodies){const row=expected.components[id];if(!row||row.positions.length!==body.positions.length||body.positions.some((v:number,i:number)=>Math.abs(v-row.positions[i])>1e-7))throw Error('离线模拟与工作台重放不一致：'+id+' / '+step+'；需要重新生成证据');}
            e.renderer.update();e.stage.setMode(mode==='color'?'color':mode,false);const[w,h]=e.renderer.outputSize;e.stage.renderer.setSize(w,h,false);e.stage.frame(w,h,true);return e.stage.canvas.toDataURL('image/png').split(',')[1];
          },{step,test:request.test,mode,expected:expectedRows.get(step)});
          const path=request.test+'/frames/'+String(step).padStart(4,'0')+'-'+mode+'.png';await mkdir(join(evidence,request.test,'frames'),{recursive:true});await writeFile(join(evidence,path),Buffer.from(bytes,'base64'));
          files.push({path,test:request.test,step,mode,configHash:manifest.configHash,renderHash});
          // Fixed source-space crops keep original pixels. Crop margins are
          // motion bounds, not a moving camera that could hide attachment slip.
          for(const {id,left,top,width,height} of cropRects) {
            if(request.cropSteps&&!request.cropSteps.includes(step)||request.components&&!request.components.includes(id))continue;
            if(width<1||height<1)throw Error('组件轮廓不在源画布内');
            const crop=request.test+'/crops/'+hash(id).slice(0,10)+'-'+id.replace(/[^a-zA-Z0-9_-]/g,'_')+'/'+String(step).padStart(4,'0')+'-'+mode+'.png';await mkdir(resolve(join(evidence,crop),'..'),{recursive:true});await sharp(join(evidence,path)).extract({left,top,width,height}).png().toFile(join(evidence,crop));
            files.push({path:crop,test:request.test,step,mode,component:id,rect:{left,top,width,height},configHash:manifest.configHash,renderHash});
          }
        }
      }
    }
    if(errors.length)throw Error('渲染失败：'+errors.join('; '));
    const old=await (await import('./input.ts')).optional(join(evidence,'frames.json'))||[];
    const all=[...new Map([...old.filter((f:any)=>f.configHash===manifest.configHash&&f.renderHash===renderHash),...files].map(f=>[f.path,f])).values()];await put(join(evidence,'frames.json'),all);
    const completed=manifest.runs.every((r:any)=>Array.from({length:81},(_,i)=>i*12).every(step=>['color','lit'].every(mode=>all.some((f:any)=>f.test===r.test&&f.step===step&&f.mode===mode&&!f.component))));
    manifest.replayVerification='all-rendered-mesh-vertices';manifest.neutralCheck=neutralCheck;manifest.framePadding=padding;manifest.renderHash=renderHash;manifest.renderSource=catalog.previewMode||'assembled';manifest.renderDirectory=relative(evidence,source);manifest.lighting=await page.evaluate(()=>(window as any).evidence.stage.settings);manifest.coverage.render=completed?'completed':'partial';manifest.renderVersion='studio-physics-renderer-1';await put(join(evidence,'manifest.json'),manifest);return files;
  }finally {await browser.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}

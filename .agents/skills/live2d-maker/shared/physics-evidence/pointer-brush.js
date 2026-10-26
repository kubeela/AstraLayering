import {resolveComponentBindings} from '../physics-core/component-physics-binding.js';
import {mobilityAt} from '../physics-core/component-physics-geometry.js';
import {pointerCommand,pointerContactVersion} from './physics-pointer-contact.js';
export const pointerBrushVersion='astra-pointer-brush-2';
const alpha=(l,x,y)=>{const b=l.bounds,ix=Math.floor(x-b.x),iy=Math.floor(y-b.y);if(ix<0||iy<0||ix>=b.width||iy>=b.height)return 0;const i=iy*b.width+ix;return l.maskedAlpha?l.maskedAlpha[i]:l.maskedRgba[i*4+3];};
const nearestSupport=(point,supports)=>supports.reduce((best,s)=>Math.hypot(point[0]-s.at[0],point[1]-s.at[1])<Math.hypot(point[0]-best.at[0],point[1]-best.at[1])?s:best,supports[0]);

// Select a visible source pixel in a free region, after layer occlusion.
// The path is fixed in canvas space: it never grabs/follows a moving vertex.
export function preparePointerBrush(scene,layers,sourceHash=null) {
  const {width,height}=scene.config.source.canvas,basis=layers?'source-alpha':'geometry-only';
  const paths=[],contactLayers={};
  const resolution=layers?resolveComponentBindings(scene.config,layers):null;
  if(resolution?.issues.length)throw Error('轻扫来源绑定不完整：'+JSON.stringify(resolution.issues));
  const topAlpha=layers?new Float32Array(width*height):null;
  const exposed=new Map();
  if(layers)for(let n=layers.length-1;n>=0;n--) {
    const l=layers[n],b=l.bounds,visible=new Uint8Array(b.width*b.height);
    for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++) {
      const gx=b.x+x,gy=b.y+y;if(gx<0||gy<0||gx>=width||gy>=height)continue;
      const i=gy*width+gx,a=alpha(l,gx,gy)/255;
      visible[y*b.width+x]=Math.round(a*(1-topAlpha[i])*255);topAlpha[i]+=a*(1-topAlpha[i]);
    }
    if(resolution.assignments.has(l.id))exposed.set(l.id,visible);
  }
  for(const [id,body]of scene.bodies) {
    const c=body.component,root=c.supports[0].at,parts=layers?.filter(l=>resolution.assignments.get(l.id)===id)||[];
    contactLayers[id]=parts.map(l=>({id:l.id,uuid:l.uuid,contentHash:l.contentHash,bounds:l.bounds,maskedAlpha:l.maskedAlpha||Uint8Array.from({length:l.bounds.width*l.bounds.height},(_,i)=>l.maskedRgba[i*4+3])}));
    let point=null,best=-1,source=null;
    if(layers)for(const l of parts) {
      const b=l.bounds,visible=exposed.get(l.id);
      for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++) {
        const value=visible[y*b.width+x];if(value<=32)continue;
        const p=[b.x+x+.5,b.y+y+.5],pin=nearestSupport(p,c.supports).at,distance=Math.hypot(p[0]-pin[0],p[1]-pin[1]),mobility=c.kind==='pendant'?Math.min(1,distance/body.freeLength):mobilityAt(p,c.authoring);
        if(mobility<.15)continue;
        const score=mobility*(value/255)+distance/body.freeLength*.1;
        if(score>best&&body.hit(...p,parts)){best=score;point=p;source={layerId:l.id,uuid:l.uuid,contentHash:l.contentHash,exposedAlpha:value,mobility};}
      }
    }
    else for(let i=0;i<body.weights.length;i++) {
      const p=[body.rest[i*2],body.rest[i*2+1]],score=body.weights[i]+Math.hypot(p[0]-root[0],p[1]-root[1])/Math.max(1,body.freeLength)*.1;
      if(body.weights[i]>0&&score>best){best=score;point=p;}
    }
    if(!point){paths.push({id,status:'no-visible-free-pixel',reason:'当前合成中没有可见且可活动的源像素；通过支撑／微风检查联动，不凭空施加鼠标力',layerRefs:c.layerRefs});continue;}
    const pin=nearestSupport(point,c.supports),dx=point[0]-pin.at[0],dy=point[1]-pin.at[1],length=Math.max(1e-9,Math.hypot(dx,dy));
    paths.push({id,status:'reachable',sourcePoint:point,anchor:{id:pin.id,at:pin.at},start:point,velocity:[width*.01*dy/length,-width*.01*dx/length],radius:Math.max(2,height*.01),startStep:60,endStep:90,source});
  }
  return {version:pointerBrushVersion,contactVersion:pointerContactVersion,basis,sourceHash,stepHz:120,force:1,paths,contactLayers};
}
export function pointerBrushMetadata(context) {
  const {contactLayers,...metadata}=context;return metadata;
}
export function applyPointerBrush(scene,step) {
  const context=scene.pointerBrush;if(!context)throw Error('连续轻扫缺少已解析的源像素／路径');
  scene.pointerCommands=[];
  for(const path of context.paths) {
    if(path.status!=='reachable'||step<path.startStep||step>=path.endStep)continue;
    const dt=1/120,t=(step-path.startStep)/120,from=path.start.map((p,i)=>p+path.velocity[i]*t),to=from.map((p,i)=>p+path.velocity[i]*dt),body=scene.bodies.get(path.id);
    if(!body)continue;
    const command=context.basis==='source-alpha'?pointerCommand(body,context.contactLayers[path.id],from,to,dt,path.radius,context.force):{type:'impulse',id:path.id,args:[...from,...path.velocity,path.radius,dt*12]};
    if(command){if(command.type==='surface-impulse')body.surfaceImpulse(...command.args);else body.impulse(...command.args);scene.pointerCommands.push({...command,pathFrom:from,pathTo:to});}
  }
}

import { clamp, boundaryPoint, rollWeight, rollBend, weights, isHanging, evaluateRoot, inertiaWeights } from './deformer.mjs';
import { HeadPhysics } from './physics.mjs';
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec2 aUV;
layout(location=1) in float aWeight;
${Array.from({length:9},(_,i)=>`layout(location=${i+2}) in vec2 aK${i};`).join('\n')}
layout(location=11) in float aBend;
layout(location=12) in vec2 aInertia;
uniform vec4 uInertia;
uniform float uKeys[9];uniform vec4 uView;uniform vec2 uPivot;uniform float uRoll;
uniform bool uSkin;uniform float uSkinRadius;uniform bool uHanging;uniform vec2 uRoot;
out vec2 vUV;
vec2 rotate(vec2 v,float a){float c=cos(a),s=sin(a);return vec2(v.x*c-v.y*s,v.x*s+v.y*c);}
void main(){
 vec2 p=${Array.from({length:9},(_,i)=>`aK${i}*uKeys[${i}]`).join('+')};
 if(uHanging){vec2 d=uRoot-uPivot;p+=(rotate(d,uRoll)-d)*aWeight;vec2 local=${Array.from({length:9},(_,i)=>`aK${i}*uKeys[${i}]`).join('+')}-uRoot;p+=rotate(local,uRoll*aBend)-local;}
 else{vec2 d=p-uPivot;if(uSkin)d.x=clamp(d.x,-uSkinRadius,uSkinRadius);p+= (rotate(d,uRoll)-d)*aWeight;}
 p+=aInertia.x*uInertia.xy+aInertia.y*uInertia.zw;
 vec2 q=(p-uView.xy)/uView.zw;
 gl_Position=vec4(q.x*2.-1.,1.-q.y*2.,0.,1.);vUV=aUV;
}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 vUV;uniform sampler2D uTexture;
uniform bool uMask;out vec4 color;
void main(){vec4 t=texture(uTexture,vUV);if(uMask&&t.a<.15)discard;color=t;}`;
function shader(gl,kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const hairKinds=new Set(['rearL','rearR','sideL','sideR','ribbonL','ribbonR','fringe','bun','crown','halo','ornamentL','ornamentR','forehead','earringL','earringR']);
export class Renderer {
 constructor(canvas,rig,layers){this.canvas=canvas;this.rig=rig;this.layers=layers;this.meshes=[];this.view=rig.preview.viewBox.slice();this.hiddenHair=false;this.physics=new HeadPhysics(rig);}
 async init(){
  const gl=this.canvas.getContext('webgl2',{alpha:false,antialias:true,stencil:true,preserveDrawingBuffer:false});
  if(!gl)throw new Error('此例需要 WebGL 2。请开启浏览器硬件加速后重试。');this.gl=gl;
  const vs=shader(gl,gl.VERTEX_SHADER,VERT),fs=shader(gl,gl.FRAGMENT_SHADER,FRAG),program=gl.createProgram();
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  this.program=program;gl.useProgram(program);this.uniforms=Object.fromEntries(['uInertia','uSkin','uSkinRadius','uKeys','uView','uPivot','uRoll','uTexture','uHanging','uRoot','uMask'].map(n=>[n,gl.getUniformLocation(program,n)]));
  const images=await Promise.all(this.layers.map(l=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法加载 '+l.file));im.src=new URL(l.file,import.meta.url).href;})));
  this.meshes=this.layers.map((layer,i)=>this.createMesh(layer,images[i]));
  gl.enable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.uniform1i(this.uniforms.uTexture,0);gl.uniform2fv(this.uniforms.uPivot,this.rig.head.neckPivot);
 }
 createMesh(layer,image){
  const gl=this.gl,step=this.rig.preview.meshStep,[x,y,w,h]=layer.box;
  const nx=Math.ceil(w/step),ny=Math.ceil(h/step),stride=24,data=new Float32Array((nx+1)*(ny+1)*stride);
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const px=x+w*i/nx,py=y+h*j/ny,k=(j*(nx+1)+i)*stride;
   data[k]=i/nx;data[k+1]=j/ny;data[k+2]=rollWeight(px,py,layer.kind,this.rig);data[k+21]=rollBend(px,py,layer.kind,this.rig);data.set(inertiaWeights(py,layer.kind,this.rig),k+22);
   this.rig.keyCoordinates.forEach(([kx,ky],n)=>data.set(boundaryPoint(px,py,layer.kind,kx,ky,this.rig),k+3+n*2));
  }
  if((nx+1)*(ny+1)>65535)throw Error('Head mesh exceeds index budget: '+layer.file);
  const indices=new Uint16Array(nx*ny*6);let k=0;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.set([a,b,c,b,d,c],k);k+=6;}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  for(let n=0;n<13;n++){const size=n===1||n===11?1:2,off=n===0?0:n===1?2:n===11?21:n===12?22:3+(n-2)*2;gl.enableVertexAttribArray(n);gl.vertexAttribPointer(n,size,gl.FLOAT,false,stride*4,off*4);}
  const indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return {vao,buffer,indexBuffer,texture,count:indices.length,layer};
 }
 resize(faceOnly=false){
  const c=this.canvas,dpr=Math.min(devicePixelRatio||1,2),r=c.getBoundingClientRect();
  c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));
  let [x,y,w,h]=faceOnly?this.rig.preview.closeup:this.rig.preview.viewBox;
  const aspect=c.width/c.height;if(w/h<aspect){const next=h*aspect;x-=(next-w)/2;w=next;}else{const next=w/aspect;y-=faceOnly?(next-h)/2:(next-h);h=next;}
  this.view=[x,y,w,h];
 }
 drawMesh(m,p,{mask=false}={}) {
  const gl=this.gl,u=this.uniforms,hanging=isHanging(m.layer.kind,this.rig);
  gl.uniform1i(u.uSkin,m.layer.kind==='skin'||m.layer.kind==='skinShadow'?1:0);gl.uniform1f(u.uSkinRadius,this.rig.neck.rollRadius);gl.uniform1i(u.uHanging,hanging?1:0);if(hanging)gl.uniform2fv(u.uRoot,evaluateRoot(m.layer.kind,p,this.rig));
  gl.uniform4fv(u.uInertia,this.physics.outputs[m.layer.kind]||[0,0,0,0]);
  gl.uniform1i(u.uMask,mask?1:0);
  gl.blendFunc(m.layer.blend==='multiply'?gl.DST_COLOR:gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.bindVertexArray(m.vao);gl.bindTexture(gl.TEXTURE_2D,m.texture);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);
 }
 draw(p){
  const gl=this.gl;if(!gl||gl.isContextLost())return;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.stencilMask(255);gl.disable(gl.STENCIL_TEST);gl.clearColor(.918,.902,.875,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);gl.useProgram(this.program);
  gl.uniform1fv(this.uniforms.uKeys,weights(clamp(p.x/30,-1,1),clamp(p.y/30,-1,1)));gl.uniform1f(this.uniforms.uRoll,clamp(p.z,-20,20)*Math.PI/180);gl.uniform4fv(this.uniforms.uView,this.view);
  const face=this.meshes.find(m=>m.layer.kind==='face');
  let faceMask=false;
  const outsideFace=()=>{
   if(!face)return;
   if(!faceMask){gl.enable(gl.STENCIL_TEST);gl.stencilFunc(gl.ALWAYS,1,255);gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);gl.colorMask(false,false,false,false);this.drawMesh(face,p,{mask:true});gl.colorMask(true,true,true,true);gl.stencilMask(0);faceMask=true;}
   gl.enable(gl.STENCIL_TEST);gl.stencilFunc(gl.EQUAL,0,255);gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
  };
  for(const m of this.meshes){
   if(this.hiddenHair&&hairKinds.has(m.layer.kind))continue;
   if(m.layer.kind==='faceBare'&&!this.hiddenHair||m.layer.kind==='face'&&this.hiddenHair)continue;
   // Earrings are hanging objects, clipped by the real moving face silhouette.
   if(m.layer.kind.startsWith('earring'))outsideFace();else gl.disable(gl.STENCIL_TEST);
   this.drawMesh(m,p);
  }
  gl.disable(gl.STENCIL_TEST);gl.bindVertexArray(null);
 }
 advance(p,dt){return this.physics.advance(p,dt);}
 resetPhysics(p){this.physics.reset(p);}
 setPhysics(value,p){this.physics.enabled=value;this.resetPhysics(p);}
 destroy(){const gl=this.gl;if(!gl)return;for(const m of this.meshes){gl.deleteTexture(m.texture);gl.deleteBuffer(m.buffer);gl.deleteBuffer(m.indexBuffer);gl.deleteVertexArray(m.vao);}gl.deleteProgram(this.program);this.meshes=[];}
}

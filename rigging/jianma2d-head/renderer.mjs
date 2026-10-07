import { boundaryPoint, rollWeight, weights } from './deformer.mjs';
const VERT=`#version 300 es
precision highp float;
layout(location=0) in vec2 aUV;
layout(location=1) in float aWeight;
${Array.from({length:9},(_,i)=>`layout(location=${i+2}) in vec2 aK${i};`).join('\n')}
uniform float uKeys[9];uniform vec4 uView;uniform vec2 uPivot;uniform float uRoll;
out vec2 vUV;
void main(){
 vec2 p=${Array.from({length:9},(_,i)=>`aK${i}*uKeys[${i}]`).join('+')};
 vec2 d=p-uPivot;float c=cos(uRoll),s=sin(uRoll);
 p=mix(p,uPivot+vec2(d.x*c-d.y*s,d.x*s+d.y*c),aWeight);
 vec2 q=(p-uView.xy)/uView.zw;
 gl_Position=vec4(q.x*2.-1.,1.-q.y*2.,0.,1.);vUV=aUV;
}`;
const FRAG=`#version 300 es
precision highp float;
in vec2 vUV;uniform sampler2D uTexture;out vec4 color;
void main(){vec4 t=texture(uTexture,vUV);color=vec4(t.rgb*t.a,t.a);}`;
function shader(gl,kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
export class Renderer {
 constructor(canvas,rig,layers){this.canvas=canvas;this.rig=rig;this.layers=layers;this.meshes=[];this.view=rig.preview.viewBox.slice();this.hiddenHair=false;}
 async init(){
  const gl=this.canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:false});
  if(!gl)throw new Error('此例需要 WebGL 2。请开启浏览器硬件加速后重试。');this.gl=gl;
  const vs=shader(gl,gl.VERTEX_SHADER,VERT),fs=shader(gl,gl.FRAGMENT_SHADER,FRAG),program=gl.createProgram();
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  this.program=program;gl.useProgram(program);this.uniforms=Object.fromEntries(['uKeys','uView','uPivot','uRoll','uTexture'].map(n=>[n,gl.getUniformLocation(program,n)]));
  const images=await Promise.all(this.layers.map(l=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('无法加载 '+l.file));im.src=new URL(l.file,import.meta.url).href;})));
  this.meshes=this.layers.map((layer,i)=>this.createMesh(layer,images[i]));
  // Ear pendants are attached behind the face surface. At a yaw extreme the far
  // pendant must be occluded by the cheek, never painted across the far eye.
  const earrings=this.meshes.filter(m=>m.layer.groups.some(id=>id.includes('earring')));
  this.meshes=this.meshes.filter(m=>!earrings.includes(m));
  const faceIndex=this.meshes.findIndex(m=>m.layer.kind==='face');
  this.meshes.splice(faceIndex,0,...earrings);
  gl.enable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.uniform1i(this.uniforms.uTexture,0);gl.uniform2fv(this.uniforms.uPivot,this.rig.head.neckPivot);
 }
 createMesh(layer,image){
  const gl=this.gl,step=this.rig.preview.meshStep,[x,y,w,h]=layer.box;
  const nx=Math.ceil(w/step),ny=Math.ceil(h/step),stride=21,data=new Float32Array((nx+1)*(ny+1)*stride);
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const px=x+w*i/nx,py=y+h*j/ny,k=(j*(nx+1)+i)*stride;
   data[k]=i/nx;data[k+1]=j/ny;data[k+2]=rollWeight(px,py,layer.kind,this.rig);
   this.rig.keyCoordinates.forEach(([kx,ky],n)=>data.set(boundaryPoint(px,py,layer.kind,kx,ky,this.rig),k+3+n*2));
  }
  const indices=new Uint16Array(nx*ny*6);let k=0;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.set([a,b,c,b,d,c],k);k+=6;}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  for(let n=0;n<11;n++){const size=n===1?1:2,off=n===0?0:n===1?2:3+(n-2)*2;gl.enableVertexAttribArray(n);gl.vertexAttribPointer(n,size,gl.FLOAT,false,stride*4,off*4);}
  const indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return {vao,buffer,indexBuffer,texture,count:indices.length,layer};
 }
 resize(faceOnly=false){
  const c=this.canvas,dpr=Math.min(devicePixelRatio||1,2),r=c.getBoundingClientRect();
  c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));
  let [x,y,w,h]=faceOnly?[355,110,340,260]:this.rig.preview.viewBox;
  const aspect=c.width/c.height;if(w/h<aspect){const next=h*aspect;x-=(next-w)/2;w=next;}else{const next=w/aspect;y-=faceOnly?(next-h)/2:(next-h);h=next;}
  this.view=[x,y,w,h];
 }
 draw(p){
  const gl=this.gl;if(!gl||gl.isContextLost())return;
  gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.918,.902,.875,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);
  gl.uniform1fv(this.uniforms.uKeys,weights(p.x/30,p.y/30));gl.uniform1f(this.uniforms.uRoll,p.z*Math.PI/180);gl.uniform4fv(this.uniforms.uView,this.view);
  for(const m of this.meshes){
   if(this.hiddenHair&&['hair','rear','ribbon','skull'].includes(m.layer.kind))continue;
   gl.blendFunc(m.layer.blend==='multiply'?gl.DST_COLOR:gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   gl.bindVertexArray(m.vao);gl.bindTexture(gl.TEXTURE_2D,m.texture);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);
  }
  gl.bindVertexArray(null);
 }
 destroy(){const gl=this.gl;for(const m of this.meshes){gl.deleteTexture(m.texture);gl.deleteBuffer(m.buffer);gl.deleteBuffer(m.indexBuffer);gl.deleteVertexArray(m.vao);}gl.deleteProgram(this.program);this.meshes=[];}
}

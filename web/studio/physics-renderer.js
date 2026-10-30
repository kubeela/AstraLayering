import * as THREE from 'three';
const raster = (data, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0); return c; };
const pixels = c => c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
function tex(data, w, h, color = false) {
  const t = new THREE.DataTexture(new Uint8Array(data), w, h); t.flipY = true;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}
const vertex = `varying vec2 sourceUV; varying vec2 restPixel; varying vec2 currentPixel;
attribute vec2 rest;
void main(){sourceUV=uv;restPixel=rest;currentPixel=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragment = `uniform sampler2D colorMap; uniform sampler2D dataMap;
uniform int pass; uniform float strength; uniform float normalY;
varying vec2 sourceUV; varying vec2 restPixel; varying vec2 currentPixel;
void main(){
 if(any(lessThan(sourceUV,vec2(0.0)))||any(greaterThan(sourceUV,vec2(1.0))))discard;
 vec4 color=texture2D(colorMap,sourceUV);float alpha=color.a;if(alpha<0.001)discard;
 vec4 m=texture2D(dataMap,sourceUV);vec3 rgb=color.rgb;
 if(pass==1){
  vec3 n=vec3((m.xy*2.0-1.0)*strength,m.z*2.0-1.0);n.y*=normalY;n.z=max(n.z,0.005);
  vec2 a=dFdx(restPixel),b=dFdy(restPixel),c=dFdx(currentPixel),d=dFdy(currentPixel);
  float det=a.x*b.y-a.y*b.x;
  if(abs(det)>0.000001){
   float j00=(c.x*b.y-d.x*a.y)/det,j01=(-c.x*b.x+d.x*a.x)/det;
   float j10=(c.y*b.y-d.y*a.y)/det,j11=(-c.y*b.x+d.y*a.x)/det;
   float jd=j00*j11-j01*j10;
   if(jd>0.000001){vec2 g=vec2(n.x,-n.y);g=vec2(j11*g.x-j10*g.y,-j01*g.x+j00*g.y)/jd;n.xy=vec2(g.x,-g.y);}
  }
  rgb=normalize(n)*0.5+0.5;
 }
 if(pass==2)rgb=vec3(m.a);
 gl_FragColor=vec4(rgb*alpha,alpha);
}`;
// Cache consecutive static layers, preserving their exact place between moving
// pieces. Only the moving meshes and cached strata are drawn each frame.
function staticPiece(layers) {
  if (layers.length === 1) return layers[0];
  let x = Infinity, y = Infinity, right = 0, bottom = 0;
  for (const l of layers) { x = Math.min(x, l.bounds.x); y = Math.min(y, l.bounds.y); right = Math.max(right, l.bounds.x + l.bounds.width); bottom = Math.max(bottom, l.bounds.y + l.bounds.height); }
  const w = right - x, h = bottom - y, canvases = Array.from({ length: 3 }, () => raster(new Uint8ClampedArray(w * h * 4), w, h));
  for (const l of layers) {
    const n = new Uint8ClampedArray(l.rgba.length), d = new Uint8ClampedArray(n.length), color = new Uint8ClampedArray(l.rgba);
    for (let q = 0; q < n.length; q += 4) { const m = l.map.data; color[q + 3] = n[q + 3] = d[q + 3] = l.maskedRgba[q + 3]; n.set(m.subarray(q, q + 3), q); d[q] = d[q + 1] = d[q + 2] = m[q + 3]; }
    for (const [i, bytes] of [color, n, d].entries()) canvases[i].getContext('2d').drawImage(raster(bytes, l.bounds.width, l.bounds.height), l.bounds.x - x, l.bounds.y - y);
  }
  const rgba = pixels(canvases[0]), normal = pixels(canvases[1]), depth = pixels(canvases[2]), data = new Uint8Array(rgba.length);
  for (let q = 0; q < data.length; q += 4) { data.set(normal.subarray(q, q + 3), q); data[q + 3] = depth[q]; }
  return { bounds: { x, y, width: w, height: h }, rgba, maskedRgba: rgba, map: { data } };
}
export class PhysicsRenderer {
  constructor(stage, layers, bodies, size) {
    this.stage = stage; this.bodies = bodies; this.size = size; this.items = []; this.dirty = true;
    const [w, h] = size;
    if (Math.max(w, h) > stage.renderer.capabilities.maxTextureSize) throw Error('贴图超出 GPU 上限，未降低精度');
    this.scene = new THREE.Scene(); this.camera = new THREE.OrthographicCamera(0, w, 0, h, .1, 10); this.camera.position.z = 1;
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this.scratch = new THREE.WebGLRenderTarget(w, h, opts);
    this.targets = Array.from({ length: 3 }, () => new THREE.WebGLRenderTarget(w, h, opts));
    this.targets[0].texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.resolveScene = new THREE.Scene(); this.resolveCamera = new THREE.Camera();
    this.resolveMaterial = new THREE.ShaderMaterial({ depthTest: false, depthWrite: false,
      uniforms: { source: { value: this.scratch.texture }, pass: { value: 0 } },
      vertexShader: 'varying vec2 coord;void main(){coord=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader: 'uniform sampler2D source;uniform int pass;varying vec2 coord;void main(){vec4 c=texture2D(source,coord);vec3 rgb=c.a>0.00001?c.rgb/c.a:vec3(0.0);if(pass==0)rgb=mix(rgb/12.92,pow((rgb+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),rgb));gl_FragColor=vec4(rgb,c.a);}' });
    this.resolveQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.resolveMaterial); this.resolveScene.add(this.resolveQuad);
    let pending = [];
    const flush = () => { if (pending.length) { this.add(staticPiece(pending)); pending = []; } };
    for (const l of layers) { if (bodies.has(l.id)) { flush(); this.add(l, bodies.get(l.id)); } else pending.push(l); } flush();
    this.saved = { color: stage.color, normal: stage.normal, depth: stage.depth, surface: stage.depthUniforms.studioDepth.value,
      geometry: stage.mesh.geometry, caster: stage.caster.geometry, distance: stage.caster.customDistanceMaterial };
    this.displayGeometry = new THREE.PlaneGeometry(2 * w / h, 2);
    this.casterGeometry = new THREE.PlaneGeometry(2 * w / h, 2, Math.round(256 * w / h), 256);
    this.distance = new THREE.MeshDistanceMaterial({ map: this.targets[0].texture, alphaTest: .5, side: THREE.DoubleSide });
    const uniforms = { movingDepth: { value: this.targets[2].texture }, movingScale: { value: stage.settings.depthScale } };
    this.distance.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'uniform sampler2D movingDepth;uniform float movingScale;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z=(texture2D(movingDepth,uv).r-0.5)*movingScale;');
      const original='float dist = length( vWorldPosition - referencePosition );';
      if(!shader.fragmentShader.includes(original))throw Error('Three.js 动态深度投影接口需要复核');
      shader.fragmentShader='uniform sampler2D movingDepth;uniform float movingScale;\n'+shader.fragmentShader.replace(original,'float z=(texture2D(movingDepth,vMapUv).r-0.5)*movingScale;\nfloat dist=length(vec3(vWorldPosition.xy,z)-referencePosition);');
    };
    this.distance.customProgramCacheKey = () => 'astra-moving-depth-caster-1'; this.distanceUniforms = uniforms;
    this.baseNormalKey = `${stage.settings.normalStrength}/${stage.settings.normalY}`; this.baseDepthScale = stage.settings.depthScale;
    stage.deformation = this; stage.setMode(stage.mode);
  }
  bindOutputs(neutral) {
    if(this.usingBaseline===neutral)return;
    const stage=this.stage,saved=this.saved;
    stage.color=neutral?saved.color:this.targets[0].texture;
    stage.normal=neutral?saved.normal:this.targets[1].texture;
    stage.depth=neutral?saved.depth:this.targets[2].texture;
    stage.depthUniforms.studioDepth.value=neutral?saved.surface:stage.depth;
    stage.mesh.geometry=neutral?saved.geometry:this.displayGeometry;
    stage.caster.geometry=neutral?saved.caster:this.casterGeometry;
    stage.caster.customDistanceMaterial=neutral?saved.distance:this.distance;
    stage.material.map=stage.material.shadeMultiplyTexture=stage.color;stage.material.normalMap=stage.normal;
    stage.casterMaterial.map=stage.color;
    stage.basic.map=stage.mode==='normal'?stage.normal:stage.mode==='depth'?stage.depth:stage.color;
    stage.basic.needsUpdate=stage.casterMaterial.needsUpdate=stage.material.needsUpdate=true;
    stage.renderer.shadowMap.needsUpdate=true;
    this.usingBaseline=neutral;
  }
  add(l, body) {
    const b = l.bounds, rest = body?.rest || new Float64Array([b.x, b.y, b.x + b.width, b.y, b.x, b.y + b.height, b.x + b.width, b.y + b.height]);
    const g = new THREE.BufferGeometry(), pos = new Float32Array(rest.length / 2 * 3), uv = new Float32Array(rest.length);
    for (let i = 0; i < rest.length / 2; i++) { pos[i * 3] = rest[i * 2]; pos[i * 3 + 1] = rest[i * 2 + 1]; uv[i * 2] = (rest[i * 2] - b.x) / b.width; uv[i * 2 + 1] = 1 - (rest[i * 2 + 1] - b.y) / b.height; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rest', new THREE.BufferAttribute(new Float32Array(rest), 2)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(body?.indices || new Uint32Array([0, 1, 2, 1, 3, 2]), 1));
    const color = new Uint8ClampedArray(l.rgba); for (let q = 3; q < color.length; q += 4) color[q] = l.maskedRgba[q];
    // Composite in source sRGB, matching Krita/Canvas alpha blending. Decode
    // once in the resolve pass before handing the texture to MToon.
    const c = tex(color, b.width, b.height), m = tex(l.map.data, b.width, b.height);
    const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment,
      transparent: true, premultipliedAlpha: true, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
      uniforms: { colorMap: { value: c }, dataMap: { value: m }, pass: { value: 0 }, strength: { value: 1 }, normalY: { value: 1 } } });
    const mesh = new THREE.Mesh(g, material); mesh.frustumCulled = false; mesh.renderOrder = this.items.length;
    this.scene.add(mesh); this.items.push({ mesh, body, c, m });
  }
  update() {
    for (const { mesh, body } of this.items) if (body) { const p = mesh.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) { p.array[i * 3] = body.positions[i * 2]; p.array[i * 3 + 1] = body.positions[i * 2 + 1]; } p.needsUpdate = true; }
    this.dirty = true;
  }
  compose() {
    const stage = this.stage, s = stage.settings, key = `${s.normalStrength}/${s.normalY}`;
    const neutral=[...this.bodies.values()].every(b=>b.positions.every((v,i)=>Math.abs(v-b.rest[i])<.015));
    this.bindOutputs(neutral);
    // Rest and reset use the original textures and original filtered relief.
    // Preparing physics therefore preserves the exact neutral rendering and
    // does not incur an unnecessary full-frame composition.
    if(neutral){
      stage.deformation=null;
      try{if(this.baseNormalKey!==key){stage.updateNormal();this.baseNormalKey=key;}
        if(this.baseDepthScale!==s.depthScale){stage.updateRelief();this.baseDepthScale=s.depthScale;}}
      finally{stage.deformation=this;}
      return;
    }
    this.distanceUniforms.movingScale.value = s.depthScale;
    if (!this.dirty && this.settingsKey === key) return;
    this.settingsKey = key;
    const renderer = stage.renderer, target = renderer.getRenderTarget(), clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha(), scissor = renderer.getScissorTest();
    renderer.setScissorTest(false);
    try {
      for (let pass = 0; pass < 3; pass++) {
        this.resolveMaterial.uniforms.pass.value = pass;
        for (const { mesh } of this.items) { const u = mesh.material.uniforms; u.pass.value = pass; u.strength.value = s.normalStrength; u.normalY.value = s.normalY; }
        renderer.setRenderTarget(this.scratch);
        renderer.setClearColor(pass === 0 ? new THREE.Color(0, 0, 0) : pass === 1 ? new THREE.Color(.5, .5, 1) : new THREE.Color(.5, .5, .5), pass === 0 ? 0 : 1);
        renderer.clear(); renderer.render(this.scene, this.camera);
        renderer.setRenderTarget(this.targets[pass]); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(this.resolveScene, this.resolveCamera);
      }
    } finally { renderer.setRenderTarget(target); renderer.setClearColor(clear, alpha); renderer.setScissorTest(scissor); }
    this.dirty = false; stage.renderer.shadowMap.needsUpdate = true;
  }
  dispose() {
    const stage = this.stage, saved = this.saved;
    if (stage.deformation === this) {
      stage.deformation = null;
      Object.assign(stage, { color: saved.color, normal: saved.normal, depth: saved.depth });
      stage.mesh.geometry = saved.geometry; stage.caster.geometry = saved.caster; stage.caster.customDistanceMaterial = saved.distance;
      stage.depthUniforms.studioDepth.value = saved.surface;
      stage.material.map = stage.material.shadeMultiplyTexture = saved.color; stage.material.normalMap = saved.normal;
      stage.casterMaterial.map = saved.color; stage.casterMaterial.needsUpdate = stage.material.needsUpdate = true;
      stage.updateNormal(); stage.updateRelief(); stage.setMode(stage.mode);
    }
    this.scratch.dispose(); for (const t of this.targets) t.dispose();
    this.displayGeometry.dispose(); this.casterGeometry.dispose();
    for (const i of this.items) { i.mesh.geometry.dispose(); i.mesh.material.dispose(); i.c.dispose(); i.m.dispose(); }
    this.resolveQuad.geometry.dispose(); this.resolveMaterial.dispose(); this.distance.dispose();
  }
}

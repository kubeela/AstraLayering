import { validatePhysicsConfig, componentPhysicsVersion } from './component-physics-schema.js';
import { geometryFor, clothGeometry, refineControlGeometry, gridControlGeometry, mobilityAt, barycentric, clamp, smooth } from './component-physics-geometry.js';

export { componentPhysicsVersion };
const TAU = Math.PI * 2, DEG = 180 / Math.PI;
const distance = (a, b, i, j) => Math.hypot(a[i * 2] - b[j * 2], a[i * 2 + 1] - b[j * 2 + 1]);
const area = (p, a, b, c) => (p[b * 2] - p[a * 2]) * (p[c * 2 + 1] - p[a * 2 + 1]) - (p[b * 2 + 1] - p[a * 2 + 1]) * (p[c * 2] - p[a * 2]);
const angle = (ax, ay, bx, by) => Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
const rotate = (x, y, a) => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];

export class ComponentBody {
  constructor(component, scene) {
    this.component = component; this.scene = scene; this.id = component.id; this.kind = component.kind;
    this.binding = { maxAngle: component.limits.maxAngle, direction: 'down' };
    const a=component.authoring,grid=this.kind==='cloth'&&a.controlGrid?gridControlGeometry(a,component.supports):null,control=grid||(this.kind==='cloth'?clothGeometry({...a,subdivisions:a.simulationSubdivisions??0}):null);
    const mesh = grid?geometryFor(component):control?refineControlGeometry(control,Math.max(0,(a.subdivisions??2)-(a.simulationSubdivisions??0))):geometryFor(component);
    if(grid)mesh.samples=Array.from({length:mesh.rest.length/2},(_,i)=>grid.sample(mesh.rest.slice(i*2,i*2+2)));
    this.rest = new Float64Array(mesh.rest); this.indices = new Uint32Array(mesh.indices); this.positions = new Float64Array(this.rest);
    this.pose = new Float64Array(this.rest); this.weights = new Float64Array(this.rest.length / 2); this.limits = new Float64Array(this.weights.length);
    this.freeLength = component.authoring.freeLength; this.maxDistance = this.freeLength * component.limits.maxTravel;
    this.controlIndices=new Uint32Array(control?.indices||mesh.indices);
    const particles = this.kind === 'strand' ? a.centerline.flat() : control?.rest||mesh.rest;
    this.pRest = new Float64Array(particles); this.pPose = new Float64Array(particles); this.p = new Float64Array(particles);
    this.previousMesh = new Float64Array(this.positions); this.previous = new Float64Array(particles); this.velocity = new Float64Array(particles.length);
    this.mobility = new Float64Array(particles.length / 2); this.mass = new Float64Array(this.mobility.length).fill(1);
    for (let i = 0; i < this.mobility.length; i++) this.mobility[i] = this.kind === 'pendant' ? 1 : mobilityAt([particles[i * 2], particles[i * 2 + 1]], a);
    if(this.kind==='cloth')this.clothSamples=mesh.samples;
    this.clothFactors=grid?new Float64Array(this.weights.length):null;
    for (let i = 0; i < this.weights.length; i++) {
      const f=this.clothSamples?.[i];this.weights[i] = f?f[3]*this.mobility[f[0]]+f[4]*this.mobility[f[1]]+f[5]*this.mobility[f[2]]:this.kind === 'pendant' ? 1 : mobilityAt([this.rest[i * 2], this.rest[i * 2 + 1]], a);
      if(this.weights[i]<1e-10)this.weights[i]=0;
      this.limits[i] = this.maxDistance * this.weights[i];
      if(grid){const direct=mobilityAt([this.rest[i*2],this.rest[i*2+1]],a);this.clothFactors[i]=Math.min(1,direct/Math.max(1e-10,this.weights[i]));this.weights[i]=direct;this.limits[i]=this.maxDistance*direct;}
    }
    if (this.kind !== 'pendant' && !this.mobility.some(v => v === 0)) throw Error(component.name + ' 的固定区未覆盖任何实际控制点');
    this.edges = []; const unique = new Set();
    const edge = (i, j, type) => { const key = [Math.min(i,j),Math.max(i,j)].join(':'); if (!unique.has(key)) { unique.add(key); this.edges.push({ i,j,type,lambda:0 }); } };
    if (this.kind === 'strand') {
      for (let i = 1; i < this.mobility.length; i++) { edge(i - 1,i,'stretch'); if (i > 1) edge(i - 2,i,'bend'); }
    } else if (this.kind === 'cloth') {
      const adjacency = new Map(); this.mass.fill(0);
      for (let n = 0; n < this.controlIndices.length; n += 3) {
        const tri = [...this.controlIndices.slice(n,n+3)], m = Math.abs(area(this.pRest,...tri)) / 6;
        for (const i of tri) this.mass[i] += m;
        for (let k = 0; k < 3; k++) {
          const i=tri[k],j=tri[(k+1)%3],other=tri[(k+2)%3],key=[Math.min(i,j),Math.max(i,j)].join(':');
          edge(i,j,Math.abs(this.pRest[i*2]-this.pRest[j*2])>1e-5 && Math.abs(this.pRest[i*2+1]-this.pRest[j*2+1])>1e-5 ? 'shear' : 'stretch'); if (adjacency.has(key)) edge(adjacency.get(key),other,'bend'); else adjacency.set(key,other);
        }
      }
      const mean = this.mass.reduce((s,v)=>s+v,0)/this.mass.length;
      for (let i=0;i<this.mass.length;i++) this.mass[i]=Math.max(.05,this.mass[i]/mean);
    }
    if(this.kind==='strand') {
      this.fieldSamples=[];
      for(let v=0;v<this.weights.length;v++) {
        let best={i:0,t:0,d:Infinity};
        for(let i=0;i<this.mobility.length-1;i++){const ax=this.pRest[i*2],ay=this.pRest[i*2+1],dx=this.pRest[i*2+2]-ax,dy=this.pRest[i*2+3]-ay,t=clamp(((this.rest[v*2]-ax)*dx+(this.rest[v*2+1]-ay)*dy)/(dx*dx+dy*dy),0,1),d=Math.hypot(this.rest[v*2]-ax-dx*t,this.rest[v*2+1]-ay-dy*t);if(d<best.d)best={i,t,d};}
        this.fieldSamples.push(best);
      }
    }
    this.theta=0; this.angularVelocity=0; this.impulses=0; this.syncMesh(); this.stats=this.inspect();
  }
  invMass(i) { return this.mobility[i] / this.mass[i]; }
  target(source) {
    let total=0,x=0,y=0;
    for (const support of this.component.supports) {
      const current=this.scene.support(support),d=Math.hypot(source[0]-support.at[0],source[1]-support.at[1]),w=1/Math.max(1,d*d);
      const r=rotate(source[0]-support.at[0],source[1]-support.at[1],current.angle||0);
      x+=(current.x+r[0])*w;y+=(current.y+r[1])*w;total+=w;
    }
    return [x/total,y/total];
  }
  prepare(dt) {
    this.dt=dt; this.previous.set(this.p); this.previousMesh.set(this.positions);
    for(let i=0;i<this.mobility.length;i++){const q=this.target([this.pRest[i*2],this.pRest[i*2+1]]);this.pPose[i*2]=q[0];this.pPose[i*2+1]=q[1];}
    if(this.kind==='cloth'&&!this.clothFactors)this.sampleCloth(this.pPose,this.pose);else for(let i=0;i<this.weights.length;i++){const q=this.target([this.rest[i*2],this.rest[i*2+1]]);this.pose[i*2]=q[0];this.pose[i*2+1]=q[1];}
    const cfg=this.component.response,omega=TAU*cfg.frequencyHz,drag=Math.exp(-2*cfg.dampingRatio*omega*dt);
    if(this.kind==='pendant'){
      const pivot=this.target(this.component.authoring.pivot),old=this.pivot||pivot;
      const dx=(pivot[0]-old[0])/dt,dy=(pivot[1]-old[1])/dt;
      this.angularVelocity-=dx/this.freeLength*cfg.inputGain*.06;
      this.angularVelocity=(this.angularVelocity-omega*omega*this.theta*dt)*drag;this.theta+=this.angularVelocity*dt;this.pivot=pivot;
    }else for(let i=0;i<this.mobility.length;i++)for(let k=0;k<2;k++){
      const q=i*2+k;if(!this.mobility[i]){this.p[q]=this.pPose[q];this.velocity[q]=(this.p[q]-this.previous[q])/dt;continue;}
      this.velocity[q]=(this.velocity[q]-omega*omega*(this.p[q]-this.pPose[q])*dt)*drag;this.p[q]+=this.velocity[q]*dt;
    }
    for(const e of this.edges)e.lambda=0;this.limited=false;this.correction=0;this.fallback=false;
  }
  solve() {
    const material=this.component.material;
    for(const e of this.edges){
      const {i,j}=e,dx=this.p[j*2]-this.p[i*2],dy=this.p[j*2+1]-this.p[i*2+1],len=Math.hypot(dx,dy),rest=distance(this.pPose,this.pPose,i,j);
      const mass=this.invMass(i)+this.invMass(j);if(!mass||len<1e-9)continue;
      const compliance=(e.type==='bend'?material.bendCompliance:e.type==='shear'?material.shearCompliance:material.stretchCompliance)/(this.dt*this.dt);
      const lambda=(-(len-rest)-compliance*e.lambda)/(mass+compliance);e.lambda+=lambda;
      this.p[i*2]-=this.invMass(i)*lambda*dx/len;this.p[i*2+1]-=this.invMass(i)*lambda*dy/len;
      this.p[j*2]+=this.invMass(j)*lambda*dx/len;this.p[j*2+1]+=this.invMass(j)*lambda*dy/len;
    }
    // Weak pose preservation is a configurable XPBD tether; the oscillator
    // controls timing, while this constraint controls loss of the silhouette.
    const alpha = material.shapeCompliance / (this.dt * this.dt);
    for(let i=0;i<this.mobility.length;i++) if(this.mobility[i]) {
      const gain = this.invMass(i) / (this.invMass(i) + alpha) * .0005;
      for(let k=0;k<2;k++) this.p[i*2+k] += (this.pPose[i*2+k]-this.p[i*2+k])*gain;
    }
    this.pin();
  }
  pin(){for(let i=0;i<this.mobility.length;i++)if(!this.mobility[i]){this.p[i*2]=this.pPose[i*2];this.p[i*2+1]=this.pPose[i*2+1];}}
  sampleCloth(source,target){for(let i=0;i<this.clothSamples.length;i++){const[a,b,c,u,v,w]=this.clothSamples[i];target[i*2]=source[a*2]*u+source[b*2]*v+source[c*2]*w;target[i*2+1]=source[a*2+1]*u+source[b*2+1]*v+source[c*2+1]*w;}}
  syncMesh(){
    if(this.kind==='cloth'){this.sampleCloth(this.p,this.positions);if(this.clothFactors)for(let i=0;i<this.clothSamples.length;i++){const[a,b,c,u,v,w]=this.clothSamples[i],factor=this.clothFactors[i];for(let k=0;k<2;k++)this.positions[i*2+k]=this.pose[i*2+k]+(this.positions[i*2+k]-(this.pPose[a*2+k]*u+this.pPose[b*2+k]*v+this.pPose[c*2+k]*w))*factor;}return;}
    if(this.kind==='pendant'){
      const pivot=this.component.authoring.pivot,current=this.pivot||this.target(pivot);
      for(let i=0;i<this.weights.length;i++){
        const q=this.target([this.rest[i*2],this.rest[i*2+1]]),r=rotate(q[0]-current[0],q[1]-current[1],this.theta);
        this.positions[i*2]=current[0]+r[0];this.positions[i*2+1]=current[1]+r[1];
      }return;
    }
    // Fixed-region boundaries are actual mesh edges. A pinned source pixel
    // cannot inherit residual motion through a triangle crossing the root.
    for(let v=0;v<this.weights.length;v++){
      if(!this.weights[v]){this.positions[v*2]=this.pose[v*2];this.positions[v*2+1]=this.pose[v*2+1];continue;}
      const {i,t}=this.fieldSamples[v],j=i+1;
      const cx=this.p[i*2]*(1-t)+this.p[j*2]*t,cy=this.p[i*2+1]*(1-t)+this.p[j*2+1]*t,px=this.pPose[i*2]*(1-t)+this.pPose[j*2]*t,py=this.pPose[i*2+1]*(1-t)+this.pPose[j*2+1]*t;
      const a=angle(this.pPose[j*2]-this.pPose[i*2],this.pPose[j*2+1]-this.pPose[i*2+1],this.p[j*2]-this.p[i*2],this.p[j*2+1]-this.p[i*2+1]);
      const r=rotate(this.pose[v*2]-px,this.pose[v*2+1]-py,a),mobility=this.mobility[i]*(1-t)+this.mobility[j]*t,factor=Math.min(1,this.weights[v]/Math.max(1e-8,mobility));
      this.positions[v*2]=this.pose[v*2]+(cx+r[0]-this.pose[v*2])*factor;this.positions[v*2+1]=this.pose[v*2+1]+(cy+r[1]-this.pose[v*2+1])*factor;
    }
  }
  inspect(controlsOnly=false){
    let valid=true,travel=0,root=0,stretch=0,shear=0,maxAngle=0,minArea=Infinity;
    const lim=this.component.limits;
    for(let i=0;i<this.weights.length;i++){
      const d=distance(this.positions,this.pose,i,i);travel=Math.max(travel,d);if(!this.weights[i])root=Math.max(root,d);
      if(!Number.isFinite(d)||d>this.maxDistance*this.weights[i]+1e-5)valid=false;
    }
    for(const e of this.edges){
      if(e.type==='bend')continue;
      const dx=this.p[e.j*2]-this.p[e.i*2],dy=this.p[e.j*2+1]-this.p[e.i*2+1],rx=this.pPose[e.j*2]-this.pPose[e.i*2],ry=this.pPose[e.j*2+1]-this.pPose[e.i*2+1],len=Math.hypot(rx,ry);
      const ratio=Math.hypot(dx,dy)/Math.max(1e-9,len),a=Math.abs(angle(rx,ry,dx,dy))*DEG;
      stretch=Math.max(stretch,ratio-1);maxAngle=Math.max(maxAngle,a);
      if(ratio>1+lim.maxStretch+1e-5||ratio<1-lim.maxCompression-1e-5||a>lim.maxAngle+1e-4)valid=false;
    }
    const indices=controlsOnly&&this.kind==='cloth'?this.controlIndices:this.indices,pose=controlsOnly&&this.kind==='cloth'?this.pPose:this.pose,positions=controlsOnly&&this.kind==='cloth'?this.p:this.positions;
    for(let k=0;k<indices.length;k+=3){
      const i=indices[k],j=indices[k+1],n=indices[k+2],r=area(pose,i,j,n),a=area(positions,i,j,n),ratio=a/r;
      minArea=Math.min(minArea,ratio);if(!Number.isFinite(ratio)||ratio<lim.minAreaRatio-1e-5)valid=false;
      if(this.kind==='cloth')for(let j=0;j<3;j++){
        const u=indices[k+j],v=indices[k+(j+1)%3],w=indices[k+(j+2)%3];
        const before=angle(pose[v*2]-pose[u*2],pose[v*2+1]-pose[u*2+1],pose[w*2]-pose[u*2],pose[w*2+1]-pose[u*2+1]);
        const after=angle(positions[v*2]-positions[u*2],positions[v*2+1]-positions[u*2+1],positions[w*2]-positions[u*2],positions[w*2+1]-positions[u*2+1]);
        let delta=Math.abs(after-before);if(delta>Math.PI)delta=TAU-delta;delta*=DEG;shear=Math.max(shear,delta);if(delta>lim.maxShear+1e-4)valid=false;
      }
    }
    if(this.kind==='pendant'){maxAngle=Math.abs(this.theta)*DEG;if(maxAngle>lim.maxAngle+1e-5)valid=false;}
    return {valid,travel,root,stretch,shear,angle:maxAngle,minArea,limited:this.limited||false,correction:this.correction||0,fallback:this.fallback||false};
  }
  constrain(){
    const lim=this.component.limits;
    if(this.kind==='pendant'){
      const radius=Math.max(...Array.from({length:this.weights.length},(_,i)=>Math.hypot(this.rest[i*2]-this.component.authoring.pivot[0],this.rest[i*2+1]-this.component.authoring.pivot[1])));
      const max=Math.min(lim.maxAngle/DEG,2*Math.asin(clamp(this.maxDistance/(2*Math.max(radius,1)),0,1)));
      if(Math.abs(this.theta)>max){this.theta=clamp(this.theta,-max,max);if(this.theta*this.angularVelocity>0)this.angularVelocity=0;this.limited=true;}
      this.syncMesh();return;
    }
    for(let pass=0;pass<5;pass++){
      for(let i=0;i<this.mobility.length;i++){
        const dx=this.p[i*2]-this.pPose[i*2],dy=this.p[i*2+1]-this.pPose[i*2+1],d=Math.hypot(dx,dy),max=this.maxDistance*this.mobility[i];
        if(d>max&&d){const scale=max/d;this.p[i*2]=this.pPose[i*2]+dx*scale;this.p[i*2+1]=this.pPose[i*2+1]+dy*scale;this.limited=true;this.correction=Math.max(this.correction,d-max);}
      }
      for(const e of this.edges){
        if(e.type==='bend')continue;const {i,j}=e,dx=this.p[j*2]-this.p[i*2],dy=this.p[j*2+1]-this.p[i*2+1],rx=this.pPose[j*2]-this.pPose[i*2],ry=this.pPose[j*2+1]-this.pPose[i*2+1];
        const len=Math.hypot(dx,dy),rest=Math.hypot(rx,ry),mass=this.invMass(i)+this.invMass(j);if(!mass||!len||!rest)continue;
        const a=angle(rx,ry,dx,dy),allowed=clamp(a,-lim.maxAngle/DEG,lim.maxAngle/DEG),targetLen=clamp(len,rest*(1-lim.maxCompression),rest*(1+lim.maxStretch));
        const target=rotate(rx/rest*targetLen,ry/rest*targetLen,allowed),cx=target[0]-dx,cy=target[1]-dy;
        if(Math.hypot(cx,cy)>1e-8){this.limited=true;this.correction=Math.max(this.correction,Math.hypot(cx,cy));
          this.p[i*2]-=cx*this.invMass(i)/mass;this.p[i*2+1]-=cy*this.invMass(i)/mass;this.p[j*2]+=cx*this.invMass(j)/mass;this.p[j*2+1]+=cy*this.invMass(j)/mass;}
      }
      this.pin();this.syncMesh();if(this.inspect(!this.clothFactors).valid)break;
      // Local triangle retreat fixes a fold without stopping the whole cloth.
      if(this.kind==='cloth')for(let k=0;k<this.controlIndices.length;k+=3){
        const tri=[...this.controlIndices.slice(k,k+3)],ratio=area(this.p,...tri)/area(this.pPose,...tri);
        if(!Number.isFinite(ratio)||ratio<lim.minAreaRatio)for(const i of tri)if(this.mobility[i])for(let j=0;j<2;j++)this.p[i*2+j]=(this.p[i*2+j]+this.pPose[i*2+j])/2;
      }
    }
    this.syncMesh();
    if(!this.inspect(!this.clothFactors).valid){
      // Last-resort projection is reported, never counted as natural response.
      const current=new Float64Array(this.p);let lo=0,hi=1;
      for(let n=0;n<20;n++){const t=(lo+hi)/2;for(let q=0;q<this.p.length;q++)this.p[q]=this.pPose[q]+(current[q]-this.pPose[q])*t;this.syncMesh();if(this.inspect(!this.clothFactors).valid)lo=t;else hi=t;}
      for(let q=0;q<this.p.length;q++)this.p[q]=this.pPose[q]+(current[q]-this.pPose[q])*lo;
      this.fallback=true;this.limited=true;this.syncMesh();
    }
  }
  finish(){
    if(this.kind!=='pendant')for(let i=0;i<this.mobility.length;i++)for(let k=0;k<2;k++)this.velocity[i*2+k]=(this.p[i*2+k]-this.previous[i*2+k])/this.dt;
    for(let i=0;i<this.mobility.length;i++){
      const dx=this.p[i*2]-this.pPose[i*2],dy=this.p[i*2+1]-this.pPose[i*2+1],d=Math.hypot(dx,dy);
      if(d>=this.maxDistance*this.mobility[i]*.98&&d){const outward=Math.max(0,(this.velocity[i*2]*dx+this.velocity[i*2+1]*dy)/(d*d));this.velocity[i*2]-=outward*dx;this.velocity[i*2+1]-=outward*dy;}
    }
    this.stats=this.inspect();
  }
  reset(){this.p.set(this.pRest);this.pPose.set(this.pRest);this.pose.set(this.rest);this.positions.set(this.rest);this.velocity.fill(0);this.theta=0;this.angularVelocity=0;this.pivot=null;this.limited=false;this.fallback=false;this.correction=0;this.stats=this.inspect();}
  moving(){return Math.abs(this.angularVelocity)>.0001||this.velocity.some(v=>Math.abs(v)>.02)||this.positions.some((v,i)=>Math.abs(v-this.pose[i])>.015)||this.pose.some((v,i)=>Math.abs(v-this.rest[i])>.015);}
  impulse(x,y,vx,vy,radius){
    if(![x,y,vx,vy,radius].every(Number.isFinite)||radius<=0)return;
    const speed=Math.hypot(vx,vy),cap=this.freeLength*2,scale=speed?cap*Math.tanh(speed/cap)/speed*this.component.response.inputGain:0;
    if(this.kind==='pendant'){const p=this.pivot||this.component.authoring.pivot;this.angularVelocity+=((x-p[0])*vy-(y-p[1])*vx)*scale/Math.max(1,this.freeLength*this.freeLength);this.impulses++;return;}
    let affected=false;
    const apply=(i,w)=>{w*=this.mobility[i];if(w>0){this.velocity[i*2]+=vx*scale*w;this.velocity[i*2+1]+=vy*scale*w;affected=true;}};
    for(let i=0;i<this.mobility.length;i++){
      const d=Math.hypot(this.p[i*2]-x,this.p[i*2+1]-y);if(d<radius)apply(i,smooth(1-d/radius));
    }
    // A pointer can hit artwork between coarse controls. Distribute the point
    // load to its containing control face instead of creating a dead zone.
    if(!affected&&this.kind==='cloth')for(let k=0;k<this.controlIndices.length;k+=3){const tri=[...this.controlIndices.slice(k,k+3)],w=barycentric([x,y],...tri.map(i=>[this.p[i*2],this.p[i*2+1]]));if(w){tri.forEach((i,n)=>apply(i,w[n]));break;}}
    if(!affected&&this.kind==='strand'){
      let best=null;for(let i=0;i<this.mobility.length-1;i++){const dx=this.p[i*2+2]-this.p[i*2],dy=this.p[i*2+3]-this.p[i*2+1],t=clamp(((x-this.p[i*2])*dx+(y-this.p[i*2+1])*dy)/Math.max(1e-9,dx*dx+dy*dy),0,1),d=Math.hypot(x-this.p[i*2]-dx*t,y-this.p[i*2+1]-dy*t);if(!best||d<best.d)best={i,t,d};}if(best){apply(best.i,1-best.t);apply(best.i+1,best.t);}
    }
    this.impulses++;
  }
  sample(point){
    for(let k=0;k<this.indices.length;k+=3){
      const tri=[...this.indices.slice(k,k+3)],weights=barycentric(point,...tri.map(i=>[this.rest[i*2],this.rest[i*2+1]]));
      if(weights)return [0,1].map(axis=>tri.reduce((s,i,n)=>s+this.positions[i*2+axis]*weights[n],0));
    }
    // Explicit rigid extrapolation of a connected support, not a guessed layer.
    const nearest=Array.from({length:this.weights.length},(_,i)=>i).reduce((best,i)=>Math.hypot(this.rest[i*2]-point[0],this.rest[i*2+1]-point[1])<Math.hypot(this.rest[best*2]-point[0],this.rest[best*2+1]-point[1])?i:best,0);
    return [point[0]+this.positions[nearest*2]-this.rest[nearest*2],point[1]+this.positions[nearest*2+1]-this.rest[nearest*2+1]];
  }
  hit(x,y,layers){
    for(let k=0;k<this.indices.length;k+=3){const tri=[...this.indices.slice(k,k+3)],weights=barycentric([x,y],...tri.map(i=>[this.positions[i*2],this.positions[i*2+1]]));if(!weights)continue;
      const p=[0,1].map(axis=>tri.reduce((s,i,n)=>s+this.rest[i*2+axis]*weights[n],0));
      return layers.some(l=>{if(!l)return false;const ix=Math.floor(p[0]-l.bounds.x),iy=Math.floor(p[1]-l.bounds.y);return ix>=0&&iy>=0&&ix<l.bounds.width&&iy<l.bounds.height&&l.maskedRgba[(iy*l.bounds.width+ix)*4+3]>32;});
    }return false;
  }
  step(dt=1/120){this.prepare(dt);for(let n=0;n<8;n++)this.solve();this.constrain();this.finish();}
}

export class ComponentScene {
  constructor(config){
    this.config=validatePhysicsConfig(config);this.inputs=new Map();this.bodies=new Map();this.layerBodies=new Map();this.stepNumber=0;
    const pending=new Map(config.components.filter(c=>c.enabled).map(c=>[c.id,c]));
    while(pending.size){let progress=false;for(const [id,c]of pending)if(c.supports.every(s=>!s.componentId||this.bodies.has(s.componentId)||!pending.has(s.componentId))){
      const b=new ComponentBody(c,this);this.bodies.set(id,b);for(const r of c.layerRefs){if(this.layerBodies.has(r.uuid))throw Error('同一源层不能重复叠加两个组件场；请明确拆分活动区');this.layerBodies.set(r.uuid,b);}pending.delete(id);progress=true;
    }if(!progress)throw Error('支撑存在环：闭环需先定义耦合装配，不能使用循环父级');}
  }
  support(s){
    if(s.componentId){const b=this.bodies.get(s.componentId);if(b){const p=b.sample(s.at),q=b.sample([s.at[0]+1,s.at[1]]);return {x:p[0],y:p[1],angle:Math.atan2(q[1]-p[1],q[0]-p[0])};}}
    const v=this.inputs.get(s.id);return v?{x:s.at[0]+(v.x||0),y:s.at[1]+(v.y||0),angle:v.angle||0}:{x:s.at[0],y:s.at[1],angle:0};
  }
  step(dt=1/120){
    if(!Number.isFinite(dt)||dt<=0||dt>1/30)throw Error('物理步长无效');
    for(const b of this.bodies.values()){
      const driven=b.component.supports.some(s=>s.componentId?this.bodies.get(s.componentId)?.moving():Object.values(this.inputs.get(s.id)||{}).some(v=>Math.abs(v)>1e-9));
      if(!driven&&Math.abs(b.angularVelocity)<1e-9&&!b.velocity.some(v=>Math.abs(v)>1e-9)&&b.positions.every((v,i)=>Math.abs(v-b.rest[i])<1e-9))continue;
      b.prepare(dt);for(let n=0;n<8;n++)b.solve();b.constrain();b.finish();if(!b.stats.valid)throw Error('最终组件约束不满足：'+b.component.name);
    }
    this.stepNumber++;
  }
  reset(){this.inputs.clear();this.stepNumber=0;for(const b of this.bodies.values())b.reset();}
  inspect(){return Object.fromEntries([...this.bodies].map(([id,b])=>[id,b.inspect()]));}
}

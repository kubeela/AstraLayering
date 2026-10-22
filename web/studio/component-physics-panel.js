import { PhysicsPanel } from './physics-panel.js';
import { resolveComponentBindings } from './component-physics-binding.js';
import { ComponentScene } from './component-physics-model.js';
import { validatePhysicsConfig } from './component-physics-schema.js';
import { PhysicsRenderer } from './physics-renderer.js';
import { applyTestInput, testNames } from './physics-test-input.js';
const $=s=>document.querySelector(s);
const specs={frequencyHz:['回弹频率',.15,6,.05,'Hz',1,'response'],dampingRatio:['衰减',.03,1.5,.01,'',1,'response'],inputGain:['受力倍率',0,2,.05,'',1,'response'],maxTravel:['最大位移',1,30,1,'%',100,'limits'],maxAngle:['最大摆角',1,45,1,'°',1,'limits'],maxStretch:['最大拉伸',.5,8,.5,'%',100,'limits'],maxCompression:['最大压缩',0,30,1,'%',100,'limits'],maxShear:['最大剪切',1,30,1,'°',1,'limits'],minAreaRatio:['最小面积',30,95,1,'%',100,'limits']};
export class ComponentPhysicsPanel extends PhysicsPanel {
  constructor(options){
    super(options);
    for(const [key,[label,min,max,step,unit,,group]]of Object.entries(specs)){
      const box=document.createElement('div');box.className='slider';box.innerHTML=`<div class="slider-head"><label>${label}</label><label class="slider-number"><input id="component-number-${key}" type="number" min="${min}" max="${max}" step="${step}" aria-label="${label}"><span>${unit}</span></label></div><input id="component-${key}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}">`;
      $('#component-'+group).append(box);
      for(const id of ['component-'+key,'component-number-'+key])$('#'+id).addEventListener(id.includes('number')?'change':'input',e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n))this.changeComponent(group,key,Math.max(min,Math.min(max,n))/specs[key][5]);});
    }
    $('#component-geometry-apply').onclick=()=>{try{const authoring=JSON.parse($('#component-geometry').value);this.changeComponent(null,'authoring',authoring);}catch(e){this.error(e.message);}};
    $('#component-save').onclick=()=>void this.persist();
    $('#component-edit').onclick=()=>{this.editing=!this.editing;this.paused=true;this.scene.reset();this.render();this.sync();};
    const reset=$('#physics-reset').onclick;$('#physics-reset').onclick=()=>{if(!this.formal)return reset();this.scene.reset();this.replayStep=0;this.playback='';$('#component-test').value='';this.lastTime=0;this.accumulator=0;this.render();this.sync();};
    const svg=$('#physics-overlay'),handles=document.createElementNS('http://www.w3.org/2000/svg','g');handles.classList.add('component-handles');svg.append(handles);
    svg.addEventListener('pointermove',e=>{if(!this.dragControl)return;e.stopPropagation();const point=this.sourcePoint(e),{authoring,path}=this.dragControl;let target=authoring;for(const key of path.slice(0,-1))target=target[key];target[path.at(-1)]=point;$('#component-geometry').value=JSON.stringify(authoring,null,2);this.overlay();});
    const end=e=>{if(!this.dragControl)return;e.stopPropagation();const a=this.dragControl.authoring;this.dragControl=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);this.changeComponent(null,'authoring',a);};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',()=>{this.dragControl=null;this.overlay();});
    $('#component-test').replaceChildren(new Option('悬停扰动',''),...testNames.map((name,i)=>new Option(['静止','末端脉冲','支撑移动后释放','支撑往返','持续输入后停止','极端输入','组合运动'][i],name)));
    $('#component-test').onchange=e=>{this.playback=e.target.value;this.editing=false;this.paused=false;this.replayStep=0;this.scene?.reset();this.lastTime=0;this.render();this.sync();};
    const toggle=$('#physics-enabled').onchange;$('#physics-enabled').onchange=e=>this.formal?this.changeComponent(null,'enabled',e.target.checked):toggle(e);
    $('#physics-export').onclick=()=>this.download(new Blob([JSON.stringify(this.recipe(),null,2)+'\n'],{type:'application/json'}),this.formal?'physics.draft.json':'character.physics.json');
  }
  async prepare(options={}) {
    const owner=this.source(),config=options.draft?.kind==='astra-component-physics'?options.draft:owner?.componentPhysics;
    if(!config)return super.prepare(options);
    if(this.ready||this.preparing||!owner||!options.internal&&this.busy())return;
    const epoch=++this.epoch;this.preparing=true;this.sync();
    try {
      if(!(owner.physicsCase||await this.surfaces.prepare({allowFlat:true}))||epoch!==this.epoch||this.source()!==owner)return;
      this.config=structuredClone(validatePhysicsConfig(config));this.parts=owner.physicsCase?.layers||this.surfaces.layers;this.size=owner.physicsCase?.size||this.surfaces.size;this.owner=owner;
      const resolution=resolveComponentBindings(this.config,this.parts);this.issues=resolution.issues;
      for(const c of this.config.components)if(!resolution.compatible.has(c.id))c.enabled=false;
      const compatible=this.config.components;
      this.formal=true;this.ready=true;this.enabled=options.enabled!==false;this.paused=!!options.paused;
      $('#physics-controls').firstElementChild.after($('#component-controls'));
      $('#physics-draft').textContent=this.config.review?.status==='accepted'?'已复核 · 人工未确认':'项目草稿';
      this.selected=compatible.some(c=>c.id===options.selected)?options.selected:compatible.find(c=>c.enabled)?.id||compatible[0]?.id;
      this.rebuild();this.select(this.selected);this.sync();this.changed();this.frame=requestAnimationFrame(t=>this.tick(t));
    }catch(e){this.clear();this.error(e.message);}finally{this.preparing=false;this.sync();}
  }
  rebuild(){
    if(!this.formal)return super.rebuild();
    this.renderer?.dispose();this.scene=new ComponentScene(this.config);this.bodies=this.scene.bodies;this.bindings=new Map(this.config.components.map(c=>[c.id,c]));
    const layers=new Map(),resolution=resolveComponentBindings(this.config,this.parts);for(const[id,c]of resolution.assignments){const b=this.bodies.get(c);if(b)layers.set(id,b);}
    this.renderer=new PhysicsRenderer(this.stage,this.parts,layers,this.size);this.lastTime=0;this.accumulator=0;this.pointer=null;this.render();
  }
  options(){
    if(!this.formal)return super.options();const q=$('#physics-filter').value.toLowerCase();
    $('#physics-part').replaceChildren(...this.config.components.filter(c=>c.name.toLowerCase().includes(q)||c.id===this.selected).map(c=>new Option((c.enabled?'● ':'')+c.name,c.id)));$('#physics-part').value=this.selected||'';
  }
  select(id){if(!this.formal)return super.select(id);const c=this.config.components.find(c=>c.id===id);if(!c)return;this.selected=id;this.pointer=null;this.selectLayer?.((this.owner.layers||[]).find(l=>l.uuid===c.layerRefs[0]?.uuid)?.id||this.parts.find(l=>l.uuid===c.layerRefs[0]?.uuid)?.id);this.sync();}
  changeComponent(group,key,value){
    if(!this.formal)return;const next=structuredClone(this.config),c=next.components.find(c=>c.id===this.selected);if(!c)return;
    if(key==='enabled'&&value&&!resolveComponentBindings(next,this.parts).compatible.has(c.id)){this.error('组件来源或隔离组结构未确认，不能启用');this.sync();return;}
    if(group)c[group][key]=value;else c[key]=value;next.review={status:'draft',baseConfigHash:this.config.review?.configHash||this.config.review?.baseConfigHash};
    try{validatePhysicsConfig(next);new ComponentScene(next);this.config=next;this.playback='';$('#component-test').value='';this.rebuild();this.save();this.sync();}catch(e){this.error(e.message);this.sync();}
  }
  recipe(){return this.formal?structuredClone(this.config):super.recipe();}
  restore(recipe){if(recipe?.kind==='astra-component-physics'){this.config=structuredClone(validatePhysicsConfig(recipe));this.formal=true;}else super.restore(recipe);}
  save(){if(!this.formal)return super.save();this.owner.componentPhysics=this.recipe();$('#physics-draft').textContent='草稿 · 待保存到项目';}
  async persist(){
    if(!this.formal||!this.owner.project)return;
    try{const config=this.recipe();config.review={status:'draft',baseConfigHash:config.review?.baseConfigHash||config.review?.configHash};const response=await fetch('./api/studio/physics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:this.owner.project.name,dir:this.owner.project.dir,config})});const result=await response.json();if(!response.ok)throw Error(result.error);this.config=config;this.owner.componentPhysics=config;$('#physics-draft').textContent='草稿 · 已保存到项目';}catch(e){this.error(e.message);}
  }
  input(e){
    if(!this.formal)return super.input(e);
    if(!this.ready||!this.enabled||this.editing||this.category==='jelly'||this.tool()!=='disturb'||this.workspace()!=='physics'||this.busy()||this.paused||document.hidden||!document.hasFocus()){this.pointer=null;return;}
    this.playback='';$('#component-test').value='';const rect=this.stage.canvas.getBoundingClientRect(),[wx,wy]=this.stage.screenToWorld(e.clientX-rect.x,e.clientY-rect.y),[w,h]=this.size,x=wx*h/2+w/2,y=h/2-wy*h/2,time=e.timeStamp;
    if(this.pointer){const dt=(time-this.pointer.time)/1000;if(dt>0&&dt<.12)for(const [id,b]of this.bodies)if((this.scope==='all'||id===this.selected)&&b.hit(x,y,this.parts.filter(l=>b.component.layerRefs.some(r=>r.uuid===l.uuid))))b.impulse(x,y,(x-this.pointer.x)/dt*this.force,(y-this.pointer.y)/dt*this.force,this.radius);}
    this.pointer={x,y,time};this.overlay();
  }
  setDemo(enabled){if(!this.formal)return super.setDemo(enabled);this.demo=!!enabled;this.playback=enabled?'support-reverse':'';this.replayStep=0;this.scene?.reset();this.lastTime=0;this.sync();}
  pulse(direction=1){if(!this.formal)return super.pulse(direction);if(!this.enabled||this.category==='jelly')return;this.editing=false;for(const[id,b]of this.bodies)if(this.scope==='all'||id===this.selected){let i=0;for(let n=1;n<b.weights.length;n++)if(b.weights[n]>=b.weights[i])i=n;b.impulse(b.positions[i*2],b.positions[i*2+1],direction*b.freeLength*this.force,0,Math.max(this.radius,b.freeLength*.5));}this.lastTime=0;this.sync();}
  sourcePoint(e){const r=this.stage.canvas.getBoundingClientRect(),[x,y]=this.stage.screenToWorld(e.clientX-r.x,e.clientY-r.y),[w,h]=this.size;return [Math.round((x*h/2+w/2)*10)/10,Math.round((h/2-y*h/2)*10)/10];}
  advance(dt){if(!this.formal)return super.advance(dt);if(!this.enabled)return;for(let t=0;t<dt-1e-9;t+=1/120){if(this.playback)applyTestInput(this.scene,this.playback,++this.replayStep);this.scene.step();if(this.replayStep>=960){if(this.demo){this.scene.reset();this.replayStep=0;}else{this.playback='';$('#component-test').value='';this.paused=true;}}}this.render();}
  tick(time){
    if(!this.formal)return super.tick(time);if(!this.ready)return;
    const dt=this.lastTime?Math.min(.05,(time-this.lastTime)/1000):0;this.lastTime=time;
    if(this.enabled&&!this.paused&&!document.hidden&&(this.playback||[...this.bodies.values()].some(b=>b.moving()))){this.accumulator=(this.accumulator||0)+dt;const steps=Math.min(6,Math.floor(this.accumulator*120));if(steps){this.advance(steps/120);this.accumulator-=steps/120;}}else this.accumulator=0;
    if(!this.statsTime||time-this.statsTime>180){this.stats();this.statsTime=time;}this.frame=requestAnimationFrame(t=>this.tick(t));
  }
  sync(){
    if(!this.formal){if($('#component-controls'))$('#component-controls').hidden=true;return super.sync();}
    $('#component-controls').hidden=false;$('#physics-controls').hidden=!this.ready;$('#effect-physics').checked=this.enabled;$('#effect-physics').disabled=this.preparing||this.busy();
    $('#component-edit').textContent=this.editing?'完成绑定编辑':'编辑绑定';$('#component-edit-hint').hidden=!this.editing;
    $('#physics-prepare').hidden=true;$('#physics-close').hidden=!this.ready;
    $('#physics-status').textContent=`${this.bodies.size} 个组件 · ${this.enabled?'已启用':'已关闭'}${this.issues.length?' · '+this.issues.length+' 个来源待确认':''}`;
    for(const id of ['physics-kind','physics-direction'])$('#'+id).closest('label').hidden=true;
    $('#physics-material').closest('section').hidden=true;$('#physics-limits').closest('section').hidden=true;
    this.options();const c=this.config.components.find(c=>c.id===this.selected);if(!c)return;$('#physics-enabled').checked=c.enabled;
    for(const[key,[,min,max,,,factor,group]]of Object.entries(specs))for(const id of ['component-'+key,'component-number-'+key]){const el=$('#'+id);el.value=Number((c[group][key]*factor).toFixed(3));el.style.setProperty('--fill',(Number(el.value)-min)/(max-min)*100+'%');}
    if(document.activeElement!==$('#component-geometry'))$('#component-geometry').value=JSON.stringify(c.authoring,null,2);
    $('#component-info').textContent=`${c.kind==='strand'?'连续发束 / 飘带':c.kind==='cloth'?'布片':'刚性挂件'} · ${c.layerRefs.length} 层共用场 · 自由段 ${c.authoring.freeLength.toFixed(1)} px`;
    $('#component-save').disabled=!this.owner.project?.dir||this.busy();for(const id of ['physics-pause','physics-step','physics-pulse'])$('#'+id).disabled=!this.enabled||this.busy();$('#physics-demo').disabled=false;$('#physics-pause').textContent=this.paused?'继续':'暂停';this.stats();this.overlay();
  }
  stats(){if(!this.formal)return super.stats();const b=this.bodies.get(this.selected);$('#component-stats').textContent=b?`位移 ${b.stats.travel.toFixed(1)} / ${b.maxDistance.toFixed(1)} px · 固定残差 ${b.stats.root.toFixed(3)} px · ${b.stats.fallback?'回退修正':b.stats.limited?'约束限幅':'自由响应'}${this.playback?' · '+(this.replayStep/120).toFixed(2)+' s':''}`:'当前组件已关闭';}
  overlay(){
    if(!this.formal)return super.overlay();const svg=$('#physics-overlay'),visible=this.ready&&this.enabled&&this.workspace()==='physics';svg.toggleAttribute('hidden',!visible);if(!visible)return;
    const[w,h]=this.size,screen=(x,y)=>this.stage.worldToScreen((x-w/2)*2/h,(h/2-y)*2/h),b=this.bodies.get(this.selected),commands=[],fixed=[];
    if(b&&this.showGuides)for(let k=0;k<b.indices.length;k+=3)for(let j=0;j<3;j++){const i=b.indices[k+j],n=b.indices[k+(j+1)%3],a=screen(b.positions[i*2],b.positions[i*2+1]),c=screen(b.positions[n*2],b.positions[n*2+1]);(b.weights[i]===0&&b.weights[n]===0?fixed:commands).push(`M${a[0]},${a[1]}L${c[0]},${c[1]}`);}
    svg.querySelector('.physics-mesh').setAttribute('d',commands.join(''));svg.querySelector('.physics-fixed').setAttribute('d',fixed.join(''));svg.querySelectorAll('.physics-boundary').forEach(p=>p.setAttribute('points',''));
    const handles=svg.querySelector('.component-handles');handles.replaceChildren();
    if(this.editing){const a=this.dragControl?.authoring||this.config.components.find(c=>c.id===this.selected)?.authoring;
      const points=[];for(const[key,color]of [['centerline','#91b9ff'],['contour','#ffc171'],['pivot','#ffc171']])if(a?.[key]){if(key==='pivot')points.push({point:a[key],path:[key],color});else a[key].forEach((point,i)=>points.push({point,path:[key,i],color}));}
      a?.fixedRegions?.forEach((poly,p)=>poly.forEach((point,i)=>points.push({point,path:['fixedRegions',p,i],color:'#6ae3a0'})));
      for(const {point,path,color}of points){const el=document.createElementNS('http://www.w3.org/2000/svg','circle'),p=screen(...point);el.setAttribute('cx',p[0]);el.setAttribute('cy',p[1]);el.setAttribute('r',5);el.style.fill=color;el.style.stroke='#172332';el.style.strokeDasharray='none';el.style.pointerEvents='all';el.style.cursor='grab';el.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();this.dragControl={path,authoring:structuredClone(a)};svg.setPointerCapture(e.pointerId);};handles.append(el);}
    }
    const circle=svg.querySelector('circle');circle.style.display=this.pointer&&this.tool()==='disturb'?'':'none';if(this.pointer){const p=screen(this.pointer.x,this.pointer.y);circle.setAttribute('cx',p[0]);circle.setAttribute('cy',p[1]);circle.setAttribute('r',Math.abs(screen(this.pointer.x+this.radius,this.pointer.y)[0]-p[0]));}
  }
  clear(){this.formal=false;this.scene=null;this.config=null;this.playback='';this.editing=false;this.dragControl=null;super.clear();$('#physics-prepare').hidden=false;if($('#component-controls'))$('#component-controls').hidden=true;for(const id of ['physics-kind','physics-direction'])$('#'+id).closest('label').hidden=false;$('#physics-material').closest('section').hidden=false;$('#physics-limits').closest('section').hidden=false;}
  diagnostics(){return this.formal?{ready:this.ready,enabled:this.enabled,formal:true,selected:this.selected,solver:this.config.solver,components:this.config.components.map(c=>({id:c.id,name:c.name,enabled:c.enabled,sourcePartIds:c.sourcePartIds,layerRefs:c.layerRefs,stats:this.bodies.get(c.id)?.stats})),issues:this.issues,textureSizes:this.renderer?.targets.map(t=>[t.width,t.height]),playback:this.playback,step:this.replayStep}:super.diagnostics();}
}

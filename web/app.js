import { pipelineSteps, groupLayers, groupPhases, stepArtifacts, generationExample, layerSplitExample, repairExamples } from './progress.js';

const icons = {
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="m5 12 4 4L19 6"/>', chevron:'<path d="m9 5 7 7-7 7"/>', down:'<path d="m5 9 7 7 7-7"/>',
 play:'<path d="m8 4 12 8-12 8V4Z"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>', refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 6.3a8 8 0 0 1 13.2 2M4.6 15.7a8 8 0 0 0 13.2 2"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
 file:'<path d="M13 3H5v18h14V9l-6-6Z"/><path d="M13 3v6h6M8 13h8M8 17h5"/>',
 code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
 branch:'<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10M18 7v2a5 5 0 0 1-5 5H6"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/>',
 dot:'<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 history:'<path d="M3 3v6h6M4 8a9 9 0 1 1-1 7M12 7v5l4 2"/>',
 cube:'<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 9 9-4M12 12 3 8m9 4v10"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
 };
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.file}</svg>`;
const esc = value => String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function get(path) { const response = await fetch(path); const value = await response.json(); if(!response.ok) throw new Error(value.error); return value; }
const data = await get('./api/demo');
const state = {
 page:new URLSearchParams(location.search).get('page')||'project',
 stage:3,
 selectedStep:'step02', inspect:false, compare:false, asset:null, zoom:null, canvasLeft:0, canvasTop:0,
 directory:localStorage.getItem('astra-demo-directory')||data.directory,
 ref:'worktree', file:'shared/tools/update_occlusion/description.md', diff:false, configFilter:'', uploaded:null,
};
const stages = [
 {name:'人物分块',id:'part-layering',short:'CHARACTER PART',result:'88 个部件',status:'done',image:'./images/character-parts.svg', file:'part-layering/preview.svg'},
 {name:'人物绘制',id:'raster-layering',short:'CHARACTER RASTER',result:'素体 KRA 已交付',status:'done',image:'./images/body.png',file:'raster-layering/step03/character-dressup-base.kra'},
 {name:'衣服分块',id:'clothing-part-layering',short:'CLOTHING PART',result:'67 个部件',status:'done',image:'./images/clothing-parts.svg',file:'clothing-part-layering/preview.svg'},
 {name:'衣服绘制',id:'clothing-raster-layering',short:'CLOTHING RASTER',result:'边缘柔化 · 反馈修复',status:'running',image:'./images/clothing.png',file:'clothing-raster-layering/step02/clothing-soft-edges.kra'},
 {name:'穿戴组装',id:'character-assembly',short:'ASSEMBLY',result:'等待衣服绘制',status:'pending',image:'./images/assembled.png',file:'character-assembly/step01/character-assembled.kra'},
];
const requestedStage = Number(new URLSearchParams(location.search).get('stage') ?? 3);
if (Number.isInteger(requestedStage) && requestedStage >= 0 && requestedStage < stages.length) {
 state.stage = requestedStage;
 state.selectedStep = requestedStage === 0 || requestedStage === 2 ? 'layers' : requestedStage === 4 ? 'step01' : 'step02';
}
const artifact = path => './artifact/'+path.split('/').map(encodeURIComponent).join('/');
function flat(nodes) { return nodes.flatMap(node=>[node,...flat(node.groups||[])]); }
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('visible'),4000); }

function header() {
 return `<header class="app-header"><a class="brand" href="./"><span class="brand-mark">${icon('layers')}</span><span>Astra<span class="brand-light">Layering</span></span></a>
 <nav class="global-tabs" aria-label="工作台页面"><button data-page="project" class="${state.page==='project'?'active':''}">${icon('branch')}制作流程</button><button data-page="config" class="${state.page==='config'?'active':''}">${icon('code')}管线配置</button></nav>
 <span class="demo-badge">交互原型 · 真实产物 / 示例进度</span></header>`;
}
function pageHeading() {
 return `<div class="page-heading"><div class="task-heading"><h1>jianma</h1><button class="directory-button" data-action="directory" title="${esc(state.directory)}">${icon('folder')}工作目录 ${icon('down')}</button><span class="task-status"><i class="live-dot"></i>衣服绘制中 <small>示例</small></span></div><div class="heading-actions"><button class="button" data-action="new">${icon('plus')}新建任务</button><button class="primary" data-action="run">${icon('play')}运行流程</button></div></div>`;
}
const archivedFiles = new Set(data.files);
const assetLookup = new Map();
const groupViews = Object.fromEntries([0,2].map(index=>{
 const roots=index===0?data.character.groups:data.clothing.groups;
 return [index,{selected:roots[0].id,depth:-1,search:'',expanded:new Set([roots[0].id])}];
}));
const pipelineTree = index => index===0?data.character.groups:data.clothing.groups;
const available = items => (items||[]).filter(item=>archivedFiles.has(item.path));
function artifacts(items, index, stepId, className='') {
 const list=available(items);
 if(!list.length)return '';
 return `<div class="step-artifacts ${className}">${list.map(item=>{
  assetLookup.set(item.path,item);
  if(item.path.endsWith('.kra'))return `<a class="artifact-file" href="${artifact(item.path)}" target="_blank" rel="noopener">${icon('layers')}${esc(item.label)} ${icon('arrow')}</a>`;
  return `<button class="${item.kind==='image'?'artifact-image':'artifact-file'}" data-asset="${esc(item.path)}" data-asset-stage="${index}" data-asset-step="${stepId}" title="${esc(item.path)}">${item.kind==='image'?`<img src="${artifact(item.path)}" alt="${esc(item.label)}">`:icon('file')}<span>${esc(item.label)}</span>${item.kind==='file'?icon('chevron'):''}</button>`;
 }).join('')}</div>`;
}
function inlineTreeRows(nodes,index,depth=0,flatView=false) {
 const view=groupViews[index];
 return nodes.map(node=>{
  const branch=!!node.groups?.length,open=branch&&view.expanded.has(node.id)&&!flatView;
  return `<div class="tree-row ${view.selected===node.id?'selected':''}" style="--depth:${depth}" title="${esc(node.id)}">${branch&&!flatView?`<button class="tree-toggle" data-tree-expand="${esc(node.id)}" data-tree-stage="${index}" aria-label="${open?'收起':'展开'} ${esc(node.id)}" aria-expanded="${open}">${icon(open?'down':'chevron')}</button>`:'<span class="tree-toggle"></span>'}<button class="tree-label" data-tree-group="${esc(node.id)}" data-tree-stage="${index}">${icon(branch?'folder':'layers')}<span>${esc(node.id.split('/').at(-1))}</span><small>${branch?node.groups.length:node.kind}</small></button></div>${open?inlineTreeRows(node.groups,index,depth+1):''}`;
 }).join('');
}
function groupCycle(index) {
 const roots=pipelineTree(index), view=groupViews[index], layers=groupLayers(roots), all=flat(roots);
 const group=all.find(node=>node.id===view.selected)||roots[0];
 const prefix=stages[index].id;
 const phaseFiles={
  outline:[{path:`${prefix}/stages/outline/${group.id}.svg`,label:'轮廓 SVG',kind:'image'}],
  review:[{path:`${prefix}/stages/review/${group.id}.review.json`,label:'复核记录',kind:'file'}],
  reduction:[{path:`${prefix}/stages/outline-reduce/${group.id}.svg`,label:'去重后 SVG',kind:'image'}],
  completion:[{path:`${prefix}/parts/${group.id}.svg`,label:'补全后 SVG',kind:'image'},
    {path:`${prefix}/stages/completion-inputs/${group.id}.json`,label:'补全输入记录',kind:'file'}],
  completionCheck:[{path:`${prefix}/stages/completion-check/${group.id}.json`,label:'检查记录',kind:'file'}],
 };
 const candidates=view.depth>=0?layers[view.depth]||[]:view.search?all:roots;
 const nodes=view.search?candidates.filter(node=>node.id.toLowerCase().includes(view.search.toLowerCase())):candidates;
 return `<div class="group-cycle" data-cycle="${index}"><p class="cycle-rule">每层轮廓与复核齐备 → 同层去重 → 补全、检查、直属拆分 → 下一层</p>
 <div class="cycle-context"><span>当前查看</span><b title="${esc(group.id)}">${esc(group.id.split('/').at(-1))}</b><small>真实归档</small></div>
 <div class="cycle-phases">${groupPhases.map(([id,label],i)=>`<div class="cycle-phase" data-phase="${index}:${id}"><button data-step="${index}:${id}"><span class="cycle-number">${i+1}</span>${esc(label)}${id==='children'&&!group.groups?.length?'':statusMark('done')}</button>${artifacts(phaseFiles[id],index,id,'phase-artifacts')}${id==='children'?`<span class="phase-explanation">${group.groups?.length?group.groups.length+' 个直属节点':'终止 part，不再拆分'}</span>`:!available(phaseFiles[id]).length?'<span class="phase-explanation">本步骤产物未收录</span>':''}</div>`).join('')}</div>
 <div class="inline-tree"><div class="inline-tree-heading">${icon('branch')}实际 group / part 树<small>${all.length} 个节点</small></div>
 <div class="tree-controls"><select data-tree-depth="${index}" aria-label="${stages[index].name}拆分树深度"><option value="-1">完整层级</option>${layers.map((nodes,i)=>`<option value="${i}" ${view.depth===i?'selected':''}>第 ${i+1} 层 · ${nodes.length} 个节点</option>`).join('')}</select><button class="icon-button" data-expand-all="${index}" title="展开全部层级">${icon('expand')}</button></div>
 <div class="tree-search">${icon('search')}<input data-tree-search="${index}" aria-label="搜索${stages[index].name}部件" placeholder="搜索部件" value="${esc(view.search)}"></div>
 <div class="inline-tree-rows" data-tree-scroll="${index}">${inlineTreeRows(nodes,index,0,view.depth>=0||!!view.search)||'<p class="empty-tree">没有匹配的部件</p>'}</div>
 <p class="tree-note">选择部件，上方六个环节切换到它的实际产物。树深度与遮挡高度分别记录。</p>
 ${artifacts([{path:`${prefix}/groups.json`,label:'完整 groups.json',kind:'file'}],index,'layers')}
 </div></div>`;
}
const statusNames = { done:'已完成', running:'进行中', pending:'待执行' };
function statusMark(status) {
 return `<span class="phase-mark ${status}" title="${statusNames[status]}" aria-label="${statusNames[status]}">${status==='done'?icon('check'):status==='running'?'<i></i>':icon('clock')}</span>`;
}
function selectedStep() {
 const all=nodes=>nodes.flatMap(node=>[node,...all(node.children)]);
 return all(pipelineSteps[state.stage]).find(step=>step.id===state.selectedStep)||pipelineSteps[state.stage][0];
}
function stepNode(index,step,nested=false) {
 const selected=state.inspect&&state.stage===index&&state.selectedStep===step.id;
 const context=step.id==='layers'?groupCycle(index):step.children.length?`<div class="step-children">${step.children.map(child=>stepNode(index,child,true)).join('')}</div>`:'';
 return `<section class="step-node ${nested?'nested':''} ${step.children.length?'step-container':''} ${step.status} ${selected?'selected':''}" data-node="${index}:${step.id}">
 <button class="step-node-heading" data-step="${index}:${step.id}">${statusMark(step.status)}<h3>${esc(step.title)}</h3>${step.id.startsWith('step')?`<small>${step.id}</small>`:''}</button>
 ${step.note&&step.id!=='layers'?`<p class="step-summary">${esc(step.note)}</p>`:''}
 ${step.id==='standard'?'<p class="archive-gap">按需调整；此历史归档未收录 standard.png。</p>':''}
 ${context}
 ${index===3&&step.id==='step01'?`<div class="process-example"><h4>前襟生图示例</h4>${artifacts(generationExample,index,step.id,'image-sequence')}<p>灰底输入 + RGB 控制 → 生成候选 → 配准、拼装</p>${artifacts(layerSplitExample,index,step.id,'image-sequence')}</div>`:''}
 ${artifacts(stepArtifacts[index][step.id],index,step.id)}
 ${index===3&&step.id==='step02'?`<div class="process-example"><h4>局部修画对照</h4>${artifacts(repairExamples,index,step.id,'image-sequence')}</div>`:''}
 </section>`;
}
function flowCard(index) {
 const stage=stages[index];
 return `<section class="pipeline-lane ${stage.status}" data-pipeline="${index}"><button class="pipeline-heading" data-stage="${index}" aria-label="查看${stage.name}交付"><span class="node-number">${String(index+1).padStart(2,'0')}</span><h2>${stage.name}</h2>${statusMark(stage.status)}</button><div class="pipeline-steps">${pipelineSteps[index].map(step=>stepNode(index,step)).join('')}</div></section>`;
}
function inspector() {
 const stage=stages[state.stage],step=selectedStep(),item=state.asset;
 const image=item?.kind==='image';
 return `<aside class="output-inspector" aria-label="产物放大查看"><header class="output-heading"><div><small>${esc(stage.name)} · ${esc(step.title)}</small><h2>${esc(item?.label||step.title)}</h2></div><button class="icon-button" data-action="close-inspector" aria-label="关闭产物面板">${icon('close')}</button></header><div class="output-scroll">
 ${image?`<div class="output-caption"><span>真实归档产物</span><label><input type="checkbox" id="compare-reference" ${state.compare?'checked':''}>对照参考</label></div><div class="output-image ${state.compare?'compare':''}">${state.compare?'<figure><img src="./images/reference.png" alt="简化角色参考"><figcaption>简化角色参考</figcaption></figure>':''}<figure><a href="${artifact(item.path)}" target="_blank" rel="noopener"><img src="${artifact(item.path)}" alt="${esc(item.label)}"></a><figcaption>点击打开原尺寸</figcaption></figure></div>`:item?`<pre class="artifact-text">${esc(item.text??'正在读取…')}</pre>`:`<p class="step-note">${esc(step.note||'此步骤的过程和已归档产物直接展示在画布中。')}</p>`}
 ${item?`<a class="artifact-source" href="${artifact(item.path)}" target="_blank" rel="noopener">${esc(item.path)} ${icon('arrow')}</a>`:''}</div>
 <footer class="output-footer"><button class="button" data-action="single">${icon('play')}运行 / 恢复${esc(stage.name)}</button></footer></aside>`;
}
function graph() {
 return `${pageHeading()}<section class="workflow-shell"><div class="flow-area"><div class="flow-toolbar"><span>完整流程 · 中间步骤与产物</span><div class="flow-legend"><span>${statusMark('done')}完成</span><span>${statusMark('running')}进行中</span><span>${statusMark('pending')}等待</span></div><div class="canvas-tools"><button data-action="zoom-out" aria-label="缩小画布">−</button><button data-action="zoom-reset" id="zoom-label">100%</button><button data-action="zoom-in" aria-label="放大画布">＋</button><button data-action="zoom-fit">适合宽度</button></div></div>
 <div class="flow-scroll" tabindex="0" aria-label="完整流程画布，可滚动和平移"><div class="flow-size"><div class="flow-world"><svg class="flow-connectors" aria-hidden="true"></svg><div class="flow-input"><a href="./images/original.jpg" target="_blank" rel="noopener"><img src="./images/original.jpg" alt="原始输入图"></a><span><b>输入角色图</b><small>original → standard</small></span></div><div class="flow-grid">${stages.map((_,i)=>flowCard(i)).join('')}</div></div></div></div>
 <footer class="flow-footnote">按 01 → 05 顺序执行 · 连线表示依赖 · 拖动空白处或滚动查看，缩放保留全部细节 · 产物真实，执行状态为示例</footer></div>${state.inspect?inspector():''}</section>`;
}
let flowObserver;
function connectFlow() {
 const world=document.querySelector('.flow-world');
 if(!world)return;
 const viewport=document.querySelector('.flow-scroll');
 state.zoom??=Math.min(1,Math.max(.65,(viewport.clientWidth-8)/world.offsetWidth));
 world.style.transform=`scale(${state.zoom})`;
 const size=document.querySelector('.flow-size');
 size.style.width=`${world.offsetWidth*state.zoom}px`;size.style.height=`${world.offsetHeight*state.zoom}px`;
 document.querySelector('#zoom-label').textContent=Math.round(state.zoom*100)+'%';
 const bounds=world.getBoundingClientRect();
 const box=selector=>{const r=world.querySelector(selector).getBoundingClientRect();return {x:(r.left-bounds.left)/state.zoom,y:(r.top-bounds.top)/state.zoom,w:r.width/state.zoom,h:r.height/state.zoom};};
 const input=box('.flow-input'),cards=stages.map((_,i)=>box(`[data-pipeline="${i}"] .pipeline-heading`));
 const svg=world.querySelector('.flow-connectors'),paths=[];
 const path=(d,label,x,y,status='done')=>paths.push(`<path class="${status}" d="${d}" marker-end="url(#flow-arrow-${status})"/>${label?`<text x="${x}" y="${y}">${label}</text>`:''}`);
 path(`M${input.x+input.w/2} ${input.y+input.h} V${cards[0].y-6}`,'',0,0);
 for(const [a,b,label,status] of [[cards[0],cards[1],'parts','done'],[cards[2],cards[3],'parts','done'],[cards[3],cards[4],'衣服 KRA','pending']]){
  const y=a.y+a.h/2;path(`M${a.x+a.w} ${y} H${b.x-6}`,label,(a.x+a.w+b.x)/2,y-10,status);
 }
 for(const [a,b,y,label,status] of [[cards[0],cards[2],106,'简化角色参考','done'],[cards[1],cards[4],54,'人物素体 KRA','pending']]){
  const x1=a.x+a.w*.72,x2=b.x+b.w*.45;
  path(`M${x1} ${a.y} V${y} H${x2} V${b.y-6}`,label,(x1+x2)/2,y-10,status);
 }
 svg.setAttribute('viewBox',`0 0 ${world.offsetWidth} ${world.offsetHeight}`);
 svg.innerHTML=`<defs>${['done','pending'].map(status=>`<marker id="flow-arrow-${status}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6" fill="${status==='done'?'#86b7a8':'#a7b3c0'}"/></marker>`).join('')}</defs>${paths.join('')}`;
}
function zoomCanvas(value,fit=false) {
 const viewport=document.querySelector('.flow-scroll'),previous=state.zoom;
 const centerX=viewport.scrollLeft+viewport.clientWidth/2,centerY=viewport.scrollTop+viewport.clientHeight/2;
 state.zoom=Math.min(1.5,Math.max(.4,value));connectFlow();
 viewport.scrollLeft=fit?0:centerX*state.zoom/previous-viewport.clientWidth/2;
 viewport.scrollTop=fit?0:centerY*state.zoom/previous-viewport.clientHeight/2;
}
async function openAsset(item,index,stepId) {
 state.stage=index;state.selectedStep=stepId;state.inspect=true;state.asset={...item};
 const selected=state.asset;render();
 if(item.kind==='file') {
  try{const response=await fetch(artifact(item.path));if(!response.ok)throw new Error('无法读取归档产物');selected.text=await response.text();}
  catch(error){selected.text=error.message;}
  if(state.asset===selected&&state.inspect)render();
 }
}
let versions, configFiles=[], configText='', schemaText='', diffText='', configBusy=false;
function setConfigBusy(busy) {
 configBusy=busy;
 document.querySelectorAll('.version-bar input,.version-bar select,.config-workspace button,.config-workspace input,[data-action=history]').forEach(node=>{node.disabled=busy;});
}
async function refreshConfigFile() {
 setConfigBusy(true);
 try {await loadConfigFile();render();} catch(error) {toast(error.message);} finally {setConfigBusy(false);}
}
async function loadConfig() {
 setConfigBusy(true);
 try {
  versions=await get('./api/config/versions?ref='+encodeURIComponent(state.ref));
  const snapshot=await get('./api/config/files?ref='+encodeURIComponent(state.ref)); configFiles=snapshot.paths;
  if(!configFiles.includes(state.file)) state.file=configFiles[0]||'';
  await loadConfigFile();
 } catch(error) { toast(error.message); } finally {setConfigBusy(false);}
}
async function loadConfigFile() {
 if(!state.file) {configText='这个版本没有可浏览的管线配置。';schemaText='';return;}
 const q=`?ref=${encodeURIComponent(state.ref)}&path=${encodeURIComponent(state.file)}`;
 configText=(await get('./api/config/content'+q)).text; schemaText=''; diffText='';
 const sibling=state.file.replace(/description\.md$/,'schema.json');
 if(sibling!==state.file&&configFiles.includes(sibling)) schemaText=(await get('./api/config/content'+`?ref=${encodeURIComponent(state.ref)}&path=${encodeURIComponent(sibling)}`)).text;
 if(state.diff) diffText=(await get('./api/config/diff'+q+'&base='+encodeURIComponent(state.base||'HEAD~2'))).text;
}
function markdown(text) {
 // The prototype renders text, headings and code; it never inserts source HTML.
 let inCode=false;
 return text.split('\n').map(line=> {
  if(line.startsWith('```')) {inCode=!inCode;return inCode?'<pre>':'</pre>';}
  if(inCode) return esc(line)+'\n';
  if(!line.trim()) return '';
  const heading=line.match(/^(#{1,4})\s+(.+)/);
  const content=esc(heading?heading[2]:line).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  if(heading) return `<h${heading[1].length+1}>${content}</h${heading[1].length+1}>`;
  return `<p${/^[-*] /.test(line)?' class="md-bullet"':''}>${content}</p>`;
 }).join('');
}
function jsonLines(text) {
 return text.split('\n').map((line,i)=>`<div class="code-line"><span class="line-number">${i+1}</span><code>${esc(line).replace(/(&quot;.*?&quot;)(\s*:)?/g,(_,str,colon)=>`<span class="${colon?'json-key':'json-string'}">${str}</span>${colon||''}`).replace(/\b(false|true|null)\b/g,'<span class="json-value">$1</span>')}</code></div>`).join('');
}
function configTree() {
 const families=[['part-layering','人物分块'],['raster-layering','人物绘制'],['clothing-part-layering','衣服分块'],['clothing-raster-layering','衣服绘制'],['character-assembly','穿戴组装'],['shared','公共工具']];
 return families.map(([prefix,label])=> {
  const files=configFiles.filter(file=>file.startsWith(prefix+'/')&&(!state.configFilter||file.toLowerCase().includes(state.configFilter.toLowerCase())));
  if(!files.length)return '';
  const active=state.file.startsWith(prefix+'/');
  let content=files;
  if(prefix==='shared'&&!state.configFilter) {
   const activeTool=state.file.split('/')[2];
   const tools=[...new Set(files.map(f=>f.split('/')[2]))].sort((a,b)=>a===activeTool?-1:b===activeTool?1:a.localeCompare(b));
   content=tools.flatMap(tool=>tool===activeTool?files.filter(f=>f.startsWith(`shared/tools/${tool}/`)):[files.find(f=>f===`shared/tools/${tool}/description.md`)||files.find(f=>f.startsWith(`shared/tools/${tool}/`))]);
  }
  return `<details class="config-family" ${active||state.configFilter?'open':''}><summary>${icon('chevron')}${icon(prefix==='shared'?'code':'folder')}<span>${label}</span><small>${files.length}</small></summary><div>${content.map(file=>`<button data-config-file="${esc(file)}" class="config-file ${state.file===file?'active':''}" title="${esc(file)}">${icon(file.endsWith('.json')?'code':'file')}<span>${esc(prefix==='shared'?(file.split('/')[2]===state.file.split('/')[2]?file.split('/')[2]+' / '+file.split('/').at(-1):file.split('/')[2]):file.split('/').at(-1))}</span></button>`).join('')}</div></details>`;
 }).join('');
}
function configPage() {
 const isTool=state.file.includes('/tools/'), currentFile=state.file.split('/').at(-1)||'', toolName=isTool?state.file.split('/').at(-2):currentFile;
 const sourceRefs=['worktree',...new Set(['origin/main','upstream/main',...(versions?.branches||[])])];
 return `<div class="page-heading config-heading"><div><div class="breadcrumb">工作空间 ${icon('chevron')}<span>配置浏览</span></div><h1>管线配置 <span class="subtitle-tag">只读</span></h1><p>查看提示词与工具协议，沿 Git 版本回溯每一次变化。</p></div><button class="button" data-action="history">${icon('history')}提交历史</button></div>
 <div class="version-bar"><span class="version-label">${icon('branch')}配置来源</span><select id="config-ref" aria-label="配置版本">${sourceRefs.map(ref=>`<option value="${esc(ref)}" ${ref===state.ref?'selected':''}>${ref==='worktree'?'本地工作区':esc(ref)}</option>`).join('')}${versions?.commits?.filter(c=>c.sha===state.ref).map(c=>`<option selected value="${c.sha}">${c.short}</option>`).join('')||''}</select><span class="version-sha">${versions?.commits?.[0]?.short||'…'}</span><span class="version-description">${state.ref==='worktree'?'包含尚未提交的本地修改':'固定版本快照'}</span><span class="spacer"></span><label class="diff-toggle"><input type="checkbox" id="config-diff" ${state.diff?'checked':''}>查看差异</label><select id="config-base" aria-label="对比基准">${(versions?.commits||[]).slice(1).map((c,i)=>`<option value="${c.sha}" ${(state.base?state.base===c.sha:i===1)?'selected':''}>对比 ${c.short} · ${esc(c.title.slice(0,32))}</option>`).join('')}</select></div>
 <div class="config-workspace"><aside class="config-tree"><div class="pane-title"><h3>配置目录</h3><span class="count-badge">${configFiles.length}</span></div><div class="tree-search">${icon('search')}<input id="config-search" value="${esc(state.configFilter)}" placeholder="搜索提示词或工具" aria-label="搜索配置"></div><div class="config-tree-scroll">${configTree()}</div><div class="config-tree-footer">${icon('lock')}切换版本不会修改工作区</div></aside>
 <section class="config-content"><div class="config-file-heading"><div class="config-file-icon">${icon(isTool?'code':'file')}</div><div><h2>${esc(toolName)}</h2><code>${esc(state.file.replace(/\/description\.md$/,''))}</code></div><span class="spacer"></span><span class="small-tag">${isTool?'TOOL DEFINITION':'MARKDOWN'}</span></div><div class="config-tabs"><button class="active">${icon(state.diff?'branch':'eye')}${state.diff?'版本差异':'配置预览'}</button><span>所选版本的实际文件</span></div>
 ${state.diff?`<div class="diff-content">${diffText?diffText.split('\n').map(line=>`<pre class="${line.startsWith('+')?'addition':line.startsWith('-')?'deletion':''}">${esc(line)}</pre>`).join(''):`<div class="empty-diff">${icon('check')}这个文件在两个版本之间没有变化。</div>`}</div>`:`<div class="config-pair"><article class="markdown-panel"><header><span>${icon('file')}${currentFile.endsWith('.json')?'Schema JSON':currentFile}</span><small>${currentFile.endsWith('.json')?'JSON':'MARKDOWN'}</small></header><div class="markdown-body">${currentFile.endsWith('.json')?`<pre>${esc(configText)}</pre>`:markdown(configText)}</div></article>${schemaText?`<article class="schema-panel"><header><span>${icon('code')}schema.json</span><small>JSON SCHEMA</small></header><div class="code-body">${jsonLines(schemaText)}</div></article>`:''}</div>`}
 <div class="config-content-footer">${icon('info')}description 与 schema 来自同一版本；预览不会影响正在运行的 agent。</div></section></div>`;
}
function render() {
 const previous=document.querySelector('.flow-scroll');
 if(previous){state.canvasLeft=previous.scrollLeft;state.canvasTop=previous.scrollTop;}
 const treeScroll=Object.fromEntries([...document.querySelectorAll('[data-tree-scroll]')].map(node=>[node.dataset.treeScroll,node.scrollTop]));
 flowObserver?.disconnect();
 document.querySelector('#app').innerHTML=header()+`<main class="main ${state.page==='config'?'config-page':''}">${state.page==='config'?configPage():graph()}</main>`;
 bind();setConfigBusy(configBusy);
 if(state.page==='project') {
  connectFlow();
  const viewport=document.querySelector('.flow-scroll');viewport.scrollLeft=state.canvasLeft;viewport.scrollTop=state.canvasTop;
  document.querySelectorAll('[data-tree-scroll]').forEach(node=>{node.scrollTop=treeScroll[node.dataset.treeScroll]||0;});
  flowObserver=new ResizeObserver(connectFlow);flowObserver.observe(document.querySelector('.flow-world'));
 }
}
function showNew(single=false) {
 const dialog=document.querySelector('#new-task');
 dialog.innerHTML=`<div class="modal-heading"><div><span class="eyebrow">NEW CREATION</span><h2>${single?'单独运行管线':'开始一次新的制作'}</h2><p>提供一张角色图，制作分层素材。</p></div><button class="icon-button" data-close>${icon('close')}</button></div><form id="new-task-form"><div class="new-task-columns"><div><label class="field-label">输入参考图 <span>必填</span></label><label class="upload-zone" id="upload-zone"><input id="image-input" type="file" accept="image/png,image/jpeg,image/webp" hidden><span class="upload-icon">${icon('upload')}</span><b>将角色图片拖到这里</b><p>或点击选择图片</p><small>PNG、JPG、WebP</small></label><div class="input-note">${icon('image')}只需一张输入图，无需额外参考资料。</div></div><div class="task-form-fields"><label class="field-label" for="task-name">任务名称</label><input id="task-name" name="name" placeholder="例如 character-03" required><div class="output-location">${icon('folder')}<span>.run / <b id="new-name-path">character-03</b></span></div><label class="field-label">执行范围</label><div class="scope-options"><label class="${!single?'selected':''}"><input type="radio" name="scope" value="all" ${!single?'checked':''}>整条流程<span>五条管线依次执行</span></label><label class="${single?'selected':''}"><input type="radio" name="scope" value="single" ${single?'checked':''}>单条管线<span>读取本任务已有的上游产物</span></label></div><select name="stage" id="new-stage" ${!single?'hidden':''}>${stages.map((s,i)=>`<option value="${i}" ${i===state.stage?'selected':''}>${s.name} · ${s.id}</option>`).join('')}</select><label class="standard-option"><div><b>标准化人物姿态</b><p>先判断是否需要调整，再按需生图。</p></div><input type="checkbox" name="standard" role="switch" aria-label="标准化人物姿态"></label><div class="standard-detail">嘴部张大、眼睛张开，正视站立，双手放在身体两侧。</div></div></div><div class="modal-footer"><span>${icon('folder')}任务保存在选定的运行目录中</span><button type="button" class="button" data-close>取消</button><button class="primary" type="submit">${icon('play')}开始制作</button></div></form>`;
 dialog.showModal();dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
 const input=dialog.querySelector('#image-input');
 const upload=file=> {if(!file?.type.startsWith('image/'))return toast('请选择图片文件');state.uploaded=file;const url=URL.createObjectURL(file);const zone=dialog.querySelector('#upload-zone');zone.classList.add('has-image');zone.style.backgroundImage=`url("${url}")`;zone.querySelector('b').textContent=file.name;};
 input.onchange=()=>upload(input.files[0]);const zone=dialog.querySelector('#upload-zone');zone.ondragover=e=>e.preventDefault();zone.ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files[0]);};
 dialog.querySelector('#task-name').oninput=e=>dialog.querySelector('#new-name-path').textContent=e.target.value||'character-03';
 dialog.querySelectorAll('[name=scope]').forEach(r=>r.onchange=()=>{dialog.querySelector('#new-stage').hidden=r.value!=='single';dialog.querySelectorAll('.scope-options label').forEach(l=>l.classList.toggle('selected',l.querySelector('input').checked));});
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();toast('这是交互原型：已预览创建流程，未启动真实 agent。');};
}
function showDirectory() {
 const dialog=document.querySelector('#directory-dialog');dialog.innerHTML=`<div class="modal-heading"><div><h2>追踪运行目录</h2><p>正式版会自动发现目录中的所有任务。</p></div><button class="icon-button" data-close>${icon('close')}</button></div><form><label class="field-label">目录绝对路径</label><input name="directory" value="${esc(state.directory)}" required><p class="dialog-note">仓库默认：&lt;仓库&gt;/.run<br>独立安装 skill：&lt;skill 上一级&gt;/.run</p><div class="modal-footer"><span>本原型仅在浏览器中保存选择。</span><button class="primary">保存目录</button></div></form>`;dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const value=new FormData(e.target).get('directory').trim();if(!value.startsWith('/')&&!/^[A-Za-z]:[\\/]/.test(value))return toast('请输入绝对路径');state.directory=value;localStorage.setItem('astra-demo-directory',value);dialog.close();toast('目录选择已保存到浏览器。');};
}
function showHistory() {
 const dialog=document.querySelector('#directory-dialog');dialog.innerHTML=`<div class="modal-heading"><div><h2>提交历史</h2><p>选择一次提交，浏览当时的管线配置。</p></div><button class="icon-button" data-close>${icon('close')}</button></div><div class="commit-list">${(versions?.commits||[]).map((c,i)=>`<button data-commit="${c.sha}"><span class="commit-node">${icon('branch')}</span><div><b>${esc(c.title)}</b><small>${c.short}${i===0?' · 当前分支最新提交':''}</small></div>${icon('chevron')}</button>`).join('')}</div>`;dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelectorAll('[data-commit]').forEach(b=>b.onclick=async()=>{state.ref=b.dataset.commit;dialog.close();await loadConfig();render();});
}
function selectStage(index) {
 const stepId=index===0||index===2?'merge':index===1?'step03':index===3?'step02':'step01';
 const item=available(stepArtifacts[index][stepId])[0];
 if(item)openAsset(item,index,stepId);
 else{state.stage=index;state.selectedStep=stepId;state.asset=null;state.inspect=true;render();}
}
function bind() {
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=async()=>{state.page=b.dataset.page;if(state.page==='config')await loadConfig();render();});
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>selectStage(Number(b.dataset.stage)));
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const [index,step]=b.dataset.step.split(':'),i=Number(index);const item=available(stepArtifacts[i][step])[0];if(item)openAsset(item,i,step);else{state.stage=i;state.selectedStep=step;state.asset=null;state.inspect=true;render();}});
 document.querySelectorAll('[data-asset]').forEach(b=>b.onclick=()=>openAsset(assetLookup.get(b.dataset.asset),Number(b.dataset.assetStage),b.dataset.assetStep));
 document.querySelectorAll('[data-tree-group]').forEach(b=>b.onclick=()=>{groupViews[b.dataset.treeStage].selected=b.dataset.treeGroup;render();});
 document.querySelectorAll('[data-tree-expand]').forEach(b=>b.onclick=()=>{const view=groupViews[b.dataset.treeStage],id=b.dataset.treeExpand;view.expanded.has(id)?view.expanded.delete(id):view.expanded.add(id);render();});
 document.querySelectorAll('[data-expand-all]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.expandAll),view=groupViews[i];view.depth=-1;view.search='';view.expanded=new Set(flat(pipelineTree(i)).filter(node=>node.groups?.length).map(node=>node.id));render();});
 document.querySelectorAll('[data-tree-depth]').forEach(select=>select.onchange=()=>{groupViews[select.dataset.treeDepth].depth=Number(select.value);render();});
 document.querySelectorAll('[data-tree-search]').forEach(input=>input.oninput=()=>{const i=input.dataset.treeSearch,position=input.selectionStart;groupViews[i].search=input.value;render();const next=document.querySelector(`[data-tree-search="${i}"]`);next.focus({preventScroll:true});next.setSelectionRange(position,position);});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=> {
  const action=b.dataset.action;
  if(action==='new'||action==='run')showNew();
  else if(action==='single')showNew(true);
  else if(action==='directory')showDirectory();
  else if(action==='history')showHistory();
  else if(action==='close-inspector'){state.inspect=false;render();}
  else if(action==='zoom-in')zoomCanvas(state.zoom+.1);
  else if(action==='zoom-out')zoomCanvas(state.zoom-.1);
  else if(action==='zoom-reset')zoomCanvas(1);
  else if(action==='zoom-fit')zoomCanvas(Math.min(1,(document.querySelector('.flow-scroll').clientWidth-8)/document.querySelector('.flow-world').offsetWidth),true);
 });
 const compare=document.querySelector('#compare-reference');if(compare)compare.onchange=()=>{state.compare=compare.checked;render();};
 const viewport=document.querySelector('.flow-scroll');if(viewport){
  let drag;
  viewport.onpointerdown=e=>{if(e.button!==0||e.pointerType==='touch'||e.target.closest('button,a,input,select,.inline-tree-rows'))return;drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);viewport.classList.add('panning');};
  viewport.onpointermove=e=>{if(drag){viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY;}};
  const end=()=>{drag=null;viewport.classList.remove('panning');};viewport.onpointerup=end;viewport.onpointercancel=end;
 }
 document.querySelectorAll('[data-config-file]').forEach(b=>b.onclick=async()=>{state.file=b.dataset.configFile;await refreshConfigFile();});
 const source=document.querySelector('#config-ref');if(source)source.onchange=async()=>{state.ref=source.value;state.base=undefined;await loadConfig();render();};
 const diff=document.querySelector('#config-diff');if(diff)diff.onchange=async()=>{state.diff=diff.checked;state.base=document.querySelector('#config-base').value;await refreshConfigFile();};
 const base=document.querySelector('#config-base');if(base)base.onchange=async()=>{state.base=base.value;if(state.diff){await refreshConfigFile();}};
 const filter=document.querySelector('#config-search');if(filter)filter.oninput=()=>{state.configFilter=filter.value;document.querySelector('.config-tree-scroll').innerHTML=configTree();document.querySelectorAll('[data-config-file]').forEach(b=>b.onclick=async()=>{state.file=b.dataset.configFile;await refreshConfigFile();});};
}
if(state.page==='config')await loadConfig();
render();
if(new URLSearchParams(location.search).get('dialog')==='new')showNew();

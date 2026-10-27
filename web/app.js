import { processFileList } from './process-files.js';
import { pipelineSteps as stepTemplates, groupLayers, groupPhases, stepArtifacts, groupArtifacts, shadowInspectionArtifacts,
 groupSummary, groupPreviewArtifacts, groupStagePreviewArtifacts, groupReviewSteps, reviewReportText,
 latestKraPreview, statusNames, displayStatus, statusLabel } from './progress.js';
import { selectedTask, rememberTask } from './task-selection.js';
import { renderReport } from './report-markdown.js';
import { morph } from './dom-morph.js';
import { createEnvEditor } from './env-editor.js';

const icons = {
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="m5 12 4 4L19 6"/>', chevron:'<path d="m9 5 7 7-7 7"/>', down:'<path d="m5 9 7 7 7-7"/>',
 play:'<path d="m8 4 12 8-12 8V4Z"/>', stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
 file:'<path d="M13 3H5v18h14V9l-6-6Z"/><path d="M13 3v6h6M8 13h8M8 17h5"/>',
 code:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
 branch:'<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 7v10M18 7v2a5 5 0 0 1-5 5H6"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 history:'<path d="M3 3v6h6M4 8a9 9 0 1 1-1 7M12 7v5l4 2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
 };
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.file}</svg>`;
const esc = value => String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function get(path) { const response = await fetch(path); const value = await response.json(); if(!response.ok) throw new Error(value.error); return value; }
const initial = await get('./api/tasks');
let tasks = initial.tasks, data = { files:[], pipelines:[] }, pipelineSteps = structuredClone(stepTemplates);
const state = {
 page:new URLSearchParams(location.search).get('page')||'project', name:selectedTask(initial.directory,tasks,new URLSearchParams(location.search).get('name')),
 stage:0, selectedStep:'preparation', inspect:false, compare:false, asset:null, zoom:null, autoHeight:true, canvasLeft:0, canvasTop:0, lane:0, mergeShift:0,
 directory:initial.directory, ref:'worktree', file:'', diff:false, configFilter:'', configFolders:new Map(), uploaded:null, configMode:'env',
 collapsedPipelines:new Set(), collapsedSteps:new Set(), collapsedPhases:new Set(),
 details:new Map(),
};
const stages = [
 {name:'人物分块',id:'part-layering'}, {name:'人物绘制',id:'raster-layering'},
 {name:'衣服分块',id:'clothing-part-layering'}, {name:'衣服绘制',id:'clothing-raster-layering'},
 {name:'穿戴组装',id:'character-assembly'}, {name:'阴影制作',id:'shadow'},
];
// After the character preparation the character and clothing lanes run side by side; both merge into the assembly.
const flowLanes = [{name:'人物线',stages:[0,1]}, {name:'衣服线',stages:[2,3]}], mergeStages = [4,5];
const laneOf = index => flowLanes.findIndex(lane=>lane.stages.includes(index));
const isRasterPipeline = index => ['raster-layering','clothing-raster-layering'].includes(stages[index]?.id);
const hasKraPreview = index => isRasterPipeline(index)||stages[index]?.id==='character-assembly'
 ||stages[index]?.id==='shadow'&&data.pipelines[index]?.mode==='mask';
async function post(path, value) {
 const response = await fetch('./api/'+path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dir:state.directory,...value})});
 const result = await response.json(); if(!response.ok)throw Object.assign(new Error(result.error),{krita:result.krita}); return result;
}
// Start, continue, resume and retry refuse an unusable Krita before changing any step,
// like pnpm start; the path is given again here as with --krita.
async function postWithKrita(path, value) {
 try{return await post(path,value);}
 catch(error){
  if(!error.krita)throw error;
  const krita=prompt(error.message+'\n\nKrita 可执行文件路径：',error.krita.path||'');
  if(!krita?.trim())throw error;
  return postWithKrita(path,{...value,krita:krita.trim()});
 }
}
const requestedStage = Number(new URLSearchParams(location.search).get('stage') ?? 0);
if (Number.isInteger(requestedStage) && requestedStage >= 0 && requestedStage < stages.length) {
 state.stage = requestedStage;
 state.selectedStep = requestedStage === 0 || requestedStage === 2 ? 'layers' : requestedStage >= 4 ? 'step01' : 'step02';
}
const taskParams = () => new URLSearchParams({name:state.name,dir:state.directory});
const artifact = (path, thumbnail=false) => './artifact?'+new URLSearchParams({name:state.name,dir:state.directory,path,v:data.fileVersions?.[path]||'',...(/\.kra$/i.test(path)?{preview:'kra',...(thumbnail?{fit:'content'}:{})}:thumbnail&&/\.svg$/i.test(path)?{preview:'content'}:{})});
function flat(nodes) { return nodes.flatMap(node=>[node,...flat(node.groups||[])]); }
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('visible'),4000); }

function header() {
 return `<header class="app-header"><a class="brand" href="./"><span class="brand-mark">${icon('layers')}</span><span>Astra<span class="brand-light">Layering</span></span></a>
 <nav class="global-tabs" aria-label="工作台页面"><button data-page="project" class="${state.page==='project'?'active':''}">${icon('branch')}任务与执行</button><button data-page="preview" class="${state.page==='preview'?'active':''}">${icon('layers')}流程预览</button><button data-page="config" class="${state.page==='config'?'active':''}">${icon('code')}管线配置</button></nav>
 <a class="button" href="./studio?${new URLSearchParams({project:state.name})}">${icon('eye')}角色工作台</a><span class="demo-badge">实时任务 · 每 4 秒同步</span></header>`;
}
const taskStatusNames = {ready:'待启动', running:'运行中', completed:'所选路线已完成', failed:'执行失败', interrupted:'已中断', untracked:'无总控记录'};
function pageHeading() {
 return `<div class="page-heading"><div class="task-heading"><select id="task-select" aria-label="选择任务"><option value="" ${!state.name?'selected':''}>选择任务</option>${tasks.map(task=>`<option value="${esc(task.name)}" ${task.name===state.name?'selected':''}>${esc(task.displayName||task.name)} · ${taskStatusNames[task.status]||task.status}</option>`).join('')}</select><button class="directory-button" data-action="directory" title="${esc(state.directory)}">${icon('folder')}工作目录 ${icon('down')}</button></div><div class="heading-actions"><button class="button" data-action="new">${icon('plus')}新建任务</button>${state.name?`<button class="button" data-action="files">${icon('folder')}全部产物</button>${stepToolbar()}`:''}</div></div>`;
}
let archivedFiles = new Set();
const assetLookup = new Map();
const groupViews = {0:{selected:'',depth:-1,search:'',open:false,expanded:new Set()},2:{selected:'',depth:-1,search:'',open:false,expanded:new Set()}};
// Expanded and collapsed sections survive a page reload (per browser tab).
const viewKey='astra-layering-view';
function saveView() {
 try{sessionStorage.setItem(viewKey,JSON.stringify({details:[...state.details],pipelines:[...state.collapsedPipelines],steps:[...state.collapsedSteps],phases:[...state.collapsedPhases],notice:state.noticeStatus,
  groups:Object.fromEntries(Object.entries(groupViews).map(([index,view])=>[index,{...view,expanded:[...view.expanded]}]))}));}catch{}
}
try{
 const saved=JSON.parse(sessionStorage.getItem(viewKey)||'null');
 if(saved){
  state.details=new Map(saved.details);state.collapsedPipelines=new Set(saved.pipelines);state.collapsedSteps=new Set(saved.steps);state.collapsedPhases=new Set(saved.phases);state.noticeStatus=saved.notice;
  for(const [index,view] of Object.entries(saved.groups||{}))if(groupViews[index])Object.assign(groupViews[index],{...view,expanded:new Set(view.expanded)});
 }
}catch{}
const pipelineTree = index => data.pipelines?.[index]?.groups||[];
const available = items => (items||[]).flatMap(item=> {
 if(archivedFiles.has(item.path))return [item];
 if(/(?:simplified|base)-subject\.png$/.test(item.path)) {
  const path = data.files.find(path=>path.replace(/\.(jpg|jpeg|webp)$/i,'.png')===item.path);
  if(path)return [{...item,path}];
 }
 return [];
});
function applySnapshot(next) {
 data=next; archivedFiles=new Set(data.files); assetLookup.clear();
 if(state.asset?.kind==='image'&&state.asset.path.endsWith('.kra')) {
  const source=state.asset.sharedPreview?latestKraPreview(data.pipelines[state.stage]?.previews):data.pipelines[state.stage]?.previews?.[state.selectedStep];
  if(source){state.asset={...state.asset,path:source.path};if(state.asset.sharedPreview)state.selectedStep=source.stepId;}
 }
 if(state.asset?.kind==='file'&&/\.md(?:\.tmp)?$/.test(state.asset.path)&&!archivedFiles.has(state.asset.path)) {
  const published=state.asset.path.replace(/\.tmp$/,'');
  if(archivedFiles.has(published))state.asset={...state.asset,path:published};
 }
 if(state.asset?.path.endsWith('.draft.svg')&&!archivedFiles.has(state.asset.path)) {
  const published=state.asset.path.replace(/\.draft\.svg$/,'.svg');
  if(archivedFiles.has(published))state.asset={...state.asset,path:published,label:state.asset.label.replace(' · 中间产物','图')};
 }
 pipelineSteps=structuredClone(stepTemplates);
 for(const [index,stage] of stages.entries()) {
  stage.status=data.pipelines[index]?.status||'pending';
  const mark=steps=>steps.forEach(step=>{
   step.status=data.pipelines[index]?.states[step.id]||'pending';
   if(index===0&&step.id==='standard')step.note=data.run?.standard===true?'标准化：已开启':data.run?.standard===false?'标准化：未开启':'标准化：未记录';
   mark(step.children);
  });
  mark(pipelineSteps[index]);
 }
 for(const index of [0,2]) {
  const roots=pipelineTree(index),view=groupViews[index];
  if(!flat(roots).some(node=>node.id===view.selected)){view.selected=roots[0]?.id||'';view.expanded=new Set(roots[0]?[roots[0].id]:[]);}
 }
}
let refreshVersion=0, lastSnapshot='';
async function refreshTask(force=false) {
 const version=++refreshVersion;
 const listing=await get('./api/tasks');
 if(version!==refreshVersion)return;
 if(listing.directory!==state.directory){state.directory=listing.directory;state.name='';state.inspect=false;state.asset=null;force=true;}
 tasks=listing.tasks;
 if(!tasks.some(task=>task.name===state.name))state.name=selectedTask(state.directory,tasks);
 rememberTask(state.directory,state.name);
 const next=state.name?await get('./api/task?'+taskParams()):{files:[],pipelines:[]};
 if(version!==refreshVersion)return;
 const fingerprint=JSON.stringify({next,tasks});
 // Interaction may defer artifact redraws, but must never hide a stopped runner.
 const executionChanged=next.status!==data.status||next.runnerAlive!==data.runnerAlive||next.lockHeld!==data.lockHeld;
 const focused=document.activeElement;
 const treeControl=focused?.dataset?.treeSearch!==undefined?'data-tree-search':focused?.dataset?.treeDepth!==undefined?'data-tree-depth':null;
 if(!force&&!executionChanged&&(document.querySelector('dialog[open]')||(!treeControl&&focused?.matches('input,select'))||document.querySelector('.panning')))return;
 const focus=treeControl?{selector:`[${treeControl}="${focused.getAttribute(treeControl)}"]`,start:focused.selectionStart,end:focused.selectionEnd}:null;
 if(fingerprint!==lastSnapshot||force){
  const selected=state.asset;
  if(selected?.kind==='file'&&next.fileVersions?.[selected.path]!==data.fileVersions?.[selected.path]) {
   const published=selected.path.replace(/\.md\.tmp$/,'.md');
   const path=next.files.includes(published)&&!next.files.includes(selected.path)?published:selected.path;
   const response=await fetch(artifact(path));
   const text=response.ok?await response.text():'此产物暂时不可读取';
   if(version!==refreshVersion)return;
   if(state.asset===selected)selected.text=text;
  }
  lastSnapshot=fingerprint;applySnapshot(next);if(document.querySelector('.app-header')&&(state.page!=='config'||force)){
   render();
   if(focus){const input=document.querySelector(focus.selector);input?.focus({preventScroll:true});if(focus.start!=null)input?.setSelectionRange(focus.start,focus.end);}
  }
 }
}
function artifacts(items, index, stepId, className='') {
 const list=available(items);
 if(!list.length)return '';
 const view=item=>{
  if(item.path.endsWith('.kra')&&item.kind!=='image')return `<a class="artifact-file" href="${artifact(item.path).replace('&preview=kra','')}" target="_blank" rel="noopener">${icon('layers')}${esc(item.label)} ${icon('arrow')}</a>`;
  const key=item.reviewIndex===undefined?item.path:`${item.path}#${item.reviewMode}-${item.reviewIndex}`;
  assetLookup.set(key,item);
  return `<button class="${item.kind==='image'?'artifact-image':'artifact-file'} ${item.path.endsWith('.draft.svg')?'draft-artifact':''}" data-asset="${esc(key)}" data-asset-stage="${index}" data-asset-step="${stepId}" title="${esc(item.path)}">${item.kind==='image'?`<img loading="lazy" src="${artifact(item.path,true)}" alt="${esc(item.label)}">`:icon('file')}<span>${esc(item.label)}</span>${item.kind==='image'&&data.fileVersions?.[item.path]?`<small>更新于 ${esc(new Date(Number(data.fileVersions[item.path].split(':')[0])).toLocaleTimeString())}</small>`:''}${item.kind==='file'?icon('chevron'):''}</button>`;
 };
 const images=list.filter(item=>item.kind==='image'),files=list.filter(item=>item.kind!=='image');
 const fileList=files.map(view).join('');
 return `<div class="step-artifacts ${className}">${images.length?`<div class="artifact-images">${images.map(view).join('')}</div>`:''}${className==='process-artifacts'&&files.length?`<div class="process-file-list">${fileList}</div>`:fileList}</div>`;
}
function inlineTreeRows(nodes,index,depth=0,flatView=false) {
 const view=groupViews[index];
 return nodes.map(node=>{
  const branch=!!node.groups?.length,open=branch&&view.expanded.has(node.id)&&!flatView;
  const status=groupSummary(node);
  return `<div class="tree-row ${view.selected===node.id?'selected':''}" style="--depth:${depth}" title="${esc(node.id+' · '+status.text)}">${branch&&!flatView?`<button class="tree-toggle" data-tree-expand="${esc(node.id)}" data-tree-stage="${index}" aria-label="${open?'收起':'展开'} ${esc(node.id)}" aria-expanded="${open}">${icon(open?'down':'chevron')}</button>`:'<span class="tree-toggle"></span>'}<button class="tree-label" data-tree-group="${esc(node.id)}" data-tree-stage="${index}">${statusMark(status.status)}<span>${esc(node.id.split('/').at(-1))}</span><small>${esc(status.text)}</small></button></div>${open?inlineTreeRows(node.groups,index,depth+1):''}`;
 }).join('');
}
function svgPreviewPanel(index,group,phase,phaseFiles) {
 const items=groupStagePreviewArtifacts(phase,phaseFiles,archivedFiles,data.fileVersions);
 const title=phase==='outline'?'轮廓 SVG 最新画面':'补全 SVG 最新画面';
 return `<section class="kra-preview-panel svg-preview-panel" data-svg-preview="${index}:${phase}" aria-label="${esc(group.id)} ${title}"><h3>${icon('layers')}${title}</h3><p class="preview-source" title="${esc(items[0]?.path||group.id)}">${esc(items[0]?.label||group.id)}</p>${items.length?artifacts(items,index,phase,'live-kra-artifacts'):'<p class="archive-gap">等待首次保存 SVG</p>'}</section>`;
}
// Task recovery: 继续 keeps products and sessions, 恢复 drops the sessions and keeps
// products, 重试 deletes the step products and sessions; dependents rerun with them.
// Each acts on every interrupted or failed step of the task at once, then runs the
// task again. Without any step record 继续 opens the run dialog instead. While the
// task runs they cannot apply, so the toolbar holds the stop button in their place.
const stepActionNames={continue:'继续',resume:'恢复',retry:'重试'};
// The titles name the matching pnpm start option; the help of workflow/run.ts lists the same commands.
const stepActionTitles={continue:'保留产物与会话，从中断处继续运行（命令行 --continue）',resume:'清除会话、保留产物，在新会话中继续运行（命令行 --resume）',retry:'删除这些步骤的产物与会话后重做；依赖它们的后续步骤自动重跑（命令行 --retry）'};
function stepTargets() {
 return (data.pipelines||[]).flatMap((pipeline,index)=>[
  ...(pipeline.steps||[]).map(step=>({index,id:step.id,status:step.status,session:step.session}))]);
}
const brokenSteps=(targets=stepTargets())=>targets.filter(target=>target.status==='running');
const stepLabel=target=>`${stages[target.index].name} ${target.id}`;
const visibleStage=index=>!data.archived||Object.hasOwn(data.run?.pipelines||{},stages[index].id);
function stepToolbar() {
 if(!state.name)return '';
 const exportButton=data.canExport?`<a class="button" data-export href="./api/export?${taskParams()}" title="下载正式产物、完整流程预览与报告；不包含过程文件">导出成果</a>`:'';
 if(data.archived)return `<div class="step-toolbar" role="group" aria-label="成果归档">${exportButton}<span>成果归档</span></div>`;
 const targets=stepTargets(),broken=brokenSteps(targets),busy=data.runnerAlive||data.lockHeld;
 if(busy)return `<div class="step-toolbar" role="group" aria-label="任务控制"><button class="button" data-action="stop" title="${data.canStop?'停止运行，保留产物与续跑记录（命令行 --stop）':'当前运行未提供可用的停止入口'}" ${data.canStop?'':'disabled'}>${icon('stop')}停止</button></div>`;
 const allowed=action=>action==='continue'||broken.length>0;
 const scope=broken.length?`（${broken.length} 个中断 / 失败步骤：${broken.map(stepLabel).join('、')}）`:'';
 const reason=action=>!targets.length?'运行任务（可选择范围）':
  !allowed(action)?'没有中断或失败的步骤':stepActionTitles[action]+scope;
 return `<div class="step-toolbar" role="group" aria-label="任务恢复">${Object.keys(stepActionNames).map(action=>`<button class="${action==='continue'?'primary':'button'}" data-step-toolbar="${action}" title="${esc(reason(action))}" ${!allowed(action)?'disabled':''}>${stepActionNames[action]}</button>`).join('')}${exportButton}</div>`;
}
function groupPhaseNode(index,id,label,status,detail,items,number,hasPreview=false) {
 const key=`${index}:${id}`,closed=state.collapsedPhases.has(key);
 return `<section class="cycle-phase ${status==='skipped'?'skipped-node':''} ${closed?'collapsed':''}" data-phase="${key}"><button data-phase-toggle="${key}" aria-expanded="${!closed}" aria-label="${closed?'展开':'收起'}${label}"><span class="cycle-number">${number}</span><b>${esc(label)}</b>${statusMark(status)}${icon(closed?'chevron':'down')}</button>${closed?'':`<p class="phase-state ${displayStatus(status)}" title="${esc(detail)}">${status==='skipped'?'无需执行':esc(statusLabel(status))}</p>${artifacts(items,index,id,'phase-artifacts')}${status==='skipped'?'':hasPreview?'<span class="phase-explanation">SVG 见左侧预览</span>':!available(items).length?'<span class="phase-explanation">尚无本步骤产物</span>':''}`}</section>`;
}
function groupDetailPhases(index,group,phaseFiles) {
 const steps=groupPhases.flatMap(([id,label])=>id==='review'
  ?groupReviewSteps(group,stages[index].id,group.id)
  :[{id,title:label,status:group.webPhases?.[id]||'pending',detail:group.webDetails?.[id]||'',
    artifacts:['outline','completion'].includes(id)?phaseFiles[id].filter(item=>item.kind==='file'):phaseFiles[id]}]);
 return steps.map((step,i)=>{
  return (['outline','completion'].includes(step.id)?svgPreviewPanel(index,group,step.id,phaseFiles):'')
   +groupPhaseNode(index,step.id,step.title,step.status,step.detail,step.artifacts,i+1,
    ['outline','completion'].includes(step.id)&&available(phaseFiles[step.id]).some(item=>item.kind==='image'));
 }).join('');
}
function groupCycle(index) {
 const roots=pipelineTree(index), view=groupViews[index], layers=groupLayers(roots), all=flat(roots);
 const group=all.find(node=>node.id===view.selected)||roots[0];
 if(!group)return '<p class="empty-tree">尚无分组记录。分组生成后，这里会展示实际树结构和各部件的六个处理环节。</p>';
 const prefix=stages[index].id;
 const depth=layers.findIndex(nodes=>nodes.includes(group)), phaseFiles=groupArtifacts(prefix,group,depth);
 const candidates=view.depth>=0?layers[view.depth]||[]:view.search?all:roots;
 const nodes=view.search?candidates.filter(node=>node.id.toLowerCase().includes(view.search.toLowerCase())):candidates;
 return `<div class="group-cycle" data-cycle="${index}"><p class="cycle-rule">每层轮廓与复核齐备 → 同层去重 → 补全、检查、直属拆分 → 下一层</p>
 <div class="cycle-context"><span>第 ${depth+1} 层</span><b title="${esc(group.id)}">${esc(group.id)}</b><button class="button group-expand" data-group-toggle="${index}" aria-expanded="${view.open}">${icon(view.open?'chevron':'expand')}${view.open?'收起详情':'横向展开'}</button></div>
 <div class="group-workspace ${view.open?'expanded':''}">
 <div class="inline-tree"><div class="inline-tree-heading">${icon('branch')}group / part 树<small>${all.length} 个节点</small></div>
 <div class="tree-controls"><select data-tree-depth="${index}" aria-label="${stages[index].name}拆分树深度"><option value="-1">完整层级</option>${layers.map((nodes,i)=>`<option value="${i}" ${view.depth===i?'selected':''}>第 ${i+1} 层 · ${nodes.length} 个节点</option>`).join('')}</select><button class="icon-button" data-expand-all="${index}" title="展开全部层级">${icon('expand')}</button></div>
 <div class="tree-search">${icon('search')}<input data-tree-search="${index}" aria-label="搜索${stages[index].name}部件" placeholder="搜索部件" value="${esc(view.search)}"></div>
 <div class="inline-tree-rows" data-tree-scroll="${index}">${inlineTreeRows(nodes,index,0,view.depth>=0||!!view.search)||'<p class="empty-tree">没有匹配的部件</p>'}</div>
 <p class="tree-note">点击部件切换预览；详情由“横向展开”控制。</p>
 ${artifacts([{path:`${prefix}/groups.json`,label:'完整 groups.json',kind:'file'}],index,'layers')}
 </div>
 ${view.open?`<div class="group-detail"><p class="group-note">${esc(group.note||'')}</p><div class="cycle-phases">${groupDetailPhases(index,group,phaseFiles)}</div></div>`:`<div class="group-compact"><p>${statusMark(groupSummary(group).status)}${esc(groupSummary(group).text)}</p><div class="compact-phases">${groupPhases.map(([id,label])=>`<button data-group-toggle="${index}" aria-label="展开 ${esc(group.id)} 的${label}">${statusMark(group.webPhases?.[id]||'pending')}${label}</button>`).join('')}</div>${artifacts(groupPreviewArtifacts(group,phaseFiles,archivedFiles,data.fileVersions),index,'layers')}</div>`}
 </div></div>`;
}
function statusMark(status) {
 const value=displayStatus(status);
 return `<span class="phase-mark ${value}" title="${statusLabel(status)}" aria-label="${statusLabel(status)}">${value==='done'?icon('check'):value==='running'?'<i></i>':value==='failed'?'<b class="failure-exclamation" aria-hidden="true">!</b>':icon(value==='available'?'image':'clock')}</span>`;
}
function selectedStep() {
 const all=nodes=>nodes.flatMap(node=>[node,...all(node.children)]);
 return all(pipelineSteps[state.stage]).find(step=>step.id===state.selectedStep)||pipelineSteps[state.stage][0];
}
function observedDisplayStatus(index, status, stepId) {
 const prefix=stages[index].id+'/'+(stepId?stepId+'/':'');
 const hasArtifacts=available(stepArtifacts[index]?.[stepId]).length>0||data.files.some(path=>path.startsWith(prefix)&&!path.includes('/agents/')&&/\.(png|jpe?g|webp|svg|kra)$/i.test(path));
 return displayStatus(status,hasArtifacts);
}
function rasterItems(index, stepId) {
 const stage=stages[index].id, pipeline=data.pipelines[index];
 if(!hasKraPreview(index))return stepArtifacts[index][stepId];
 if(stage==='shadow')return (stepArtifacts[index][stepId]||[]).filter(item=>item.path!=='shadow/mask/step01/character-shadowed.png');
 const files=(stepArtifacts[index][stepId]||[]).filter(item=>item.kind==='file');
 const report=pipeline?.reports?.[stepId];
 const reportFile=report?[{path:report.path,label:report.draft?'报告草稿':'完整报告',kind:'file'}]:[];
 if(isRasterPipeline(index)) {
  // Drawing, review and repair share one live canvas, shown beside the steps.
  if(stepId==='step01')return files.filter(item=>!item.path.endsWith('/report.md'));
  return [...files.filter(item=>!item.path.endsWith('.md')),...reportFile];
 }
 return files;
}
function kraPreviewPanel(index) {
 if(!hasKraPreview(index))return '';
 const record=latestKraPreview(data.pipelines[index]?.previews);
 const step=record&&pipelineSteps[index].find(step=>step.id===record.stepId);
 const sourceTitle=stages[index].id==='shadow'?'Live2D 蒙版':step?.title||record?.stepId;
 return `<section class="kra-preview-panel" data-kra-preview="${index}" aria-label="${esc(stages[index].name)}最新 KRA 预览"><h3>${icon('layers')}Krita 最新画面</h3>${record?`<p class="preview-source">${esc(sourceTitle)}</p>${artifacts([{path:record.path,label:'最新保存画面',kind:'image',sharedPreview:true}],index,record.stepId,'live-kra-artifacts')}`:'<p class="archive-gap">等待首次保存 KRA</p>'}</section>`;
}
function reportEvidence(index, stepId) {
 const report=data.pipelines[index]?.reports?.[stepId];
 if(!report||stepId==='step01'&&pipelineSteps[index]?.find(step=>step.id===stepId)?.children.length)return '';
 const images=[...new Map(report.images.map(image=>[image.path,image])).values()];
 images.sort((a,b)=>Number(/\/marked\.png$/.test(b.path))-Number(/\/marked\.png$/.test(a.path)));
 return `<p class="review-feedback">${report.draft?'<span class="report-draft">草稿 · </span>':''}${esc(report.summary)}</p>${images.length?artifacts(images.map(image=>({path:image.path,label:image.label,kind:'image'})),index,stepId,'report-evidence'):''}`;
}
function reviewNodes(index,children) {
 let html='',skipping=false;
 for(const child of children) {
  if(child.status==='skipped'&&!skipping){html+='<div class="skipped-steps" aria-label="无需执行的后续步骤">';skipping=true;}
  if(child.status!=='skipped'&&skipping){html+='</div>';skipping=false;}
  html+=stepNode(index,child,true);
 }
 return html+(skipping?'</div>':'');
}
function stepNode(index,step,nested=false) {
 const status=observedDisplayStatus(index,step.status,step.id);
 if(step.status==='skipped')return `<section class="step-node nested skipped-node" data-node="${index}:${step.id}"><div class="skipped-heading"><span class="phase-mark">${icon('arrow')}</span><h3>${esc(step.title)}</h3><small>无需执行</small></div></section>`;
 const selected=state.inspect&&state.stage===index&&state.selectedStep===step.id;
 const key=`${index}:${step.id}`, closed=state.collapsedSteps.has(key);
 const alternative=step.childrenMode==='alternative';
 const branch=stages[index].id==='shadow'&&['mask','normal-depth'].includes(step.id);
 const currentBranch=branch&&step.id===(data.run?.shadowMode||'mask');
 const context=step.id==='layers'?groupCycle(index):step.children.length?`<div class="step-children ${alternative?'step-alternatives':''}" ${alternative?'role="group" aria-label="阴影方式：二选一"':''}>${isRasterPipeline(index)&&step.id==='step01'?reviewNodes(index,step.children):step.children.map((child,i)=>`${alternative&&i?'<span class="branch-or">OR</span>':''}${stepNode(index,child,true)}`).join('')}</div>`:'';
 return `<section class="step-node ${nested?'nested':''} ${step.children.length?'step-container':''} ${isRasterPipeline(index)&&step.id==='step01'?'raster-review':''} ${closed?'node-collapsed':''} ${step.status} ${selected?'selected':''}" data-node="${index}:${step.id}">
 ${branch?`<div class="branch-choice ${currentBranch?'current':''}">${currentBranch?'当前方式':'备选方式'}</div>`:''}
 <div class="section-heading"><button class="step-node-heading" data-step="${index}:${step.id}">${statusMark(status)}<h3>${esc(step.title)}</h3><small class="step-state" title="${esc(step.id)}">${esc(statusLabel(status))}</small></button><button class="icon-button" data-section-toggle="${key}" aria-label="${closed?'展开':'收起'}${esc(step.title)}" aria-expanded="${!closed}">${icon(closed?'chevron':'down')}</button></div>
 ${closed?'':`<div class="step-content">
 ${step.id!=='layers'&&(step.note||['standard','simplified','base','clothing'].includes(step.id))?`<p class="step-summary" ${step.note?`title="${esc(step.note)}"`:'aria-hidden="true"'}>${esc(step.note)}</p>`:''}
 ${step.id==='standard'&&!available(stepArtifacts[index][step.id]).some(item=>item.kind==='image')?'<p class="archive-gap" title="人物准备阶段执行后展示标准参考图">尚无标准参考图</p>':''}
 ${context}
 ${reportEvidence(index,step.id)}
 ${artifacts(step.id==='mask'&&stages[index].id==='shadow'?[...rasterItems(index,step.id),...shadowInspectionArtifacts(data.files)]:rasterItems(index,step.id),index,step.id)}
 ${data.pipelines[index]?.messages[step.id]?`<p class="${step.status==='running'?'step-activity':'status-error'}">${esc(data.pipelines[index].messages[step.id])}</p>`:''}
 ${processArtifacts(index,step)}
 </div>
 `}
 </section>`;
}
function processArtifacts(index, step) {
 const directory=step.processDirectory||(step.id.startsWith('step')?stages[index].id+'/'+step.id:null);
 if(!directory)return '';
 const prefix=directory+'/';
 const known=new Set([...Object.values(stepArtifacts[index]).flat(),...shadowInspectionArtifacts(data.files)].map(item=>item.path));
 const legacy=data.processWorkspaces?.[directory]||[];
 const roots=[directory+'/workspace',...legacy];
 const filtered=data.files.filter(path=>(path.startsWith(prefix)||legacy.some(root=>path.startsWith(root+'/')))&&!known.has(path)
  && (roots.some(root=>path.startsWith(root+'/'))||!path.includes('/agents/')&&!/(?:^|\/)(?:prompt\.md|[^/]+\.prompt\.txt|(?:[^/]+\.)?result\.json|attempts\.jsonl|events\.jsonl|error\.txt|review-baseline\.json)$/.test(path)));
 const items=filtered.filter(path=>roots.some(root=>path.startsWith(root+'/')));
 // Outside workspace only fixed results and report-cited evidence are shown; the step's own report already shows its images.
 const reports=data.pipelines[index]?.reports||{}, own=reportEvidence(index,step.id)?reports[step.id].images.map(image=>image.path):[];
 const cited=new Set(Object.values(reports).flatMap(report=>report.images.map(image=>image.path)).filter(path=>!own.includes(path)));
 const deliveries=filtered.filter(path=>!items.includes(path)&&cited.has(path));
 const listing=processFileList(items,roots,data.fileVersions);
 const render=paths=>artifacts(paths.map(path=>({path,label:path.split('/').at(-1),kind:/\.(png|jpe?g|webp|svg|kra)$/i.test(path)?'image':'file'})),index,step.id,'process-artifacts');
 const extra=deliveries.length?`<details class="process-files delivery-files" data-details="delivery:${index}:${step.id}"><summary>${deliveries.length} 个补充产物</summary>${render(deliveries)}</details>`:'';
 return extra+(items.length?`<details class="process-files" data-details="process:${index}:${step.id}"><summary>${listing.total} 个过程文件${listing.shown<listing.total?` · 显示 ${listing.shown} 个（按目录平分）`:''}</summary>${listing.folders.map(({folder,total,files})=>`<details class="process-group" data-details="process-folder:${index}:${step.id}:${esc(folder)}"><summary>${esc(folder||'workspace 根目录')} <small>${total} 个${files.length<total?` · 显示最新 ${files.length} 个`:''}</small></summary>${render(files)}</details>`).join('')}</details>`:'');
}
// Shown while the section's private Krita process is running.
// A skipped lane (no dress-up, nothing to make) counts as complete.
const finished=stage=>stage.status==='done'||stage.status==='skipped';
function flowCard(index) {
 const stage=stages[index],status=observedDisplayStatus(index,stage.status),closed=state.collapsedPipelines.has(index),wide=!closed&&groupViews[index]?.open&&!state.collapsedSteps.has(`${index}:layers`);
 return `<section class="pipeline-lane ${stage.status} ${closed?'collapsed':''} ${wide?'group-expanded':''} ${stage.id==='shadow'?'branch-lane':''}" data-pipeline="${index}"><div class="pipeline-heading"><button data-stage="${index}" aria-label="查看${stage.name}交付"><span class="node-number">${String(index+1).padStart(2,'0')}</span><h2>${stage.name}</h2>${statusMark(status)}${kritaBadge(index)}</button><button class="icon-button" data-pipeline-toggle="${index}" aria-label="${closed?'展开':'收起'}${stage.name}栏目" aria-expanded="${!closed}">${icon(closed?'chevron':'down')}</button></div>${stage.status==='skipped'?`<p class="lane-summary skipped-lane">${esc(data.pipelines[index]?.summary||'无需执行')}</p>`:''}${closed?`<p class="lane-summary">${esc(statusLabel(status))}</p>`:`<div class="pipeline-steps">${kraPreviewPanel(index)}${stage.id==='shadow'?'<div class="shadow-references"><a href="./shadow-reference/skirt.png" target="_blank" rel="noopener">裙影参考 ↗</a><a href="./shadow-reference/hair.png" target="_blank" rel="noopener">发影参考 ↗</a></div>':''}${pipelineSteps[index].map(step=>stepNode(index,step)).join('')}${data.pipelines[index]?.threadId?`<small class="thread-id" title="${esc(data.pipelines[index].threadId)}">thread · ${esc(data.pipelines[index].threadId)}</small>`:''}</div>`}</section>`;
}
function inspector() {
 const stage=stages[state.stage],step=selectedStep(),item=state.asset;
 const image=item?.kind==='image';
 const report=item&&Object.values(data.pipelines[state.stage]?.reports||{}).find(report=>report.path===item.path);
 return `<aside class="output-inspector" aria-label="产物放大查看"><header class="output-heading"><div><small>${esc(stage.name)} · ${esc(step.title)}</small><h2>${esc(item?.label||step.title)}</h2></div><button class="icon-button" data-action="close-inspector" aria-label="关闭产物面板">${icon('close')}</button></header><div class="output-scroll">
 ${image?`<div class="output-caption"><span>当前任务产物</span><label><input type="checkbox" id="compare-reference" ${state.compare?'checked':''}>对照参考</label></div><div class="output-image ${state.compare?'compare':''}">${state.compare&&data.reference?`<figure><img src="${artifact(data.reference)}" alt="简化角色参考"><figcaption>简化角色参考</figcaption></figure>`:''}<figure><a href="${artifact(item.path)}" target="_blank" rel="noopener"><img loading="lazy" src="${artifact(item.path)}" alt="${esc(item.label)}"></a><figcaption>点击打开原尺寸</figcaption></figure></div>`:item?item.reviewIndex!==undefined?`<article class="report-document">${renderReport(reviewReportText(item.text??'正在读取…',item))}</article>`:/\.md(?:\.tmp)?$/.test(item.path)?`<article class="report-document">${renderReport(item.text??'正在读取…',report?.images,path=>artifact(path))}</article>`:`<pre class="artifact-text">${esc(item.text??'正在读取…')}</pre>`:`<p class="step-note">${esc(step.note||'此步骤的过程和已有产物直接展示在画布中。')}</p>`}
 ${item?`<a class="artifact-source" href="${artifact(item.path)}" target="_blank" rel="noopener">${esc(item.path)} ${icon('arrow')}</a>`:''}</div></aside>`;
}
function overviewCard(stage,index) {
 const status=observedDisplayStatus(index,stage.status);
 return `<article class="overview-card ${status} ${state.stage===index?'selected':''}" data-overview="${index}">
 <button class="overview-stage" data-stage="${index}" aria-label="查看${esc(stage.name)}进展"><span class="node-number">${String(index+1).padStart(2,'0')}</span><h3>${esc(stage.name)}</h3>${kritaBadge(index)}</button>
 <div class="overview-footer"><span class="execution-state ${status}">${statusMark(status)}${esc(statusLabel(status))}</span><div class="overview-actions"><button class="button" data-stage="${index}">${icon('eye')}预览</button></div></div>
 </article>`;
}
function projectPage() {
 if(!state.name)return `${pageHeading()}<section class="empty-workspace"><h2>开始一次角色制作</h2><p>新建任务并提供一张角色图，或选择已有任务所在的运行目录。</p><p>${esc(state.directory)}</p><button class="primary" data-action="new">新建任务</button></section>`;
 // The character preparation is shared; then the character and clothing lanes run in parallel and merge.
 const cards=indexes=>indexes.filter(index=>stages[index]&&visibleStage(index)).map(index=>overviewCard(stages[index],index)).join('');
 const column=(kind,title,html)=>html?`<div class="overview-column ${kind}"><small class="overview-column-title">${title}</small>${html}</div>`:'';
 const lanes=[{name:'人物线',stages:[1]},{name:'衣服线',stages:[2,3]}].map(lane=>({...lane,html:cards(lane.stages)})).filter(lane=>lane.html);
 return `${pageHeading()}${runNotice()}<section class="pipeline-overview">
 <div class="overview-heading"><div><h2>管线执行</h2><p>人物分块准备完成后，人物线与衣服线并行执行，共用同一组 agent 名额，在穿戴组装合流。选择管线，打开完整进展图。</p></div></div>
 <div class="overview-flow">${column('overview-start','共同准备',cards([0]))}${lanes.length?`<div class="overview-lanes">${lanes.map(lane=>`<div class="overview-lane"><small class="overview-column-title">${lane.name}</small><div class="overview-lane-cards">${lane.html}</div></div>`).join('')}</div>`:''}${column('overview-merge','合流',cards([4,5]))}</div></section>`;
}
function kritaBadge(index) {
 const krita=data.pipelines?.[index]?.krita;
 return krita?`<span class="krita-badge" title="Krita ${esc(krita.version)} · pid ${esc(krita.pid)} · 启动于 ${esc(new Date(krita.startedAt).toLocaleTimeString())}">Krita 运行中</span>`:'';
}
function graph() {
 if(!state.name)return '<section class="empty-workspace"><h2>尚未选择任务</h2><button class="button" data-page="project">选择任务</button></section>';
 const cards=indexes=>indexes.filter(visibleStage).map(flowCard).join('');
 const lanes=flowLanes.map((lane,i)=>({...lane,html:cards(lane.stages),i})).filter(lane=>lane.html),merge=cards(mergeStages);
 const switcher=lanes.length>1?`<nav class="lane-switch" aria-label="切换关注的管线">${lanes.map(lane=>`<button data-lane="${lane.i}" class="${state.lane===lane.i?'active':''}" aria-label="查看${lane.name}" aria-pressed="${state.lane===lane.i}" title="${lane.name}"><span></span><small>${lane.name}</small></button>`).join('')}</nav>`:'';
 return `<section class="workflow-shell"><div class="flow-area"><div class="flow-toolbar"><button class="button preview-back" data-page="project">${icon('branch')}执行控制</button><span>${esc(state.name)} · 完整流程</span><div class="flow-legend">${Object.keys(statusNames).map(status=>`<span>${statusMark(status)}${statusNames[status]}</span>`).join('')}</div><div class="canvas-tools"><button data-action="zoom-out" aria-label="缩小画布">−</button><button data-action="zoom-reset" id="zoom-label">100%</button><button data-action="zoom-in" aria-label="放大画布">＋</button><button data-action="zoom-fit">适合高度</button></div>${stepToolbar()}</div>
 <div class="flow-scroll" tabindex="0" aria-label="完整流程画布：横向滚动或拖动浏览，上下拖动或 Ctrl/⌘ + 滚轮切换人物线与衣服线"><div class="flow-size"><div class="flow-world preview-world"><svg class="flow-connectors" aria-hidden="true"></svg><div class="flow-input">${data.original?`<a href="${artifact(data.original)}" target="_blank" rel="noopener"><img src="${artifact(data.original)}" alt="原始输入图"></a>`:icon('image')}<span><b>输入角色图</b><small>original → standard</small></span></div><div class="flow-grid"><div class="flow-lanes">${lanes.map(lane=>`<div class="flow-lane" data-lane-row="${lane.i}">${lane.html}</div>`).join('')}</div>${merge?`<div class="flow-merge" style="margin-top:${state.mergeShift}px">${merge}</div>`:''}</div></div></div></div>${switcher}
 <footer class="flow-footnote">人物分块准备完成后，人物线与衣服线并行，在穿戴组装合流 · 滚轮或左右拖动横向浏览 · 上下拖动、上下滑动或 Ctrl/⌘ + 滚轮切换两条线 · 点击产物放大查看</footer></div>${state.inspect?inspector():''}</section>`;
}
function runNotice() {
 const message=data.run?.error||data.lastLogMessage||data.run?.lastMessage||'尚无总调度执行记录，可选择单条管线读取已有上游产物。';
 const stopped=data.status==='failed'||data.status==='interrupted';
 return `<details data-details="run-notice" class="run-notice ${data.status==='failed'?'error':''}" ${stopped?'open':''}><summary>${icon(data.status==='failed'?'info':'clock')}<span>${stopped?esc(taskStatusNames[data.status])+' · ':''}${esc(message.split('\n')[0])}</span><small>运行记录与日志</small></summary><div>${data.errors.length?`<pre class="status-error">${esc(data.errors.join('\n'))}</pre>`:''}<pre>${esc(message)}</pre><pre class="live-log">${esc(data.logs||'暂无日志')}</pre><small>日志：${esc(data.logPath||data.directory)}${data.logUpdatedAt?' · 日志更新：'+esc(new Date(data.logUpdatedAt).toLocaleString()):''}${data.run?.updatedAt?' · 状态保存：'+esc(new Date(data.run.updatedAt).toLocaleString()):''}</small></div></details>`;
}
let flowObserver;
// Lane geometry from the last layout, in world units: where each lane's view starts and how tall it is.
let laneMetrics={tops:[0],heights:[0]},laneAnimation=null;
const laneCount=()=>laneMetrics.tops.length;
const laneScrollTop=(lane=state.lane)=>(laneMetrics.tops[lane]??0)*state.zoom;
// The vertical scroll range inside a lane: empty when the lane fits the viewport.
function laneRange(lane=state.lane) {
 const viewport=document.querySelector('.flow-scroll'),top=laneScrollTop(lane);
 return [top,top+Math.max(0,(laneMetrics.heights[lane]??0)*state.zoom-viewport.clientHeight)];
}
function connectFlow() {
 const world=document.querySelector('.flow-world');
 if(!world)return;
 const viewport=document.querySelector('.flow-scroll'),merge=world.querySelector('.flow-merge'),grid=world.querySelector('.flow-grid');
 // Layout in world units, independent of the current zoom and merge shift.
 const rows=[...world.querySelectorAll('[data-lane-row]')];
 const gridTop=grid.offsetTop,mergeHeight=merge?.offsetHeight||0,pad=12;
 // Each lane is framed like the first: its row sits where the first row sits in the first lane.
 const tops=rows.map(row=>row.offsetTop-rows[0].offsetTop);
 const heights=rows.map((row,i)=>Math.max(gridTop+row.offsetTop+row.offsetHeight,gridTop+tops[i]+mergeHeight)+pad-tops[i]);
 laneMetrics=rows.length?{tops,heights}:{tops:[0],heights:[world.offsetHeight]};
 if(state.lane>=laneCount())state.lane=0;
 if(!laneAnimation)state.mergeShift=laneMetrics.tops[state.lane];
 if(merge)merge.style.marginTop=`${state.mergeShift}px`;
 if(state.autoHeight||state.zoom===null)state.zoom=Math.min(1,Math.max(.05,(viewport.clientHeight-8)/Math.max(...laneMetrics.heights)));
 world.style.transform=`scale(${state.zoom})`;
 const size=document.querySelector('.flow-size');
 // The last lane can always scroll to the top of the viewport.
 size.style.width=`${world.offsetWidth*state.zoom}px`;size.style.height=`${Math.max(world.offsetHeight*state.zoom,laneScrollTop(laneCount()-1)+viewport.clientHeight)}px`;
 document.querySelector('#zoom-label').textContent=Math.round(state.zoom*100)+'%';
 const bounds=world.getBoundingClientRect();
 const box=selector=>{const element=world.querySelector(selector);if(!element)return null;const r=element.getBoundingClientRect();return {x:(r.left-bounds.left)/state.zoom,y:(r.top-bounds.top)/state.zoom,w:r.width/state.zoom,h:r.height/state.zoom};};
 const input=box('.flow-input'),cards=stages.map((_,i)=>box(`[data-pipeline="${i}"] .pipeline-heading`));
 const svg=world.querySelector('.flow-connectors'),paths=[];
 // Labels sit on their line as pills, turned upright on a vertical run that is long enough.
 const status=done=>done?'done':'pending',labels=[];
 const textWidth=text=>[...text].reduce((sum,char)=>sum+(/[　-鿿]/.test(char)?11:6.4),0)+14;
 const path=(d,state)=>paths.push(`<path class="${state}" d="${d}" marker-end="url(#flow-arrow-${state})"/>`);
 const label=(text,x,y,state,upright=false)=>{const w=textWidth(text);labels.push(`<g class="flow-label ${state}"${upright?` transform="rotate(90 ${x} ${y})"`:''}><rect x="${x-w/2}" y="${y-8}" width="${w}" height="16" rx="8"/><text x="${x}" y="${y+4}">${text}</text></g>`);};
 // From the right of `a` to the left of `b`, turning at `turn` when they are not level.
 const link=(a,b,text,done,turn,from=a.y+a.h/2,to=b.y+b.h/2)=>{
  const state=status(done);
  if(Math.abs(from-to)<2){path(`M${a.x+a.w} ${from} H${b.x-6}`,state);label(text,(a.x+a.w+b.x-6)/2,from,state);return;}
  path(`M${a.x+a.w} ${from} H${turn} V${to} H${b.x-6}`,state);
  if(Math.abs(from-to)>=textWidth(text)+24)label(text,turn,(from+to)/2,state,true);
  // Starts right of the source card: a pill wider than its run must not slide under that card.
  else label(text,Math.max((a.x+a.w+turn)/2,a.x+a.w+textWidth(text)/2+6),from,state);
 };
 if(input&&cards[0]){
  const entryY=cards[0].y+cards[0].h/2;
  path(`M${input.x+input.w} ${input.y+input.h/2} H${cards[0].x-20} V${entryY} H${cards[0].x-6}`,'done');
 }
 for(const [a,b,text,done] of [[cards[0],cards[1],'parts',finished(stages[0])],[cards[2],cards[3],'parts',finished(stages[2])],[cards[4],cards[5],'组装 KRA',finished(stages[4])]])
  if(a&&b)link(a,b,text,done);
 // The clothing lane hangs off the character preparation, down the left gutter.
 if(cards[0]&&cards[2]){
  const preparation=box('[data-node="0:preparation"]'),from=preparation?preparation.y+40:cards[0].y+cards[0].h+20,x=cards[0].x-34,to=cards[2].y+cards[2].h/2,state=status(!!data.reference);
  path(`M${cards[0].x} ${from} H${x} V${to} H${cards[2].x-6}`,state);
  label('简化角色参考',x,(from+to)/2,state,to-from>=textWidth('简化角色参考')+24);
 }
 // Both lanes merge into the assembly, entering its heading side by side.
 if(cards[4]){
  const middle=cards[4].y+cards[4].h/2;
  if(cards[1])link(cards[1],cards[4],'人物素体 KRA',finished(stages[1]),cards[4].x-30,undefined,middle-(cards[3]?7:0));
  if(cards[3])link(cards[3],cards[4],'衣服 KRA',finished(stages[3]),cards[4].x-56,undefined,middle+(cards[1]?7:0));
 }
 paths.push(...labels);
 svg.setAttribute('viewBox',`0 0 ${world.offsetWidth} ${world.offsetHeight}`);
 svg.innerHTML=`<defs>${['done','pending'].map(status=>`<marker id="flow-arrow-${status}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6" fill="${status==='done'?'#86b7a8':'#a7b3c0'}"/></marker>`).join('')}</defs>${paths.join('')}`;
}
// Slides the canvas to another lane; the merge column travels along so it stays in view.
function switchLane(lane) {
 const viewport=document.querySelector('.flow-scroll');
 if(!viewport||lane<0||lane>=laneCount()||lane===state.lane&&!laneAnimation)return;
 const fromTop=viewport.scrollTop,fromShift=state.mergeShift,started=performance.now(),duration=380;
 state.lane=lane;state.canvasTop=0;
 document.querySelectorAll('[data-lane]').forEach(button=>{const active=Number(button.dataset.lane)===lane;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
 const animation=laneAnimation={};
 const frame=now=>{
  if(laneAnimation!==animation)return;
  const t=Math.min(1,(now-started)/duration),ease=t<.5?4*t*t*t:1-(-2*t+2)**3/2;
  state.mergeShift=fromShift+(laneMetrics.tops[lane]-fromShift)*ease;
  connectFlow();
  viewport.scrollTop=fromTop+(laneScrollTop(lane)-fromTop)*ease;
  if(t<1)requestAnimationFrame(frame);else{laneAnimation=null;connectFlow();viewport.scrollTop=laneScrollTop(lane);state.canvasLeft=viewport.scrollLeft;}
 };
 requestAnimationFrame(frame);
}
function zoomCanvas(value,fit=false) {
 const viewport=document.querySelector('.flow-scroll'),previous=state.zoom;
 const centerX=viewport.scrollLeft+viewport.clientWidth/2,centerY=viewport.scrollTop+viewport.clientHeight/2;
 state.autoHeight=fit;state.zoom=Math.min(1.5,Math.max(.2,value));connectFlow();
 viewport.scrollLeft=fit?0:centerX*state.zoom/previous-viewport.clientWidth/2;
 const [min,max]=laneRange();
 viewport.scrollTop=fit?min:Math.min(max,Math.max(min,centerY*state.zoom/previous-viewport.clientHeight/2));
}
async function openAsset(item,index,stepId) {
 state.stage=index;state.selectedStep=stepId;state.inspect=true;state.asset={...item};
 const selected=state.asset;render();
 if(item.kind==='file') {
  try{const response=await fetch(artifact(item.path));if(!response.ok)throw new Error('无法读取产物');selected.text=await response.text();}
  catch(error){selected.text=error.message;}
  if(state.asset===selected&&state.inspect)render();
 }
}
let versions, configFiles=[], configText='', schemaText='', diffText='', configBusy=false;
const envEditor=createEnvEditor({get,post,toast,render});
function setConfigBusy(busy) {
 configBusy=busy;
 document.querySelectorAll('.version-bar input,.version-bar select,.config-workspace button,.config-workspace input,[data-action=history]').forEach(node=>{node.disabled=busy;});
}
async function refreshConfigFile() {
 setConfigBusy(true);
 try {await loadConfigFile();render();} catch(error) {toast(error.message);} finally {setConfigBusy(false);}
}
async function loadConfig() {
 if(state.configMode==='env'){await envEditor.load();return;}
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
// The configuration files as folders, the way they sit in the skill. A folder whose only
// content is one folder shares its row (prompts / groups). Folders around the selected file
// open by themselves; one the user opened or closed stays so until the page reloads.
function configTree() {
 const families=[['part-layering','人物分块'],['raster-layering','人物绘制'],['clothing-part-layering','衣服分块'],['clothing-raster-layering','衣服绘制'],['character-assembly','穿戴组装'],['shadow','阴影制作'],['shared','公共配置'],['','技能根目录']];
 const query=state.configFilter.toLowerCase();
 const owned=file=>families.some(([prefix])=>prefix&&file.startsWith(prefix+'/'));
 const count=node=>node.files.length+[...node.folders.values()].reduce((sum,child)=>sum+count(child),0);
 const isOpen=(path,fallback)=>query?true:state.configFolders.get(path)??fallback;
 const fileRow=(file,depth)=>`<button data-config-file="${esc(file)}" class="config-file ${state.file===file?'active':''}" style="--depth:${depth}" title="${esc(file)}">${icon(file.endsWith('.json')?'code':'file')}<span>${esc(file.split('/').at(-1))}</span></button>`;
 const folderRows=(node,depth)=>[...[...node.folders].sort(([a],[b])=>a.localeCompare(b)).map(([name,child])=>{
  let label=name;
  while(!child.files.length&&child.folders.size===1){const [[next,inner]]=child.folders;label+=' / '+next;child=inner;}
  return `<details class="config-folder" data-config-folder="${esc(child.path)}" style="--depth:${depth}" ${isOpen(child.path,state.file.startsWith(child.path+'/'))?'open':''}><summary title="${esc(child.path)}">${icon('chevron')}${icon('folder')}<span>${esc(label)}</span><small>${count(child)}</small></summary>${folderRows(child,depth+1)}</details>`;
 }),...node.files.sort().map(file=>fileRow(file,depth))].join('');
 return families.map(([prefix,label])=> {
  const files=configFiles.filter(file=>(prefix?file.startsWith(prefix+'/'):!owned(file))&&(!query||file.toLowerCase().includes(query)));
  if(!files.length)return '';
  const root={path:prefix,folders:new Map(),files:[]};
  for(const file of files){
   let node=root;
   for(const part of file.split('/').slice(prefix?1:0,-1)){
    if(!node.folders.has(part))node.folders.set(part,{path:(node.path?node.path+'/':'')+part,folders:new Map(),files:[]});
    node=node.folders.get(part);
   }
   node.files.push(file);
  }
  const key=prefix||'.',active=prefix?state.file.startsWith(prefix+'/'):!!state.file&&!owned(state.file);
  return `<details class="config-family" data-config-folder="${key}" ${isOpen(key,active)?'open':''}><summary>${icon('chevron')}${icon(prefix==='shared'?'code':'folder')}<span>${label}</span><small>${files.length}</small></summary><div>${folderRows(root,0)}</div></details>`;
 }).join('');
}
// Selecting a file, and remembering a folder the user opened or closed for the next render.
function bindConfigTree() {
 document.querySelectorAll('[data-config-file]').forEach(b=>b.onclick=async()=>{state.file=b.dataset.configFile;await refreshConfigFile();});
 document.querySelectorAll('[data-config-folder]>summary').forEach(summary=>summary.onclick=()=>{if(!state.configFilter)state.configFolders.set(summary.parentElement.dataset.configFolder,!summary.parentElement.open);});
}
function configPage() {
 const tabs=`<nav class="config-mode-tabs" aria-label="配置内容"><button data-config-mode="env" class="${state.configMode==='env'?'active':''}">环境与模型</button><button data-config-mode="files" class="${state.configMode==='files'?'active':''}">提示词与工具</button></nav>`;
 return state.configMode==='env'?`<div class="page-heading config-heading"><div><div class="breadcrumb">工作空间 ${icon('chevron')}<span>本地配置</span></div><h1>管线配置</h1><p>选择模型、连接服务，预览并保存这份仓库的运行配置。</p></div></div>${tabs}${envEditor.view()}`:tabs+promptConfigPage();
}
function promptConfigPage() {
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
 const focused=document.activeElement;
 const focusId=focused?.id;
 const selection=focused?.tagName==='INPUT'&&focused.type==='text'?[focused.selectionStart,focused.selectionEnd]:null;
 const previous=document.querySelector('.flow-scroll');
 // The vertical position is kept relative to the focused lane, which may move as cards change.
 if(previous){state.canvasLeft=previous.scrollLeft;state.canvasTop=previous.scrollTop-laneScrollTop();}
 const treeScroll=Object.fromEntries([...document.querySelectorAll('[data-tree-scroll]')].map(node=>[node.dataset.treeScroll,node.scrollTop]));
 const outputScroll=document.querySelector('.output-scroll')?.scrollTop||0;
 document.querySelectorAll('[data-details]').forEach(node=>state.details.set(node.dataset.details,node.open));
 flowObserver?.disconnect();
 morph(document.querySelector('#app'),header()+`<main class="main ${state.page==='config'?'config-page':state.page==='preview'?'preview-main':'project-main'}">${state.page==='config'?configPage():state.page==='preview'?graph():projectPage()}</main>`);
 bind();setConfigBusy(configBusy);
 if(state.page==='config'&&state.configMode==='env')envEditor.bind();
 document.querySelectorAll('[data-details]').forEach(node=>{if(state.details.has(node.dataset.details))node.open=state.details.get(node.dataset.details);});
 // A run that newly stops opens its notice once; closing it afterwards sticks.
 const stopped=data.status==='failed'||data.status==='interrupted';
 if(stopped&&state.noticeStatus!==data.status){const notice=document.querySelector('[data-details="run-notice"]');if(notice){notice.open=true;state.details.set('run-notice',true);}}
 state.noticeStatus=data.status;
 saveView();
 if(focusId&&focused&&!focused.isConnected){const replacement=document.getElementById(focusId);replacement?.focus({preventScroll:true});if(selection&&replacement?.tagName==='INPUT')replacement.setSelectionRange(...selection);}
 const output=document.querySelector('.output-scroll');if(output)output.scrollTop=outputScroll;
 if(state.page==='preview'&&state.name) {
  connectFlow();
  const viewport=document.querySelector('.flow-scroll');viewport.scrollLeft=state.canvasLeft;
  const [min,max]=laneRange();viewport.scrollTop=laneAnimation?viewport.scrollTop:Math.min(max,Math.max(min,min+state.canvasTop));
  document.querySelectorAll('[data-tree-scroll]').forEach(node=>{node.scrollTop=treeScroll[node.dataset.treeScroll]||0;});
  flowObserver=new ResizeObserver(connectFlow);flowObserver.observe(document.querySelector('.flow-world'));flowObserver.observe(viewport);
 }
}
function showNew(single=false, existing=false) {
 const dialog=document.querySelector('#new-task'); state.uploaded=null;
 dialog.innerHTML=`<div class="modal-heading"><div><span class="eyebrow">${existing?'CONTINUE CREATION':'NEW CREATION'}</span><h2>${existing?'继续 '+esc(state.name):'开始一次新的制作'}</h2><p>${existing?'沿用已有产物、完成标记与绘制 thread。':'提供一张角色图，制作分层素材。'}</p></div><button class="icon-button" data-close>${icon('close')}</button></div><form id="new-task-form"><div class="new-task-columns"><div>${!existing?`<label class="field-label">输入参考图</label><label class="upload-zone" id="upload-zone"><input id="image-input" type="file" accept="image/png,image/jpeg,image/webp" hidden><span class="upload-icon">${icon('upload')}</span><b>选择或拖入角色图片</b><p>PNG、JPG、WebP · 最大 20 MB</p></label><label class="field-label">或填写服务器上的图片路径</label><input name="image" placeholder="绝对路径；相对路径基于任务目录">`:data.original?`<img class="resume-reference" src="${artifact(data.original)}" alt="已保存的原图">`:'<p>从该任务已有的上游产物继续。</p>'}<div class="input-note">${icon('folder')}${esc(state.directory)}</div></div><div class="task-form-fields"><label class="field-label" for="task-display-name">显示名称</label><input id="task-display-name" name="displayName" value="${existing?esc(data.displayName||state.name):''}" placeholder="可使用中文"><label class="field-label" for="task-name">任务目录名</label><input id="task-name" name="name" value="${existing?esc(state.name):''}" ${existing?'readonly':''} placeholder="例如 character-03" required><label class="field-label">执行范围</label><div class="scope-options"><label class="${!single?'selected':''}"><input type="radio" name="scope" value="all" ${!single?'checked':''}>整条流程<span>六条管线依次执行</span></label><label class="${single?'selected':''}"><input type="radio" name="scope" value="single" ${single?'checked':''}>单条管线<span>读取本任务已有上游产物</span></label></div><select name="stage" id="new-stage" ${!single?'hidden':''}>${stages.map((s,i)=>`<option value="${i}" ${i===state.stage?'selected':''}>${s.name} · ${s.id}</option>`).join('')}</select><label class="standard-option"><div><b>标准化人物姿态</b><p>先判断是否需要调整，再按需生图。</p></div><input type="checkbox" name="standard" ${existing&&data.run?.standard?'checked':''} role="switch" aria-label="标准化人物姿态"></label><div class="standard-detail">嘴部张大、眼睛张开，正视站立，双手放在身体两侧。仅人物准备阶段使用。</div><label class="field-label">阴影方式</label><select name="shadowMode"><option value="mask" ${!existing||data.run?.shadowMode!=='normal-depth'?'selected':''}>Live2D 蒙版</option><option value="normal-depth" ${existing&&data.run?.shadowMode==='normal-depth'?'selected':''}>法线＋深度</option></select><label class="field-label">Krita 可执行文件</label><input name="krita" value="${existing?esc(data.run?.krita||''):''}" placeholder="例如 /usr/bin/krita；已记录时可留空"><small>绘制与组装管线需要 Krita。未安装时，请先由 agent 协助安装桌面版或配置无桌面显示环境。</small><label class="field-label">调度并发 jobs</label><input name="jobs" type="number" min="1" value="${existing?data.run?.jobs||3:3}"></div></div><p class="form-error" role="alert"></p><div class="modal-footer"><span>操作由服务器执行，关闭网页仍会继续。</span><button type="button" class="button" data-close>取消</button><button class="primary" type="submit">${icon('play')}${existing?'继续':'开始制作'}</button></div></form>`;
 dialog.showModal();dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
 if(!existing) {
  let previewURL;
  const upload=file=>{if(!file?.type.startsWith('image/'))return toast('请选择图片文件');if(file.size>20*1024*1024)return toast('图片最大 20 MB');state.uploaded=file; if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(file);const zone=dialog.querySelector('#upload-zone');zone.classList.add('has-image');zone.style.backgroundImage=`url("${previewURL}")`;zone.querySelector('b').textContent=file.name;};
  dialog.querySelector('#image-input').onchange=e=>upload(e.target.files[0]);const zone=dialog.querySelector('#upload-zone');zone.ondragover=e=>e.preventDefault();zone.ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files[0]);};
  dialog.addEventListener('close',()=>{if(previewURL)URL.revokeObjectURL(previewURL);},{once:true});
 }
 const updateScope=()=>{
  const form=dialog.querySelector('form'),single=form.elements.scope.value==='single';
  form.elements.stage.hidden=!single;
  form.elements.standard.disabled=single&&Number(form.elements.stage.value)!==0;
  form.elements.shadowMode.disabled=single&&stages[Number(form.elements.stage.value)].id!=='shadow';
  dialog.querySelectorAll('.scope-options label').forEach(l=>l.classList.toggle('selected',l.querySelector('input').checked));
 };
 dialog.querySelectorAll('[name=scope],[name=stage]').forEach(r=>r.onchange=updateScope); updateScope();
 let created=existing;
 dialog.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const form=e.target,fields=new FormData(form),button=form.querySelector('[type=submit]');button.disabled=true;form.querySelector('.form-error').textContent='';
  try {
   const single=fields.get('scope')==='single',index=Number(fields.get('stage'));
   const payload={name:fields.get('name').trim(),displayName:fields.get('displayName').trim(),krita:fields.get('krita'),jobs:Number(fields.get('jobs')),from:single?stages[index].id:stages[0].id,to:single?stages[index].id:stages.at(-1).id};
   if(!single||index===0)payload.standard=fields.get('standard')==='on';
   if(!single||stages[index].id==='shadow')payload.shadowMode=fields.get('shadowMode');
   if(!created) {
    payload.image=fields.get('image');
    if(state.uploaded)payload.upload=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(state.uploaded);});
    await post('tasks',payload);created=true;form.elements.name.readOnly=true;delete payload.upload;delete payload.image;
   }
   if(existing)await post('project-name',{name:payload.name,displayName:payload.displayName});
   state.name=payload.name;button.textContent='正在启动…';await post('start',payload);dialog.close();await refreshTask(true);toast('任务已在后台启动');
  } catch(error){form.querySelector('.form-error').textContent=error.message;if(error.krita)form.elements.krita.focus();if(created){button.textContent='重新启动';await refreshTask(true);}}
  finally{button.disabled=false;}
 };
}
function showDirectory() {
 const dialog=document.querySelector('#directory-dialog');dialog.innerHTML=`<div class="modal-heading"><div><h2>追踪运行目录</h2><p>自动发现该目录下的任务，选择保存在服务器。</p></div><button class="icon-button" data-close>${icon('close')}</button></div><form><label class="field-label">目录绝对路径</label><input name="directory" value="${esc(state.directory)}" required><p class="dialog-note">仓库默认：&lt;仓库&gt;/.run<br>独立安装 skill：&lt;skill 上一级&gt;/.run<br>切换目录不会停止已运行的任务。</p><p class="form-error"></p><div class="modal-footer"><button class="primary">保存目录</button></div></form>`;
 dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();try{await post('settings',{directory:new FormData(e.target).get('directory').trim()});dialog.close();await refreshTask(true);}catch(error){dialog.querySelector('.form-error').textContent=error.message;}};
}
function showFiles() {
 const dialog=document.querySelector('#directory-dialog');dialog.innerHTML=`<div class="modal-heading"><div><h2>${esc(state.name)} · 全部产物</h2><p>按任务实际目录浏览、预览或下载。</p></div><button class="icon-button" data-close>${icon('close')}</button></div><input id="file-filter" placeholder="筛选路径" aria-label="筛选产物"><div class="all-files"></div>`;
 const listing=filter=>{
  const matched=data.files.filter(path=>path.toLowerCase().includes(filter.toLowerCase()));
  const listing=processFileList(matched,[''],data.fileVersions);
  const shown=listing.folders.flatMap(folder=>folder.files);
  dialog.querySelector('.all-files').innerHTML=`<p>${matched.length} 个文件 · 显示 ${shown.length} 个</p>`+shown.map(path=>`<button data-open-file="${esc(path)}">${icon(path.endsWith('.kra')?'layers':'file')}<span>${esc(path)}</span></button>`).join('');
  dialog.querySelectorAll('[data-open-file]').forEach(button=>button.onclick=()=>{const path=button.dataset.openFile,index=Math.max(0,stages.findIndex(stage=>path.startsWith(stage.id+'/')));dialog.close();if(path.endsWith('.kra'))window.open(artifact(path),'_blank','noopener');else openAsset({path,label:path.split('/').at(-1),kind:/\.(png|jpe?g|webp|svg)$/i.test(path)?'image':'file'},index,'step01');});
 };
 dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('#file-filter').oninput=e=>listing(e.target.value);listing('');
}
function showHistory() {
 const dialog=document.querySelector('#directory-dialog');dialog.innerHTML=`<div class="modal-heading"><div><h2>提交历史</h2><p>选择一次提交，浏览当时的管线配置。</p></div><button class="icon-button" data-close>${icon('close')}</button></div><div class="commit-list">${(versions?.commits||[]).map((c,i)=>`<button data-commit="${c.sha}"><span class="commit-node">${icon('branch')}</span><div><b>${esc(c.title)}</b><small>${c.short}${i===0?' · 当前分支最新提交':''}</small></div>${icon('chevron')}</button>`).join('')}</div>`;dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelectorAll('[data-commit]').forEach(b=>b.onclick=async()=>{state.ref=b.dataset.commit;dialog.close();await loadConfig();render();});
}
function selectStage(index) {
 state.stage=index;state.selectedStep=index===0||index===2?'layers':'step01';
 state.asset=null;state.inspect=false;state.page='preview';state.autoHeight=true;
 // A lane stage brings its lane into focus; the merge stages keep the current one.
 if(laneOf(index)>=0){state.lane=laneOf(index);laneAnimation=null;}
 updateViewURL();render();
 focusPreviewStep();
}
function focusPreviewStep() {
 const viewport=document.querySelector('.flow-scroll'),node=document.querySelector(`[data-kra-preview="${state.stage}"]`)||document.querySelector(`[data-node="${state.stage}:${state.selectedStep}"]`);
 if(!viewport||!node)return;
 viewport.scrollLeft+=node.getBoundingClientRect().left-viewport.getBoundingClientRect().left-12;
 viewport.scrollTop=laneScrollTop();state.canvasLeft=viewport.scrollLeft;state.canvasTop=0;
}
function updateViewURL() {
 const url=new URL(location.href);
 url.searchParams.set('page',state.page);url.searchParams.set('stage',state.stage);
 if(state.name)url.searchParams.set('name',state.name);
 history.replaceState(null,'',url);
}
const wheelBound=new WeakSet();
// The inner list that scrolls vertically under `target`, if any: it keeps its own vertical gestures.
function innerScroller(target,viewport) {
 for(let node=target;node&&node!==viewport;node=node.parentElement)
  if(node.matches('.inline-tree-rows')||(node.scrollHeight>node.clientHeight+1&&/auto|scroll/.test(getComputedStyle(node).overflowY)))return node;
 return null;
}
function bind() {
 const select=document.querySelector('#task-select');if(select)select.onchange=async()=>{state.name=select.value;rememberTask(state.directory,state.name);state.inspect=false;state.asset=null;state.canvasLeft=0;state.canvasTop=0;const url=new URL(location.href);url.searchParams.set('name',state.name);history.replaceState(null,'',url);await refreshTask(true);};
 document.querySelectorAll('[data-step-toolbar]').forEach(b=>b.onclick=async()=>{
  const targets=stepTargets(),broken=brokenSteps(targets),action=b.dataset.stepToolbar;
  if(!targets.length){if(action==='continue')showNew(false,true);return;}
  if(action==='retry'&&!confirm(`重试：删除以下步骤的产物与会话并重新运行，依赖它们的后续步骤会随之重跑。\n${broken.map(stepLabel).join('\n')}\n确定吗？`))return;
  b.disabled=true;
  try{const result=await postWithKrita('task-action',{name:state.name,action});toast(result.message+' 已在后台重新运行。');await refreshTask(true);}
  catch(error){toast(error.message);b.disabled=false;}
 });
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=async()=>{state.page=b.dataset.page;updateViewURL();if(state.page==='config')await loadConfig();render();});
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>selectStage(Number(b.dataset.stage)));
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const [index,step]=b.dataset.step.split(':'),i=Number(index);const item=available(stepArtifacts[i][step])[0];if(item)openAsset(item,i,step);else{state.stage=i;state.selectedStep=step;state.asset=null;state.inspect=true;render();}});
 document.querySelectorAll('[data-asset]').forEach(b=>b.onclick=()=>openAsset(assetLookup.get(b.dataset.asset),Number(b.dataset.assetStage),b.dataset.assetStep));
 const toggle=(set,key)=>{set.has(key)?set.delete(key):set.add(key);render();};
 document.querySelectorAll('[data-pipeline-toggle]').forEach(b=>b.onclick=()=>toggle(state.collapsedPipelines,Number(b.dataset.pipelineToggle)));
 document.querySelectorAll('[data-section-toggle]').forEach(b=>b.onclick=()=>toggle(state.collapsedSteps,b.dataset.sectionToggle));
 document.querySelectorAll('[data-phase-toggle]').forEach(b=>b.onclick=()=>toggle(state.collapsedPhases,b.dataset.phaseToggle));
 const revealGroup=index=>{
  const viewport=document.querySelector('.flow-scroll'),node=document.querySelector(`[data-node="${index}:layers"]`);
  const bounds=node.getBoundingClientRect(),view=viewport.getBoundingClientRect();
  viewport.scrollLeft+=bounds.left-view.left-20;
  const [min,max]=laneRange();viewport.scrollTop=Math.min(max,Math.max(min,viewport.scrollTop+bounds.top-view.top-20));
 };
 document.querySelectorAll('[data-tree-group]').forEach(b=>b.onclick=()=>{const index=b.dataset.treeStage;groupViews[index].selected=b.dataset.treeGroup;state.inspect=false;render();revealGroup(index);});
 document.querySelectorAll('[data-group-toggle]').forEach(b=>b.onclick=()=>{const index=b.dataset.groupToggle;groupViews[index].open=!groupViews[index].open;render();if(groupViews[index].open)revealGroup(index);});
 document.querySelectorAll('[data-tree-expand]').forEach(b=>b.onclick=()=>{const view=groupViews[b.dataset.treeStage],id=b.dataset.treeExpand;view.expanded.has(id)?view.expanded.delete(id):view.expanded.add(id);render();});
 document.querySelectorAll('[data-expand-all]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.expandAll),view=groupViews[i];view.depth=-1;view.search='';view.expanded=new Set(flat(pipelineTree(i)).filter(node=>node.groups?.length).map(node=>node.id));render();});
 document.querySelectorAll('[data-tree-depth]').forEach(select=>select.onchange=()=>{groupViews[select.dataset.treeDepth].depth=Number(select.value);render();});
 document.querySelectorAll('[data-tree-search]').forEach(input=>input.oninput=()=>{const i=input.dataset.treeSearch,position=input.selectionStart;groupViews[i].search=input.value;render();const next=document.querySelector(`[data-tree-search="${i}"]`);next.focus({preventScroll:true});next.setSelectionRange(position,position);});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=> {
  const action=b.dataset.action;
  if(action==='new')showNew();
  else if(action==='run')showNew(false,true);
  else if(action==='files')showFiles();
  else if(action==='stop'){b.disabled=true;post('stop',{name:state.name}).then(result=>{toast(result.message);return refreshTask(true);}).catch(error=>{toast(error.message);b.disabled=false;});}
  else if(action==='directory')showDirectory();
  else if(action==='history')showHistory();
  else if(action==='close-inspector'){state.inspect=false;render();}
  else if(action==='zoom-in')zoomCanvas(state.zoom+.1);
  else if(action==='zoom-out')zoomCanvas(state.zoom-.1);
  else if(action==='zoom-reset')zoomCanvas(1);
  else if(action==='zoom-fit')zoomCanvas(1,true);
 });
 const compare=document.querySelector('#compare-reference');if(compare)compare.onchange=()=>{state.compare=compare.checked;render();};
 const viewport=document.querySelector('.flow-scroll');if(viewport){
  // Plain wheel browses sideways (the usual direction); Ctrl/⌘ + wheel moves between the lanes.
  // An inner list under the pointer keeps its own plain wheel. The viewport survives refreshes (dom-morph), so its listeners are added once.
  if(!wheelBound.has(viewport)){
   wheelBound.add(viewport);
   let wheelTotal=0,wheelAt=0,wheelRest=0;
   viewport.addEventListener('wheel',event=>{
    const delta=event.deltaY*(event.deltaMode===1?20:event.deltaMode===2?viewport.clientHeight:1);
    if(event.ctrlKey||event.metaKey){
     // Also keeps the browser from zooming the page.
     event.preventDefault();
     const dy=delta,[min,max]=laneRange();
     // A lane taller than the viewport scrolls through first, then hands over to the next lane.
     if(!laneAnimation&&(dy>0?viewport.scrollTop<max-1:viewport.scrollTop>min+1)){viewport.scrollTop=Math.min(max,Math.max(min,viewport.scrollTop+dy));wheelTotal=0;return;}
     const now=performance.now();
     if(now-wheelAt>250)wheelTotal=0;
     wheelAt=now;wheelTotal+=dy;
     // One switch per gesture: a trackpad keeps sending events after the slide starts.
     if(laneAnimation||now<wheelRest||Math.abs(wheelTotal)<40)return;
     wheelTotal=0;wheelRest=now+600;switchLane(state.lane+Math.sign(dy));
     return;
    }
    if(Math.abs(event.deltaX)>=Math.abs(event.deltaY)||innerScroller(event.target,viewport))return;
    if(viewport.scrollWidth<=viewport.clientWidth)return;
    event.preventDefault();viewport.scrollLeft+=delta;
   },{passive:false});
   viewport.addEventListener('keydown',event=>{
    if(event.target!==viewport)return;
    const step={ArrowUp:-1,PageUp:-1,ArrowDown:1,PageDown:1}[event.key];
    if(step&&laneCount()>1){event.preventDefault();switchLane(state.lane+step);}
   });
  }
  // Drags and swipes: sideways pans; up or down slides to the other lane once past the lane's own range.
  // Touch leaves sideways swipes to the browser (touch-action: pan-x) and vertical ones on inner lists to the list.
  let drag;
  viewport.onpointerdown=e=>{
   const touch=e.pointerType!=='mouse';
   if(e.button!==0||e.target.closest('button,a,input,select,summary,.inline-tree-rows')||touch&&innerScroller(e.target,viewport))return;
   drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,axis:null,touch,id:e.pointerId};
  };
  viewport.onpointermove=e=>{
   if(!drag||drag.id!==e.pointerId||drag.axis==='done')return;
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(!drag.axis){
    if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;
    drag.axis=Math.abs(dx)>=Math.abs(dy)?'x':'y';
    if(drag.axis==='x'&&drag.touch){drag=null;return;}
    viewport.setPointerCapture(e.pointerId);viewport.classList.add('panning');
   }
   if(drag.axis==='x'){viewport.scrollLeft=drag.left-dx;return;}
   const [min,max]=laneRange(),wanted=drag.top-dy;
   if(!laneAnimation)viewport.scrollTop=Math.min(max,Math.max(min,wanted));
   const over=wanted<min?wanted-min:wanted>max?wanted-max:0;
   if(Math.abs(over)>48&&laneCount()>1){const next=state.lane+Math.sign(over);if(next>=0&&next<laneCount()){drag.axis='done';switchLane(next);}}
  };
  const end=()=>{drag=null;viewport.classList.remove('panning');};viewport.onpointerup=end;viewport.onpointercancel=end;
 }
 document.querySelectorAll('[data-lane]').forEach(b=>b.onclick=()=>switchLane(Number(b.dataset.lane)));
 bindConfigTree();
 document.querySelectorAll('[data-config-mode]').forEach(b=>b.onclick=async()=>{state.configMode=b.dataset.configMode;await loadConfig();render();});
 const source=document.querySelector('#config-ref');if(source)source.onchange=async()=>{state.ref=source.value;state.base=undefined;await loadConfig();render();};
 const diff=document.querySelector('#config-diff');if(diff)diff.onchange=async()=>{state.diff=diff.checked;state.base=document.querySelector('#config-base').value;await refreshConfigFile();};
 const base=document.querySelector('#config-base');if(base)base.onchange=async()=>{state.base=base.value;if(state.diff){await refreshConfigFile();}};
 const filter=document.querySelector('#config-search');if(filter)filter.oninput=()=>{state.configFilter=filter.value;document.querySelector('.config-tree-scroll').innerHTML=configTree();bindConfigTree();};
}
await refreshTask(true);
if(state.page==='config')await loadConfig();
render();
if(state.page==='preview')focusPreviewStep();
setInterval(()=>refreshTask().catch(error=>toast('同步失败：'+error.message)),4000);
if(new URLSearchParams(location.search).get('dialog')==='new')showNew();

import { groupPhases, pipelineSteps, groupLayers } from './progress.js';

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
const data = await get('/api/demo');
const state = {
 layout:new URLSearchParams(location.search).get('layout')||'workbench', page:new URLSearchParams(location.search).get('page')||'project',
 stage:3, group:'outer_robe/left_sleeve/front_sleeve_wall', expanded:new Set(['outer_robe','outer_robe/left_sleeve']),
 showSteps:true, selectedStep:'step02', depth:0,
 openSteps:new Set(['0:layers','1:step02','2:layers','3:step02']),
 preview:'composition', directory:localStorage.getItem('astra-demo-directory')||data.directory,
 ref:'worktree', file:'shared/tools/update_occlusion/description.md', diff:false, configFilter:'', uploaded:null,
};
const stages = [
 {name:'人物分块',id:'part-layering',short:'CHARACTER PART',result:'88 个部件',status:'done',image:'/images/character-parts.svg', file:'part-layering/preview.svg'},
 {name:'人物绘制',id:'raster-layering',short:'CHARACTER RASTER',result:'素体 KRA 已交付',status:'done',image:'/images/body.png',file:'raster-layering/step03/character-dressup-base.kra'},
 {name:'衣服分块',id:'clothing-part-layering',short:'CLOTHING PART',result:'67 个部件',status:'done',image:'/images/clothing-parts.svg',file:'clothing-part-layering/preview.svg'},
 {name:'衣服绘制',id:'clothing-raster-layering',short:'CLOTHING RASTER',result:'边缘柔化 · 反馈修复',status:'running',image:'/images/clothing.png',file:'clothing-raster-layering/step02/clothing-soft-edges.kra'},
 {name:'穿戴组装',id:'character-assembly',short:'ASSEMBLY',result:'等待衣服绘制',status:'pending',image:'/images/assembled.png',file:'character-assembly/step01/character-assembled.kra'},
];
const requestedStage = Number(new URLSearchParams(location.search).get('stage') ?? 3);
if (Number.isInteger(requestedStage) && requestedStage >= 0 && requestedStage < stages.length) {
 state.stage = requestedStage;
 state.selectedStep = requestedStage === 0 || requestedStage === 2 ? 'layers' : requestedStage === 4 ? 'step01' : 'step02';
}
const artifact = path => '/artifact/'+path.split('/').map(encodeURIComponent).join('/');
const sourceTree = () => state.stage<2?data.character.groups:data.clothing.groups;
function flat(nodes) { return nodes.flatMap(node=>[node,...flat(node.groups||[])]); }
function chosenGroup() { return flat(sourceTree()).find(node=>node.id===state.group)||sourceTree()[0]; }
function treePipeline() { return state.stage<2?'part-layering':'clothing-part-layering'; }
function groupFile() { return `${treePipeline()}/parts/${chosenGroup().id}.svg`; }
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('visible'),4000); }
function pill(status) { return `<span class="pill ${status}">${status==='done'?icon('check'):status==='running'?'<span class="live-dot"></span>':icon('clock')}${{done:'已完成',running:'制作中',pending:'待执行'}[status]}</span>`; }
function header() {
 return `<header class="app-header"><a class="brand" href="/"><span class="brand-mark">${icon('layers')}</span><span>Astra<span class="brand-light">Layering</span><small>CHARACTER CREATION STUDIO</small></span></a>
 <nav class="global-tabs"><button data-page="project" class="${state.page==='project'?'active':''}">${icon('grid')}制作工作台</button><button data-page="config" class="${state.page==='config'?'active':''}">${icon('code')}管线配置</button></nav>
 <span class="demo-badge">交互原型 <i></i> 真实产物 / 示例进度</span><div class="layout-switch"><button data-layout="workbench" class="${state.layout==='workbench'?'active':''}">A 工作台</button><button data-layout="graph" class="${state.layout==='graph'?'active':''}">B 流程画布</button></div></header>`;
}
function sidebar() {
 return `<aside class="sidebar"><div class="sidebar-caption">工作空间 <span>LOCAL</span></div><button class="directory-card" data-action="directory">${icon('folder')}<span><b>.run</b><small>持久追踪的任务目录</small></span>${icon('down')}</button>
 <button class="primary new-button" data-action="new">${icon('plus')}新建任务</button><div class="sidebar-section">任务 <span>3 个示例</span></div>
 <button class="task-item active" data-task="jianma"><img src="/images/reference.png" alt="jianma"><span><b>jianma</b><small><i class="live-dot"></i>衣服绘制中</small></span><span class="task-dot"></span></button>
 <button class="task-item" data-task="new"><span class="empty-thumb">${icon('image')}</span><span><b>character-02</b><small>等待导入参考图</small></span></button>
 <button class="task-item" data-task="new"><span class="empty-thumb">${icon('image')}</span><span><b>pose-study</b><small>尚未开始</small></span></button>
 <div class="sidebar-help"><span class="tiny-mark">${icon('layers')}</span><b>文件就是进度</b><p>按任务与管线组织产物，<br>随时查看、继续制作。</p><span class="text-link" data-action="files">了解目录结构 ${icon('arrow')}</span></div>
 <div class="sidebar-bottom"><button data-action="settings">${icon('settings')}运行设置</button><div class="connection"><i></i>本地工作空间<span>●</span></div></div></aside>`;
}
function pageHeading() {
 return `<div class="page-heading"><div><div class="breadcrumb">工作空间 ${icon('chevron')} <span>jianma</span></div><h1>jianma <span class="subtitle-tag">角色制作</span></h1><p>将一张角色参考，制作成可编辑的完整分层。</p></div><div class="heading-actions"><div class="progress-caption"><b>3<span>/ 5</span></b><small>管线已完成</small></div><button class="button" data-action="logs">${icon('file')}查看日志</button><button class="primary" data-action="run">${icon('play')}运行流程</button></div></div>`;
}
function stageStrip() {
 return `<section class="stage-strip" aria-label="五条管线进度">${stages.map((stage,i)=>`<button data-stage="${i}" class="stage-card ${stage.status} ${state.stage===i?'selected':''}"><div class="stage-card-top"><span class="stage-index">${stage.status==='done'?icon('check'):String(i+1).padStart(2,'0')}</span><span class="stage-state">${stage.status==='running'?'当前阶段':stage.status==='done'?'已完成':'待执行'}</span>${i<4?icon('chevron','next-stage'):''}</div><h3>${stage.name}</h3><p>${stage.result}</p>${state.stage===i?'<span class="selected-line"></span>':''}</button>`).join('')}</section>`;
}
function treeRows(nodes, depth=0) {
 return nodes.map(node=> {
  const group=(node.groups||[]).length>0, expanded=state.expanded.has(node.id);
  const label=node.id.split('/').at(-1);
  return `<div class="tree-row ${state.group===node.id?'selected':''}" style="--depth:${depth}" title="${esc(node.id)}"><button class="tree-toggle ${group?'':'leaf'}" data-expand="${esc(node.id)}" aria-label="展开 ${esc(label)}">${group?icon(expanded?'down':'chevron'):''}</button><button class="tree-label" data-group="${esc(node.id)}">${icon(group?'folder':'layers')}<span>${esc(label)}</span><small>${group?node.groups.length:'part'}</small></button></div>${group&&expanded?treeRows(node.groups,depth+1):''}`;
 }).join('');
}
function artifactTree() {
 return `<section class="artifact-tree"><div class="pane-title"><h3>${icon('branch')}部件结构</h3><button class="icon-button" data-action="expand-tree" title="展开全部">${icon('expand')}</button></div><div class="tree-source">${treePipeline()==='part-layering'?'人物':'衣服'}分块 <span>groups.json</span></div><div class="tree-search">${icon('search')}<input id="tree-search" placeholder="查找 group / part" aria-label="搜索部件"></div><div class="tree-scroll" id="tree-rows">${treeRows(sourceTree())}</div><div class="tree-footer"><span>${flat(sourceTree()).filter(g=>g.kind==='part').length} parts</span><span>${flat(sourceTree()).filter(g=>g.kind!=='part').length} groups</span><span class="real-badge">真实结构</span></div></section>`;
}
function previewPane() {
 const stage=stages[state.stage];
 const part=state.preview==='part';
 return `<section class="preview-pane"><div class="preview-toolbar"><div class="tabs"><button data-preview="composition" class="${!part?'active':''}">阶段合成</button><button data-preview="part" class="${part?'active':''}">选中部件</button></div><div class="preview-tools"><span>${icon('eye')}归档产物</span><button class="icon-button" data-action="zoom" title="打开原尺寸">${icon('expand')}</button></div></div>
 <div class="canvas-heading"><span>${part?esc(chosenGroup().id):'输入参考 / '+stage.name+'结果'}</span><span>1024 × 1536</span></div>
 <div class="comparison-canvas ${part?'part-view':''}">${part?`<div class="single-art"><img src="${artifact(groupFile())}" alt="${esc(chosenGroup().id)} 的实际 SVG"></div><span class="canvas-chip">SVG 原始画布 · 未裁切</span>`:`<div class="image-column"><span class="canvas-label">${icon('image')}简化角色参考</span><img src="/images/reference.png" alt="简化角色参考"><span class="image-caption">simplified-subject.png</span></div><div class="image-column current-image"><span class="canvas-label result">${icon('layers')}当前阶段产物</span><img src="${stage.image}" alt="${stage.name}实际产物"><span class="image-caption">${(state.stage===3?'composite.png':stage.file.split('/').at(-1).replace('.kra','.png'))}</span></div>`}</div>
 <div class="canvas-footer"><span><span class="checker-swatch"></span>透明背景</span><span>适合画布 <b>−</b><span>100%</span><b>＋</b></span></div>
 <div class="artifact-tray"><div class="tray-heading"><b>阶段文件</b><small>来自 jianma 归档</small></div><div class="file-cards"><a href="${artifact(stage.file)}" target="_blank"><span class="file-icon">${icon(stage.file.endsWith('.kra')?'layers':'code')}</span><span><b>${stage.file.split('/').at(-1)}</b><small>${stage.file.endsWith('.kra')?'Krita 分层工程':'分块合成预览'}</small></span>${icon('arrow')}</a><a href="${artifact(treePipeline()+'/groups.json')}" target="_blank"><span class="file-icon json">{ }</span><span><b>groups.json</b><small>完整 group / part 层级</small></span>${icon('arrow')}</a></div></div></section>`;
}
const statusNames = { done:'已完成', running:'进行中', pending:'待执行' };
function statusMark(status) {
 return `<span class="phase-mark ${status}" title="${statusNames[status]}" aria-label="${statusNames[status]}">${status==='done'?icon('check'):status==='running'?'<i></i>':icon('clock')}</span>`;
}
function stepRows(stageIndex, nodes=pipelineSteps[stageIndex], nested=false) {
 return nodes.map(step=> {
  const key=stageIndex+':'+step.id, open=state.openSteps.has(key);
  return `<div class="phase-item ${nested?'nested':''}"><div class="phase-row ${step.status} ${state.stage===stageIndex&&state.selectedStep===step.id?'selected':''}">
   <button class="phase-select" data-step="${stageIndex}:${step.id}">${statusMark(step.status)}<span>${esc(step.title)}</span>${step.id.startsWith('step')?`<small>${esc(step.id)}</small>`:''}</button>
   ${step.children.length?`<button class="phase-toggle" data-step-toggle="${key}" aria-label="${open?'收起':'展开'}${esc(step.title)}" aria-expanded="${open}">${icon(open?'down':'chevron')}</button>`:''}</div>
   ${open&&step.children.length?`<div class="phase-children">${stepRows(stageIndex,step.children,true)}</div>`:''}</div>`;
 }).join('');
}
function selectedStep() {
 const all=nodes=>nodes.flatMap(node=>[node,...all(node.children)]);
 return all(pipelineSteps[state.stage]).find(step=>step.id===state.selectedStep)||pipelineSteps[state.stage][0];
}
function pipelineDetail() {
 const stage=stages[state.stage], selected=selectedStep(), part=state.stage===0||state.stage===2;
 const showLayers=part&&(selected.id==='layers'||groupPhases.some(([id])=>id===selected.id));
 const layers=part?groupLayers(sourceTree()):[];
 const depth=Math.min(state.depth,Math.max(0,layers.length-1));
 const layer=layers[depth]||[];
 return `<section class="pipeline-detail" aria-label="${stage.name}子步骤进度"><header class="detail-heading"><div>${icon('branch')}<h2>${stage.name}<span>/</span>${esc(selected.title)}</h2><span class="small-tag">示例进度</span></div><button class="button" data-action="single">${icon('play')}运行 / 恢复此管线</button></header>
 ${showLayers?`<div class="layer-context"><p>本层轮廓复核齐备后去重，再补全、检查和拆分直属结构；整层完成后进入下一层。</p><small>这里的层数表示拆分树深度，不是遮挡高度。分组来自真实归档，执行状态为示例。</small></div>
 <div class="depth-tabs" role="group" aria-label="拆分层数">${layers.map((nodes,i)=>`<button data-depth="${i}" class="${depth===i?'active':''}">第 ${i+1} 层<span>${nodes.length} 个节点</span></button>`).join('')}</div>
 <div class="layer-table-scroll"><table class="layer-table"><thead><tr><th>本层 group / part</th>${groupPhases.map(([id,label])=>`<th class="${selected.id===id?'selected':''}">${label}</th>`).join('')}<th>产物</th></tr></thead><tbody>${layer.map(node=>`<tr><td><button data-progress-group="${esc(node.id)}">${icon(node.groups?.length?'folder':'layers')}<span><b>${esc(node.id.split('/').at(-1))}</b><small>${esc(node.id)}</small></span><em>${node.groups?.length?'group':'part'}</em></button></td>${groupPhases.map(([id])=>`<td class="${selected.id===id?'selected':''}">${id==='children'&&!node.groups?.length?'<span class="terminal-part" title="终止 part 不再拆分子组">终止 part</span>':statusMark('done')}</td>`).join('')}<td><a href="${artifact(treePipeline()+'/parts/'+node.id+'.svg')}" target="_blank">SVG ${icon('arrow')}</a></td></tr>`).join('')}</tbody></table></div>
 <footer class="detail-footnote">${icon('info')}按层聚合展示进度，也可以点进具体部件查看产物。归档未保留逐步执行记录，此处没有推断历史耗时或完成比例。</footer>`:
 `<div class="step-detail-body"><div class="step-detail-flow">${stepRows(state.stage)}</div><div class="step-explanation"><span class="eyebrow">${statusNames[selected.status]} · 示例</span><h3>${esc(selected.title)}</h3><p>${esc(selected.note||pipelineSteps[state.stage].find(step=>step.children.some(child=>child.id===selected.id))?.note||'此处展示管线内部进度。启动与恢复仍通过整条管线入口，由原调度器决定从哪里继续。')}</p>${!part&&state.stage!==4?'<div class="review-rule">step02 包含绘制、review 与修复。已完成绘制不等于整个 step02 完成。</div>':''}<a class="text-link" href="${artifact(stage.file)}" target="_blank">查看已归档的阶段产物 ${icon('arrow')}</a></div></div>`}</section>`;
}
function inspector() {
 const g=chosenGroup();
 return `<aside class="inspector"><div class="pane-title"><h3>选中部件</h3><span class="small-tag">${g.kind==='part'?'PART':'GROUP'}</span></div><div class="selected-part"><div class="selected-thumb"><img src="${artifact(groupFile())}" alt="选中 SVG"></div><b>${esc(g.id.split('/').at(-1))}</b><code>${esc(g.id)}</code><p>${esc((g.note||'').slice(0,130))}${g.note?.length>130?'…':''}</p><a class="text-link" href="${artifact(groupFile())}" target="_blank">打开部件 SVG ${icon('arrow')}</a></div>
 <div class="inspector-divider"></div><div class="pane-title"><h3>管线子步骤</h3><span class="small-tag">示例进度</span></div><div class="inspector-progress">${stepRows(state.stage)}</div><button class="button full" data-action="step-details">${icon('branch')}查看子步骤明细</button><button class="button full" data-action="single">${icon('play')}仅运行此管线</button>
 </aside>`;
}
function workbench() {
 return `${pageHeading()}${stageStrip()}<div class="section-bar"><div><span class="section-active">${icon('layers')}产物浏览</span><span class="section-secondary">${icon('clock')}执行记录</span></div><span>结构与图片均来自真实 jianma 文件</span></div><div class="workbench-panels">${artifactTree()}${previewPane()}${inspector()}</div><div class="activity-footer"><span class="live-dot"></span><b>子步骤进度</b><span>启动与恢复仍以管线为单位；内部步骤可展开查看。</span><button data-action="step-details">展开明细 ${icon('arrow')}</button></div>${pipelineDetail()}`;
}
function graphCard(i, cls) {
 const s=stages[i];
 return `<article class="graph-node ${s.status} ${cls} ${state.stage===i?'selected':''}" data-stage="${i}" style="--pipeline-index:${i}"><span class="port in"></span><span class="port out"></span><div class="node-heading"><span class="node-number">0${i+1}</span><div><h3>${s.name}</h3><small>${s.short}</small></div>${s.status==='done'?icon('check','node-check'):s.status==='running'?'<span class="live-dot"></span>':icon('lock','node-lock')}</div><div class="node-art checker"><img src="${s.image}" alt="${s.name}阶段产物"></div><div class="node-meta"><span>${s.status==='pending'?'已归档示例':s.result}</span><small>${s.status==='running'?'STEP 02':''}</small></div>${state.showSteps?`<div class="node-phases">${stepRows(i)}</div>`:''}<div class="node-footer"><span class="${s.status}">${s.status==='done'?'● 已完成':s.status==='running'?'● 正在修复':'○ 等待上游'}</span><button data-open-stage="${i}">${s.status==='pending'?'查看示例':'查看产物'} ${icon('arrow')}</button></div></article>`;
}
function expandedGraph() {
 return `${pageHeading()}<div class="graph-toolbar"><div><b>${icon('branch')}管线与内部步骤</b><span class="small-tag">启动 / 恢复以管线为单位</span></div><div><div class="graph-legend"><span><i class="green"></i>已完成</span><span><i class="purple"></i>进行中</span><span><i></i>等待</span></div><button class="button graph-disclosure" data-action="toggle-steps" aria-expanded="true">${icon('layers')}收起子步骤</button></div></div>
 <div class="graph-canvas expanded-graph"><div class="graph-world"><svg class="connectors" viewBox="0 0 1360 738" preserveAspectRatio="none"><defs><marker id="detail-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="m0 0 6 3-6 3" fill="none" stroke="#719f98"/></marker></defs>
 <path class="done" marker-end="url(#detail-arrow)" d="M52 91 V106 H8 V202 H20"/>
 <path class="done" marker-end="url(#detail-arrow)" d="M266 330 H284"/>
 <path class="done" marker-end="url(#detail-arrow)" d="M144 164 V129 H672 V162"/>
 <path class="done" marker-end="url(#detail-arrow)" d="M794 330 H812"/>
 <path class="active" marker-end="url(#detail-arrow)" d="M1058 330 H1076"/>
 <path class="waiting" marker-end="url(#detail-arrow)" d="M408 674 V709 H1200 V676"/>
 <text x="371" y="118">简化穿衣角色参考</text><text x="736" y="701">人物素体 KRA → 穿戴组装</text>
 </svg><div class="expanded-input">${icon('image')}<div><b>输入角色图</b><small>original → standard</small></div><img src="/images/original.jpg" alt="原始角色参考"></div>
 <div class="expanded-graph-hint">${icon('info')}展开节点看子步骤；点击步骤查看下方明细。</div>
 ${stages.map((_,i)=>graphCard(i,['character-part','character-raster','clothing-part','clothing-raster','assembly'][i])).join('')}</div></div>${pipelineDetail()}`;
}
function graph() {
 if(state.showSteps)return expandedGraph();
 return `${pageHeading()}<div class="graph-toolbar"><div><b>${icon('branch')}管线与产物依赖</b><span class="small-tag">整体顺序执行</span></div><div class="graph-legend"><span><i class="green"></i>已完成</span><span><i class="purple"></i>进行中</span><span><i></i>等待</span></div></div>
 <button class="button graph-disclosure compact-disclosure" data-action="toggle-steps" aria-expanded="false">${icon('layers')}展开子步骤</button><div class="graph-canvas"><div class="graph-world"><svg class="connectors" viewBox="0 0 1360 704" preserveAspectRatio="none"><defs><marker id="arrow-green" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="m0 0 7 3.5L0 7" fill="#59b6a7"/></marker></defs>
 <path class="done" d="M187 220 V306"/><path class="done" d="M309 430 H346 V185 Q346 174 357 174 H411"/><path class="done" d="M309 430 H411"/><path class="done" d="M655 430 H717"/><path class="waiting" d="M655 174 H976 Q999 174 999 197 V287 H1048"/><path class="active" d="M961 430 H1016 Q1029 430 1029 417 V356 H1048"/>
 <text x="349" y="278">素体参考</text><text x="329" y="452">衣装参考</text><text x="686" y="413">parts</text><text x="823" y="162">人物 KRA</text><text x="991" y="478">衣服 KRA</text></svg>
 <div class="reference-node"><div><span class="input-tag">INPUT</span><h3>角色参考</h3><p>一张图，开始制作。</p><span>${icon('image')}original.jpg</span></div><img src="/images/original.jpg" alt="角色原始参考"></div>
 ${graphCard(0,'character-part')}${graphCard(1,'character-raster')}${graphCard(2,'clothing-part')}${graphCard(3,'clothing-raster')}${graphCard(4,'assembly')}
 <div class="lane-label human">CHARACTER <span>人物</span></div><div class="lane-label garment">CLOTHING <span>衣服</span></div><div class="graph-note">${icon('info')}连线展示输入依赖；任务仍按五条管线顺序推进。</div><div class="graph-zoom"><button data-action="zoom">−</button><span>100%</span><button data-action="zoom">＋</button>${icon('expand')}</div></div></div>
 <div class="graph-bottom"><div class="mini-tree-title">${icon('branch')}衣服结构<span>67 parts · 26 groups</span></div><div class="mini-tree-path"><span>${icon('folder')}outer_robe</span>${icon('chevron')}<span>${icon('folder')}left_sleeve</span>${icon('chevron')}<span class="active">${icon('layers')}front_sleeve_wall</span></div><button class="button" data-action="show-tree">浏览完整部件树 ${icon('arrow')}</button></div>`;
}
let versions, configFiles=[], configText='', schemaText='', diffText='';
async function loadConfig() {
 try {
  versions=await get('/api/config/versions?ref='+encodeURIComponent(state.ref));
  const snapshot=await get('/api/config/files?ref='+encodeURIComponent(state.ref)); configFiles=snapshot.paths;
  if(!configFiles.includes(state.file)) state.file=configFiles[0]||'';
  await loadConfigFile();
 } catch(error) { toast(error.message); }
}
async function loadConfigFile() {
 if(!state.file) {configText='这个版本没有可浏览的管线配置。';schemaText='';return;}
 const q=`?ref=${encodeURIComponent(state.ref)}&path=${encodeURIComponent(state.file)}`;
 configText=(await get('/api/config/content'+q)).text; schemaText=''; diffText='';
 const sibling=state.file.replace(/description\.md$/,'schema.json');
 if(sibling!==state.file&&configFiles.includes(sibling)) schemaText=(await get('/api/config/content'+`?ref=${encodeURIComponent(state.ref)}&path=${encodeURIComponent(sibling)}`)).text;
 if(state.diff) diffText=(await get('/api/config/diff'+q+'&base='+encodeURIComponent(state.base||'HEAD~2'))).text;
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
 document.body.classList.toggle('dark',state.layout==='graph'&&state.page==='project');
 document.querySelector('#app').innerHTML=header()+sidebar()+`<main class="main ${state.page==='config'?'config-page':''}">${state.page==='config'?configPage():state.layout==='graph'?graph():workbench()}</main>`;
 bind();
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
 if(state.stage===index)return;
 state.stage=index; state.depth=0;
 state.selectedStep=index===0||index===2?'layers':index===4?'step01':'step02';
 state.group=sourceTree()[0].id;state.expanded=new Set([state.group]);
}
function bind() {
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=async()=>{state.page=b.dataset.page;if(state.page==='config')await loadConfig();render();});
 document.querySelectorAll('[data-layout]').forEach(b=>b.onclick=()=>{state.layout=b.dataset.layout;state.page='project';render();});
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{selectStage(Number(b.dataset.stage));render();});
 document.querySelectorAll('[data-open-stage]').forEach(b=>b.onclick=e=>{e.stopPropagation();selectStage(Number(b.dataset.openStage));state.layout='workbench';render();});
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=e=>{e.stopPropagation();const [stage,step]=b.dataset.step.split(':');selectStage(Number(stage));state.selectedStep=step;render();});
 document.querySelectorAll('[data-step-toggle]').forEach(b=>b.onclick=e=>{e.stopPropagation();const key=b.dataset.stepToggle;state.openSteps.has(key)?state.openSteps.delete(key):state.openSteps.add(key);render();});
 document.querySelectorAll('[data-depth]').forEach(b=>b.onclick=()=>{state.depth=Number(b.dataset.depth);render();});
 document.querySelectorAll('[data-progress-group]').forEach(b=>b.onclick=()=>{state.group=b.dataset.progressGroup;state.expanded=new Set(state.group.split('/').map((_,i)=>state.group.split('/').slice(0,i+1).join('/')));state.preview='part';state.layout='workbench';render();window.scrollTo({top:0,behavior:'smooth'});});
 document.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{state.preview=b.dataset.preview;render();});
 document.querySelectorAll('[data-expand]').forEach(b=>b.onclick=()=>{const id=b.dataset.expand;state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);render();});
 document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{state.group=b.dataset.group;state.preview='part';render();});
 document.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>b.dataset.task==='new'?showNew():toast('当前展示 jianma 的真实归档产物。'));
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=> {
  const action=b.dataset.action;
  if(action==='new'||action==='run')showNew();
  else if(action==='single')showNew(true);
  else if(action==='toggle-steps'){state.showSteps=!state.showSteps;render();}
  else if(action==='step-details'){document.querySelector('.pipeline-detail')?.scrollIntoView({behavior:'smooth',block:'start'});}
  else if(action==='directory')showDirectory();
  else if(action==='history')showHistory();
  else if(action==='show-tree'){state.layout='workbench';render();}
  else if(action==='expand-tree'){state.expanded=new Set(flat(sourceTree()).filter(g=>g.groups?.length).map(g=>g.id));render();}
  else if(action==='zoom')window.open(state.preview==='part'?artifact(groupFile()):stages[state.stage].image,'_blank');
  else if(action==='logs')toast('示例进度用于展示交互；正式版将在这里读取当前任务的真实日志。');
  else if(action==='settings')toast('正式版将在这里保存运行目录、Krita 路径与启动选项。');
  else if(action==='files')toast('目录按 <dir>/<name>/<pipeline> 组织；结构由真实 groups.json 提供。');
 });
 const search=document.querySelector('#tree-search');if(search)search.oninput=()=>{
  const term=search.value.toLowerCase();document.querySelectorAll('.tree-row').forEach(row=>row.hidden=term&&!row.title.toLowerCase().includes(term));
 };
 document.querySelectorAll('[data-config-file]').forEach(b=>b.onclick=async()=>{state.file=b.dataset.configFile;await loadConfigFile();render();});
 const source=document.querySelector('#config-ref');if(source)source.onchange=async()=>{state.ref=source.value;state.base=undefined;await loadConfig();render();};
 const diff=document.querySelector('#config-diff');if(diff)diff.onchange=async()=>{state.diff=diff.checked;state.base=document.querySelector('#config-base').value;await loadConfigFile();render();};
 const base=document.querySelector('#config-base');if(base)base.onchange=async()=>{state.base=base.value;if(state.diff){await loadConfigFile();render();}};
 const filter=document.querySelector('#config-search');if(filter)filter.oninput=()=>{state.configFilter=filter.value;document.querySelector('.config-tree-scroll').innerHTML=configTree();document.querySelectorAll('[data-config-file]').forEach(b=>b.onclick=async()=>{state.file=b.dataset.configFile;await loadConfigFile();render();});};
}
if(state.page==='config')await loadConfig();
render();
if(new URLSearchParams(location.search).get('dialog')==='new')showNew();

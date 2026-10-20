import { pipelineSteps, groupLayers } from './progress.js';

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
 stage:3, group:'outer_robe/left_sleeve/front_sleeve_wall', expanded:new Set(['outer_robe','outer_robe/left_sleeve']),
 selectedStep:'step02', depth:-1, inspect:false, compare:false, treeSearch:'', treeOpen:false,
 openSteps:new Set(),
 preview:'composition', directory:localStorage.getItem('astra-demo-directory')||data.directory,
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
const sourceTree = () => state.stage<2?data.character.groups:data.clothing.groups;
function flat(nodes) { return nodes.flatMap(node=>[node,...flat(node.groups||[])]); }
function chosenGroup() { return flat(sourceTree()).find(node=>node.id===state.group)||sourceTree()[0]; }
function treePipeline() { return state.stage<2?'part-layering':'clothing-part-layering'; }
function groupFile() { return `${treePipeline()}/parts/${chosenGroup().id}.svg`; }
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('visible'),4000); }

function header() {
 return `<header class="app-header"><a class="brand" href="./"><span class="brand-mark">${icon('layers')}</span><span>Astra<span class="brand-light">Layering</span></span></a>
 <nav class="global-tabs" aria-label="工作台页面"><button data-page="project" class="${state.page==='project'?'active':''}">${icon('branch')}制作流程</button><button data-page="config" class="${state.page==='config'?'active':''}">${icon('code')}管线配置</button></nav>
 <span class="demo-badge">交互原型 · 真实产物 / 示例进度</span></header>`;
}
function pageHeading() {
 return `<div class="page-heading"><div class="task-heading"><h1>jianma</h1><button class="directory-button" data-action="directory" title="${esc(state.directory)}">${icon('folder')}工作目录 ${icon('down')}</button><span class="task-status"><i class="live-dot"></i>衣服绘制中 <small>示例</small></span></div><div class="heading-actions"><button class="button" data-action="new">${icon('plus')}新建任务</button><button class="primary" data-action="run">${icon('play')}运行流程</button></div></div>`;
}
function treeRows(nodes, depth=0, flatView=false) {
 return nodes.map(node=> {
  const group=(node.groups||[]).length>0, expanded=state.expanded.has(node.id)&&!flatView;
  const label=node.id.split('/').at(-1);
  return `<div class="tree-row ${state.group===node.id?'selected':''}" style="--depth:${depth}" title="${esc(node.id)}">${group&&!flatView?`<button class="tree-toggle" data-expand="${esc(node.id)}" aria-label="${expanded?'收起':'展开'} ${esc(label)}" aria-expanded="${expanded}">${icon(expanded?'down':'chevron')}</button>`:'<span class="tree-toggle leaf"></span>'}<button class="tree-label" data-group="${esc(node.id)}">${icon(group?'folder':'layers')}<span>${esc(label)}</span><small>${group?node.groups.length:node.kind==='part'?'part':'group'}</small></button></div>${group&&expanded?treeRows(node.groups,depth+1):''}`;
 }).join('');
}
function artifactTree() {
 const layers=groupLayers(sourceTree());
 const term=state.treeSearch.toLowerCase();
 const nodes=state.depth>=0?layers[state.depth]||[]:term?flat(sourceTree()):sourceTree();
 const filtered=term?nodes.filter(node=>node.id.toLowerCase().includes(term)):nodes;
 const rows=state.depth>=0||term?treeRows(filtered,0,true):treeRows(filtered);
 return `<details class="artifact-tree" ${state.treeOpen?'open':''}><summary>${icon('branch')}部件结构 <small>${flat(sourceTree()).filter(g=>g.kind==='part').length} parts</small>${icon('down')}</summary>
 <div class="tree-controls"><select id="tree-depth" aria-label="按拆分树深度查看"><option value="-1">完整层级</option>${layers.map((nodes,i)=>`<option value="${i}" ${state.depth===i?'selected':''}>第 ${i+1} 层 · ${nodes.length} 个节点</option>`).join('')}</select><button class="icon-button" data-action="expand-tree" title="展开全部层级">${icon('expand')}</button></div>
 <div class="tree-search">${icon('search')}<input id="tree-search" value="${esc(state.treeSearch)}" placeholder="查找 group / part" aria-label="搜索部件"></div><div class="tree-scroll" id="tree-rows">${rows||'<p class="empty-tree">没有匹配的部件</p>'}</div>
 <p class="tree-note">树深度表示拆分层次，与遮挡高度不同。<a href="${artifact(treePipeline()+'/groups.json')}" target="_blank" rel="noopener">groups.json ${icon('arrow')}</a></p></details>`;
}
const statusNames = { done:'已完成', running:'进行中', pending:'待执行' };
function statusMark(status) {
 return `<span class="phase-mark ${status}" title="${statusNames[status]}" aria-label="${statusNames[status]}">${status==='done'?icon('check'):status==='running'?'<i></i>':icon('clock')}</span>`;
}
function stepRows(stageIndex, nodes=pipelineSteps[stageIndex], nested=false) {
 return nodes.map(step=> {
  const key=stageIndex+':'+step.id, open=state.openSteps.has(key);
  return `<div class="phase-item ${nested?'nested':''}"><div class="phase-row ${step.status} ${state.inspect&&state.stage===stageIndex&&state.selectedStep===step.id?'selected':''}">
   <button class="phase-select" data-step="${stageIndex}:${step.id}">${statusMark(step.status)}<span>${esc(step.title)}</span>${step.id.startsWith('step')?`<small>${esc(step.id)}</small>`:''}</button>
   ${step.children.length?`<button class="phase-toggle" data-step-toggle="${key}" aria-label="${open?'收起':'展开'}${esc(step.title)}" aria-expanded="${open}">${icon(open?'down':'chevron')}</button>`:''}</div>
   ${open&&step.children.length?`<div class="phase-children">${stepRows(stageIndex,step.children,true)}</div>`:''}</div>`;
 }).join('');
}
function selectedStep() {
 const all=nodes=>nodes.flatMap(node=>[node,...all(node.children)]);
 return all(pipelineSteps[state.stage]).find(step=>step.id===state.selectedStep)||pipelineSteps[state.stage][0];
}
function flowCard(index) {
 const stage=stages[index];
 return `<article class="flow-card ${stage.status} ${state.inspect&&state.stage===index?'selected':''}" data-pipeline="${index}">
 <button class="node-heading" data-stage="${index}" aria-label="查看${stage.name}产物" aria-pressed="${state.inspect&&state.stage===index}"><span class="node-number">${String(index+1).padStart(2,'0')}</span><h2>${stage.name}</h2>${statusMark(stage.status)}</button>
 <div class="node-body"><div class="node-steps">${stepRows(index)}</div>
 <button class="node-output" data-stage="${index}" aria-label="查看${stage.name}归档产物"><img src="${stage.image}" alt="${stage.name}归档缩略图"><span><b>${index===0?'88 个部件':index===2?'67 个部件':index===4?'穿戴合成':'分层 KRA'}</b><small>${index===0||index===2?'SVG · groups · 深度':'KRA · PNG'}</small></span>${icon('chevron')}</button></div></article>`;
}
function inspector() {
 const stage=stages[state.stage], step=selectedStep(), isPart=state.preview==='part';
 const group=chosenGroup();
 const imagePath=isPart?artifact(groupFile()):stage.image;
 const parent=pipelineSteps[state.stage].find(node=>node.children.some(child=>child.id===step.id));
 const note=step.note||parent?.note||'';
 return `<aside class="output-inspector" aria-label="所选节点产物"><header class="output-heading"><div><small>${esc(stage.name)}</small><h2>${esc(isPart?group.id.split('/').at(-1):step.title)}</h2></div><button class="icon-button" data-action="close-inspector" aria-label="关闭产物面板">${icon('close')}</button></header>
 <div class="output-scroll">${note&&!isPart?`<p class="step-note">${esc(note)}</p>`:''}
 <div class="output-caption"><span>${isPart?'分块 SVG':'管线归档产物'}</span>${isPart?'<button data-action="stage-output">返回管线产物</button>':`<label><input type="checkbox" id="compare-reference" ${state.compare?'checked':''}>对照参考</label>`}</div>
 <div class="output-image ${state.compare&&!isPart?'compare':''}">${state.compare&&!isPart?'<figure><img src="./images/reference.png" alt="简化角色参考"><figcaption>简化角色参考</figcaption></figure>':''}<figure><a href="${imagePath}" target="_blank" rel="noopener" title="打开原尺寸"><img src="${imagePath}" alt="${esc(isPart?group.id+' 分块 SVG':stage.name+'归档产物')}"></a><figcaption>${isPart?'原始画布 · SVG':'jianma 归档 · 点击看原图'}</figcaption></figure></div>
 ${isPart?`<code class="group-path">${esc(group.id)}</code><details class="group-description"><summary>部件说明</summary><p class="group-note">${esc(group.note||'')}</p></details>`:`<div class="output-files"><a href="${artifact(stage.file)}" target="_blank" rel="noopener">${icon(stage.file.endsWith('.kra')?'layers':'code')}<span>${esc(stage.file.split('/').at(-1))}</span>${icon('arrow')}</a></div><p class="archive-note">产物来自完整归档；图中的运行状态仅为演示。</p>`}
 ${state.stage!==4?artifactTree():''}</div>
 <footer class="output-footer"><button class="button" data-action="single">${icon('play')}运行 / 恢复${esc(stage.name)}</button></footer></aside>`;
}
function graph() {
 return `${pageHeading()}<section class="workflow-shell ${state.inspect?'has-inspector':''}"><div class="flow-area"><div class="flow-toolbar"><span>从参考图到完整分层</span><div class="flow-legend"><span>${statusMark('done')}完成</span><span>${statusMark('running')}进行中</span><span>${statusMark('pending')}等待</span></div></div>
 <div class="flow-scroll"><div class="flow-world"><svg class="flow-connectors" aria-hidden="true"></svg>
 <div class="flow-input"><a href="./images/original.jpg" target="_blank" rel="noopener"><img src="./images/original.jpg" alt="原始输入图"></a><span><b>输入角色图</b><small>original → standard</small></span></div>
 <div class="flow-grid">${stages.map((_,i)=>flowCard(i)).join('')}</div></div></div>
 <footer class="flow-footnote">按 01 → 05 顺序执行 · 连线表示产物依赖 · 点节点看产物，展开看子步骤</footer></div>${state.inspect?inspector():''}</section>`;
}

// Connections follow the actual card bounds, including expanded substeps.
let flowObserver;
function connectFlow() {
 const world=document.querySelector('.flow-world');
 if(!world)return;
 const svg=world.querySelector('.flow-connectors');
 const bounds=world.getBoundingClientRect();
 const box=selector=>{
  const r=world.querySelector(selector).getBoundingClientRect();
  return {x:r.left-bounds.left,y:r.top-bounds.top,w:r.width,h:r.height};
 };
 const input=box('.flow-input'), cards=stages.map((_,i)=>box(`[data-pipeline="${i}"]`));
 const paths=[];
 const path=(d,label,x,y,status='done')=>paths.push(`<path class="${status}" d="${d}" marker-end="url(#flow-arrow-${status})"/>${label?`<text x="${x}" y="${y}">${label}</text>`:''}`);
 const [human,body,clothes,raster,assembly]=cards;
 path(`M${input.x+input.w/2} ${input.y+input.h} V${human.y-6}`,'',0,0);
 for(const [a,b] of [[human,body],[clothes,raster]]) {
  const y=a.y+29;
  path(`M${a.x+a.w} ${y} H${b.x-6}`,'parts',(a.x+a.w+b.x)/2,y-9);
 }
 const x=human.x+human.w/2, y=(human.y+human.h+clothes.y)/2;
 path(`M${x} ${human.y+human.h} V${clothes.y-6}`,'简化角色图',x+44,y+4);
 for(const [a,offset,label,status] of [[body,-24,'人物 KRA','pending'],[raster,24,'衣服 KRA','pending']]) {
  const ax=a.x+a.w, ay=a.y+a.h/2, endY=assembly.y+assembly.h/2+offset, mid=(ax+assembly.x)/2;
  path(`M${ax} ${ay} H${mid} V${endY} H${assembly.x-6}`,label,mid,ay-10,status);
 }
 svg.setAttribute('viewBox',`0 0 ${world.clientWidth} ${world.clientHeight}`);
 svg.innerHTML=`<defs>${['done','pending'].map(status=>`<marker id="flow-arrow-${status}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6" fill="${status==='done'?'#86b7a8':'#a7b3c0'}"/></marker>`).join('')}</defs>${paths.join('')}`;
}
let versions, configFiles=[], configText='', schemaText='', diffText='';
async function loadConfig() {
 try {
  versions=await get('./api/config/versions?ref='+encodeURIComponent(state.ref));
  const snapshot=await get('./api/config/files?ref='+encodeURIComponent(state.ref)); configFiles=snapshot.paths;
  if(!configFiles.includes(state.file)) state.file=configFiles[0]||'';
  await loadConfigFile();
 } catch(error) { toast(error.message); }
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
 flowObserver?.disconnect();
 document.querySelector('#app').innerHTML=header()+`<main class="main ${state.page==='config'?'config-page':''}">${state.page==='config'?configPage():graph()}</main>`;
 bind();
 if(state.page==='project') {
  connectFlow();
  flowObserver=new ResizeObserver(connectFlow);
  document.querySelectorAll('.flow-world,.flow-card').forEach(node=>flowObserver.observe(node));
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
 if(state.stage!==index) {
  state.stage=index; state.depth=-1; state.treeSearch='';
  state.selectedStep=index===0||index===2?'layers':index===4?'step01':'step02';
  state.group=sourceTree()[0].id;state.expanded=new Set([state.group]);
 }
 state.inspect=true; state.preview='composition';
 state.treeOpen=index===0||index===2;
}
function bind() {
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=async()=>{state.page=b.dataset.page;if(state.page==='config')await loadConfig();render();});
 document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{selectStage(Number(b.dataset.stage));render();});
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const [stage,step]=b.dataset.step.split(':');selectStage(Number(stage));state.selectedStep=step;render();});
 document.querySelectorAll('[data-step-toggle]').forEach(b=>b.onclick=()=>{const key=b.dataset.stepToggle;state.openSteps.has(key)?state.openSteps.delete(key):state.openSteps.add(key);render();});
 document.querySelectorAll('[data-expand]').forEach(b=>b.onclick=()=>{const id=b.dataset.expand;state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);render();});
 document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{state.group=b.dataset.group;state.preview='part';render();});
 document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=> {
  const action=b.dataset.action;
  if(action==='new'||action==='run')showNew();
  else if(action==='single')showNew(true);
  else if(action==='directory')showDirectory();
  else if(action==='history')showHistory();
  else if(action==='close-inspector'){state.inspect=false;render();}
  else if(action==='stage-output'){state.preview='composition';render();}
  else if(action==='expand-tree'){state.depth=-1;state.treeSearch='';state.expanded=new Set(flat(sourceTree()).filter(g=>g.groups?.length).map(g=>g.id));render();}
 });
 const tree=document.querySelector('.artifact-tree');if(tree)tree.ontoggle=()=>{state.treeOpen=tree.open;};
 const depth=document.querySelector('#tree-depth');if(depth)depth.onchange=()=>{state.depth=Number(depth.value);render();};
 const compare=document.querySelector('#compare-reference');if(compare)compare.onchange=()=>{state.compare=compare.checked;render();};
 const search=document.querySelector('#tree-search');if(search)search.oninput=()=>{
  state.treeSearch=search.value;const cursor=search.selectionStart;render();
  const next=document.querySelector('#tree-search');next.focus();next.setSelectionRange(cursor,cursor);
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

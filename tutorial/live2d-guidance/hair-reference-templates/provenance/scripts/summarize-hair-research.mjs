import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve,relative} from 'node:path';
const cwd=resolve('.'), out=join(cwd,'.run/hair-splitting-research-20261015');
const official=JSON.parse(await readFile(join(out,'official-hair-layer-summary.json'),'utf8'));
const milly=JSON.parse(await readFile(join(out,'milly-hair-facts.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const production=join(cwd,'.run/test-children-20261015');
const baseline=JSON.parse(await readFile(join(production,'previews/hair-current/manifest.json'),'utf8'));
for(const n of baseline.nodes)if(hash(await readFile(join(production,n.path)))!==n.hash)throw Error('Production SVG changed: '+n.id);
const promptPaths=['prompts/groups/hair/children.md','prompts/groups/hair/bangs/children.md','prompts/groups/hair/back_hair/children.md','prompts/groups/hair/completion.md','prompts/8-同层轮廓去重.md'];
const prompts=[];for(const path of promptPaths)prompts.push({path,sha256:hash(await readFile(path))});
const findings={
  createdAt:new Date().toISOString(),
  evidence:{
    currentLocalPsd:{path:milly.source,sha256:milly.sourceSha256,pixelsDecoded:true,sourceUnchanged:milly.sourceUnchanged},
    historicalOfficialInventory:{archive:'C:/Users/22129/Downloads/Live2D_research_repository-import_2026-10-01_to_08.zip',
      member:'tutorial/live2d-research/2026-10-01_psd_models/layer_inventory.json',
      sha256:hash(await readFile(join(out,'archive-evidence/layer_inventory.json'))),
      scope:'6 stored PSD layer inventories for Haru/Koharu/Haruto; no current local official PSD pixel reinspection'},
    tutorial:resolve(cwd,'../../tutorial/live2d-tutorial-text/6.头发的拆分与制作.txt'),prompts,
  },
  conclusions:[
    {id:'hair-regions',finding:'侧发是发区及遮挡/控制职责，不等同细鬓束。前发、侧发与后发的分界应从发根走向、发面连续性和相对脸/耳的遮挡确定，不能只看末端大小或左右位置。',status:'supported by local tutorial and Milly pixels'},
    {id:'style-variation',finding:'Milly 有大片前侧发与侧发；Haru 历史清单的横髪则窄。侧发小本身不足以证明分类错误，也不能把所有肩旁长发改成侧发。',status:'supported; official evidence is historical inventory only'},
    {id:'part-vs-group',finding:'发区名称不能预定 group/part。完整统一控制的发束或发面为 part，存在多个需要独立控制的子件才为 group。PSD 的绘画文件夹也不能直接等同动画实体 group。',status:'supported by production/import PSD inventory comparison; project mapping is design inference'},
    {id:'completion',finding:'侧发也可能需要补到头顶；后发必须补齐被头脸/身体遮挡的形体，并有头顶轮廓承担者。头盖可以独立或并入后发，不应先强制一个巨大的 cap+body base。',status:'supported by local tutorial; target-specific division requires replanning'},
    {id:'continuity',finding:'不机械按长度分节；因层序穿插等需要可将一束分为同动片，独立层的合法投影重叠不能靠几何相减去重。Milly 另有 R2 与 R2上，但仅 PSD 不能确定它们的绑定用途。',status:'tutorial-supported; explicit limit on Milly rig inference'},
    {id:'target',finding:'当前把中分两片宽发面全部归 bangs、将梳拢发面与后方长发合在 back_hair/base、只用两条细弯束代表侧发的结果需要重新评估。现有事实足以修正先验，但不能直接把 Milly 发区边界或节点数量照搬给当前角色。',status:'target-specific assessment, not a newly approved split'},
  ],
  productionVerification:{unchangedCompletedHairSvgs:baseline.nodes.length,promptsEdited:false,productionRerun:false},
};
await writeFile(join(out,'assessment.json'),JSON.stringify(findings,null,2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const imports=official.filter(m=>m.groups===0);
let html=await readFile(join(out,'index.html'),'utf8');
const extra=`<section id="official"><h2>其他 PSD 的历史结构证据</h2><p>在 Downloads 的研究 ZIP 中实际找到并读取了 Haru、Koharu、Haruto 的六份 PSD 图层清单。以下是导入版像素层；制作版对应发区多为含线、色、阴影的文件夹。原始官方 PSD 目前未在本机找到，本页不声称重新查看过其像素。</p><table style="border-collapse:collapse;width:100%"><thead><tr><th style="text-align:left">样本</th><th style="text-align:left">导入版实际头发图层</th></tr></thead><tbody>${imports.map(m=>`<tr><td style="padding:12px;border:1px solid #dde3eb;vertical-align:top">${esc(m.file)}</td><td style="padding:12px;border:1px solid #dde3eb">${m.hairRows.map(r=>`${esc(r.name.replaceAll('\x7f',''))} · ${r.bbox[2]-r.bbox[0]}×${r.bbox[3]-r.bbox[1]}`).join('<br>')}</td></tr>`).join('')}</tbody></table><p>Haru 的横髪仅宽 39 像素、刘海整体导入为一层。这两个事实说明“侧发必须大”和“刘海必定 group”都不能作为规则。Koharu/Haruto 的左右横髪约宽 170 像素，也与前髪分别保留。</p><p><a href="official-hair-layer-summary.json">筛选后的头发层清单</a> · <a href="archive-evidence/Live2D_PSD_观察笔记_文字版.txt">归档研究的范围与限制</a></p></section>
<section id="findings"><h2>对当前提示词的结论</h2><ol>${findings.conclusions.map(c=>`<li><p>${esc(c.finding)}</p></li>`).join('')}</ol><p><strong>应先改“识别整个发区与控制职责”的先验，再重新分析 hair；不是仅重命名、扩大 side_hair，或继续修去重来维持现有划分。</strong></p><p><a href="assessment.json">证据与结论索引</a> · <a href="../test-children-20261015/previews/hair-current/index.html">当前 hair 预览</a></p></section>`;
// The production run is a sibling of this research run.
const productionHref=relative(out,join(production,'previews/hair-current/index.html')).replaceAll('\\','/');
html=html.replace('</html>',extra.replace('../test-children-20261015/previews/hair-current/index.html',productionHref)+'</html>');
html=html.replace('</style>','table th{padding:10px;border:1px solid #dde3eb;background:#edf2f8}</style>');
html=html.replace('<section><h2>四个实际组织区域','<p><a href="#official">官方 PSD 历史清单对照</a> · <a href="#findings">当前提示词结论</a></p><section><h2>四个实际组织区域');
await writeFile(join(out,'index.html'),html);
for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g))if(m[1]&&!m[1].startsWith('#'))await access(resolve(out,m[1]));
console.log(JSON.stringify({research:out,localPsdHairNodes:milly.hairNodes.length,officialPsdInventories:official.length,productionVerification:findings.productionVerification}));

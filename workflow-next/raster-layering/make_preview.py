"""Make a portable HTML inspector for the delivered PNGs and native KRA."""
import argparse
import json
from pathlib import Path

ap=argparse.ArgumentParser()
ap.add_argument('output',type=Path)
a=ap.parse_args();out=a.output
manifest=json.loads((out/'manifest.json').read_text())
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Astra · 角色分层与补全</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#15181f;color:#eef1f7;font:14px system-ui,sans-serif}
header{padding:20px 24px;border-bottom:1px solid #363b49;display:flex;gap:24px;align-items:center;flex-wrap:wrap}
h1{font-size:20px;margin:0}p{margin:7px 0;color:#b4bdcd}a{color:#afceff}button,select,input{font:inherit}
button,select{border:1px solid #525e75;background:#272e3b;color:white;border-radius:6px;padding:8px 12px;cursor:pointer}
button:hover{background:#3b4960}main{display:grid;grid-template-columns:320px 1fr;height:calc(100vh - 112px)}
aside{border-right:1px solid #363b49;overflow:auto;padding:14px}#search{width:100%;padding:10px;border:1px solid #525e75;background:#202632;color:white;border-radius:6px}
.part{padding:9px 6px;border-bottom:1px solid #303644;cursor:pointer;display:flex;gap:8px;align-items:center;font-size:12px;overflow-wrap:anywhere}.part.active{background:#364766}
.part span{flex:1}.part input{flex:none}.viewport{padding:16px;overflow:auto}.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.stage{position:relative;max-width:min(840px,calc((100vh - 235px)*var(--aspect,0.666667)));margin:auto;background-color:#73777e;background-image:conic-gradient(#83878e 25%,transparent 0 50%,#83878e 0 75%,transparent 0);background-size:24px 24px;line-height:0}
canvas{display:block;width:100%;height:auto}.reference{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
#caption{max-width:840px;margin:12px auto;color:#bac6d9;line-height:1.6}#status{color:#acc5a8;font-size:12px}
@media(max-width:800px){main{grid-template-columns:220px 1fr}header{padding:14px}.viewport{padding:8px}}
</style>
<header><div><h1>角色分层与遮挡补全</h1><p>90 个部件 · 原图 1024 × 1536 · gpt-image-2.5 + Krita</p></div>
<a download href="character.kra">下载 Krita 分层文件</a><a download href="reassembled.png">下载透明重组 PNG</a><span id="status"></span></header>
<main><aside><input id="search" placeholder="搜索部件，如 face / hair / hand"><p><button id="all">显示全部</button> <button id="none">隐藏全部</button></p><div id="list"></div></aside>
<section class="viewport"><div class="toolbar"><button id="assemble">重组模式</button><button id="solo">独显完整部件</button><button id="control">RGB 控制图</button>
<label>原图对照 <input id="mix" type="range" min="0" max="100" value="0"></label><a id="download" download>下载当前完整部件</a></div>
<div class="stage"><canvas id="canvas" width="1024" height="1536"></canvas><canvas class="reference" id="reference" width="1024" height="1536" style="opacity:0"></canvas></div>
<p id="caption">选择部件后可独显完整补全、查看 RGB 控制图。重组由各部件的原姿势可见像素叠加而成。</p></section></main>
<script>
const manifest=__MANIFEST__, parts=manifest.parts;
const canvas=document.querySelector('#canvas'),ctx=canvas.getContext('2d'),list=document.querySelector('#list');
const enabled=new Set(parts.map(p=>p.id)),cache=new Map();let active=parts[0].id,mode='assemble',serial=0;
function load(path){if(!cache.has(path))cache.set(path,new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=path}));return cache.get(path)}
function rows(){list.replaceChildren();const q=document.querySelector('#search').value.toLowerCase();for(const p of parts){if(!p.id.toLowerCase().includes(q))continue;
const row=document.createElement('div');row.className='part'+(p.id===active?' active':'');const check=document.createElement('input');check.type='checkbox';check.checked=enabled.has(p.id);
check.onclick=e=>{e.stopPropagation();check.checked?enabled.add(p.id):enabled.delete(p.id);mode='assemble';draw()};
const label=document.createElement('span');label.textContent=p.id;row.append(check,label);row.onclick=()=>{active=p.id;rows();draw()};list.append(row)}}
async function draw(){const token=++serial;document.querySelector('#status').textContent='加载部件…';let images=[];
if(mode==='assemble')images=await Promise.all(parts.filter(p=>enabled.has(p.id)).map(p=>load(`parts/${p.id}/visible.png`)));
else images=[await load(`parts/${active}/${mode==='control'?'control':'full'}.png`)];
const reference=await load('reference.png');if(token!==serial)return;
let box=[0,0,1024,1536];if(mode!=='assemble'){const b=parts.find(p=>p.id===active).registration.targetBounds;box=[b[0]-8,b[1]-8,b[2]+8,b[3]+8]}
const [x,y,x1,y1]=box,w=x1-x,h=y1-y;canvas.width=w;canvas.height=h;document.querySelector('.stage').style.setProperty('--aspect',w/h);
for(const im of images)ctx.drawImage(im,x,y,w,h,0,0,w,h);
const ref=document.querySelector('#reference');ref.width=w;ref.height=h;ref.getContext('2d').drawImage(reference,x,y,w,h,0,0,w,h);
document.querySelector('#download').href=`parts/${active}/full.png`;document.querySelector('#caption').textContent=mode==='assemble'?`已显示 ${enabled.size} / 90 个原姿势部件。所有透明 PNG 共用原始画布坐标。`:
mode==='control'?`${active}：红色保留，黄色补全，绿色透明。`:`${active}：完整部件，包含原姿势下被遮挡的区域；在 Krita 中关闭该层的“原姿势遮挡”蒙版即可查看。`;
document.querySelector('#status').textContent=mode==='assemble'?'原姿势重组':active}
document.querySelector('#search').oninput=rows;document.querySelector('#all').onclick=()=>{parts.forEach(p=>enabled.add(p.id));mode='assemble';rows();draw()};
document.querySelector('#none').onclick=()=>{enabled.clear();mode='assemble';rows();draw()};
for(const id of ['assemble','solo','control'])document.querySelector('#'+id).onclick=()=>{mode=id;draw()};
document.querySelector('#mix').oninput=e=>document.querySelector('#reference').style.opacity=e.target.value/100;
rows();draw().catch(e=>document.querySelector('#status').textContent='图片加载失败：'+e);
</script></html>'''
(out/'index.html').write_text(html.replace('__MANIFEST__',json.dumps(manifest,ensure_ascii=False)))
print(out/'index.html')

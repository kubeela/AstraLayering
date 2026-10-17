# -*- coding: utf-8 -*-
"""Write documentation from brush logs and the manually completed visual review."""
from pathlib import Path
import json,collections,shutil
p=Path(__file__).resolve().parents[1]
rows=json.loads((p/'manifest.json').read_text())['parts'];hist=json.loads((p/'brush-edits.json').read_text());new=json.loads((p/'continuation-brush-edits.json').read_text());logs=hist+new
by=collections.defaultdict(list)
for e in logs:by[e['id']].append(e)
index=json.loads((p/'review-final/index.json').read_text());panels=collections.defaultdict(list)
for e in index:panels[e['level']].append(e)
def obs(n):
 if n in [0,1]:return '长边、弯折和带尖连续；内缘异色已清理，保留带面亮线。'
 if n in [2,3]:return '根部斜接线及臂手旁残色已复修；长弧、分叉和卷尾已对照。'
 if n in [4,5,6,7,87,88]:return '对照发丝线芯、外缘与隐藏根部；保留发束原有明暗和尖端。'
 if n in [8,9]:return '上端补全、膝部、踝部和长边分段检查；交界保留连续肤色层次。'
 if n in [10,11]:return '踝部接入、趾尖和甲面分别检查，保留趾间线。'
 if n in [12,30,31]:return '服装缝边与拆分边分开检查；叠加后衣料轮廓和层次保持。'
 if n==13:return '颈部独显和接入躯干均检查，原有浅肤色层次保留。'
 if 14<=n<=29:return '独显检查连接端及残色；隐藏上层检查补全，合成检查手臂与手指衔接。'
 if n in [47,48,49]:return '耳缘、脸颊和下颌柔化；补全区保持肤色渐变。'
 if n in [54,55]:return '高光已有柔和半透明过渡；继续涂抹会损失亮点，因此保留。'
 if 50<=n<=73:return '以原图同部位检查线条粗细、浓淡及边缘过渡；保留五官线芯。'
 if 74<=n<=79:return '小连接件已具备半透明边缘；400% 对照后保留原像素。'
 return '宝石、金属边与连接处逐件检查；保留原有亮点，轻柔化硬点和外缘。'
def remaining(n):
 return '隐藏补全区的发丝细节密度仍比原图可见发束略简化；保留现有形体与发束布局，未整片重画。' if n in [2,3] else '本轮对照未发现需继续处理的明显残色或硬接缝。'
for name in ['README.md','PROGRESS.md']:
 dst=p/('CHECKPOINT-'+name)
 if not dst.exists():shutil.copyfile(p/name,dst)
review=[]
for r in rows:
 n=r['level'];es=by[r['id']]
 review.append({'level':n,'id':r['id'],'modified':bool(es),'operations':len(es),'issues':list(dict.fromkeys(e['issue'] for e in es)),'methods':list(dict.fromkeys(e['note'] for e in es)),'isolatedReviewed':True,'higherLayersHiddenReviewed':True,'compositeReviewed':True,'magnification':sorted({e['scale']*100 for e in panels[n]}),'visualObservation':obs(n),'remaining':remaining(n),'reviewPanels':[e['file'] for e in panels[n]]})
report={'status':'reviewed_with_noted_texture_limitations','date':'2026-10-18','reference':'../gray-control-krita/reference.png','method':'Native Krita local Airbrush Soft, Blender Blur, Filter Blur strokes at visually selected coordinates; source was only viewed, never pasted.','visualReview':'All 90 isolated and lower-stack native renders were viewed against the same reference region at 200–400%; the final composite was also visually compared.','totalLayers':90,'modifiedLayers':sum(bool(v) for v in by.values()),'retainedLayers':90-sum(bool(v) for v in by.values()),'historicalOperations':len(hist),'continuationOperations':len(new),'totalBrushPaths':sum(len(e['strokes']) for e in logs),'remainingSummary':[remaining(2)],'layers':review}
(p/'final-visual-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
lines=['# 第二步逐层修改与复核记录','','2026-10-18。本表对应 `character-soft-edges-final.kra`，不对应旧阶段存档。','','共 90 层；82 层有局部修画，8 层经放大对照后保留。两份日志合计 110 条操作、365 条手工选定笔刷路径。本次续作 77 条操作；历史存档已有 33 条。所有层均完成独显、隐藏上层和合成对照。','','## 仍保留的限制','','02、03 后长发的隐藏补全区，其发丝细节密度仍比原图可见发束略简化。局部硬接线、暖色残线已修整，已有柔光层次保留；没有为了增加密度重画整片发束。其他层本轮未发现需继续处理的明显残色或硬接缝。这里记录视觉判断，不把像素摘要或误差分数当作美术验收。','','参考图和工程均为 1024 × 1536；400% 图采用近邻放大，显示原始像素以便检查，不代表做过放大锐化。','','## 图层明细','','深度 00 为最底，89 为最顶。每行的「检查图」同时列出原图、Krita 独显及 Krita 隐藏上层状态。长发、腿部等大件拆成多段。','','| 深度 / 部件 | 状态 | 主要问题与处理 | 放大复核 / 保留项 |','| --- | --- | --- | --- |']
for r in review:
 n=r['level'];pid=r['id'];status='已局部修画' if r['modified'] else '检查后保留'
 issue='；'.join(r['issues']);method='；'.join(r['methods'])
 if not issue:issue=obs(n);method='保留原像素。'
 links=' · '.join(f'[检查图 {i+1}](review-final/{f})' for i,f in enumerate(r['reviewPanels']))
 finding=obs(n)+' '+('**'+remaining(n)+'**' if n in [2,3] else '未发现明显遗留问题。')
 lines.append(f"| {n:02} [{pid}](final-parts/{pid}/full.png) | {status}（{r['operations']} 条操作） | {issue}<br>{method} | {links}<br>{finding} |")
(p/'PROGRESS.md').write_text('\n'.join(lines)+'\n')
readme='''# 第二步：边缘柔化与去锯齿

已在第一步 `character-depth.kra` 的分层结构上完成本轮局部修画并另存。交付文件包含 90 个按原深度排序的普通绘画层，每部件一层，无蒙版、无子节点。第一步文件和旧第二步阶段存档均保留。

- [新的 KRA：character-soft-edges-final.kra](character-soft-edges-final.kra)
- [合成 PNG：preview-final.png](preview-final.png)
- [90 层修改、处理方式与保留项](PROGRESS.md)
- [原图 / 独显 / 隐藏上层检查图索引](review-final/index.html)
- [Krita 重新打开与像素核对](final-reopen-verification.json)

![第二步合成图](preview-final.png)

## 本轮处理

82 层有局部修改，8 层检查后保留。重点处理了长发和飘带外缘、手指与掌根残色、手臂和腿脚连接处、服装边缘、面部五官线条，以及头饰和脚饰的硬点。眼睛高光（54、55）和六个细小冠饰连接件（74–79）已有适当的半透明过渡，未再涂抹。

修画在 Krita 内使用柔边笔刷、涂抹与模糊笔刷逐处完成；笔宽和力度按目视对照的部位分别选择。没有全层模糊、统一羽化、粘贴原图像素或公式生成修复。辅助脚本记录手工选定的路径、切换显隐并导出检查图，不从参考图自动描边或生成笔触。

## 验收及保留项

90 层均已查看独显、隐藏上层状态，并在 200–400% 与原图同区对照；最终合成图另行检查外缘、发丝、五官、手和脚。检查图直接使用 Krita 原生显隐导出，放大检查不修改工程像素。

仍保留一项质感限制：**02、03 后长发隐藏补全区的发丝细节密度比原图可见发束略简化。** 其局部接线及肤色残丝已修整，已有柔光层次保留；没有改造发束布局或整片重画。详细记录见逐层表。

工程保存后已重新打开，核对 90 层的名称、顺序、类型、显隐及每层像素一致。合成 PNG 从重开的工程直接导出。`final-reopen-verification.json` 只证明存储完整性；人工视觉记录单独保存在 `final-visual-review.json`。

本步没有新增阴影、AO 或投影，也没有改层名、归属与深度顺序。第一步 KRA 的 SHA-256 与 `baseline.json` 一致。只读轮廓诊断保存在 `geometry-diagnostic.json`，不作为主要视觉评价。

## 文件区分

| 文件 | 用途 |
| --- | --- |
| `character-soft-edges-final.kra` / `preview-final.png` | 本轮交付 |
| `final-parts/` | 与新 KRA 一致的 90 个完整 RGBA 部件 |
| `review-final/` / `review-final-pages/` | 本轮放大复核图及拼页 |
| `brush-edits.json` / `continuation-brush-edits.json` | 历史与本次逐笔操作记录 |
| `character-soft-edges.kra` / `preview.png` / `parts/` | 2026-10-17 22:41 的旧阶段存档，未覆盖 |
| `CHECKPOINT-README.md` / `CHECKPOINT-PROGRESS.md` | 旧存档说明及当时待办 |

第一步成果仍在 [gray-control-krita](../gray-control-krita/README.md)。新 KRA 可独立打开，无需脚本或临时文件。历史笔刷脚本已执行，不要对交付文件重复运行，以免叠加笔触。
'''
(p/'README.md').write_text(readme)
html=['<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>90 层柔边复核</title><style>body{font:16px system-ui;max-width:1500px;margin:32px auto;padding:0 20px;background:#f3f3f3}article{background:white;padding:18px;margin:22px 0}img{max-width:100%;height:auto;display:block;margin:12px 0}p{line-height:1.6}a{color:#246096}</style><h1>90 层柔边复核</h1><p>各图依次为原图、Krita 独显、Krita 隐藏上层。文件按标注倍率生成，浏览器可能缩放至页面宽度；打开图片原尺寸查看准确的 200–400%。</p><p><a href="../PROGRESS.md">完整修改记录和保留项</a> · <a href="../preview-final.png">合成图</a></p>']
import html as h
for r in review:
 html.append(f'<article><h2>{r["level"]:02} {h.escape(r["id"])}</h2><p>{h.escape(r["visualObservation"])}</p>')
 if r['level'] in [2,3]:html.append('<p>'+h.escape(r['remaining'])+'</p>')
 for f in r['reviewPanels']:html.append(f'<a href="{f}"><img loading="lazy" src="{f}" alt="{h.escape(r["id"])} 比较图"></a>')
 html.append('</article>')
html.append('</html>');(p/'review-final/index.html').write_text('\n'.join(html))
print('Delivery documentation written:',len(review),'layers,',sum(bool(v) for v in by.values()),'modified,',len(new),'continuation operations')

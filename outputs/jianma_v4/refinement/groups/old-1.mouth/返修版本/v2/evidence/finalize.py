from pathlib import Path
import json,hashlib,shutil
B=Path('refinement/groups/mouth');A=B/'返修版本/v1';V=B/'返修版本/v2';Q=V/'evidence'
stages={'4.3':B/'4.分部件着色/4.3.唇部颜色与层次','4.4':B/'4.分部件着色/4.4.嘴周皮肤明暗','5':B/'5.独立投影与高光','6':B/'6.组装与成稿审查'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
hashes={k:sha(p/'character.svg') for k,p in stages.items()};replacements={sha(A/k/'character.svg'):h for k,h in hashes.items()}
fx=json.loads((stages['5']/'evidence/render-checks.json').read_text(encoding='utf-8'));arc=json.loads((Q/'repair-chain.json').read_text(encoding='utf-8'))
sections={
'4.3':'''## v2 · F1 返修记录

已完整读取独立审查v1的F1/F2，最早责任节点为本步。下唇 x440–450、y247.5–249 的实际颜色曾过早被外缘遮罩冲淡。v2取消下唇颜色遮罩的0.32单位形态收缩，把下唇局部模糊从0.52减为0.22；上唇处理不变。下唇底色、中央色、右侧色在y248.5继续采用23/24/25号粉色，最末过渡也保留暖粉，避免提前转为肤色。

没有修改 `mouth_lip_lower_complete_shape`、材料裁切、口裂、嘴角或正式线；没有增加外来投影。六个自身颜色层和控制归属仍保留。原尺寸完整画布中的 `(444,248)`：原图 `(234,179,182)`，v1 `(251,237,236)`，v2 `(234,178,182)`；`(445,248)` 原图 `(233,176,179)`，v2 `(236,178,182)`。上方 `(444,247)` 保持原版本颜色，说明没有把整个唇面统一加深。

新增 `evidence/F1-v1-v2.png`：第一行全部按941×1672整图渲染后裁图、同算法放大，第二行是同坐标直接24×和下唇独显，裁框统一 `(421,232)–(468,259)`。正常尺寸及放大均重新看图；本步下缘保留连续粉色，F2皮肤柔影在第5步单独处理。

''',
'4.4':'''## v2 · 重放到更新后的4.3

本步以修复F1的新4.3重新生成，不使用v1干净稿覆盖新唇色。11个皮肤区域、各自颜色/范围/独立控制和表面排除规则与v1逐项XML相等；唇面、上/下线、口腔、牙舌、肤色遮盖均保留新输入。

重新渲染本步预览、同坐标对照和皮肤显隐证据。关闭 `mouth_upper_skin_volume` 与 `mouth_lower_skin_volume`，1×整图和24×局部均与新4.3 **0差异像素**；按本步逆操作恢复字节散列也完全相同。第5步尚未烙入本稿，下唇柔影保持独立。

''',
'5':'''## v2 · F2 返修记录

先承接F1修好的4.3及重放的4.4，再处理柔影交界。旧版对下唇完整实形作纯黑硬排除，与透明颜色边缘不一致。v2的 `mouth5_actual_lower_lip_alpha_exclusion` 改为引用同一 `mouth43_lower_material_clip`、`mouth43_lower_edge_fade` 和 `mouth43_corner_fade`，在其中绘制黑色完整下唇形，复现实际唇材质alpha；不透明唇面被完全排除，半透明柔边之后显出的皮肤按其可见覆盖连续受影。

上唇和两条正式线的保护继续保留，最外层完整下皮肤承影裁切仍在。没有移除全部裁切，也没有把影画到唇色层。效果仍处于下唇颜色的后面，来源、目标、完整效果形和嘴下控制关系保持。

靠近下唇的阴影用色从过浅的灰粉改为暖玫瑰过渡，y248.5/y249.5叠加用色为 `#CB7880` / `#C87378`，之后继续向原有浅灰粉消退。此为半透明效果合成用色，不冒称原图实测独立投影颜色。原尺寸 `(444,249)` 原图 `(233,197,196)`，v2 `(234,198,197)`；上方 `(444,248)` 的F1唇面颜色保持 `(234,178,182)`。中央向下没有原v1的先亮再暗跳变。

`evidence/F2-v1-v2.png` 同时提供整图原尺寸采样放大、直接24×、v1/v2效果独显、效果关闭和1×面部。已看图核对交界。独显验证：效果在不透明唇面及承影皮肤之外均0覆盖；全部效果关闭与新4.4在1×/24×均0差异。来源与效果同时关闭也与相应干净稿0差异。F1/F2最终结论仍交独立review。

''',
'6':'''## v2 · F1/F2 修复链与送审

根据独立审查v1，依次修复4.3下唇颜色覆盖、重放4.4的11个皮肤色区、修复第5步实际材质alpha与皮肤柔影的接合，再用最新第5步重组本候选。每一步均更新预览、对照、说明和检查证据，没有在组装时改嘴型。

原尺寸完整画布中 `(444,248)` 原图 `(234,179,182)`，v1 `(251,237,236)`，v2 `(234,178,182)`；下一行 `(444,249)` 原图 `(233,197,196)`，v2 `(234,198,197)`。同坐标原尺寸放大与直接24×已看图，F1的过早褪色和F2的浅亮分离带已经针对性修正，供原审查者复验。

`evidence/F1-F2-v1-v2.png` 和 `evidence/repair-chain.json` 提供视觉及机器证据。效果关闭在1×/24×精确回到新4.4，保留6个唇色层和全部11个皮肤色区；未重画已审几何、嘴角、口裂或隐藏素材，非mouth内容保持。

送审副本为 `reviews/refinement/mouth/candidates/character-v2.svg`，与本文件字节相同。v1全套保存在 `refinement/groups/mouth/返修版本/v1/`，v2全套保存在相邻 `v2/`；版本链散列记录完整。本候选尚未获最终独立通过，未发布最终carry。

'''}
for k,p in stages.items():
 text=(A/k/'说明.md').read_text(encoding='utf-8')
 for old,new in replacements.items():text=text.replace(old,new)
 pos=text.index('\n')+1;text=text[:pos]+'\n'+sections[k]+text[pos:]
 if k=='4.3':
  text=text.replace('局部白色遮罩内收与柔化不修改唇形路径，也不模糊正式线。','上唇保留原有局部遮罩内收与柔化，下唇取消过量内收并改为0.22局部柔化；均不修改唇形路径，也不模糊正式线。')
  text=text.replace('61622','61819').replace('43.59 / 90.66','43.59 / 99.81').replace('2.08倍','2.29倍')
  text=text.replace('下缘向肤色消退。','下缘保持粉色后向皮肤连续消退。')
 if k=='5':
  text=text.replace('排除完整上下唇及上下正式线，防止柔影覆盖唇色和合口线。','排除完整上唇和上下正式线；下唇按实际材质alpha排除，柔边后仍可见的皮肤连续受影。')
  text=text.replace('53个原尺寸像素','53个原尺寸像素').replace('24×效果有效像素37397',f'24×效果有效像素{fx["effect_clip_24x"]["nonzero_alpha_pixels"]}')
  text=text.replace('有203个部分透明像素',f'有{fx["protected_visible_lip_and_line_24x"]["changed_pixels"]}个部分透明像素').replace('最大通道变化24，',f'最大通道变化{fx["protected_visible_lip_and_line_24x"]["max_channel_delta"]}，')
 if k=='6':
  text=text.replace('43.591 / 90.662','43.591 / 99.805').replace('比值约2.08','比值约2.29')
  text=text.replace('再由 `mouth5_skin_visible_mask` 排除唇/正式线','再由 `mouth5_skin_visible_mask` 按实际下唇alpha排除唇面并保护正式线')
 (p/'说明.md').write_text(text,encoding='utf-8')
manifest=[]
for n in ['2.嘴型校准与部件线稿','4.分部件着色/4.1.轮廓部件着色','4.分部件着色/4.2.嘴内部件着色','4.分部件着色/4.3.唇部颜色与层次','4.分部件着色/4.4.嘴周皮肤明暗','5.独立投影与高光']:
 p=B/n;manifest.append({'stage':n,'svg_sha256':sha(p/'character.svg'),'files':{f:(p/f).is_file() for f in ['character.svg','preview.png','对照.png','说明.md']}})
manifest.append({'stage':'3.嘴部色盘','palette_sha256':sha(B/'3.嘴部色盘/palette.json'),'files':{f:(B/'3.嘴部色盘'/f).is_file() for f in ['palette.json','palette.png','补全配色.json','说明.md']}})
(stages['6']/'evidence/stage-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
destination=Path('reviews/refinement/mouth/candidates/character-v2.svg');destination.parent.mkdir(parents=True,exist_ok=True)
if destination.exists():assert sha(destination)==hashes['6'],'Do not overwrite a distinct existing review candidate.'
else:shutil.copy2(stages['6']/'character.svg',destination)
revision_manifest={'revision':'v2','status':'candidate-awaiting-independent-review','review_source':'reviews/refinement/mouth/审查.md (v1 F1/F2)','candidate':str(destination),'stages':{k:{'v1_sha256':sha(A/k/'character.svg'),'v2_sha256':hashes[k],'files':{f:sha(p/f) for f in ['character.svg','preview.png','对照.png','说明.md']+( ['结构独显.png'] if k=='6' else [])}} for k,p in stages.items()}}
(V/'版本清单.json').write_text(json.dumps(revision_manifest,ensure_ascii=False,indent=2),encoding='utf-8')
for k,p in stages.items():
 target=V/k
 if target.exists():assert sha(target/'character.svg')==hashes[k]
 else:shutil.copytree(p,target)
(V/'说明.md').write_text('# mouth v2 · F1/F2 修复链\n\n完整修复顺序：4.3 → 4.4 → 5 → 6。每阶段的SVG、预览、对照、说明和证据保存在同名子目录；v1原产物在相邻v1目录。版本及文件SHA见版本清单.json。\n\n送审候选：`'+str(destination)+'`\n\nSHA-256：`'+hashes['6']+'`\n\n修复视觉证据：`evidence/F1-v1-v2.png`、`evidence/F2-v1-v2.png`；机器证据：`evidence/repair-chain.json`。\n\n状态：候选，待原独立审查者复验。未宣布最终通过或发布最终carry。\n',encoding='utf-8')
assert all(arc['all_11_skin_regions_preserved_v1_v2'].values())
assert fx['effect_clip_24x']['outside_target_surface_pixels']==0 and fx['effect_clip_24x']['over_fully_opaque_lip_pixels']==0
assert fx['all_effects_off_vs_clean_1x']['changed_pixels']==0 and fx['all_effects_off_vs_clean_24x']['changed_pixels']==0
print(json.dumps({'hashes':hashes,'review_candidate':str(destination),'review_candidate_sha256':sha(destination),'v1_v2_archives_complete':True},ensure_ascii=False,indent=2))

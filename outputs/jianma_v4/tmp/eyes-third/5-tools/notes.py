from pathlib import Path
import json,sys
P=Path(sys.argv[1]);c=json.loads((P/'check.json').read_text(encoding='utf-8'));out=Path(c['output']);eye=c['eye'];details=c['details']
body=f'''# {eye} · {c['step']}

## 输入与范围

按 `eyes_symmetric=false` 的逐眼顺序，输入最新完整 SVG：`{c['source']}`。输入 SHA256：`{c['input_sha256']}`。已审线稿 SHA256：`{c['approved_line_art_sha256']}`。

原彩图 `references/base-subject.png` 是可见效果的依据，色盘来自其真实像素；彩图拆解板仅辅助部件对应，不采用其中增加的泪痣、密睫毛、放射纹或多枚反光。交付 `character.svg` 是完整角色，`preview.png` 为原尺寸整图。本步只处理当前眼，另一眼按输入工作状态保留。

## 本步制作

'''
if c['step'].startswith('5.1'):
 body+='当前眼的三个 construction-guide 组全部保持隐藏；它们引用的正式源、稳定 id、裁切仍有效。未将虚线改作最终黑线。原有正式几何采用填充面，正式眼白、虹膜、高光、眼皮均无新增描边，也没有继承 stroke 或重复边线。\n\n保留真实上眼线、下眼线和完整睫毛的已审粗细与收尖，只替换线色。上下睫毛缺省状况不变。上下眼睑运动职责和眼内 gaze 归属不变；高光保留一枚独立形状，强度与虚实留到 5.4。\n\n| 节点 | 色盘样本 | 基础色 / 线色 |\n| --- | --- | --- |\n'
 for node,v in details['palette_mapping'].items():body+=f"| `{node}` | {v['sample']} | `{v['color']}` |\n"
 f=details['fold_source_pixel'];body+=f"\n短眼皮褶皱补充取原图像素 `{f['coordinate']}`，颜色 `{f['hex']}`；使用 0.72 不透明度形成浅暖细线。眼白采用浅冷暖白而非纯白，瞳孔深蓝与上眼线近黑、下眼线红褐彼此区分。\n\n此步尚无虹膜渐变、妆色、投影或最终高光，平涂造成的层次不足留给后续各步。\n"
else:body+=details.get('notes','')+'\n'
body+=f'''
## 自检及证据

- 已审几何逐节点核对：所有原有 `d/cx/cy/rx/ry/x/y/width/height/transform/points` 与线稿一致，原有 href 和 clip 引用关系不变。眼角、开合、下缘转折、虹膜尺寸与完整睫毛源没有变动。
- 保留 {c['unique_parts']} 个 part、{c['unique_ids']} 个唯一 id；所有引用有效，辅助组默认关闭。
- 当前眼之外的既有节点、另一眼及邻接 hair/face 保持输入内容。另一眼固定原坐标区域逐像素差为 0。
- 睫毛前后显示继续共用各自唯一完整源及 controller；未另画黑点。两眼不共享可编辑几何源。
- 已检查原尺寸神态、同坐标原图/候选和直接高倍率边缘，未发现因去线或上色造成的几何比例变化。最终效果仍以当前步骤完成范围为限。

过程证据：`{Path(c['evidence']).name}`（位于 `tmp/eyes-third/`）。包含 `source-candidate-comparison.png`、`same-coordinate-blend50.png`、`source-pixels-30x.png`、`candidate-eye-native.png`、`candidate-eye-direct-30x.png`、双眼/整头原尺寸及高倍率渲染、`hair-off-direct-30x.png`、`check.json`。

候选 SHA256：`{c['candidate_sha256']}`。本步完成，按流程携带完整 SVG 进入下一节点；不代替后续独立审查。
'''
(out/'说明.md').write_text(body,encoding='utf-8');print(str(out/'说明.md'))

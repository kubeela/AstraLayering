# Step03 换装分层底稿

结论：完成当前半身画布内的换装底稿检查及两侧肩根局部修接，已保存、关闭并重开最终 KRA，随后原生导出透明 PNG。输入工程的衣料主体已由上游补全为皮肤；本步没有重复覆盖这些合格绘画。

[KRA](character-dressup-base.kra) · [透明 PNG](character-dressup-base.png) · [原尺寸躯干](evidence/final-body-100.png) · [完整合成](evidence/final-gray.png)

## 输入、参考及实际范围

只读输入为 `/Users/wutian/Desktop/coding/AstraLayering/.run/closed-face-full-20261026/raster-layering/step02/character-soft-edges.kra`。已阅读 [step01 报告](../step01/report.md)、[step02 报告](../step02/report.md)，并读取上游 `part-layering/groups.json`、`part-layering/occlusion.json`；沿用37个逻辑 part、41个普通绘画层的归属和深度。两侧发仍分别保留5/20/150与6/21/151分片，没有合层或拆组。

皮肤依据为输入 KRA 的现有皮肤，以及第一步实际采用的 [base-subject.png](../../part-layering/references/base-subject.png) 中裸露颈肩、锁骨及双臂。参考上的白色衣料只用于定位旧肩带和领口，不作为皮肤明暗目标。首次在 `step03/workspace/character-dressup-base.kra` 另存，持续在同一工程修接，最后另存正式路径。

本画布1145×1374，仅含头、颈、肩臂和上胸，底缘裁于胸前。没有腰腹、髋部、腿根或裤口部件；未扩画画外身体。

逐层原始底纹和原生显隐检查发现：0030/0031双臂、0035颈、0040躯干、0050胸前均已为皮肤，未见白蓝衣料、滚边、衣缝或肩带。第一步报告的R6已记载0050底部补全至画布底缘。因此本步实际新增去衣面积为零，实际修正为原肩带覆盖区内两条肩根内部细线，不把上游补全计作本步重绘。

## 实际修画及迭代

只修改 `0040 body/torso`：画面左肩根约x239–282、y1048–1081，画面右肩根约x902–916、y1056–1088。两个不相连的局部范围及周边同倍率对照见下方。原有蒙版、完整alpha和真实外轮廓均保留。

初检300%发现左右肩臂接区上端各有一条短暖棕细弧，叠加双臂时读作内部接缝。通过已验证的 Krita Python bridge 调用原生 `Node.paintPath`，在torso同层锁定alpha，按本侧邻近肤色分别使用 Airbrush Soft（约4.2–5.8px）接色，Basic-5 Size（约2.8–3.2px）收掉细线中心，再以Filter Blur（约4–5px）沿极短的笔迹轻接笔触。颜色随左肩的浅桃到暖粉转折和右肩的浅暖皮肤分别调整；未镜像笔迹，未将衣褶染肤色。

第一批8笔后保存工程并导出实际投影，放大看到左侧细弧的上端仍可辨认；第二批沿x247–279、y1050–1062补接暖色转折，并轻接两侧窄笔迹后再次保存。全部14笔路径、尺寸、颜色、力度保存在 [实际笔迹记录](workspace/shoulder-strokes-final.json)。本步没有生成色场、贴入候选补色图、setPixelData写入绘画像素、整层铺色或整体模糊。

锁骨原线、颈根体积、肩头高光、腋窝暖棕线、上胸柔和体积及中央原明暗保留；双臂、颈和胸前层未重绘。头发、五官、已有修边和完整隐藏纹理均沿用。

## 画面验收与同坐标对照

所有下列图片都已实际打开查看。对照左为step02输入实际合成，右为最终保存重开的step03工程导出；同坐标、300%，灰底仅供检查，未写入工程或交付PNG。

| 范围 | 具体观察与结果 | 最终对照 |
| --- | --- | --- |
| 左肩短接线 | 原内部短弧已接回浅桃与暖粉肩面；上端第二次修接后不再形成棕色勾线。局部仍随肩面转暖，没有新增窄亮线或涂抹斑。 | [细部](evidence/left-seam-comparison.png) · [完整旧肩带及皮肤交界](evidence/left-strap-comparison.png) |
| 右肩短接线 | 原向下的细棕线已消除，肩面浅色和下方暖色转折保持；未把内部边界重新描成外轮廓。 | [细部](evidence/right-seam-comparison.png) · [完整旧肩带及皮肤交界](evidence/right-strap-comparison.png) |
| 颈根与锁骨 | 颈侧阴影、锁骨两侧不对称线及高光连续；没有新斜带、浅色接头，未改已有颈肩修画。 | [对照](evidence/neck-collarbone-comparison.png) |
| 原低领口、胸前至底缘 | 已有皮肤体积贯穿旧U形衣缘，没有白蓝布料、弧形滚边或横向衣料底带；保留上游渐变和中央原有明暗。 | [对照](evidence/lower-neckline-comparison.png) |
| 左肩臂至腋窝 | 原肩面暖色转折向腋窝收束，腋窝线保持；原肩臂体积没有因本步修接变平。 | [对照](evidence/left-arm-joint-comparison.png) |
| 右肩臂至腋窝 | 本侧浅暖皮肤和较深的腋窝转折保持，未把体积交界当衣边擦除。 | [对照](evidence/right-arm-joint-comparison.png) |

1. **独显与完整底纹：** 已在Krita逐层独显全部41个绘画层，并导出原始绘画底纹；重点核查双臂、颈、torso和breast。[torso独显](evidence/solo/0040-body-torso.png)及[完整底纹](evidence/raw/0040-body-torso.png)中没有衣料。torso的肩根接色保持细微暖色变化，没有平涂大块；蒙版造成的独显透明渐隐是既有控制，不是灰色绘画。0050完整纹理至画布底缘连续，无布料残带。[五个皮肤层底纹汇看](evidence/raw-skin-sheet.png) · [默认蒙版独显汇看](evidence/solo-skin-sheet.png)。
2. **相邻层合看、隐藏遮挡：** 分别查看[颈与躯干](evidence/joints/neck-torso.png)、[肩臂颈躯干](evidence/joints/shoulders-torso.png)、[全部相关皮肤](evidence/joints/all-skin.png)。无头发和脸部遮挡时，实际颈根接色和肩臂体积仍连续；两侧短线修除后没有新增硬接头。胸前混合保留原生蒙版，未重描内部深度边界。[隐藏torso上方层](evidence/under/0040-body-torso.png)。
3. **完整合成：** 查看最新保存工程及最终重开导出的完整合成、[100%全宽躯干](evidence/final-body-100.png)和上述300%局部。皮肤的浅暖底色、暖粉转折、原有线条和高光保持，原肩带、低领口范围未见衣料颜色或旧滚边；新改动没有扩散到肩头、锁骨、颈根或腋窝。对照覆盖完整旧衣料位置与邻近皮肤，不仅是未改保护区。

## 保存、重开与文件核对

每批原生修画均保存KRA，并从该工程导出实际投影检查。正式KRA保存后，通过Krita原生Cmd+W关闭；使用原生打开对话框选择正式绝对路径重开。核对41个绘画层和22个蒙版的像素、名称、UUID、层序、父子关系、默认显隐及alpha继承与保存前一致，合成投影也一致。随后从重开文档原生导出 `character-dressup-base.png`，在PNG对话框保留透明通道；未单独修饰导出图。[重开核对](evidence/reopen-check.json)。

输出为1145×1374、RGBA透明背景。像素核对显示本步仅torso的两个局部RGB改变；该层alpha保持，其他40个绘画层和全部22个蒙版保持。[保留与文件记录](evidence/changes.json)。这些记录用于证明工程一致性，画面结论来自上述实际看图。

本步没有已确认而未修复的衣料残留或新增局部接缝。保留上游已确认的身体分层、皮肤风格与隐藏补全设计；本交付不包含画外腰腿，也不包含动态绑定验证。未新增乳头、生殖器或其他衣下人体细节。

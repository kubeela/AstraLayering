结论：已修复

# 返修01逐项结果

继续当前[clothing-depth.kra](clothing-depth.kra)，932×1688，14个逻辑part、32个普通绘画层；无蒙版、无子节点、无人体占位层。当前KRA SHA-256为 `56561f759db31d2ac8cb18697af202d3d30bdf0a3a8581d1d595b6f40ad148df`。

按[review-01.md](review-01.md)的R1–R8编号、原画布框、独显与隐藏证据逐项定位。唯一绘画参考为[clothing.png](../../clothing-part-layering/references/clothing.png)，形状和职责读取上游parts、groups.json及occlusion.json。所有对照保持参考原坐标、原尺寸，未移动或缩放参考；人物简化图没有作为纹理来源。

[最新合成PNG](clothing-depth.png)；[固定坐标整体对照](repair-evidence/repair-01/full-reference-vs-current.png)。

## R1–R8处理与检查

### R1　已修复并自检

实际层：`0038 halter_dress/halter_bodice :: depth_38；0040 chest_pendant 保留独立`。原review框：`[427,266,82,44]`。

恢复原坐标中央V形花瓣、瓣尖与固定细金边，清掉横向桥状补绘及下缘残点；两个真实领口开口保留，领后16和胸饰40仍独立。

0038独显、隐藏40、全合成均已核对。胸饰原始层像素保持不变。

[原尺寸对照/独显/隐藏状态](repair-evidence/repair-01/R1-final-1x.png)；[同坐标3倍诊断](repair-evidence/repair-01/R1-final-3x.png)。

### R2　已修复并自检

实际层：`0038 halter_dress/halter_bodice :: depth_38；0014/0034 halter_dress/short_outer_skirt/right_skirt_panel；0015/0035 halter_dress/short_outer_skirt/left_skirt_panel；0037 halter_dress/short_outer_skirt/front_drape`。原review框：`[380,488,165,62]`。

保留四片已生成、配准的腰根及内部伪透明修订。按各片可见归属排除腰结、带尾和上层衣片，只恢复本片自己的可见布面；隐藏区保留实际生成衣料，并作局部颜色配准。随后在Krita用本片布色沿竖褶逐笔接亮面和紫粉折面，把中央片圆盖状色面改成连续长褶，去掉规则白点。未新增腰缝或顶层腰带。

38、34、35、37分别按原尺寸独显；隐藏饰物、再隐藏38查看三片裙根，最后全合成核对。原x470–540/y510–530横向色阶已消除，中央腰根无圆盖状接头，竖褶连续接入下方衣料；后绕14/15、收腰位置、蓝珠及三件腰饰保持。

[原尺寸对照/独显/隐藏状态](repair-evidence/repair-01/R2-final-1x.png)；[同坐标3倍诊断](repair-evidence/repair-01/R2-final-3x.png)。

### R3　已修复并自检

实际层：`0034/0032 halter_dress/short_outer_skirt/right_skirt_panel；0037/0036 halter_dress/short_outer_skirt/front_drape`。原review框：`[375,516,51,290]`。

用本片自有可见布面恢复有效深褶，修掉长浅色追边和重复短划；重复生成的青蓝珠点改回粉布。左窗口蓝紫自卷面分别留在侧裙32与中央片36，花瓣仍属31。

两片分别独显、37以下叠加与全合成均检查；长浅色追边、规则短划和下端二重粉线已清理，原位有效蓝花、珠点及露花缺口保留。上端腰根亦在本次R2终修后复核。

[原尺寸对照/独显/隐藏状态](repair-evidence/repair-01/R3-final-1x.png)；[同坐标3倍诊断](repair-evidence/repair-01/R3-final-3x.png)。

### R4　已修复并自检

实际层：`0037 halter_dress/short_outer_skirt/front_drape :: depth_37；0035 halter_dress/short_outer_skirt/left_skirt_panel :: depth_35`。原review框：`[470,514,111,230]`。

保留已恢复的可见长斜自由边及中央片自身深褶，只在35自有可见区恢复相应参考衣料。在隐藏搭接区内，以本片布色用Krita软画笔顺弯褶连续修画；将上一轮x477–500/y608–665宽平椭圆补块改为渐变收窄的紫粉窄面，并延长接顺下段亮面。逐段取色产生色带的中间试笔已再次修掉。

35、37各自独显、隐藏37及更上层、再全合成检查：无原规则短划、额外白粉长镶边或宽平椭圆收尾。深褶沿弯曲方向接入原有布面；右侧蓝花、小珠、约(577,731)翻起自由端和正常缺口均保留。没有移动图层或改层序遮盖问题。

[原尺寸对照/独显/隐藏状态](repair-evidence/repair-01/R4-final-1x.png)；[同坐标3倍诊断](repair-evidence/repair-01/R4-final-3x.png)。

### R5　已修复并自检

实际层：`0031 floral_skirt_undertrim :: depth_31；0013后绕职责保留`。原review框：`[156,776,266,74]`。

移除原粉裙边残条，采用新生成的同一花簇瓣纹局部接头并逐瓣修线、接色。没有用粉裙去覆盖错误归属；自卷裙料继续留在32/36。

31独显、隐藏全部外裙、13/31同part合看与全叠加均核对，左段没有原粉布条，既有蓝花与穗边、正常缺口保留。

[原尺寸对照/独显/隐藏状态](repair-evidence/repair-01/R5-final-1x.png)；[同坐标3倍诊断](repair-evidence/repair-01/R5-final-3x.png)。

### R6　已修复并自检

实际层：`0031 floral_skirt_undertrim :: depth_31`。原review框：`[535,774,241,87]`。

清掉约x543–556/y800–817粉裙楔片及旧裙缘短粉线，以蓝紫/青蓝花瓣恢复接头；保留31自身轮廓和花串延伸。

右窗口、下方青蓝穗边和外侧花串已在独显、隐藏上层及全合成中核对；没有把中央/侧裙翻边归入花簇，也没有封闭正常缺口。

[原尺寸对照/独显/隐藏状态](repair-evidence/repair-01/R6-final-1x.png)；[同坐标3倍诊断](repair-evidence/repair-01/R6-final-3x.png)。

### R7　已修复并自检

实际层：`0007 trailing_skirt_image_left :: depth_07；同part1/3/5/9/11保持`。原review框：`[200,828,173,89]`。

上根两次生成尝试保留记录，未把带有上盖分界或漏根的结果直接验收；在实际生成基础上用Krita画笔重画柔和蓝紫褶面、接头及稀疏星点。原有自有水滴、固定金缘和下方可见星点面保留。

7独显、六片合看及12以下隐藏上层状态中，原近横向硬接和圆形残饰已去掉；浅色卷面、紫红舌与中央空域保留。隐藏根部纹样属于延续推断。

[原尺寸对照/独显/隐藏状态](repair-evidence/repair-01/R7-final-1x.png)；[同坐标3倍诊断](repair-evidence/repair-01/R7-final-3x.png)。

### R8　已修复并自检

实际层：`0008/0010/0012 trailing_skirt_image_right/short_drape_left；0006后方长尾保持独立`。原review框：`[580,836,160,87]`。

核实灰白矩形内含错误透明/半透明像素，在8层补足连续蓝紫布面，再修色与星点；清掉灰块和突兀硬褶。自有原坠纹按自身轮廓接回，未保留矩形贴片边。

8独显、8/10/12同part合看、隐藏花簇短裙及全合成均核对。约x690–729/y881–913青点浅色翻面仍在10；没有归到6或封住真正翻口。

[原尺寸对照/独显/隐藏状态](repair-evidence/repair-01/R8-final-1x.png)；[同坐标3倍诊断](repair-evidence/repair-01/R8-final-3x.png)。

## 续修批次与来源

本轮累计9次image_gen局部生成，原始输入、红黄绿控制、完整提示词及采用/未采用原因见[生成记录](repair-evidence/repair-01/generation.json)。已成功落盘的请求在续跑中未重复；没有新增生图请求或拒绝。初次14次控制图和18次衣片绘画记录亦保留。当前隐藏补全来自实际生成与Krita绘画，未用参考遮挡物、人像或相邻衣片替代。

参考覆盖只选取本片自己的可见衣料；腰结、带尾、胸饰和上层衣片被排除。隐藏区的局部颜色配准以保留生成衣料为基础，不向其中复制参考遮挡物纹样。接头经Krita实际画笔修色和接褶；没有用颜色阈值平涂、全层模糊、蒙版或错误覆盖替代修画，也未新增阴影、AO或投影。

本次继续使用上轮已生成的四片腰根及合格花簇/拖尾，不重复生成。腰根先局部颜色配准，再以长笔接顺自身布褶；R4在临时选区内逐段修画，交付时选区已清空，没有新增节点。早期逐段取色形成色带、参考接头带入圆盖状色面的中间版本均未作为终稿；当前采用 `inspection/repair-01-continuation-fold-finished/` 所示绘画，并经之后保存重开核对。相关脚本、局部输入和试画保留于本步骤。

## 分层与上游一致性

直接更新上游[groups.json](../../clothing-part-layering/groups.json)、[occlusion.json](../../clothing-part-layering/occlusion.json)、7个受影响终止SVG及3个父SVG，保留8个未涉及SVG；同步preview.svg、当前PNG/alpha指纹和部件记录。本次续修没有新增控制节点、改层序或新增深度片：R2/R4属于原层内部绘画接续，既有前后绕及自卷的32层结构已足够，继续保留共同运动身份。[18个SVG/14个终止引用核验](current-structure-verification.json)通过；[修订记录](repair-evidence/repair-01/upstream-repair-records.json)。预览指纹 `6dc1ee74cd0adb8f683fd860f12cd206d3fc04db8e61599ffff45c3133ce2269`；遮挡来源指纹 `c3156449f564a63b3646aa9f115b5c2ceb65d3f22bd9d8fec188e14390de696c`。未恢复旧上游副本，未重启上游流程。

|实际普通绘画层|深度及区域|独显/合片核对|
|---|---|---|
|`0001 trailing_skirt_image_left :: depth_01`|1；左长尾后续窄面、最低拖尖|既有合格绘画保留，独显及同part合看无新增问题。|
|`0002 trailing_skirt_image_right/spiral_train_left :: depth_02`|2；右长尾后续窄面、最低拖尖|既有合格绘画保留，独显及同part合看无新增问题。|
|`0003 trailing_skirt_image_left :: depth_03`|3；左下段朝前宽卷面|既有合格绘画保留，独显及同part合看无新增问题。|
|`0004 trailing_skirt_image_right/spiral_train_left :: depth_04`|4；右下段朝前宽卷面|既有合格绘画保留，独显及同part合看无新增问题。|
|`0005 trailing_skirt_image_left :: depth_05`|5；左上段浅色连续翻卷|既有合格绘画保留，独显及同part合看无新增问题。|
|`0006 trailing_skirt_image_right/spiral_train_left :: depth_06`|6；右长尾上根与浅色连续卷面|既有合格绘画保留，独显及同part合看无新增问题。|
|`0007 trailing_skirt_image_left :: depth_07`|7；左深色星点根部、固定金缘|R7隐藏根部布面与星点接续已修。|
|`0008 trailing_skirt_image_right/short_drape_left :: depth_08`|8；右短垂布深色根部及金缘|R8灰块及矩形透明缺损已补，连续布面保留。|
|`0009 trailing_skirt_image_left :: depth_09`|9；左浅色回翻舌|既有合格绘画保留，独显及同part合看无新增问题。|
|`0010 trailing_skirt_image_right/short_drape_left :: depth_10`|10；右上下浅色回翻；含青点小翻面|青点小翻面仍归短布10，后方长尾6独立。|
|`0011 trailing_skirt_image_left :: depth_11`|11；左紫红回压卷舌|既有合格绘画保留，独显及同part合看无新增问题。|
|`0012 trailing_skirt_image_right/short_drape_left :: depth_12`|12；右紫红收尖回压舌|既有合格绘画保留，独显及同part合看无新增问题。|
|`0013 floral_skirt_undertrim :: depth_13`|13；花簇两端侧后绕|既有合格绘画保留，独显及同part合看无新增问题。|
|`0014 halter_dress/short_outer_skirt/right_skirt_panel :: depth_14`|14；画面左裙侧后腰根|R2侧后绕根部保留，原尺寸合片检查连续。|
|`0015 halter_dress/short_outer_skirt/left_skirt_panel :: depth_15`|15；画面右裙侧后腰根|R2侧后绕根部保留，原尺寸合片检查连续。|
|`0016 halter_dress/halter_bodice :: depth_16`|16；两侧颈后绕窄端|既有合格绘画保留，独显及同part合看无新增问题。|
|`0017 puff_sleeve_image_left :: depth_17`|17；左袖后绕窄接合、后袖口弧|既有合格绘画保留，独显及同part合看无新增问题。|
|`0018 puff_sleeve_image_right :: depth_18`|18；右袖后绕窄接合、后袖口弧|既有合格绘画保留，独显及同part合看无新增问题。|
|`0029 puff_sleeve_image_left :: depth_29`|29；左袖前鼓面、波浪袖缘|既有合格绘画保留，独显及同part合看无新增问题。|
|`0030 puff_sleeve_image_right :: depth_30`|30；右袖前鼓面、波浪袖缘|既有合格绘画保留，独显及同part合看无新增问题。|
|`0031 floral_skirt_undertrim :: depth_31`|31；前花串、叶瓣、穗边、窗口小簇|R5/R6粉裙残片移除，花瓣连续。|
|`0032 halter_dress/short_outer_skirt/right_skirt_panel :: depth_32`|32；左侧裙自卷反面、小翻边|R3自卷面接续保留，不迁入花瓣。|
|`0033 halter_dress/short_outer_skirt/left_skirt_panel :: depth_33`|33；右侧裙自卷反面、外摆窄翻边|既有合格绘画保留，独显及同part合看无新增问题。|
|`0034 halter_dress/short_outer_skirt/right_skirt_panel :: depth_34`|34；画面左侧前裙面、腰根与固定蓝饰|R2腰根、R3长交界已修顺。|
|`0035 halter_dress/short_outer_skirt/left_skirt_panel :: depth_35`|35；画面右侧前裙面、腰根与固定蓝饰|R2腰根、R4隐藏窄面及自由边已修顺。|
|`0036 halter_dress/short_outer_skirt/front_drape :: depth_36`|36；中央垂布两侧自卷反面|R3/R4自卷反面接续、真实缺口保留。|
|`0037 halter_dress/short_outer_skirt/front_drape :: depth_37`|37；中央垂布主面、腰根与自由端|R2连续竖褶、R3/R4自由交界已修顺。|
|`0038 halter_dress/halter_bodice :: depth_38`|38；前领V瓣、固定边、胸腹与腰布|R1领瓣恢复，R2腰根交接已修顺。|
|`0040 chest_pendant`|40；独立卷枝胸饰|既有合格绘画保留，独显及同part合看无新增问题。|
|`0041 waist_bow/short_tail`|41；独立短带尾|既有合格绘画保留，独显及同part合看无新增问题。|
|`0042 waist_bow/long_tail`|42；独立长带尾|既有合格绘画保留，独显及同part合看无新增问题。|
|`0043 waist_bow/knot_and_loops`|43；结与两耳|既有合格绘画保留，独显及同part合看无新增问题。|

## 独显、隐藏、组合与重开

累计检查覆盖32张单层、14张同part合片、32个逐级隐藏上层状态及全合成，最新导出均在 `repair-evidence/repair-01/final/`。`upper-hidden/NNNN.png` 保留该深度及更后方层。原尺寸检索页：[01](inspection/reopened/solo-page-01.png)、[02](inspection/reopened/solo-page-02.png)。此次续修只改34、35、37、38；四层完整原尺寸独显另存于 `repair-evidence/repair-01/continuation/native-size-solos/`。对R1–R8重新查看固定坐标对照及相应隐藏状态，合成大轮廓、自由边与部件接合自然。未以像素相似率或结构检查替代看图。

保存后关闭并重新打开同一路径KRA，[重开核对](repair-evidence/repair-01/reopen-verification.json)确认32层名称、顺序、属性、逐层像素与合成投影相同，全部普通paintlayer、无子节点、全部可见。[clothing-depth.png](clothing-depth.png)与保存KRA的实际投影一致。

7个未涉及逻辑part（左右袖、胸饰、三件腰饰、右侧长尾）RGBA精确保留，[保留记录](repair-evidence/repair-01/unaffected-exact-preservation.json)。[产物清点](repair-evidence/repair-01/delivery-checks.json)列明累计改变层及哈希；[分片/指纹核验](repair-evidence/repair-01/continuity-and-artifact-checks.json)确认同part深度片互补，合起来等于完整part的alpha，SVG和当前PNG一致。累计画笔日志1172条，含被淘汰的中间试笔，不作为画质得分。

## 偏差与阶段边界

隐藏根部的细褶、花簇被遮瓣片及星点安排仍属同衣片的合理延续推断，无法与参考中的遮挡物逐像素对应。R2隐藏竖褶较参考可见细褶略简化；R4隐藏窄面按本侧原褶延续；R7/R8上根星点较稀疏。它们在独显及隐藏上层状态中连续，没有把外层物体补进去。少量边缘阶梯、细微抗锯齿和半透明柔边留第二步，正常领口、袖口、裙缘翻口、纱感与中央空域保持。本轮没有未解决的第一步轮廓缺口、错位、错属或显著材质硬接。


补充重开核对：显式重新建立并显示当前KRA视图，活动视图与当前工程根节点UUID一致，32层属性/像素仍与验收证据相同，见[显式重开记录](repair-evidence/repair-01/continuation/explicit-view-reopen.json)。界面抓图期间出现旧帧/菜单残留的不同步现象，该截图未作为当前画质证据；最终看图使用重开KRA直接导出的单层、隐藏状态和投影PNG。另核对[KRA内置合成图](repair-evidence/repair-01/continuation/merged-image-verification.json)，与当前PNG一致，保存文件没有旧合成缓存。

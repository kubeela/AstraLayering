结论：已修复

# 返修02逐项结果

继续当前[clothing-depth.kra](clothing-depth.kra)，932×1688、14个逻辑part、32个普通绘画层，无蒙版、子节点或人体占位层。当前SHA-256：`4ab1b3a49f127a48d4d745775618d95acd43c05d63df828ad8bc034d7495f8b1`。本轮R1/R2编号对应[review-02.md](review-02.md)，与review-01同号项目不同。

绘画参考仅为[clothing.png](../../clothing-part-layering/references/clothing.png)，与上轮一致。直接读取上游parts、groups.json、occlusion.json判断形状、归属和深度；没有从旧输入副本恢复上游。所有对照按同一原画布坐标裁切，原尺寸图1像素对应源图1像素，放大诊断对各列使用同倍率，未移动或缩放参考来拟合工程。人物参考没有用作纹理来源。

## R1　左花簇下缘及浅色接头

在 `0031 floral_skirt_undertrim :: depth_31` 按参考两枚花瓣各自的真实弧形边恢复约x218–247/y873–887的可见蓝灰/青蓝瓣面，补足被削去的下垂瓣缘，再用Krita画笔逐瓣接线、收色。在 `0007 trailing_skirt_image_left :: depth_07` 清掉接头浅粉横桥和原附着的瓣缘残纹，沿本片浅色翻面修顺窄接触区；原生成布面继续保留，浅色圆点翻面、星点、水滴和金缘没有移到花簇。独显发现偏平的宽灰补片试画没有作为终稿，改为狭窄接头顺布面修画。

已按原框 `[208,868,74,28]` 查看31独显、7独显、隐藏31及全部叠加；原跨越多个瓣缘的粉白横线消除，瓣缘各自起伏，不再近水平削平。7单独看仍为自身衣料，花瓣描线仅留31；下方浅色圆点翻面保留。没有用整条蓝色带扩大覆盖，也没有把浅色翻面归入花簇。

[原尺寸对照](repair-evidence/repair-02/R1-final-1x.png)；[4倍同坐标诊断](repair-evidence/repair-02/R1-final-4x.png)；[完整局部1倍](repair-evidence/repair-02/R1-context-1x.png)。

## R2　右短垂布越界与翻面接合

直接修 `0008 trailing_skirt_image_right/short_drape_left :: depth_08` 的轮廓，收回约x716–735/y883–905越界深紫突出；根部沿约(720,867)—(716,872)—(711,876)—(704,879)—(695,881)附近的连续布边接青点翻面后侧，花簇之后的必要根部搭接仍在。`0006 trailing_skirt_image_right/spiral_train_left :: depth_06` 的浅粉长尾自然露出，未移动、改层序或把其像素贴到8。

收边后复查发现两处原先被深紫覆盖掩盖的小接头：31在右侧约x685–716/y875–885亦缺少自有瓣尖，已逐瓣恢复；10上沿有深紫短横及一两像素的自身窄根缺口，已用Krita本片浅色布色续接。青点翻面仍在 `0010 trailing_skirt_image_right/short_drape_left :: depth_10` 原位。窄根涉及的12个同片既有像素从8让到10，保持8/10互补，没有新增独立控制或深度层。这是组装中本轮新发现的局部分界修订，原8/10/12多深度职责继续使用。

已按原框 `[691,871,53,43]` 查看8独显、10独显、8/10/12合片、与6合看及全部叠加，并单独隐藏8复查。宽深紫横帽及右下硬角已消除，圆点翻面外围与浅粉长尾接续自然；6以及同part的2/4均保留原始像素，10的青点、下方浅色回翻与12紫红舌保持。

[原尺寸对照](repair-evidence/repair-02/R2-final-1x.png)；[4倍同坐标诊断](repair-evidence/repair-02/R2-final-4x.png)；[完整局部1倍](repair-evidence/repair-02/R2-context-1x.png)；[8/10局部分配记录](repair-evidence/repair-02/same-part-fold-root.json)。

## 实际图层、区域及分界

直接更新上游[groups.json](../../clothing-part-layering/groups.json)、[occlusion.json](../../clothing-part-layering/occlusion.json)、3个受影响终止SVG及1个父SVG；其余14个SVG保持。更新preview.svg、当前PNG/alpha来源指纹、parts-manifest及部件generation记录，历史生成与repair01记录不替换。逻辑节点仍为14个，实际层仍为32个，层序未变；只有当前轮廓、接头和8/10既有分界微调。区域、前后对象与连续分界已写入各level说明，见[本轮上游修订清单](repair-evidence/repair-02/upstream-repair-records.json)。[结构核验](current-structure-verification.json)确认18个SVG可解析、14个终止引用完整、当前来源匹配。预览来源 `b2d9fe1bea08b7f5ac14bf815c3d0570c20393d058bb97dd6604b374281b20e9`；遮挡来源 `0cac930e961c3f301e22da104a80f1a853120a318e76c9b86a46d5487b5c68bb`。

|实际普通绘画层|最终深度/区域|本轮结果|
|---|---|---|
|`0001 trailing_skirt_image_left :: depth_01`|1；左长尾后续窄面、最低拖尖|保持review-02已确认的合格绘画，原始层像素未变。|
|`0002 trailing_skirt_image_right/spiral_train_left :: depth_02`|2；右长尾后续窄面、最低拖尖|保持review-02已确认的合格绘画，原始层像素未变。|
|`0003 trailing_skirt_image_left :: depth_03`|3；左下段朝前宽卷面|保持review-02已确认的合格绘画，原始层像素未变。|
|`0004 trailing_skirt_image_right/spiral_train_left :: depth_04`|4；右下段朝前宽卷面|保持review-02已确认的合格绘画，原始层像素未变。|
|`0005 trailing_skirt_image_left :: depth_05`|5；左上段浅色连续翻卷|保持review-02已确认的合格绘画，原始层像素未变。|
|`0006 trailing_skirt_image_right/spiral_train_left :: depth_06`|6；右长尾上根与浅色连续卷面|后方长尾保留原位及原始像素，本轮未复制入8或10。|
|`0007 trailing_skirt_image_left :: depth_07`|7；左深色星点根部、固定金缘|本轮R1：修顺浅色接头、清掉横桥/瓣缘残纹；自有圆点、星点及水滴保留。|
|`0008 trailing_skirt_image_right/short_drape_left :: depth_08`|8；右短垂布深色根部及金缘|本轮R2：收回右上深紫外扩，花簇后根部搭接保持。|
|`0009 trailing_skirt_image_left :: depth_09`|9；左浅色回翻舌|保持review-02已确认的合格绘画，原始层像素未变。|
|`0010 trailing_skirt_image_right/short_drape_left :: depth_10`|10；右上下浅色回翻；含青点小翻面|本轮R2：青点翻面保持本层；上沿窄根续接，原深紫短横清掉。|
|`0011 trailing_skirt_image_left :: depth_11`|11；左紫红回压卷舌|保持review-02已确认的合格绘画，原始层像素未变。|
|`0012 trailing_skirt_image_right/short_drape_left :: depth_12`|12；右紫红收尖回压舌|保持review-02已确认的合格绘画，原始层像素未变。|
|`0013 floral_skirt_undertrim :: depth_13`|13；花簇两端侧后绕|侧后绕花簇保持，未扩大或改绘画；与31互补。|
|`0014 halter_dress/short_outer_skirt/right_skirt_panel :: depth_14`|14；画面左裙侧后腰根|保持review-02已确认的合格绘画，原始层像素未变。|
|`0015 halter_dress/short_outer_skirt/left_skirt_panel :: depth_15`|15；画面右裙侧后腰根|保持review-02已确认的合格绘画，原始层像素未变。|
|`0016 halter_dress/halter_bodice :: depth_16`|16；两侧颈后绕窄端|保持review-02已确认的合格绘画，原始层像素未变。|
|`0017 puff_sleeve_image_left :: depth_17`|17；左袖后绕窄接合、后袖口弧|保持review-02已确认的合格绘画，原始层像素未变。|
|`0018 puff_sleeve_image_right :: depth_18`|18；右袖后绕窄接合、后袖口弧|保持review-02已确认的合格绘画，原始层像素未变。|
|`0029 puff_sleeve_image_left :: depth_29`|29；左袖前鼓面、波浪袖缘|保持review-02已确认的合格绘画，原始层像素未变。|
|`0030 puff_sleeve_image_right :: depth_30`|30；右袖前鼓面、波浪袖缘|保持review-02已确认的合格绘画，原始层像素未变。|
|`0031 floral_skirt_undertrim :: depth_31`|31；前花串、叶瓣、穗边、窗口小簇|本轮R1及R2接合复查：分别恢复左下和右接触处自有花瓣的真实瓣缘。|
|`0032 halter_dress/short_outer_skirt/right_skirt_panel :: depth_32`|32；左侧裙自卷反面、小翻边|保持review-02已确认的合格绘画，原始层像素未变。|
|`0033 halter_dress/short_outer_skirt/left_skirt_panel :: depth_33`|33；右侧裙自卷反面、外摆窄翻边|保持review-02已确认的合格绘画，原始层像素未变。|
|`0034 halter_dress/short_outer_skirt/right_skirt_panel :: depth_34`|34；画面左侧前裙面、腰根与固定蓝饰|保持review-02已确认的合格绘画，原始层像素未变。|
|`0035 halter_dress/short_outer_skirt/left_skirt_panel :: depth_35`|35；画面右侧前裙面、腰根与固定蓝饰|保持review-02已确认的合格绘画，原始层像素未变。|
|`0036 halter_dress/short_outer_skirt/front_drape :: depth_36`|36；中央垂布两侧自卷反面|保持review-02已确认的合格绘画，原始层像素未变。|
|`0037 halter_dress/short_outer_skirt/front_drape :: depth_37`|37；中央垂布主面、腰根与自由端|保持review-02已确认的合格绘画，原始层像素未变。|
|`0038 halter_dress/halter_bodice :: depth_38`|38；前领V瓣、固定边、胸腹与腰布|保持review-02已确认的合格绘画，原始层像素未变。|
|`0040 chest_pendant`|40；独立卷枝胸饰|保持review-02已确认的合格绘画，原始层像素未变。|
|`0041 waist_bow/short_tail`|41；独立短带尾|保持review-02已确认的合格绘画，原始层像素未变。|
|`0042 waist_bow/long_tail`|42；独立长带尾|保持review-02已确认的合格绘画，原始层像素未变。|
|`0043 waist_bow/knot_and_loops`|43；结与两耳|保持review-02已确认的合格绘画，原始层像素未变。|

## 独显、隐藏、全叠加及重开

最新证据在 `repair-evidence/repair-02/final/`：32张独显、14张同part合片、32个逐级隐藏上层状态及全合成；另存单独隐藏31和8的实际投影。此次重点以原尺寸独显复核7、8、10、31四层及两处接合，再作同part合看/隐藏/全合成对照。原尺寸检索页[01](inspection/reopened/solo-page-01.png)、[02](inspection/reopened/solo-page-02.png)用于定位，未替代局部看图。[固定原坐标整体对照](repair-evidence/repair-02/full-reference-vs-current.png)。

每批修改均保存当前工程；最终保存后关闭并重新打开同一路径KRA，[重开核验](repair-evidence/repair-02/reopen-verification.json)确认32层名称、顺序、属性、逐层像素及合成投影与关闭前相同，全部普通paintlayer、无子节点、全部可见、选区已清空。当前[clothing-depth.png](clothing-depth.png)、KRA内置mergedimage及实际投影RGBA一致。Krita重开界面也已查看完整衣装。

[产物核验](repair-evidence/repair-02/delivery-checks.json)确认只改7、8、10、31，其他28层原始像素保持；11个未涉及逻辑part的RGBA精确保留，包括全部上身、袖子、腰饰、三片短裙和右长尾。14个完整part与各自深度片的alpha并集一致，同part深度片互补无重复覆盖，当前SVG alpha指纹与PNG一致。这些核验只用于保存、归属及结构，不作为画质评分。

## 来源、历史及偏差

本轮没有新建或重做完整衣片，既有41次生成请求及已合格补全继续使用，没有重复生图。R1只恢复本花簇真实可见像素并修画原生成接头；R2收回越界像素，10的极窄自身缺口用现有同片衣料布色适当补画。没有用参考遮挡物替代生成补全，没有把长尾、花瓣或人体贴进其他层。没有新增阴影、AO、投影，也没有用全层模糊或颜色阈值填色替代绘画。

修前KRA、PNG与绘画报告保存在 `repair-evidence/repair-02/before/`，修前完整层/part导出保留在 `inspection/repair-02-before/`；上一轮[repair-01.md](repair-01.md)和对应证据作为历史成果保留。当前工程沿用本次已保存修改，没有重启上游或改写前序人物工程。

本轮两项第一步内容/轮廓问题均已通过自检。局部新接头的隐藏细纹为同一衣料的合理延续，翻面青点和细褶略有手工接色；少量花瓣尖端抗锯齿、孤立细边像素和半透明柔边仍可在第二步精修。没有将可见横桥、深紫外扩或归属冲突留给第二步。正常花瓣空隙、领口、袖口、裙缘翻口、纱感及中央空域保持。

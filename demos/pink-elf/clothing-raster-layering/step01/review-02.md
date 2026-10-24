结论：需要修复

# 第一步独立视觉 review 02

已完成 14 个逻辑 part、32 个普通绘画层的检查。整体轮廓、比例、主要褶面和饰物位置已接近参考；上一轮领口及长裙片交界的主要问题已改善。本轮确认两处仍需修复：左花簇与垂布交界出现额外粉白横桥、瓣缘接续不完整；右短垂布的深紫根部越界覆盖浅色长尾。两项均在当前全部叠加中可见，并已用独显和隐藏图层定位。

**本报告 R1、R2 是本轮编号，不对应 review-01 的同号问题。** 本轮没有确认需要重新拆组、合层或改变现有层序的问题。

## 输入与实际检查

- 工程：[clothing-depth.kra](clothing-depth.kra)，932 × 1688。在 Krita 5.3.4.1 中从磁盘重新打开，独立读取当前图层与投影；没有以制作报告或旧导出替代当前工程检查。
- 唯一绘画参考：[clothing.png](../../clothing-part-layering/references/clothing.png)，与 [report.md](report.md) 一致。所有局部采用相同原画布坐标裁切，参考没有移动、缩放或重新配准。观察用放大对对照各侧采用相同倍率。
- 已阅读正式 [review-01.md](review-01.md)、[repair-01.md](repair-01.md) 和制作报告；上游 [parts/](../../clothing-part-layering/parts/)、[groups.json](../../clothing-part-layering/groups.json)、[occlusion.json](../../clothing-part-layering/occlusion.json) 用于核对职责和深度分片。临时文件没有作为完成证明。
- 先看原尺寸整体，再分区域以 200–400% 查看上身、袖子、饰物、三片短裙、花簇、深色根部、浅色回翻及最低拖尾。Krita 实际切换全部叠加、花簇独显和隐藏外裙／花簇状态；另从本次打开的 KRA 导出全部 32 张独显、14 张同 part 合片及 32 个逐级隐藏上层状态，检查分片衔接和归属。
- 对两项疑点补做原坐标 400% 局部对照，并单独隐藏 8、31 层确认来源。参考中的遮挡物没有被当作隐藏区应补内容；合理的根部延伸、同 part 多层及真实翻口没有被当成错误。
- 本轮只检查衣服，不做身体装配、身体插层说明、阴影、AO 或投影。抗锯齿、细小软边和半透明边缘精修留给第二步；下列两项是可见内容／轮廓组合问题。

## 证据入口

- [全合成编号框选](review-evidence/31bc0a3f-4690-47f5-a8c4-4ea3f3af4854/marked.png)；[问题坐标与图层记录](review-evidence/31bc0a3f-4690-47f5-a8c4-4ea3f3af4854/regions.json)。框选工具仅记录本轮看图判断。
- [当前 KRA 原始全合成](review-evidence/review-02/current-all.png)、[KRA 内置合成](review-evidence/review-02/kra-merged.png)、[Krita 100% 整体截图](review-evidence/review-02/krita-100-all.png)、[200% 裙摆组合](review-evidence/review-02/krita-200-all.png)、[300% 花簇独显](review-evidence/review-02/krita-300-flower.png)、[约 267% 隐藏外裙及花簇](review-evidence/review-02/krita-hidden-roots.png)。
- [32 层与 14 part 的本轮导出清单](review-evidence/review-02/export-verification.json)。完整原尺寸独显在 `review-evidence/review-02/solos/NNNN.png`，同 part 合片在 `parts/<完整 part ID>.png`，逐级隐藏在 `upper-hidden/NNNN.png`；后者保留该深度及所有更后方层。
- 独显检索页：[01](review-evidence/review-02/solo-sheet-01.png)、[02](review-evidence/review-02/solo-sheet-02.png)、[03](review-evidence/review-02/solo-sheet-03.png)、[04](review-evidence/review-02/solo-sheet-04.png)。检索页不代替局部放大检查。

## 确定问题与修复要求

### R1　左花簇下缘与垂布之间出现粉白横桥，瓣缘接续不完整

- **相关图层：** 主责 `0031 floral_skirt_undertrim :: depth_31`，同时修核 `0007 trailing_skirt_image_left :: depth_07` 的接触区；花簇后绕 `0013` 和其余左垂裙分片保持共同归属。
- **位置／框：** `[208,868,74,28]`，画面左花串底部、左垂布浅色圆点翻面上方，主要接头约 x218–266、y875–885。
- **当前表现：** 蓝灰、青蓝瓣缘在这里局部呈近水平削平，下面露出一条粉白色窄桥，横穿几片下垂瓣缘与深色布面的交界。原尺寸可见异色短线，放大后可见它中断了瓣片下缘的自然起伏，并把下方浅色翻面横接到相邻瓣间。
- **参考与独立确认：** 参考是连续起伏的蓝灰／青蓝下缘，下面接深色垂布和原有浅色翻面，没有当前这条横向粉白桥。31 独显可见对应的裁平下缘；隐藏 31 后，7 层的浅色补绘／接头正好在桥线位置露出。当前 31 与 7 的组合没有把这里接完整。这不是上方粉裙的露边，也不是把合理隐藏花瓣按遮挡物判错。
- **影响：** 这是可见花瓣轮廓与相邻布面的内容接合缺口，横线长度跨过多个瓣缘，产生不同材质被横向粘接的观感；不是仅有零星半透明边像素的问题。
- **修复方向：** 先按参考本花簇实际可见的蓝灰／青蓝瓣缘，在 31 恢复被削去的轮廓、瓣面和连续描线；随后核对 7 的本片浅色接头，使其留在正确瓣缘后方，不再从瓣间露出粉白横桥。对补全到可见区的接色，用画笔顺瓣形／布面接自然，不加横向衣缝。不能简单扩大一整条蓝色覆盖带来遮住问题，也不能把垂布的浅色圆点翻面移入花簇。
- **须保留：** 周围真实花瓣和穗边、下方浅色圆点翻面、深色星点布、水滴及固定金缘；原有正常空隙与左垂裙的深度片保留。修的是此处局部接头，不要求重做整个花串或左垂裙。
- **证据：** [框选参考／当前局部](review-evidence/31bc0a3f-4690-47f5-a8c4-4ea3f3af4854/R1-comparison.png)；[31 独显编号对照](review-evidence/d9a7fda2-baa9-404a-ab99-e9c331816fae/R1-comparison.png)；[400% 参考、合成、花簇独显与隐藏花簇后的布面](review-evidence/review-02/suspect-flower-left.png)；[更完整的 400% 接头](review-evidence/review-02/flower-lower-left-confirm.png)。

### R2　右短垂布根部的深紫补绘越界，遮住浅粉长尾

- **相关图层：** 主责 `0008 trailing_skirt_image_right/short_drape_left :: depth_08`；检查同 part 的 `0010 ... :: depth_10` 及后方 `0006 trailing_skirt_image_right/spiral_train_left :: depth_06`。花簇 31 为上方边界核对层。
- **位置／框：** `[691,871,53,43]`，画面右花串底部、带青色圆点的浅色翻面上方及右侧，显眼越界约 x716–735、y883–905。
- **当前表现：** 深紫根部绕浅色圆点翻面形成较宽的横帽与向右下突出的硬角，盖住浅粉长尾上缘。该处原本流向右下的浅色布面被一块深紫色切断，组合后像多出一片深色舌头。
- **参考与独立确认：** 参考在花串下方接浅色翻面及浅粉长尾，右侧没有这块宽深紫突出面。8 独显清楚显示该突出轮廓；在全部叠加中仅隐藏 8，突出深紫块即消失，露出 6 层已存在的浅粉衣料，10 层青点翻面仍在原位。故主体问题是 8 的可见轮廓外扩，而非后方长尾缺画、10 归属错误或整套层序颠倒。
- **影响：** 明显改变短垂布的外露范围、色块比例和长尾接续；属于第一步组合与轮廓错误。上一轮灰白矩形虽然已去掉，不能把填成深紫后新增的覆盖也视为合格补全。
- **修复方向：** 按参考短垂布自己的可见布边收回 8 在此处的越界突出，恢复青点翻面外围与浅粉长尾之间的正常接界；花簇后方仍保留必要深色根部搭接。修顺截口附近本片蓝紫色和固定边线，分别检查 8 独显、8/10/12 合片、与 6 合看及全部叠加。直接修 8 的轮廓，不通过改层序、移动长尾或在 8 贴入浅粉长尾像素消除色块。
- **须保留：** 约 x690–729、y881–913 的青点浅色小翻面继续属于短垂布 10；8 的正常星点／水滴、固定金缘、下方 10 浅色回翻和 12 紫红卷舌保留。长尾 2/4/6 与短垂布 8/10/12 继续是两个独立 part，不合并，不把青点翻面退回长尾 6。
- **证据：** [框选参考／当前局部](review-evidence/31bc0a3f-4690-47f5-a8c4-4ea3f3af4854/R2-comparison.png)；[8 独显编号对照](review-evidence/bc843d5b-4599-47ef-8870-d6be1672237f/R2-comparison.png)；[400% 参考、当前、仅隐藏8、8独显、6独显、10独显](review-evidence/review-02/right-lower-attribution.png)；[完整右根部上下文](review-evidence/review-02/root-right.png)。

## 上一轮修复的当前判断

|review-01 项目|本轮实际看图判断|
|---|---|
|旧 R1 领口 V 瓣|中央 V 形花瓣、瓣尖和固定金边已恢复；两个开口保留，胸饰仍独立。没有重复提出旧横桥问题。|
|旧 R2 腰根|衣身及三片裙根原横向盖片、明显块状色阶已改善。各片独显的主色和竖褶能接入下方布面，未确认需另列的第一步问题。|
|旧 R3、R4 中央裙片两侧长交界|原长浅色追边、规则短划及宽平补块已消除；原有深褶、自由边和两处露花窗口保留。局部线边细修留第二步。|
|旧 R5、R6 花簇内粉裙残片|原两段裙缘粉条／楔片已去掉，花瓣纹理接续总体改善；未见仍需以合层解决的错属。另发现下方接触区问题，列本轮 R1。|
|旧 R7 左深色根部硬接|大范围横向材质切换已改善，上根蓝紫布面可连续接入可见星点面；隐藏装饰的推断本身不判错误。本轮 R1 限于花簇底缘接触处。|
|旧 R8 右灰白矩形|灰白块和原突兀硬褶已去掉；但右上深紫填补外露过量，列本轮 R2，不能以旧缺口已补为由忽略。|

对应局部：[上身对照](review-evidence/review-02/upper-reference-current.png)、[腰部合成与隐藏状态](review-evidence/review-02/waist.png)、[腰根逐片独显](review-evidence/review-02/waist-solos.png)、[左长交界](review-evidence/review-02/seam-left.png)、[右长交界](review-evidence/review-02/seam-right.png)、[左花簇](review-evidence/review-02/flower-left.png)、[右花簇](review-evidence/review-02/flower-right.png)、[左根部](review-evidence/review-02/root-left.png)。

## 全部部件覆盖与保留判断

表中“无另列问题”指本阶段未确认需修改的内容，不替代第二步边缘精修。

|逻辑 part|已查普通绘画层深度|本轮判断|
|---|---|---|
|`halter_dress/halter_bodice`|16、38|前领、胸腹、腰部完整；颈侧后绕独立，真实领口开口保留。衣身单独看没有胸饰或腰结实体混入，无另列问题。|
|`halter_dress/short_outer_skirt/front_drape`|36、37|主面、两个自卷反面及底缘合看连续；两侧正常窗口保留。单层中的合理隐藏裙面不按饰物轮廓判错，无另列问题。|
|`halter_dress/short_outer_skirt/right_skirt_panel`|14、32、34|画面左侧裙根、主面、卷回面职责独立；蓝花和珠点完整，原位置及外摆范围协调，无另列问题。|
|`halter_dress/short_outer_skirt/left_skirt_panel`|15、33、35|画面右侧裙根、主面及卷唇独立；固定蓝花、珠饰和下垂自由端保留，隐藏窄面接入主褶，无另列问题。|
|`puff_sleeve_image_left`|17、29|前鼓面、后绕接合及袖口后弧分开；花纹和波浪袖缘完整，袖口未封底，未混入人体，无另列问题。|
|`puff_sleeve_image_right`|18、30|保持本侧不对称形状，前后职责独立；开口和花纹完整，无另列问题。|
|`chest_pendant`|40|卷枝、中央框、底花及镂空保留；孔内没有并入胸布，无另列问题。|
|`waist_bow/knot_and_loops`|43|结与两耳完整，盖住独立带尾根部，无另列问题。|
|`waist_bow/short_tail`|41|根至短尖连续，保留独立自由段及两尾间空隙，无另列问题。|
|`waist_bow/long_tail`|42|根至长尖连续，原扭折和尖端保留；没有并入裙面，无另列问题。|
|`floral_skirt_undertrim`|13、31|侧后绕与前花串独立且共同归属，花瓣／叶瓣／穗边总体连续；左下接头见 R1。裙片的蓝紫自卷面仍归 32/36 等裙层。|
|`trailing_skirt_image_left`|1、3、5、7、9、11|深色星点、固定饰纹、浅色卷层和最低拖尖合看完整；深浅换面及中央空域保留。与花簇接头见 R1，其余无另列问题。|
|`trailing_skirt_image_right/short_drape_left`|8、10、12|浅色上下回翻、金缘、紫红收尖与深色主布共同归属；青点翻面位置及归属正确。右上越界见 R2。|
|`trailing_skirt_image_right/spiral_train_left`|2、4、6|上根补全、外伸尖、内侧小卷边、宽卷层和最低拖尾完整；与短垂布独立。R2 所盖住的浅粉衣料已存在，无须以本层覆盖到短垂布前。|

拖尾检查对照：[左上段](review-evidence/review-02/train-left-upper.png)、[左下段至拖尖](review-evidence/review-02/train-left-lower.png)、[右上段及短布遮挡](review-evidence/review-02/train-right-upper.png)、[右下段至拖尖](review-evidence/review-02/train-right-lower.png)。上身、袖子和饰物的固定坐标 300% 对照存于 `review-evidence/review-02/part-*.png`；深度分片的 200% 独显存于 `solo-NNNN.png`。

整体未见显著比例、位置或画风漂移；薄纱／浅色叠卷的绘画表现、领口、袖口、裙缘翻口和中央空域保留，没有新增实心封口。隐藏区细褶、星点和花瓣的合理延续允许与参考遮挡物不同。本轮不以 PSNR、全图像素一致率或对隐藏纹样的个人偏好作通过门槛。

## 只读核验

本轮没有修画、保存 KRA 或修改上游分层。临时切换可见性后恢复全部 32 层原状态，逐层名称、顺序、类型、混合模式、不透明度、可见性、子节点数和绘画像素保持一致；检查用新开文档已关闭且未保存。桥接命令恢复原内容。

- [内存图层恢复与不保存关闭记录](review-evidence/review-02/memory-readonly-verification.json)。
- [输入文件与投影核验](review-evidence/review-02/readonly-verification.json)：KRA、参考、groups、occlusion 及上游 parts 共 22 个文件哈希前后相同；当前导出与保存 KRA 内置合成的 RGBA 相同，恢复后的投影亦相同。此核验仅确认检查对象和只读状态，不用于评价画质。
- KRA SHA-256：`56561f759db31d2ac8cb18697af202d3d30bdf0a3a8581d1d595b6f40ad148df`。
- 参考 SHA-256：`119c1d7ef01ca537a006bf49616ca68ef3b0ea4812b64d2e96a29d0dad23579d`。

两项修复后，应在相同原坐标复查相应独显／隐藏状态及全合成；尤其要确认恢复的是各层自己的内容，不能借错误覆盖获得整图相似。

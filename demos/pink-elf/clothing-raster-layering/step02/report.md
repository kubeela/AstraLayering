结论：已完成本步边缘精修并通过自检。

工程为 [clothing-soft-edges.kra](clothing-soft-edges.kra)，由第一步当前工程另存并持续修改。画布保持 932×1688、U8 RGBA、sRGB-elle-V2-srgbtrc.icc。14 个逻辑 part、32 个根级普通绘画层，命名、顺序、职责和既有多深度分片保持；无蒙版、子节点或人体层。

依据为 [第一步报告](../step01/report.md)、固定坐标的 [纯衣服参考](../../clothing-part-layering/references/clothing.png)、上游 parts/、groups.json 和 occlusion.json。原角色未作为贴图来源，本步未做身体装配。第一步文件和上游结构文件均未改写，输入 SHA-256 保留记录见 [input-hashes.json](input-hashes.json) 与 [delivery-checks.json](delivery-checks.json)。

先以同坐标逐像素差异的边缘候选框开始定位：[候选框](difference-candidates.png)、[坐标与排序](difference-candidates.json)，30 框按可见边缘差异筛出，随后逐层扩展检查全部衣片。差异排序只用于发现位置；没有以分数作为验收结论，也未把补全区域与原图遮挡物强行匹配。花簇内部生成延续、各深度隐藏接片与正常开口均据实际衣料和控制职责判断。

实际修画均在 Krita 当前第二步工程完成：`k) Blender Blur` 的 1.6–2.4px 局部笔画处理细边，`b) Airbrush Soft` 仅用于 0010 外缘残点接色。先试修一小段腰带、看图确认，再分批保存。每条路径、尺寸、浓度、图层及理由见 [drawing-strokes.json](drawing-strokes.json)；脚本仅定位、调用原生笔刷及导出。未粘贴原图像素，未用全层模糊、全局羽化或阈值填色生成修复，未新增阴影、AO 或投影。

本步变化很小：16 层发生像素修改，其余16层检查后保留。Alpha 仅在局部过渡带有微量变化，未将纱料整体变实或删除；审计未发现新像素超出原层轮廓2px。此项只校验改动范围，实际轮廓、接缝和透明质感仍以看图验收。逐层变更统计见 [changes.json](changes.json)。

逐层检查结果如下。表中独显为当前重开工程的原尺寸透明 PNG；隐藏上层为只显示本层及更低深度的实际 Krita 投影。每层均检查独显外缘、隐藏上层的补全/接头，再与全部叠加和同逻辑 part 合看核对。表中的“保留”表示未发现需要本步修改的问题，而非省略检查。

| 实际图层名 | 问题、处理与检查结果 | 原尺寸证据 |
|---|---|---|
| `0001 trailing_skirt_image_left :: depth_01` | 最低后续尾面：尖端、下缘波浪和自身卷缘原有过渡自然；保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0001.png) · [隐藏上层](inspection/final/upper-hidden/0001.png) |
| `0002 trailing_skirt_image_right/spiral_train_left :: depth_02` | 右最低后续尾面：尖端与下缘细描边连续；保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0002.png) · [隐藏上层](inspection/final/upper-hidden/0002.png) |
| `0003 trailing_skirt_image_left :: depth_03` | 左下段宽卷面：边线与下方1的连续翻卷无裂口；保留深度分界。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0003.png) · [隐藏上层](inspection/final/upper-hidden/0003.png) |
| `0004 trailing_skirt_image_right/spiral_train_left :: depth_04` | 右下段宽卷面：弧缘与2接合连续；保留深度分界。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0004.png) · [隐藏上层](inspection/final/upper-hidden/0004.png) |
| `0005 trailing_skirt_image_left :: depth_05` | 左上段浅色长卷面：尖端、镂空侧缘、内折边及透亮布面保留，未抹掉自身窄舌。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0005.png) · [隐藏上层](inspection/final/upper-hidden/0005.png) |
| `0006 trailing_skirt_image_right/spiral_train_left :: depth_06` | 右上段浅色长卷面：斜向外缘及折回线自然，原浅色透明感保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0006.png) · [隐藏上层](inspection/final/upper-hidden/0006.png) |
| `0007 trailing_skirt_image_left :: depth_07` | 左深色星点面及浅色接头：x227–241/y881–884窄接色带局部模糊笔刷柔化；自身金缘、圆点与花簇前后归属保留。 实际改动 17 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0007.png) · [隐藏上层](inspection/final/upper-hidden/0007.png) |
| `0008 trailing_skirt_image_right/short_drape_left :: depth_08` | 右短垂布深色面：x733–739/y922–931金缘外侧小段软化；保留金附件和自身回折窄面。 实际改动 11 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0008.png) · [隐藏上层](inspection/final/upper-hidden/0008.png) |
| `0009 trailing_skirt_image_left :: depth_09` | 左浅色回翻舌：真实布面及上压边连续，保留；不将浅色内侧当残边删除。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0009.png) · [隐藏上层](inspection/final/upper-hidden/0009.png) |
| `0010 trailing_skirt_image_right/short_drape_left :: depth_10` | 右浅色回翻：x723–729/y887–900边缘台阶局部软化；x718–719/y883两像素深紫残点用本层邻近浅布色柔笔接色，保持斜包边、青圆点与开口。 实际改动 24 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0010.png) · [隐藏上层](inspection/final/upper-hidden/0010.png) |
| `0011 trailing_skirt_image_left :: depth_11` | 左紫红回压舌：尖端、星点和与9的翻卷连续；保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0011.png) · [隐藏上层](inspection/final/upper-hidden/0011.png) |
| `0012 trailing_skirt_image_right/short_drape_left :: depth_12` | 右紫红回压舌：尖端、星点及自身白色折返小边保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0012.png) · [隐藏上层](inspection/final/upper-hidden/0012.png) |
| `0013 floral_skirt_undertrim :: depth_13` | 后侧花簇：两端x158–162及x770–773/y803–814各一小段露出外缘柔化；未将前后花簇合层。 实际改动 20 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0013.png) · [隐藏上层](inspection/final/upper-hidden/0013.png) |
| `0014 halter_dress/short_outer_skirt/right_skirt_panel :: depth_14` | 画面左侧裙后腰接片：已生成浅粉褶面完整，接入34无新增断层；保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0014.png) · [隐藏上层](inspection/final/upper-hidden/0014.png) |
| `0015 halter_dress/short_outer_skirt/left_skirt_panel :: depth_15` | 画面右侧裙后腰接片：窄幅隐藏布面完整，接入35无新增断层；保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0015.png) · [隐藏上层](inspection/final/upper-hidden/0015.png) |
| `0016 halter_dress/halter_bodice :: depth_16` | 后绕领带：两侧窄带、花瓣边与前领38连续，独立深度及开口保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0016.png) · [隐藏上层](inspection/final/upper-hidden/0016.png) |
| `0017 puff_sleeve_image_left :: depth_17` | 左袖内侧后片：沿弧形内缘及下侧纱瓣完整，保持可插层；保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0017.png) · [隐藏上层](inspection/final/upper-hidden/0017.png) |
| `0018 puff_sleeve_image_right :: depth_18` | 右袖内侧后片：内缘、窄纱瓣和紫色自身纹样完整；保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0018.png) · [隐藏上层](inspection/final/upper-hidden/0018.png) |
| `0029 puff_sleeve_image_left :: depth_29` | 左泡袖前片：圆瓣外缘、下侧薄纱及其与17的接续已柔和；试笔未改变有色像素，最终原样保留。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0029.png) · [隐藏上层](inspection/final/upper-hidden/0029.png) |
| `0030 puff_sleeve_image_right :: depth_30` | 右泡袖前片：x575–593/y453–458及x625–637/y428–438两处圆瓣边缘局部软化；纱瓣透明度与内外层次保留。 实际改动 49 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0030.png) · [隐藏上层](inspection/final/upper-hidden/0030.png) |
| `0031 floral_skirt_undertrim :: depth_31` | 前花簇：左x222–246/y876–883、青瓣底缘x267–335/y875–900、右x613–712/y877–897等短弧局部柔化；三小段过硬瓣线在本层内轻混合，未整体模糊或改花形。 实际改动 313 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0031.png) · [隐藏上层](inspection/final/upper-hidden/0031.png) |
| `0032 halter_dress/short_outer_skirt/right_skirt_panel :: depth_32` | 画面左裙回卷面：x392–400/y775–785窄卷缘局部软化；缺口、反面蓝紫色及深度独立保留。 实际改动 14 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0032.png) · [隐藏上层](inspection/final/upper-hidden/0032.png) |
| `0033 halter_dress/short_outer_skirt/left_skirt_panel :: depth_33` | 画面右裙回卷面：细翻边与自由端连接完整，保留原包边、窄分片和开口。 像素未改。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0033.png) · [隐藏上层](inspection/final/upper-hidden/0033.png) |
| `0034 halter_dress/short_outer_skirt/right_skirt_panel :: depth_34` | 画面左侧裙主面：x184–200/y810–815波浪包边小段柔化；蓝花、珠饰及腰根补全保留。 实际改动 11 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0034.png) · [隐藏上层](inspection/final/upper-hidden/0034.png) |
| `0035 halter_dress/short_outer_skirt/left_skirt_panel :: depth_35` | 画面右侧裙主面：x631–646/y853–860波浪下缘小段柔化；蓝花、长褶及自由端保留。 实际改动 12 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0035.png) · [隐藏上层](inspection/final/upper-hidden/0035.png) |
| `0036 halter_dress/short_outer_skirt/front_drape :: depth_36` | 中央垂布反面：右x550–555/y779–791窄描边局部柔化；左右反面分界和缺口保留。 实际改动 13 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0036.png) · [隐藏上层](inspection/final/upper-hidden/0036.png) |
| `0037 halter_dress/short_outer_skirt/front_drape :: depth_37` | 中央垂布主面：x490–508/y849–855底缘小段柔化；连续腰根与下方翻边接续保留。 实际改动 9 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0037.png) · [隐藏上层](inspection/final/upper-hidden/0037.png) |
| `0038 halter_dress/halter_bodice :: depth_38` | 前衣身：x372–377/y382–405及x555–563/y390–418两侧包边短段柔化；两领孔、花瓣领、连续腰面未改。 实际改动 35 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0038.png) · [隐藏上层](inspection/final/upper-hidden/0038.png) |
| `0040 chest_pendant` | 胸饰：两金卷边与下侧叶尖用1.6–1.7px模糊笔刷局部收锯齿；镂空和金属细线保留。 实际改动 44 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0040.png) · [隐藏上层](inspection/final/upper-hidden/0040.png) |
| `0041 waist_bow/short_tail` | 短带尾：斜缘数小段及下尖端用2–2.4px局部模糊笔刷收硬台阶；本片浅亮侧边和自身折痕保留。 实际改动 156 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0041.png) · [隐藏上层](inspection/final/upper-hidden/0041.png) |
| `0042 waist_bow/long_tail` | 长带尾：x429/y564–602竖边短段及x435–446/y651–693下部斜缘与尖端局部柔化；未扩大浅色包边或抹去内折。 实际改动 185 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0042.png) · [隐藏上层](inspection/final/upper-hidden/0042.png) |
| `0043 waist_bow/knot_and_loops` | 结与结耳：左右下包边转角短段软化，保留原有折痕、亮边及两耳真实空域。 实际改动 99 像素。独显、隐藏上层及组合复核通过。 | [独显](inspection/reopened/solos/0043.png) · [隐藏上层](inspection/final/upper-hidden/0043.png) |

检查证据与观察：

- 原尺寸全装固定坐标对照：[final-reference-100.png](inspection/final-reference-100.png)。未移动或缩放参考来拟合轮廓。裙边、长垂裙尖端与胸腰比例保持第一步状态，局部处理未引入明显缺口、位移或整体画风变化。
- 所有32片的200%完整独显：[第1页](inspection/final-solos200-01.png)、[第2页](inspection/final-solos200-02.png)、[第3页](inspection/final-solos200-03.png)；全部32片的200%隐藏上层检查：[第1页](inspection/final-upper-hidden200-01.png)、[第2页](inspection/final-upper-hidden200-02.png)、[第3页](inspection/final-upper-hidden200-03.png)。位置与片名清单见对应 JSON。
- 400%细部初查覆盖全部32层：[detail-01.png](inspection/detail-01.png) 至 [detail-08.png](inspection/detail-08.png)。最终修画区域同坐标“参考 / step01 / 重开step02”400%对照：[腰带](inspection/final-detail-bow.png)、[金饰](inspection/final-detail-pendant.png)、[左接头](inspection/final-detail-leftjoin.png)、[右接头](inspection/final-detail-rightjoin.png)、[回卷包边](inspection/final-detail-hem.png)、[袖口](inspection/final-detail-sleeve.png)。
- [14个同逻辑part合看](inspection/final-same-part-native-01.png)：左右各自的长垂裙多次回卷、右短垂布、两袖内外片、环颈后带/前衣面、短裙回卷/主面均仍可独立插层。薄纱边、内侧浅色衣料、固定金饰和正常空口均保留；没有按共同运动合层，也没有将本片颜色误当残边擦去。
- 0010 的两像素深紫点属于浅色翻面自身的边缘残色，非其后深色布或前花簇。局部柔笔接色后独显与组合均不再形成孤立深紫点，斜向粉包边继续衔接；未迁移其他层像素。031及013花簇前后片、7/8深色面与10浅色回翻仍各在原层。
- 有些独显细窄碎片是第一步沿真实自卷/深度边界分出的同片像素；同 part 合看后连续。没有将这类插层像素批量当噪点清除。保留原画必要细线与材质颗粒，不追求把400%下所有像素都变成模糊软边。

最终文件已保存、关闭并重新打开。32层的名称、顺序、类型、不透明度、可见性及每层原始像素与关闭前一致，投影一致；KRA内 mergedimage、导出PNG、重开投影逐像素一致。见 [reopen-verification.json](reopen-verification.json)。实际重开独显32张和同part14张位于 [inspection/reopened/](inspection/reopened/)。Krita窗口也已核对为第二步工程，无未保存星号。

上游18个SVG与JSON可解析，14个逻辑ID及32个深度与当前图层顺序相符；本步仅局部边缘过渡，无新增拆层、职责或结构修订，因此沿用现行上游数据。第一步KRA、报告及读取的上游文件哈希全部保持。未解决事项：本次逐层及组合复查未发现待修的本步验收问题。

最终交付：[KRA](clothing-soft-edges.kra)、[透明合成PNG](clothing-soft-edges.png)、本报告。KRA SHA-256：`e83412bff44756b5bde36a2098169dd1b8e445e97fd33a5d9031cf30c96f96aa`。

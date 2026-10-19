状态：step01 结构、补全和配准收尾完成；正式工程已保存、关闭并重开核对。细微边缘与材质接缝继续由 step02 处理，整套最终验收以其后独立 review 为准。

本报告替代先前 blocked 检查点；旧报告只读备份在 report-before-finish.md（历史路径：`finish/audit/report-before-finish.md`）。原单层腰部深度冲突已由本运行明确授权的拆层解决，不再返回上游。

依据及交付

- 正式工程：[clothing-depth.kra](clothing-depth.kra)，1024×1536、RGBA/U8，69 个平级 paintlayer，无蒙版、无子节点、无人体层；逻辑衣服 part 仍为 68 个。
- 形状 [input/parts](../../clothing-part-layering/parts)、归属 [groups.json](../../clothing-part-layering/groups.json)、深度 [occlusion.json](../../clothing-part-layering/occlusion.json) 只读沿用。绘画纹理来源仅 [clothing.png](../../clothing-part-layering/references/clothing.png)，穿衣角色只辅助判断深度。
- 本次从已保存重开的 拆层测试工程（历史路径：`split-test/clothing-depth-split-test.kra`） 另存接续，复用全部可用生成候选，未重跑 parts 或整批生成。输入、原草稿、split-test 及受保护记录共 281 个文件逐个哈希未变：核对（历史路径：`finish/audit/final-protected-verification.json`）。没有写调度标记。

本次实际绘画

相对获准拆层工程，23 个实际层有像素修正。主要包括纱连接与回卷、袖壁配准和根部缺条、裙摆断片、上衣矩形接缝、蓝幅污染、前襟肩端/下卷端、点状领链、雪花和两根藏后挂绳。其余合格内容继续使用。

保留的实际内置 image_gen 候选和调用记录位于 `parts/<完整 part ID>/`；收尾生图在 finish/generation（历史路径：`finish/generation`）。上衣 v3 因多余袖窿与轮廓漂移被否决；v4 的真实原件、哈希和来源已补入 日志（历史路径：`finish/generation/bodice/generation-log.json`），未虚构调用时间。没有使用原穿衣图像素。隐藏衣料保留实际生成和手绘，未用原参考像素代替隐藏补全。

收尾脚本与具体轨迹在 finish/scripts（历史路径：`finish/scripts`） 和 finish/logs（历史路径：`finish/logs`）。r8 仅在后/前裙可见衣料范围叠加纯衣服参考，排除上层标准；薄纱卷尖为局部绘画。r9 在各自层内接通 15/16 挂绳及 39 胸饰卷须，坐标见 r9-fine-link-paths.json（历史路径：`finish/logs/r9-fine-link-paths.json`）。所有处理写入普通绘画像素，不留蒙版。

获准深度例外（后续阶段须保留）

共同逻辑父 part：`outer_robe/left_front_panel`。共同随动，非两个新增独立可动部件；本次无绑定或动画。

| 后→前索引（0 起） | 实际层名 | 深度职责 |
| ---: | --- | --- |
| 17 | `outer_robe/left_front_panel::back_under_front_band` | 位于前腰带之后 |
| 18 | `waist_sash/circumferential_band/front_band` | 夹在两片之间 |
| 28 | `outer_robe/left_front_panel::front_main` | 位于前腰带之前；仍在右前襟之后、领链之前 |

实际分界使用原图坐标、左上原点、x 向右 y 向下：`[[561,489],[561.8,494],[564.4,502],[567.1,510],[570.6,520],[574.6,530],[565,531],[548,532.5],[531.4,533.5]]`。分界两侧、搭接及像素切分细节按只读 [split-plan.json](split-test/split-plan.json) 继承；不得合回一层。A=(545,509) 蓝腰带在前，B=(570,509) 白襟在前。后片全层、前片腰部保护框 `528,488,585,552)` 保持批准像素。没有改写 occlusion.json。

逐层看图记录

以下逐层覆盖独显深浅底、隐藏上方层和组合检查。大衣片有原尺寸全片，小件另有 2–4 倍细看；重点局部另存 1×/3× 对照。数字核对仅用于验证保存，不作为视觉验收替代。索引始终是实际 KRA 后→前顺序。

| 索引 | 实际图层名 | 实际检查与处理 | 独显 / 隐藏上层 |
| ---: | --- | --- | --- |
| 0 | `outer_robe/collar_shoulders/standing_collar/side_back_collar` | 后领曲条与两端保留，正常领口为空；未改像素。 | [独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 1 | `waist_sash/circumferential_band/side_back_band` | 后腰带完整，侧端点状毛边转 step02。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 2 | `outer_robe/right_sleeve/outer_side_gauze` | 已把保留的 v3 生成配准写入；连接及回卷连续，保留薄纱透明度。卷根硬边转 step02。 | 独显（历史路径：`finish/evidence/acceptance/solo-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-02.png`） |
| 3 | `outer_robe/left_sleeve/outer_flared_gauze` | 修正透明支持及卷尖局部；去掉假横亮条，重画淡紫纱回返。细接缝转 step02。 | 独显（历史路径：`finish/evidence/acceptance/solo-03.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-03.png`） |
| 4 | `outer_robe/left_sleeve/side_pointed_gauze` | 卷根和正常开口保留；未把标准排除的右下区域补成布。 | 独显（历史路径：`finish/evidence/acceptance/solo-04.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-04.png`） |
| 5 | `outer_robe/right_sleeve/cuff_train` | 配准长卷垂料、清理根部接缝，隐藏衣料连续。 | 独显（历史路径：`finish/evidence/acceptance/solo-05.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-05.png`） |
| 6 | `outer_robe/left_sleeve/rear_cuff_drape/free_curled_drape` | 重新配准自由卷垂片，卷端与长幅连续。 | 独显（历史路径：`finish/evidence/acceptance/solo-06.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-06.png`） |
| 7 | `outer_robe/left_sleeve/rear_cuff_drape/cuff_attachment_wall` | 调整袖口附着壁配准，保留与前后层的独立深度及透明度。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 8 | `outer_robe/right_sleeve/sleeve_tube/rear_sleeve_wall` | 重新配准后袖壁，保留袖根隐藏接续及完整袖管。 | 独显（历史路径：`finish/evidence/acceptance/solo-08.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-08.png`） |
| 9 | `outer_robe/left_sleeve/rear_sleeve_wall` | 重新配准后袖壁，窄接头已连通；y560 附近纹样过渡转 step02。 | 独显（历史路径：`finish/evidence/acceptance/solo-09.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-09.png`） |
| 10 | `inner_dress/skirt_side_back` | 修复断开的裙摆配准；r8 仅恢复本片可见裙摆像素，隐藏区保留生成。 | 独显（历史路径：`finish/evidence/acceptance/solo-10.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-10.png`） |
| 11 | `inner_dress/skirt_front` | 修复前裙下摆；r8 局部可见衣料和细包边重画，下摆连续。 | 独显（历史路径：`finish/evidence/acceptance/solo-11.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-11.png`） |
| 12 | `inner_dress/bodice_front` | v3 生图视觉否决，采用实际内置生成 v4，网格配准及 Krita 叠色；去除矩形补丁、胸饰暗影污染。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 13 | `waist_sash/right_long_tail` | 去除混入的吊饰内容，恢复本片生成蓝料，y1010–1080 过渡与长幅连续。 | 独显（历史路径：`finish/evidence/acceptance/solo-13.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-13.png`） |
| 14 | `waist_sash/left_long_tail` | 已复用并配准保留的 v2 生成，长蓝幅连续；长右缘细碎毛边转 step02。 | 独显（历史路径：`finish/evidence/acceptance/solo-14.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-14.png`） |
| 15 | `waist_pendant/upper_suspension/right_suspension_cord/rear_insertion_end` | r9 手绘接通藏后短绳，保留银蓝材质和独立深度。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 16 | `waist_pendant/upper_suspension/left_suspension_cord/hidden_entry` | r9 手绘接通左藏后入结短绳。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 17 | `outer_robe/left_front_panel::back_under_front_band` | 逐像素保留批准测试后片，整片处在前腰带后。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 18 | `waist_sash/circumferential_band/front_band` | 带面隐藏中央接续保留，局部配准清理；全腰带及 A/B 穿插已比对。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 19 | `waist_sash/front_tie/right_short_loop` | 短环料、开口及隐藏根保留；未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 20 | `waist_sash/front_tie/left_short_loop` | 短环料与根部保留；未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 21 | `waist_sash/front_tie/bound_tassel` | 小束流苏完整；未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 22 | `waist_pendant/upper_suspension/right_suspension_cord/front_arc_cord` | 前弧绳连续且独立；未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 23 | `waist_pendant/upper_suspension/left_suspension_cord/front_arc` | 左前弧绳连续且独立；未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-00.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 24 | `waist_sash/front_tie/knot_core` | 中心结独立，轮廓和结面保留；未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 25 | `outer_robe/right_sleeve/sleeve_tube/front_sleeve_wall` | 重新配准前袖壁并拓接袖根，解决原暗缺条；标准内的隐藏衣料完整。 | 独显（历史路径：`finish/evidence/acceptance/solo-25.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-25.png`） |
| 26 | `outer_robe/left_sleeve/front_sleeve_wall` | 重新配准前袖壁，前后衣料仍分开；根部轮廓细修转 step02。 | 独显（历史路径：`finish/evidence/acceptance/solo-26.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-26.png`） |
| 27 | `outer_robe/right_front_panel` | 修正右前襟配准，领腰处标准开口保留；没有用补布封口。 | 独显（历史路径：`finish/evidence/acceptance/solo-27.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-27.png`） |
| 28 | `outer_robe/left_front_panel::front_main` | 肩端与下回卷修正、两笔局部绘画；批准腰部分界保护框内像素未变。 | 独显（历史路径：`finish/evidence/acceptance/solo-28.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-28.png`） |
| 29 | `collar_fastener/right_collar_chain` | 由生成材质重建连续银链，去掉点状断裂。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 30 | `collar_fastener/left_collar_chain` | 由生成材质重建连续银链。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 31 | `collar_fastener/right_chest_chain` | 胸链细线与端头保留；未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 32 | `collar_fastener/left_chest_chain` | 胸链细线与端头保留；未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-0.png`） |
| 33 | `outer_robe/collar_shoulders/right_shoulder_cover` | 肩盖薄料、纹样与开口保留；独显与组合已查。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 34 | `outer_robe/collar_shoulders/left_shoulder_cover` | 肩盖薄料、纹样与开口保留；独显与组合已查。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 35 | `outer_robe/collar_shoulders/standing_collar/right_front_collar` | 前领独立，曲面及领口保留。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 36 | `outer_robe/collar_shoulders/standing_collar/left_front_collar` | 前领独立，曲面及领口保留。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 37 | `collar_fastener/central_clasp/hanging_junction` | 吊结完整，保留金属小尖及独立节点。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 38 | `collar_fastener/central_clasp/clasp_body` | 中央扣体可辨、干净，未画入相邻领料。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 39 | `chest_ornament` | r9 以明确曲线路径接通下方两卷须；其余细边柔和度转 step02。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 40 | `waist_pendant/long_white_tassel` | 长白流苏及顶部材质连续；根帽的细过渡转 step02。 | 独显（历史路径：`finish/evidence/acceptance/solo-40.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/hidden-40.png`） |
| 41 | `waist_pendant/lotus_coupler/lower_ring_connector/rear_insertion_return` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 42 | `waist_pendant/double_ring_chain/upper_inner_drop` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 43 | `waist_pendant/double_ring_chain/lower_inner_drop` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 44 | `waist_pendant/double_ring_chain/inter_ring_link/rear_threaded_stem` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 45 | `waist_pendant/tassel_buckle/ring_return_back` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 46 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/upper_flexible_neck` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 47 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/lower_flexible_neck` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 48 | `waist_pendant/lower_silver_strand/upper_chain` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 49 | `waist_pendant/lower_silver_strand/lower_bead_link` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 50 | `waist_pendant/lotus_coupler/right_side_link` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 51 | `waist_pendant/lotus_coupler/left_side_link` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 52 | `waist_pendant/lotus_coupler/central_diamond_pendant` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 53 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/terminal_bead` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-01.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 54 | `waist_pendant/upper_suspension/junction_linkage/short_bead_linkage/middle_bead` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 55 | `waist_pendant/upper_suspension/junction_linkage/diamond_bead` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 56 | `waist_pendant/upper_suspension/junction_linkage/junction_knot` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 57 | `waist_pendant/snowflake_pendant` | 雪花分支、下菱形和连接经过逐处银线重画；原孔隙保留，细边转 step02。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 58 | `waist_pendant/lower_silver_strand/elongated_silver_link` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 59 | `waist_pendant/lower_silver_strand/upper_bead_link` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 60 | `waist_pendant/lotus_coupler/silver_hanger` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 61 | `waist_pendant/lower_silver_strand/teardrop_pendant` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-1.png`） |
| 62 | `waist_pendant/double_ring_chain/lower_ring_body` | 下圈体完整，真实内孔为空；未把独立插头并入。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-2.png`） |
| 63 | `waist_pendant/double_ring_chain/inter_ring_link/lower_front_head` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-2.png`） |
| 64 | `waist_pendant/double_ring_chain/upper_ring_body` | 独显及组合复核：底部浅色为圈体内高光，未见需删除的独立连接团；保持上露头单独图层。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-2.png`） |
| 65 | `waist_pendant/double_ring_chain/inter_ring_link/upper_front_head` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-2.png`） |
| 66 | `waist_pendant/lotus_coupler/lower_ring_connector/front_connector_tip` | 独显、隐藏上层及组合均已看图；本片金属/珠件、细接头与正常空隙保留，未改像素。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-2.png`） |
| 67 | `waist_pendant/lotus_coupler/lotus_body` | 莲体和根部完整，与吊架及侧接分层。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-2.png`） |
| 68 | `waist_pendant/tassel_buckle/buckle_front` | 扣体双翼与中央叶完整，与流苏和后返环分层。 | 独显（历史路径：`finish/evidence/acceptance/small-02.png`） / 隐藏上层（历史路径：`finish/evidence/hidden/page-2.png`） |

组合与剩余阶段工作

重开后完整透明合成（历史路径：`finish/exports/current-composite.png`） 与纯衣服参考按原尺寸对照，白蓝主体、长幅及前后深度可辨，主要破口和错配已修。胸领正常空隙、袖口内外分层及薄纱透明均保留。腰部不是只检查 A/B 两点，已比较整段腰带与襟缘：腰部 1×（历史路径：`finish/evidence/acceptance/focus-waist-1x.png`）、3×（历史路径：`finish/evidence/acceptance/focus-waist-3x.png`）。裙摆、纱尖、肩部、雪花、流苏均有同目录的 focus 对照。

step02 待逐处处理：后腰带侧端、蓝幅右长缘点状毛边；后袖 y560 窄接续；前袖根轮廓；胸饰细卷须锯齿；纱回卷、裙摆细包边、白流苏根帽过渡。不得为这些微边重新生成整套或改变大形。真实参考亮边及半透明薄纱不能统一擦除或全层模糊。step01 不声称已经完成 step02 或独立 review。

形状与文字限制（只记录，不擅改输入）

- `upper_flexible_neck`：groups 旧文到 y608.7，终止 SVG 到 y605.7，采用 SVG；未伸长到下珠。
- `lower_silver_strand/upper_chain`：x509–514、y667–668 参考实体在父范围外。
- `lower_silver_strand/lower_bead_link`：y781 附近两侧实体在父范围外。
- `lotus_coupler/central_diamond_pendant`：y834–837 银侧实体在父范围外。
- `short_bead_linkage/middle_bead`：x508–509.5/512.5–514、y606–608 参考侧缘在父范围外。
- `lower_silver_strand/elongated_silver_link`：y724–727 上肩浅银在父范围外。
- `lower_silver_strand/upper_bead_link`：x507–510、y713–716 左上肩浅银在父范围外。
- `lower_silver_strand/teardrop_pendant`：x508–510/514–517、y788–792 斜缘浅银在父范围外。
- `outer_robe/left_sleeve/side_pointed_gauze` 标准明确排除 x855–925、y1065–1175，不把此处空隙视为应填衣料。
- groups 的中央蓝长幅/前襟文字前后说法与 occlusion 不一致，除批准拆层外依固定 occlusion。以上限制不是已经改动或“已修”的输入缺陷。

保存、关闭、重开

在专用 Krita 5.3.4.1 中保存正式 KRA，关闭该文档，再以同一路径 openDocument、addView 重开。69 层名称、顺序、paintlayer 类型、0 子节点、全画布像素 SHA-256 在关闭前后完全相同；画布 1024×1536、RGBA/U8、sRGB-elle-V2-srgbtrc.icc。见 step01-reopen.json（历史路径：`finish/audit/step01-reopen.json`） 和 实际界面（历史路径：`finish/evidence/step01-reopened-krita-active.png`）。重开导出 `current-00.png` 至 `current-68.png` 与合成后继续目视核对；r9 之后的隐藏上层导出也已更新并检查。该核对未被用来替代画面检查。

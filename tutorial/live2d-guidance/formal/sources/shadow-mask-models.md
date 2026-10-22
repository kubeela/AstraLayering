# 蒙版投影：真实模型证据与复现记录

研究日期：2026-10-22。对应[正式教程 09](../09-clipped-cast-shadows.md)。所有原件只读；临时恢复包、纹理裁切预览和官方 Core 未纳入本次提交。固定数值与 SHA-256 见[清单](shadow-mask-models.json)。

## 原始来源与实际阅读范围

| 来源 | 取得方式与原件 | 本次实际检查 |
| --- | --- | --- |
| Milly／米粒 | 作者卡米雷特；仓库[模型说明](../../model-originals/milly/米粒模型说明.txt)、`Milly原画.psd`、`MillyRuntime`；原 ZIP 为既有 `归档.zip` | PSD 层结构与原始 alpha；裙影、发影及对应原部件的原像素；运行纹理 UV 范围的视觉复核；moc3 mask、blend flag、Part 与参数端点响应；cdi3 显示名 |
| Haru | [QQ 邮件分卷](../../model-originals/archives/qq-mail-20261009/README.md)，按原说明拼接 `.bin` 恢复 `haru_greeter_ja.zip` | `haru_受付スーツ_素材分け_t07.psd` 和导入 PSD 的层结构；四个影层原像素与 alpha；合成图；runtime moc3 裁切与部分纹理。发现部分运行 mask 裁切的是发片，不称为投影 |
| Mao | 同目录七分卷恢复 `mao_casualtutorial02.zip` | `mao_口開閉の作り方_インポート.psd` 的层结构、完整髪影原像素与合成图。ZIP 非 UTF-8 名称以 CP932 恢复显示；原包未改名。未读取其运行绑定 |
| Hiyori pro | 同目录四分卷恢复 `hiyori_en.zip` | `hiyori_pro_t11.moc3` 的 mask、Part 与参数列表。八个被裁切对象均属 `PartEyeBall`；不作为裙影或发影案例 |
| 本地绘制指南 | [下半身](../../../live2d-tutorial-text/8.下半身的拆分与制作.txt)、[透明与阴影](../../../live2d-tutorial-text/14.透明，阴影，高光的拆分方式.txt) | 完整保存正文；定位裙摆投影、阴影完整面积、三种混合与发影重叠段。第二篇结尾署名“夏卜卜”；本次没有新逐帧观看视频或推测视频链接 |

分卷原包 SHA-256 与 CRC 的已存证据见[verification.json](../../model-originals/archives/qq-mail-20261009/verification.json)。Milly 作者说明对二次传播与 PSD 挪用有明确限制；本次研究只新增文字、计数和只读工具，不新增复制其原素材或截图。

Milly PSD layer ID 与 moc3 drawable ID 不是同一标识体系。表中匹配依据包括素材形状、纹理区域、Part 显示名与 mask；没有宣称通过 cmo3 取得一对一作者对象映射。cmo3 为二进制，本次未解析其 deformer 父子关系。

## 可以复核的文件事实

1. **Milly `yy裙子`**：PSD layer ID 1220，乘算、完整有色素材，边界 `[1129,2136,2070,2819]`。运行 ArtMesh119 为乘算，Part21 的显示名为“裙子”，引用 `legLM` 与 `legRM` 作为普通裁切来源。不是两张互相叠乘的腿影。
2. **Milly 前发影**：PSD `yy前发L/R/M` 的 ID 834/833/832，普通混合、不透明度 255。完整范围与对应发束接近。运行发影 ArtMesh47/48/49/50/51 使用 `faceM`；ArtMesh50 响应 `ParamXHead1` 与 `ParamXHead19`，而 faceM 在这些单参数采样中不动。
3. **Mao `髪影 乗算`**：PSD layer ID 116，实际 normal，clipping=false；名字不能证明混合模式，PSD 未剪贴不能证明运行未裁切。
4. **Haru 腿影**：完整原像素明显大于与 tights 基底的交集；但包含多个部位明暗，不归类为纯动态裙摆投影。6.848 倍不作为作者应遵循的面积倍率。
5. **Haru/Hiyori 运行裁切**：Haru D_PSD_74/75 经 UV 纹理复核是发片，Hiyori 八个被裁切对象在眼球 Part。不能把任意 mask 直接认定为投影。

## alpha 面积怎么测

读取原始图层 `topil()`，不使用当前裁切后的合成图。对阴影原始 alpha 统计 `alpha > 0`；把指定受影层 alpha 对齐到 PSD 原坐标，求布尔并集，再计算与阴影的交集。统计边界按 `[left,top,right,bottom]`。

这不是按不透明度加权的面积，也不是最终画面投影的可见面积；尚未扣除前方裙子、五官与其他遮挡，没有考虑完整组混合、PSD 其他蒙版或 Cubism 动态形变。接近透明的抗锯齿像素也算一个非零像素。使用这个统计只证明保留裁切外内容，不用它评价阴影好看程度。

Milly 原始阴影 451,111，左右大腿 ID 505/510 联合交集 188,597，倍率 2.392。Haru 左右腿影各 3,865,904，tights 基底交集 564,509，倍率 6.848；另两项颈／脸影分别为 1.597、1.286。清单包含文件指纹和层定位。

只读工具：[measure_shadow_alpha.py](../../tools/measure_shadow_alpha.py)。本次环境为 Python 3.11、psd-tools 1.26.0、Pillow 13.0.0、numpy 2.4.6；它们是临时研究依赖，不加入制作管线依赖。已有环境可执行：

```sh
python tutorial/live2d-guidance/tools/measure_shadow_alpha.py \
  tutorial/live2d-guidance/model-originals/milly/Milly原画.psd \
  --layer 1220 --receiver 505 --receiver 510
```

其他文件先按原分卷说明恢复到自行选择的临时目录，再传实际 PSD 路径与清单中的 layer ID；不会改动原件，也不必重复保存一套合并 ZIP。

## moc3 裁切与参数测量怎么做

使用[官方发布的 Core](https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js)，实际返回 **Core 5.1.0**（packed version 83951616），文件 207,155 字节。URL 会更新，因此复核以清单中的 SHA-256 为准。没有把它安装成项目运行依赖，也没有提交第三方 Core。

通过公开 Core 的 Model/Drawables/Parameters 接口读取 mask 索引、drawable ID、Part、混合标记、顶点、参数范围。参数测试先把全部值复位到作者 default，调用 update，再单独设置某个参数的 min/max，调用 update，统计相对默认的最大二维顶点位移。没有加入物理推进、motion、表达式或 renderer，也没有读取 deformer 树。**位移为模型单位，不能直接换算成推荐摇摆振幅。**

工具：[probe_shadow_masks.mjs](../../tools/probe_shadow_masks.mjs)，只读取用户提供的本地 Core 与 moc3。Node 运行时须支持该 Core 的 WebAssembly。示例：

```sh
node tutorial/live2d-guidance/tools/probe_shadow_masks.mjs \
  /path/to/official/live2dcubismcore.min.js \
  tutorial/live2d-guidance/model-originals/milly/MillyRuntime/Milly.moc3 \
  --drawable ArtMesh119 --param ParamXBody7 --param ParamXBody8 \
  --param ParamYBody2 --param ParamYBody7
```

发影复核选 `--drawable ArtMesh50 --param ParamXHead1 --param ParamXHead19`。不指定 drawable 或 param 时只读取所有被裁切对象，不推测其绘画语义。显示名称从包内 `Milly.cdi3.json` 交叉核对，不能从参数 ID 猜测角色功能。

## 官方实现与 Krita 资料

实际读取的 CubismWebFramework 固定提交为 `198a3769c26ca3d7b600e932590433badd392edd`：

| 文件／定位 | 核对内容 |
| --- | --- |
| [cubismclippingmanager.ts](https://github.com/Live2D/CubismWebFramework/blob/198a3769c26ca3d7b600e932590433badd392edd/src/rendering/cubismclippingmanager.ts)，`initializeForDrawable`、`findSameClip` | 使用 drawable mask 引用；同一来源集合共享裁切 context；缓冲布局与容量由版本和配置决定 |
| [cubismrenderer_webgl.ts](https://github.com/Live2D/CubismWebFramework/blob/198a3769c26ca3d7b600e932590433badd392edd/src/rendering/cubismrenderer_webgl.ts)，`setupClippingContext` | 按当前 drawable 范围设置矩阵，绘制 mask 来源网格；多个来源进入同一裁切 context；每帧处理 |
| [cubismshader_webgl.ts](https://github.com/Live2D/CubismWebFramework/blob/198a3769c26ca3d7b600e932590433badd392edd/src/rendering/cubismshader_webgl.ts)，mask shader 与 blend 选择 | 普通／反转裁切、纹理 alpha 和预乘颜色的绑定、shader 选择 |
| [fragshadersrcsetupmask.frag](https://github.com/Live2D/CubismWebFramework/blob/198a3769c26ca3d7b600e932590433badd392edd/Shaders/WebGL/fragshadersrcsetupmask.frag)、[fragshadersrcmaskpremultipliedalpha.frag](https://github.com/Live2D/CubismWebFramework/blob/198a3769c26ca3d7b600e932590433badd392edd/Shaders/WebGL/fragshadersrcmaskpremultipliedalpha.frag) | mask 采样来源纹理的 alpha；最终预乘颜色乘以有效 mask 覆盖 |

Live2D 官方 editor 的 clipping 页面与 SDK masking 页面本次返回 HTTP 503，**未读取正文，未作为已读论据**；采用上面的可读取官方源码与实际模型，而非猜测手册文字。旧教程“64 个 mask”未沿用为统一硬上限。

Krita 官方[Clipping Masks and Alpha Inheritance](https://docs.krita.org/en/tutorials/clipping_masks_and_alpha_inheritance.html)本次 HTTP 200，实际阅读页面为 Manual 5.3.0、文档 revision `4e66218`。正文明确说组内独立合成、pass-through 会使 alpha inheritance 不正确，以及从多个下方图层的联合透明度继承。没有声称已读取不存在的 Photoshop 式单底层绑定。

Krita 本机另做 2×2 RGBA 原生 PSD 导入、KRA 保存导出、读取保存 XML，确认影层使用 `channelflags="1110"`、隔离组 `passthrough="0"`。实验图只验证保存与裁切结构，不验证角色阴影画法，更不等于 Cubism 导出验收。

## 结论边界

正式采用的是完整阴影、受影裁切、按角色选关系、混合重叠检查、运动来源与裁切来源分开。这些有原教程与真实模型支撑。

余量如何覆盖动作范围、某个新角色采用哪个 deformer、多个影层何时合并，是依据上述证据提出的制作方法，要在具体角色检查。本次没有在 Jianma 新生成蒙版 artwork，没有把独立端点采样描述为完整动态视频验收，也没有把实时深度投影做法当成 Cubism 内置能力。

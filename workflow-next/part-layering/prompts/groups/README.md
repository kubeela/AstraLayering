每个 group/part 可按完整 ID 放置特化提示词；目录沿用 `groups/`，匹配不受节点 kind 限制：

- `face/outline.md`：替换 face 的通用轮廓绘制提示词。
- `face/review.md`：替换 face 的通用审查提示词。
- `face/completion.md`：替换 face 的正面遮挡补全提示词。
- `face/children.md`：替换 face 的直属结构拆分提示词，子节点标注 group/part。
- `face/eye/outline.md`：只替换 face/eye，不影响 face 或其他组。

每个步骤独立选择；没有对应文件时使用该步骤的通用正文。特化文件完整替换通用正文，不继承祖先提示词。程序仍附加当前组、参考图、父 SVG 和画布等运行输入；绘制与补全收到草稿输出路径，review 收到候选 SVG 和审查报告路径。

拆分通用正文为 `10-直属结构拆分.md`，固定操作约定 `10-拆分操作约定.md` 始终附加。左右眼、左右手臂和左右手的规则各放在对应完整 ID，便于分别特化；没有隐式按名称或祖先继承。层级说明与取舍依据写入每个子节点 note，后续绘制、review、补全均收到它。`hair/completion.md` 补正面遮挡下完整后发及头盖范围，供后续拆分，不生成侧面或背面视图。

已完成步骤继续跳过；改提示词不会自动重做已有结果。实际使用的提示词路径和完整正文保留在 agent 的 request.json 中。

可在当前完整 ID 目录放置 `children.references.json`，格式同下方补全参考清单：每项提供图片 `path` 和用途 `description`，路径相对清单目录。拆分模型在本次输入的 `additionalReferences` 中收到图片路径和用途，按当前发型或疑问用 `view_bitmap` 查看需要的图片；不会预先附加全部图片，也不要求逐张查看。只允许读取本次明确配置的运行目录外参考文件，不开放其相邻目录，不隐式继承祖先清单。已配置但缺失、不可解码或格式错误的图片会报错。`hair/children.md` 分别说明三套参考板的选择条件，实际参考存放在 `hair/references/`；该目录内的第三方像素与派生裁片本地忽略。此配置不影响绘制、review、补全步骤，修改后不会自动重做已经完成的拆分。

补全通用正文为 `prompts/9-正面遮挡补全.md`。face 的特化只补正面脸型与耳部，不补完整头型、侧面或背面。操作约定独立放在 `prompts/9-补全操作约定.md`，每次补全调用读取，并始终在通用或特化正文及本次输入后追加；修改这段提示词无需改代码。文件缺失或为空会报错，实际正文和来源路径写入请求记录。程序的原形保留校验独立于提示词。

可在当前完整 ID 目录放置 `completion.references.json`，显式提供参考图片：

```json
[
  { "path": "references/front-face.png", "description": "正面脸型先验；沿用当前角色已有比例和可见边缘" }
]
```

路径相对清单所在目录，图片须真实存在且可读取；无需替换通用正文也能单独配置参考。没有清单则仅传入运行中的素体参考，不自动寻找外部图片，不继承父组清单。图片及用途写入本次请求。新增参考或修改提示词不自动重做已完成补全。

补全参考清单还可显式引用本次运行中一个直属同级节点：

```json
[
  { "sibling": "palm", "description": "同手实际掌片；核对手指隐藏根端的真实搭接位置" }
]
```

`path` 与 `sibling` 二选一。`sibling` 只允许单段名称，须是当前父节点下已经登记的其他直属子节点；缺失或尚未完成整层去重时报错，不隐式查找其他组。运行器取该节点经审查和同层去重的只读 SVG，生成保持完整画布坐标的参考 PNG，并显式开放该 SVG 的 `read_svg`。图片、用途、组 ID、源 SVG、源版本和 `sourceStage: "reduction"` 写入当前请求。它不读取同级正在生成的补全稿，因此不依赖并发任务的完成顺序；后续补全会保留这份底形。此引用只在 completion 步骤支持，children 等步骤仍只支持图片路径。

手指连接先验配置在以下完整 ID 的 `completion.md`，每项旁边的清单都声明同手 `palm`：

| 父路径 | 应用先验的直属 part |
| --- | --- |
| `arms/arm_left/hand` | `thumb`、`index_finger`、`middle_finger`、`ring_finger`、`little_finger` |
| `arms/arm_right/hand` | `thumb`、`index_finger`、`middle_finger`、`ring_finger`、`little_finger` |

十根手指都可能因遮挡而缺少实际掌指连接，因此逐项配置，不仅针对小指。拇指按自身根部与鱼际附近处理，其他四指沿各自走向判断；已有合理搭接时不强行新增。`hand` group 与 `palm` part 不套用这份伸入侧先验，掌片保留覆盖侧职责。仍按完整 ID 精确匹配，不按末段名称或祖先自动继承；新分组使用其他 ID 时须显式配置相应目录。

上述十份清单同时引用 `arms/references/fingers/complete-fingers.png`，补全模型实际收到三张图片：本角色、同手掌片、Milly／樱桃完整指体参考板。只借鉴被遮指身、近端厚度和局部搭接，不照搬第三方姿态、宽度、肤色或图集朝向，不把图例按指名硬套到当前角色。程序仍只允许新增补全路径；若错误来自可见轮廓或父范围，须报告回退位置。参考来源和本地文件约定见 `arms/references/fingers/README.md`，此清单不会影响 outline 或 review。当前配置变更不自动重跑已有结果。

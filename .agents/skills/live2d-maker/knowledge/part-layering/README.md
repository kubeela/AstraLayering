每个 group/part 可按完整 ID 放置特化提示词；目录沿用 `groups/`，匹配不受节点 kind 限制：

- `face/outline.md`：替换 face 的通用轮廓绘制提示词。
- `face/review.md`：替换 face 的通用审查提示词。
- `face/completion.md`：替换 face 的正面遮挡补全提示词。
- `face/children.md`：替换 face 的直属结构拆分提示词，子节点标注 group/part。
- `face/eye/outline.md`：只替换 face/eye，不影响 face 或其他组。

每个步骤独立选择；没有对应文件时使用该步骤的通用正文。特化文件完整替换通用正文，不继承祖先提示词。程序仍附加当前组、参考图、父 SVG 和画布等运行输入；绘制与补全收到草稿输出路径，review 收到候选 SVG 和审查报告路径。

拆分通用正文为 `10-直属结构拆分.md`，固定操作约定 `10-拆分操作约定.md` 始终附加。左右眼、左右手臂和左右手的规则各放在对应完整 ID，便于分别特化；没有隐式按名称或祖先继承。层级说明与取舍依据写入每个子节点 note，后续绘制、review、补全均收到它。`hair/completion.md` 补正面遮挡下完整后发及头盖范围，供后续拆分，不生成侧面或背面视图。

已完成步骤继续跳过；改提示词或参考图不会自动重做已有结果。实际使用的提示词路径和完整正文保留在 agent 的 request.json 中。

额外参考图直接写在提示词正文的 `additionalReferences` 中：每项是图片路径（`{reference:…}` 指本目录内的素材，`{uri:…}` 指本次运行的产物）和用途说明。模型按当前疑问用 `view_bitmap` 或 `preview_svg` 查看需要的图片，不会预先附加图片，也不要求逐张查看。`hair`、`hair/bangs`、`hair/back_hair` 的拆分正文各自列出参考板，参考板存放在 `step12_children/references/hair/`：三张参考板经该目录 `.gitignore` 白名单纳入 git，其余派生裁片本地忽略。修改后不会自动重做已经完成的拆分。

补全通用正文为 `prompts/9-正面遮挡补全.md`。face 的特化只补正面脸型与耳部，不补完整头型、侧面或背面。操作约定独立放在 `prompts/9-补全操作约定.md`，每次补全调用读取，并始终在通用或特化正文及本次输入后追加；修改这段提示词无需改代码。文件缺失或为空会报错，实际正文和来源路径写入请求记录。程序的原形保留校验独立于提示词。

十根手指的补全特化放在以下完整 ID 的 `prompts/groups/<完整ID>/9-正面遮挡补全.md`：

| 父路径 | 应用先验的直属 part |
| --- | --- |
| `arms/arm_left/hand` | `thumb`、`index_finger`、`middle_finger`、`ring_finger`、`little_finger` |
| `arms/arm_right/hand` | `thumb`、`index_finger`、`middle_finger`、`ring_finger`、`little_finger` |

十根手指都可能因遮挡而缺少实际掌指连接，因此逐项配置，不仅针对小指。拇指按自身根部与鱼际附近处理，其他四指沿各自走向判断；已有合理搭接时不强行新增。`hand` group 与 `palm` part 不套用这份伸入侧先验，掌片保留覆盖侧职责。仍按完整 ID 精确匹配，不按末段名称或祖先自动继承；新分组使用其他 ID 时须显式配置相应目录。

每份手指正文的 `additionalReferences` 列出两项：同手掌片经审查和同层去重的 SVG `{uri:part-layering/step10_reduce/depth{layer_depth}/arms/<侧>/hand/palm.svg}`，以及 `{reference:step11_completion/references/fingers/complete-fingers.png}`（Milly／樱桃完整指体参考板）。掌片路径由去重的固定布局决定，不读取同级正在生成的补全稿，也不记为补全的依赖。只借鉴被遮指身、近端厚度和局部搭接，不照搬第三方姿态、宽度、肤色或图集朝向，不把图例按指名硬套到当前角色。程序仍只允许新增补全路径；若错误来自可见轮廓或父范围，须报告回退位置。参考来源见 `step11_completion/references/fingers/README.md`。

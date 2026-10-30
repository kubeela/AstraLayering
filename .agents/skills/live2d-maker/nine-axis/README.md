# 头部九轴

本 section 目前只有约定的产物目录，尚无流水线入口与提示词；pink-doll 的成果由人工拟合制作，用来固定后续工作流应生成的格式。日后接入时仍按上游组织：提示词、参考与工具放 `knowledge/nine-axis/step01_head/{prompts,references,tools}`，状态只记在任务根 `run.json`。

| 步骤 | 输入 | 交付 |
| --- | --- | --- |
| `step01_head` | 角色工作台当前载入的 KRA / PNG（有阴影蒙版交付时即 `shadow/step01_mask/character-shadowed.*`） | `nine-axis/step01_head/deformers.json`、`layers/*.png`、`character-nine-axis.kra`、同名 PNG、`source.json` |

路径常量见 `shared/nine-axis.ts`。

- `deformers.json`：每个头部图层一个 16×16 warp deformer，控制点为原画像素，关键形在 ParamAngleX −30 / 0 / +30；`layers/` 是各层贴图，路径相对本步骤目录。
- `character-nine-axis.kra`：在来源 KRA 上补绘转头露出的区域（例如后发被脸遮住的内层与外轮廓线），其他图层与 UUID 不变，因此阴影 `shadows.json` 的绑定仍然有效。旧 KRA 不覆盖。
- `source.json`：`{version: 1, sourceDocument, sourceColor, sourceKraHash, sourceColorHash, updatedAt}`，记录制作时的来源工程。

载入顺序：工作台先按既有规则选出组装或阴影 KRA；若 `source.json` 指向的正是这份 KRA / PNG 且哈希一致，改为载入 `character-nine-axis.kra` 与同名 PNG。来源变化时退回所选 KRA，并标记九轴 KRA 待重做，不混用旧补绘。

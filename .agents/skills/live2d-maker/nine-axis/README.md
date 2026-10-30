# 头部九轴

入口：`pnpm nine-axis --name <任务名> --knowledge <先验知识目录>`，或 `pnpm start --name <任务名> --from nine-axis --to nine-axis`。默认整条流程只到 shadow；头部九轴需要生视频接口，单独启动。目前 step01 已接入流水线；step02 的变形器与补绘仍由人工拟合制作（pink-doll），用来固定后续工作流应生成的格式。状态只记在任务根 `run.json`。

| 步骤 | 输入 | 交付 |
| --- | --- | --- |
| `step01_turn` | 角色工作台当前的角色图（阴影蒙版完成时为 `shadow/step01_mask/character-shadowed.png`，否则为 `character-assembly/step01/character-assembled.png`），以及 `part-layering/parts/{face,hair,head_accessories}.svg` | `nine-axis/step01_turn/upper-body.png`、`crop.json`、`turn.mp4`、`turn.json`、`turn-30.png` |
| `step02_head` | 同上的 KRA / PNG 与 `step01_turn/turn-30.png` | `nine-axis/step02_head/deformers.json`、`layers/*.png`、`character-nine-axis.kra`、同名 PNG、`source.json` |

路径常量见 `shared/nine-axis.ts`。

## step01_turn：转头视频与 30° 关键帧

1. 按脸、头发、头饰形状的不透明范围截取方形上半身：上沿为头部最高点，下沿为脸底再往下两个脸高（到胸口），以脸中心为横向中心，四周留 6%；超出画布处补灰（128）。裁切框写入 `crop.json`。
2. 以 `upper-body.png` 为首帧、`knowledge/nine-axis/step01_turn/prompts/orbit.md` 为提示词调用生视频模型：时间冻结，镜头 5 秒内匀速环绕 0→90°，结束于正侧面。
3. 程序解码统计帧数 N，取第 `round((N-1)×30/90)` 帧为 `turn-30.png`；帧号、帧数与实际角度写入 `turn.json`（另含模型、提示词、视频 id 与各文件哈希，不含密钥）。

需要 `.env`（或网页「设置 → 生图服务」）中的 `layering_video_base_url`、`layering_video_api_key`，`layering_video_model` 默认 `seedance-2.5`；未配置时启动即报错。还需要 ffmpeg（可用 `ASTRA_STUDIO_FFMPEG` 指定路径）。来源角色图重做后 step01 随之重做。

## step02_head

- `deformers.json`：每个头部图层一个 16×16 warp deformer，控制点为原画像素，关键形在 ParamAngleX −30 / 0 / +30；`layers/` 是各层贴图，路径相对本步骤目录。
- `character-nine-axis.kra`：在来源 KRA 上补绘转头露出的区域（例如后发被脸遮住的内层与外轮廓线），其他图层与 UUID 不变，因此阴影 `shadows.json` 的绑定仍然有效。旧 KRA 不覆盖。
- `source.json`：`{version: 1, sourceDocument, sourceColor, sourceKraHash, sourceColorHash, updatedAt}`，记录制作时的来源工程。

载入顺序：工作台先按既有规则选出组装或阴影 KRA；若 `source.json` 指向的正是这份 KRA / PNG 且哈希一致，改为载入 `character-nine-axis.kra` 与同名 PNG。来源变化时退回所选 KRA，并标记九轴 KRA 待重做，不混用旧补绘。

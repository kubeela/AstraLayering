# Jianma2D 分层色稿

仅完成 `live2d-layering` 步骤 1–3；未运行步骤 4 及后续精修、衣装或动画。

- 输入与参考：[本轮原图](references/original.png) · [风格转换图](references/simplified-character.png)（[精确提示词](references/simplified-character.prompt.txt)）· [连体服结构参考](references/base-subject.png)（[精确提示词](references/base-subject.prompt.txt)）；[运行选项](options.json)。
- 结构与色稿：[45 叶组清单](structure/groups.json) · [可编辑 SVG](block-layers/character.svg) · [白底预览](block-layers/preview.png)。双耳共享叶路径的前后段使 SVG 共含 47 个绘制段。
- 审查：[独立审查报告](reviews/group_layers/审查.md)最终 `pass`，R1–R3 均关闭；[轮廓证据清单](block-layers/evidence/review-manifest.json)。
- 模型与会话：参考判断 `gpt-6-sol xhigh`（`01a0e897-dc9d-77a3-b58a-5b7a2281fedc`），结构规划 `gpt-6-sol xhigh`（`01a0e89c-7ea9-7bc2-bd7b-9c2a177f0a29`）；两次参考生图为 `gpt-image-2`；绘制 `gpt-6-astra xhigh`（`/root/group_layer_drawing`、恢复会话 `/root/group_layer_drawing_recovery`），独立审查 `gpt-6-astra xhigh`（`/root/group_layers_review`）。
- 局限：遮挡下的胸腹、骨盆、发根为合理推定；细发梢和小饰件边界仍可能有约 1–3 像素误差。

版本、返修及会话恢复经过见[运行记录](运行记录.md)。

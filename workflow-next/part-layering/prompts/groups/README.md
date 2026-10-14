每个 group 可按完整 ID 放置特化提示词：

- `face/outline.md`：替换 face 的通用轮廓绘制提示词。
- `face/review.md`：替换 face 的通用审查提示词。
- `face/eye/outline.md`：只替换 face/eye，不影响 face 或其他组。

每个步骤独立选择；没有对应文件时使用 `prompts/5-组轮廓.md` 或 `prompts/6-轮廓review.md`。特化文件完整替换通用正文，不继承祖先提示词。程序仍附加当前组、参考图、父 SVG 和画布等运行输入；绘制收到草稿输出路径，review 收到候选 SVG 和审查报告路径。

已完成步骤继续跳过；改提示词不会自动重做已有结果。实际使用的提示词路径和完整正文保留在 agent 的 request.json 中。

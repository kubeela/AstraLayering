# 人物分层新流程（建设中）

1—3 步准备角色与线稿参考、初始 group 树和大形体色块。第 4 步基于 `groups.json` 广度遍历 group，由 generic 完成父级轮廓补全、直属拆分与色块、直属 part 的 Geometry 和 Rendering Stack。每个 group 的制作步骤续用 Astra xhigh 会话 `group:{group_path}`；2.1 直属结构拆分单独使用 Sol xhigh 会话 `group_split:{group_path}`。进度保存在独立状态文件，成功产物通过 carry 传递。

Rendering Stack 按基色、大明暗、过渡色、局部暗部、投影、高光及线色融合推进。独立效果登记在 `structure/rendering.json`，与 group/part 树分开。第 5 步在 part 全部完成后组合渲染层、绑定受影蒙版并自查；最终绘制为 `refinement/character.svg`，预览为 `refinement/preview.png`，轮廓底稿为 `block-layers/groups.svg`。

入口规则见 [SKILL.md](SKILL.md)，调度语法见 [Workflow DSL](docs/workflow-dsl.md)，任务以各步骤的 `流程.yaml` 和提示词为准。

# test：当前分层结果

本目录直接采用 part-layering 的标准运行格式。最新确认的 hair 已替换进同一份 `groups.json`，没有独立快照子目录，也不再保存 `progress.json`。

直接打开 [头发交互预览](previews/index.html)，或查看 [八个末端 part 总览](previews/terminal-parts.png)。预览、SVG 和审查观察引用使用本目录内的相对路径，可跨机器查看。

## 当前结果

组树包含原有 8 个根组和最新 hair 的 9 个后代，共 17 个节点。hair 子树共 10 个节点、8 个末端 part：头盖、发髻、左右前侧发、左右长发主面、左右中长游离束。新版直接放在 `parts/hair.svg`、`parts/hair/` 和对应的 `stages/` 路径中；旧 hair 组织与旧预览已替换。

其他 7 个根组保留其已有轮廓与 review，尚未补全或分析子组。根层去重直接沿用实际完整运行中与这 8 个轮廓匹配的整批结果；hair 后两层的批次和结果来自已确认的新运行，没有拼造审查结论或去重记录。

新生成的 9 个 hair 节点最终均通过独立轮廓 review，补全检查通过。根 hair 沿用按两轮意见返修的父稿，没有新增第三次根 review。父范围仍有少量已标明的边缘缺口；这不是最终着色、绑定或整树合并成稿。

## 标准目录

- `groups.json`：唯一的主体和组树。
- `references/`：角色原图、简化参考、素体参考及判断记录。
- `stages/outline/`、`stages/review/`：当前轮廓、对应 review 和必要返修记录。
- `stages/outline-reduce/`：去重后的 SVG 及各层实际批次记录。
- `parts/`、`stages/completion-check/`、`stages/children/`：最新 hair 的补全形体、自检与子组分析事实。
- `observations/review/`：已收录审查记录引用的观察图。
- `previews/`：当前 hair 的离线交互预览与所需图片。

SVG 保留源结果字节，报告仅规范化机器路径，候选哈希与结论保持不变。agent 日志、账号/用量信息、无关试验及第三方拆分参考板不在目录内。查看结果无需模型调用；若继续制作其他部位，按当前流程补齐其待办，所需拆分参考按 prompts 中的说明准备。

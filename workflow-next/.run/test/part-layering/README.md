# test：完整执行结构与当前结果

本目录按标准运行格式收录已经实际跑出的全部部位结果，并以最新确认的 hair 替换旧 hair 分支。组树只保存在 `groups.json`；`childrenAnalysis` 只记录当前节点分析所依据的完成 SVG 哈希及依据，与子节点一次原子保存。没有 `progress.json` 或 `stages/children/` 副本。

直接打开 [完整流程预览](previews/index.html)，可选择部位、层级和阶段；所有已完成的补全结果均在 `parts/`，并非只有 hair。

## 已实际执行到哪里

| 层级 | 节点数 | 已完成绘制、review、去重、补全、自检及必要分析 |
| --- | ---: | ---: |
| 第一层 | 8 | 8 |
| 第二层 | 27 | 27 |
| 第三层 | 51 | 51 |
| 第四层 | 29 | 29 |

完整树共 115 个节点，现已全部完成。第四层 29 个节点全部为终止 part，没有第五层。最终预览合并已接入，当前 [preview.svg](preview.svg) 包含 90 个终止叶节点的实际 SVG，保留完整 115 节点的逻辑树，并与本目录 [groups.json](groups.json) 对应。合并沿用树顺序、后项在前；父组底稿不重复绘制。当前结果用于部件预览，尚未制作着色或绑定。hair 子树含 10 个已完成节点、8 个末端 part。

用 [part-preview](../../../../loading/part-preview.html) 加载 preview.svg、references/base-subject.png 和 groups.json，可使用 A/B 混合、两侧、滑动和描边；匹配分组后可从画布单击定位到右侧条目。实际合并核验见 [记录](supervision/part-preview-verification.json)，页面截图见 [预览器](previews/part-preview-ui.png)。

顶部卡片支持悬浮提示与单击更换，A/B 之间的箭头交换图片，B 和 groups.json 各自带移除 ×。下载菜单可导出完整画布或当前放大区域 PNG，保留当前对比及显隐设置。已实际核对四种模式、单图、放大描边、棋盘格背景和隐藏部件；40% 滑动导出的对应区域与两侧整图逐像素一致（排除分割线）。

2026-10-15 的首批执行、教程对照及已知上游限制见 [第四层首批验收报告](acceptance-level4.md)。随后已将连接先验正式收录到左右十指的完整 ID 提示词及参考配置，删除十指旧补全与检查后，经统一入口真实重跑；三根左手手指补了隐藏近端，其余七根已有合理搭接而无需新增。左小指的掌指空档由正常流程重新补好，part 未分子组。详见 [正式接入与十指重跑验收](acceptance-finger-priors.md) 及 [重跑对照图](previews/level4/hand-prior-mainflow-comparison.png)。

## 标准目录

- `groups.json`：唯一组树及必要的分析输入版本、依据。
- `references/`：本次角色的已准备参考图。
- `stages/outline/`、`stages/review/`：所有已执行节点的轮廓与真实 review，含相应返修记录。
- `stages/outline-reduce/`：实际去重结果和批次；第二、三层保留原完整运行与 hair 重跑的原始收据，逐项导入对应结果；第四层 29 个 part 本次已联合执行去重。
- `parts/`、`stages/completion-check/`：全部 115 个已完成节点的补全 SVG 和对应自检。
- `observations/review/`：已收录的审查观察证据。
- `previews/`：全树阶段预览及六组第四层局部对照。

生成 SVG 保持源文件字节；报告只规范化机器路径，结论和候选哈希不改写。root hair、arms 等原有两轮返修结果仍如实区分为已返修而非额外独立 pass；父范围的已知缺口保留说明。第四层保留正式阶段产物、审查报告与必要局部对照，报告中引用的逐次观察图仍留在本地。原始 agent 转录、账号/用量信息、重复观察预览和第三方拆分参考板不纳入精选版本；本地原始运行日志保持忽略。

# RGB 控制图 → 角色部件 → Krita

本流程把已验收的 `../part-layering/.run/test` 结构接到本地 imagegen 和 Krita，
不修改原有 SVG、115 节点组树或分层检查结果。

实例交付见 [角色分层](../../demos/gpt-image-2.5-krita/README.md)。使用本机已有
`forgeax-imagegen` CLI（调用已安装 imagegen 技能），凭据由 CLI 私有配置加载，
不进入脚本、命令参数或仓库。模型为 `gpt-image-2.5-flare`；若单部件需要返修，
该实例也使用了 `gpt-image-2.5-sunburst`。

## 操作

```sh
python3 -m venv --system-site-packages .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python prepare.py
xargs -0 -P 4 -I TASK bash -c TASK < .work/commands.nul
.venv/bin/python assemble.py
python3 launch_krita.py --krita /path/to/krita --output ../../demos/gpt-image-2.5-krita
.venv/bin/python validate.py ../../demos/gpt-image-2.5-krita
python3 make_preview.py ../../demos/gpt-image-2.5-krita
```

Krita 需有 Python 插件能力和可用的 X11 display（可用 Xvfb）。启动器给本次导入单独的
配置与插件目录，不改用户正常会话的偏好。脚本等待 Krita 完成保存，再通过其原生读取器
重开 KRA、导出 PNG 并记录图层数量。导入完成的窗口会保留供检查。

`.work/` 缓存原图裁切、控制图、独立提示词、真实模型返回和调用日志。已有成功返回会复用。
`selected.json` 可选择返修模型和提示词；所有正式输出保留实际采用的模型、提示词和哈希。
本例的精选返修指令已保存在每个正式部件的 `prompt.txt`。

## 图像处理边界

- 完整 SVG 规定补全后的部件边界；outline-reduce 和树内遮挡顺序规定可见像素归属。
- 控制图固定为红色保留、黄色补全、绿色透明。源图与控制图按同一窗口裁切并放大。
- 模型图像先检测 alpha／背景，再按包围盒和必要的逐行形状配准回原始坐标；最终 alpha
  来自部件标准。没有假棋盘格或另行生成的角色覆盖在最终图上。
- 绝大多数可见像素直接从原图回填。脸底五官与发饰边缘的抗锯齿残影做局部柔化，避免
  独显脸底时仍有五官轮廓。逐部件修整还允许脚部饰品边缘的显式像素选区；验证把可见变化
  限定在这些区域内，并继续检查原有整图误差预算。
- 每个部件的完整绘画层保留遮挡补全。Krita 的独立透明蒙版控制原姿势遮挡；关闭该蒙版
  即可看到完整部件，不破坏底层像素。
- 已准备的 `visible.png` 可以独立重组；验证还会比较真正重开 KRA 导出的画面，防止只在
  Python 中合成正确或用整图覆盖来冒充分层。

当前为原姿势的可编辑拆分资产。没有自动生成 Live2D 网格、参数绑定或动画。

## 逐部件复查与局部修整

先关闭原姿势遮挡蒙版，按相同裁切坐标比较原图、完整部件和修前版本，再决定每个局部的
处理方式。整图相似度不能判断隐藏区域是否干净。需要检查覆盖物残影、肤色／材质污染、
拼接硬边、透明边缘、断线和同一细节重复归层；保留本来就属于原画的阴影和细线。

本例的 `retouch_case.py` 保存了逐图审查后选定的坐标与材质处理。它是这个角色的修整配方，
不是通用瑕疵检测器。Python 计算局部克隆、边界平滑及像素归层；`krita_retouch.py` 打开
原有 KRA，用 Krita 原生 `setPixelData` 和透明蒙版选区接口写回对应矩形，保持图层树不变。
这条路径采用脚本像素修补，不声称使用了鼠标手绘笔刷。

从未修整的 `91a8a080` 交付目录开始，在独立目录执行：

```sh
.venv/bin/python retouch_case.py --input /path/to/baseline --output .work/refined
python3 launch_krita.py --krita /path/to/krita --output .work/refined --profile .work/retouch-profile --script krita_retouch.py
.venv/bin/python validate.py .work/refined
.venv/bin/python review_parts.py .work/refined
python3 make_preview.py .work/refined
```

`retouch-plan.json` 记录选区、理由和前后哈希；受影响部件的 `before-retouch.png` 与
`retouch-mask.png` 保存原始像素和改动范围。Krita 写回前检查原图层与审查基线一致，保存后
重开验证全部 90 个图层。`part-review/index.html` 提供 90 项独立对照；没有改动的部件也列出，
小部件使用最近邻放大，避免平滑插值掩盖像素边缘。

## 保留遮挡的肩部修整

`covered_shoulders.py` 是同一角色的局部修整配方：两侧肩带补成邻近肤色，白色衣料改为连续的
无肩带上缘，保留胸前、躯干及裆部遮挡。只修改躯干和胸前两个原生图层，不改变部件坐标或蒙版。
交付见[露肩底图](../../demos/gpt-image-2.5-krita/covered-shoulders/README.md)。

从未带本变体的 `0028d4a2` 源目录开始，或指定一个新的输出目录：

```sh
python3 covered_shoulders.py --input ../../demos/gpt-image-2.5-krita --output ../../demos/gpt-image-2.5-krita/covered-shoulders
python3 launch_krita.py --krita /path/to/krita --output ../../demos/gpt-image-2.5-krita/covered-shoulders --profile /path/to/isolated-profile --script krita_retouch.py
python3 verify_covered_shoulders.py ../../demos/gpt-image-2.5-krita/covered-shoulders
python3 make_preview.py ../../demos/gpt-image-2.5-krita/covered-shoulders
python3 make_preview.py ../../demos/gpt-image-2.5-krita
```

若已有 Krita 实例运行，给新启动器设置独立且权限为 `700` 的 `TMPDIR`，隔离 Qt 单实例 socket，
并使用独立 X11 display 和 profile。不要关闭用户原来的 Krita 文档。

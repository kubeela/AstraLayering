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
  独显脸底时仍有五官轮廓。验证要求这种可见修整严格限于脸底，并量化整图误差。
- 每个部件的完整绘画层保留遮挡补全。Krita 的独立透明蒙版控制原姿势遮挡；关闭该蒙版
  即可看到完整部件，不破坏底层像素。
- 已准备的 `visible.png` 可以独立重组；验证还会比较真正重开 KRA 导出的画面，防止只在
  Python 中合成正确或用整图覆盖来冒充分层。

当前为原姿势的可编辑拆分资产。没有自动生成 Live2D 网格、参数绑定或动画。

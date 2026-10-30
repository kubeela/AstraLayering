# Live2D 官方示例：头发相对脸的深度

两张参考板 04、05 由 Live2D 官方示例模型渲染，用来说明头发按**相对脸的深度**而不是按正面露出宽窄分类。每格左 0°、右 `ParamAngleX` 30°；浅色区域是脸的剪影，按原模型真实层序叠放，因此画在脸后的头发被脸挡住的部分看不见，后发格把脸半透明叠放，以显示画在脸后的内侧面。

| 板 | 模型 | 内容 |
| --- | --- | --- |
| `04-侧发与后发按脸前后深度区分-Hiyori-Mao.png` | Hiyori、Mao | Mao 宽横髪＝侧发；Hiyori 细横髪＝鬓发；脸框长发画在脸后属后发 |
| `05-前发覆盖额角-后发外壳与呆毛-Ren-Haru-Tsumiki.png` | Ren、Haru、Tsumiki | Ren 前发连额角为一面；后发为外壳＋内侧面，转头几乎不动；Tsumiki あほ毛单独成件 |

工作流使用的副本在 `.agents/skills/live2d-maker/knowledge/part-layering/step12_children/references/hair/`，与本目录同名文件字节一致。

## 来源与许可

- Hiyori、Mao、Haru：本仓库 `tutorial/live2d-guidance/model-originals/archives/qq-mail-20261009/` 已收录的原包。
- Ren、Tsumiki：Live2D 官方示例数据下载页（https://www.live2d.com/zh-CHS/learn/sample/），适用 Live2D 免费素材使用许可协议（一般用户及小规模企业可商用）。未提交原模型，仅提交渲染图。
- `sources.json` 记录渲染所用 moc3、model3.json 与贴图的 SHA-256。

## 复现

依赖 `live2d-py`、`glfw`、`PyOpenGL`、`numpy`、`Pillow`，需要 OpenGL 环境（无显示时用 `xvfb-run -a`）。`specs/*.json` 中的模型路径相对于 runtime 模型根目录。

```bash
for m in hiyori mao ren haru tsumiki; do
  xvfb-run -a python render_pieces.py specs/$m.json pieces/$m <模型根目录>
done
python build_boards.py pieces out   # 生成 04、05 与 boards.json
```

- `moc.py` 读取 moc3 的 Part 父子关系：单独渲染某个 Part 时保留其祖先与子孙，否则不透明度沿层级传递会使其消失。
- `render_pieces.py` 每个角度输出整头、仅脸、仅该部分、该部分＋脸四次渲染，按像素差得到真实层序的脸剪影。
- `build_boards.py` 排版参考板（字体 Noto Sans CJK SC），缩放与裁切按模型分别设置。

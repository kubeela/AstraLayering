# 头发参考资料与制作记录

三张 **2026-10-15 原始参考板**已于 2026-10-20 从本机旧素材库逐字节找回。这里的 PNG 是原件副本，没有重新绘制或重建；另有 18 张原始裁片、索引页和完整裁切坐标。

| 原始图片 | 尺寸 | SHA-256 |
| --- | --- | --- |
| [发区组织与前侧发拆分 · Milly](01-发区组织与前侧发拆分-Milly.png) | 1560 × 1505 | `7c4c2cd0b72c8434550e0fe7289f011067a5166013cc109a5a93fc13a4a35b56` |
| [长发主束与细束的粒度对照 · 莉尔](02-长发主束与细束的粒度对照-莉尔.png) | 1560 × 1505 | `6dd6c9c226fce596d8347f9b992166a56a03e0980426133945e3d96a7c12de55` |
| [长卷发整束与多尖发面 · 樱桃蛋糕天使](03-长卷发整束与多尖发面-樱桃蛋糕天使.png) | 1560 × 1505 | `7667b9c5ed2b5012d2199cf13862fee0f83d51501842a45dcd0109e3411de732` |

[打开参考板索引](index.html) · [来源、裁切坐标与裁片哈希](manifest.json) · [恢复记录](recovery.json)

本目录保存资料副本；[model-originals](../model-originals/readme.md) 保存三套模型及原包，均受 Git 跟踪。工作流仍使用原 `workflow-next/part-layering/prompts/groups/hair/references/` 中已恢复的三张图片。本次不移动工作流图片，不修改提示词、引用清单或执行逻辑。旧 `local-assets` 副本保留。

[原制作取证](provenance/README.md) · [原始研究资料](../hair-reference-research-20261015/README.md)

## 重复执行原制作流程

原始 [制作脚本](build-hair-reference-templates.original.py) 与 [Milly PSD 核对脚本](research-milly-hair.original.py) 按找回时的字节保存，供取证；原脚本会写旧本地目录。日常复现使用安全入口 [build.py](build.py)，保持原来的裁切、透明边界检查、标题、六格排版、同板缩放和颜色，仅调整输出与来源定位并增加哈希检查。

需要 Python 和 `requirements.txt` 指定版本的 Pillow，以及原流程使用的 Windows 字体 `C:/Windows/Fonts/msyh.ttc`。字体哈希记录在 `recovery.json`；其他字体或渲染版本可能影响像素，不能冒充原板。

```powershell
python -m pip install -r tutorial/live2d-guidance/hair-reference-templates/requirements.txt
python tutorial/live2d-guidance/hair-reference-templates/build.py --output work/hair-reference-rebuilt
```

输出目录必须为空。生成清单明确标记“依据原流程重建”，并在 `rebuild-verification.json` 中比较三张板与已恢复原件的 SHA-256；不会覆盖本目录或旧原件。

## layering 参考资料约定

其他参考资料、制作脚本、来源和必要原始素材在 `tutorial` 内维护并受 Git 跟踪，不能只留在忽略目录、临时目录或个人 Downloads。裁片坐标和来源哈希随资料保存。现有工作流的图片位置及引用保持原样。

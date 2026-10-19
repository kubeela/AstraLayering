# Layering 参考资料维护

相关资料在 `tutorial` 内维护并纳入 Git。来源文件、参考板、裁片、坐标、哈希和制作脚本随资料保存，不再仅保留在临时目录或本机忽略目录。历史记录保留原文，当前存储状态由本索引及文件清单说明。

| 资料 | 仓库位置 | 保存内容 |
| --- | --- | --- |
| 头发参考资料 | [hair-reference-templates](hair-reference-templates/README.md) | 原板资料副本、18 张裁片、坐标、制作与研究脚本、安全复现入口、会话取证 |
| 头发拆分研究 | [hair-reference-research-20261015](hair-reference-research-20261015/README.md) | 32 个原研究文件、PSD 发区证据和图集预览 |
| 完整指体参考 | [finger-reference-materials](finger-reference-materials/README.md) | 完整参考板、来源与 UV/PSD 清单、明确的独立裁片及脚本缺口 |
| 模型原件 | [model-originals](model-originals/readme.md) | Milly、莉尔、樱桃蛋糕天使 35 个原始模型文件、作者原说明、两份原 ZIP |
| 逐文件核对 | [layering-reference-inventory.json](layering-reference-inventory.json) | 仓库相对路径、尺寸、字节数、SHA-256 |

本次只保存资料；现有工作流原图位置、引用清单、提示词和执行逻辑保持原样。

复核资料及 Git 中的字节：

```powershell
python tutorial/live2d-guidance/tools/verify_layering_references.py --git-ref HEAD
```

本机旧 `local-assets`、原下载文件和运行记录保留。历史清单提到但尚未下载的云端包不计作已保存；不把未取得的源文件写成已完成。

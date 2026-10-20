# QQ 邮箱学习模型附件 · 2026-10-09

2026-10-20 应用户要求，通过已登录的 QQ 邮箱浏览器会话保存“Live2D 学习模型原件”系列全部 25 封邮件的附件，合计 **254,857,598 字节**。第一封标题仍为“1/19”，后续调整为 25 封；这是同一批资料，第一封完整教程 ZIP 有效。

普通附件下载被浏览器取消，因此使用邮箱自带的“显示邮件原文”入口读取已渲染的 MIME 数据，将其中的附件 base64 解码为原始 ZIP。每个文件名及字节数均与邮件列表声明核对。没有保存邮箱登录参数、Cookie、完整邮件原文或私人邮件头。

| 原始模型 ZIP | 本目录保存的附件 | 分卷情况 |
| --- | --- | --- |
| haru_greeter_ja.zip | haru_greeter_ja_part01 至 part04 | 4/4 齐全 |
| hiyori_en.zip | hiyori_en_part01 至 part04 | 4/4 齐全 |
| koharu_haruto_ja.zip | koharu_haruto_ja_part01 至 part02 | 2/2 齐全 |
| mao_casualtutorial02.zip | mao_casualtutorial02_part01 至 part07 | 7/7 齐全 |
| miara_en.zip | miara_en_part01 至 part04 | 4/4 齐全 |
| natori_en.zip | natori_en_part01 至 part03 | 3/3 齐全 |
| momose_tutorial01.zip | 同名完整 ZIP | 无需合并 |

25 个 ZIP 均通过 CRC 检查。24 个分卷 ZIP 内部的 `.bin` 按序读取拼接后，六个原始模型 ZIP 的 SHA-256 全部符合各包 `README_恢复说明.txt` 中的预期值；没有缺卷或重复卷。为保留邮件附件原件且避免重复保存大文件，本目录未另写一套合并 ZIP。使用时按原包恢复说明合并相应 `.bin`；Momose 可以直接解压。

- [邮件列表中的附件名与声明大小](expected-attachments.json)
- [实际保存记录与逐文件 SHA-256](download-records.json)
- [完整核验报告与六个原包 SHA-256](verification.json)

重新核对：

```powershell
python tutorial/live2d-guidance/tools/verify_qq_mail_archives.py
```

本目录资料纳入 Git。没有改动工作流、提示词、引用路径或已有图片位置。

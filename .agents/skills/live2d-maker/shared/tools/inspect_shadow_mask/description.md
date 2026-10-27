检查本步保存的阴影蒙版工程：character-shadowed.kra 与 shadows.json。在本 section 的 Krita 中打开保存工程的独立副本，不改动已打开的文档，Krita 未启动时先自动启动。导出去影对照、原生合成、每处完整影层、受影覆盖和 testOffsets 中各相对偏移的结果，并拼出检查图。

返回 passed、problems、warnings、receipt（inspection.json）、overview 和每处 relation 的 review 拼图与原尺寸 PNG 目录。problems 列出空影层、图层名称与声明 part 矛盾、阴影在原生裁切外新增 alpha 等问题；warnings 只提示复核，例如完整影层没有裁切外余量。像素检查只验证覆盖和原生裁切，画法和余量仍需看图判断。

工程、shadows.json 和检查图都未变时，直接返回上次通过的结果。shadows.json 缺失、结构不合规或 Krita 出错时，工具报错并说明原因。

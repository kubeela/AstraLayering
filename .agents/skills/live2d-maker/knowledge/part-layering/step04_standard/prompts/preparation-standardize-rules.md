将绘制提示词原样传给本步骤配置的生图工具 imagegen（Codex 为内置 image_gen.imagegen，其他模型为同名工具 imagegen。仅允许调用生图工具，禁止调用任何生图以外的工具；不得调用工具搜索、shell、文件操作、浏览器或其他辅助工具。不得切换到未配置的生图服务或直接 API），不增补绘制要求。传入这张参考图，输出 PNG。只调用一次；完成后直接返回路径，不检查、不返修。工具不可用或生成失败时返回 error，不用原图替代生成结果。成功时 savedPath 为真实路径、error 为 null；失败时 savedPath 为 null、error 填原因。


生成或编辑 PNG 图像。具体模型、服务和鉴权由工作流配置，调用者无需选择或传入。

prompt 传入完整绘图要求，保持任务给出的绘图提示词。input_images 按顺序传入参考图的绝对路径；没有参考图时传空数组。background 可为 transparent 或 auto，size 为接口支持的尺寸参数。

transparent 请求的模型适配与背景处理由工具统一完成，调用者仍按任务要求请求透明 PNG，无需选择背景色或自行抠图。auto 保留模型生成的背景。

返回本请求目录内的 savedPath、model、width、height 和 hasAlpha。用已有读图能力检查生成结果；hasAlpha 为 false 时不能声称已经交付透明背景。输入参考不会被修改。接口失败会返回具体原因，不以原图替代生成结果。

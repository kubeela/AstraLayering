# ViTMatte small / Composition-1k

来自 https://huggingface.co/hustvl/vitmatte-small-composition-1k ，论文与原始实现见 https://github.com/hustvl/ViTMatte 。模型卡标记 Apache-2.0，原始实现为 MIT；两份许可证与模型卡随附。

这里将原始权重转换为 FP16 safetensors 存储（51,661,658 字节），推理时恢复 FP32 并在 CPU 执行。配置只移除了转换机器的本地路径。SHA-256：

`1ccf663dfe90ad52c9fd46b0c9bfeaadbf98162275dab09700a5e6c0cfef7a69`

`verification.json` 记录真实绿幕图与原始权重的 alpha 差异，验证范围只包括该图的存储量化误差，不代表所有图像的质量保证。

运行时仅从本目录加载权重，不下载 Hugging Face 模型；Python 包在运行根目录的 `.runtime/matting` 中按环境安装和复用。

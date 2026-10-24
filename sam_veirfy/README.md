# SAM 单图分割验证

**当前决定：暂不接入正式制作流程。** 大件有一定提取能力，但仅凭部件名仍存在左右混检、多实例、漏检及部件身份错误；接入所需的筛选与回退会增加流程复杂度。本目录保留验证成果、原始输出、固定提示词、依赖锁和复现脚本。独立 Python 环境、模型权重、下载缓存与临时文件不纳入版本控制。

本地收尾状态（2026-10-24）：已尝试删除 `env/`、`models/`、`cache/`、`tmp/`、`__pycache__/`，但执行层返回 `blocked by policy`，这些本地目录仍保留，未宣称删除完成。图集浏览已改用现有 Python，删除上述目录不会影响已归档图集。

直接打开[完整部件图集](outputs/elf-parts-e271df62/index.html)，无需模型、PyTorch 或联网。图集包含 79 个部件、两组共 158 次提取；[示例预览](outputs/elf-parts-e271df62/preview.jpg)和每组 10 页静态 JPG 一并保留。[首次四类测试](outputs/pink-elf-verified/overview.jpg)、[环境记录](outputs/environment.json)、[权重来源与哈希](outputs/model-manifest.json)也作为验证记录保留。

需要通过本地服务浏览时，使用任意现有 Python 3.9+，无需重新安装模型环境：

```powershell
python .\sam_veirfy\serve_gallery.py --run elf-parts-e271df62
```

使用标准库即可重新校验全部成果文件的大小、SHA-256 和 79 对提示词：`python .\sam_veirfy\verify_artifacts.py`。

以下为本次实验的复现说明。选择 `facebook/sam3` 完整版，使用 Hugging Face Transformers 的 `Sam3Model` / `Sam3Processor` 在 Windows + CUDA 上推理，独立于原有 `vlrouter` 环境。

## 模型选择依据

- 本实验验证单张人物图的文字概念分割，SAM 3 支持文字与正/负框提示，并输出实例蒙版、边界框和分数。
- Meta 当前 `build_sam3_image_model()` 固定调用 `download_ckpt_from_hf(version="sam3")`。3.1 的 `sam3.1_multiplex.pt` 用于 multiplex 视频跟踪入口，因此此处采用官方单图路径使用的 SAM 3 权重。
- Transformers 已直接实现 SAM 3 单图推理，可以使用 PyTorch SDPA，无需安装 Meta 视频管线或 Flash Attention / Triton 扩展。
- 使用官方 `model.safetensors`，不同时下载重复的 `sam3.pt`。

依据（2026-10-24 核查）：

- [Meta 模型构建代码](https://github.com/facebookresearch/sam3/blob/main/sam3/model_builder.py)
- [Meta SAM 3.1 发布说明](https://github.com/facebookresearch/sam3/blob/main/RELEASE_SAM3p1.md)
- [Transformers 单图文档](https://huggingface.co/docs/transformers/en/model_doc/sam3)
- [官方模型文件与访问授权](https://huggingface.co/facebook/sam3)
- [ModelScope 公开下载来源](https://modelscope.cn/models/facebook/sam3)

## 目录

```text
sam_veirfy/
  env/              本地环境；删除被拦截，不提交
  models/sam3/      本地权重；删除被拦截，不提交
  cache/            下载缓存；删除被拦截，不提交
  tmp/              临时文件；删除被拦截，不提交
  outputs/          环境检查、分割蒙版、叠加预览和 JSON 报告
  setup.ps1         环境创建和安装
  fetch_torch.py    官方 PyTorch 安装包分段下载及 SHA-256 校验
  check_environment.py
  download_model.py 从公开镜像下载，核对官方文件身份，记录 revision
  segment.py        离线加载本地权重并运行单图分割
```

环境、模型、缓存、日志和本地服务状态通过 `.gitignore` 排除；两套成功测试的图像、蒙版、图集、JSON 报告和溯源清单纳入版本控制。

## 安装

在 AstraLayering 仓库根目录运行：

```powershell
.\sam_veirfy\setup.ps1
```

使用已安装的 Miniforge 创建本目录 `env/`。默认安装 PyTorch 2.10.0 + CUDA 12.8、torchvision 0.25.0、Transformers 5.20.2。安装结束会实际检查 CUDA 运算及 SAM 3 类导入，报告写入 `outputs/environment.json`。

`requirements-win64.lock.txt` 记录成功安装后的实际依赖版本。PyTorch 大文件从官方索引分段下载，合并后校验官方索引提供的 SHA-256；下载中断后重跑可复用已有完整分段。

## 权重下载

默认从 ModelScope 的 `facebook/sam3` 公开仓库下载，不需要账号或 Token。下载前读取 Meta 官方 Hugging Face 公开元数据，核对大文件的大小及 SHA-256；小文件下载后核对官方 Git blob ID。模型 LICENSE 随文件保留。

```powershell
.\sam_veirfy\env\python.exe .\sam_veirfy\download_model.py
```

下载脚本只获取 Transformers 所需文件；完整权重约 3.44 GB。大文件可分段续传，分段在 `cache/model-parts/`。下载完成后重新校验落盘文件，并将官方 revision、镜像的固定版本 URL、文件大小、SHA-256 和身份核验结果写入 `models/sam3/download-manifest.json`。

## 单图验证

```powershell
.\sam_veirfy\env\python.exe .\sam_veirfy\segment.py `
  .\.run\pink-elf-20261020\part-layering\references\base-subject.png `
  --prompts "person" "hair" "face" "bodysuit" --run pink-elf-initial
```

也可将输入换成任意本地图片。透明输入先合成到白色背景，合成后的实际输入也会保存。提示词建议使用简短英文名词短语；每个提示词独立生成结果。默认分数阈值 0.5，可通过 `--threshold` 调整。

结果在 `outputs/<run>/`：每个实例的原图尺寸二值蒙版、每个提示词的合并蒙版与叠加图、`overview.jpg`、`report.json`。报告含模型加载时间、每个提示词首次推理时间、GPU 分配/保留峰值、分数、框和面积；首次推理时间包含首次执行开销，不作为稳定吞吐量。

不进行补画或自动遮挡推断。首先检查人物图上实际可见部件的蒙版覆盖、孔洞、边缘和相邻部件污染，再决定是否接入分层流程。

## 已完成的本机验证

2026-10-24 在 RTX 4090 D 上运行成功：Python 3.12.15、PyTorch 2.10.0+cu128、torchvision 0.25.0+cu128、Transformers 5.20.2。GPU 矩阵运算、SAM 类导入和 `pip check` 均通过。模型加载 missing / unexpected keys 均为 0。

采用上述粉发角色图、默认阈值 0.5，结果位于 `outputs/pink-elf-verified/`：

| 提示词 | 实例数 | 模型置信分数 | 推理与后处理时间 |
| --- | ---: | ---: | ---: |
| person | 1 | 0.934 | 0.507 秒 |
| hair | 1 | 0.965 | 0.150 秒 |
| face | 1 | 0.867 | 0.118 秒 |
| bodysuit | 1 | 0.961 | 0.132 秒 |

本次模型加载 3.954 秒，GPU 分配峰值 5.12 GiB、保留峰值约 5.35 GiB。计时包含模型前向、蒙版后处理和 GPU 同步，不含输入预处理、图片保存或模型加载；person 是本进程的首次前向。置信分数是模型输出分数。

已读取 `overview.jpg`，确认四个提示词定位到了对应大区域；头发、脸与连体衣可分别输出。人物蒙版在小腿高光处留下少量小孔。没有做填洞或边缘修正，供后续验证原始模型输出。报告 JSON 与四张实例蒙版已重新读取验证。

## 完整部件名批量测试

已拉取新版 elf，来源提交 `e271df6283c4dc9332eafc38ca04079cd7af0850`。从两套 `groups.json` 的终止节点完整枚举 65 个人物部件、14 个衣服部件，包含没有 `kind: part` 字段的终止节点，没有漏掉 neck、pelvis、袖子、胸饰等部件。

```powershell
.\sam_veirfy\env\python.exe .\sam_veirfy\batch_parts.py --run elf-parts-new-run
.\sam_veirfy\env\python.exe .\sam_veirfy\serve_gallery.py --run elf-parts-new-run
```

本次输出为 `outputs/elf-parts-e271df62/index.html`。该 HTML 内嵌报告，离线打开也可浏览相对路径图片；启动本地服务器则按终端输出的地址访问。`serve_gallery.py` 仅监听本机回环地址，`server.json` 记录端口及进程。

每个部件按完整名称及父级身份得到一个固定英文名词短语；左右词保留，`image_left/right` 按画面左右表述。`foot` 依本例实际部件身份映射为 boot，后发 cap 映射为 back hair crown。完整映射位于 `batch_parts.py`，每个最终提示词在推理前写入 `plan.json`。没有按结果改词、重试、挑图，也没有使用点、框或 SVG 边界辅助。

两组输入使用完全相同的 79 条提示词，分数和蒙版阈值均为 0.5：

| 输入组 | 输入 | 已跑 | 有检出 | 零检出 | 多实例 |
| --- | --- | ---: | ---: | ---: | ---: |
| 对应分件参考 | 人物素体参考 / 衣服参考整图 | 79 | 46 | 33 | 9 |
| 新版完整合成 | shadow/mask/step01/character-shadowed.png | 79 | 43 | 36 | 7 |

计数描述输出状态，不作为正确率。每张结果卡包含整图定位叠加、自动放大的透明提取结果、同区域原始二值蒙版，以及原始提示词、实例数和分数。所有检出实例均保留；并集用于结果卡展示，分实例蒙版也单独保存。透明结果保留输入 alpha，黑白蒙版独立显示 SAM 输出。两组各有 10 页静态 JPG 图集，搜索、类别/结果状态筛选和放大在交互图集中可用。

已经重新读取验证 158 份结果、79 对相同提示词及 757 张生成图片（实例、蒙版、透明结果、叠加、卡片和图集页）。浏览器中已核对两组切换、中文部件搜索、零检出筛选和卡片放大。

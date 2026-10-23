# 可选的原生 Codex 补丁

固定官方 `rust-v0.161.0`，提交 `979011409de0a60b52f179721948e65531d26144`。`layering-runtime.patch` 增加独立 Images API 路由、模型选择及按图片数量触发的原 thread compact；正常订阅或已有 provider 在未启用选项时沿用原路径。

## 构建

在 `.env` 开启 `layering_image_compact_threshold`，或为 Codex 选择 GPT／Nano 生图并填写对应 API。`layering_codex_path` 留空时，启动预检会自动准备补丁；`codex-native` 本身不需要补丁。显式指定入口时只检查该入口，不自动替换。

需要 Git、C/C++ 编译工具及该版 Codex 的平台依赖。Rust 1.95.0 可用时复用；不可用时提示并从官方 Rust 站点下载、校验安装器，在临时目录使用独立 `RUSTUP_HOME` / `CARGO_HOME` 和 `--no-modify-path` 安装。构建成功或失败均清理，不改系统命令、用户 Rust、shell 设置或 Codex 全局配置；安装和构建日志保存在缓存内。

缓存为 `.codex-build/<平台-架构>/<源码与补丁指纹>/`。进程锁防止并发重复构建，产物和官方 Code Mode companion 的 SHA-256 校验通过后才复用；失败不写成功标记，中断后可直接续跑。补丁更新使用新指纹目录，旧文件保留。生图要求 `image_provider_version: 2`，按图片数压缩要求 `image_compaction_version: 2`。

也可在 `live2d-maker` 下提前准备，命令输出实际二进制路径：

```bash
pnpm build:codex
# 已有对应官方源码时可创建独立 worktree：
pnpm build:codex --source /absolute/codex-source --jobs 4
```

使用 `--source` 时应保留该源码仓库，worktree 共享它的 Git 对象。手工测试可把输出路径传给下方验证脚本，无需修改 `.env`。

## 行为

- 生图继续走原生 image generation extension 的工具、鉴权、重试、文件落盘及事件。独立配置不替换主模型 provider；每个请求的本地路由将 `/images/generations` JSON 和 `/images/edits` 标准 multipart 交给共享 OpenAI／Google 适配器。GPT／Nano 模型均由逐步骤配置选择，图片保存到本次任务的 `agents/generated/`；旧 `layering_image_base_url / api_key / model` 仅作为同一套配置的兼容输入，不再单独启动旧补丁通道。Claude／AGV 使用同一个适配器的函数工具，配置见 [模型与 harness](../../references/agent-models.md)。
- Nano 的透明请求在共享适配器中先按目标参考颜色从红／绿／蓝里推荐背景色，再将明确的纯色要求交给模型；返回后在 Krita 内嵌 Python 中运行 ViTMatte 与前景颜色恢复；固定包首次实际使用时自动安装到运行根目录 `.runtime/` 并复用，不改变图像尺寸。选色评分、原始图及处理报告保存在任务的 `generated/` 下的 `image-processing/`。GPT 原生 alpha、`codex-native` 路径及现有 Rust 补丁保持不变，本项无需重新构建 Codex。
- 在每次普通模型请求前检查图片数，涵盖用户图片、工具图片与生图结果。阈值设为 49 时，恰好 49 张会全部参与原生带图 compact；不移除视觉能力，也不使用“不支持图片输入”的占位语。
- 批量工具使图片数跳到 52 时，先带图压缩前 49 张，将剩余 3 张原样放入新上下文。保留对应文字、图序、图片精度、调用参数和已完成的工具调用/结果配对；无需再次执行工具。同一条消息或一次 Code Mode 输出含多图也适用。120 张会按 49、49、22 分段，最后 22 张直接供正常请求查看。每张图必须实际进入一次成功的视觉压缩，或仍以原图保留。
- 仅在请求成功且有非空摘要后，将摘要与保留图片一起写回历史。失败、空摘要或 token 超限时保留可恢复历史，不靠删除尚未总结的图片救场；一个大批次已成功的分段保留其摘要与剩余原图。图片文件和旧 rollout 不变。摘要仍有正常压缩的信息损失，精细复查时可再次读取原图。
- 压缩不重建 thread，不改图像文件，不追加绘制任务或改变 review 次数。压缩未成功时明确失败并保留恢复信息。
- 补丁仍服从原生模型能力、feature 和账号启用条件；Images API 需要兼容原生请求字段。模型 ID、网关是否允许该模型及计费由用户提供的服务决定。

## 本地模拟验证

```bash
python3 patches/codex/smoke.py --codex /absolute/codex
# 完整工作流路由：实际补丁 CLI，经共享适配器模拟 GPT 和 Nano 生图／编辑并恢复会话：
node patches/codex/native-image-smoke.ts --codex /absolute/codex
# 图片完整性、溢出、失败恢复与真实 thread 续跑：
python3 patches/codex/image-compaction-smoke.py --codex /absolute/codex
```

测试仅启动本机 HTTP 模拟服务，使用虚拟密钥与生成的测试 PNG。图片专项测试使用不同图片逐张比对原始数据，服务拒绝任何含 50 张及以上图片的请求；覆盖 48/49/50/52/120 张、一次工具批量输出、单次 Code Mode 从 44 跳到 52、关闭保护、失败/空摘要后的同 thread 恢复、工具配对和消息 ID 唯一性。通用 smoke 另覆盖原生生图／编辑接口与分别鉴权。不调用真实模型、不消耗生图额度，也不修改已有作品；这些测试验证请求和恢复机制，不代替实际模型的视觉质量验收。

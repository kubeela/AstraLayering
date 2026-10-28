# 可选兼容补丁

补丁源码、结构检查、构建与模拟验证统一存放在这里；容量控制和视觉压缩共用实现位于 `shared/visual-context.ts`，Claude Messages 接入位于 `claude/gateway.ts`；工作流桥接只调用补丁模块。Krita 进程环境在 `../shared/krita/`。这些不是给制作 agent 新注册的执行工具。

| 功能 | .env 开关／选择 | 启动行为 |
| --- | --- | --- |
| Codex 失败流错误读取 | 使用 Codex 即生效，无开关 | 未指定 `layering_codex_path` 时自动构建并复用缓存；读取 LiteLLM 在空 `response.failed` 后单独发送的 `error` 事件 |
| Codex 图片数 compact | `layering_image_compact_threshold=<正整数>` | 未指定 `layering_codex_path` 时自动构建并复用缓存 |
| 三种 CLI 图片／请求体预算 | `layering_<codex/claude/agv>_image_compact_threshold` / `layering_<codex/claude/agv>_request_compact_mib` | 留空关闭；按实际发送内容检查，带图分批压缩，保留最新图与恢复记录 |
| Codex 自定义生图 | 对应步骤选择 GPT／Nano，并填写对应 API | 与 compact 共用同一补丁，按所选路线实际需要准备 |
| AGV 响应头期限兼容 | `layering_agv_unlimited_response_header_timeout=true` | 自动检查已安装 CLI，准备独立受控副本，不需要 Rust |

Codex 的 Git、C/C++ 及平台编译依赖仍须可用。Rust 1.95.0 缺失时，启动器明确提示并在临时目录安装，构建后清理，不改用户环境。使用 Codex harness 时始终准备 Codex 补丁；只用 Claude／AGV 时不构建。

详细行为与验证见下方 Codex、AGV 与 LiteLLM 小节。显式指定已有补丁路径仍兼容，但必须通过能力／完整性检查。所有失败保留制作产物和会话，可修复依赖后用原总入口续跑。

## 图片容量保护

上限属于实际模型／网关路由，不属于 CLI 名字。旧 `layering_image_compact_threshold` 仍只用于 Codex；专用 Codex 键优先。每个接口独立配置图片数和 MiB 预算，不预设所有接口都有 50 张或 100 MiB 限制。预算是提前压缩的触发值，不能改变服务端硬上限。Codex 字节预算要求补丁能力 `request_compaction_version: 1`；旧图片数能力仍为 v2。

AGV 的保护需要已配置的 GenAI 网关，Claude 支持 Messages 路由（包括已有自定义 base URL），保留原鉴权及原生自动压缩。未支持的 AGV 协议或 Claude Bedrock／Vertex／Foundry 路由启用保护时明确报错，不静默忽略 `.env`。

- 共用模块先检查最终 JSON 字节数及内联图片数，包含 Base64、全部文字和工具定义。摘要请求本身也遵守预算，超出时分批；单个多图工具结果无需重跑。
- AGV／Claude 保留原有文字、调用／结果配对与签名，只把实际完成视觉总结的旧图片替换为有出处的视觉记忆。尽量保留最近四张；预算不足时至少保留最新一张。任务指定的必要参考图保留原图。无法容纳必要输入时明确失败并保留历史。
- 每批成功且有完整终态、非空摘要后，原图、摘要及状态原子写入 CLI 会话的 `cli-data/visual-context/`；续跑复用成功批次。失败、空摘要、截断和不完整 SSE 不替换图片。该目录始终在任务请求记录内，不写用户全局 CLI 配置。
- 默认不做无损去重。`layering_agv_image_deduplicate=true` 或 `layering_claude_image_deduplicate=true` 只去掉更老的重复图片数据：字节和已知来源／裁剪／倍率／模式都一致才合并，最新图片保留完整原图并标注唯一 ID，旧位置保留文字、坐标和调用记录并引用该 ID。不同位置的相同空白截图不合并，未识别上下文时保守匹配。Codex 继续原生带图 compact，没有独立去重开关。

CLI 退出／压缩失败不会标记制作完成，也不删除草稿、反馈或旧会话。修改 `.env` 后按原入口恢复；无需更改绘图要求、模型或 review 轮次。

本地真实 CLI 验证入口（使用模拟上游，不消耗模型额度）：

```sh
node patches/shared/cli-visual-smoke.ts --harness agv
node patches/shared/cli-visual-smoke.ts --harness claude
```

## 原生 Codex 补丁

固定官方 `rust-v0.161.0`，提交 `979011409de0a60b52f179721948e65531d26144`。`layering-runtime.patch` 修正 Responses 失败流的错误读取，并增加独立 Images API 路由、模型选择及按图片数量／请求字节触发的原 thread compact；正常订阅或已有 provider 在未启用后几项选项时沿用原路径。

### 构建

使用 Codex harness 时始终需要补丁版：错误读取修正对所有请求生效。`layering_codex_path` 留空时，启动预检自动准备并复用缓存；显式指定入口时只检查该入口，不自动替换。

需要 Git、C/C++ 编译工具及该版 Codex 的平台依赖。Rust 1.95.0 可用时复用；不可用时提示并从官方 Rust 站点下载、校验安装器，在临时目录使用独立 `RUSTUP_HOME` / `CARGO_HOME` 和 `--no-modify-path` 安装。构建成功或失败均清理，不改系统命令、用户 Rust、shell 设置或 Codex 全局配置；安装和构建日志保存在缓存内。

缓存为 `.codex-build/<平台-架构>/<源码与补丁指纹>/`。进程锁防止并发重复构建，产物和官方 Code Mode companion 的 SHA-256 校验通过后才复用；失败不写成功标记，中断后可直接续跑。补丁更新使用新指纹目录，旧文件保留。所有入口要求 `failed_error_event_version: 1`；生图要求 `image_provider_version: 2`，按图片数压缩要求 `image_compaction_version: 2`，请求体预算另外要求 `request_compaction_version: 1`。

也可在 `live2d-maker` 下提前准备，命令输出实际二进制路径：

```bash
pnpm build:codex
## 已有对应官方源码时可创建独立 worktree：
pnpm build:codex --source /absolute/codex-source --jobs 4
```

使用 `--source` 时应保留该源码仓库，worktree 共享它的 Git 对象。手工测试可把输出路径传给下方验证脚本，无需修改 `.env`。

### 行为

- 标准 Responses 流在 `response.failed.error` 中给出失败原因，读取方式不变。LiteLLM 的流式失败先发 `error: null` 的 `response.failed`，再以独立 `error` 事件给出原因；补丁用后者替换空失败的通用提示，按同一错误码映射，不会让通用提示覆盖已有原因。`content_policy_violation`（如图片审查拒绝）报告为不可重试的请求错误并保留原文，不再以“stream disconnected… response.failed event received”重连 5 次。WebSocket 路径不变。工作流只按结构化错误码决定是否重试（见 [shared](../shared/README.md#自动检查)），因此这项修正与下文 [Responses 错误透传](#responses-错误透传) 直接决定失败是否被当作可重试错误。
- 生图继续走原生 image generation extension 的工具、鉴权、重试、文件落盘及事件。独立配置不替换主模型 provider；每个请求的本地路由将 `/images/generations` JSON 和 `/images/edits` 标准 multipart 交给共享 OpenAI／Google 适配器。GPT／Nano 模型均由逐步骤配置选择，生图原稿保存到对应步骤的 `workspace/generated/`；报告引用的图片由发布流程复制到报告旁，`agents/` 只保留请求、会话与事件记录。旧 `layering_image_base_url / api_key / model` 仅作为同一套配置的兼容输入，不再单独启动旧补丁通道。Claude／AGV 使用同一个适配器的函数工具 `imagegen`（Codex 侧的 feature 与补丁标识仍为 `image_generation`），配置见 [模型与 harness](../references/model-presets.md)。
- Nano 的透明请求在共享适配器中先按目标参考颜色从红／绿／蓝里推荐背景色，再将明确的纯色要求交给模型；返回后保留原始 RGB，以它为唯一参考再生成一张仅换背景的白底或黑底图，由 Node／Sharp 差分恢复透明度与前景颜色，不改变第一张图像的尺寸；不需要抠图权重或额外 Python 包。选色评分、两张 RGB 图、alpha 及处理报告保存在对应步骤的 `workspace/generated/image-processing/`。GPT 原生 alpha、`codex-native` 路径及现有 Rust 补丁保持不变，本项无需重新构建 Codex。
- 在每次普通模型请求前检查图片数，涵盖用户图片、工具图片与生图结果。阈值设为 49 时，恰好 49 张会全部参与原生带图 compact；不移除视觉能力，也不使用“不支持图片输入”的占位语。
- 批量工具使图片数跳到 52 时，先带图压缩前 49 张，将剩余 3 张原样放入新上下文。保留对应文字、图序、图片精度、调用参数和已完成的工具调用/结果配对；无需再次执行工具。同一条消息或一次 Code Mode 输出含多图也适用。120 张会按 49、49、22 分段，最后 22 张直接供正常请求查看。每张图必须实际进入一次成功的视觉压缩，或仍以原图保留。
- 仅在请求成功且有非空摘要后，将摘要与保留图片一起写回历史。失败、空摘要或 token 超限时保留可恢复历史，不靠删除尚未总结的图片救场；一个大批次已成功的分段保留其摘要与剩余原图。图片文件和旧 rollout 不变。摘要仍有正常压缩的信息损失，精细复查时可再次读取原图。
- 压缩不重建 thread，不改图像文件，不追加绘制任务或改变 review 次数。压缩未成功时明确失败并保留恢复信息。
- 补丁仍服从原生模型能力、feature 和账号启用条件；Images API 需要兼容原生请求字段。模型 ID、网关是否允许该模型及计费由用户提供的服务决定。

### 本地模拟验证

```bash
python3 patches/codex/smoke.py --codex /absolute/codex
## 完整工作流路由：实际补丁 CLI，经共享适配器模拟 GPT 和 Nano 生图／编辑并恢复会话：
node patches/codex/native-image-smoke.ts --codex /absolute/codex
## 图片完整性、溢出、失败恢复与真实 thread 续跑：
python3 patches/codex/image-compaction-smoke.py --codex /absolute/codex
```

`image-compaction-smoke.py` 只验证补丁二进制在 `codex exec`／`exec resume` 下的行为；工作流实际使用的 App Server 路径由 `native-image-smoke.ts` 覆盖。

测试仅启动本机 HTTP 模拟服务，使用虚拟密钥与生成的测试 PNG。图片专项测试使用不同图片逐张比对原始数据，服务拒绝任何含 50 张及以上图片的请求；覆盖 48/49/50/52/120 张、一次工具批量输出、单次 Code Mode 从 44 跳到 52、关闭保护、失败/空摘要后的同 thread 恢复、工具配对和消息 ID 唯一性。字节专项还覆盖图片数未超限时的字节超限、双预算、批量工具和压缩失败后恢复；通用 smoke 另覆盖原生生图／编辑接口与分别鉴权。不调用真实模型、不消耗生图额度，也不修改已有作品；这些测试验证请求和恢复机制，不代替实际模型的视觉质量验收。

`layering_codex_request_compact_mib` 开启后，普通请求和视觉 compact 均使用真实 Responses 序列化器计算大小（含指令、工具和 Base64），预留传输元数据。HTTP／WebSocket 发包前还有最终字节检查。溢出时按图片数量与字节两种预算选择可实际总结的前缀，其余原图及工具配对保留；无法容纳文本和一张图时明确报错，不删除未总结的历史。关闭此项时原 49 张图片保护保持原行为。

## AGV 自定义网关的响应头期限

已验证的 Linux x64 AGV 1.4.4、1.4.5 默认等待响应头 60 秒。供应商尚未返回响应头时，CLI 会取消请求并重试；它与整个 print 回合的 `--print-timeout` 无关。工作流不提前返回虚假的 HTTP 200，也不忽略上游错误。

这是针对结构可确认构建的可选兼容补丁，不自动安装 CLI。先检查现有 CLI 和登录，在 `.env` 设置 `layering_agv_unlimited_response_header_timeout=true`；工作流首次使用 AGV 时自动准备独立副本，并校验复用。默认关闭，不需要 Rust。也可手动提前准备：

```bash
pnpm patch:agv --source /absolute/path/to/agy --dir /absolute/path/to/.run
```

脚本从 ELF/Go 函数表精确定位网关 Transport，验证目标指令，并检查 updater 对 `AGY_CLI_DISABLE_AUTO_UPDATE=true` 的实际识别方式。结构一致的新构建自动兼容，不依赖固定版本号或固定文件偏移；无法确认指令或开关时明确报错，未修改、未启动。仅将默认 `ResponseHeaderTimeout` 从 60 秒改成 0（无期限），独立副本放在 `<dir>/.runtime/agv/<source-sha256>/v2/`；原 CLI、连接/TLS 期限、权限检查和 HTTP 错误处理不变。macOS 等其他格式暂未验证，不适用。运行根目录必须已经存在且位于 skill 外。

返回的 `antigravity` 是受控启动入口：每次启动前验证 `antigravity.bin` 的完整 SHA-256，强制传入字符串 `true`（CLI 不接受 `1`），运行中和结束时再次检查文件是否被替换。CLI 如果仍启动自动更新，工作流明确报错并停止本次调用，保留会话与产物。旧补丁目录或已更新的副本在下次调用前重新做结构检查，兼容时创建新的受控副本，绝不按旧 `patch.json` 的声明直接运行。

自动模式的 `layering_agv_path` 可留空以查找原始 CLI，或指向已安装 CLI，无需记录生成路径。手动模式仍可把打印的路径写入 `.env`。关闭 `layering_agv_unlimited_response_header_timeout` 并清除已有补丁路径后恢复全局原 CLI。会话和产物不变，不要删除 threadId。不要提交生成的 CLI 或任务过程记录。

已验证构建的 `sir_flash_lite` 是 CLI 内置的安全预检查：在工具执行前查看近期推理和待执行操作，判断是否需要进一步安全审查。它不承担分层绘制或图像 review；嵌入配置为 `LOG` 模式、8 秒期限。实测中其 MINIMAL 请求报错后，主回合仍可完成，但检查本身失败，并产生额外请求和等待。这与主请求 60 秒响应头期限分别诊断，不关闭监视、不延长其专用期限，也不因这类内部日志重开已经成功交付的会话。

部分网关还把 CLI 的内部 MINIMAL 调用路由到只接受 LOW 的模型。已通过真实接口确认后，可设置 `layering_agv_minimal_thinking_level=LOW`。这只替换 MINIMAL，不修改绘制/review 的 LOW、MEDIUM、HIGH 请求；留空保留原协议。它不关闭内部监视，也不会修改其原生期限。

验证应包含：真实 CLI 等待超过 60 秒的响应头仍成功；HTTP 400/503 不误报成功；取消能及时结束；以及真实多图/工具调用的耗时和产物。不能以短请求跑通或进程仍存活代替这些检查。

## Responses 错误透传

这是外部 LiteLLM Proxy 的可选兼容回调，不是工作流运行依赖；不安装或替用户启动 LiteLLM。已在 LiteLLM 1.106 实测。接口缺少所需钩子时，启动明确报错。

工作流共享调用层已经为 Codex、Claude Code 和 AGV 保留实际收到的错误详情，在 `workflow.log`、请求失败记录和最终诊断中展示，不依赖 LiteLLM。本回调补的是代理在更早一层吞掉错误事件的问题；若代理或 CLI 只返回通用消息，共享层无法还原它没有收到的字段。

有些 API 先返回 `response.failed` 且 `response.error=null`，随后才返回带具体原因的 `error`。代理若立即在前一事件抛异常，就会把真实原因改成 `server_error / Response API in-stream error`。本回调只暂存这一条空失败事件，用紧随的错误补齐，再沿用代理原有异常处理。普通成功、完整失败、重试及 fallback 配置不变；EOF 或后续成功不会把失败变成成功，也不引入等待超时。

代理异常映射后，仍保留上游 `code`、`type`、`message`、`param` 和其他错误字段。日志只记录错误详情，保留代理原有脱敏，不记录整份上下文或图片。

把 `responses_compat.py` 和 `responses_error_events.py` 放到代理自己的可导入目录，在原有 YAML 的 `litellm_settings.callbacks` **追加**：

```yaml
litellm_settings:
  callbacks:
    - responses_compat.proxy_handler
```

保留已有 callbacks，确保该目录在代理 `PYTHONPATH` 中，再正常重启代理。已有请求应先完成，或用服务器原生的优雅退出让它们自然结束；不要为了应用回调中断其他 agent。

从 skill 根目录运行纯 Python 检查（不需要安装 LiteLLM）：

```sh
python3 -m unittest discover -s patches/litellm/tests
```

排查时区分原始 API、本机二次代理、Codex 和调度器。透传恢复后以实际错误为准，不把 `response stream error` 本身当作网络故障的证据。不要重复发送已经明确拒绝的原请求来测试；可将保存的 SSE 交给本地模拟上游验证。

# 可选的原生 Codex 补丁

固定官方 `rust-v0.161.0`，提交 `979011409de0a60b52f179721948e65531d26144`。`layering-runtime.patch` 增加独立 Images API 路由、模型选择及按图片数量触发的原 thread compact；正常订阅或已有 provider 在未启用选项时沿用原路径。

## 构建

在 `workflow-next` 下执行：

```bash
pnpm build:codex
# 已有对应官方源码时，可从其创建独立 worktree，避免重复下载：
pnpm build:codex --source /absolute/codex-source --jobs 4
```

需要 Git、Rust 1.95.0、C/C++ 编译工具及该版 Codex 的平台依赖。构建目录为 `.codex-build/`，不会替换系统命令；同时复制 SDK 所带的官方 Code Mode companion。使用 `--source` 时应保留该源码仓库，构建 worktree 共享它的 Git 对象。

在 `.env` 设置 `layering_codex_path=.codex-build/bin/codex`（Windows 为 `codex.exe`）。未开启可选能力时不要求此补丁；开启时工作流调用 `debug layering-capabilities` 检查，避免悄悄使用不支持的二进制。

## 行为

- 生图继续走原生 image generation extension 的工具、鉴权、重试、文件落盘及事件。独立配置不替换主模型 provider；`/images/generations` 使用 JSON，外部 `/images/edits` 使用标准 `image[]` multipart 文件上传。默认模型来自 `.env` 的 `gpt-image-2.5-sunburst`。
- 在每次普通模型请求前检查图片数，涵盖用户图片、工具图片与生图结果。达到配置阈值才触发原生本地 compact；压缩请求临时采用文字投影，成功后才提交新的历史。批量工具一次返回超过 50 张也会在下一次请求前处理。
- 压缩不重建 thread，不改图像文件，不追加绘制任务或改变 review 次数。压缩未成功时明确失败并保留恢复信息。
- 补丁仍服从原生模型能力、feature 和账号启用条件；Images API 需要兼容原生请求字段。模型 ID、网关是否允许该模型及计费由用户提供的服务决定。

## 本地模拟验证

```bash
python3 tools/codex/smoke.py
# 或显式选择二进制：
python3 tools/codex/smoke.py --codex /absolute/codex
```

测试仅启动本机 HTTP 模拟服务，使用虚拟密钥与生成的测试 PNG。覆盖 48/49 张阈值、53 张输入、一次返回 53 张工具图片、关闭保护、压缩后恢复看图与原 thread 续跑，以及分别鉴权的原生生图／编辑接口与 Code Mode 调用。不会调用真实模型或消耗生图额度，也不修改已有作品。

# Responses 错误透传

这是外部 LiteLLM Proxy 的可选兼容回调，不是工作流运行依赖；不安装或替用户启动 LiteLLM。已在 LiteLLM 1.106 实测。接口缺少所需钩子时，启动明确报错。

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
python3 -m unittest discover -s tools/litellm/tests
```

排查时区分原始 API、本机二次代理、Codex 和调度器。透传恢复后以实际错误为准，不把 `response stream error` 本身当作网络故障的证据。不要重复发送已经明确拒绝的原请求来测试；可将保存的 SSE 交给本地模拟上游验证。

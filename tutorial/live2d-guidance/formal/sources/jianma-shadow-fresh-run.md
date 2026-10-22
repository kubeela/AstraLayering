# Jianma 投影蒙版管线：从头实测与 Krita 环境核验

日期：2026-10-22。测试任务：`jianma-shadow-fresh-20261022`。绘图基线：`7f455907`，模型为已配置的 `gpt-6.1-sol / xhigh`。

本次通过正式总入口执行 `--from shadow --to shadow --shadow-mode mask`。从仓库 `demos/jianma/assembled` 原版准备 KRA、PNG 和 simplified，并复制人物、衣服的分组与遮挡 JSON，共八份上游输入。启动前确认阴影目录不存在，没有复制旧阴影、thread 或完成标记，没有追加角色专用返修提示词。绘制使用新会话；输入准备、参考索引、绘制、自检、交付检查和工作台选择发布由既有管线执行。

## 结果与范围

- 六组投影：左右前发到脸、下颌到颈、前裙到双腿／脚踝、左右袖口到手腕。每组四个声明偏移，共 24 个原生检查，无警告。
- 当前光向没有明确落脸依据的外伸细发与耳外卷尾没有补成脸颊线，理由记录在 `shadows.json` 的 `excluded` 中。同一 part 允许只在有依据的轮廓上显影。
- 原尺寸为 1024×1536。保存 KRA 合成、PNG 和原生导出一致，透明轮廓保持不变。
- 独立 Krita 只读像素核验确认：原 171 个节点、12 个原蒙版保留；170 个原节点像素一致。仅脸底清理 34 个残留旧影 RGB 像素，alpha 不变。最终工程共有 187 个节点。
- 初稿曾出现接收面未进入正确裁切组及原穿戴蒙版丢失，检查拒绝通过；绘制会话从只读原工程重建并修正后，才通过交付。没有在管线完成后人工补画阴影。

本次证明这个输入的完整蒙版制作与检查路线可以运行，并提供可复核的艺术结果；不把一次生成当成所有角色的质量保证，也不把静帧偏移检查称为已完成 deformer、物理或 Cubism 绑定。

## Krita 环境问题：区分告警、执行与退出

实测版本为 Krita 5.3.4.1（git `bd6e8d0`）。第一次绘图脚本的日志同时出现运行目录权限 `0755`（期望 `0700`）和 `QLocalServer::listen: Unknown error 22`。这不等于插件未执行：同一次启动后来已成功导出原图层和完成收据。因此，最初将这些日志概括为“实例启动失败”是不准确的。

Krita 的单实例通信路径实际位于 `TMPDIR`，短路径系统调用记录为 `…/tmp/qtsingleapp-Kritad-…`，`bind` 和 `listen` 成功。首次脚本把 `TMPDIR` 放到较长的任务路径下，超过 Linux 本地套接字路径可容纳的长度；这与 `XDG_RUNTIME_DIR` 权限告警是两件事。应使用私有短系统临时路径与 `0700` 权限，不应靠人物任务名变短解决。带系统调用追踪的两次完整启动探测超时，未将它们记为成功的插件测试；短路径通信记录和首次告警仅用于解释该警告。

独立 Krita 插件直接核验得到：`hasattr(Krita.instance(), 'quit')` 为 **false**，`action('file_quit')` 可用。第一次绘图脚本在写完成功收据后调用不存在的 `Krita.instance().quit()`，进程没有正常退出；后续绘图采用立即 Qt 退出也曾在收据写出后以 `-11` 结束。因此，产物成功与退出成功必须分开检查。

独立只读核验关闭文档、返回回调后，通过 `QTimer.singleShot` 请求 `file_quit`，进程以 **0** 正常结束。固定原生检查程序据此修正退出调用；绘制参考也补充短路径、权限、正确退出和带蒙版节点移动规则。输入保持只读，Krita 私有配置不修改用户安装或全局配置。

修正后的固定检查程序又以本轮完整工程运行了六组、24 个偏移，检查通过；其私有 Krita 正常退出，记录为 `code=0, signal=null`。宿主先等待正常清理，超时或失败才使用有界终止。此核验没有重新绘制或修改人物工程。

## 复核入口

- [完整制作流程](https://gameclaw.woa.com/ai-weapon-spirit/character-layering/?name=jianma-shadow-fresh-20261022&stage=5)
- [本轮角色预览](https://gameclaw.woa.com/ai-weapon-spirit/character-layering/studio?project=jianma-shadow-fresh-20261022)

任务保留 `seed.json`、总控与分支 `run.json`、完整提示词、模型事件、源输入、KRA／PNG、关系表、原尺寸头脸对照、原生偏移图和制作报告。独立原像素核验位于任务的 `verification/original-node-audit.json`；环境探测日志也保留在 `verification`，成功结果与超时探测分别记录。

# AstraLayering

用 AI 将角色参考图制作成可编辑、带遮挡补全的人物与衣服分层素材，交付 Krita KRA 和透明 PNG。

当前工作流统一为 **[live2d-maker](.agents/skills/live2d-maker/SKILL.md)**：人物 part / raster、衣服 part / raster 与后续穿戴组装五个入口，共享安装、调度和续跑能力，各自保留绘制提示词。

## 使用

让 Codex 通过 Git 稀疏检出从 `wu-tian807/AstraLayering` 安装 `.agents/skills/live2d-maker` 整个 skill 目录，然后提供任务：

```text
使用 $live2d-maker 制作人物和衣服的分层素材。
参考图：/绝对路径/角色.png
任务名：my-character
Krita：/绝对路径/krita
```

需要 Node.js 24.12+、pnpm 10.33.0、可用的 Codex 原生生图环境及 Krita。Agent 的安装、`.env` 配置与操作方法见 [SKILL.md](.agents/skills/live2d-maker/SKILL.md)。也可以在仓库根目录运行 `pnpm install`、`pnpm web`，打开终端显示的网址，上传角色图并运行或续跑任务；详细说明见 [工作台](web/README.md)。

完整仓库的运行数据默认放在 `<仓库>/.run/<name>/`，独立安装时放在 `<skill上一级>/.run/<name>/`，不放在 skill 内；管线参数 `--dir /绝对路径/运行根目录` 可更改位置，相对输入从该目录下的 `<name>/` 解析。

## 成果

[Jianma 完整成果](demos/jianma/README.md) 包括人物素体、独立衣装及 **159 层 Krita 穿戴合成**。下图左侧是简化参考，右侧是实际装配结果：

[![参考与 Krita 穿戴合成](demos/jianma/assembled/comparison.png)](demos/jianma/assembled/README.md)

[穿戴合成 KRA](demos/jianma/assembled/jianma-assembled.kra) · [衣装 KRA](demos/jianma/clothing-raster-layering/step02/clothing-soft-edges.kra) · [单 agent 组装实跑对照](demos/jianma/character-assembly/README.md) · [全部案例](demos/readme.md)

当前验证范围是静态素材与默认穿戴，局部结构和笔触仍可能存在差异；完整案例包含人工检查与返修。转向、变形、物理摆动和动态遮挡需要后续绑定验证。

[SVG 对比预览器](loading/part-preview.html) · [面部参数实验（归档）](archive/skills/live2d-expressions/SKILL.md) · [历史技能归档](archive/skills/README.md) · [绑定实验](rigging/readme.md)

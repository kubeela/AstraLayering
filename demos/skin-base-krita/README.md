# Jianma 换装素体

从[边缘修画终稿](../soft-edge-krita/README.md)去除连体服，补出用于后续叠加衣服的身体底层。交付保持 **1024 × 1536、90 个普通绘画层**，无蒙版、无子节点。

[下载 KRA](character-skin-base.kra) · [合成 PNG](preview-final.png) · [穿戴合成结果](../jianma-assembled/README.md)

仅 `body/torso`、`body/breast`、`pelvis` 三层补画，相关层在 Krita 中标为红色；其余 87 层保留。躯干采用简化的身体构型，不补人体细节。层名、顺序、显隐与不透明度保持；胸部和骨盆 alpha 保持原样。

保存重开后核对了 90 层像素，导出的合成图与工程内合成一致，见 [verification.json](verification.json) 和 [delivery-validation.json](delivery-validation.json)。这些记录证明文件保存完整性；本目录未附独立视觉 reviewer 报告，也未验证动画变形。

`parts/` 保存最终部件，`before-parts/` 和 `before-composite.png` 保留修改前状态；历史操作脚本已经执行，继续编辑从 KRA 开始。

返回[成果索引](../readme.md)。

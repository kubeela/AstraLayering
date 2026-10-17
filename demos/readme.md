# SVG 示例与画法对比

这里放可直接查看的 SVG 结果、必要参考图及案例说明。完整成稿案例及必要制作记录放在 [outputs](../outputs/readme.md)。

| 案例 | 内容 |
| --- | --- |
| [Krita 第二步：边缘柔化进度](./soft-edge-krita/README.md) | 保存 33 条局部笔刷操作、31 层修画和完整 90 层 KRA；附当前合成图与继续工作清单，尚未完成视觉验收 |
| [灰底清空 → GPT Image 2.5 → Krita：90 个完整部件](./gray-control-krita/README.md) | 灰底抹除遮挡物后逐件生成，在 Krita 配准修画；90 层无蒙版，附原尺寸独显和重开验证 |
| [gpt-image-2.5 → Krita：按深度表拆分补全](./gpt-image-2.5-depth-krita/README.md) | 依 part-layering 新版 occlusion.json 深度生成红黄绿控制图逐部件补全，Krita 按 level 叠放 90 个完整部件（无蒙版） |
| [gpt-image-2.5 → Krita：90 部件拆分](./gpt-image-2.5-krita/README.md) | 采用 part-layering 完整色块标准，保留透明部件、遮挡补全、可逆蒙版及原图对照 |
| [Jianma：新版素体与衣装](./jianma-current-case/readme.md) | 两个新技能的实际成稿快照、独立衣装、参考对照与绑定前限制 |
| [首次完整生成：基础连体服角色](./first-complete-case/readme.md) | 已走通阶段1—5；参考与终稿左右对比、完整部件树滚动动图、遮挡补全独显示例。交互沿用现有SVG预览器 |
| [深海少女：像素临摹与结构重绘](./deep-sea-method-comparison/readme.md) | 同一角色参考下，两种 SVG 构建倾向的外观、结构和放大细节对比 |
| [wu-tian807](./wu-tian807/) | 早期角色示例、头部试验及参考图；包含旧契约格式和分层不正确的试验，不代表当前流程验收结果 |

用浏览器打开 [SVG 预览器](../loading/svg-preview.html)，导入 SVG 后即可检查分组与显隐；导入 PNG 可做并排、叠加和滑动对比。

# 投影素材与检查

先看同目录的 [skirt.png](skirt.png) 与 [hair.png](hair.png)：完整素材、受影联合裁切、重叠和相对偏移。图为原创结构示意；依据真实 Milly PSD 1220／832–834、moc3 ArtMesh119／47–51、faceM 与腿部 mask。真实资料与测量见仓库 `tutorial/live2d-guidance/formal/09-clipped-cast-shadows.md`；独立安装不依赖该目录。

`inputs.json` 列出本次真实 part、深度、原 KRA 图层 UUID 和识别到的归属。未识别归属的图层需对照像素确认，不能猜名称。多受影部件使用一个 `receiverPartIds` 数组；裁切 base 可是保留原子层的受影子组。Krita 透明度继承使用同组下方合成 alpha，base 下方不要混入其他实色层。

脸部优先检查，优先的是投影判断，不是增加阴影数量。对照 simplified 的光向和已画投影，逐束比较刘海、侧发、外伸细发与卷尾的轮廓、受影面和前后位置；只有遮光后确实落到脸上的部分才绘制。`inputs.json` 的图层深度序号仅表示叠放关系，不是几何距离，不能据此推出具体投影偏移，也不能将外侧发丝向脸内搬成平行影线。没有落脸依据时保留无影并说明；不能为了可见度加深细线或强求左右对称。独立运动来源分层；同一 part 中有投影依据的细轮廓补进原影层，无依据的轮廓不强补，不为细条捏造 part。完整素材和裁切正确不等于光向合理，需分别复核。

`face-review.png` 先展示原组装、所有新投影关闭、最终脸部的原尺寸裁切，再展示细发的声明偏移；无脸角色改用主要识别区域并注明。裁切不缩小，不能只靠全身缩略图判断脸部是否完成。

`shadows.json` v2 示例（均替换为真实值）：

```json
{
  "version": 2,
  "shadows": [{
    "id": "skirt-to-legs",
    "casterPartId": "clothing:inner_dress/skirt",
    "receiverPartIds": ["character:legs/left", "character:legs/right"],
    "casterLayerUuids": ["<caster>"],
    "receiverLayerUuids": ["<left>", "<right>"],
    "shadowLayerUuid": "<new paint layer>",
    "clipBaseLayerUuid": "<receiver group>",
    "follow": "caster",
    "blendMode": "multiply",
    "testOffsets": [[0, 0], [-12, 0], [12, 0], [0, 16]],
    "notes": "按本角色裙摆轮廓补全，偏移范围依据裙下搭接；后续独立修正投影响应"
  }],
  "excluded": []
}
```

偏移是原画像素，由当前形状和预期余量选择，不照抄示例；至少一个复位点和一个非零点。`follow` 是运动来源，非已完成 deformer 绑定。不要新加尺寸倍率门槛。

检查命令提供在运行提示中。它只打开保存工程的独立副本，输出 `inspection.json` 和 `inspection/`：去影底图、原尺寸相对偏移、完整影层、受影覆盖与检查拼图。原始检查 PNG 保持原分辨率；拼图仅用于并排查看，不替代原图。查看每处静帧与偏移图，修好后重跑命令；程序会复用仍匹配文件指纹的检查。空影层、错裁切、图层归属矛盾、越界新增 alpha 会阻止交付；裁切外余量不足只提示复核，不能由面积数值决定画法。

最后保存 KRA 与同尺寸 PNG、face-review.png，写简短 report.md：脸周每个候选如何处理、做了哪些投影、颜色／边缘依据、偏移范围与观察、底色补画、不适用项。此检查验证素材覆盖和原生裁切，不是物理或九轴验收。

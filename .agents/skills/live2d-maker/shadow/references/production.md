# 投影素材与检查

先看同目录的 [skirt.png](skirt.png) 与 [hair.png](hair.png)：完整素材、受影联合裁切、重叠和相对偏移。图为原创结构示意；依据真实 Milly PSD 1220／832–834、moc3 ArtMesh119／47–51、faceM 与腿部 mask。真实资料与测量见仓库 `tutorial/live2d-guidance/formal/09-clipped-cast-shadows.md`；独立安装不依赖该目录。

`inputs.json` 列出本次真实 part、深度、原 KRA 图层 UUID 和识别到的归属。未识别归属的图层需对照像素确认，不能猜名称。多受影部件使用一个 `receiverPartIds` 数组；裁切 base 可是保留原子层的受影子组。Krita 透明度继承使用同组下方合成 alpha，base 下方不要混入其他实色层。

脸部优先检查。逐束比较刘海、侧发与游离细发的实际轮廓、脸部接收面和前后位置；尤其检查向外弯出的细条及卷尾，不能只看发根和大片贴头区域。向外伸出的发束仍可能随光向投到脸颊，是否适用由真实形状与参考决定。独立运动来源分层；属于同一运动 part 的细轮廓应补进它的完整影层，不为细条捏造 part。保持细影的方向、渐细端部与合理软边，脸部不以整体染暗代替缺失投影。确实在脸后或当前光向不落脸的候选也在报告中说明。

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

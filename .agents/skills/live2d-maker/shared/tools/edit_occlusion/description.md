修改当前人物／衣服 raster step01 的上游 occlusion.json。绘制及返修时使用本工具保存深度表；读取继续使用内置文件工具。

提交完整 layers 数组，保留未调整部件。每个终止部件恰好一行：id、note、check，以及互斥的 level 或 levels。单深度用非负 level；多深度用至少两个 {level, region} 区域，深度数值在全表中唯一，可用小数插入层间。check 使用 {passed: true, note}；多深度另外提供 regions: [{level, note}]，逐个对应全部区域。

工具沿用上游输入指纹 sourceHash，管理 version=3、direction 和固定保存路径，校验未知字段、重复深度、区域说明、检查依据及分组／SVG 引用后保存；失败返回具体字段位置，修正参数后再次调用，已有文件保持原样。若终止部件 ID 发生改变，使用 edit_groups 同时提交分组树和 layers。

实际 KRA 图层名与逻辑 part 的对应关系写在绘画／返修报告中；深度表无需增加 layer 等字段。工具检查数据结构与引用，视觉层序及区域自然衔接仍由绘制者和 reviewer 核对。

精准更新本任务上游 occlusion.json 中指定 ID 的深度；直接用内置文件工具阅读上游文件即可。changes 只列真正要修正的 part，每项包含 id、note，以及互斥的 level 或 levels。note 记录在 Krita 中实际核对后的依据；多深度还须提供 regions，逐个以 level、note 记录核对结果，与 levels 完整对应。levels 的 region 用文本描述区域、分界、前后对象和连续关系，不要求像素分界线。
全表深度同属从后到前的数轴，越大越靠前，必须唯一；允许小数插入，避免无故重排其他记录。单深度转多深度时会删除旧 level，反向同理。工具校验整份结果后原子写回上游，保留未指定部件、逻辑 ID、sourceHash 和其他上游文件；不新增、删除 part，不改 groups.json 或 SVG。工具读取最新文件，并串行处理同一会话的写入；不需要提供 revision 或手动删除旧字段。
仅 raster step01 的绘制阶段提供此工具。KRA 的实际拆层、配准和必要补画由绘制者自行完成，此工具不操作像素。更新后在 step01/report.md 记录原 part 到实际图层及深度区域的对应。此修正持久保留，删除 raster 完成标记重跑不会撤销。

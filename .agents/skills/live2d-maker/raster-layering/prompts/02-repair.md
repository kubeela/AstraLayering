请根据 step02/{review_report_filename} 逐项修复当前 step02/character-soft-edges.kra。

先阅读反馈和证据，对照 ../part-layering/references/ 中本步使用的参考图定位原因。继续当前工程，保留已合格的绘画与柔化。需要调整分层时，同步上游分层数据及当前工程，在 step02/report.md 记录修改依据和结果。

保持部件内容完整、组合准确、边缘柔和及补全衔接自然。逐处对照参考绘制，不新增阴影、AO、投影，不粘贴原图像素，不用全层模糊或阈值处理代替修画。

每处修改后检查单层、隐藏上方图层和全部叠加的效果，确认没有引入缺损、错位或接缝。保存 KRA 后重新打开核对图层、顺序和像素，更新step02/character-soft-edges.png及 step02/report.md。

将逐项处理结果、证据与重开检查写入 step02/{repair_report_filename}。第一行写“结论：已修复”或“结论：仍有问题”；全部反馈处理完成并通过自检才写“已修复”，仍有问题则继续当前返修。

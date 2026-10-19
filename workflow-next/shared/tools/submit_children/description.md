提交当前节点的全部直属子节点，程序生成完整 ID 并保存。group 还需递归，part 完成制作后终止。当前节点本身已是最终单元时 children 为空并说明依据。

提交 children 数组和整体 note；每项仅含 snake_case name、kind（group 或 part）、具体 note。程序生成完整 ID，不提交完整 ID、子树、路径、进度或深度。同级名称唯一，只提交直属层，一次成功提交后结束。

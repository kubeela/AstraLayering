当前 arms 下一层固定优先列 arm_left、arm_right（group），每侧包含上臂、前臂、手及当前确实归属的附件。根据角色实际存在的肢体取舍，左右以角色自身为准。每侧 note 明确后续分上臂 upper_arm、前臂 forearm、手 hand，手继续分手掌与五根完整手指；这轮不要直接提交这些孙节点。

附在某侧手臂上的饰物先保留在对应 arm 内，由那一层判断独立性；已归其他根组的飘带、头发不领取。若实际只有一个 arm group，允许保留该有进一步结构意义的子 group，不制造不存在的另一侧。

提示词来源：{prompt_source}

【本次输入】
{runtime_context}

【固定范围与操作约定】
{fixed_rules}
固定约定提示词来源：{fixed_rules_source}

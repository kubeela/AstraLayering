使用工作台同一求解器和渲染器，执行 physics_simulate，保留 7 个规范输入与所有 120 Hz 网格轨迹。
先检查 metrics/events：固定残差、翻折、限幅、fallback、停止后稳定。fallback 必须查看对应密集窗，不能以最终合法为由忽略顿挫。查看均匀序列的颜色和光照（physics_evidence_index、physics_view），再用 physics_frames 按峰值/反转/限幅前后 12 步补充 60 Hz 或 120 Hz 窗，检查原尺寸接缝、自由段弯曲、层序、法线和深度。人观看连续运动，不能只拿两张好看的峰值图过审。
findings 结构：evidenceVersion/configHash/components；每项 id/criteria；criteria 为 attachment、shape、response、limits、layers、surfaces；每项 verdict(supported|rejected|needs-evidence|unreviewed)/reason/images。图片必须来自当前索引并实际查看；attachment、shape 至少引用该组件的原尺寸 crop；shape、response、limits 引用不同时间。每组件各测试查看运动 lit，另查看运动 normal/depth；首个 fallback 补前后 1 步，最大峰值补前后 2 步颜色。时间依据整数步，不造插值帧。
每组件至少通过 physics_view 或 physics_strip 查看各测试的 0、60、96、180、360、960 步颜色帧；整体原像素序列可共同覆盖组件，局部密集窗用于详细判断，再查看光照对比和各异常窗。支持的结论只覆盖实际证据；人工复核保持 unreviewed，不替用户签字。发现失败可修订未发布的 step02 草稿，重新运行相同规范输入，旧版证据不可混用。physics_submit_review 校验后产出 physics.json、findings.json；最后写 report.md，列出数值、渲染、AI 选帧与人工覆盖范围。

布片若反复回退或不稳定，先检查控制网格形状；可用 authoring.controlGrid:[4,8] 将轮廓与求解格分离，保留完整轮廓及所有固定区。规则格控制位移经过固定区过渡再应用到原网格，仍须逐步检查显示网格约束。不要通过降低输入或放宽限幅回避问题。证据索引按 test 返回事件窗口摘要，physics_trace 默认返回可读指标；全步全网格数据仍保留在文件中。

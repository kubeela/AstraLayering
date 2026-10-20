// Display-only definitions, matched to the existing preparation, part and raster runners.
// These sample statuses do not read or modify a live run, or schedule individual steps.
export const groupPhases = [
  ['outline', '轮廓绘制'], ['review', '轮廓复核'], ['reduction', '同层去重'],
  ['completion', '遮挡补全'], ['completionCheck', '补全检查'], ['children', '直属结构拆分'],
];

const step = (id, title, status, children = [], note = '') => ({ id, title, status, children, note });
const partSteps = clothing => [
  step('preparation', '准备参考', 'done', clothing
    ? [step('clothing', '提取纯衣服参考', 'done')]
    : [step('standard', '标准参考 · 按需调整姿态', 'done'),
      step('simplified', '判断并简化角色', 'done'), step('base', '生成素体参考', 'done')]),
  step('initial', '首次分组', 'done'),
  step('layers', '逐层拆分', 'done', groupPhases.map(([id, title]) => step(id, title, 'done')),
    '每层先完成轮廓和复核，再同层去重；补全、检查和直属结构拆分完成后进入下一层。终止 part 不再拆子组。'),
  step('merge', '合成分块预览', 'done'),
  step('occlusion', '遮挡深度规划', 'done'),
];

const rasterSteps = clothing => [
  step('step01', clothing ? '衣服分件、补全与拼装' : '分层、补全与 Krita 交付', 'done', [],
    '按部件生成控制图、提取与补全，再对齐、拼装和逐层验收。绘制过程由同一 agent 完成。'),
  step('step02', clothing ? '衣服边缘与衔接修画' : '边缘柔化与去锯齿', clothing ? 'running' : 'done', [
    step('draw', '边缘修画', 'done'),
    step('review-01', '第 1 轮 review', 'done'),
    step('repair-01', '第 1 轮修复', clothing ? 'running' : 'done'),
    step('review-02', '第 2 轮 review', clothing ? 'pending' : 'done'),
    step('repair-02', '第 2 轮修复', clothing ? 'pending' : 'done'),
  ], 'review 通过可提前结束；需要修复时交回绘制者。最多两轮，第二轮修复后不再 review。全部结束后 step02 才完成。'),
  ...(clothing ? [] : [step('step03', '去除连体服、补全身体底层', 'done')]),
];

export const pipelineSteps = [
  partSteps(false), rasterSteps(false), partSteps(true), rasterSteps(true),
  [step('step01', '人物与衣服 KRA 组装', 'pending', [],
    '同一 agent 调整穿戴关系、必要遮罩与局部笔触，重开验收并导出 KRA、合成 PNG 和报告。')],
];

export function groupLayers(groups) {
  const layers = [];
  function visit(nodes, depth) {
    for (const node of nodes) {
      (layers[depth] ??= []).push(node);
      visit(node.groups || [], depth + 1);
    }
  }
  visit(groups, 0);
  return layers;
}

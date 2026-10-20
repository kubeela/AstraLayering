// Display-only definitions, matched to the existing preparation, part and raster runners.
// Execution states are supplied by the read-only task snapshot; these are labels only.
export const groupPhases = [
  ['outline', '轮廓绘制'], ['review', '轮廓复核'], ['reduction', '同层去重'],
  ['completion', '遮挡补全'], ['completionCheck', '补全检查'], ['children', '直属结构拆分'],
];

const step = (id, title, status, children = [], note = '') => ({ id, title, status, children, note });
const partSteps = clothing => [
  step('preparation', '准备参考', 'pending', clothing
    ? [step('clothing', '提取纯衣服参考', 'pending')]
    : [step('standard', '标准参考 · 按需调整姿态', 'pending', [],
        '未启用 --standard 时将原图保存为 standard.png；启用后先判断姿态，符合则复制，否则调整。之后进入参考判断与简化。'),
      step('simplified', '判断并简化角色', 'pending'), step('base', '生成素体参考', 'pending')]),
  step('initial', '首次分组', 'pending'),
  step('layers', '逐层拆分', 'pending', groupPhases.map(([id, title]) => step(id, title, 'pending')),
    '每层先完成轮廓和复核，再同层去重；补全、检查和直属结构拆分完成后进入下一层。终止 part 不再拆子组。'),
  step('merge', '合成分块预览', 'pending'),
  step('occlusion', '遮挡深度规划', 'pending'),
];

const rasterSteps = clothing => [
  step('step01', clothing ? '衣服分件、补全与拼装' : '分层、补全与 Krita 交付', 'pending', [],
    '按部件生成控制图、提取与补全，再对齐、拼装和逐层验收。绘制过程由同一 agent 完成。'),
  step('step02', clothing ? '衣服边缘与衔接修画' : '边缘柔化与去锯齿', 'pending', [
    step('draw', '边缘修画', 'pending'),
    step('review-01', '第 1 轮 review', 'pending'),
    step('repair-01', '第 1 轮修复', 'pending'),
    step('review-02', '第 2 轮 review', clothing ? 'pending' : 'pending'),
    step('repair-02', '第 2 轮修复', clothing ? 'pending' : 'pending'),
  ], 'review 通过可提前结束；需要修复时交回绘制者。最多两轮，第二轮修复后不再 review。全部结束后 step02 才完成。'),
  ...(clothing ? [] : [step('step03', '去除连体服、补全身体底层', 'pending')]),
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

// Known artifact contracts; the UI only displays files present in the selected task.
const image = (path, label) => ({ path, label, kind: 'image' });
const file = (path, label) => ({ path, label, kind: 'file' });
const rasterDelivery = (pipeline, stepId, png, kra) => [
  image(`${pipeline}/${stepId}/${png}`, '合成 PNG'),
  file(`${pipeline}/${stepId}/${kra}`, '分层 KRA'),
  file(`${pipeline}/${stepId}/report.md`, '绘制报告'),
];
export const stepArtifacts = [
  {
    preparation: [file('part-layering/references/judgment.json', '参考判断记录')],
    standard: [image('part-layering/references/standard.png', '标准参考 · standard.png')],
    simplified: [image('part-layering/references/simplified-subject.png', '简化角色')],
    base: [image('part-layering/references/base-subject.png', '素体参考')],
    merge: [image('part-layering/preview.svg', '分块合成 SVG')],
    occlusion: [file('part-layering/occlusion.json', '遮挡深度表')],
  },
  {
    step01: rasterDelivery('raster-layering', 'step01', 'composite.png', 'character-depth.kra'),
    step02: rasterDelivery('raster-layering', 'step02', 'character-soft-edges.png', 'character-soft-edges.kra'),
    step03: rasterDelivery('raster-layering', 'step03', 'character-dressup-base.png', 'character-dressup-base.kra'),
  },
  {
    clothing: [image('clothing-part-layering/references/clothing.png', '纯衣服参考')],
    merge: [image('clothing-part-layering/preview.svg', '衣服分块 SVG')],
    occlusion: [file('clothing-part-layering/occlusion.json', '遮挡深度表'), image('clothing-part-layering/stages/occlusion/candidate.svg', '深度规划候选图')],
  },
  {
    step01: rasterDelivery('clothing-raster-layering', 'step01', 'composite.png', 'clothing-depth.kra'),
    step02: rasterDelivery('clothing-raster-layering', 'step02', 'composite.png', 'clothing-soft-edges.kra'),
    'review-01': [file('clothing-raster-layering/step02/review-01.md', '第 1 轮反馈')],
    'repair-01': [file('clothing-raster-layering/step02/repair-01.md', '第 1 轮修复记录')],
    'review-02': [file('clothing-raster-layering/step02/review-02.md', '第 2 轮反馈')],
    'repair-02': [file('clothing-raster-layering/step02/repair-02.md', '第 2 轮修复记录')],
  },
  {
    step01: [...rasterDelivery('character-assembly', 'step01', 'character-assembled.png', 'character-assembled.kra'),
      image('character-assembly/step01/final-overall-comparison.jpg', '最终参考对照')],
  },
];

for (const index of [1, 3]) {
  const pipeline = index === 1 ? "raster-layering" : "clothing-raster-layering";
  for (const phase of ["review-01", "repair-01", "review-02", "repair-02"])
    stepArtifacts[index][phase] = [file(`${pipeline}/step02/${phase}.md`, phase + " 报告")];
}

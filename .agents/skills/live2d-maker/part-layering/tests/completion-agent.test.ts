import { profile } from '../profile.ts';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import type { AgentTask } from '../../shared/codex/agents.ts';
import { artifactPath, publishSvg, svgHash } from '../../shared/part/artifact-facts.ts';
import { completeGroupOcclusion, checkGroupCompletion, readCompletionReferences } from '../../shared/part/completion-agent.ts';
import { assertCompletionPreserves, composeCompletion } from '../../shared/part/completion-svg.ts';
import { normalizeGroups, GroupStore, walkGroups, writeAtomic } from '../../shared/part/groups.ts';
import { readGroupPrompt, readGroupReferences } from '../../shared/part/group-prompts.ts';
import { createLayeringSteps } from '../../shared/part/layering-steps.ts';
import { runLayering } from '../../shared/part/layering.ts';
import { fixture, shape, workingSteps } from './layering-fixture.ts';

const signal = new AbortController().signal;
const paths = [{ d: 'M 5 40 H 20 V 60 H 5 Z' }];
function tool(task: AgentTask, name: string) { return task.tools!.find(tool => tool.name === name)!; }
async function submit(task: AgentTask, path: string) {
  await tool(task, 'preview_svg').execute({ path, mode: 'blend' }, signal);
  await tool(task, 'preview_svg').execute({ path, mode: 'svg' }, signal);
  await tool(task, 'submit_completion').execute({ note: '正面被相邻组遮挡，沿原轮廓保守连接。' }, signal);
}

test('完全遮挡节点可提交空可见轮廓，经独立 review 后补出形体，续跑保留原稿与事实', async t => {
  const f = await fixture(t), calls: string[] = [];
  const run = async (task: AgentTask) => {
    calls.push(task.name);
    const input = JSON.parse(task.prompt.match(/【本次输入】\n([\s\S]*?\n})\n/)![1]);
    if (task.name.startsWith('组轮廓绘制')) {
      assert.equal(task.imageGeneration, false);
      await tool(task, 'write_outline_svg').execute({ svg: shape('face', 10, 90, true) }, signal);
      await tool(task, 'preview_svg').execute({ path: input.outputSvg, mode: 'blend' }, signal);
    } else if (task.name.startsWith('组轮廓review')) {
      assert.equal(task.imageGeneration, false);
      await tool(task, 'preview_svg').execute({ path: input.candidate, mode: 'edge' }, signal);
      await tool(task, 'submit_review').execute({ verdict: 'pass', feedback: '本测试参考中该节点完全遮挡，没有可见轮廓；隐藏形体留给补全。' }, signal);
    } else {
      assert.ok(task.name.startsWith('正面遮挡补全'));
      assert.equal(task.imageGeneration, true);
      // face 使用专用正文，通用规则修改不能遗漏它。
      assert.doesNotMatch(task.prompt, /露出双耳的结构参考并查看|本次参考只露耳缘/);
      assert.match(task.prompt, /部件完全被遮挡.*必须先.*结构辅助图并查看/);
      assert.doesNotMatch(task.prompt, /\{runtime_context\}|\{fixed_rules\}/);
      await tool(task, 'set_completion_paths').execute({ paths }, signal);
      await submit(task, input.outputDraft);
    }
    return { text: 'fixture done', images: [], threadId: 'empty-outline-thread' };
  };
  const adapter = createLayeringSteps({ run, createSession: () => ({ run, async close() {} }) });
  const steps = { ...workingSteps([], [{ id: 'face', note: '参考中被完全遮挡的真实脸部节点' }]),
    drawOutline: adapter.drawOutline, reviewOutline: adapter.reviewOutline,
    completeOcclusion: adapter.completeOcclusion, checkCompletion: adapter.checkCompletion };
  await runLayering({ ...f, groups: null, steps });
  assert.deepEqual(calls, ['组轮廓绘制-face', '组轮廓review-face', '正面遮挡补全-face']);
  const before = await readFile(artifactPath(f.directory, 'face', 'reduction'), 'utf8');
  const after = await readFile(artifactPath(f.directory, 'face', 'completion'), 'utf8');
  assert.doesNotMatch(before, /<path/);
  assert.equal(assertCompletionPreserves(before, after), 1);
  const restored = (await GroupStore.open(f.directory)).snapshot().groups[0];
  assert.equal(restored.steps.outline.status, 'completed');
  assert.equal(restored.steps.review.output?.reviewOutcome, 'pass');
  assert.equal(restored.steps.completionCheck.status, 'completed');
  await runLayering({ ...f, groups: null, steps });
  assert.equal(calls.length, 3);
});

test('补全原 SVG 正文原样保留，禁止删改属性、重排或注入任意节点', () => {
  const source = shape('head');
  const complete = composeCompletion(source, paths);
  assert.equal(assertCompletionPreserves(source, complete), 1);
  assert.equal(assertCompletionPreserves(source, source), 0);
  assert.equal(complete.replace(/<g data-completion-additions[^>]*>[\s\S]*?<\/g>/, ''), source);
  for (const candidate of [complete.replace('M10 10', 'M12 10'), complete.replace('fill="#55b9ad"', 'fill="#000000"'),
    complete.replace('<path d=', '<path style="opacity:0" d='), shape('head', 5, 95)]) {
    assert.throws(() => assertCompletionPreserves(source, candidate), /改变|未授权/);
  }
  for (const bad of [[{ d: 'M0 0L5 5' }], [{ d: 'M0 0 Z"/><style>path{display:none}</style>' }],
    [{ d: 'M0 0Z', transform: 'scale(2)' }], [{ d: 'M0 0Z', fillRule: 'bad' }]]) {
    assert.throws(() => composeCompletion(source, bad), /只接受/);
  }
  assert.equal(assertCompletionPreserves(source, complete.replace('<svg ', `<svg data-source-sha256="${svgHash(source)}" `)), 1);
});

test('补全默认适配器用只读 agent 和新增工具，提交后正式发布并由文件恢复', async t => {
  const f = await fixture(t), events: string[] = [];
  let calls = 0;
  const adapter = createLayeringSteps({ async run(task) {
    calls++;
    assert.equal(task.sandboxMode, 'read-only');
    assert.equal(task.imageGeneration, true);
    assert.ok(task.tools!.some(tool => tool.name === 'view_bitmap'));
    assert.match(task.prompt, /部件完全被遮挡.*必须先.*结构辅助图并查看/);
    assert.match(task.prompt, /不设计侧面、背面/);
    const rules = await readFile(new URL('../prompts/9-补全操作约定.md', import.meta.url), 'utf8');
    assert.ok(task.prompt.includes(`【固定范围与操作约定】\n${rules}`));
    assert.match(task.prompt, /固定约定提示词来源：.*9-补全操作约定\.md/);
    const input = JSON.parse(task.prompt.match(/【本次输入】\n([\s\S]*?\n})\n/)![1]);
    await tool(task, 'preview_svg').execute({ path: input.sourceSvg, mode: 'blend' }, signal);
    await tool(task, 'set_completion_paths').execute({ paths }, signal);
    await submit(task, input.outputDraft);
    return { text: 'done', images: [] };
  } });
  const steps = { ...workingSteps(events), completeOcclusion: adapter.completeOcclusion, checkCompletion: adapter.checkCompletion };
  await runLayering({ ...f, groups: null, steps });
  assert.equal(calls, 1);
  const source = await readFile(artifactPath(f.directory, 'head', 'reduction'), 'utf8');
  const after = await readFile(artifactPath(f.directory, 'head', 'completion'), 'utf8');
  assert.equal(assertCompletionPreserves(source, after), 1);
  assert.equal((await GroupStore.open(f.directory)).snapshot().groups[0].steps.completionCheck.status, 'completed');
  await runLayering({ ...f, groups: null, steps });
  assert.equal(calls, 1);
  // 即使版本标记仍匹配，篡改过原形的正式文件也不能构成完成事实。
  await writeFile(artifactPath(f.directory, 'head', 'completion'), after.replace('M10 10', 'M11 10'));
  assert.equal((await GroupStore.open(f.directory)).snapshot().groups[0].steps.completion.status, 'pending');
});

test('自定义补全实现也受调度器保留原形约束，不发布重画候选', async t => {
  const f = await fixture(t), steps = workingSteps([]);
  await assert.rejects(runLayering({ ...f, groups: null, steps: { ...steps, async completeOcclusion(context) {
    await writeFile(context.outputPath, shape('head', 5, 95));
    return { status: 'completed', output: { path: context.outputPath } };
  } } }), /只允许程序生成的新增层/);
  await assert.rejects(readFile(artifactPath(f.directory, 'head', 'completion')), { code: 'ENOENT' });
});

test('face 特化与可选参考按完整 ID 独立读取；只配置参考也不要求替换通用正文', async t => {
  const f = await fixture(t);
  const face = await readGroupPrompt('face', 'completion', profile.promptsDirectory);
  assert.match(face.text, /不要扩成整个头型/);
  assert.match(face.text, /不设计侧脸、背面/);
  assert.ok((await readGroupPrompt('face/eye', 'completion', profile.promptsDirectory)).path.endsWith('9-正面遮挡补全.md'));
  const prompts = join(f.directory, 'prompts');
  await mkdir(join(prompts, 'groups', 'head'), { recursive: true });
  await writeFile(join(prompts, '9-正面遮挡补全.md'), 'generic');
  const groupPrompt = await readGroupPrompt('head', 'completion', prompts);
  await writeFile(join(groupPrompt.groupDirectory, 'completion.references.json'), JSON.stringify([
    { path: '../../../references/base.png', description: '仅供正面轮廓先验' },
  ]));
  assert.deepEqual(await readCompletionReferences(groupPrompt.groupDirectory), [{ path: f.references.baseSubject, description: '仅供正面轮廓先验' }]);
  assert.deepEqual(await readCompletionReferences(join(groupPrompt.groupDirectory, 'child')), []);
  await writeFile(join(groupPrompt.groupDirectory, 'completion.references.json'), '[{"path":"missing.png","description":"ref"}]');
  await assert.rejects(readCompletionReferences(groupPrompt.groupDirectory), { code: 'ENOENT' });
});

test('正式调度中左右十指附加实际掌片与完整指体图片，part 不再分析子组', async t => {
  const f = await fixture(t), events: string[] = [], fingers = ['thumb', 'index_finger', 'middle_finger', 'ring_finger', 'little_finger'];
  const children = Object.fromEntries([
    ['arms', ['arm_left', 'arm_right'].map(name => ({ id: `arms/${name}` }))],
    ...['arm_left', 'arm_right'].flatMap(side => [
      [`arms/${side}`, [{ id: `arms/${side}/hand` }]],
      [`arms/${side}/hand`, ['palm', ...fingers].map(name => ({ id: `arms/${side}/hand/${name}`, kind: 'part' as const }))],
    ]),
  ]);
  const steps = workingSteps(events, [{ id: 'arms' }], children), calls: string[] = [];
  const adapter = createLayeringSteps({ async run(task) {
    const input = JSON.parse(task.prompt.match(/【本次输入】\n([\s\S]*?\n})\n/)![1]);
    const id = input.group.id;
    calls.push(id);
    assert.ok(task.prompt.includes(`prompts/groups/${id}/completion.md`));
    assert.match(task.prompt, /仅延伸到邻指下面不等于接到了手掌/);
    assert.match(task.prompt, /拇指按其自身根部与鱼际附近/);
    const palm = `${id.slice(0, id.lastIndexOf('/'))}/palm`;
    assert.match(task.prompt, /Milly 与樱桃的完整指体图例/);
    assert.match(task.prompt, /整指连通或指根碰到掌片，不代表中间指身已经补足/);
    assert.equal(input.additionalReferences.length, 2);
    const ref = input.additionalReferences[0];
    assert.equal(ref.groupId, palm);
    assert.equal(ref.sourceStage, 'reduction');
    assert.equal(ref.sourceSvg, artifactPath(f.directory, palm, 'reduction'));
    assert.equal(ref.sourceHash, svgHash(await readFile(ref.sourceSvg)));
    const prior = input.additionalReferences[1];
    assert.ok(prior.path.endsWith('/prompts/groups/arms/references/fingers/complete-fingers.png'));
    assert.match(prior.description, /不照搬姿势、宽度、肤色/);
    assert.deepEqual(task.images!.map(image => image.path), [f.references.baseSubject, ref.path, prior.path]);
    const result = await tool(task, 'read_svg').execute({ path: ref.sourceSvg }, signal);
    assert.ok(JSON.stringify(result).includes(palm));
    const otherPalm = ref.sourceSvg.replace(id.includes('/arm_left/') ? '/arm_left/' : '/arm_right/', id.includes('/arm_left/') ? '/arm_right/' : '/arm_left/');
    await assert.rejects(tool(task, 'read_svg').execute({ path: otherPalm }, signal), /只能读取本次明确提供/);
    await submit(task, input.outputDraft);
    return { text: 'done', images: [] };
  } });
  await runLayering({ ...f, groups: null, steps: { ...steps, completeOcclusion: context =>
    fingers.includes(context.group.id.split('/').at(-1)!) ? adapter.completeOcclusion(context) : steps.completeOcclusion(context),
    checkCompletion: adapter.checkCompletion } });
  const expected = ['arm_left', 'arm_right'].flatMap(side => fingers.map(name => `arms/${side}/hand/${name}`));
  assert.deepEqual(calls.sort(), expected.sort());
  for (const { group } of walkGroups((await GroupStore.open(f.directory)).snapshot().groups).filter(({ group }) => expected.includes(group.id))) {
    assert.equal(group.steps.completionCheck.status, 'completed');
    assert.deepEqual(group.groups, []);
    assert.ok(!events.includes(`${group.id}:children`));
  }
  for (const id of ['arms/arm_left/hand', 'arms/arm_left/hand/palm', 'arms/arm_right/hand', 'arms/arm_right/hand/palm']) {
    assert.ok((await readGroupPrompt(id, 'completion', profile.promptsDirectory)).path.endsWith('9-正面遮挡补全.md'));
  }
});

test('声明的同级参考使用稳定去重底形，不读取旧补全稿；缺失依赖及非法引用明确报错', async t => {
  const f = await fixture(t), config = join(f.directory, 'config');
  await mkdir(config);
  const parent = normalizeGroups([{ id: 'hand', groups: [{ id: 'hand/palm', kind: 'part' }, { id: 'hand/finger', kind: 'part' }] }])[0];
  const [palm, group] = parent.groups, source = artifactPath(f.directory, palm.id, 'reduction');
  await writeAtomic(source, shape(palm.id, 20, 70));
  await writeAtomic(artifactPath(f.directory, palm.id, 'completion'), 'invalid old completion');
  palm.steps.reduction = { status: 'completed', output: { path: source } };
  const context = { ...f, group, parent }, manifest = join(config, 'completion.references.json');
  await writeFile(manifest, JSON.stringify([{ sibling: 'palm', description: '实际掌片' }]));
  const [ref] = await readCompletionReferences(config, context);
  assert.ok('sourceSvg' in ref && ref.sourceSvg === source);
  assert.equal(palm.steps.completion.status, 'pending');
  await assert.rejects(readCompletionReferences(config), /需要本次运行上下文/);
  palm.steps.reduction = { status: 'pending' };
  await assert.rejects(readCompletionReferences(config, context), /尚未完成整层去重/);
  for (const sibling of ['missing', 'finger']) {
    await writeFile(manifest, JSON.stringify([{ sibling, description: 'ref' }]));
    await assert.rejects(readCompletionReferences(config, context), /不是当前节点的其他直属同级/);
  }
  for (const entry of [{ sibling: '../palm', description: 'ref' }, { sibling: 'palm', path: 'also.png', description: 'ref' }]) {
    await writeFile(manifest, JSON.stringify([entry]));
    await assert.rejects(readCompletionReferences(config, context), /无效 completion 参考清单/);
  }
  await writeFile(join(config, 'children.references.json'), JSON.stringify([{ sibling: 'palm', description: 'ref' }]));
  await assert.rejects(readGroupReferences(config, 'children'), /无效 children 参考清单/);
});

test('新增路径修正后必须重看当前候选；没有工具提交不能交付', async t => {
  const f = await fixture(t), group = normalizeGroups([{ id: 'face' }])[0];
  const source = join(f.directory, 'source.svg'), outputPath = join(f.directory, 'face.draft.svg');
  await writeFile(source, shape('face'));
  const context = { ...f, group, reviewed: { path: source }, outputPath };
  await assert.rejects(completeGroupOcclusion(context, { async run(task) {
    await tool(task, 'preview_svg').execute({ path: outputPath, mode: 'blend' }, signal);
    await tool(task, 'preview_svg').execute({ path: outputPath, mode: 'svg' }, signal);
    await tool(task, 'set_completion_paths').execute({ paths }, signal);
    await assert.rejects(tool(task, 'submit_completion').execute({ note: 'done' }, signal), /须预览当前/);
    return { text: 'done', images: [] };
  } }), /未通过 submit_completion/);
  const result = await completeGroupOcclusion(context, { async run(task) {
    await submit(task, outputPath); // 无需新增，程序允许正式复制。
    return { text: 'done', images: [] };
  } });
  assert.equal(result.path, outputPath);
  const final = outputPath.replace('.draft.svg', '.svg');
  await publishSvg(outputPath, final, svgHash(await readFile(source)));
  assert.equal((await checkGroupCompletion({ ...f, group, before: { path: source }, after: { path: final } })).passed, true);
});

test('补全子组必须在父完成范围内，即使原形保留也不能越界', async t => {
  const f = await fixture(t), group = normalizeGroups([{ id: 'head/child' }])[0];
  const parentPath = join(f.directory, 'parent.svg'), source = join(f.directory, 'source.svg');
  await writeFile(parentPath, shape('head', 10, 90));
  await writeFile(source, shape('head/child', 20, 80));
  const parent = normalizeGroups([{ id: 'head', steps: { completion: { status: 'completed', output: { path: parentPath } } } }])[0];
  await assert.rejects(completeGroupOcclusion({ ...f, group, parent, reviewed: { path: source }, outputPath: join(f.directory, 'child.draft.svg') }, {
    async run(task) {
      await tool(task, 'set_completion_paths').execute({ paths }, signal);
      return { text: '', images: [] };
    },
  }), /超出父轮廓/);
});

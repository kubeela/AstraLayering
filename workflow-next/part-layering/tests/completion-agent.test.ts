import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import type { AgentTask } from '../agents.ts';
import { artifactPath, publishSvg, svgHash } from '../artifact-facts.ts';
import { completeGroupOcclusion, checkGroupCompletion, readCompletionReferences } from '../completion-agent.ts';
import { assertCompletionPreserves, composeCompletion } from '../completion-svg.ts';
import { normalizeGroups, GroupStore } from '../groups.ts';
import { readGroupPrompt } from '../group-prompts.ts';
import { createLayeringSteps } from '../layering-steps.ts';
import { runLayering } from '../layering.ts';
import { fixture, shape, workingSteps } from './layering-fixture.ts';

const signal = new AbortController().signal;
const paths = [{ d: 'M 5 40 H 20 V 60 H 5 Z' }];
function tool(task: AgentTask, name: string) { return task.tools!.find(tool => tool.name === name)!; }
async function submit(task: AgentTask, path: string) {
  await tool(task, 'preview_svg').execute({ path, mode: 'blend' }, signal);
  await tool(task, 'preview_svg').execute({ path, mode: 'svg' }, signal);
  await tool(task, 'submit_completion').execute({ note: '正面被相邻组遮挡，沿原轮廓保守连接。' }, signal);
}

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
    assert.equal(task.imageGeneration, false);
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
  const face = await readGroupPrompt('face', 'completion');
  assert.match(face.text, /不要扩成整个头型/);
  assert.match(face.text, /不设计侧脸、背面/);
  assert.ok((await readGroupPrompt('face/eye', 'completion')).path.endsWith('9-正面遮挡补全.md'));
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

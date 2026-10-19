import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { artifactPath } from '../../shared/part/artifact-facts.ts';
import { runLayering } from '../../shared/part/layering.ts';
import { reduceGroupOutlines } from '../../shared/part/outline-reduce.ts';
import { fixture, shape, workingSteps } from './layering-fixture.ts';

const signal = new AbortController().signal;
for (const mode of ['changed', 'unchanged', 'empty', 'wrong-path', 'no-preview', 'missing-submit'] as const) {
  test(`真实去重适配器的工具交付与校验：${mode}`, async t => {
    const f = await fixture(t), events: string[] = [], steps = workingSteps(events, [{ id: 'hair' }, { id: 'accessories' }]);
    const input = { ...f, groups: null, steps: { ...steps, async reduceOutlines(context: Parameters<typeof reduceGroupOutlines>[0]) {
      return { status: 'completed' as const, output: await reduceGroupOutlines(context, { async run(task) {
        assert.equal(task.imageGeneration, false);
        const runtime = JSON.parse(task.prompt.split('【本次输入】\n')[1]);
        const preview = task.tools!.find(tool => tool.name === 'preview_svg')!;
        const write = task.tools!.find(tool => tool.name === 'write_reduction_svg')!;
        const submit = task.tools!.find(tool => tool.name === 'submit_reduction')!;
        if (mode !== 'no-preview') await preview.execute({ path: runtime.mergedPreview, mode: 'blend' }, signal);
        const group = runtime.groups.find((group: { id: string }) => group.id === 'accessories');
        const changed = [];
        if (mode === 'changed' || mode === 'empty') {
          await assert.rejects(write.execute({ groupId: 'accessories', svg: shape('accessories'), path: group.sourceSvg }, signal), /路径由程序绑定/);
          await assert.rejects(write.execute({ groupId: 'unknown', svg: shape('unknown') }, signal), /本层组/);
          await assert.rejects(write.execute({ groupId: 'accessories', svg: shape('hair') }, signal));
          await write.execute({ groupId: 'accessories', svg: shape('accessories', 20, 80, mode === 'empty') }, signal);
          await preview.execute({ path: group.outputDraft, mode: 'blend' }, signal);
          await write.execute({ groupId: 'accessories', svg: shape('accessories', 20, 80, mode === 'empty') }, signal);
          await assert.rejects(submit.execute({ changed: [{ groupId: 'accessories', path: group.outputDraft }], note: 'stale preview' }, signal), /修改后须/);
          await preview.execute({ path: group.outputDraft, mode: 'blend' }, signal);
          changed.push({ groupId: 'accessories', path: group.outputDraft });
        }
        if (mode === 'wrong-path') changed.push({ groupId: 'accessories', path: group.sourceSvg });
        if (mode !== 'missing-submit') await submit.execute({ changed, note: 'checked all groups' }, signal);
        return { text: 'ordinary final reply', images: [] };
      } }) };
    } } };
    if (['wrong-path', 'no-preview', 'missing-submit'].includes(mode)) {
      await assert.rejects(runLayering(input), /指定|.draft.svg|整层合成|submit_reduction/);
      assert.ok(!events.includes('hair:completion'));
    } else {
      await runLayering(input);
      assert.deepEqual(await readFile(artifactPath(f.directory, 'hair', 'reduction')), await readFile(artifactPath(f.directory, 'hair', 'outline')));
      assert.equal(await readFile(artifactPath(f.directory, 'accessories', 'outline'), 'utf8'), shape('accessories'));
    }
  });
}

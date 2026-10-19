import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { GroupStore, writeAtomic } from '../../shared/part/groups.ts';
import { runLayering } from '../../shared/part/layering.ts';
import { namespaceSvg } from '../../shared/part/merge-svg.ts';
import { fixture, workingSteps } from './layering-fixture.ts';

const sample = async (svg: string, x: number, y: number) => {
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
};

test('所有 part 完成后默认合并只绘制叶子，保留分组 ID 与叠放顺序，续跑复用且树顺序变化重建', async t => {
  const f = await fixture(t), events: string[] = [];
  const steps = workingSteps(events, [{ id: 'body' }], { body: [{ id: 'body/a', kind: 'part' }, { id: 'body/b', kind: 'part' }] });
  const originalDraw = steps.drawOutline;
  steps.drawOutline = async context => {
    const result = await originalDraw(context);
    if (context.group.id !== 'body') await writeAtomic(context.outputPath,
      (await readFile(context.outputPath, 'utf8')).replace('#55b9ad', context.group.id.endsWith('/a') ? '#ff0000' : '#0000ff'));
    return result;
  };
  const result = await runLayering({ ...f, groups: null, steps });
  assert.equal(result.status, 'completed');
  assert.equal(result.output, join(f.directory, 'preview.svg'));
  const svg = await readFile(result.output!, 'utf8');
  assert.match(svg, /data-part-preview="1"/);
  assert.match(svg, /id="part-preview-groups"/);
  assert.match(svg, /data-group-path="body" data-node-kind="group"/);
  assert.match(svg, /data-group-path="body\/a" data-node-kind="part"/);
  assert.equal((svg.match(/<path\b/g) ?? []).length, 2);
  assert.deepEqual(await sample(svg, 50, 50), [0, 0, 255, 255]);
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  events.length = 0;
  await runLayering({ ...f, groups: null, steps });
  assert.deepEqual(events, []);
  assert.equal(await readFile(result.output!, 'utf8'), svg);
  const treePath = join(f.directory, 'groups.json'), tree = JSON.parse(await readFile(treePath, 'utf8'));
  tree.groups[0].groups.reverse();
  await writeFile(treePath, JSON.stringify(tree));
  await runLayering({ ...f, groups: null, steps });
  assert.deepEqual(events, []);
  const reordered = await readFile(result.output!, 'utf8');
  assert.notEqual(reordered, svg);
  assert.deepEqual(await sample(reordered, 50, 50), [255, 0, 0, 255]);
  assert.equal((await GroupStore.open(f.directory)).snapshot().merge.status, 'completed');
});

test('资源和样式隔离：相同 ID 的渐变、裁切和 href 仍指向各自 part，源 SVG 不变', async () => {
  const part = (fill: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="paint"><stop stop-color="${fill}"/></linearGradient><clipPath id="clip"><rect width="100" height="100"/></clipPath><path id="geometry" d="M10 10H90V90H10Z"/></defs><style>.paint{fill:url(#paint)} #shape{opacity:1}</style><g id="shape" clip-path="url(#clip)"><use class="paint" href="#geometry"/></g></svg>`;
  const a = part('#ff0000'), b = part('#0000ff');
  const combined = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">${namespaceSvg(a, 'a')}<g transform="translate(100 0)">${namespaceSvg(b, 'b')}</g></svg>`;
  assert.deepEqual(await sample(combined, 50, 50), [255, 0, 0, 255]);
  assert.deepEqual(await sample(combined, 150, 50), [0, 0, 255, 255]);
  assert.match(combined, /href="#a-geometry"/);
  assert.match(combined, /clip-path="url\(#b-clip\)"/);
  assert.ok(!a.includes('a-paint') && !b.includes('b-paint'));
});

test('任一 part 未完成不发布最终预览，只有草稿或旧 character.svg 也不算完成', async t => {
  const f = await fixture(t), steps = workingSteps([], [{ id: 'body' }], { body: [{ id: 'body/finger', kind: 'part' }] });
  await writeAtomic(join(f.directory, 'character.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const result = await runLayering({ ...f, groups: null, steps: { ...steps, async completeOcclusion(context) {
    return context.group.kind === 'part' ? { status: 'pending', message: 'wait' } : steps.completeOcclusion(context);
  } } });
  assert.equal(result.status, 'pending');
  await assert.rejects(readFile(join(f.directory, 'preview.svg')), { code: 'ENOENT' });
  assert.equal((await GroupStore.open(f.directory)).snapshot().merge.status, 'pending');
  assert.equal((await runLayering({ ...f, groups: null, steps })).status, 'completed');
});

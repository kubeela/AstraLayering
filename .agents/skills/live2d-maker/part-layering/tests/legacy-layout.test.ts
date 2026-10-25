import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkStep, readStep, type ChainStep } from '../../shared/step-chain.ts';
import { GroupStore, walkGroups } from '../../shared/part/groups.ts';
import { migrateLegacyLayout } from '../../shared/part/legacy-layout.ts';
import { groupStep, initialStepId, layerStep } from '../../shared/part/part-steps.ts';

const archive = fileURLToPath(new URL('../../../../../demos/jianma/part-layering/', import.meta.url));

async function legacyCopy(t: test.TestContext): Promise<string | undefined> {
  try { await stat(join(archive, 'stages')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    t.skip('仅仓库验收：需要 demos/jianma 的旧 stages/ 归档');
    return;
  }
  const directory = await mkdtemp(join(tmpdir(), 'legacy-layout-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const entry of ['groups.json', 'parts', 'stages']) await cp(join(archive, entry), join(directory, entry), { recursive: true });
  return directory;
}

test('旧 stages/ 归档转换为步骤目录后按记录恢复整棵树，且每个步骤都可沿用', async t => {
  const directory = await legacyCopy(t);
  if (!directory) return;
  assert.equal(await migrateLegacyLayout(directory), true);
  await stat(join(directory, 'stages.legacy'));
  await assert.rejects(stat(join(directory, 'stages')), { code: 'ENOENT' });
  const groups = (await GroupStore.open(directory)).snapshot().groups, all = walkGroups(groups);
  assert.equal(all.length, 115);
  assert.ok(all.every(({ group }) => Object.values(group.steps).every(step => step.status === 'completed')));
  const lookup = (id: string): ChainStep => ({ id, directory: join(directory, id), dependsOn: [] });
  const steps = all.flatMap(({ group }) => [1, 2, 3].map(step => groupStep(directory, group.id, step as 1 | 2 | 3)));
  for (const depth of new Set(all.map(entry => entry.depth))) {
    steps.push(layerStep(directory, depth, all.filter(entry => entry.depth === depth).map(entry => entry.group.id)));
  }
  for (const step of steps) assert.equal((await checkStep(step, lookup)).action, 'keep', step.id);
  // A second call leaves the converted run alone.
  assert.equal(await migrateLegacyLayout(directory), false);
});

test('未完成的子组分析成为中断的步骤；中断的转换会重新开始', async t => {
  const directory = await legacyCopy(t);
  if (!directory) return;
  const document = JSON.parse(await readFile(join(directory, 'groups.json'), 'utf8'));
  const face = document.groups.find((group: { id: string }) => group.id === 'face');
  delete face.childrenAnalysis;
  face.groups = [];
  await writeFile(join(directory, 'groups.json'), JSON.stringify(document));
  await writeFile(join(directory, '.legacy-migration'), '');
  await cp(join(directory, 'stages', 'outline', 'face.svg'), join(directory, 'stray.svg'));
  assert.equal(await migrateLegacyLayout(directory), true);
  await assert.rejects(stat(join(directory, '.legacy-migration')), { code: 'ENOENT' });
  assert.equal((await readStep(join(directory, initialStepId))).status, 'completed');
  assert.equal((await readStep(groupStep(directory, 'face', 2).directory)).status, 'completed');
  assert.equal((await readStep(groupStep(directory, 'face', 3).directory)).status, 'running');
  const lookup = (id: string): ChainStep => ({ id, directory: join(directory, id), dependsOn: [] });
  assert.equal((await checkStep(groupStep(directory, 'face', 3), lookup)).action, 'continue');
  const face2 = (await GroupStore.open(directory)).snapshot().groups.find(group => group.id === 'face')!;
  assert.equal(face2.steps.completion.status, 'completed');
  assert.notEqual(face2.steps.children.status, 'completed');
});

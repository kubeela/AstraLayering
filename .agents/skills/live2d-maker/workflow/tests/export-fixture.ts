import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import type { TestContext } from 'node:test';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { sectionIds } from '../../shared/paths.ts';
import { artifactPath, reportPath, svgHash } from '../../shared/part/artifact-facts.ts';
import { groupStepId, groupSteps, layerStepId } from '../../shared/part/part-steps.ts';
import { clothingPreparationStep, partSteps } from '../../shared/step-paths.js';
import { steps as personSteps } from '../../raster-layering/steps.ts';
import { steps as clothingSteps } from '../../clothing-raster-layering/steps.ts';
import { steps as assemblySteps } from '../../character-assembly/steps.ts';
import { maskSteps } from '../../shadow/steps.ts';
import type { TaskRun } from '../state.ts';

export async function exportFixture(t: TestContext) {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'live2d-export-test-'))), dir = join(base, 'runs'), name = 'case', root = join(dir, name);
  t.after(() => rm(base, { recursive: true, force: true }));
  const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#bcaeff' } }).png().toBuffer();
  const kra = Buffer.from(zipSync({ 'mergedimage.png': png }));
  const put = async (path: string, content: string | Uint8Array) => { const file = join(root, path); await mkdir(dirname(file), { recursive: true }); await writeFile(file, content); };
  const mark = (path: string) => put(path + '/.completed', JSON.stringify({ stamp: path, inputs: {} }));
  const run: TaskRun = { version: 1, jobs: 3, status: 'completed', from: 'part-layering', to: 'shadow', standard: true, shadowMode: 'mask',
    createdAt: '2026-10-26T00:00:00Z', updatedAt: '2026-10-26T01:00:00Z', krita: '/machine-specific/krita',
    sections: Object.fromEntries(sectionIds.map(id => [id, { status: 'completed', updatedAt: '2026-10-26T01:00:00Z', summary: root }])) };
  await put('run.json', JSON.stringify(run)); await put('input/original.png', png);
  for (const section of ['part-layering', 'clothing-part-layering']) {
    const groups = [{ id: 'rear', kind: 'part', groups: [] }, { id: 'front', kind: 'part', groups: [] }];
    const plan = { version: 3, direction: 'back-to-front', sourceHash: 'original-inputs', layers: [
      { id: 'rear', level: 2, note: 'rear', check: { passed: true, note: 'checked' } },
      { id: 'front', levels: [{ level: 1, region: 'back' }, { level: 3, region: 'front' }], note: 'two slices',
        check: { passed: true, note: 'checked', regions: [{ level: 1, note: 'checked' }, { level: 3, note: 'checked' }] } },
    ] };
    await put(section + '/groups.json', JSON.stringify({ groups })); await put(section + '/occlusion.json', JSON.stringify(plan));
    await put(section + '/preview.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><path d="M0 0L8 8"/></svg>');
    for (const step of [partSteps.initial, layerStepId(0), partSteps.merge, partSteps.occlusion,
      ...(section === 'part-layering' ? [partSteps.standard, partSteps.simplified, partSteps.base] : [clothingPreparationStep])]) await mark(section + '/' + step);
    for (const reference of section === 'part-layering' ? ['standard', 'simplified-subject', 'base-subject'] : ['clothing']) await put(section + '/references/' + reference + '.png', png);
    for (const group of groups) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><g id="part-${group.id}" data-group-path="${group.id}"><path d="M1 1H7V7H1Z" fill="#aabbcc"/></g></svg>`;
      for (const stage of ['outline', 'reduction', 'completion'] as const) await put(artifactPath(section, group.id, stage), svg);
      for (const step of groupSteps) await mark(section + '/' + groupStepId(group.id, step));
      await put(reportPath(section, group.id, 'review'), JSON.stringify({ groupId: group.id, reviews: [
        { verdict: 'pass', candidateHash: svgHash(svg), feedback: '复核通过', observations: [], updatedAt: run.updatedAt },
      ] }));
      await put(reportPath(section, group.id, 'completion-check'), JSON.stringify({ passed: true }));
      await put(reportPath(section, group.id, 'children'), JSON.stringify({ groupId: group.id, groups: [] }));
    }
  }
  for (const [section, steps] of [['raster-layering', personSteps], ['clothing-raster-layering', clothingSteps], ['character-assembly', assemblySteps], ['shadow', maskSteps]] as const) {
    for (const step of steps) {
      for (const file of step.requiredFiles) await put(section + '/' + step.id + '/' + file,
        file.endsWith('.kra') ? kra : file.endsWith('.png') ? png : file.endsWith('.json') ? '{}' : '结论：已完成\n绘制通过。\n');
      await mark(section + '/' + step.id);
      if ('review' in step) await put(section + '/' + step.id + '/review-01.md', '结论：通过\n已检查轮廓与接缝。\n');
    }
  }
  await put('raster-layering/step01/workspace/inspect/cited.png', png);
  await put('raster-layering/step01/workspace/inspect/unused.png', png);
  await put('raster-layering/step01/report.md', '结论：已完成\n![检查图](workspace/inspect/cited.png)\n');
  await put('raster-layering/agents/session/auth-settings.json', '{"env":{"SECRET":"must-not-export"}}');
  await put('raster-layering/agents/session/request.json', '{"model":"configured-model"}');
  await put('raster-layering/agents/steps/step01/session.json', '{"threadId":"old-session"}');
  await put('.runtime/packages/secret.txt', 'runtime-package');
  await put('workflow.log', 'verbose log');
  await put('raster-layering/step01/orphan.png', png);
  await put('physics/step01/.completed', '{"stamp":"physics","inputs":{},"outputs":{"physics.png":"test"}}');
  await put('physics/step01/physics.png', png);
  await put('shadow/step01_mask/inspection/overview.png', png);
  await put('shadow/step01_mask/inspection/relation-000-review.png', png);
  return { base, dir, root, name, run, put, png, kra, artHash: createHash('sha256').update(kra).digest('hex') };
}

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from 'node:test';
import sharp from 'sharp';
import { defaultRunsDirectory, pipelineDirectory, resolveInput, runsDirectory, taskDirectory, workflowsDirectory } from '../paths.ts';
import { prepareReferences as preparePerson, loadPreparedReferences as loadPerson } from '../../part-layering/preparation.ts';
import { prepareReferences as prepareClothing, loadPreparedReferences as loadClothing } from '../../clothing-part-layering/preparation.ts';
import { parseRunArguments as parsePart } from '../part/run.ts';
import { parseRunArguments as parseRaster } from '../raster/cli.ts';
import { runWorkflow as runPersonRaster } from '../../raster-layering/run.ts';
import { runWorkflow as runClothingRaster } from '../../clothing-raster-layering/run.ts';
import { steps as personSteps } from '../../raster-layering/steps.ts';
import { steps as clothingSteps } from '../../clothing-raster-layering/steps.ts';
import { seedUpstream } from './upstream-fixture.ts';

test('默认 root 是仓库 .run，独立 skill 使用上一级 .run；--dir 必须绝对，任务不能写进 skill', () => {
  const repository = resolve(workflowsDirectory, '../../..');
  assert.equal(runsDirectory, existsSync(join(repository, 'web/server.ts')) && existsSync(join(repository, 'pnpm-workspace.yaml'))
    ? join(repository, '.run') : resolve(workflowsDirectory, '../.run'));
  assert.equal(defaultRunsDirectory('/tmp/installed/live2d-maker'), '/tmp/installed/.run');
  assert.equal(taskDirectory('sample'), join(runsDirectory, 'sample'));
  for (const parse of [parsePart, parseRaster]) {
    assert.equal(parse(['--name', 'sample', '--dir', '/tmp/custom']).dir, '/tmp/custom');
    assert.throws(() => parse(['--name', 'sample', '--dir', 'relative']), /绝对路径/);
  }
  assert.throws(() => taskDirectory('live2d-maker', resolve(workflowsDirectory, '..')), /skill 之外/);
  assert.throws(() => taskDirectory('sample', workflowsDirectory), /skill 之外/);
  assert.equal(resolveInput('sample', 'source.png', '/tmp/custom'), '/tmp/custom/sample/source.png');
});

test('同名任务可在不同 root 独立准备、读取上游、按 name 续跑并选择 groups', async t => {
  const temporary = await mkdtemp(join(tmpdir(), 'skill-root-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const name = 'same-name';
  for (const label of ['first root', "second'root"]) {
    const dir = join(temporary, label), task = taskDirectory(name, dir);
    await mkdir(task, { recursive: true });
    await sharp({ create: { width: 16, height: 16, channels: 4, background: '#c090a080' } }).png().toFile(join(task, 'ref.png'));
    let personCalls = 0, clothingCalls = 0;
    const person = { async judge() { personCalls++; return { needsSimplification: false }; },
      async judgeStandard() { assert.fail('standard is disabled'); }, async standardize() { assert.fail('standard is disabled'); },
      async simplify() { assert.fail('not needed'); }, async baseSubject(input: string, output: string) { personCalls++; await copyFile(input, output); } };
    const refs = await preparePerson({ runName: name, dir, image: 'ref.png' }, person);
    assert.equal(refs.directory, join(task, 'part-layering/references'));
    await rm(join(task, 'ref.png'));
    assert.deepEqual(await preparePerson({ runName: name, dir }, person), refs);
    assert.deepEqual(await loadPerson(name, dir), refs);
    assert.equal(personCalls, 2);
    const clothing = { async extract(input: string, output: string) {
      clothingCalls++; assert.equal(input, refs.simplifiedSubject); await copyFile(input, output);
    } };
    const clothes = await prepareClothing({ runName: name, dir }, clothing);
    assert.equal(clothes.directory, join(task, 'clothing-part-layering/references'));
    assert.deepEqual(await prepareClothing({ runName: name, dir }, clothing), clothes);
    assert.deepEqual(await loadClothing(name, dir), clothes);
    assert.equal(clothingCalls, 1);
    for (const pipeline of ['part-layering', 'clothing-part-layering']) {
      await assert.rejects(promisify(execFile)(process.execPath, [join(workflowsDirectory, pipeline, 'run.ts'),
        '--name', name, '--dir', dir, '--groups', 'missing-groups.json'], { cwd: temporary }), error => {
        assert.match(String(error), /ENOENT/);
        assert.ok(String(error).includes(join(task, 'missing-groups.json')));
        return true;
      });
    }
  }
});

test('两套 raster 的 --dir 定位上游与续跑 thread，覆盖测试注入 root', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'skill-raster-root-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const [run, input, pipeline, definitions] of [
    [runPersonRaster, 'part-layering', 'raster-layering', personSteps],
    [runClothingRaster, 'clothing-part-layering', 'clothing-raster-layering', clothingSteps],
  ] as const) {
    await seedUpstream('case', input, dir);
    const output = pipelineDirectory('case', pipeline, dir);
    const deps = { runsDirectory: join(dir, 'unused'), steps: [definitions[0]],
      preflight: async (executable: string) => {
        assert.equal(executable, join(dir, 'case/krita')); return { executable, version: 'fixture' };
      } };
    await assert.rejects(run({ name: 'case', dir, krita: 'krita' }, { ...deps, agent: async request => {
      assert.equal(request.directory, output);
      await request.onEvent({ type: 'thread.started', thread_id: 'kept-thread' });
      throw new Error('interrupted fixture');
    } }), /interrupted fixture/);
    await stat(join(output, 'step01/.running'));
    await run({ name: 'case', dir }, { ...deps, agent: async request => {
      assert.equal(request.threadId, 'kept-thread');
      assert.ok(request.prompt.includes(pipelineDirectory('case', input, dir)));
      for (const file of definitions[0].requiredFiles) await writeFile(join(output, 'step01', file), 'fixture');
      return { status: 'completed', summary: 'done' };
    } });
    await stat(join(output, 'step01/.completed'));
    assert.equal(JSON.parse(await readFile(join(output, 'run.json'), 'utf8')).threadId, 'kept-thread');
  }
});

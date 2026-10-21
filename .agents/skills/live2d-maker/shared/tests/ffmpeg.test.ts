import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, type TestContext } from 'node:test';
import sharp from 'sharp';
import { bundledFfmpegCandidates, checkFfmpeg } from '../ffmpeg.ts';
import { loadWorkflowEnvironment } from '../codex/environment.ts';
import { checkKrita } from '../raster/krita.ts';
import { normalizeReference, referenceNeedsGeneration } from '../part/reference-normalization.ts';
import { prepareReferences as prepareCharacter } from '../../part-layering/preparation.ts';
import { prepareReferences as prepareClothing } from '../../clothing-part-layering/preparation.ts';
import { runTask } from '../../workflow/runner.ts';
import { taskStatus } from '../../workflow/state.ts';

const filters = ' .. format V->V\n TS chromakey V->V\n TS colorkey V->V\n TS despill V->V\n';
async function fixture(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), 'layering-dependencies-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const krita = join(directory, 'krita');
  await writeFile(krita, `#!${process.execPath}\nconsole.log('krita 5.3 fixture');\n`);
  await chmod(krita, 0o755);
  return { directory, krita };
}

test('已有 FFmpeg 通过程序与滤镜检查即可复用，不依赖其位置或 Krita 路径', async () => {
  const env = { PATH: 'provided-environment' }, calls: string[] = [];
  const result = await checkFfmpeg({ env, krita: '/not-needed/krita' }, async (command, actualEnv) => {
    calls.push(command); assert.equal(actualEnv, env); return filters;
  });
  assert.deepEqual(result, { executable: 'ffmpeg', source: 'path' });
  assert.deepEqual(calls, ['ffmpeg']);
});

test('命令缺失或缺滤镜时复用给定 Krita 的安装，不搜索其他目录', async t => {
  const f = await fixture(t);
  for (const pathResult of [undefined, ' .. format V->V\n']) {
    const calls: string[] = [];
    const result = await checkFfmpeg({ env: { PATH: '' }, krita: f.krita }, async command => {
      calls.push(command);
      if (command === 'ffmpeg') {
        if (!pathResult) throw new Error('ENOENT');
        return pathResult;
      }
      assert.equal(command, join(f.directory, 'ffmpeg')); return filters;
    });
    assert.equal(result.source, 'krita');
    assert.deepEqual(calls, ['ffmpeg', join(f.directory, 'ffmpeg')]);
  }
  await assert.rejects(checkFfmpeg({}, async () => ' .. format V->V\n'), /chromakey, colorkey, despill/);
});

test('Krita 符号链接按目标安装定位，macOS 仅检查应用包固定位置', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t), link = join(f.directory, 'launchers/krita');
  await mkdir(join(f.directory, 'launchers')); await symlink(f.krita, link);
  assert.deepEqual(await bundledFfmpegCandidates(link), [join(f.directory, 'ffmpeg')]);
  const directory = join(f.directory, 'Krita.app/Contents/MacOS');
  await mkdir(directory, { recursive: true }); await writeFile(join(directory, 'krita'), 'fixture');
  await chmod(join(directory, 'krita'), 0o755);
  assert.deepEqual(await bundledFfmpegCandidates(join(directory, 'krita')), [
    join(directory, 'ffmpeg'), join(directory, 'bin/ffmpeg'), join(directory, '../Resources/bin/ffmpeg'),
  ]);
});

test('.env 的运行环境用于 FFmpeg 后处理和 Krita 预检，不改宿主环境', { skip: process.platform === 'win32' }, async t => {
  const f = await fixture(t);
  const keyed = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#785348' } }).png().toBuffer();
  const executable = join(f.directory, 'ffmpeg');
  await writeFile(executable, `#!${process.execPath}\nimport { writeFileSync } from 'node:fs';
if (process.env.DEPENDENCY_FIXTURE !== 'available') process.exit(7);
if (process.argv.includes('-filters')) console.log(${JSON.stringify(filters)});
else writeFileSync(process.argv.at(-1), Buffer.from(${JSON.stringify(keyed.toString('base64'))}, 'base64'));
`);
  await chmod(executable, 0o755);
  await writeFile(f.krita, `#!${process.execPath}\nif(process.env.DEPENDENCY_FIXTURE !== 'available') process.exit(8); console.log('krita 5.3 fixture');\n`);
  await writeFile(join(f.directory, '.env'), `PATH=${f.directory}\nDEPENDENCY_FIXTURE=available\n`);
  const settings = loadWorkflowEnvironment({}, f.directory), env = settings.codex.env;
  assert.equal((await checkKrita(f.krita, undefined, env)).version, '5.3 fixture');
  const input = join(f.directory, 'input.png'), output = join(f.directory, 'output.png');
  await sharp({ create: { width: 8, height: 8, channels: 4, background: '#00ff00' } }).png().toFile(input);
  const report = await normalizeReference(input, input, output, { env, krita: f.krita });
  assert.equal(report.ffmpeg, 'ffmpeg'); assert.equal(report.keySkipped, false);
  assert.deepEqual(await readFile(output), keyed);
  assert.equal(process.env.DEPENDENCY_FIXTURE, undefined);
});

test('透明图后处理与已完成参考不要求 FFmpeg，缺参考才需要生成前置', async t => {
  const f = await fixture(t), input = join(f.directory, 'transparent.png');
  await sharp({ create: { width: 8, height: 8, channels: 4, background: '#0000' } })
    .composite([{ input: Buffer.from('<svg width="8" height="8"><rect x="2" y="2" width="4" height="4" fill="white"/></svg>') }]).png().toFile(input);
  const output = join(f.directory, 'output.png');
  const report = await normalizeReference(input, input, output, { env: { PATH: '' } });
  assert.equal(report.ffmpeg, null); assert.deepEqual(await readFile(output), await readFile(input));
  for (const [id, names] of [
    ['part-layering', ['base-subject.png', 'judgment.json', 'simplified-subject.jpg']],
    ['clothing-part-layering', ['clothing.png', 'preparation.json']],
  ] as const) {
    const references = join(f.directory, 'case', id, 'references');
    assert.equal(await referenceNeedsGeneration(id, 'case', f.directory), true);
    await mkdir(references, { recursive: true });
    for (const name of names) await writeFile(join(references, name), 'retained');
    assert.equal(await referenceNeedsGeneration(id, 'case', f.directory), false);
    if (id === 'part-layering') {
      await rm(join(references, 'judgment.json'));
      assert.equal(await referenceNeedsGeneration(id, 'case', f.directory), false);
    }
    await rm(join(references, names[0]));
    assert.equal(await referenceNeedsGeneration(id, 'case', f.directory), true);
  }
  assert.equal(await referenceNeedsGeneration('character-assembly', 'case', f.directory), false);
});

test('两套 preparation 在生图前报告缺少 FFmpeg，不调用任何模型步骤', async t => {
  const f = await fixture(t), image = join(f.directory, 'input.png');
  await sharp({ create: { width: 8, height: 8, channels: 4, background: '#0000' } }).png().toFile(image);
  const unexpected = async () => { assert.fail('依赖失败后不能调用模型'); };
  await assert.rejects(prepareCharacter({ runName: 'character', dir: f.directory, image }, {
    judgeStandard: unexpected, standardize: unexpected, judge: unexpected, simplify: unexpected, baseSubject: unexpected,
  }, undefined, { env: { PATH: '' } }), /FFmpeg 检查失败/);
  const references = join(f.directory, 'clothing', 'part-layering/references');
  await mkdir(references, { recursive: true });
  await writeFile(join(references, 'simplified-subject.png'), await readFile(image));
  await writeFile(join(references, 'standard.png'), await readFile(image));
  await assert.rejects(prepareClothing({ runName: 'clothing', dir: f.directory }, { extract: unexpected },
    undefined, { env: { PATH: '' } }), /FFmpeg 检查失败/);
});

test('总入口依赖错误发生在后台 ready 和制作之前，错误状态可查询', async t => {
  const f = await fixture(t), options = { name: 'case', dir: f.directory, from: 'part-layering' as const, to: 'part-layering' as const };
  let started = false, ready = false;
  await assert.rejects(runTask(options, {
    environment: loadWorkflowEnvironment({ PATH: '' }, f.directory),
    ready() { ready = true; }, execute: async () => { started = true; return { summary: 'unexpected' }; },
  }), /FFmpeg 检查失败/);
  assert.equal(started, false); assert.equal(ready, false);
  const status = await taskStatus(options);
  assert.equal(status.status, 'failed'); assert.equal(status.runnerAlive, false);
  assert.match(status.error!, /FFmpeg 检查失败/);
});

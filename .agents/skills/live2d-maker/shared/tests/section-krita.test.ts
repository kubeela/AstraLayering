import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SectionKrita, kritaLimit, readKritaRecord } from '../krita/section-krita.ts';
import { createKritaTool } from '../krita/tool.ts';

// Speaks the bridge protocol without Krita: a job whose source is "crash"
// kills the process; any other job returns its source as the result.
const fakeKrita = `#!/usr/bin/env node
const { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const root = process.env.ASTRA_KRITA_BRIDGE, jobs = join(root, 'jobs');
mkdirSync(jobs, { recursive: true });
writeFileSync(root + '/ready.json.tmp', JSON.stringify({ protocol: 1, pid: process.pid, version: '0.fake', jobs }));
renameSync(root + '/ready.json.tmp', root + '/ready.json');
setInterval(() => {
  if (existsSync(join(root, 'quit'))) process.exit(0);
  for (const name of readdirSync(jobs).filter(name => name.endsWith('.py'))) {
    const source = readFileSync(join(jobs, name), 'utf8').trim();
    if (source === 'crash') process.exit(3);
    renameSync(join(jobs, name), join(jobs, name + '.done'));
    writeFileSync(join(jobs, name.slice(0, -3) + '.json'), JSON.stringify({ ok: true, result: source, hints: [], dialogs: [] }));
  }
}, 20);
`;

const exists = (path: string) => stat(path).then(() => true, () => false);
const parse = (result: { contentItems: { type: string; text?: string }[] }) => JSON.parse(result.contentItems[0]!.text!);

test('section Krita: lazy start through the tool, crash and restart, release on section end', async t => {
  const root = await mkdtemp(join(tmpdir(), 'section-krita-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const krita = join(root, 'krita');
  await writeFile(krita, fakeKrita); await chmod(krita, 0o755);
  const record = join(root, 'krita.json');
  const section = new SectionKrita({ section: root, krita, record, env: { ...process.env, DISPLAY: ':fixture' }, slotsDirectory: join(root, 'slots') });
  t.after(() => section.release());
  const tool = createKritaTool(section, root), signal = new AbortController().signal;

  // Without the section's slot nothing can start; with it, nothing starts yet.
  await assert.rejects(tool.execute({ action: 'start' }, signal), /名额/);
  await section.reserve();
  assert.equal(section.reserved, true);
  assert.equal(parse(await tool.execute({}, signal)).state, 'stopped');
  assert.equal(await exists(record), false);

  await writeFile(join(root, 'ok.py'), 'hello');
  const first = await tool.execute({ action: 'run', script: 'ok.py' }, signal);
  assert.equal(first.success, true);
  assert.equal(parse(first).result, 'hello');
  const running = parse(await tool.execute({ action: 'status' }, signal));
  assert.equal(running.state, 'running');
  assert.equal(running.version, '0.fake');
  assert.equal((await readKritaRecord(record))?.pid, running.pid);
  const profile = join(running.bridge, '..');

  // A script that kills Krita: the agent learns it and restarts it itself.
  await writeFile(join(root, 'crash.py'), 'crash');
  await assert.rejects(tool.execute({ action: 'run', script: 'crash.py' }, signal), /restart/);
  const crashed = parse(await tool.execute({}, signal));
  assert.equal(crashed.state, 'crashed');
  assert.equal(crashed.lastExit.code, 3);
  assert.equal(await exists(record), false);
  assert.equal(await exists(profile), false);
  const restarted = parse(await tool.execute({ action: 'restart' }, signal));
  assert.equal(restarted.state, 'running');
  assert.equal(restarted.restarts, 1);
  assert.notEqual(restarted.pid, running.pid);

  // The section ends: Krita, its profile and its record go away.
  await section.release();
  assert.equal(section.status().state, 'stopped');
  assert.throws(() => process.kill(restarted.pid, 0));
  assert.equal(await exists(record), false);
  assert.equal(await exists(join(restarted.bridge, '..')), false);
  await assert.rejects(tool.execute({ action: 'start' }, signal), /已结束/);
});

test('section Krita: machine-wide cap queues sections until a slot is free', async t => {
  const root = await mkdtemp(join(tmpdir(), 'section-krita-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const krita = join(root, 'krita'), slots = join(root, 'slots');
  await writeFile(krita, fakeKrita); await chmod(krita, 0o755);
  // A slot left by a process that died is reclaimed.
  await mkdir(slots);
  await writeFile(join(slots, '0.lock'), '999999999');
  const env = { ...process.env, DISPLAY: ':fixture', layering_krita_max_instances: '1' };
  const first = new SectionKrita({ section: 'a', krita, env, slotsDirectory: slots });
  const second = new SectionKrita({ section: 'b', krita, env, slotsDirectory: slots });
  t.after(() => Promise.all([first.release(), second.release()]));
  await first.reserve();
  // The slot belongs to the section: a restart keeps it.
  assert.equal((await first.start()).state, 'running');
  assert.equal((await first.restart()).state, 'running');

  const messages: string[] = [];
  const queued = second.reserve(undefined, message => messages.push(message));
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.equal(second.reserved, false);
  assert.match(second.status().waiting ?? '', /layering_krita_max_instances/);
  assert.equal(messages.length, 1);
  await first.release();
  await queued;
  assert.equal(second.reserved, true);
  assert.equal(second.status().waiting, undefined);
  assert.equal((await second.start()).state, 'running');

  // A section that ends while queued gives up its place.
  const third = new SectionKrita({ section: 'c', krita, env, slotsDirectory: slots });
  const abandoned = third.reserve();
  await new Promise(resolve => setTimeout(resolve, 100));
  await third.release();
  await assert.rejects(abandoned, /已结束/);

  assert.throws(() => kritaLimit({ layering_krita_max_instances: '0' }), /正整数/);
  assert.throws(() => kritaLimit({ layering_krita_max_instances: '2.5' }), /正整数/);
  assert.equal(kritaLimit({ layering_krita_max_instances: ' 3 ' }), 3);
  // The default comes from example.env.
  assert.equal(kritaLimit({}), 4);
});

test('krita tool: argument errors', async () => {
  const tool = createKritaTool(new SectionKrita({ section: '/fixture', krita: '/fixture/krita' }), '/fixture');
  const signal = new AbortController().signal;
  await assert.rejects(tool.execute({ action: 'paint' }, signal), /action/);
  await assert.rejects(tool.execute({ action: 'run' }, signal), /script/);
  await assert.rejects(tool.execute({ action: 'run', script: 'a.py', timeout_seconds: 0 }, signal), /timeout_seconds/);
});

// The bridge plugin inside a real Krita: ASTRA_TEST_KRITA=<krita executable>.
test('bridge plugin in real Krita: dismisses export dialogs and hints', { skip: !process.env.ASTRA_TEST_KRITA && 'ASTRA_TEST_KRITA 未设置' }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'section-krita-real-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const section = new SectionKrita({ section: root, krita: process.env.ASTRA_TEST_KRITA!, slotsDirectory: join(root, 'slots') });
  t.after(() => section.release());
  await section.reserve();
  const tool = createKritaTool(section, root), signal = new AbortController().signal;
  const png = join(root, 'out.png'), fresh = join(root, 'fresh.png'), reopened = join(root, 'reopened.png');
  // New and opened documents export without any setup by the script.
  await writeFile(join(root, 'fresh.py'), `doc = Krita.instance().createDocument(64, 64, 'f', 'RGBA', 'U8', '', 72.0)
doc.exportImage(${JSON.stringify(fresh)}, krita.InfoObject())
doc.close()
doc = Krita.instance().openDocument(${JSON.stringify(fresh)})
doc.waitForDone()
doc.exportImage(${JSON.stringify(reopened)}, krita.InfoObject())
result = doc.rootNode() is not None
`);
  const exported = parse(await tool.execute({ action: 'run', script: 'fresh.py', timeout_seconds: 120 }, signal));
  assert.deepEqual([exported.ok, exported.result, exported.dialogs], [true, true, []]);
  await stat(fresh); await stat(reopened);
  // Leaving batch mode opens Krita's PNG options dialog on export.
  await writeFile(join(root, 'dialog.py'), `doc = Krita.instance().createDocument(64, 64, 'd', 'RGBA', 'U8', '', 72.0)\ndoc.setBatchmode(False)\nKrita.instance().setBatchmode(False)\ndoc.exportImage(${JSON.stringify(png)}, krita.InfoObject())\n`);
  const blocked = parse(await tool.execute({ action: 'run', script: 'dialog.py', timeout_seconds: 120 }, signal));
  assert.equal(blocked.ok, false);
  assert.ok(blocked.dialogs.length > 0);
  assert.match(blocked.hints.join('\n'), /setBatchmode/);
  // Krita sometimes crashes tearing down the cancelled export (about one run
  // in five); start the rest from a fresh one.
  assert.equal(parse(await tool.execute({ action: 'restart' }, signal)).state, 'running');
  await writeFile(join(root, 'none.py'), `missing = None\nmissing.name()\n`);
  const failed = parse(await tool.execute({ action: 'run', script: 'none.py' }, signal));
  assert.equal(failed.ok, false);
  assert.match(failed.hints.join('\n'), /None/);
  // A script that crashes Krita (simulated segfault): the agent restarts it itself.
  await writeFile(join(root, 'crash.py'), `import os, signal\nos.kill(os.getpid(), signal.SIGSEGV)\n`);
  await assert.rejects(tool.execute({ action: 'run', script: 'crash.py', timeout_seconds: 120 }, signal), /restart/);
  assert.equal(section.status().state, 'crashed');
  assert.equal(parse(await tool.execute({ action: 'restart' }, signal)).state, 'running');
  await writeFile(join(root, 'ok.py'), `result = Krita.instance().version()\n`);
  const ok = parse(await tool.execute({ action: 'run', script: 'ok.py' }, signal));
  assert.equal(ok.ok, true);
});

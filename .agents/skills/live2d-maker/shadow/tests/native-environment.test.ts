import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('headless shadow starts Xvfb from the supplied environment, without a desktop or system Xvfb', { skip: process.platform !== 'linux' }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'shadow-env-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = join(root, 'bin'), output = join(root, 'output'), marker = join(root, 'display-env'), krita = join(bin, 'krita');
  await mkdir(bin); await mkdir(output);
  await writeFile(join(bin, 'Xvfb'), `#!/bin/sh\nprintf '%s' "$LAYERING_DISPLAY_FIXTURE" > '${marker}'\nprintf '91\\n'\nexec /bin/sleep 30\n`, { mode: 0o700 });
  await writeFile(krita, `#!${process.execPath}
const fs=require('node:fs'),path=require('node:path');
const job=JSON.parse(fs.readFileSync(process.env.ASTRA_SHADOW_JOB,'utf8'));
fs.writeFileSync(path.join(job.output,'result.json'),JSON.stringify({success:true,width:1,height:1,nativeVersion:'fixture',relations:[]}));\n`, { mode: 0o700 });
  const runner = `import {inspectNative} from ${JSON.stringify(new URL('../native.ts', import.meta.url).href)};
const env={...process.env,PATH:${JSON.stringify(bin)},LAYERING_DISPLAY_FIXTURE:'passed'};
delete env.DISPLAY;delete env.ASTRA_STUDIO_XVFB;
const result=await inspectNative('/fixture.kra',[],${JSON.stringify(output)},${JSON.stringify(krita)},env);
console.log(JSON.stringify(result));`;
  const result = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', runner],
    { env: { ...process.env, PATH: join(root, 'absent'), DISPLAY: '' }, timeout: 10_000 });
  assert.equal(JSON.parse(result.stdout).success, true);
  assert.equal(await readFile(marker, 'utf8'), 'passed');
});

// Preload: wrap node:test so captures know the running test, and register a
// source loader that routes agent.run/session.run task objects through __capRun.
import { register, syncBuiltinESMExports, createRequire } from 'node:module';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const nodeTest = require('node:test');
const wrap = orig => function (name, options, fn) {
  const args = [...arguments];
  const i = args.findIndex(a => typeof a === 'function');
  if (i >= 0) { const f = args[i]; args[i] = function (t, ...rest) { globalThis.__capTest = t?.fullName ?? String(name); return f.call(this, t, ...rest); }; }
  return orig.apply(this, args);
};
for (const key of ['test', 'it']) { const o = nodeTest[key]; const w = wrap(o); Object.assign(w, o); for (const k of ['skip','todo','only']) if (o[k]) w[k] = wrap(o[k]); nodeTest[key] = w; }
nodeTest.default = nodeTest.test;
syncBuiltinESMExports();
const dir = process.env.CAPTURE_DIR;
mkdirSync(dir, { recursive: true });
const file = join(dir, `${process.pid}.jsonl`);
const counters = new Map();
const pick = t => !t || typeof t !== 'object' ? t : ({ step: t.step, name: t.name, prompt: t.prompt, recoveryPrompt: t.recoveryPrompt,
  images: t.images?.map(i => ({ description: i.description, path: i.path })),
  tools: t.tools?.map(x => ({ name: x.name, description: x.description })) });
globalThis.__capRecord = (site, data) => {
  const test = (process.env.CAPTURE_FILE ?? '') + ' :: ' + (globalThis.__capTest ?? '?');
  const n = (counters.get(test) ?? 0) + 1; counters.set(test, n);
  appendFileSync(file, JSON.stringify({ test, n, site, data }) + '\n');
};
globalThis.__capRun = (obj, task, ...rest) => { globalThis.__capRecord('run', pick(task)); return obj.run(task, ...rest); };
const pickReq = r => ({ step: r.step, prompt: r.prompt, recoveryPrompt: r.recoveryPrompt, threadId: r.threadId ? 'THREAD' : undefined,
  tools: r.tools?.map(x => ({ name: x.name, description: x.description })) });
globalThis.__capCall = (fn, request, ...rest) => { globalThis.__capRecord('raster', pickReq(request)); return fn(request, ...rest); };
register('./loader.mjs', import.meta.url);

// Read-only source study and deterministic neutral/impulse measurements.
// Does not run third-party runtimes or evaluate the artistic quality of a model.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { ClothBody, bindingDefaults, physicsVersion } from '../../../web/studio/physics-model.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const originals = [
  'tutorial/live2d-guidance/model-originals/milly/MillyRuntime/Milly.physics3.json',
  'tutorial/live2d-guidance/model-originals/lier/修女莉尔免费版.physics3.json',
  'tutorial/live2d-guidance/model-originals/cherry-cake-angel/A樱桃蛋糕天使免费版.physics3.json',
];
const models = [];
for (const path of originals) {
  const bytes = await readFile(resolve(root, path)), source = JSON.parse(bytes);
  const names = new Map((source.Meta.PhysicsDictionary || []).map(x => [x.Id, x.Name]));
  const settings = source.PhysicsSettings;
  models.push({ path, sha256: sha(bytes), fps: source.Meta.Fps, rigCount: settings.length,
    particleCountsIncludingRoot: [...new Set(settings.map(x => x.Vertices.length))].sort((a, b) => a - b),
    hairExamples: settings.filter(x => /发|髪|hair/i.test(names.get(x.Id) || '')).slice(0, 4)
      .map(x => ({ id: x.Id, name: names.get(x.Id), inputs: x.Input, outputs: x.Output, vertices: x.Vertices })) });
}
const responses = [];
for (const kind of ['ribbon', 'cloth']) for (const preset of ['default', 'existing-example']) {
  const config = { ...bindingDefaults(kind), enabled: true,
    ...(preset === 'existing-example' ? { fixed: .12, transition: .16, maxAngle: 32, maxTravel: .26,
      stiffness: 1.8, damping: 1.4 } : {}) };
  const body = new ClothBody({ x: 0, y: 0, width: 150, height: 650 }, config);
  const mid = Math.floor((body.rows - 1) * .62) * body.cols + Math.floor(body.cols / 2);
  const tip = (body.rows - 1) * body.cols + Math.floor(body.cols / 2);
  // The same free-length-normalized tip pulse as the workbench audition.
  body.impulse(75, 640, body.freeLength * 1.5, 0, body.freeLength * .8);
  const peaks = { middle: { pixels: 0, seconds: 0 }, tip: { pixels: 0, seconds: 0 } }, curve = [];
  let limitedSteps = 0, invalidSteps = 0, rootMaxPixels = 0;
  for (let step = 0; step < 960; step++) {
    body.step(); const seconds = (step + 1) / 120;
    const middle = body.positions[mid * 2] - body.rest[mid * 2], tail = body.positions[tip * 2] - body.rest[tip * 2];
    for (const [name, value] of [['middle', middle], ['tip', tail]])
      if (Math.abs(value) > peaks[name].pixels) peaks[name] = { pixels: Math.abs(value), seconds };
    limitedSteps += Number(body.stats.limited); invalidSteps += Number(!body.inspect().valid);
    for (let i = 0; i < body.weights.length; i++) if (!body.weights[i])
      rootMaxPixels = Math.max(rootMaxPixels, Math.hypot(body.positions[i * 2] - body.rest[i * 2], body.positions[i * 2 + 1] - body.rest[i * 2 + 1]));
    if (step % 4 === 0) curve.push({ seconds, middle, tip: tail });
  }
  responses.push({ kind, preset, binding: config, size: [150, 650], maxDistance: body.maxDistance,
    peaks, limitedSteps, invalidSteps, rootMaxPixels, finalTravel: body.stats.travel, curve });
}
const report = { version: 1,
  method: 'Static physics3 inspection; 120 Hz, 8 s synthetic tip impulse. No rendered-model or aesthetic acceptance implied.',
  solver: physicsVersion, solverSha256: sha(await readFile(resolve(root, 'web/studio/physics-model.js'))), models, responses };
if (process.argv[2]) {
  const output = resolve(process.argv[2]); await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: process.argv[2], models: models.length,
    responses: responses.map(({ kind, preset, peaks, invalidSteps, rootMaxPixels }) => ({ kind, preset, peaks, invalidSteps, rootMaxPixels })) }));
} else console.log(JSON.stringify(report, null, 2));

// Research only: read a locally supplied official Core and moc3. No downloads or image export.
// node probe_shadow_masks.mjs <core.js> <model.moc3> --drawable ArtMesh119 --param ParamXBody7
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const [corePath, modelPath, ...options] = process.argv.slice(2);
if (!corePath || !modelPath || options.length % 2) throw new Error('Provide core.js, model.moc3, and option/value pairs');
const selected = [], parameters = [];
for (let i = 0; i < options.length; i += 2) {
  if (options[i] === '--drawable') selected.push(options[i + 1]);
  else if (options[i] === '--param') parameters.push(options[i + 1]);
  else throw new Error('Unknown option: ' + options[i]);
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const coreBytes = readFileSync(corePath), modelBytes = readFileSync(modelPath);
const context = { console: { ...console, log: (...args) => console.error(...args) },
  require: createRequire(import.meta.url), process, Buffer, __dirname: process.cwd(),
  __filename: corePath, setTimeout, clearTimeout, WebAssembly };
vm.createContext(context); vm.runInContext(coreBytes.toString(), context, { filename: 'supplied-core.js' });
// Core 5.1 initializes its embedded WebAssembly asynchronously.
await new Promise(resolve => setTimeout(resolve, 500));
const core = context.Live2DCubismCore;
const version = core.Version.csmGetVersion();
const moc = core.Moc.fromArrayBuffer(modelBytes.buffer.slice(modelBytes.byteOffset, modelBytes.byteOffset + modelBytes.byteLength));
if (!moc) throw new Error('Core cannot load this moc3');
const model = core.Model.fromMoc(moc);
if (!model) { moc._release(); throw new Error('Core cannot initialize this model'); }
try {
  const d = model.drawables, p = model.parameters;
  p.values.set(p.defaultValues); model.update();
  const base = d.vertexPositions.map(vertices => Float32Array.from(vertices));
  const drawables = d.ids.flatMap((id, i) => d.maskCounts[i] && (!selected.length || selected.includes(id)) ? [{
    id, index: i, part: model.parts.ids[d.parentPartIndices[i]],
    maskIds: Array.from(d.masks[i], index => d.ids[index]), vertexCount: d.vertexCounts[i],
    opacity: d.opacities[i], multiply: core.Utils.hasBlendMultiplicativeBit(d.constantFlags[i]),
    inverted: core.Utils.hasIsInvertedMaskBit(d.constantFlags[i]), responses: [],
  }] : []);
  for (const id of selected) if (!drawables.some(x => x.id === id)) throw new Error('No masked drawable: ' + id);
  const delta = index => {
    let max = 0; const v = d.vertexPositions[index];
    for (let j = 0; j < v.length; j += 2) max = Math.max(max, Math.hypot(v[j] - base[index][j], v[j + 1] - base[index][j + 1]));
    return Number(max.toFixed(6));
  };
  for (const id of parameters) {
    const k = p.ids.indexOf(id); if (k < 0) throw new Error('No parameter: ' + id);
    for (const value of [p.minimumValues[k], p.maximumValues[k]]) {
      p.values.set(p.defaultValues); p.values[k] = value; model.update();
      for (const x of drawables) x.responses.push({ parameter: id, value,
        maxVertexDisplacement: delta(x.index), maskDisplacements: Array.from(d.masks[x.index], i => ({
          id: d.ids[i], maxVertexDisplacement: delta(i),
        })) });
    }
  }
  console.log(JSON.stringify({ coreVersion: version, coreSha256: hash(coreBytes), modelSha256: hash(modelBytes),
    drawableCount: d.count, parameterCount: p.count, maskedDrawableCount: d.maskCounts.filter(x => x > 0).length,
    drawables, definition: 'Each parameter sampled independently at its endpoints; others reset to author defaults. '
      + 'Vertex displacement in model units. No physics, motion, renderer or deformer-tree inspection.' }, null, 2));
} finally { model.release(); moc._release(); }

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const geometry = require('../preview/svg-geometry.js');
const source = require('./svg-source.cjs');

test('standalone geometry expands source commands and subdivides cubic/closing segments', () => {
  const relative = 'm1 2 3 4 h5 v-2 q1 2 3 4 t4 6 c1 2 3 4 5 6 s7 8 9 10 z';
  assert.equal(geometry.normalizePath(relative, 1), 'M 1 2 L 4 6 L 9 6 L 9 4 Q 10 6 12 8 Q 14 10 16 14 C 17 16 19 18 21 20 C 23 22 28 28 30 30 Z');
  const split = geometry.normalizePath('M0 0C0 4 4 4 4 0Z', 2);
  assert.equal(split, 'M 0 0 C 0 2 1 3 2 3 C 3 3 4 2 4 0 L 2 0 Z');
  assert.deepEqual(geometry.pathData(split), {
    commands: ['M', 'C', 'C', 'L', 'Z'],
    values: [0, 0, 0, 2, 1, 3, 2, 3, 3, 3, 4, 2, 4, 0, 2, 0],
    ends: [2, 8, 14, 16, 16],
  });
  assert.throws(() => geometry.normalizePath('M0 0 A2 2 0 0 0 3 3'), /convert arcs to cubic/);
  assert.throws(() => geometry.pathData('M 0 0 3 3'), /路径命令必须显式写出/);
});

test('inspection reads original bytes and composes nested transforms without rewriting source', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-svg-source-'));
  const file = path.join(directory, 'source.svg'), output = path.join(directory, 'inventory.json');
  const bytes = Buffer.from('\uFEFF<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\r\n  <!-- source spacing and BOM must survive inspection -->\r\n  <g id="parent" transform="translate(10 20) rotate(90)"><path id="curve" transform="scale(2 3) translate(1 2)" d="m1 2 3 4 h5 v-2 z"/></g>\r\n</svg>\r\n');
  fs.writeFileSync(file, bytes);
  try {
    const result = await source.inspect({svg: file, out: output});
    const inventory = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.equal(result.source_sha256, source.sha(bytes));
    assert.equal(inventory.source_sha256, source.sha(bytes));
    assert.deepEqual(fs.readFileSync(file), bytes);
    const curve = inventory.nodes.find(node => node.id === 'curve');
    assert.equal(curve.d, 'm1 2 3 4 h5 v-2 z');
    assert.equal(curve.transform, 'scale(2 3) translate(1 2)');
    assert.equal(inventory.nodes.find(node => node.id === 'parent').transform, 'translate(10 20) rotate(90)');
    const expected = [0, 2, -3, 0, 4, 22];
    curve.matrix.forEach((value, index) => assert(Math.abs(value - expected[index]) < 1e-10));
    assert(fs.statSync(path.join(directory, 'baseline.png')).size > 0);
    await assert.rejects(source.inspect({svg: file, out: file}), /Output must not overwrite source/);
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
});

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const runtime = 'C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp = require(runtime + '/sharp');
const { chromium } = require(runtime + '/playwright');
const root = process.cwd();
const out = path.join(root, 'reviews/refinement/mouth/line-art/evidence-v1');
const candidatePath = path.join(root, 'reviews/refinement/mouth/line-art/candidates/character-v1.svg');
const baselinePath = path.join(root, 'refinement/groups/eyes/6.镜像组装与成稿审查/character.svg');
const planPath = path.join(root, 'refinement/groups/mouth/1.制作计划/plan.json');
const refPath = path.join(root, 'references/base-subject.png');
const candidate = fs.readFileSync(candidatePath, 'utf8');
const baseline = fs.readFileSync(baselinePath, 'utf8');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage();
  const extracted = await page.evaluate(({ candidate, baseline }) => {
    const ns = 'http://www.w3.org/2000/svg';
    const parse = s => new DOMParser().parseFromString(s, 'image/svg+xml');
    const ser = e => new XMLSerializer().serializeToString(e);
    const doc = parse(candidate), old = parse(baseline);
    if (doc.querySelector('parsererror') || old.querySelector('parsererror')) throw Error('XML parse error');
    const ids = Array.from(doc.querySelectorAll('[id]')).map(e => e.id);
    const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    const known = new Set(ids), refs = [];
    for (const e of doc.querySelectorAll('*')) for (const a of e.attributes) {
      for (const m of a.value.matchAll(/url\(#([^)]*)\)/g)) refs.push({ from: e.id, to: m[1] });
      if (a.localName === 'href' && a.value.startsWith('#')) refs.push({ from: e.id, to: a.value.slice(1) });
      if (a.name === 'data-follows-id') refs.push({ from: e.id, to: a.value });
    }
    const top = d => Array.from(d.documentElement.children).filter(e => e.id !== 'mouth').map(ser);
    const oldTop = top(old), newTop = top(doc);
    const mouth = doc.getElementById('mouth');
    const controls = Array.from(mouth.querySelectorAll('g')).map(e => ({ id: e.id, parent: e.parentElement.id, part: e.getAttribute('data-part'), kind: e.getAttribute('data-kind'), role: e.getAttribute('data-role'), follows: e.getAttribute('data-follows-id'), clip: e.getAttribute('clip-path'), display: e.getAttribute('display') }));
    const forms = ['mouth_inside_complete_shape', 'mouth_teeth_upper_complete_shape', 'mouth_tongue_complete_shape', 'mouth_upper_skin_shape', 'mouth_lower_skin_shape', 'mouth_upper_line_shape', 'mouth_lower_line_shape'].map(id => ({ id, d: doc.getElementById(id).getAttribute('d') }));
    const setCrop = (d, box, scale) => { const r = d.documentElement; r.setAttribute('viewBox', box.join(' ')); r.setAttribute('width', box[2] * scale); r.setAttribute('height', box[3] * scale); return ser(d); };
    const mouthBox = [421, 232, 47, 25];
    const variants = {};
    const fullVariant = (name, modifications = () => {}, box = mouthBox, scale = 24, source = candidate) => { const d = parse(source); modifications(d); variants[name] = setCrop(d, box, scale); };
    fullVariant('candidate-direct-24x');
    fullVariant('baseline-direct-24x', undefined, mouthBox, 24, baseline);
    fullVariant('candidate-context-12x', undefined, [414, 215, 62, 58], 12);
    fullVariant('candidate-face-1x', undefined, [388, 164, 113, 110], 1);
    fullVariant('baseline-face-1x', undefined, [388, 164, 113, 110], 1, baseline);
    fullVariant('default-1x', undefined, mouthBox, 1);
    fullVariant('no-internal-24x', d => d.getElementById('mouth_internal_visibility').setAttribute('display', 'none'));
    fullVariant('no-internal-1x', d => d.getElementById('mouth_internal_visibility').setAttribute('display', 'none'), mouthBox, 1);
    fullVariant('covers-only-hiding-24x', d => d.getElementById('mouth_internal_visibility').removeAttribute('clip-path'));
    fullVariant('mouth-hidden-context', d => d.getElementById('mouth').setAttribute('display', 'none'), [414, 215, 62, 58], 12);
    fullVariant('guides-removed-24x', d => d.getElementById('mouth_construction_guides').remove());
    const isolate = (name, nodeIds, modify = () => {}) => {
      const d = document.implementation.createDocument(ns, 'svg');
      for (const def of doc.querySelectorAll('defs')) d.documentElement.appendChild(d.importNode(def, true));
      for (const id of nodeIds) d.documentElement.appendChild(d.importNode(doc.getElementById(id), true));
      modify(d);
      variants[name] = setCrop(d, mouthBox, 24);
    };
    isolate('complete-interior', ['mouth_internal_visibility'], d => d.getElementById('mouth_internal_visibility').removeAttribute('clip-path'));
    isolate('complete-inside', ['mouth_inside']);
    isolate('complete-teeth', ['mouth_teeth_upper']);
    isolate('complete-tongue', ['mouth_tongue']);
    isolate('upper-control', ['mouth_upper']);
    isolate('lower-control', ['mouth_lower'], d => d.getElementById('mouth_lower_formal_line').removeAttribute('display'));
    isolate('skin-covers', ['mouth_lower_skin_cover', 'mouth_upper_skin_cover']);
    return { audit: { duplicateIds, missingReferences: refs.filter(r => !known.has(r.to)), nonMouthTopLevelEqual: JSON.stringify(oldTop) === JSON.stringify(newTop), oldTopLevelCount: oldTop.length, newTopLevelCount: newTop.length, controls, forms, mouthDefaultPose: mouth.getAttribute('data-default-pose'), guideDisplay: doc.getElementById('mouth_construction_guides').getAttribute('display') }, variants };
  }, { candidate, baseline });
  await browser.close();
  const raw = {};
  for (const [name, svg] of Object.entries(extracted.variants)) {
    fs.writeFileSync(path.join(out, name + '.svg'), svg);
    await sharp(Buffer.from(svg)).png().toFile(path.join(out, name + '.png'));
    raw[name] = await sharp(path.join(out, name + '.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  }
  const compare = (a, b) => {
    const x = raw[a], y = raw[b];
    if (JSON.stringify(x.info) !== JSON.stringify(y.info)) throw Error('Size mismatch');
    let changedPixels = 0, maxChannelDelta = 0;
    for (let i = 0; i < x.data.length; i += 4) {
      let changed = false;
      for (let k = 0; k < 4; k++) { const delta = Math.abs(x.data[i + k] - y.data[i + k]); maxChannelDelta = Math.max(maxChannelDelta, delta); if (delta) changed = true; }
      if (changed) changedPixels++;
    }
    return { a, b, changedPixels, maxChannelDelta };
  };
  const area = name => {
    const { data, info } = raw[name]; let alphaSum = 0, fullyOpaquePixels = 0, minX = info.width, minY = info.height, maxX = -1, maxY = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const a = data[(y * info.width + x) * 4 + 3]; alphaSum += a / 255; if (a === 255) fullyOpaquePixels++; if (a > 127) { minX = Math.min(x, minX); minY = Math.min(y, minY); maxX = Math.max(x, maxX); maxY = Math.max(y, maxY); } }
    return { name, opaqueEquivalentAreaCanvasPixels: alphaSum / 576, fullyOpaquePixels, alphaHalfBoundingBoxCanvas: { x: 421 + minX / 24, y: 232 + minY / 24, width: (maxX - minX + 1) / 24, height: (maxY - minY + 1) / 24 } };
  };
  const checks = [compare('candidate-direct-24x', 'no-internal-24x'), compare('covers-only-hiding-24x', 'no-internal-24x'), compare('default-1x', 'no-internal-1x'), compare('candidate-direct-24x', 'guides-removed-24x')];
  const bodies = ['complete-inside', 'complete-teeth', 'complete-tongue'].map(area);
  await sharp(refPath).extract({ left: 421, top: 232, width: 47, height: 25 }).resize(1128, 600, { kernel: 'cubic' }).png().toFile(path.join(out, 'reference-same-coordinate-24x.png'));
  await sharp(refPath).extract({ left: 414, top: 215, width: 62, height: 58 }).resize(744, 696, { kernel: 'cubic' }).png().toFile(path.join(out, 'reference-context-12x.png'));
  await sharp(refPath).extract({ left: 388, top: 164, width: 113, height: 110 }).png().toFile(path.join(out, 'reference-face-1x.png'));
  const lineMeta = await sharp(path.join(root, 'references/line-art.png')).metadata();
  await sharp(path.join(root, 'references/line-art.png')).extract({ left: 421, top: 232, width: 47, height: 25 }).resize(1128, 600, { kernel: 'cubic' }).png().toFile(path.join(out, 'line-reference-same-coordinate-24x.png'));
  const contact = ['reference-same-coordinate-24x', 'baseline-direct-24x', 'candidate-direct-24x'];
  const tiles = await Promise.all(contact.map(async (n, i) => ({ input: await sharp(path.join(out, n + '.png')).resize(564, 300).flatten({ background: '#fff' }).png().toBuffer(), left: i * 564, top: 32 })));
  const labels = Buffer.from('<svg width="1692" height="32"><rect width="1692" height="32" fill="white"/><g font-family="Arial" font-size="18" fill="#333"><text x="12" y="23">Original: same coordinates</text><text x="576" y="23">Baseline</text><text x="1140" y="23">Frozen candidate v1: direct render</text></g></svg>');
  await sharp({ create: { width: 1692, height: 332, channels: 4, background: '#fff' } }).composite([{ input: labels, left: 0, top: 0 }, ...tiles]).png().toFile(path.join(out, 'independent-comparison.png'));
  const result = { candidatePath, candidateSha256: hash(candidatePath), baselinePath, baselineSha256: hash(baselinePath), planPath, planSha256: hash(planPath), referenceSha256: hash(refPath), renderer: 'sharp ' + sharp.versions.sharp + ', librsvg ' + sharp.versions.rsvg, sourceCanvas: [941, 1672], mouthViewBox: [421, 232, 47, 25], independentDirectScale: 24, lineReferenceSize: [lineMeta.width, lineMeta.height], ...extracted.audit, renderChecks: checks, completeBodies: bodies };
  fs.writeFileSync(path.join(out, 'independent-audit.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ candidateSha256: result.candidateSha256, nonMouthTopLevelEqual: result.nonMouthTopLevelEqual, duplicateIds: result.duplicateIds, missingReferences: result.missingReferences, renderChecks: checks, completeBodies: bodies }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });

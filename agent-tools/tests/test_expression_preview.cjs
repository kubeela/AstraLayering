/* Browser integration tests: node agent-tools/tests/test_expression_preview.cjs [browser path] [optional character SVG]. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const os = require('node:os');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const preview = path.join(root, 'preview');
const fixture = path.join(root, 'expressions/examples');
const rig = JSON.parse(fs.readFileSync(path.join(fixture, 'controls.example.json'), 'utf8'));
const svg = fs.readFileSync(path.join(fixture, 'contract-fixture.svg'), 'utf8');
const output = process.env.EXPRESSION_TEST_OUTPUT || path.join(os.tmpdir(), 'astra-expression-preview-tests');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const bundle = {}; vm.runInNewContext(fs.readFileSync(path.join(preview, 'expression-schema.js'), 'utf8'), bundle);
  assert.equal(JSON.stringify(bundle.AstraExpressionSchema), JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'expressions/expression.schema.json'), 'utf8'))), 'schema bundle drift');
  const browser = await chromium.launch({ executablePath: process.argv[2] || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, offline: true });
    const page = await context.newPage(), errors = [], network = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (/^https?:/.test(r.url())) network.push(r.url()); });
    await page.goto(pathToFileURL(path.join(preview, 'expression-preview.html')).href);
    await page.click('#demo'); await page.waitForFunction(() => document.querySelector('#character').textContent === 'contract_demo');
    const view = page.frames().find(f => f.url().includes('svg-preview.html'));
    const unit = await view.evaluate(({ svg, rig }) => {
      const results = [], close = (a, b, name) => { if (Math.abs(a - b) > 1e-6) throw Error(name + ': ' + a + ' != ' + b); };
      const ok = (condition, name) => { if (!condition) throw Error(name); };
      const fails = fn => { let failed = false; try { fn(); } catch { failed = true; } ok(failed, 'expected rejection'); };
      let r, root;
      function fresh(edit) {
        if (root) root.remove(); const data = structuredClone(rig); if (edit) edit(data);
        root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement; root = document.importNode(root, true);
        root.style.cssText = 'position:absolute;left:-1000px;width:120px;height:120px;opacity:0'; document.body.append(root);
        r = new AstraExpression.Runtime(root, data); return r;
      }
      const node = id => root.querySelector('[id="' + id + '"]');
      const cmd = (...actions) => r.command({ schema_version: '0.1.0', document_type: 'command', character_id: 'contract_demo', actions });
      const set = values => cmd({ op: 'set_parameters', values, transition_s: 0 });
      const play = (animation, instance_id = animation, weight = 1) => cmd({ op: 'play_animation', animation, instance_id, weight, speed: 1 });
      const apply = (expression, instance_id = expression, weight = 1) => cmd({ op: 'apply_expression', expression, instance_id, weight });
      function test(name, fn) { fresh(); fn(); results.push(name); }
      test('1D morph and clip share real geometry; 2D bilinear midpoint', () => {
        set({ 'eye.left.open': .5, 'mouth.open': .5, 'mouth.form': .5 });
        ok(node('eye_aperture').getAttribute('d').includes('C 30 21 50 21 60 30'), 'eye midpoint');
        ok(node('mouth_contour').getAttribute('d').includes('C 40 69.5 60 69.5 70 72.5'), 'mouth bilinear midpoint');
        ok(node('eye_clip').firstElementChild.getAttribute('href') === '#eye_aperture', 'clip uses same path');
      });
      test('enum variant + manual layer + exact reset', () => {
        const originals = [...r.originals.values()].map(o => [o.node, o.prop, o.attr, o.css]);
        set({ 'eye.left.iris': 'glow' }); close(Number(node('iris_glow').getAttribute('opacity')), 1, 'glow'); close(Number(node('iris_normal').getAttribute('opacity')), 0, 'normal');
        cmd({ op: 'reset' }); r.tick(.5);
        originals.forEach(([n, p, attr, css]) => { ok(n.getAttribute(p) === attr && n.style.getPropertyValue(p) === css, 'exact restoration'); });
      });
      test('transition, sparse expression blend and manual override', () => {
        apply('cry', 'cry', .5); r.tick(.3); close(r.values['eye.left.open'], .75, 'half crying');
        cmd({ op: 'set_parameters', values: { 'eye.left.open': .25 }, transition_s: 1 }); r.tick(.5); close(r.values['eye.left.open'], .5, 'half transition');
        r.clearManual(); close(r.values['eye.left.open'], .75, 'manual removed');
      });
      test('command batches reject atomically', () => {
        const prior = node('eye_aperture').getAttribute('d'), state = JSON.stringify(r.state);
        fails(() => cmd({ op: 'set_parameters', values: { 'eye.left.open': .1 }, transition_s: 0 }, { op: 'pause_animation', instance_id: 'missing' }));
        ok(prior === node('eye_aperture').getAttribute('d') && JSON.stringify(r.state) === state, 'no partial commit');
        fails(() => set({ 'tear.phase': .5 })); fails(() => set({ 'mouth.open': 8 }));
        fails(() => cmd({ op: 'reset', extra: true }));
      });
      test('star loop pause, resume, seek, speed, no restart on repeat', () => {
        play('star_pulse'); r.tick(.3); const first = r.values['star.pulse']; close(first, 1.075, 'star quarter');
        cmd({ op: 'pause_animation', instance_id: 'star_pulse' }); r.tick(.4); close(r.values['star.pulse'], first, 'pause');
        cmd({ op: 'resume_animation', instance_id: 'star_pulse' }, { op: 'set_animation_speed', instance_id: 'star_pulse', speed: 2 }); r.tick(.15); close(r.values['star.pulse'], 1.15, 'resume fast');
        play('star_pulse'); close(r.state.animations.star_pulse.time, .6, 'not restarted');
        cmd({ op: 'seek_animation', instance_id: 'star_pulse', time_s: .9 }); close(r.values['star.pulse'], 1.075, 'seek');
        r.tick(2.4); close(r.values['star.pulse'], 1.075, 'two loops');
      });
      test('tear phase keeps full travel at partial opacity; captured anchor survives blink', () => {
        set({ 'tear.amount': 1 }); play('tear_flow', 'tear', .4); r.tick(.8);
        close(r.values['tear.phase'], .5, 'phase'); close(Number(node('tear_motion').getAttribute('opacity')), .4, 'weighted opacity');
        ok(node('tear_motion').getAttribute('transform').includes('translate(0 15)'), 'full travel');
        const born = node('tear_origin').getAttribute('transform'); set({ 'eye.left.open': 0 }); r.tick(.2); ok(node('tear_origin').getAttribute('transform') === born, 'not dragged by blinking');
        r.tick(.7); ok(node('tear_origin').getAttribute('transform') !== born, 'new cycle samples closed eye');
      });
      test('anchor uses parent local space instead of double transform', () => {
        node('head').setAttribute('transform', 'translate(10 20) scale(2)'); set({ 'tear.amount': 1 });
        const m = node('mark_origin').transform.baseVal.consolidate().matrix; close(m.e, 85, 'anchor x'); close(m.f, 20, 'anchor y'); close(m.a, 1, 'parent scale not repeated');
      });
      test('finish-cycle release keeps tear presence then clears owned state', () => {
        apply('cry'); r.tick(.5); cmd({ op: 'release_expression', instance_id: 'cry' });
        r.tick(.5); close(r.values['tear.amount'], .8, 'presence retained'); ok(Object.keys(r.state.animations).length === 1, 'finishing current cycle');
        r.tick(.8); r.tick(.5); ok(!Object.keys(r.state.expressions).length && !Object.keys(r.state.animations).length, 'release complete'); close(r.values['tear.amount'], 0, 'presence reset');
      });
      test('one-shot removes contribution; stop respects fade; replace conflict rejected', () => {
        play('exclamation_pop'); r.tick(1.1); ok(!Object.keys(r.state.animations).length, 'one shot removed');
        close(r.values['symbol.exclamation.phase'], 0, 'one shot reset'); play('star_pulse', 'one'); r.tick(.4);
        fails(() => play('star_pulse', 'two')); ok(!r.state.animations.two, 'replace conflict atomic');
        cmd({ op: 'stop_animation', instance_id: 'one' }); r.tick(.2); ok(!r.state.animations.one, 'fade stop');
      });
      test('constraints and enum expression conflicts reject before fade in', () => {
        fresh(data => {
          data.constraints = [{ when: [{ parameter: 'eye.left.iris', op: 'eq', value: 'glow' }], require: [{ parameter: 'eye.left.open', op: 'gte', value: .5 }], message: 'glow requires open eyes' }];
        });
        fails(() => set({ 'eye.left.iris': 'glow', 'eye.left.open': 0 }));
        fresh(data => {
          data.parameters['eye.left.iris'].choices.push('red'); data.bindings.iris_variant.cases.red = [];
          data.expressions.a = { label: 'a', description: 'a', parameters: { 'eye.left.iris': 'glow' }, animations: [], fade_in_s: .2, fade_out_s: .2 };
          data.expressions.b = { ...data.expressions.a, parameters: { 'eye.left.iris': 'red' } };
        });
        apply('a'); fails(() => apply('b')); ok(!r.state.expressions.b, 'enum conflict atomic');
      });
      test('semantic rejection of malformed rigs', () => {
        const bad = [
          d => d.bindings.eye_aperture.svg_id = 'missing',
          d => d.bindings.mouth_shape.keys.pop(),
          d => d.bindings.eye_aperture.keys[0].d = 'M 0 0 L 1 1 Z',
          d => d.bindings.eye_aperture.keys[1].d = d.bindings.eye_aperture.keys[1].d.replace('20 30', '20 31'),
          d => d.bindings.extra = structuredClone(d.bindings.star_visible),
          d => d.anchors.head_side.svg_id = 'mark_motion',
          d => d.animations.star_pulse.tracks[0].keys[2].value = 1.1,
          d => d.attachments.tear_origin.clock = 'missing',
          d => d.script = 'alert(1)'
        ];
        for (const edit of bad) fails(() => fresh(edit));
      });
      if (root) root.remove(); return results;
    }, { svg, rig });
    console.log('Runtime:', unit.length, 'scenario groups passed');
    // Real file picker path, UI sliders and preset animation, not only the API.
    await page.setInputFiles('#svgFile', path.join(fixture, 'contract-fixture.svg'));
    await page.setInputFiles('#jsonFile', path.join(fixture, 'controls.example.json'));
    await page.waitForFunction(() => document.querySelector('#jsonName').textContent === 'controls.example.json');
    const open = page.locator('[data-parameter="mouth.open"] input[type=number]'); await open.fill('.65'); await open.dispatchEvent('change');
    await page.waitForFunction(async () => (await expressionPreview.getState()).parameters['mouth.open'] === .65);
    await page.locator('[data-expression="cry"]').check();
    await page.waitForFunction(async () => (await expressionPreview.getState()).animations.length === 1);
    await page.waitForTimeout(350); await page.click('#pauseAll');
    const paused = await page.evaluate(() => expressionPreview.getState()); await page.waitForTimeout(150);
    const pausedAgain = await page.evaluate(() => expressionPreview.getState()); assert.equal(paused.animations[0].time_s, pausedAgain.animations[0].time_s);
    await page.screenshot({ path: path.join(output, 'console-cry.png') });
    // Invalid replacement keeps the current live SVG + rig + control panel intact.
    const before = await view.evaluate(() => AstraPreview.request('snapshot'));
    await page.setInputFiles('#jsonFile', { name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...rig, unknown: true })) });
    await page.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
    assert.equal((await view.evaluate(() => AstraPreview.request('snapshot'))).svg, before.svg);
    assert.equal(await page.locator('#jsonName').innerText(), 'controls.example.json');
    await page.click('#resetAll'); assert.equal((await page.evaluate(() => expressionPreview.getState())).parameters['mouth.open'], 0);
    // Existing comparison and layer features remain available in the shared viewer.
    await view.locator('#referenceInput').setInputFiles(path.join(fixture, 'contract-fixture.svg'));
    await view.locator('[data-compare-mode="overlay"]').click(); await view.locator('#opacityInput').fill('40');
    await view.locator('#toggleLayers').click(); assert.equal(await view.locator('#layerPanel').isVisible(), true);
    await view.locator('#toggleLayers').click(); await view.locator('#removeReference').click();
    // Export a reproducible command during fade-in; preserve requested weight,
    // not the transient envelope weight, and load that command again.
    await page.evaluate(async () => {
      await expressionPreview.command({schema_version:'0.1.0',document_type:'command',character_id:'contract_demo',actions:[{op:'play_animation',animation:'star_pulse',instance_id:'exported',weight:.7,speed:1.5}]});
    });
    await page.click('#pauseAll'); await page.locator('summary').click();
    const downloadPromise = page.waitForEvent('download'); await page.click('#exportCommand'); const download = await downloadPromise;
    const commandText = fs.readFileSync(await download.path(), 'utf8'); const exported = JSON.parse(commandText);
    assert.equal(exported.actions.find(a => a.op === 'play_animation').weight, .7);
    await page.locator('#command').fill(commandText); await page.click('#runCommand');
    assert.equal((await page.evaluate(() => expressionPreview.getState())).animations[0].speed, 1.5);
    const svgDownloadPromise = page.waitForEvent('download'); await page.click('#exportSvg');
    assert.match(fs.readFileSync(await (await svgDownloadPromise).path(), 'utf8'), /eye_aperture/);
    await page.click('#resetAll'); await page.locator('summary').click();
    // Offline svg-preview -> expression-preview handoff uses the loaded SVG.
    const source = await context.newPage(); await source.goto(pathToFileURL(path.join(preview, 'svg-preview.html')).href);
    await source.setInputFiles('#fileInput', path.join(fixture, 'contract-fixture.svg')); await source.waitForFunction(() => document.querySelector('#fileName').textContent.includes('contract-fixture'));
    const popupPromise = source.waitForEvent('popup'); await source.click('#openExpression'); const popup = await popupPromise;
    await popup.waitForFunction(() => document.querySelector('#svgName').textContent === 'contract-fixture.svg');
    await popup.setInputFiles('#jsonFile', path.join(fixture, 'controls.example.json')); await popup.waitForFunction(() => !document.querySelector('#controls').hidden);
    await popup.close(); await source.close();
    // Existing full character can be opened without inventing expression bindings.
    const real = process.argv[3] || path.join(fixture, 'contract-fixture.svg');
    const plain = await context.newPage(); await plain.goto(pathToFileURL(path.join(preview, 'expression-preview.html')).href);
    await plain.setInputFiles('#svgFile', real); await plain.waitForFunction(() => document.querySelector('#character').textContent === '仅 SVG');
    assert.equal(await plain.locator('#controls').isVisible(), false); await plain.close();
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: path.join(output, 'console-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []); assert.deepEqual(network, []);
    console.log('UI: offline file loading, sliders, presets, pause/reset, invalid replacement, comparison/layers, handoff, SVG without rig, mobile passed');
    console.log('Screenshots:', output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

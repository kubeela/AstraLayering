import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const base = process.argv[2] || 'http://127.0.0.1:4391/';
const evidence = '.web/physics-cases'; await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage(), errors = [], nativeRequests = [], results = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (/api\/studio\/(project|layers\/open)/.test(r.url())) nativeRequests.push(r.url()); });
const diag = () => page.evaluate(() => window.studioDiagnostics());
const capture = async () => Buffer.from((await page.locator('#stage').evaluate(c => c.toDataURL('image/png'))).split(',')[1], 'base64');
async function marker(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0, x = 0, y = 0;
  for (let q = 0; q < data.length; q += 4) if (data[q] > 235 && data[q + 1] > 180 && data[q + 2] < 150 && data[q + 3] > 128) { const p = q / 4; n++; x += p % info.width; y += Math.floor(p / info.width); }
  assert(n > 30, 'source texture marker disappeared');
  return { x: x / n, y: y / n, count: n };
}
try {
  for (const id of ['ribbon', 'skirt', 'flag']) {
    if (id === 'ribbon') await page.goto(new URL('studio?physicsCase=ribbon', base).href);
    else await page.locator('#physics-case-select').selectOption(id);
    await page.waitForFunction(id => window.studioDiagnostics?.().physicsCase === id && window.studioDiagnostics().physics.ready, id);
    assert.equal((await diag()).lightingEnabled, false);
    assert.equal((await diag()).physics.enabled, true);
    assert.equal((await diag()).physics.demo, true);
    assert.equal(await page.locator('#lighting-base').count(), 0);
    assert.equal((await diag()).project, undefined);
    // Leave the default looping animation active briefly, then isolate one
    // impulse so frame differences are caused by physics rather than a lamp.
    await page.waitForTimeout(500);
    assert((await diag()).physics.parts.some(p => p.binding.enabled && p.stats.travel > 1), 'looping demonstration did not move');
    await page.locator('#physics-demo').uncheck();
    await page.locator('#physics-pause').click();
    await page.locator('#physics-reset').click();
    const neutral = await capture(), a = await marker(neutral);
    await writeFile(`${evidence}/${id}-rest.png`, neutral);
    await page.locator('#physics-pulse').click();
    let peak = 0;
    for (let i = 0; i < 16; i++) {
      await page.locator('#physics-step').click();
      const d = await diag(), body = d.physics.parts.find(p => p.binding.enabled);
      peak = Math.max(peak, body.stats.travel);
      assert(body.stats.valid); assert(body.stats.angle <= body.binding.maxAngle + 1e-5);
    }
    const deformed = await capture(), b = await marker(deformed);
    const displacement = Math.hypot(a.x - b.x, a.y - b.y);
    assert(displacement > 4, `${id}: shader-independent source marker moved only ${displacement.toFixed(2)} px`);
    const [rest, moved] = await Promise.all([neutral, deformed].map(p => sharp(p).ensureAlpha().raw().toBuffer()));
    let contourPixels = 0;
    for (let q = 3; q < rest.length; q += 4) if (Math.abs(rest[q] - moved[q]) > 64) contourPixels++;
    assert(contourPixels > 100, `${id}: original image contour did not deform`);
    await writeFile(`${evidence}/${id}-deformed.png`, deformed);
    await page.screenshot({ path: `${evidence}/${id}-studio.png` });
    // A physical pose and all three data textures remain in the same renderer.
    const shape = (await diag()).physics.parts;
    await page.locator('[data-workspace="lighting"]').click();
    assert.deepEqual(await capture(), deformed);
    await page.locator('#effect-lighting').check();
    const lit = await capture();
    assert.notDeepEqual(lit, deformed, 'light has no effect on physical output');
    await page.locator('[data-position="left"]').click();
    assert.notDeepEqual(await capture(), lit, 'light movement does not reach the deformed output');
    assert.deepEqual((await diag()).physics.parts, shape);
    await page.locator('#effect-lighting').uncheck();
    assert.deepEqual(await capture(), deformed, 'turning off light lost the physical pose');
    await page.locator('#effect-physics').uncheck(); assert.deepEqual(await capture(), neutral);
    await page.locator('#effect-physics').check();
    await page.locator('[data-workspace="physics"]').click();
    // Mouse hover must deform the albedo too; the move tool applies no force.
    await page.locator('#physics-pause').click();
    const box = await page.locator('#stage').boundingBox(), body = (await diag()).physics.parts.find(p => p.binding.enabled), bounds = body.bounds;
    const fit = Math.max(1.1, 1.1 / (box.width / box.height));
    const point = (x, y) => ({ x: box.x + box.width / 2 + (x - 512) * box.height / (1024 * fit), y: box.y + box.height / 2 + (y - 512) * box.height / (1024 * fit) });
    const cross = async () => { for (let i = 0; i < 12; i++) { const u = id === 'flag' ? .87 : .25 + i * .04, v = id === 'flag' ? .25 + i * .04 : .87; const p = point(bounds.x + bounds.width * u, bounds.y + bounds.height * v); await page.mouse.move(p.x, p.y); await page.waitForTimeout(20); } };
    const impulses = () => diag().then(d => d.physics.parts.find(p => p.binding.enabled).impulses);
    const before = await impulses(); await cross(); assert.equal(await impulses(), before);
    await page.locator('[data-tool="disturb"]').click(); await cross(); assert(await impulses() > before);
    await page.locator('#physics-pause').click();
    assert(Math.hypot((await marker(await capture())).x - a.x, (await marker(await capture())).y - a.y) > 2, 'hover changed shading but not albedo');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-image').click()]);
    const metadata = await sharp(await download.path()).metadata(); assert.equal(metadata.width, 1024); assert.equal(metadata.height, 1024);
    results.push({ case: id, markerPixels: +displacement.toFixed(2), changedContourPixels: contourPixels, peakTravel: +peak.toFixed(2) });
    console.log(JSON.stringify(results.at(-1)));
  }
  assert.deepEqual(nativeRequests, [], 'standalone cases loaded a character/native document');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, results, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${evidence}/failure.png` }).catch(() => {});
  console.error('Diagnostics', JSON.stringify(await diag().catch(() => null)), errors);
  throw error;
} finally { await context.close(); await browser.close(); }

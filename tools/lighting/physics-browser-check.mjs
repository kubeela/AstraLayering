import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const base = process.argv[2] || 'http://127.0.0.1:4391/';
const project = process.argv[3] || 'jianma-shadow-fresh-20261022';
const preview = process.argv[4] || 'mixed';
const evidence = '.web/physics-check'; await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage(); const errors = []; const requests = [];
page.on('request', r => { if (/api\/studio|artifact|studio-surface-asset/.test(r.url())) requests.push(r.url()); });
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const diag = () => page.evaluate(() => window.studioDiagnostics());
const capture = async () => Buffer.from((await page.locator('#stage').evaluate(c=>c.toDataURL('image/png'))).split(',')[1],'base64');
try {
  await page.goto(new URL(`studio?project=${encodeURIComponent(project)}&preview=${encodeURIComponent(preview)}`, base).href);
  await page.waitForFunction(() => window.studioDiagnostics?.().layerSession && !window.studioDiagnostics().layerBusy, null, { timeout: 120000 });
  console.log('Native layers ready');
  assert.equal((await diag()).tool,'move');
  assert.deepEqual(await page.locator('[data-workspace]').evaluateAll(es=>es.map(e=>e.dataset.workspace)),['mask','lighting','physics']);
  assert.equal(await page.locator('[data-tool="disturb"]').isVisible(),false);
  const resolvedPreview = (await diag()).previewMode;
  const sourceSession = (await diag()).layerSession;
  await page.locator('[data-view="color"]').click(); const originalColor = await capture();
  await page.locator('[data-view="lit"]').click(); const before = await capture();
  await page.locator('#effect-physics').check();
  await page.waitForFunction(()=>window.studioDiagnostics().physics.ready,null,{timeout:120000});
  console.log('GPU physical preview ready');
  assert.equal((await diag()).workspace, 'lighting', 'enabling physics changed the editing workspace');
  assert.equal((await diag()).layerSession, sourceSession, 'enabling physics replaced the document');
  assert.equal((await diag()).previewMode, resolvedPreview);
  await page.locator('[data-workspace="physics"]').click();
  const d = await diag(); assert(d.physics.parts.some(p=>p.binding.enabled));
  assert.equal(await page.locator('#physics-overlay').isVisible(),true);
  assert.deepEqual(d.physics.textureSizes,Array.from({length:3},()=>d.physics.size));
  const after = await capture();
  await writeFile(`${evidence}/neutral.png`,after);
  const [a,b]=await Promise.all([before,after].map(p=>sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
  assert.equal(a.info.width,b.info.width); assert.equal(a.info.height,b.info.height);
  let total=0, count=0, changed=0;
  for(let q=0;q<a.data.length;q+=4){if(a.data[q+3]<100)continue;for(let c=0;c<3;c++){const delta=Math.abs(a.data[q+c]-b.data[q+c]);total+=delta;count++;if(delta>10)changed++;}}
  const error=total/count;console.log('Neutral mean RGB error',error,'large differences',changed/count);
  assert(error<2,'neutral appearance regressed');
  const target=d.physics.parts.find(p=>p.name.includes('skirt_front'))||d.physics.parts.find(p=>p.binding.enabled);
  await page.locator('#physics-part').selectOption(target.id);
  const box=await page.locator('#stage').boundingBox();
  const [w,h]=d.physics.size,fit=Math.max(1.1,1.1*w/h/(box.width/box.height));
  const point=(x,y)=>({x:box.x+box.width/2+(x-w/2)*box.height/(h*fit),y:box.y+box.height/2+(y-h/2)*box.height/(h*fit)});
  const cross=async()=>{const p=target.bounds;for(let i=0;i<15;i++){const v=point(p.x+p.width*(.25+i*.025),p.y+p.height*.8);await page.mouse.move(v.x,v.y);await page.waitForTimeout(20);}};
  const impulses=()=>diag().then(d=>d.physics.parts.find(p=>p.id===target.id).impulses);
  const initial=await impulses();await cross();assert.equal(await impulses(),initial,'move tool applied force');
  await page.locator('[data-tool="disturb"]').click();await cross();assert(await impulses()>initial,'hover did not apply force');
  assert(await page.locator('#physics-overlay circle').isVisible());
  const disturbed=await diag();assert.equal(disturbed.tool,'disturb');
  const limits=disturbed.physics.parts.filter(p=>p.binding.enabled);for(const p of limits){assert(p.stats.valid);assert(p.stats.angle<=p.binding.maxAngle+1e-5);assert(p.stats.stretch<=p.binding.stretch+1e-5);}
  await page.locator('#physics-pause').click();
  await page.locator('#physics-step').click();assert.equal((await diag()).physics.paused,true);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-image').click()]);
  const png=await download.path(),metadata=await sharp(png).metadata();assert.equal(metadata.width,w);assert.equal(metadata.height,h);
  await page.screenshot({path:`${evidence}/studio.png`});
  const [configDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#physics-export').click()]);
  const configPath=await configDownload.path();
  await page.locator('#physics-number-maxAngle').fill('9');await page.locator('#physics-number-maxAngle').dispatchEvent('change');
  assert.equal((await diag()).physics.parts.find(p=>p.id===target.id).binding.maxAngle,9);
  await page.locator('#physics-import').setInputFiles(configPath);
  await page.waitForFunction(id=>window.studioDiagnostics().physics.parts.find(p=>p.id===id).binding.maxAngle===12,target.id);
  await page.locator('#physics-pulse').click();
  for(let i=0;i<6;i++) await page.locator('#physics-step').click();
  // Editing tabs never replace the source, GPU output or paused deformation.
  const composed = await capture(), beforeTabs = await diag(), countBeforeTabs = requests.length;
  for (const workspace of ['lighting','mask','physics']) {
    await page.locator(`[data-workspace="${workspace}"]`).click();
    const current = await diag();
    assert.equal(current.layerSession, beforeTabs.layerSession);
    assert.equal(current.previewMode, resolvedPreview);
    assert.equal(current.lightingEnabled, true); assert.equal(current.physics.enabled, true);
    assert.deepEqual(current.settings, beforeTabs.settings);
    assert.deepEqual(current.physics.parts, beforeTabs.physics.parts);
    assert.deepEqual(await capture(), composed, 'changing editor changed the canvas');
  }
  assert.equal(requests.length, countBeforeTabs, 'editing tabs reloaded project assets');
  // All four effect combinations use the same document and prepared bindings.
  await page.locator('[data-tool="disturb"]').click();
  await page.locator('#effect-lighting').uncheck();
  assert.equal((await diag()).tool, 'disturb', 'lighting switch interrupted the physical tool');
  assert.equal((await diag()).physics.enabled, true);
  const unlitDeformed = await capture();
  await page.locator('[data-view="color"]').click(); assert.deepEqual(await capture(), unlitDeformed);
  assert.notDeepEqual(unlitDeformed, originalColor, 'physical movement vanished with lighting off');
  await page.locator('[data-view="lit"]').click();
  await page.locator('#effect-physics').uncheck();
  assert.equal((await diag()).physics.ready, true, 'disabling physics discarded bindings');
  assert.equal((await diag()).lightingEnabled, false);
  assert.deepEqual(await capture(), originalColor, 'disabling both effects failed to restore the source');
  await page.locator('#effect-lighting').check();
  assert.equal((await diag()).physics.enabled, false);
  await page.locator('#effect-physics').check();
  assert.equal((await diag()).lightingEnabled, true);
  assert.equal(requests.length, countBeforeTabs, 'effect toggles reloaded project assets');
  console.log('Shared canvas, all effect combinations and lighting on deformed maps verified');
  await page.locator('#physics-pulse').click(); await page.locator('#physics-step').click();
  await page.locator('[data-workspace="lighting"]').click();
  const preserved = (await diag()).physics.parts;
  const rightLight = await capture();
  await page.locator('[data-position="left"]').click();
  assert.notDeepEqual(await capture(), rightLight, 'lighting failed to respond on the physical canvas');
  assert.deepEqual((await diag()).physics.parts, preserved, 'moving the light changed physics state');
  await page.locator('[data-position="right"]').click();
  await page.locator('[data-workspace="lighting"]').click();
  assert.equal((await diag()).tool,'move');assert.equal(await page.locator('[data-tool="disturb"]').isVisible(),false);
  assert.equal(await page.locator('#physics-overlay').isVisible(),false);
  const saved=await impulses();await cross();assert.equal(await impulses(),saved,'inactive physics workspace applied force');
  assert.equal(await page.locator('[data-view="shading"]').count(),0);
  const beauty=await capture();
  await page.locator('summary').filter({hasText:'诊断'}).click();await page.locator('#show-shading').check();
  assert.equal((await diag()).view,'shading');
  const shading=await capture();
  const [litPixels,shadePixels]=await Promise.all([beauty,shading].map(p=>sharp(p).ensureAlpha().raw().toBuffer()));
  let modeDifference=0;for(let i=0;i<litPixels.length;i++)if(i%4!==3)modeDifference+=Math.abs(litPixels[i]-shadePixels[i]);
  console.log('Shading diagnostic RGB difference',modeDifference/(litPixels.length/4*3));
  assert(modeDifference/(litPixels.length/4*3)>3,'diagnostic reused the beauty shader');
  await page.locator('#show-shading').uncheck();
  if (resolvedPreview === 'mixed') {
    // Authored projection editing rebuilds only the current snapshot and keeps
    // live effects, map provenance, native session and physics authoring intact.
    await page.locator('[data-workspace="mask"]').click();
    const prior = await diag();
    await page.locator('#projection-list input').first().uncheck();
    await page.waitForFunction(revision => {
      const d = window.studioDiagnostics();
      return d.layerRevision > revision && !d.layerBusy && !d.busy && d.physics.ready;
    }, prior.layerRevision, {timeout:120000});
    const updated = await diag();
    assert.equal(updated.layerSession, prior.layerSession);
    assert.equal(updated.previewMode, 'mixed');
    assert.equal(updated.lightingEnabled, true); assert.equal(updated.physics.enabled, true);
    assert.deepEqual(updated.maps, prior.maps);
    assert.equal(updated.physics.parts.find(p=>p.id===target.id).binding.maxAngle,12);
    console.log('Native projection edit retained the shared scene');
  }

  await page.locator('[data-workspace="physics"]').click();assert.equal((await diag()).physics.ready,true);
  await page.locator('#physics-reset').click();
  assert((await diag()).physics.parts.filter(p=>p.binding.enabled).every(p=>p.stats.travel===0));
  await page.reload();await page.waitForFunction(()=>window.studioDiagnostics?.().layerSession&&!window.studioDiagnostics().layerBusy,null,{timeout:120000});
  await page.locator('[data-workspace="physics"]').click();await page.locator('#physics-prepare').click();
  await page.waitForFunction(()=>window.studioDiagnostics().physics.ready,null,{timeout:120000});
  assert.equal((await diag()).physics.parts.find(p=>p.id===target.id).binding.maxAngle,12);
  await page.locator('#physics-close').click();assert.equal((await diag()).physics.ready,false);
  assert.equal(await page.locator('[data-tool="disturb"]').isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,dimensions:[w,h],bindings:limits.length,neutralRGBError:error,drawItems:d.physics.drawItems,sharedCanvas:true,preview,errors},null,2));
} catch(error) {
  await page.screenshot({path:`${evidence}/failure.png`}).catch(()=>{});
  const d=await diag().catch(()=>null);console.error('Diagnostics',JSON.stringify(d?{workspace:d.workspace,tool:d.tool,layerBusy:d.layerBusy,session:d.layerSession,physics:{...d.physics,parts:d.physics.parts.filter(p=>p.binding.enabled)}}:null),errors);throw error;
} finally { await context.close();await browser.close(); }

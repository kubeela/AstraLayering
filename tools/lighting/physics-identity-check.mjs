// Requires the workbench's native Krita bridge. Creates only local disposable
// fixtures; never edits a pipeline project or its authoring files.
import { chromium } from 'playwright';
import { writePsdUint8Array } from 'ag-psd';
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:4391/';
const directory = '.web/physics-identity-check'; await mkdir(directory, { recursive:true });
const api = async (operation, data) => {
  const response = await fetch(new URL('api/studio/layers/' + operation, base), {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data),
  });
  const value = await response.json(); if (!response.ok) throw Error(value.error); return value;
};
const width = 128, height = 128;
const image = (w,h,r,g,b) => ({width:w,height:h,data:Uint8ClampedArray.from({length:w*h*4},(_,i)=>[r,g,b,255][i%4])});
const composite = image(width,height,0,0,0); composite.data.fill(0);
const children = [
  {name:'人物 | 01 hair/tail',left:25,top:15,imageData:image(30,90,30,140,210)},
  {name:'衣服 | 02 cloth/tail',left:78,top:20,imageData:image(30,90,190,80,110)},
];
for (const layer of children) for (let y=0;y<layer.imageData.height;y++) for (let x=0;x<layer.imageData.width;x++) {
  const offset = (y*layer.imageData.width+x)*4;
  composite.data.set(layer.imageData.data.subarray(offset,offset+4),((y+layer.top)*width+x+layer.left)*4);
}
const psd = writePsdUint8Array({width,height,imageData:composite,children});
const opened = await fetch(new URL('api/studio/layers/open?format=psd',base), {
  method:'POST',headers:{'Content-Type':'application/octet-stream'},body:psd,
});
const native = await opened.json(); if (!opened.ok) throw Error(native.error);
let source;
try {
  await api('export',{session:native.session,revision:native.revision});
  const url = new URL('studio-layer-asset',base);
  for (const [key,value] of Object.entries({session:native.session,revision:native.revision,kind:'kra'})) url.searchParams.set(key,value);
  const response = await fetch(url); if (!response.ok) throw Error(await response.text());
  source = new Uint8Array(await response.arrayBuffer());
} finally { await api('close',{session:native.session}); }
await writeFile(directory+'/source.kra',source);

const browser = await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context = await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000},acceptDownloads:true});
const page = await context.newPage(), errors = [];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const diag = () => page.evaluate(()=>window.studioDiagnostics());
const load = async path => {
  const prior = (await diag()).layerSession;
  await page.locator('#file-document').setInputFiles(path);
  await page.waitForFunction(prior => {
    const d=window.studioDiagnostics(); return d.layerSession && d.layerSession!==prior && !d.layerBusy;
  },prior,{timeout:120000});
  await page.locator('#effect-physics').check();
  await page.waitForFunction(()=>window.studioDiagnostics().physics.ready,null,{timeout:120000});
  await page.locator('[data-workspace="physics"]').click();
};
const exportRecipe = async () => {
  const [download] = await Promise.all([page.waitForEvent('download'),page.locator('#physics-export').click()]);
  return JSON.parse(await readFile(await download.path(),'utf8'));
};
try {
  await page.goto(new URL('studio',base).href);
  await page.waitForFunction(()=>!!window.studioDiagnostics);
  await load(directory+'/source.kra');
  const original = await diag(), target = original.physics.parts.find(p=>p.partPath==='character:hair/tail');
  assert(target); assert.equal(target.id,target.uuid); assert.equal(original.physics.parts.length,2);
  await page.locator('#physics-part [data-physics-component="'+target.id+'"]').click();
  await page.locator('#physics-enabled').check();
  for (const [key,value] of [['fixed','32'],['maxAngle','12'],['maxTravel','8']]) {
    await page.locator('#physics-number-'+key).fill(value);
    await page.locator('#physics-number-'+key).dispatchEvent('change');
  }
  const recipe = await exportRecipe(); assert.equal(recipe.schema,2);
  assert.equal(recipe.records['uuid:'+target.uuid].binding.maxAngle,12);
  await writeFile(directory+'/authored.physics.json',JSON.stringify(recipe));

  const files = unzipSync(source), inserted = 'd9999999-1111-4000-8000-000000000001';
  const changed = await page.evaluate(({xml,target,inserted})=>{
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    const layers=[...doc.getElementsByTagName('layer')];
    const selected=layers.find(n=>(n.getAttribute('uuid')||'').replace(/[{}]/g,'').toLowerCase()===target);
    const added=selected.cloneNode(true), filename=selected.getAttribute('filename');
    added.setAttribute('uuid','{'+inserted+'}'); added.setAttribute('filename','identity-added');
    added.setAttribute('name','Shadow test'); added.setAttribute('visible','0');
    selected.setAttribute('name','人物 | 99 renamed_display/path');
    const parent=selected.parentNode; parent.append(selected); parent.prepend(added);
    return {xml:new XMLSerializer().serializeToString(doc),filename};
  },{xml:strFromU8(files['maindoc.xml']),target:target.uuid,inserted});
  files['maindoc.xml']=strToU8(changed.xml);
  let copies=0;
  for (const [path,bytes] of Object.entries(files)) {
    const replacement=path.replace(new RegExp('/'+changed.filename+'(?=/|$|\\.)'),'/identity-added');
    if (replacement!==path) {files[replacement]=bytes;copies++;}
  }
  assert(copies>0,'fixture did not copy Krita paint data');
  const variant = zipSync(files); await writeFile(directory+'/reordered-added.kra',variant);
  await load(directory+'/reordered-added.kra');
  const updated = await diag(), bound = updated.physics.parts.find(p=>p.uuid===target.uuid);
  assert.equal(updated.physics.parts.length,3);
  assert.deepEqual(bound.binding,recipe.records['uuid:'+target.uuid].binding);
  assert.equal(bound.partPath,'character:renamed_display/path');
  assert.equal(updated.physics.parts.find(p=>p.uuid===inserted).binding.enabled,false);
  assert.deepEqual(updated.physics.issues,[]);
  assert.notEqual(updated.layerStates.find(l=>l.id===target.id).name,original.layerStates.find(l=>l.id===target.id).name);

  await page.reload(); await page.waitForFunction(()=>!!window.studioDiagnostics);
  await load(directory+'/reordered-added.kra');
  assert.deepEqual((await diag()).physics.parts.find(p=>p.uuid===target.uuid).binding,bound.binding);
  const snapshot = await exportRecipe();
  assert.deepEqual(snapshot.records['uuid:'+target.uuid].binding,recipe.records['uuid:'+target.uuid].binding);

  const replacement='d9999999-1111-4000-8000-000000000002';
  files['maindoc.xml']=strToU8(changed.xml.replace(target.uuid,replacement));
  await writeFile(directory+'/replaced.kra',zipSync(files));
  await load(directory+'/replaced.kra');
  assert.equal((await diag()).physics.parts.find(p=>p.uuid===replacement).binding.enabled,false);
  await page.locator('#physics-import').setInputFiles(directory+'/authored.physics.json');
  await page.waitForFunction(()=>window.studioDiagnostics().physics.issues.length===1);
  assert.deepEqual((await exportRecipe()).records['uuid:'+target.uuid],recipe.records['uuid:'+target.uuid]);
  await load(directory+'/source.kra');
  assert.deepEqual((await diag()).physics.parts.find(p=>p.uuid===target.uuid).binding,recipe.records['uuid:'+target.uuid].binding);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:directory+'/studio.png'});
  await writeFile(directory+'/report.json',JSON.stringify({nativeUuid:target.uuid,checks:['native import/export','UUID snapshot','reorder','rename','inserted layer unbound','document hash change','page reload','recipe export','replacement unbound','unresolved authoring retained','original restored'],errors},null,2)+'\n');
  console.log('Native KRA identity, browser authoring persistence and replacement recovery passed');
} finally { await browser.close(); }

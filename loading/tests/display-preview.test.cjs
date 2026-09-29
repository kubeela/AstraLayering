/* Real browser exercise. Set PLAYWRIGHT_MODULE / CHROMIUM_EXECUTABLE if needed. */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {spawnSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=path.resolve(__dirname,'../..');
const config={subject:'character',groups:[
  {name:'face',display_order:10,groups:[{name:'face_base',groups:[]},
    {name:'eyes',display_order:30,groups:[],parts:[{name:'left_eye'}]}]},
  {name:'hair',display_order:20,groups:[{name:'bangs',groups:[]}]}
]};
function svg(metadata=true){return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
${metadata?'<metadata id="group-structure">'+JSON.stringify(config)+'</metadata>':''}
<g id="base" data-group-path="face/face_base" data-display-order="10" data-display-source="face"><rect x="30" y="20" width="40" height="65" fill="#ffcc88"/></g>
<g id="hair" data-group-path="hair/bangs" data-display-order="20" data-display-source="hair"><rect x="20" y="30" width="60" height="25" fill="blue"/></g>
<g id="eye" data-group-path="face/eyes" data-part-path="face/eyes/left_eye" data-display-order="30" data-display-source="face/eyes"><rect x="40" y="40" width="10" height="8" fill="lime"/></g>
</svg>`;}
(async()=>{
  const directory=process.env.DISPLAY_TEST_OUTPUT||await fs.mkdtemp(path.join(os.tmpdir(),'astra-preview-'));
  await fs.mkdir(directory,{recursive:true});
  const initial=path.join(directory,'initial.svg'),plain=path.join(directory,'plain.svg'),json=path.join(directory,'groups.json');
  await fs.writeFile(initial,svg());await fs.writeFile(plain,svg(false));await fs.writeFile(json,JSON.stringify(config));
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:1000},acceptDownloads:true});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.join(repo,'loading/svg-preview.html')).href);
    const load=async filename=>{await page.locator('#fileInput').setInputFiles(filename);await page.waitForFunction(()=>!document.querySelector('#displaySettings').hidden);};
    const state=()=>page.evaluate(()=>{
      const doc=document.querySelector('#artFrame').contentDocument;
      const root=doc.querySelector('svg[data-camera] > svg');
      return {ids:[...root.children].filter(node=>node.localName==='g').map(node=>node.id),
        units:Object.fromEntries([...root.children].filter(node=>node.localName==='g').map(node=>[node.id,{order:Number(node.getAttribute('data-display-order')),source:node.getAttribute('data-display-source'),own:node.getAttribute('data-display-explicit')}]))};
    });
    const set=async(target,value)=>{await page.locator('#displayNode').selectOption(target);await page.locator('#displayValue').fill(value);await page.locator('#displayValue').dispatchEvent('change');};
    await load(initial);
    assert.deepEqual((await state()).ids,['base','hair','eye']);
    await set('face','40');
    assert.deepEqual((await state()).ids,['hair','eye','base']);
    assert.equal((await state()).units.eye.order,30);
    await set('face/eyes','5');
    assert.equal((await state()).units.eye.order,5);
    assert.equal((await state()).units.eye.source,'face/eyes');
    await page.locator('#inheritDisplay').click();
    assert.equal((await state()).units.eye.order,40);
    assert.equal((await state()).units.eye.source,'face');
    await set('face/eyes/left_eye','60');await set('face','10');
    assert.equal((await state()).units.eye.order,60);
    assert.equal((await state()).units.eye.own,'60');
    await set('face/eyes/left_eye','');
    assert.equal((await state()).units.eye.order,10);
    assert.equal((await state()).units.eye.own,null);
    await page.locator('#resetDisplay').click();
    assert.deepEqual((await state()).ids,['base','hair','eye']);
    // Export while the comparison camera has normalized the visible SVG size.
    await page.locator('#referenceInput').setInputFiles(plain);
    await page.waitForFunction(()=>!document.querySelector('#compareBar').hidden);
    const exportFile=async(button,name)=>{const pending=page.waitForEvent('download');await page.locator(button).click();const download=await pending;const filename=path.join(directory,name);await download.saveAs(filename);return filename;};
    const exportedSvg=await exportFile('#exportDisplaySvg','roundtrip.svg');
    const exportedJson=await exportFile('#exportDisplayJson','roundtrip.json');
    assert.deepEqual(JSON.parse(await fs.readFile(exportedJson,'utf8')),config);
    assert.match(await fs.readFile(exportedSvg,'utf8'),/width="100"/);
    const check=spawnSync('python3',[path.join(repo,'workflow-next/live2d-layering/2.皮套结构识别/tools/display_order.py'),'check','--groups',exportedJson,'--svg',exportedSvg],{encoding:'utf8',env:process.env});
    assert.equal(check.status,0,check.stdout+check.stderr);
    await load(exportedSvg);
    assert.equal((await state()).units.eye.order,30);
    // Existing SVGs remain viewable and can receive a matching external JSON.
    await page.locator('#fileInput').setInputFiles(plain);
    await page.waitForFunction(()=>document.querySelector('#displayNotice').textContent.includes('未附'));
    await page.locator('#displayFile').setInputFiles(json);
    await page.waitForFunction(()=>!document.querySelector('#displaySettings').hidden);
    await set('hair','50');assert.deepEqual((await state()).ids,['base','eye','hair']);
    await page.screenshot({path:path.join(directory,'display-preview.png')});
    assert.deepEqual(errors,[]);
    console.log('Browser display inheritance, parent/part overrides, clearing, actual DOM reorder, import and SVG/JSON roundtrip passed.');
    console.log(directory);
  }finally{await browser.close();if(!process.env.DISPLAY_TEST_OUTPUT)await fs.rm(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});

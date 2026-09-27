const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const work = __dirname;
const html = path.resolve(work, '../index.html');
const ffmpeg = 'D:/Programs/FFmpeg8/bin/ffmpeg.exe';
const output = path.join(work, 'svg-motion.mp4');
const samples = process.argv.includes('--samples');

async function main() {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page = await browser.newPage({viewport:{width:960,height:1080},deviceScaleFactor:1});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await page.goto('file:///' + html.replace(/\\/g,'/'));
  await page.waitForFunction(() => window.MillyRig && typeof motionAt === 'function');
  await page.addStyleTag({content:`
    html,body {width:960px!important;height:1080px!important;overflow:hidden!important;background:#fff!important}
    #stage {position:fixed!important;left:0!important;top:0!important;z-index:9999!important;width:960px!important;height:1080px!important;min-height:0!important;border:0!important;border-radius:0!important;background:#fff!important}
    #stage:before,.stage-label,.stage-status,.small-preview,.view-tools,.stage-tip {display:none!important}
    #milly-svg {width:960px!important;height:1080px!important;inset:0!important;overflow:hidden!important}
  `});
  await page.evaluate(() => {
    MillyRig.showView('portrait');
    document.getElementById('milly-svg').setAttribute('viewBox','300 -36 400 500');
    MillyRig.seek(0);
  });
  if (samples) {
    for (const sec of [0,5,10,15,20,25,29.9]) {
      await page.evaluate(sec => {
        MillyRig.seek(sec);
        document.getElementById('milly-svg').setAttribute('viewBox','300 -36 400 500');
      }, sec);
      await page.locator('#stage').screenshot({path:path.join(work,`svg-${String(sec).replace('.','-')}.png`)});
    }
    console.log(JSON.stringify({samples:true, errors, state:await page.evaluate(()=>MillyRig.state)}));
  } else {
    const proc = spawn(ffmpeg, ['-y','-loglevel','error','-f','image2pipe','-vcodec','png','-framerate','30','-i','pipe:0','-frames:v','900','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p',output], {stdio:['pipe','inherit','inherit']});
    const done = new Promise((resolve,reject) => {
      proc.on('error',reject);
      proc.on('close',code => code===0?resolve():reject(Error(`ffmpeg exit ${code}`)));
    });
    for(let i=0;i<900;i++) {
      await page.evaluate(t => {
        MillyRig.step(1/30,motionAt(t));
        document.getElementById('milly-svg').setAttribute('viewBox','300 -36 400 500');
      },i/30);
      const png = await page.locator('#stage').screenshot({type:'png',animations:'disabled'});
      if (!proc.stdin.write(png)) await new Promise(resolve => proc.stdin.once('drain',resolve));
      if (i%150===0) console.log(`Rendered ${i}/900`);
    }
    proc.stdin.end();
    await done;
    if (errors.length) throw Error(`Browser errors: ${errors.join('; ')}`);
    console.log(`Saved ${output} (${fs.statSync(output).size} bytes)`);
  }
  await browser.close();
}
main().catch(e => {console.error(e);process.exitCode=1});


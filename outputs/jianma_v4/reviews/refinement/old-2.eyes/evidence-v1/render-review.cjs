const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../../..');
const candidate = path.join(root, 'reviews/refinement/eyes/candidates/character-v1.svg');
const reference = path.join(root, 'references/base-subject.png');
const svg = fs.readFileSync(candidate, 'utf8');
function regionSvg(source, r, k) {return source.replace(/width="941" height="1672" viewBox="0 0 941 1672"/, `width="${r.width*k}" height="${r.height*k}" viewBox="${r.left} ${r.top} ${r.width} ${r.height}"`);}
async function render(source, file) {return sharp(Buffer.from(source)).flatten({background:'#ffffff'}).removeAlpha().png().toFile(path.join(__dirname,file));}
async function pair(a,b,out,w,h) {await sharp({create:{width:w*2,height:h,channels:3,background:'#ffffff'}}).composite([{input:a,left:0,top:0},{input:b,left:w,top:0}]).png().toFile(path.join(__dirname,out));}
(async()=>{
  const hash=crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex').toUpperCase();
  if(hash!=='EFC23104A94DB5D2D7ED4EDC3F30C1AFA305EDA1247D27483F6E151A4A57BECD')throw Error(hash);
  await render(svg,'candidate-full-1x.png');
  const regions={head:{left:345,top:95,width:190,height:190},eyes:{left:390,top:177,width:108,height:44}};
  for(const [name,r] of Object.entries(regions))for(const k of [1,4,12]){
    if(name==='head'&&k===12)continue;
    const a=await sharp(reference).extract(r).resize(r.width*k,r.height*k,{kernel:'nearest'}).png().toBuffer();
    fs.writeFileSync(path.join(__dirname,`reference-${name}-${k}x.png`),a);
    await render(regionSvg(svg,r,k),`candidate-${name}-direct-${k}x.png`);
    const b=fs.readFileSync(path.join(__dirname,`candidate-${name}-direct-${k}x.png`));
    await pair(a,b,`compare-${name}-${k}x.png`,r.width*k,r.height*k);
    if(k===4){
      const rgba=await sharp(b).ensureAlpha().png().toBuffer();
      const over=await sharp(rgba).linear([1,1,1,0.5],[0,0,0,0]).png().toBuffer();
      await sharp(a).composite([{input:over}]).png().toFile(path.join(__dirname,`overlay-${name}-4x.png`));
    }
  }
  fs.writeFileSync(path.join(__dirname,'render-manifest.json'),JSON.stringify({candidate,reference,sha256:hash,renderer:'sharp/librsvg '+JSON.stringify(sharp.versions),canvas:[941,1672],background:'#ffffff',regions,referenceScaling:'nearest neighbor only; no added detail',candidateScaling:'SVG viewBox region rendered directly at output resolution; no PNG upscaling',alignment:'same original coordinates, no translation or warp'},null,2));
})();

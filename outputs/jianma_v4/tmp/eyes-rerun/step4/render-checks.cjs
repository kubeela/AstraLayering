const fs=require('fs');const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const tmp='tmp/eyes-rerun/step4';
function crop(s,x,y,w,h,k){return s.replace('width="941" height="1672" viewBox="0 0 941 1672"',`width="${w*k}" height="${h*k}" viewBox="${x} ${y} ${w} ${h}"`)}
(async()=>{
for(const name of ['right-added-off','left-added-off','all-added-off','right-eye-off','left-eye-off','eyes-off','source-eyes-off']){
let s=fs.readFileSync(tmp+'/'+name+'.svg','utf8');
await sharp(Buffer.from(crop(s,390,178,110,41,12))).flatten({background:'#fff'}).removeAlpha().png().toFile(tmp+'/'+name+'-12x.png');
await sharp(Buffer.from(crop(s,380,145,125,135,4))).flatten({background:'#fff'}).removeAlpha().png().toFile(tmp+'/'+name+'-face-4x.png');
}
})().catch(e=>{console.error(e);process.exit(1)});

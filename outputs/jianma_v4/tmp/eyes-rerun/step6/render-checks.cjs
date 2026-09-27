const fs=require('fs');const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');const tmp='tmp/eyes-rerun/step6';
function crop(s,x,y,w,h,k){return s.replace('width="941" height="1672" viewBox="0 0 941 1672"',`width="${w*k}" height="${h*k}" viewBox="${x} ${y} ${w} ${h}"`)}
(async()=>{for(const name of ['right-effects-off','left-effects-off','effects-off','right-lid-source-off','left-lid-source-off','lid-sources-off','front-hair-sources-off','eyes-off','source-eyes-off','effects-only','right-effects-only','left-effects-only','highlights-only','complete-sclera','complete-eye-black','unclipped-eye-black-context']){
let s=fs.readFileSync(tmp+'/'+name+'.svg','utf8');let bg=['highlights-only','complete-sclera'].includes(name)?'#C7C0C8':'#fff';await sharp(Buffer.from(crop(s,390,178,110,41,12))).flatten({background:bg}).removeAlpha().png().toFile(tmp+'/'+name+'-12x.png');
if(['front-hair-sources-off','eyes-off','effects-off'].includes(name))await sharp(Buffer.from(crop(s,380,145,125,135,4))).flatten({background:'#fff'}).removeAlpha().png().toFile(tmp+'/'+name+'-face-4x.png');
}
})().catch(e=>{console.error(e);process.exit(1)});

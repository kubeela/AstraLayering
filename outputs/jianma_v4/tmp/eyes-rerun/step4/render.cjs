const fs=require('fs');const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out='refinement/groups/eyes/4.眼周肤色与局部层次';const tmp='tmp/eyes-rerun/step4';
function crop(s,x,y,w,h,k){return s.replace('width="941" height="1672" viewBox="0 0 941 1672"',`width="${w*k}" height="${h*k}" viewBox="${x} ${y} ${w} ${h}"`)}
async function png(s,f){await sharp(Buffer.from(s)).flatten({background:'#fff'}).removeAlpha().png().toFile(f)}
(async()=>{
let s=fs.readFileSync(out+'/character.svg','utf8');await png(s,out+'/preview.png');
for(const [name,path] of [['candidate',out+'/character.svg'],['input','refinement/groups/eyes/3.关联部件校准/character.svg']]){
const t=fs.readFileSync(path,'utf8');await png(crop(t,390,178,110,41,12),tmp+'/'+name+'-eyes-12x.png');await png(crop(t,380,145,125,135,4),tmp+'/'+name+'-face-4x.png');}
})().catch(e=>{console.error(e);process.exit(1)});

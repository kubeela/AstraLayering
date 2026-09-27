const fs=require('fs');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out='refinement/groups/eyes/3.关联部件校准';
const tmp='tmp/eyes-rerun/step3';
function crop(s,x,y,w,h,k){return s.replace('width="941" height="1672" viewBox="0 0 941 1672"',`width="${w*k}" height="${h*k}" viewBox="${x} ${y} ${w} ${h}"`)}
async function png(s,file){await sharp(Buffer.from(s)).flatten({background:'#fff'}).removeAlpha().png().toFile(file)}
(async()=>{
 const s=fs.readFileSync(out+'/character.svg','utf8');
 await png(s,out+'/preview.png');
 for(const [name,path] of [['candidate',out+'/character.svg'],['input','refinement/groups/eyes/2.眼型校准与轮廓部件绘制/character.svg'],['front-hair-off',tmp+'/front-hair-off.svg']]){
  const x=fs.readFileSync(path,'utf8');
  await png(crop(x,390,178,110,41,12),tmp+'/'+name+'-eyes-12x.png');
  await png(crop(x,300,0,290,295,2),tmp+'/'+name+'-head-2x.png');
  await png(crop(x,350,120,190,170,4),tmp+'/'+name+'-face-4x.png');
 }
})().catch(e=>{console.error(e);process.exit(1)});

const fs=require('fs');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out='refinement/groups/eyes/2.眼型校准与轮廓部件绘制';
const tmp='tmp/eyes-rerun/step2';
function cropSvg(s,x,y,w,h,scale){return s.replace('width="941" height="1672" viewBox="0 0 941 1672"',`width="${w*scale}" height="${h*scale}" viewBox="${x} ${y} ${w} ${h}"`)}
(async()=>{
 const s=fs.readFileSync(out+'/character.svg','utf8');
 await sharp(Buffer.from(s)).flatten({background:'#ffffff'}).removeAlpha().png().toFile(out+'/preview.png');
 await sharp(Buffer.from(cropSvg(s,390,178,110,41,12))).flatten({background:'#ffffff'}).removeAlpha().png().toFile(tmp+'/candidate-eyes-12x.png');
 await sharp(Buffer.from(cropSvg(s,380,145,125,135,4))).flatten({background:'#ffffff'}).removeAlpha().png().toFile(tmp+'/candidate-face-4x.png');
 for(const name of ['no-iris','contours-only','white-only','eyes-off']){
  const v=fs.readFileSync(tmp+'/'+name+'.svg','utf8');
  await sharp(Buffer.from(cropSvg(v,390,178,110,41,12))).flatten({background:name==='white-only'?'#dccfd2':'#ffffff'}).removeAlpha().png().toFile(tmp+'/'+name+'-12x.png');
 }
 const v=fs.readFileSync(tmp+'/eyes-off.svg','utf8');
 await sharp(Buffer.from(cropSvg(v,380,145,125,135,4))).flatten({background:'#ffffff'}).removeAlpha().png().toFile(tmp+'/eyes-off-face-4x.png');
})().catch(e=>{console.error(e);process.exit(1)});

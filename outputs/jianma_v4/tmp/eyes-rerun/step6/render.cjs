const fs=require('fs');const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');const out='refinement/groups/eyes/6.投影与高光效果';const tmp='tmp/eyes-rerun/step6';
function crop(s,x,y,w,h,k){return s.replace('width="941" height="1672" viewBox="0 0 941 1672"',`width="${w*k}" height="${h*k}" viewBox="${x} ${y} ${w} ${h}"`)}
async function png(s,f){await sharp(Buffer.from(s)).flatten({background:'#fff'}).removeAlpha().png().toFile(f)}
(async()=>{let s=fs.readFileSync(out+'/character.svg','utf8');await png(s,out+'/preview.png');
for(const [name,path] of [['candidate',out+'/character.svg'],['input','refinement/groups/eyes/5.眼黑与装饰部件绘制/character.svg']]){const t=fs.readFileSync(path,'utf8');await png(crop(t,390,178,110,41,12),tmp+'/'+name+'-eyes-12x.png');await png(crop(t,380,145,125,135,4),tmp+'/'+name+'-face-4x.png');await png(crop(t,300,0,290,295,2),tmp+'/'+name+'-head-2x.png');}
})().catch(e=>{console.error(e);process.exit(1)});

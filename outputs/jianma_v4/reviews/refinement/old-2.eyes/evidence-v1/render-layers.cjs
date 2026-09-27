const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
 const files=fs.readdirSync(__dirname).filter(x=>x.endsWith('.svg'));
 const images=[];
 for(const file of files){
  const src=fs.readFileSync(path.join(__dirname,file),'utf8').replace(/width="941" height="1672" viewBox="0 0 941 1672"/,'width="1080" height="440" viewBox="390 177 108 44"');
  const png=await sharp(Buffer.from(src)).flatten({background:'#fff'}).png().toBuffer();
  fs.writeFileSync(path.join(__dirname,file.replace('.svg','-direct-10x.png')),png);
  images.push({file,png});
 }
 for(let i=0;i<images.length;i+=3){
  const subset=images.slice(i,i+3),h=480;
  const comp=[];
  subset.forEach((o,j)=>{
   const label=Buffer.from(`<svg width="1080" height="40"><rect width="1080" height="40" fill="white"/><text x="8" y="28" font-family="Arial" font-size="22">${o.file}</text></svg>`);
   comp.push({input:label,left:0,top:j*h},{input:o.png,left:0,top:j*h+40});
  });
  await sharp({create:{width:1080,height:h*subset.length,channels:3,background:'white'}}).composite(comp).png().toFile(path.join(__dirname,`layer-sheet-${Math.floor(i/3)+1}.png`));
 }
})();

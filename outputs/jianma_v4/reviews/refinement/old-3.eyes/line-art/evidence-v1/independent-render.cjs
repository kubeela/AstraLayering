const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../../../..');
const candidate=path.resolve(__dirname,'../candidates/character-v1.svg');
const source=path.join(root,'references/base-subject.png');
const svg=fs.readFileSync(candidate,'utf8');
const boxes={whole_head:[300,0,285,282,3],head:[350,90,185,190,4],eyes:[395,180,98,32,10],eye_left:[451,188,39,22,20],eye_right:[398,188,38,22,20]};
function cropped(s,b){const[x,y,w,h,k]=b;return s.replace(/<svg\b[^>]*>/,`<svg xmlns="http://www.w3.org/2000/svg" width="${w*k}" height="${h*k}" viewBox="${x} ${y} ${w} ${h}">`)}
async function render(s,b,p){return sharp(Buffer.from(cropped(s,b))).flatten({background:'#fff'}).png().toFile(p)}
async function make(){
await sharp(Buffer.from(svg)).flatten({background:'#fff'}).png().toFile(path.join(__dirname,'candidate-native.png'));
for(const[n,b]of Object.entries(boxes)){
 const[x,y,w,h,k]=b,W=w*k,H=h*k;
 const ref=await sharp(source).extract({left:x,top:y,width:w,height:h}).resize(W,H,{kernel:'nearest'}).png().toBuffer();
 await sharp(ref).toFile(path.join(__dirname,n+'-reference-pixels.png'));
 await render(svg,b,path.join(__dirname,n+'-candidate.png'));
 const can=await sharp(path.join(__dirname,n+'-candidate.png')).png().toBuffer();
 await sharp({create:{width:W*2+12,height:H,channels:3,background:'#d6d6d6'}}).composite([{input:ref,left:0,top:0},{input:can,left:W+12,top:0}]).png().toFile(path.join(__dirname,n+'-side-by-side.png'));
 const ca=await sharp(can).ensureAlpha(.5).png().toBuffer();
 await sharp(ref).composite([{input:ca}]).png().toFile(path.join(__dirname,n+'-blend50.png'));
}
const h=[350,90,185,190,1];await render(svg,h,path.join(__dirname,'head-candidate-native.png'));
await sharp(source).extract({left:350,top:90,width:185,height:190}).png().toFile(path.join(__dirname,'head-reference-native.png'));
fs.writeFileSync(path.join(__dirname,'crop-manifest.json'),JSON.stringify({candidate,source,sourceDimensions:[941,1672],boxes,referenceResize:'nearest',candidateRender:'direct SVG at requested output resolution',alignment:'original full canvas; no per-eye translation/scaling',sideBySide:'reference left, candidate right',blend:'reference 50%, candidate 50%'},null,2));
}
make().catch(e=>{console.error(e);process.exit(1)});

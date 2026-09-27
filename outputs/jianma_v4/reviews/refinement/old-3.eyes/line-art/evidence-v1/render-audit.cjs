const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const E=__dirname;
const src=path.resolve(E,'../../../../../references/base-subject.png');
const b=[395,180,98,32,20];
const orig=fs.readFileSync(path.resolve(E,'../candidates/character-v1.svg'),'utf8');
function crop(s,z){const[x,y,w,h,k]=z;return s.replace(/<svg\b[^>]*>/,`<svg xmlns="http://www.w3.org/2000/svg" width="${w*k}" height="${h*k}" viewBox="${x} ${y} ${w} ${h}">`)}
async function render(s,z){return sharp(Buffer.from(crop(s,z))).flatten({background:'#fff'}).removeAlpha().png().toBuffer()}
function esc(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;')}
async function main(){
 const metrics={mask_threshold:'black intensity < 128',scale:40,coordinates:'original canvas; aperture/iris are visible portions after same aperture, lash and hair occlusion',eyes:{},tests:{}};
 const baseline=await render(orig,b);await sharp(baseline).toFile(path.join(E,'eyes-test-baseline.png'));
 const rawBase=await sharp(baseline).raw().toBuffer();
 const outs={};
 for(const n of fs.readdirSync(E).filter(n=>n.endsWith('.svg'))){
  const s=fs.readFileSync(path.join(E,n),'utf8');
  let z=b;if(n==='face-features-hidden.svg')z=[350,140,185,140,4];
  if(n.includes('full-iris')||n.includes('uncovered-sclera')||n.includes('sclera-alone')||n.includes('full-lash'))z=n.startsWith('eye_left')?[451,185,39,24,20]:[398,185,38,24,20];
  if(n.includes('-mask-'))continue;
  const out=await render(s,z);outs[n]=out;await sharp(out).toFile(path.join(E,n.replace('.svg','.png')));
  if(n.includes('lash-moved')||n.includes('lash-edited')||n.includes('gaze-moved')||n==='guides-off-restored.svg'){
   const raw=await sharp(out).raw().toBuffer();let total=0,left=0,right=0,front=0,rear=0;
   const diff=Buffer.alloc(raw.length,255);
   for(let y=0;y<b[3]*b[4];y++)for(let x=0;x<b[2]*b[4];x++){
    const i=(y*b[2]*b[4]+x)*3;
    if(Math.max(...[0,1,2].map(c=>Math.abs(raw[i+c]-rawBase[i+c])))>2){
     total++;const X=b[0]+x/b[4];if(X<440)right++;else left++;
     if(n.startsWith('eye_left')){if(X>=482)front++;else rear++;}
     else{if(X<=404.65)front++;else rear++;}
     diff[i]=210;diff[i+1]=25;diff[i+2]=60;
    }
   }
   await sharp(diff,{raw:{width:b[2]*b[4],height:b[3]*b[4],channels:3}}).png().toFile(path.join(E,n.replace('.svg','-difference.png')));
   metrics.tests[n]={changed_high_res_pixels:total,changed_eye_left:left,changed_eye_right:right,changed_hair_front_fragment:front,changed_main_fragment:rear};
  }
 }
 for(const eye of ['eye_left','eye_right']){
  const z=eye==='eye_left'?[451,188,39,22,40]:[398,188,38,22,40];
  const rec={};
  for(const kind of ['aperture','iris']){
   const png=await render(fs.readFileSync(path.join(E,`${eye}-mask-${kind}.svg`),'utf8'),z);
   await sharp(png).toFile(path.join(E,`${eye}-mask-${kind}.png`));
   const raw=await sharp(png).raw().toBuffer(),W=z[2]*z[4],H=z[3]*z[4];let minx=W,miny=H,maxx=-1,maxy=-1;const scans={};
   for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(raw[(y*W+x)*3]<128){minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y)}
   for(const Y of [197.5,198.5,199.5,200.5,201.5,202.5]){
    const yy=Math.round((Y-z[1])*z[4]);let l=W,r=-1;
    for(let x=0;x<W;x++)if(raw[(yy*W+x)*3]<128){l=Math.min(l,x);r=Math.max(r,x)}
    scans[Y]=r>=0?[z[0]+l/z[4],z[0]+(r+1)/z[4]]:null;
   }
   rec[kind]={bbox:[z[0]+minx/z[4],z[1]+miny/z[4],z[0]+(maxx+1)/z[4],z[1]+(maxy+1)/z[4]],width:(maxx-minx+1)/z[4],height:(maxy-miny+1)/z[4],scans};
  }
  rec.visible_iris_width_over_aperture_width=rec.iris.width/rec.aperture.width;
  rec.visible_iris_height_over_aperture_height=rec.iris.height/rec.aperture.height;
  metrics.eyes[eye]=rec;
  const seq=['eyes-test-baseline.png',eye+'-lash-moved.png',eye+'-lash-edited.png'];
  const focus=eye==='eye_left'?[451,188,39,22]:[398,188,38,22];
  const w=focus[2]*20,h=focus[3]*20;
  let ims=[];for(const n of seq){ims.push(await sharp(path.join(E,n)).extract({left:(focus[0]-b[0])*20,top:(focus[1]-b[1])*20,width:w,height:h}).png().toBuffer())}
  await sharp({create:{width:w*3+24,height:h,channels:3,background:'#ccc'}}).composite(ims.map((input,i)=>({input,left:i*(w+12),top:0}))).png().toFile(path.join(E,eye+'-lash-test-triptych.png'));
 }
 fs.writeFileSync(path.join(E,'independent-measurements.json'),JSON.stringify(metrics,null,2));
 // Source pixels remain untouched; overlay grid separately for reading source coordinates.
 for(const[eye,z]of Object.entries({eye_left:[452,190,36,17,34],eye_right:[400,190,34,17,34]})){
  const[x,y,w,h,k]=z,pad=40;
  const ref=await sharp(src).extract({left:x,top:y,width:w,height:h}).resize(w*k,h*k,{kernel:'nearest'}).png().toBuffer();
  let draw=`<svg xmlns="http://www.w3.org/2000/svg" width="${w*k+pad}" height="${h*k+pad}">`;
  for(let i=0;i<=w;i++)draw+=`<path d="M${pad+i*k} ${pad}V${pad+h*k}" stroke="#ff00aa" stroke-opacity=".16" stroke-width="1"/>`;
  for(let j=0;j<=h;j++)draw+=`<path d="M${pad} ${pad+j*k}H${pad+w*k}" stroke="#ff00aa" stroke-opacity=".16" stroke-width="1"/>`;
  for(let i=0;i<w;i++)draw+=`<text x="${pad+i*k+2}" y="27" font-family="Arial" font-size="13">${x+i}</text>`;
  for(let j=0;j<h;j++)draw+=`<text x="3" y="${pad+j*k+22}" font-family="Arial" font-size="13">${y+j}</text>`;
  draw+='</svg>';
  await sharp({create:{width:w*k+pad,height:h*k+pad,channels:3,background:'white'}}).composite([{input:ref,left:pad,top:pad},{input:Buffer.from(draw),left:0,top:0}]).png().toFile(path.join(E,eye+'-source-coordinate-grid.png'));
 }
}
main().catch(e=>{console.error(e);process.exit(1)});

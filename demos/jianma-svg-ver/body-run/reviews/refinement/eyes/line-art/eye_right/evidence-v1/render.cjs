const fs=require('fs');
const path=require('path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=path.resolve('reviews/refinement/eyes/line-art/eye_right/evidence-v1');
(async()=>{for(const name of ['candidate-full','baseline-full','candidate-eye','candidate-nohair','eye-isolated','sclera-complete','gaze-complete','upper-lashes','lower-lashes','candidate-guides']){
  const svg=fs.readFileSync(path.join(out,name+'.svg'));
  const result=await sharp(svg).png().toFile(path.join(out,name+'.png'));
  console.log(name,result.width,result.height);
}})().catch(e=>{console.error(e);process.exit(1)});

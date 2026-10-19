const fs=require('fs');const path=require('path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const p='refinement/groups/eyes/4.逐眼着色/eye_right/4.3.睫毛与眼皮着色';
(async()=>{
 await sharp(path.join(p,'character.svg')).png().toFile(path.join(p,'preview.png'));
 await sharp('refinement/groups/eyes/4.逐眼着色/eye_right/4.2.眼黑颜色与层次/character.svg').png().toFile(path.join(p,'evidence/input-rerender.png'));
 for(const name of fs.readdirSync(path.join(p,'evidence')).filter(x=>x.endsWith('.svg'))){await sharp(path.join(p,'evidence',name)).png().toFile(path.join(p,'evidence',name.replace(/\.svg$/,'.png')));}
 console.log('Rendered preview and 10 evidence views.');
})().catch(e=>{console.error(e);process.exit(1)});

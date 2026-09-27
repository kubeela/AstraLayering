const fs=require('fs'),path=require('path'),sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const p='refinement/groups/eyes/4.逐眼着色/eye_right/4.4.眼周皮肤明暗';
(async()=>{
 await sharp(path.join(p,'character.svg')).png().toFile(path.join(p,'preview.png'));
 await sharp('refinement/groups/eyes/4.逐眼着色/eye_right/4.3.睫毛与眼皮着色/character.svg').png().toFile(path.join(p,'evidence/input-rerender.png'));
 for(const n of fs.readdirSync(path.join(p,'evidence')).filter(x=>x.endsWith('.svg')))await sharp(path.join(p,'evidence',n)).png().toFile(path.join(p,'evidence',n.replace(/\.svg$/,'.png')));
 console.log('Rendered skin candidate, off-state and layer evidence.');
})().catch(e=>{console.error(e);process.exit(1)});

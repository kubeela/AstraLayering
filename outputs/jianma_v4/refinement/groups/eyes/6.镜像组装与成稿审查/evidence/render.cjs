const fs=require('fs'),path=require('path'),sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const p='refinement/groups/eyes/6.镜像组装与成稿审查';
(async()=>{
 await sharp(path.join(p,'character.svg')).png().toFile(path.join(p,'preview.png'));
 await sharp('refinement/groups/eyes/5.逐眼投影与高光/eye_right/character.svg').png().toFile(path.join(p,'evidence/input-rerender.png'));
 for(const n of fs.readdirSync(path.join(p,'evidence')).filter(x=>x.endsWith('.svg')))await sharp(path.join(p,'evidence',n)).png().toFile(path.join(p,'evidence',n.replace(/\.svg$/,'.png')));
 console.log('Rendered assembly candidate and control evidence.');
})().catch(e=>{console.error(e);process.exit(1)});

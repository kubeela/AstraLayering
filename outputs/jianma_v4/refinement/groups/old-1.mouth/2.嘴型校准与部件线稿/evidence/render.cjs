const fs=require('fs'),path=require('path'),sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const p='refinement/groups/mouth/2.嘴型校准与部件线稿';
(async()=>{
 await sharp(path.join(p,'character.svg')).png().toFile(path.join(p,'preview.png'));
 await sharp('refinement/groups/eyes/6.镜像组装与成稿审查/character.svg').png().toFile(path.join(p,'evidence/input-rerender.png'));
 for(const n of fs.readdirSync(path.join(p,'evidence')).filter(x=>x.endsWith('.svg')))await sharp(path.join(p,'evidence',n)).png().toFile(path.join(p,'evidence',n.replace(/\.svg$/,'.png')));
 console.log('Rendered mouth candidate and neutral structure views.');
})().catch(e=>{console.error(e);process.exit(1)});

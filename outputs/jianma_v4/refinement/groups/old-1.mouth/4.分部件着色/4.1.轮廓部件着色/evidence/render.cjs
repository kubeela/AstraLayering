const fs=require('fs'),path=require('path'),sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const p='refinement/groups/mouth/4.分部件着色/4.1.轮廓部件着色';
(async()=>{
 await sharp(path.join(p,'character.svg')).png().toFile(path.join(p,'preview.png'));
 for(const n of fs.readdirSync(path.join(p,'evidence')).filter(x=>x.endsWith('.svg')))await sharp(path.join(p,'evidence',n)).png().toFile(path.join(p,'evidence',n.replace(/\.svg$/,'.png')));
 console.log('Rendered stage 4.1 candidate and direct diagnostic views.');
})().catch(e=>{console.error(e);process.exit(1)});

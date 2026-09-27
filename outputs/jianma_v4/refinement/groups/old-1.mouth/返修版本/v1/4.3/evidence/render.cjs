const fs=require('fs'),path=require('path'),sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const p='refinement/groups/mouth/4.分部件着色/4.3.唇部颜色与层次';
(async()=>{
 await sharp(path.join(p,'character.svg')).png().toFile(path.join(p,'preview.png'));
 for(const n of fs.readdirSync(path.join(p,'evidence')).filter(x=>x.endsWith('.svg')))await sharp(path.join(p,'evidence',n)).png().toFile(path.join(p,'evidence',n.replace(/\.svg$/,'.png')));
 console.log('Rendered stage 4.3 candidate and lip material evidence.');
})().catch(e=>{console.error(e);process.exit(1)});

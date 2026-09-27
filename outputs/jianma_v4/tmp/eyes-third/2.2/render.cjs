const path=require('node:path'), fs=require('node:fs');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..');
const out=path.join(root,'refinement/groups/eyes/2.逐眼线稿/eye_left/2.2.眼内部件线稿');
(async()=>{
 await sharp(path.join(out,'character.svg')).flatten({background:'#fff'}).png().toFile(path.join(out,'preview.png'));
 for(const name of fs.readdirSync(__dirname).filter(x=>x.endsWith('.svg')))await sharp(path.join(__dirname,name)).flatten({background:'#fff'}).png().toFile(path.join(__dirname,name.replace('.svg','.png')));
 console.log('Rendered full preview, direct vector details and source-geometry masks.');
})().catch(e=>{console.error(e);process.exit(1)});

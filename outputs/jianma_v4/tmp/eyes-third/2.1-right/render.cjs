const fs=require('node:fs');
const path=require('node:path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..');
const out=path.join(root,'refinement/groups/eyes/2.逐眼线稿/eye_right/2.1.轮廓部件线稿');
(async()=>{
 await sharp(path.join(out,'character.svg')).flatten({background:'#fff'}).png().toFile(path.join(out,'preview.png'));
 for(const name of fs.readdirSync(__dirname).filter(n=>n.endsWith('.svg'))){
  await sharp(path.join(__dirname,name)).flatten({background:'#fff'}).png().toFile(path.join(__dirname,name.replace(/\.svg$/,'.png')));
 }
 console.log('Full preview and direct SVG crops rendered.');
})().catch(e=>{console.error(e);process.exit(1)});

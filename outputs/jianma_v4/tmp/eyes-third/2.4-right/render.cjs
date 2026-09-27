const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'refinement/groups/eyes/2.逐眼线稿/eye_right/2.4.关联遮挡与线稿校准');
(async()=>{
 await sharp(path.join(out,'character.svg')).flatten({background:'#fff'}).png().toFile(path.join(out,'preview.png'));
 for(const name of fs.readdirSync(__dirname).filter(n=>n.endsWith('.svg')))await sharp(path.join(__dirname,name)).flatten({background:'#fff'}).png().toFile(path.join(__dirname,name.replace(/\.svg$/,'.png')));
 console.log('Rendered full preview, head/eye crops, components and real-hair linkage checks.');
})().catch(e=>{console.error(e);process.exit(1)});

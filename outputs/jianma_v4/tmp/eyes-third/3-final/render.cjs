const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'refinement/groups/eyes/3.双眼线稿组装与审查');
async function renderDir(dir){for(const n of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,n.name);if(n.isDirectory())await renderDir(p);else if(n.name.endsWith('.svg'))await sharp(p).flatten({background:'#fff'}).png().toFile(p.replace(/\.svg$/,'.png'));}}
(async()=>{await sharp(path.join(out,'character.svg')).flatten({background:'#fff'}).png().toFile(path.join(out,'preview.png'));await renderDir(__dirname);console.log('Rendered complete assembly and both independent eye evidence sets.');})().catch(e=>{console.error(e);process.exit(1)});

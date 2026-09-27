const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{for(const n of fs.readdirSync(__dirname).filter(x=>x.endsWith('.svg')))await sharp(path.join(__dirname,n)).flatten({background:'#fff'}).png().toFile(path.join(__dirname,n.replace('.svg','.png')));console.log('Rendered mirror diagnostics.');})().catch(e=>{console.error(e);process.exit(1)});

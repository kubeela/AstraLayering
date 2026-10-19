const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const p='reviews/refinement/eyes/evidence-v1';
(async()=>{for(const n of fs.readdirSync(p).filter(n=>n.endsWith('.svg'))){await sharp(path.join(p,n)).png().toFile(path.join(p,n.replace(/\.svg$/,'.png')));}console.log('Independent candidate and control renders completed.');})().catch(e=>{console.error(e);process.exit(1)});

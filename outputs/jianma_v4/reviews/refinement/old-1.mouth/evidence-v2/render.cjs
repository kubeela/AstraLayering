const fs=require('fs'),path=require('path'),sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const p='reviews/refinement/mouth/evidence-v2';
(async()=>{for(const n of fs.readdirSync(p).filter(n=>n.endsWith('.svg'))) await sharp(path.join(p,n)).png().toFile(path.join(p,n.replace(/\.svg$/,'.png')));fs.writeFileSync(path.join(p,'renderer.json'),JSON.stringify(sharp.versions,null,2));console.log('v2 independent render complete.');})().catch(e=>{console.error(e);process.exit(1)});

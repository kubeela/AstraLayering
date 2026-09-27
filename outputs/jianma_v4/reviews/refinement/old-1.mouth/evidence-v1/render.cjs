const fs=require('fs'),path=require('path'),sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out='reviews/refinement/mouth/evidence-v1';
(async()=>{for(const file of fs.readdirSync(out).filter(x=>x.endsWith('.svg')))await sharp(path.join(out,file)).png().toFile(path.join(out,file.replace(/\.svg$/,'.png')));fs.writeFileSync(path.join(out,'renderer.json'),JSON.stringify(sharp.versions,null,2));console.log('Independent SVG render complete.');})().catch(e=>{console.error(e);process.exit(1)});

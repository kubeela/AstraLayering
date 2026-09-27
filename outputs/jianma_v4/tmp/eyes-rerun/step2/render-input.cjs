const fs = require('fs');
const sharp = require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = 'tmp/eyes-rerun/step2';
(async()=>{
 let svg=fs.readFileSync('refinement/groups/face/6.投影与高光效果/character.svg');
 await sharp(svg).png().toFile(root+'/input.png');
 let txt=svg.toString().replace('width="941" height="1672" viewBox="0 0 941 1672"','width="1320" height="492" viewBox="390 178 110 41"');
 await sharp(Buffer.from(txt)).png().toFile(root+'/input-eyes-12x.png');
})().catch(e=>{console.error(e);process.exit(1)});

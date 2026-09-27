const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname,'../../..');
const out = path.join(root,'refinement/groups/eyes/2.逐眼线稿/eye_left/2.1.轮廓部件线稿');
(async()=>{
 await sharp(path.join(out,'character.svg')).flatten({background:'#fff'}).png().toFile(path.join(out,'preview.png'));
 for(const name of ['candidate-eye-direct-30x','candidate-eye-native','construction-direct-30x','sclera-uncovered-direct-30x','face-context-direct-8x']) {
  await sharp(path.join(__dirname,name+'.svg')).flatten({background:'#fff'}).png().toFile(path.join(__dirname,name+'.png'));
 }
 console.log('Rendered full preview and direct vector crops.');
})().catch(e=>{console.error(e);process.exit(1)});

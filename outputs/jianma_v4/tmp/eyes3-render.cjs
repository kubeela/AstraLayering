const sharp = require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs');const out='refinement/groups/eyes/3.关联部件校准';
(async()=>{
await sharp(fs.readFileSync(out+'/character.svg')).flatten({background:'#ffffff'}).png().toFile(out+'/preview.png');
for(const mode of ['no-front-hair','no-front-hair-and-cast-shadows']) await sharp(fs.readFileSync(out+'/evidence/'+mode+'.svg')).flatten({background:'#ffffff'}).png().toFile(out+'/evidence/'+mode+'.png');
await sharp(fs.readFileSync(out+'/evidence/hair-after.svg')).png().toFile(out+'/evidence/hair-after.png');
})();

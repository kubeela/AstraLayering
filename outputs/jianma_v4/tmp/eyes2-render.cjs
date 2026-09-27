const sharp = require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('fs');
const out='refinement/groups/eyes/2.眼型校准与轮廓部件绘制';
(async()=>{
await sharp(fs.readFileSync(out+'/character.svg')).flatten({background:'#ffffff'}).png().toFile(out+'/preview.png');
for(const mode of ['no-eye-black','no-eyes','contours-only']) await sharp(fs.readFileSync(out+'/evidence/'+mode+'.svg')).png().toFile(out+'/evidence/'+mode+'.png');
})();


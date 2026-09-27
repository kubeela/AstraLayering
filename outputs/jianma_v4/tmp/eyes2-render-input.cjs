const sharp = require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('fs');
const root = process.cwd();
(async()=>{
const src='refinement/groups/face/6.投影与高光效果/character.svg';
const out='refinement/groups/eyes/2.眼型校准与轮廓部件绘制/evidence';
await sharp(fs.readFileSync(src)).png().toFile(out+'/input-render.png');
})();

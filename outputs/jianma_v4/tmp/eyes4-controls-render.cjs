const sharp=require('C:/Users/22129/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');const out='refinement/groups/eyes/4.眼周肤色与局部层次/evidence';
(async()=>{await sharp(out+'/baseline-no-eyes.svg').flatten({background:'#fff'}).png().toFile(out+'/baseline-no-eyes.png');await sharp(out+'/skin-only.svg').png().toFile(out+'/skin-only.png');})();

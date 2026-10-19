import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {readGroupPrompt,readGroupReferences} from '../group-prompts.ts';
import {createBitmapTool} from '../bitmap-tool.ts';
const root=resolve('.run/hair-reference-wiring-20261015');
await mkdir(root,{recursive:true});
const prompt=await readGroupPrompt('hair','children');
const refs=await readGroupReferences(prompt.groupDirectory,'children');
if(refs.length!==3)throw Error('Expected the three configured hair boards');
const view=createBitmapTool(root,join(root,'observations'),refs.map(r=>r.path));
const signal=new AbortController().signal,checks=[];
for(const r of refs){
  const before=await readFile(r.path),hash=createHash('sha256').update(before).digest('hex');
  const result=await view.execute({path:r.path},signal);
  if(result.contentItems[1].type!=='inputImage')throw Error('No actual model image returned');
  const meta=JSON.parse(result.contentItems[0].text);
  if(!(await readFile(r.path)).equals(before))throw Error('Reference pixels changed');
  checks.push({path:r.path,description:r.description,sha256:hash,width:meta.width,height:meta.height,preview:meta.savedPath});
}
// Existing production facts remain untouched by this image-wiring check.
const production=resolve('.run/test-children-20261015');
const baseline=JSON.parse(await readFile(join(production,'previews/hair-current/manifest.json'),'utf8'));
for(const n of baseline.nodes){
  const actual=createHash('sha256').update(await readFile(join(production,n.path))).digest('hex');
  if(actual!==n.hash)throw Error('Production SVG changed: '+n.id);
}
await writeFile(join(root,'verification.json'),JSON.stringify({prompt:prompt.path,references:checks,
  modelCallMade:false,actualImageReturns:checks.length,productionHairSvgHashesUnchanged:baseline.nodes.length},null,2));
console.log(JSON.stringify({report:join(root,'verification.json'),actualImageReturns:checks.length,
  productionHairSvgHashesUnchanged:baseline.nodes.length}));

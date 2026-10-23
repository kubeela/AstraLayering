import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {renderPrompt,renderPromptFile} from '../prompts/render.ts';
import {preparationImagePrompt} from '../prompts/preparation.ts';

test('模板明确要求变量和必要插入位置，填入的数据不进行二次求值',()=>{
  assert.throws(()=>renderPrompt('正文 {runtime_context}',{}),/缺少提示词变量/);
  assert.throws(()=>renderPrompt('自定义正文',{runtime_context:'data'},'custom',['runtime_context']),/缺少显式提示词占位符/);
  assert.equal(renderPrompt('{task_prompt} / {runtime_context}',{task_prompt:'原文 {runtime_context}',runtime_context:'本次数据'}),'原文 {runtime_context} / 本次数据');
});
test('人物和衣服源 Markdown 都能直接看到生图规则占位符，展开后没有遗漏或重复规则',async()=>{
  for(const [path,kind] of [
    ['../../part-layering/prompts/0-标准姿态.md','standardize'],
    ['../../part-layering/prompts/2-简化图片.md','image'],
    ['../../part-layering/prompts/3-素体参考.md','image'],
    ['../../clothing-part-layering/prompts/preparation.md','clothing'],
  ] as const){
    const source=await readFile(new URL(path,import.meta.url),'utf8');assert.ok(source.includes('{image_execution_rules}'));
    const prompt=preparationImagePrompt(source.replaceAll('{width}','24').replaceAll('{height}','32'),kind);
    assert.ok(!prompt.includes('{image_execution_rules}'));assert.match(prompt,/image_generation 是生图工具的概念总称/);
    assert.equal(prompt.split('【执行规则】').length,2);
  }
});
test('外层 CLI、交接与背景适配也由 Markdown 声明替换位置',()=>{
  const cli=renderPromptFile(new URL('../prompts/cli-turn.md',import.meta.url),{task_prompt:'task',workspace:'request dir',working_directory:'task dir'});
  assert.match(cli,/task[\s\S]*request dir[\s\S]*task dir/);
  const image=renderPromptFile(new URL('../prompts/image-request.md',import.meta.url),{drawing_prompt:'原绘图要求',background_instructions:'背景要求'});
  assert.ok(image.startsWith('原绘图要求\n\n背景要求'));
});

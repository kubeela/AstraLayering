import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderPrompt,renderPromptFile} from '../prompts/render.ts';
import {checkKnowledge,defaultKnowledgeDirectory,renderKnowledge,runtimePrompt,stepKnowledge} from '../knowledge.ts';

test('模板明确要求变量和必要插入位置，填入的数据不进行二次求值',()=>{
  assert.throws(()=>renderPrompt('正文 {runtime_context}',{}),/缺少提示词变量/);
  assert.throws(()=>renderPrompt('自定义正文',{runtime_context:'data'},'custom',['runtime_context']),/缺少显式提示词占位符/);
  assert.equal(renderPrompt('{task_prompt} / {runtime_context}',{task_prompt:'原文 {runtime_context}',runtime_context:'本次数据'}),'原文 {runtime_context} / 本次数据');
});
test('姿态与衣服提示词明确声明共享规则位置，展开后没有遗漏或重复规则',async()=>{
  for(const [section,step] of [
    ['part-layering','step04_standard'],
    ['clothing-part-layering','step01_preparation'],
  ] as const){
    const prompt=stepKnowledge(section,step).render('main',{width:'24',height:'32',input:'/task/input.png'},{taskRoot:'/task'});
    assert.ok(!/\{[a-z_]+\}/.test(prompt));assert.match(prompt,/生图工具 imagegen（Codex 为内置 image_gen\.imagegen/);
    assert.equal(prompt.split('【执行规则】').length,2);
  }
});
test('外层 CLI、交接与背景适配也由 Markdown 声明替换位置',()=>{
  const cli=runtimePrompt('agent-turn',{},{taskRoot:'/runs/case'});
  assert.match(cli,/任务根目录：\/runs\/case。[\s\S]*当前工作区：当前目录/);
  const image=renderPromptFile(new URL('../prompts/image-request.md',import.meta.url),{drawing_prompt:'原绘图要求',background_instructions:'背景要求'});
  assert.ok(image.startsWith('原绘图要求\n\n背景要求'));
});
test('先验知识只替换已知变量和路径前缀，其余花括号原样保留',()=>{
  const text=renderKnowledge('{known} {unknown} {"json":1} {uri:a/{layer_depth}/{other}.svg} {shared_reference:x.png}',{known:'值',layer_depth:'2'},{taskRoot:'/runs/case'});
  assert.equal(text,`值 {unknown} {"json":1} /runs/case/a/2/{other}.svg ${defaultKnowledgeDirectory}shared/references/x.png`);
  assert.throws(()=>renderKnowledge('{reference:x.png}',{}),/需要所属管线/);
});
test('默认先验知识目录完整可用',()=>{ checkKnowledge(defaultKnowledgeDirectory); });

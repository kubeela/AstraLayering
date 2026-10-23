import {staticPromptPrefix} from './prompt-prefix.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {buildPrompt} from '../raster/steps.ts';
import {buildReviewPrompt} from '../raster/review.ts';
import {steps as character} from '../../raster-layering/steps.ts';
import {steps as clothing} from '../../clothing-raster-layering/steps.ts';
import {buildPrompt as assembly, steps as assembled} from '../../character-assembly/steps.ts';
import {buildPrompt as shadow, maskSteps, mapSteps} from '../../shadow/steps.ts';

test('人物衣服绘制/review/返修、组装和两种阴影共用完整环境说明，保留原任务正文', async () => {
  const common = await readFile(new URL('../krita/environment.md',import.meta.url),'utf8');
  const krita = {executable: '/fixture/krita', version: 'fixture'};
  const prompts: string[] = [];
  for (const steps of [character,clothing]) {
    for(const step of steps) {
      const prompt = await buildPrompt(step,{directory:'/fixture/input',parts:'/fixture/parts'},'/fixture/output/step01',krita);
      const body = await readFile(step.prompt,'utf8');
      assert.ok(prompt.startsWith(staticPromptPrefix(body)));
      assert.doesNotMatch(prompt, /\{(?:krita_environment|runtime_context|drawing_responsibilities|drawing_report_filename)\}/);
      prompts.push(prompt);
      if ('review' in step && step.review) for(const kind of ['review','repair'] as const) prompts.push(await buildReviewPrompt(step,
        {kind,filename:kind === 'review' ? 'review-01.md':'repair-01.md',index:kind === 'review'?0:1},krita));
    }
  }
  prompts.push(await assembly(assembled[0],{characterKra:'/fixture/body.kra',clothingKra:'/fixture/clothes.kra',simplifiedCharacter:'/fixture/reference.png'},'/fixture/output',krita));
  for(const step of [...maskSteps,...mapSteps]) prompts.push(await shadow(step,
    {characterKra:'/fixture/assembled.kra',characterColor:'/fixture/assembled.png',simplifiedCharacter:'/fixture/reference.png',structureFiles:[]},'/fixture/output',krita));
  for(const prompt of prompts) {
    assert.ok(prompt.includes(common)); assert.equal(prompt.split(common).length,2);
    assert.match(prompt,/【工作流附加：Krita 共用环境说明】\n来源文件（绝对路径）：.*shared\/krita\/environment\.md/);
    assert.ok(prompt.includes('【共用环境说明结束】'));
    assert.doesNotMatch(prompt,/execute_krita_python|run-krita-plugin/);
  }
});

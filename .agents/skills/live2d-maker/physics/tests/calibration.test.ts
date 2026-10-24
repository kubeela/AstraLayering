import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {componentDefaults} from '../../shared/physics-core/component-physics-schema.js';
import {groupAssemblies} from '../../shared/physics-core/assemblies.js';
import {calibrate,measureCandidate,parameterCandidate,selectCandidate,validateCalibration} from '../calibration.ts';
import {json} from '../input.ts';
const strand=(id:string,x=60)=>({id,name:id,kind:'strand',priority:'primary',enabled:true,layerRefs:[{uuid:id,contentHash:'a'.repeat(64)}],sourcePartIds:[id],supports:[{id:'root',at:[x,20]}],...componentDefaults('strand'),authoring:{freeLength:130,transitionPixels:20,fixedRegions:[[[x-20,0],[x+20,0],[x+20,30],[x-20,30]]],centerline:[[x,20],[x,70],[x,140]],widths:[20,20,15]}});
const config=(components:any[])=>({kind:'astra-component-physics',version:1,solver:'astra-component-physics-1',source:{canvas:{width:300,height:200}},components});

test('有向挂点决定完整装配，独立源分组和重排序身份稳定',()=>{
  const a=strand('ribbon'),b=strand('ring'),c=strand('pendant'),d=strand('hair');b.supports[0]={id:'neck',at:[60,140],componentId:'ribbon'} as any;c.supports[0]={id:'hook',at:[60,150],componentId:'ring'} as any;
  const groups=groupAssemblies(config([a,b,c,d])),linked=groups.find(g=>g.componentIds.includes('ribbon'))!;
  assert.equal(groups.length,2);assert.deepEqual(linked.componentIds,['pendant','ribbon','ring']);assert.deepEqual(linked.roots,['ribbon']);assert.deepEqual(linked.links.map(l=>[l.parent,l.child]),[['ribbon','ring'],['ring','pendant']]);
  assert.deepEqual(groupAssemblies(config([d,c,b,a])).map(g=>g.id),groups.map(g=>g.id));
});
test('标定参数保持原几何／限幅，不可修改组外组件',()=>{
  const c=config([strand('a'),strand('b',180)]),original=structuredClone(c);
  assert.throws(()=>parameterCandidate(c,['a'],{id:'wide',parameters:{a:{limits:{maxAngle:45}} as any}}),/只能调整/);
  assert.throws(()=>parameterCandidate(c,['a'],{id:'other',parameters:{b:{response:{frequencyHz:1}}}}),/组之外/);
  assert.throws(()=>parameterCandidate(c,['a'],{id:'invalid',parameters:{a:{response:{frequencyHz:NaN}}}}),/无效标定/);
  const next=parameterCandidate(c,['a'],{id:'slow',parameters:{a:{response:{frequencyHz:.7}}}});
  assert.deepEqual(c,original);assert.deepEqual(next.config.components[0].limits,c.components[0].limits);assert.deepEqual(next.config.components[0].authoring,c.components[0].authoring);assert.equal(next.changes.length,1);
});
test('相同固定步输入得到相同响应曲线，保留微风与停止回落',async()=>{
  const c=config([strand('a')]),a=await measureCandidate(c,['a']),b=await measureCandidate(c,['a']);
  assert.deepEqual(a,b);assert.equal(a.inputScale,130);assert.equal(a.metrics.airflow.a.samples.length,161);assert(a.metrics.airflow.a.peak>0);assert.equal(a.metrics['light-brush'].a.root,0);assert.equal(a.metrics['support-release'].a.invalid,0);
});
test('逐组选择候选不会回滚其它组，基线可恢复，绑定变化使旧标定失效',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'astra-calibration-'));
  try{
    const c=config([strand('a'),strand('b',180)]),ids=groupAssemblies(c).map(g=>g.id);
    for(const [i,id]of ids.entries())await calibrate(c,directory,id,'平缓释放',[{id:'slow',parameters:{[c.components[i].id]:{response:{frequencyHz:.7}}}}]);
    let selected=await selectCandidate(c,directory,ids[0],'slow','曲线保持根固定且平缓');assert.equal((await json(join(directory,'tuning.json'))).status,'draft');
    selected=await selectCandidate(selected,directory,ids[1],'slow','独立组同样比较后选择');assert.equal(selected.components[0].response.frequencyHz,.7);assert.equal(selected.components[1].response.frequencyHz,.7);await validateCalibration(selected,directory);
    selected=await selectCandidate(selected,directory,ids[0],'baseline','保留较活跃的原响应');assert.equal(selected.components[0].response.frequencyHz,c.components[0].response.frequencyHz);assert.equal(selected.components[1].response.frequencyHz,.7);await validateCalibration(selected,directory);
    selected.components[0].limits.maxAngle=17;await assert.rejects(validateCalibration(selected,directory),/约束或输入尺度改变/);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('每代最多三轮，同一请求恢复复用，几何更新归档旧代',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'astra-calibration-limit-'));
  try{
    const c=config([strand('a')]),id=groupAssemblies(c)[0].id;
    await calibrate(c,directory,id,'第 1 次',[]);assert.equal((await calibrate(c,directory,id,'第 1 次',[])).reused,true);
    await calibrate(c,directory,id,'第 2 次',[]);await calibrate(c,directory,id,'第 3 次',[]);await assert.rejects(calibrate(c,directory,id,'第 4 次',[]),/三轮标定/);
    c.components[0].limits.maxAngle=17;assert.equal((await calibrate(c,directory,id,'实际边界更新',[])).round.round,1);
    const entry=(await json(join(directory,'tuning.json'))).groups[0];assert.equal(entry.history[0].rounds.length,3);assert(!entry.rounds[0].candidates[0].path.startsWith('/'));
  }finally{await rm(directory,{recursive:true,force:true});}
});

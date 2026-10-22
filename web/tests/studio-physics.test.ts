import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClothBody, bindingDefaults, validateBinding, type PhysicsBinding } from '../studio/physics-model.js';
test('neutral pose is an equilibrium; fixed vertices remain exact under repeated extreme impulses', () => {
  for (const kind of ['cloth','ribbon']) for (const direction of ['down','up','left','right'] as const) {
    const b = new ClothBody({x:11,y:23,width:160,height:350},{...bindingDefaults(kind),enabled:true,direction});
    for(let i=0;i<10;i++)b.step();assert.deepEqual(b.positions,b.rest);
    for(let i=0;i<120;i++){
      if(i%6===0)b.impulse(90,190,(i%12?1:-1)*1e9,1e8,1000);
      b.step();assert(b.inspect().valid,`${kind}/${direction}/${i}`);
      assert(b.stats.travel<=b.maxDistance+1e-5);assert(b.stats.angle<=b.binding.maxAngle+1e-5);
      for(let j=0;j<b.weights.length;j++)if(!b.weights[j]){
        assert.equal(b.positions[j*2],b.rest[j*2]);assert.equal(b.positions[j*2+1],b.rest[j*2+1]);
      }
      for(let j=0;j<b.indices.length;j+=3){
        const a=b.indices[j]*2,c=b.indices[j+1]*2,d=b.indices[j+2]*2,p=b.positions;
        assert((p[c]-p[a])*(p[d+1]-p[a+1])-(p[c+1]-p[a+1])*(p[d]-p[a])>0,'triangle folded');
      }
    }
  }
});
test('cloth bends visibly, returns towards rest and resets without retaining velocity',()=>{
  const b=new ClothBody({x:0,y:0,width:100,height:300},{...bindingDefaults('ribbon'),enabled:true});
  b.impulse(50,290,450,0,240);let peak=0;
  for(let i=0;i<120;i++){b.step();peak=Math.max(peak,b.stats.travel);}
  assert(peak>5,'a rigid plate is not a valid ribbon preview');
  for(let i=0;i<600;i++)b.step();assert(b.stats.travel<.5);
  b.reset();assert.deepEqual(b.positions,b.rest);assert(b.velocity.every(v=>v===0));assert.equal(b.moving(),false);
});
test('hit testing uses the deformed triangle and original alpha, excluding transparent holes',()=>{
  const b=new ClothBody({x:0,y:0,width:100,height:300},{...bindingDefaults(),enabled:true});
  const alpha=new Uint8ClampedArray(100*300*4);
  for(let y=0;y<300;y++)for(let x=0;x<100;x++)alpha[(y*100+x)*4+3]=x>=40&&x<=60&&y>=140&&y<=160?0:255;
  const layers=[{bounds:{x:0,y:0,width:100,height:300},maskedRgba:alpha}];
  assert.equal(b.hit(50,150,layers),false);assert.equal(b.hit(5,150,layers),true);assert.equal(b.hit(-1,150,layers),false);
  b.impulse(50,290,450,0,240);for(let i=0;i<10;i++)b.step();
  assert.equal(b.hit(-20,150,layers),false);
});
test('restoring a draft rejects unsupported types, non-finite values and oversized authored limits',()=>{
  const d=bindingDefaults();assert.deepEqual(validateBinding(d),d);
  for(const change of [{maxTravel:1},{maxAngle:180},{stretch:NaN},{fixed:.95},{direction:'front'},{enabled:'yes'}])assert.throws(()=>validateBinding({...d,...change}));
  const b=new ClothBody({x:0,y:0,width:100,height:300},{...d,enabled:true});
  assert.throws(()=>b.step(1));b.impulse(0,0,Infinity,0,100);assert.deepEqual(b.positions,b.rest);
});

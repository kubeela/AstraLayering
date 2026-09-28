const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../tools/display-model.cjs');
function fixture(){return {subject:'character',groups:[
  {name:'face',display_order:10,groups:[
    {name:'face_base',groups:[]},
    {name:'eyes',display_order:30,groups:[],parts:[{name:'left_eye'},{name:'right_eye',display_order:0}]}
  ]},
  {name:'hair',display_order:20,groups:[{name:'bangs',groups:[]}]}
]};}
const values=data=>Object.fromEntries(model.resolve(data).map(item=>[item.path,item]));
test('nearest explicit ancestor supplies an independent global level; explicit zero is real',()=>{
  const entries=values(fixture());
  assert.equal(entries['face/face_base'].effective,10);
  assert.equal(entries['face/eyes/left_eye'].effective,30);
  assert.equal(entries['face/eyes/right_eye'].effective,0);
  assert.equal(entries['face/eyes/left_eye'].source,'face/eyes');
  assert.equal(entries['face/eyes'].leaf,false);
  assert.equal(entries['face/eyes/left_eye'].kind,'part');
});
test('parent change affects inheritors and leaves explicit subtrees independent',()=>{
  const data=fixture();model.setOrder(data,'face',80);
  const entries=values(data);
  assert.equal(entries['face/face_base'].effective,80);
  assert.equal(entries['face/eyes/left_eye'].effective,30);
  assert.equal(entries['face/eyes/right_eye'].effective,0);
});
test('clearing child settings restores inheritance without changing ownership',()=>{
  const data=fixture();model.setOrder(data,'face/eyes',null);
  model.setOrder(data,'face/eyes/right_eye',null);
  const entries=values(data);
  assert.equal(entries['face/eyes/left_eye'].effective,10);
  assert.equal(entries['face/eyes/right_eye'].source,'face');
  assert.equal(data.groups[0].groups[1].parts[1].name,'right_eye');
});
test('new parts inherit the former leaf group level without creating a painted parent',()=>{
  const data={groups:[{name:'eye',display_order:30,groups:[]}]};
  assert.equal(values(data).eye.leaf,true);
  data.groups[0].parts=[{name:'base'},{name:'upper_lid',display_order:40}];
  assert.equal(values(data).eye.leaf,false);
  assert.equal(values(data)['eye/base'].effective,30);
  assert.equal(values(data)['eye/upper_lid'].effective,40);
});
test('unset roots default to zero; invalid values, duplicate sibling names and child parts fail',()=>{
  assert.equal(model.resolve({groups:[{name:'base',groups:[]}]})[0].effective,0);
  for(const value of [NaN,Infinity,null,'20',false]){
    const data=fixture();data.groups[0].display_order=value;
    assert.throws(()=>model.resolve(data));
  }
  assert.throws(()=>model.resolve({groups:[{name:'eye',groups:[{name:'base',groups:[]}],parts:[{name:'base'}]}]}));
  assert.throws(()=>model.resolve({groups:[{name:'eye',groups:[],parts:[{name:'base',groups:[]}]}]}));
});

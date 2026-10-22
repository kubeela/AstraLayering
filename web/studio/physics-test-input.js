// Integer steps are the replay clock, shared by offline evidence and workbench.
export const inputVersion = 'astra-physics-tests-1';
export const testNames = ['neutral','tip-impulse','support-release','support-reverse','sustained','extreme','combined'];
const ease = t => {t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function applyTestInput(scene, test, step) {
  if(!testNames.includes(test)) throw Error('未知物理测试');
  const t=step/120;
  if(!scene.testSupportLengths){scene.testSupportLengths=new Map();for(const b of scene.bodies.values())for(const s of b.component.supports)if(!s.componentId)scene.testSupportLengths.set(s.id,Math.max(scene.testSupportLengths.get(s.id)||0,b.freeLength));}
  for(const body of scene.bodies.values()) {
    const c=body.component,L=body.freeLength,a=c.authoring;
    let x=0,angle=0;
    if(test==='support-release'||test==='combined') {x=L*.05*ease((t-.5)/.4)*(1-ease((t-1.6)/.4));angle=.035*x/(L*.05);}
    if(test==='support-reverse') x=t>=.5&&t<2.5?L*.04*Math.sin((t-.5)*Math.PI)*Math.pow(Math.sin((t-.5)*Math.PI/2),2):0;
    for(const s of c.supports) if(!s.componentId) scene.inputs.set(s.id,{x:x*(scene.testSupportLengths.get(s.id)/L),y:0,angle});
    const pulse=(test==='tip-impulse'||test==='extreme'||test==='combined')&&step===60;
    const sustained=test==='sustained'&&step>=60&&step<300&&step%12===0;
    if(pulse||sustained) {
      let best=0;for(let i=1;i<body.weights.length;i++)if(body.weights[i]>body.weights[best]||body.weights[i]===body.weights[best]&&Math.hypot(body.rest[i*2]-c.supports[0].at[0],body.rest[i*2+1]-c.supports[0].at[1])>Math.hypot(body.rest[best*2]-c.supports[0].at[0],body.rest[best*2+1]-c.supports[0].at[1]))best=i;
      const speed=L*(test==='extreme'?8:sustained?.08:.7);
      const dx=body.rest[best*2]-c.supports[0].at[0],dy=body.rest[best*2+1]-c.supports[0].at[1],length=Math.max(1,Math.hypot(dx,dy));
      body.impulse(body.positions[best*2],body.positions[best*2+1],speed*dy/length,-speed*dx/length,L*.45);
    }
  }
}

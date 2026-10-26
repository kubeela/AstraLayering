// One contact rule for actual pointer events and deterministic evidence.
// Coordinates, radius and velocity are in original canvas pixels.
export const pointerContactVersion = 'astra-pointer-contact-2';
export function sweptPointerContact(body, layers, from, to, radius) {
  const dx=to[0]-from[0],dy=to[1]-from[1];
  const steps=Math.min(12,Math.max(1,Math.ceil(Math.hypot(dx,dy)/Math.max(10,radius*.5))));
  for(let n=0;n<=steps;n++) {
    const x=from[0]+dx*n/steps,y=from[1]+dy*n/steps;
    if(body.hit(x,y,layers))return [x,y];
    for(let k=0;k<8;k++) {
      const a=k*Math.PI/4,qx=x+Math.cos(a)*radius*.65,qy=y+Math.sin(a)*radius*.65;
      if(body.hit(qx,qy,layers))return [qx,qy];
    }
  }
  return null;
}
export function pointerCommand(body,layers,from,to,dt,radius,force=1) {
  if(!(dt>0&&dt<.12)||!(radius>0))return null;
  const contact=sweptPointerContact(body,layers,from,to,radius);
  return contact?{type:'surface-impulse',id:body.component.id,args:[...contact,(to[0]-from[0])/dt*force,(to[1]-from[1])/dt*force,radius,dt*12]}:null;
}

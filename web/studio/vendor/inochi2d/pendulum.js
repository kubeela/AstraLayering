// SPDX-License-Identifier: BSD-2-Clause
// Copyright © 2022, Inochi2D Project. Original author: Asahi Lina.
// Port of Pendulum.eval/tick and PhysicsSystem.tick (RK4), Inochi2D v0.8.7
// e2235f6f29688d4013a0eec116a37ec8af8f1fb5. Source and license alongside.
export class InochiPendulum {
  constructor(body){this.body=body;this.reset();}
  reset(){this.angle=0;this.speed=0;this.bob=null;}
  step(h){
    const b=this.body,c=b.component,pivot=b.target(c.authoring.pivot),L=b.freeLength;
    if(this.bob)this.angle=Math.atan2(-(this.bob[0]-pivot[0]),this.bob[1]-pivot[1]);
    const g=(2*Math.PI*c.response.frequencyHz)**2,damp=2*Math.sqrt(g)*c.response.dampingRatio,wind=b.scene.airflow.x*.08*g;
    const acceleration=(a,v)=>-g*Math.sin(a)-damp*v-wind;
    const a=this.angle,v=this.speed,k1a=v,k1v=acceleration(a,v),k2a=v+h*k1v/2,k2v=acceleration(a+h*k1a/2,v+h*k1v/2),k3a=v+h*k2v/2,k3v=acceleration(a+h*k2a/2,v+h*k2v/2),k4a=v+h*k3v,k4v=acceleration(a+h*k3a,v+h*k3v);
    this.angle=a+h*(k1a+2*k2a+2*k3a+k4a)/6;this.speed=v+h*(k1v+2*k2v+2*k3v+k4v)/6;
    this.bob=[pivot[0]-Math.sin(this.angle)*L,pivot[1]+Math.cos(this.angle)*L];b.pivot=pivot;b.theta=this.angle;b.angularVelocity=this.speed;
  }
  reconcile(){const b=this.body;this.angle=b.theta;this.speed=b.angularVelocity;this.bob=[b.pivot[0]-Math.sin(this.angle)*b.freeLength,b.pivot[1]+Math.cos(this.angle)*b.freeLength];}
}

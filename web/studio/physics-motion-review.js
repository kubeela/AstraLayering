// Numerical rejection gates, not a substitute for animation/shape review.
export const motionReviewVersion='astra-motion-review-2';
export const motionStepBasis='inverse-sourcePose-only';

// Remove only the prescribed whole-character rigid pose. A component's own
// pose includes physical ancestor motion and must remain visible to the gate.
export class MotionStepTracker {
  constructor(canvas, length) {
    this.cx=canvas.width/2;this.cy=canvas.height/2;
    this.world=new Float64Array(length);this.source=new Float64Array(length);
    this.initialized=false;this.maxStep=0;this.maxWorldStep=0;
  }
  update(positions, pose) {
    const c=Math.cos(pose.angle),s=Math.sin(pose.angle);
    for(let i=0;i<positions.length;i+=2) {
      const x=positions[i]-this.cx-pose.x,y=positions[i+1]-this.cy-pose.y;
      const qx=c*x+s*y+this.cx,qy=-s*x+c*y+this.cy;
      if(this.initialized) {
        this.maxStep=Math.max(this.maxStep,Math.hypot(qx-this.source[i],qy-this.source[i+1]));
        this.maxWorldStep=Math.max(this.maxWorldStep,Math.hypot(positions[i]-this.world[i],positions[i+1]-this.world[i+1]));
      }
      this.source[i]=qx;this.source[i+1]=qy;
      this.world[i]=positions[i];this.world[i+1]=positions[i+1];
    }
    this.initialized=true;
  }
}
export function motionIssues(test, component, metric, steps=960){
  const issues=[],maximum=component.authoring.freeLength*component.limits.maxTravel;
  const ordinary=!['neutral','extreme','sustained','combined'].includes(test);
  if(metric.invalid)issues.push('invalid-mesh');
  if(metric.root>1e-5)issues.push('attachment-slip');
  if(ordinary&&metric.fallback/steps>.05)issues.push('persistent-retreat');
  if(ordinary&&metric.limited/steps>.35)issues.push('persistent-limit');
  if(['light-brush','tip-impulse','airflow'].includes(test)&&metric.peak<Math.max(.05,maximum*.005))issues.push('weak-response');
  if(ordinary&&metric.maxStep>Math.max(2,maximum*.2))issues.push('discontinuous-motion');
  if(!['neutral','extreme'].includes(test)&&metric.peak>.1&&metric.final>Math.max(.1,metric.peak*.08))issues.push('unsettled');
  return issues;
}

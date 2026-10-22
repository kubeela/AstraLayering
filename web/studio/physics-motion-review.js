// Numerical rejection gates, not a substitute for animation/shape review.
export const motionReviewVersion='astra-motion-review-1';
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

/** Display-only preparation on a clone. Never change source paths, colors or topology. */
export function prepareArtwork(svg){
 const shadow=svg.querySelector('#fx_body5_face_on_neck');
 if(!shadow||shadow.getAttribute('mask')!=='url(#outfit_inner_collar_neck_occlusion)')throw Error('Unexpected neck/collar source contract');
 // The collar is a separate, stationary layer. Baking its silhouette into a moving
 // neck texture makes that stationary hole move with the head. Draw the real collar
 // over the complete neck instead; the source SVG itself remains unchanged.
 shadow.removeAttribute('mask');
 return [{target:shadow.id,operation:'defer-collar-occlusion-to-draw-order',originalMask:'outfit_inner_collar_neck_occlusion'}];
}

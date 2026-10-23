import * as THREE from 'three';

// Caster and receiver compare the same filtered, per-pixel height. Interpolating
// a coarse triangle's height only in the caster creates self-shadow stripes.
export function surfaceDistanceMaterial(map, depth, scale, deformVertex = false) {
  const material = new THREE.MeshDistanceMaterial({ map, alphaTest: .5, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.uniforms.surfaceDepth = depth; shader.uniforms.surfaceDepthScale = scale;
    if (deformVertex) shader.vertexShader = 'uniform sampler2D surfaceDepth;uniform float surfaceDepthScale;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z=(texture2D(surfaceDepth,uv).r-0.5)*surfaceDepthScale;');
    const original = 'float dist = length( vWorldPosition - referencePosition );';
    if (!shader.fragmentShader.includes(original)) throw Error('Three.js surface shadow adapter needs review');
    shader.fragmentShader = 'uniform sampler2D surfaceDepth;uniform float surfaceDepthScale;\n' + shader.fragmentShader.replace(original, `float z=(texture2D(surfaceDepth,vMapUv).r-0.5)*surfaceDepthScale;
if(abs(z-vWorldPosition.z)>max(0.00002,0.09*abs(surfaceDepthScale)))discard;
float dist=length(vec3(vWorldPosition.xy,z)-referencePosition);`);
  };
  material.customProgramCacheKey = () => 'astra-surface-distance-1/' + deformVertex;
  return material;
}

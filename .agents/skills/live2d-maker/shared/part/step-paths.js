// Pure path identities shared by runners, migration and browser previews.
export const initialStepId = 'initial/step01';
export const groupDepth = id => id.split('/').length - 1;
export const groupSegments = id => id.split('/').flatMap((segment, index) => index ? ['children', segment] : [segment]);
export const groupStepId = (id, step) => ['groups', ...groupSegments(id), `step0${step}`].join('/');
export const layerStepId = depth => `layers/depth${String(depth + 1).padStart(2, '0')}`;
export const parentGroupId = id => id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : undefined;

/** Explicit rigging repairs applied to a clone. The pinned character.svg stays immutable. */
export function prepareArtwork(svg, supplemental) {
  const patches = [
    ['head_left_side_hair_main_lock_main_mass_fill', 2],
    ['head_right_side_hair_main_lock_main_mass_fill', 3],
  ];
  const changes = [];
  for (const [id, count] of patches) {
    const source = svg.querySelector('#' + id);
    if (!source) throw Error('Missing repair target ' + id);
    const before = source.getAttribute('d'), rings = before.match(/M[^M]*/g);
    if (rings.length !== count) throw Error('Unexpected contour topology: ' + id);
    // Ring 1 is explicitly documented as the unfilled earring occlusion region.
    // Preserve the real gaps between tresses and the right hand's separate hair island.
    const after = rings.filter((_, i) => i !== 1).join('');
    let copies = 0;
    for (const node of svg.querySelectorAll('path[d]')) if (node.getAttribute('d') === before) {
      node.setAttribute('d', after); copies++;
    }
    changes.push({id, operation: 'fill-earring-occlusion', maskCopiesUpdated: copies});
  }
  const doc = new DOMParser().parseFromString(supplemental, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw Error('Invalid supplemental SVG');
  const rear = svg.querySelector('#head_back_hair_fill'), oldRear = rear.getAttribute('d');
  const newRear = doc.querySelector('#repair-rear-silhouette').getAttribute('d');
  for (const node of svg.querySelectorAll('path[d]')) if (node.getAttribute('d') === oldRear) node.setAttribute('d', newRear);
  changes.push({id:'head_back_hair_fill',operation:'complete-occipital-silhouette'});
  const ns = 'http://www.w3.org/2000/svg';
  const definitions = document.createElementNS(ns, 'defs');
  for (const node of doc.documentElement.querySelector(':scope > defs').children) definitions.append(document.importNode(node, true));
  svg.prepend(definitions);
  for (const source of doc.documentElement.querySelectorAll(':scope > g')) {
    const target = source.getAttribute('data-repair-target');
    const node = document.importNode(source, true); node.removeAttribute('data-repair-target');
    if (target) {
      const parent = svg.querySelector('#' + target);
      if (!parent) throw Error('Missing supplemental target ' + target);
      if (source.getAttribute('data-repair-mode') === 'replace') parent.replaceChildren(node);
      else parent.append(node);
    } else svg.append(node);
    changes.push({id: source.id, operation: target ? 'supplement-hidden-hair' : 'neck-shoulder-bridge'});
  }
  return changes;
}

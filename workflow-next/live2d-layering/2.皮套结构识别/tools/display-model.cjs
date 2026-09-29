/* Shared by the workflow CLI and svg-preview.html: inheritance, never addition. */
(function (host) {
  'use strict';
  function resolve(document) {
    if (!document || !Array.isArray(document.groups)) throw new Error('缺少 groups 数组');
    const result = [], paths = new Set();
    function children(groups, parts, parent, inherited, source) {
      if (!Array.isArray(groups) || !Array.isArray(parts)) throw new Error('groups / parts 必须是数组');
      const names = new Set();
      for (const [kind, nodes] of [['group', groups], ['part', parts]]) for (const node of nodes) {
        if (!node || typeof node.name !== 'string' || !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(node.name) || names.has(node.name)) throw new Error('无效或重复的同级名称');
        names.add(node.name);
        const path = parent ? parent + '/' + node.name : node.name;
        if (paths.has(path)) throw new Error('重复路径：' + path);
        paths.add(path);
        const explicit = Object.prototype.hasOwnProperty.call(node, 'display_order');
        if (explicit && (typeof node.display_order !== 'number' || !Number.isFinite(node.display_order))) throw new Error('display_order 必须是有限数值：' + path);
        if (kind === 'part' && ('groups' in node || 'parts' in node)) throw new Error('part 不能有子节点：' + path);
        if (kind === 'group' && !Array.isArray(node.groups)) throw new Error('group 缺少 groups 数组：' + path);
        const effective = explicit ? node.display_order : inherited;
        const from = explicit ? path : source;
        const leaf = kind === 'part' || (!node.groups.length && !(node.parts || []).length);
        result.push({path, kind, parent, leaf, explicit: explicit ? node.display_order : null, effective, source: from});
        if (kind === 'group') children(node.groups, node.parts || [], path, effective, from);
      }
    }
    children(document.groups, [], '', 0, null);
    return result;
  }
  function nodeAt(document, path) {
    let nodes = document.groups, found;
    for (const name of path.split('/')) {
      found = nodes.find(node => node.name === name);
      if (!found) throw new Error('未知路径：' + path);
      nodes = [...(found.groups || []), ...(found.parts || [])];
    }
    return found;
  }
  function setOrder(document, path, value) {
    const node = nodeAt(document, path);
    if (value === null) delete node.display_order;
    else if (typeof value === 'number' && Number.isFinite(value)) node.display_order = value;
    else throw new Error('层级必须是有限数值，清除设置则恢复继承');
    return resolve(document);
  }
  function drawings(svg, document) {
    const entries = resolve(document), byPath = new Map(entries.map(entry => [entry.path, entry]));
    const seen = new Set(), ids = new Set(), result = [];
    for (const element of svg.children) {
      if (['defs', 'metadata', 'title', 'desc'].includes(element.localName)) continue;
      const part = element.getAttribute('data-part-path');
      const path = part || element.getAttribute('data-group-path');
      const entry = byPath.get(path);
      if (element.localName !== 'g' || !element.id || ids.has(element.id) || !entry?.leaf || (part ? entry.kind !== 'part' : entry.kind !== 'group')) throw new Error('SVG 绘制组与叶 group / part 不匹配：' + (path || element.id));
      if (part && element.getAttribute('data-group-path') !== entry.parent) throw new Error('part 归属不一致：' + part);
      if (element.querySelector('[data-group-path], [data-part-path]')) throw new Error('绘制单位应平铺；归属嵌套由 JSON 表达');
      ids.add(element.id); seen.add(path); result.push({element, entry});
    }
    const missing = entries.filter(entry => entry.leaf && !seen.has(entry.path));
    if (missing.length) throw new Error('缺少绘制单位：' + missing.map(entry => entry.path).join(', '));
    return result;
  }
  function apply(svg, document) {
    const units = drawings(svg, document);
    units.sort((a, b) => a.entry.effective - b.entry.effective); // stable for equal levels
    for (const {element, entry} of units) {
      element.setAttribute('data-display-order', String(entry.effective));
      element.setAttribute('data-display-source', entry.source || '');
      if (entry.explicit === null) element.removeAttribute('data-display-explicit');
      else element.setAttribute('data-display-explicit', String(entry.explicit));
      svg.appendChild(element);
    }
    let metadata = [...svg.children].find(element => element.localName === 'metadata' && element.id === 'group-structure');
    if (!metadata) {
      metadata = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'metadata');
      metadata.id = 'group-structure'; svg.insertBefore(metadata, svg.firstChild);
    }
    metadata.textContent = JSON.stringify(document);
    return resolve(document);
  }
  const api = {resolve, setOrder, drawings, apply};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else host.LayerDisplay = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

if (typeof require !== 'undefined' && require.main === module) {
  try { process.stdout.write(JSON.stringify(module.exports.resolve(JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'))))); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}

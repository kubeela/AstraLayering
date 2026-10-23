import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { nodeKind, walkGroups, writeAtomic } from './groups.ts';
import type { SvgMerger } from './layering-types.ts';
import { validateGroupSvg } from './svg-tools.ts';
import { editXmlAttributes, svgSource, xmlAttributes } from '../xml.ts';

const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Each part keeps its own SVG root, presentation attributes and coordinate system.
// Prefix local resource IDs so gradients, clips and hrefs cannot bind another part.
export function namespaceSvg(source: string, prefix: string): string {
  const parsed = svgSource(source);
  const ids = new Map(parsed.elements.filter(({ element }) => element.hasAttribute('id'))
    .map(({ element }) => { const id = element.getAttribute('id')!; return [id, `${prefix}-${id}`]; }));
  const resourceUrls = (value: string) => value.replace(/url\(\s*(['"]?)#([^\s)'";]+)\1\s*\)/g,
    (text, quote, id) => ids.has(id) ? `url(${quote}#${ids.get(id)}${quote})` : text);
  let result = source;
  for (const entry of [...parsed.elements].reverse()) {
    if (entry.element.localName === 'style') {
      let css = resourceUrls(result.slice(entry.openEnd, entry.closeStart));
      const cdata = css.startsWith('<![CDATA[') && css.endsWith(']]>');
      if (cdata) css = css.slice(9, -3);
      for (const [id, replacement] of ids) css = css.replace(new RegExp(`#${escapeRegex(id)}(?=[\\s.#:\\[>+~,({])`, 'g'), `#${replacement}`);
      // Workflow SVGs use ordinary static selector rules. Scope selectors to this
      // nested root; keep declarations and resource URLs unchanged.
      css = css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors: string, body: string) => {
        if (selectors.trim().startsWith('@') || /^\s*(?:from|to|[\d.,%\s]+)\s*$/.test(selectors)) return rule;
        return `${selectors.split(',').map(selector => `#${prefix} ${selector.trim()}`).join(', ')}{${body}}`;
      });
      result = result.slice(0, entry.openEnd) + (cdata ? '<![CDATA[' + css + ']]>' : css) + result.slice(entry.closeStart);
    }
    const updates: Record<string, string | null> = {};
    for (const [name, value] of Object.entries(xmlAttributes(entry.element))) {
      const replacement = name === 'id' ? ids.get(value)! : ['href', 'xlink:href'].includes(name) && value.startsWith('#') && ids.has(value.slice(1))
        ? '#' + ids.get(value.slice(1)) : resourceUrls(value);
      if (replacement !== value) updates[name] = replacement;
    }
    if (entry === parsed.root) { updates.x = '0'; updates.y = '0'; }
    if (Object.keys(updates).length) result = editXmlAttributes(result, entry, updates);
  }
  return `<g id="${prefix}">${result}</g>`;
}

export const mergePartSvgs: SvgMerger = async context => {
  if (!context.parts.length) throw new Error('没有可合并的终止 part');
  const first = await sharp(await readFile(context.parts[0].svg.path)).metadata();
  const canvas = { width: first.width!, height: first.height! };
  const leaves = new Map(context.parts.map(part => [part.groupId, part]));
  const nodes = walkGroups(context.groups).map(({ group, parent }) => ({ id: group.id, parent: parent?.id ?? null, kind: nodeKind(group) }));
  const nodeIds = new Map(nodes.map((node, index) => [node.id, `node-${index}`]));
  let index = 0;
  async function branch(group: typeof context.groups[number]): Promise<string> {
    let content: string;
    if (group.groups.length) content = (await Promise.all(group.groups.map(branch))).join('\n');
    else {
      const part = leaves.get(group.id);
      if (!part) throw new Error(`缺少终止 part：${group.id}`);
      const prefix = `part-source-${index++}`;
      const bytes = await validateGroupSvg(part.svg.path, group.id, canvas, undefined, true);
      const source = bytes.toString().replace(/^\s*<\?xml[^>]*>\s*/, '');
      content = namespaceSvg(source, prefix);
    }
    return `<g id="${nodeIds.get(group.id)}" data-group-path="${xml(group.id)}" data-node-kind="${nodeKind(group)}" data-name="${xml(group.name ?? group.id.split('/').at(-1)!)}">\n${content}\n</g>`;
  }
  const content = (await Promise.all(context.groups.map(branch))).join('\n');
  const metadata = xml(JSON.stringify({ version: 1, nodes }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" data-part-preview="1">\n<metadata id="part-preview-groups">${metadata}</metadata>\n${content}\n</svg>\n`;
  await sharp(Buffer.from(svg), { limitInputPixels: 100_000_000 }).metadata();
  await writeAtomic(context.outputPath, svg);
  return { status: 'completed', output: { path: context.outputPath, note: `${context.parts.length} 个终止 part 按 groups.json 树顺序合并；group 仅保留逻辑容器。` } };
};

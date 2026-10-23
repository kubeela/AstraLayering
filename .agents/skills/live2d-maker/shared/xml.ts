import { DOMParser, type Element } from '@xmldom/xmldom';

// Read XML as XML: quoted `>`, entities, masks and comments are all legal here.
// Do not serialize the DOM when changing SVG metadata: source pixels/paths and
// the existing artifact fingerprints must keep their original bytes.
export function parseXml(source: string) {
  return new DOMParser({ onError(_level, message) { throw new Error('无效 XML：' + message); } })
    .parseFromString(source, 'application/xml');
}
export function xmlAttributes(element: Element): Record<string, string> {
  return Object.fromEntries(Array.from(element.attributes, attr => [attr.name, attr.value]));
}
export type XmlSourceElement = {
  element: Element; start: number; openEnd: number; closeStart: number; end: number; selfClosing: boolean;
};

// Locate source ranges only after the real parser has validated the document.
// Skip XML declarations/comments/CDATA/DOCTYPE rather than matching fake tags
// in them, and keep quoted attribute values intact.
export function xmlSource(source: string) {
  const document = parseXml(source), nodes = Array.from(document.getElementsByTagName('*'));
  const elements: XmlSourceElement[] = [], stack: XmlSourceElement[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;
    const skip = source.startsWith('<!--', start) ? ['-->', 4] as const
      : source.startsWith('<![CDATA[', start) ? [']]>', 9] as const
      : source.startsWith('<?', start) ? ['?>', 2] as const : undefined;
    if (skip) { cursor = source.indexOf(skip[0], start + skip[1]) + skip[0].length; continue; }
    let quote = '', brackets = 0, end = start + 1;
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) { if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (source[start + 1] === '!') {
        if (char === '[') brackets++;
        if (char === ']') brackets--;
      }
      if (char === '>' && brackets === 0) break;
    }
    if (end === source.length) throw new Error('无效 XML 标签范围');
    cursor = end + 1;
    if (source[start + 1] === '!') continue;
    const closing = source[start + 1] === '/', name = source.slice(start + (closing ? 2 : 1), end).match(/^[^\s/>]+/)?.[0];
    if (closing) {
      const entry = stack.pop();
      if (!entry || entry.element.tagName !== name) throw new Error('无效 XML 闭合范围');
      entry.closeStart = start; entry.end = cursor;
    } else {
      const element = nodes[elements.length];
      if (!element || element.tagName !== name) throw new Error('无效 XML 元素范围');
      const selfClosing = source[end - 1] === '/';
      const entry = { element, start, openEnd: cursor, closeStart: cursor, end: cursor, selfClosing };
      elements.push(entry);
      if (!selfClosing) stack.push(entry);
    }
  }
  if (stack.length || elements.length !== nodes.length) throw new Error('无效 XML 文档范围');
  return { document, elements, root: elements[0] };
}

const escapeAttribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\r', '&#13;').replaceAll('\n', '&#10;').replaceAll('\t', '&#9;');
export function editXmlAttributes(source: string, entry: XmlSourceElement, updates: Record<string, string | null>): string {
  const tag = source.slice(entry.start, entry.openEnd);
  const edited = tag.replace(/\s+([^\s=/>]+)\s*=\s*("[^"]*"|'[^']*')/g,
    (raw, name: string) => Object.hasOwn(updates, name) ? '' : raw);
  const attributes = Object.entries(updates).filter(([, value]) => value !== null)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value!)}"`).join('');
  const ending = entry.selfClosing ? '/>' : '>';
  const next = edited.slice(0, -ending.length) + attributes + ending;
  return source.slice(0, entry.start) + next + source.slice(entry.openEnd);
}
export function svgSource(source: string) {
  const parsed = xmlSource(source);
  if (parsed.root?.element.localName !== 'svg') throw new Error('无效 SVG 根元素');
  return parsed;
}
export function updateSvgRoot(source: string, updates: Record<string, string | null>) {
  return editXmlAttributes(source, svgSource(source).root, updates);
}
export function svgBody(source: string) {
  const { root } = svgSource(source);
  return source.slice(root.openEnd, root.closeStart);
}

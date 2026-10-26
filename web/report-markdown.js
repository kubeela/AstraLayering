const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import { reportReferences } from './report-links.js';
export { reportReferences };

export function reportSummary(text) {
  const lines = text.split('\n').map(line => line.replace(/[#*`]/g, '').trim()).filter(Boolean);
  return (lines.find(line => /^结论\s*[：:]|^-?\s*状态\s*[：:]/.test(line)) ?? lines[0] ?? '').slice(0, 160);
}

export function renderReport(text, images = [], urlFor = () => '') {
  const refs = reportReferences(text), byTarget = new Map(images.map(image => [image.target, image]));
  const inline = value => escape(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  let offset = 0, code = false, list = '', html = '';
  const closeList = () => { if (list) { html += `</${list}>`; list = ''; } };
  for (const line of text.split('\n')) {
    const start = offset; offset += line.length + 1;
    if (/^\s*```/.test(line)) { closeList(); html += code ? '</code></pre>' : '<pre><code>'; code = !code; continue; }
    if (code) { html += escape(line) + '\n'; continue; }
    if (!line.trim()) { closeList(); continue; }
    let cursor = 0, content = '';
    for (const ref of refs.filter(ref => ref.start >= start && ref.end <= start + line.length)) {
      const image = byTarget.get(ref.target);
      if (!image) continue;
      content += inline(line.slice(cursor, ref.start - start));
      const label = image.label || image.path.split('/').at(-1), url = escape(urlFor(image.path));
      content += `<a class="report-image" href="${url}" target="_blank" rel="noopener"><img loading="lazy" src="${url}" alt="${escape(label)}"><span>${escape(label)}</span></a>`;
      cursor = ref.end - start;
    }
    content += inline(line.slice(cursor));
    const heading = line.match(/^(#{1,6})\s+/), bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+/);
    if (heading) { closeList(); const level = Math.min(6, heading[1].length + 1); html += `<h${level}>${content.slice(heading[0].length)}</h${level}>`; }
    else if (bullet) {
      const kind = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (list !== kind) { closeList(); html += `<${kind}>`; list = kind; }
      html += `<li>${content.slice(bullet[0].length)}</li>`;
    } else { closeList(); html += `<p>${content}</p>`; }
  }
  closeList(); if (code) html += '</code></pre>';
  return html;
}

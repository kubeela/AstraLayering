const imagePath = /\.(png|jpe?g|webp|svg)$/i;

// Reports use both Markdown images and paths in inline code. Keep their
// positions so the report viewer can display evidence where it is cited.
export function reportReferences(text) {
  const prose = text.replace(/```[^\n]*\n[\s\S]*?(?:```|$)/g, block => block.replace(/[^\n]/g, ' '));
  const refs = [];
  const add = (match, target, label = '') => {
    if (!imagePath.test(target) || refs.some(ref => match.index < ref.end && match.index + match[0].length > ref.start)) return;
    refs.push({ target, label, start: match.index, end: match.index + match[0].length });
  };
  for (const match of prose.matchAll(/!?\[([^\]\n]*)\]\(\s*(?:<([^>\n]+)>|((?:[^\s()]|\([^()\n]*\))+))(?:\s+"[^"\n]*")?\s*\)/g)) add(match, match[2] ?? match[3], match[1]);
  for (const match of prose.matchAll(/`([^`\n]+)`/g)) add(match, match[1]);
  for (const match of prose.matchAll(/[^\s`"'<>()[\]，；。、：！？]+\.(?:png|jpe?g|webp|svg)\b/gi)) add(match, match[0]);
  return refs.sort((a, b) => a.start - b.start);
}

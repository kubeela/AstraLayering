const imagePath = /\.(png|jpe?g|webp|svg)$/i;

// Blank fenced code the way the viewer renders it: a line opening with ``` toggles a block.
function prose(text) {
  let code = false;
  return text.split('\n').map(line => {
    const fence = /^\s*```/.test(line), blank = code || fence;
    if (fence) code = !code;
    return blank ? line.replace(/[^\r]/g, ' ') : line;
  }).join('\n');
}

// Reports use both Markdown images and paths in inline code. Keep their
// positions so the report viewer can display evidence where it is cited;
// targetStart/targetEnd locate the path itself, which a label may repeat.
export function reportReferences(text) {
  const refs = [], body = prose(text);
  const add = (match, group, label = '') => {
    const target = match[group];
    if (!imagePath.test(target) || refs.some(ref => match.index < ref.end && match.index + match[0].length > ref.start)) return;
    const [targetStart, targetEnd] = match.indices[group];
    refs.push({ target, label, start: match.index, end: match.index + match[0].length, targetStart, targetEnd });
  };
  for (const match of body.matchAll(/!?\[([^\]\n]*)\]\(\s*(?:<([^>\n]+)>|((?:[^\s()]|\([^()\n]*\))+))(?:\s+"[^"\n]*")?\s*\)/dg)) add(match, match[2] === undefined ? 3 : 2, match[1]);
  for (const match of body.matchAll(/`([^`\n]+)`/dg)) add(match, 1);
  for (const match of body.matchAll(/[^\s`"'<>()[\]，；。、：！？（）【】《》“”‘’「」『』]+\.(?:png|jpe?g|webp|svg)\b/dgi)) add(match, 0);
  return refs.sort((a, b) => a.start - b.start);
}

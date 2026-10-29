// Reads 【本次输入】: the runtime JSON, if any, merged with the `name：value`
// lines and the `- path：description` items of a list field.
export function promptInput(prompt: string): Record<string, any> {
  const start = prompt.indexOf('【本次输入】\n');
  if (start < 0) throw new Error('提示词缺少【本次输入】');
  const body = prompt.slice(start + '【本次输入】\n'.length).split('\n\n')[0];
  const json = /^\{[\s\S]*?\n\}(?=\n|$)/.exec(body)?.[0];
  const input: Record<string, any> = json ? JSON.parse(json) : {};
  let list: { path: string; description: string }[] | undefined;
  for (const line of body.slice(json?.length ?? 0).split('\n')) {
    const item = /^- (.+?)：(.*)$/.exec(line);
    if (item && list) { list.push({ path: item[1], description: item[2] }); continue; }
    const field = /^([A-Za-z]+)：(.*)$/.exec(line);
    if (!field) { list = undefined; continue; }
    if (field[2]) { input[field[1]] = field[2]; list = undefined; }
    else input[field[1]] = list = [];
  }
  return input;
}

// The reference images a prompt names, in order.
export const referencePaths = (prompt: string): string[] => [...prompt.matchAll(/^参考图绝对路径：(.+)$/gm)].map(match => match[1]);

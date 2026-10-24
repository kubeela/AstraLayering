import {readFileSync} from 'node:fs';

export type PromptValues = Record<string, string>;
// One pass only: inserted task text/data is never interpreted as another template.
export function renderPrompt(template: string, values: PromptValues, source = 'prompt', required: readonly string[] = []): string {
  for (const key of required) if (!template.includes(`{${key}}`)) throw new Error(`${source} 缺少显式提示词占位符 {${key}}`);
  return template.replace(/\{([a-z][a-z0-9_]*)\}/g, (token, key: string) => {
    if (!Object.hasOwn(values, key)) throw new Error(`${source} 缺少提示词变量 ${token}`);
    return values[key];
  });
}
export function renderPromptFile(source: string | URL, values: PromptValues = {}): string {
  return renderPrompt(readFileSync(source, 'utf8'), values, String(source));
}

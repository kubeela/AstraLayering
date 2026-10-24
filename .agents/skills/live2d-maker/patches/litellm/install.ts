import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const callbackEntry = 'responses_compat.proxy_handler';
const modules = ['responses_compat.py', 'responses_error_events.py'];
const sourceDirectory = dirname(fileURLToPath(import.meta.url));

// Append the callback to litellm_settings.callbacks as text, so comments, key
// order and the other callbacks of a shared proxy config stay as written.
export function withCallback(yaml: string, entry = callbackEntry): string {
  const lines = yaml.split('\n');
  const section = lines.findIndex(line => /^litellm_settings:\s*(?:#.*)?$/.test(line));
  if (section < 0) return `${yaml.replace(/\n*$/, '\n')}litellm_settings:\n  callbacks:\n    - ${entry}\n`;
  let end = section + 1;
  while (end < lines.length && (/^\s/.test(lines[end]) || lines[end].trim() === '')) end++;
  while (end > section + 1 && lines[end - 1].trim() === '') end--;
  const indent = lines.slice(section + 1, end).find(line => line.trim() && !line.trim().startsWith('#'))?.match(/^\s+/)?.[0] ?? '  ';
  const key = lines.findIndex((line, index) => index > section && index < end && line.startsWith(`${indent}callbacks:`));
  if (key < 0) {
    lines.splice(section + 1, 0, `${indent}callbacks:`, `${indent}  - ${entry}`);
    return lines.join('\n');
  }
  const value = lines[key].slice(`${indent}callbacks:`.length);
  const inline = value.match(/^(\s*\[)(.*)(\]\s*(?:#.*)?)$/);
  if (inline) {
    const items = inline[2].split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    if (items.includes(entry)) return yaml;
    lines[key] = `${indent}callbacks:${inline[1]}${inline[2].trim() ? `${inline[2].trimEnd()}, ` : ''}${entry}${inline[3]}`;
    return lines.join('\n');
  }
  const scalar = value.replace(/#.*$/, '').trim();
  if (scalar) {
    if (scalar.replace(/^['"]|['"]$/g, '') === entry) return yaml;
    throw new Error(`LiteLLM 配置的 litellm_settings.callbacks 不是列表（${scalar}），请改成列表后重试；不会自动改写。`);
  }
  let last = key, item = '';
  for (let index = key + 1; index < end; index++) {
    const match = lines[index].match(/^(\s*)-\s*(['"]?)([^'"#\s]+)\2/);
    if (match && match[1].length >= indent.length) { last = index; item ||= match[1]; if (match[3] === entry) return yaml; }
    else if (lines[index].trim() && !lines[index].trim().startsWith('#')) break;
  }
  lines.splice(last + 1, 0, `${item || `${indent}  `}- ${entry}`);
  return lines.join('\n');
}

async function replaceIfChanged(path: string, content: string): Promise<boolean> {
  let mode = 0o644;
  try {
    if (await readFile(path, 'utf8') === content) return false;
    mode = (await stat(path)).mode & 0o777;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  // Keep the original permissions: a proxy config usually holds keys.
  const temporary = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, content, { mode }); await rename(temporary, path); }
  finally { await rm(temporary, { force: true }); }
  return true;
}

// LiteLLM imports "module.attr" callbacks from the config's own directory, so
// the modules live next to it. The proxy is shared: never restart it here.
export async function ensureLitellmCallback(config: string): Promise<string[]> {
  let yaml;
  try { yaml = await readFile(config, 'utf8'); }
  catch (error) { throw new Error(`无法读取 layering_litellm_config：${config}`, { cause: error }); }
  const changed: string[] = [];
  for (const name of modules) {
    if (await replaceIfChanged(join(dirname(config), name), await readFile(join(sourceDirectory, name), 'utf8'))) changed.push(name);
  }
  if (await replaceIfChanged(config, withCallback(yaml))) changed.push(config);
  return changed;
}

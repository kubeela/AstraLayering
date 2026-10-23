import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import type {KritaInstallation} from '../raster/krita.ts';
export async function kritaEnvironmentPrompt(krita: KritaInstallation): Promise<string> {
  const source = new URL('./environment.md', import.meta.url);
  return `\n---\n【工作流附加：Krita 共用环境说明】\n来源文件（绝对路径）：${fileURLToPath(source)}\n\n${await readFile(source,'utf8')}\n本次 Krita：${JSON.stringify(krita.executable)}，已探测版本：${krita.version}。\n【共用环境说明结束】\n`;
}

import { join } from 'node:path';
import { atomicJSON, jsonFile } from './files.ts';

const metadataPath = '.web-project.json';
export function validateDisplayName(value: unknown): string {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value) || [...value].length > 80)
    throw new Error('显示名称应为最多 80 个字符的单行文字');
  return value.trim();
}
export async function projectDisplayName(directory: string, name: string): Promise<string> {
  const metadata = await jsonFile(directory, metadataPath);
  if (!metadata) return name;
  if (metadata.version !== 1) throw new Error('项目显示名称版本无效');
  return validateDisplayName(metadata.displayName) || name;
}
export async function saveProjectDisplayName(directory: string, value: unknown) {
  const displayName = validateDisplayName(value);
  // This metadata is separate from workflow state and its runner lock.
  await atomicJSON(join(directory, metadataPath), { version: 1, displayName });
  return displayName;
}

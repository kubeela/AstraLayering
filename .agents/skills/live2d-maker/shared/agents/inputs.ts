import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { copyAsPng } from '../png.ts';

export const referencesDirectory = (outputDirectory: string) => join(outputDirectory, 'workspace', 'references');
export type FileInput = { name: string } & ({ source: string } | { content: string | Uint8Array });

// Only inputs that need materialization pass through here. Prompt text/native
// image inputs stay in context; existing upstream files are referenced by path.
export async function prepareFileInputs(outputDirectory: string, inputs: readonly FileInput[]): Promise<Record<string, string>> {
  const directory = referencesDirectory(outputDirectory);
  const names = new Set<string>();
  for (const input of inputs) {
    if (!input.name || isAbsolute(input.name) || input.name.split(/[\\/]/).some(part => !part || part === '.' || part === '..') || names.has(input.name)) {
      throw new Error('程序文件输入需要唯一的工作区相对文件名');
    }
    names.add(input.name);
  }
  const paths: Record<string, string> = {};
  for (const input of inputs) {
    const path = resolve(directory, input.name);
    await mkdir(resolve(path, '..'), { recursive: true });
    if ('source' in input) await (/\.png$/i.test(path) ? copyAsPng : copyFile)(input.source, path); else await writeFile(path, input.content);
    paths[input.name] = path;
  }
  return paths;
}

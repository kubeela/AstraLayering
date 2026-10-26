import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { workflowsDirectory } from './paths.ts';

export type DefaultConfiguration = Readonly<Record<string, string>>;

// The installed skill owns defaults. An alternate environment directory may
// supply its own template; directories containing only .env use this installation.
export function readDefaultConfiguration(directory = workflowsDirectory): DefaultConfiguration {
  let source: string;
  try { source = readFileSync(join(directory, 'example.env'), 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || resolve(directory) === resolve(workflowsDirectory)) {
      throw new Error('无法读取 live2d-maker/example.env 默认配置', { cause: error });
    }
    source = readFileSync(join(workflowsDirectory, 'example.env'), 'utf8');
  }
  return Object.freeze(parseEnv(source) as Record<string, string>);
}

export function requiredDefault(configuration: DefaultConfiguration, key: string): string {
  const value = configuration[key]?.trim();
  if (!value) throw new Error(`live2d-maker/example.env 需要配置默认值：${key}`);
  return value;
}

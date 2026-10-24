import { dirname, delimiter } from 'node:path';

// Background services may start Node by absolute path. Keep that same runtime
// available to child launchers and tools without modifying the host environment.
export function withNodePath(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const result = Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined));
  const keys = process.platform === 'win32' ? Object.keys(result).filter(key => /^path$/i.test(key)) : ['PATH'];
  const inherited = keys.map(key => result[key]).find(value => value !== undefined) || '';
  for (const key of keys) delete result[key];
  const directory = dirname(process.execPath);
  result.PATH = [directory, ...inherited.split(delimiter).filter(entry => entry && entry !== directory)].join(delimiter);
  return result;
}

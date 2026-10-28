import { readFile } from 'node:fs/promises';
import { atomicJSON } from './files.ts';
import { compareVersions, installedVersion, releaseTag, type InstalledVersion } from '../.agents/skills/live2d-maker/shared/version.ts';

// Looks up the newest release tag on GitHub at most once a day and only reports it; nothing is
// downloaded or replaced. Offline or failed lookups stay silent. ASTRA_LAYERING_UPDATE_CHECK=off disables it.
export const repository = 'wu-tian807/AstraLayering';
const day = 24 * 60 * 60 * 1000, retry = 60 * 60 * 1000;
export type UpdateState = InstalledVersion & {
  check: 'off' | 'ok' | 'unavailable';
  latest?: string; updateAvailable?: boolean; releaseUrl?: string;
};

export function newestTag(tags: unknown): string | undefined {
  if (!Array.isArray(tags)) return undefined;
  return tags.map(tag => releaseTag.exec(String(tag?.name ?? ''))?.[0].slice(1)).filter((v): v is string => !!v)
    .sort(compareVersions).at(-1);
}

export function createUpdateCheck({ cachePath, enabled = !/^(off|false|0|no)$/i.test(process.env.ASTRA_LAYERING_UPDATE_CHECK ?? ''),
  fetchTags = defaultFetch, installed = installedVersion, clock = Date.now }: {
  cachePath: string; enabled?: boolean; fetchTags?: () => Promise<unknown>; installed?: () => Promise<InstalledVersion>; clock?: () => number;
}) {
  let pending: Promise<string | undefined> | undefined, failedAt = -Infinity;
  async function latest() {
    let cached: { checkedAt?: number; latest?: string } = {};
    try { cached = JSON.parse(await readFile(cachePath, 'utf8')); } catch { /* No earlier check. */ }
    if (typeof cached.checkedAt === 'number' && clock() - cached.checkedAt < day) return cached.latest;
    if (clock() - failedAt < retry) return cached.latest;
    try {
      const found = newestTag(await fetchTags());
      await atomicJSON(cachePath, { checkedAt: clock(), latest: found });
      return found;
    } catch { failedAt = clock(); return cached.latest; }
  }
  return async function state(): Promise<UpdateState> {
    const local = await installed();
    if (!enabled) return { ...local, check: 'off' };
    const found = await (pending ??= latest().finally(() => { pending = undefined; }));
    if (!found) return { ...local, check: 'unavailable' };
    // Commits after a tag count as that tag: a newer tag is still an update.
    return { ...local, check: 'ok', latest: found, updateAvailable: local.source !== 'unknown' && compareVersions(found, local.version) > 0,
      releaseUrl: `https://github.com/${repository}/releases/tag/v${found}` };
  };
}

async function defaultFetch() {
  const response = await fetch(`https://api.github.com/repos/${repository}/tags?per_page=100`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'astra-layering-workbench' }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('GitHub ' + response.status);
  return response.json();
}

import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import { defaultKnowledgeDirectory, knowledgeDirectory, useKnowledge } from '../knowledge.ts';

// A private copy of the default knowledge, active until the test ends.
export async function temporaryKnowledge(t: TestContext): Promise<string> {
  const previous = knowledgeDirectory(), directory = await mkdtemp(join(tmpdir(), 'live2d-knowledge-'));
  t.after(async () => { useKnowledge(previous); await rm(directory, { recursive: true, force: true }); });
  await cp(defaultKnowledgeDirectory, directory, { recursive: true });
  useKnowledge(directory);
  return directory;
}

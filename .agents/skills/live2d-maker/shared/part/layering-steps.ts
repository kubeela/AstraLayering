import type { AgentSession, CodexAgents } from '../codex/agents.ts';
import { recognizeInitialGroups } from './initial-groups.ts';
import { drawGroupOutline, reviewGroupOutline } from './outline-agent.ts';
import { reduceGroupOutlines } from './outline-reduce.ts';
import { completeGroupOcclusion, checkGroupCompletion } from './completion-agent.ts';
import { analyzeChildren } from './children-agent.ts';
import { planPartOcclusion } from './occlusion-agent.ts';
import type { LayeringSteps } from './layering-types.ts';
import { readFile, mkdir, appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { GroupContext } from './layering-types.ts';
import { writeAtomic } from './groups.ts';
import type { Harness } from '../agents/models.ts';

// 补形与子组分析使用只读 agent，经工具提交后由程序验证并发布事实。
export function createLayeringSteps(agents: Pick<CodexAgents, 'run'> & Partial<Pick<CodexAgents, 'createSession'>>): LayeringSteps {
  const sessions = new Map<string, AgentSession>();
  async function drawing(context: GroupContext): Promise<AgentSession> {
    const id = context.group.id;
    let session = sessions.get(id);
    if (!session) {
      if (!agents.createSession) throw new Error('轮廓绘制需要可复用的 agent 会话');
      const path = join(context.directory, 'stages', 'sessions', `${id}.json`);
      let saved: { threadId?: string; harness?: Harness } = {};
      try { saved = JSON.parse(await readFile(path, 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      await mkdir(dirname(path), { recursive: true });
      const persist = async (threadId: string | null, harness?: Harness) => {
        if (saved.threadId && saved.threadId !== threadId) await appendFile(path + '.history.jsonl', JSON.stringify({
          ...saved, replacedAt: new Date().toISOString() }) + '\n');
        saved = { threadId: threadId || undefined, harness: harness || saved.harness };
        await writeAtomic(path, JSON.stringify(saved, null, 2) + '\n');
      };
      const inner = agents.createSession(saved.threadId, {
        resumeHarness: saved.harness,
        onSessionStarted: persist,
        onThreadReplacement: async () => persist(null),
      });
      session = { close: () => inner.close(), async run(task, signal) {
        try {
          const result = await inner.run(task, signal);
          if (result.threadId) await persist(result.threadId, result.harness);
          return result;
        } catch (error) {
          if (error && typeof error === 'object' && 'threadId' in error && typeof error.threadId === 'string') await persist(error.threadId);
          throw error;
        }
      } };
      sessions.set(id, session);
    }
    return session;
  }
  async function closeGroup(id: string) {
    const session = sessions.get(id);
    sessions.delete(id);
    await session?.close();
  }
  return {
    async close() {
      await Promise.allSettled([...sessions.keys()].map(closeGroup));
    },
    initialGroups: async context => ({ status: 'completed', output: await recognizeInitialGroups(context, agents) }),
    drawOutline: async context => {
      try { return { status: 'completed', output: await drawGroupOutline(context, await drawing(context)) }; }
      catch (error) { await closeGroup(context.group.id); throw error; }
    },
    reviewOutline: async context => {
      try { return await reviewGroupOutline(context, agents, await drawing(context)); }
      finally { await closeGroup(context.group.id); }
    },
    reduceOutlines: async context => ({ status: 'completed', output: await reduceGroupOutlines(context, agents) }),
    completeOcclusion: async context => ({ status: 'completed', output: await completeGroupOcclusion(context, agents) }),
    checkCompletion: async context => ({ status: 'completed', output: await checkGroupCompletion(context) }),
    splitChildren: async context => ({ status: 'completed', output: await analyzeChildren(context, agents) }),
    planOcclusion: context => planPartOcclusion(context, agents),
  };
}

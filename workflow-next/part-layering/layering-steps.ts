import type { AgentSession, CodexAgents } from './agents.ts';
import { recognizeInitialGroups } from './initial-groups.ts';
import { drawGroupOutline, reviewGroupOutline } from './outline-agent.ts';
import type { LayeringSteps, StepResult, SvgMerger } from './layering-types.ts';

function pending<T>(name: string): Promise<StepResult<T>> {
  return Promise.resolve({ status: 'pending', message: `${name}：待接入` });
}

// 首次分组、轮廓绘制和独立 review 已接入，补形及子组分析随后逐项接入。
// 剩余占位符不会生成假 SVG，也不会把步骤标记为完成。
export function createLayeringSteps(agents: Pick<CodexAgents, 'run'> & Partial<Pick<CodexAgents, 'createSession'>>): LayeringSteps {
  const sessions = new Map<string, AgentSession>();
  function drawing(id: string): AgentSession {
    let session = sessions.get(id);
    if (!session) {
      if (!agents.createSession) throw new Error('轮廓绘制需要可复用的 agent 会话');
      session = agents.createSession();
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
      try { return { status: 'completed', output: await drawGroupOutline(context, drawing(context.group.id)) }; }
      catch (error) { await closeGroup(context.group.id); throw error; }
    },
    reviewOutline: async context => {
      try { return await reviewGroupOutline(context, agents, drawing(context.group.id)); }
      finally { await closeGroup(context.group.id); }
    },
    completeOcclusion: async () => pending('直接遮挡补形'),
    checkCompletion: async () => pending('保留原形与补形结构自检'),
    splitChildren: async () => pending('组内子组分析'),
  };
}

export const mergeSvgPlaceholder: SvgMerger = async () => pending('程序 SVG 合并');

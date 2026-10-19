import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { toolDefinition } from '../codex/tool-config.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import { writeAtomic } from '../part/groups.ts';
import { validateOcclusionDocument, type DepthCheck, type OcclusionLayer } from '../part/occlusion-plan.ts';

const revision = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

export function createOcclusionTools(upstream: string, editable: boolean): FunctionTool[] {
  const path = join(upstream, 'occlusion.json');
  let writes = Promise.resolve();
  return [{
    ...toolDefinition('read_occlusion'),
    async execute(_value, signal) {
      signal.throwIfAborted();
      const bytes = await readFile(path);
      return textResult({ path, revision: revision(bytes), plan: validateOcclusionDocument(JSON.parse(bytes.toString())) });
    },
  }, {
    ...toolDefinition('update_occlusion'),
    async execute(value, signal) {
      // Guard local adapters too; later SDK stages only advertise the read tool.
      if (!editable) throw new Error('只有 step01 绘制阶段可以修改上游深度表；当前阶段保持已交付层级。');
      const operation = writes.then(async () => {
        signal.throwIfAborted();
        const args = value as { revision?: string; changes?: (Omit<OcclusionLayer, 'check'> & { regions?: DepthCheck['regions'] })[] };
        if (!args || typeof args.revision !== 'string' || !Array.isArray(args.changes) || !args.changes.length ||
            Object.keys(args).some(key => !['revision', 'changes'].includes(key))) throw new Error('需要 revision 与非空 changes');
        const bytes = await readFile(path);
        if (revision(bytes) !== args.revision) throw new Error('occlusion.json 已变化，请重新读取后再修改。');
        const plan = validateOcclusionDocument(JSON.parse(bytes.toString()));
        const changed = new Set<string>();
        for (const change of args.changes) {
          if (!change || typeof change !== 'object' || changed.has(change.id) ||
              Object.keys(change).some(key => !['id', 'level', 'levels', 'note', 'regions'].includes(key))) throw new Error('修改项重复或包含不允许的字段');
          const index = plan.layers.findIndex(row => row.id === change.id);
          if (index < 0) throw new Error(`未知 part：${change.id}；不可新增或删除逻辑部件`);
          changed.add(change.id);
          const { regions, ...row } = change;
          plan.layers[index] = { ...row, check: { passed: true, note: change.note,
            ...(regions === undefined ? {} : { regions }) } } as OcclusionLayer;
        }
        plan.version = 3;
        const validated = validateOcclusionDocument(plan);
        signal.throwIfAborted();
        if (revision(await readFile(path)) !== args.revision) throw new Error('occlusion.json 已变化，请重新读取后再修改。');
        const output = Buffer.from(JSON.stringify(validated, null, 2) + '\n');
        await writeAtomic(path, output);
        return textResult({ path, revision: revision(output), updated: [...changed],
          layers: validated.layers.filter(row => changed.has(row.id)) });
      });
      writes = operation.then(() => {}, () => {});
      return operation;
    },
  }];
}

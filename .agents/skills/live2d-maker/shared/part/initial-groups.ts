import {renderPrompt} from '../prompts/render.ts';
import { partStep } from '../agents/models.ts';
import { agentOutcomeError } from '../codex/diagnostics.ts';
import { toolDefinition } from '../codex/tool-config.ts';
import { partProfile } from './profile.ts';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { CodexAgents } from '../codex/agents.ts';
import { createBitmapTool } from './bitmap-tool.ts';
import { normalizeGroups, writeAtomic } from './groups.ts';
import { initialStepId, readInitialGroups } from './part-steps.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import type { InitialContext, InitialGrouping } from './layering-types.ts';

function decodeInitialGrouping(value: unknown, subjects: readonly string[]): InitialGrouping {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('首次分组 JSON 须为对象');
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.groups) || !raw.groups.length || Object.keys(raw).some(key => !['subject', 'groups'].includes(key))) {
    throw new Error('首次分组必须包含非空的 groups 数组，且只包含组');
  }
  const groups = raw.groups.map((group: unknown) => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error('初始组必须是对象');
    const item = group as Record<string, unknown>;
    if (typeof item.name !== 'string' || !/^[a-z][a-z0-9_]*$/.test(item.name) ||
        !Array.isArray(item.groups) || item.groups.length || Object.keys(item).some(key => !['name', 'groups', 'note'].includes(key)) ||
        (item.note !== undefined && item.note !== null && typeof item.note !== 'string')) {
      throw new Error('初始组必须使用 snake_case 名称，只拆一层，不包含 part 或制作进度');
    }
    return { id: item.name, name: item.name, ...(typeof item.note === 'string' ? { note: item.note } : {}) };
  });
  if (typeof raw.subject !== 'string' || !subjects.includes(raw.subject)) throw new Error(`首次分组的 subject 必须为 ${subjects.join(' 或 ')}`);
  normalizeGroups(groups);
  return { groups, subject: raw.subject as InitialGrouping['subject'] };
}

export async function recognizeInitialGroups(
  context: InitialContext, agents: Pick<CodexAgents, 'run'>,
): Promise<InitialGrouping> {
  const profile = partProfile(context);
  const prompt = await readFile(join(profile.promptsDirectory, '4-初始分组.md'), 'utf8');
  // The tool writes the step output directly, so a turn that fails after saving
  // continues from the saved grouping instead of asking again.
  const path = join(context.directory, initialStepId, 'groups.json');
  const reference = resolve(context.directory, context.references.baseSubject);
  let submitted = false;
  const writeGroups: FunctionTool = {
    ...toolDefinition('write_groups', profile.toolsDirectory),
    async execute(value, signal) {
      signal.throwIfAborted();
      const result = decodeInitialGrouping(value, profile.subjects);
      if (submitted) throw new Error('已有分组，不能覆盖；请继续现有进度');
      normalizeGroups(result.groups);
      signal.throwIfAborted();
      await writeAtomic(path, JSON.stringify(result, null, 2) + '\n');
      submitted = true;
      return textResult({ path, ids: result.groups.map(group => group.id) });
    },
  };
  const response = await agents.run({ step: partStep(partProfile(context).id, 'initial_groups'),
    name: '首次分组识别', cwd: context.directory,
    images: profile.attachInitialReference ? [{ path: reference, description: profile.references.initial }, ...(profile.originalReference && context.references.originalImage ? [{ path: context.references.originalImage, description: profile.originalReference }] : [])] : undefined,
    prompt: renderPrompt(prompt, {run_directory: context.directory,
      reference_label: profile.referenceLabel,
      reference_path: reference,
      groups_path: path}, join(profile.promptsDirectory, '4-初始分组.md'), ["run_directory","reference_label","reference_path","groups_path"]),
    tools: [createBitmapTool(context.directory, join(context.directory, 'observations', 'initial-groups')), writeGroups],
  });
  if (!submitted) throw agentOutcomeError('首次分组未通过 write_groups 保存', response);
  return readInitialGroups(context.directory);
}

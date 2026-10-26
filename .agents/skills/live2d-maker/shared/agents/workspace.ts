import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { AgentTask } from '../codex/agents.ts';
import type { FunctionTool } from '../codex/function-tools.ts';
import { renderPromptFile } from '../prompts/render.ts';
import { stageStep, type PreparationStage } from '../part/preparation-steps.ts';
import { groupStepId, initialStepId } from '../part/step-paths.js';

export type ExecutionPaths = { directory: string; outputDirectory: string; workspace: string };
type WorkspaceTask = Pick<AgentTask, 'cwd' | 'outputDirectory'> & { step?: string };

// The pipeline remains the base for task/tool paths; the CLI works in the step's
// workspace. Callers name their step directory; the step id covers those with a
// fixed one, and anything else works in its own directory rather than a guessed step.
export function executionPaths(task: WorkspaceTask, fallback: string): ExecutionPaths {
  const directory = resolve(task.cwd || fallback);
  const outputDirectory = resolve(directory, task.outputDirectory || stepDirectory(task.step) || '.');
  return { directory, outputDirectory, workspace: join(outputDirectory, 'workspace') };
}

export function stepDirectory(step: string | undefined): string | undefined {
  const raster = step?.match(/(?:^|_)raster_(step\d+)/)?.[1];
  const preparation = ({ part_pose_judgment: 'pose', part_standardize: 'standard',
    part_simplify: 'simplified', part_base_subject: 'base' } as Record<string, PreparationStage>)[step || ''];
  return raster || (preparation ? 'preparation/' + stageStep(preparation)
    : step === 'clothing_preparation' ? 'preparation/step01'
    : step === 'assembly' || step?.startsWith('shadow_') ? 'step01'
    : step?.endsWith('initial_groups') ? initialStepId
      : step?.endsWith('occlusion') ? 'occlusion' : undefined);
}

// Only historical requests lack an explicit group output directory. Display
// names are a compatibility reader, never a routing rule for new execution.
export function legacyOutputDirectory(task: WorkspaceTask & { name?: string }, fallback: string): string {
  if (task.outputDirectory) return executionPaths(task, fallback).outputDirectory;
  if (task.step === 'part_reference_judgment') return resolve(task.cwd || fallback, 'preparation/step05');
  const group = task.name?.match(/^(?:组轮廓绘制|组轮廓返修|组轮廓review|正面遮挡补全|直属结构拆分)-([a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)*)$/)?.[1];
  return group ? resolve(task.cwd || fallback, groupStepId(group, task.step?.endsWith('children') ? 3 : task.step?.endsWith('completion') ? 2 : 1))
    : executionPaths(task, fallback).outputDirectory;
}

export async function prepareWorkspace(task: Pick<AgentTask, 'cwd' | 'outputDirectory' | 'step'>, fallback: string): Promise<ExecutionPaths> {
  const paths = executionPaths(task, fallback);
  await mkdir(paths.workspace, { recursive: true });
  return paths;
}

export function workspacePrompt(prompt: string, paths: ExecutionPaths): string {
  if (prompt.includes(`- 当前工作区：${paths.workspace}。`)) return prompt;
  return renderPromptFile(new URL('../prompts/agent-turn.md', import.meta.url), {
    task_prompt: prompt, workspace: paths.workspace, working_directory: paths.directory,
    output_directory: paths.outputDirectory,
  });
}

export function workspaceTools(tools: readonly FunctionTool[], paths: ExecutionPaths): FunctionTool[] {
  return tools.map(tool => ({ ...tool, execute: (args, signal) => tool.execute(args, signal, paths) }));
}

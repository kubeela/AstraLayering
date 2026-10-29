import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { AgentTask } from '../codex/agents.ts';
import type { FunctionTool } from '../codex/function-tools.ts';
import { renderPromptFile } from '../prompts/render.ts';
import { stageStep, type PreparationStage } from '../part/preparation-steps.ts';
import { clothingPreparationStep, partSteps, shadowStep } from '../step-paths.js';
import { fromTaskPath, taskRootOf } from '../task-paths.ts';

// root is the single base of every relative path an agent reads or writes.
export type ExecutionPaths = { root: string; directory: string; outputDirectory: string; workspace: string };
type WorkspaceTask = Pick<AgentTask, 'cwd' | 'outputDirectory'> & { step?: string };

// The CLI works in the step's workspace, where drafts go;
// relative task/tool paths still use the task root. Callers name their step directory; the step id covers those with a
// fixed one, and anything else works in its own directory rather than a guessed step.
export function executionPaths(task: WorkspaceTask, fallback: string): ExecutionPaths {
  const directory = resolve(task.cwd || fallback);
  const outputDirectory = resolve(directory, task.outputDirectory || stepDirectory(task.step) || '.');
  return { root: taskRootOf(directory), directory, outputDirectory, workspace: join(outputDirectory, 'workspace') };
}

export function stepDirectory(step: string | undefined): string | undefined {
  const raster = step?.match(/(?:^|_)raster_(step\d+)/)?.[1];
  const preparation = ({ part_pose_judgment: 'pose', part_standardize: 'standard',
    part_simplify: 'simplified', part_base_subject: 'base' } as Record<string, PreparationStage>)[step || ''];
  return raster || (preparation ? stageStep(preparation)
    : step === 'clothing_preparation' ? clothingPreparationStep
    : step === 'assembly' ? 'step01'
    : step === 'shadow_mask' ? shadowStep('mask') : step === 'shadow_maps' ? shadowStep('normal-depth')
    : step?.endsWith('initial_groups') ? partSteps.initial
      : step?.endsWith('occlusion') ? partSteps.occlusion : undefined);
}

export async function prepareWorkspace(task: Pick<AgentTask, 'cwd' | 'outputDirectory' | 'step'>, fallback: string): Promise<ExecutionPaths> {
  const paths = executionPaths(task, fallback);
  await mkdir(paths.workspace, { recursive: true });
  return paths;
}

export function workspacePrompt(prompt: string, paths: ExecutionPaths): string {
  // Directories are shown absolute; relative paths still mean the task root.
  const at = (path: string) => fromTaskPath(paths.root, path);
  if (prompt.includes(`- 任务根目录：${paths.root}。`) && prompt.includes(`- 当前工作区：${at(paths.workspace)}。`)) return prompt;
  return renderPromptFile(new URL('../prompts/agent-turn.md', import.meta.url), {
    task_prompt: prompt, task_root: paths.root, workspace: at(paths.workspace),
    section_directory: at(paths.directory), output_directory: at(paths.outputDirectory),
  });
}

export function workspaceTools(tools: readonly FunctionTool[], paths: ExecutionPaths): FunctionTool[] {
  return tools.map(tool => ({ ...tool, execute: (args, signal) => tool.execute(args, signal, paths) }));
}

import {renderPrompt, renderPromptFile} from '../prompts/render.ts';
import type { ModelSelection, ModelTier } from '../codex/environment.ts';
import type { AgentStep } from '../agents/models.ts';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { PartLayeringInput } from './input.ts';
import { agentPath } from './run-store.ts';
import { taskRootOf } from '../task-paths.ts';

export type StepDefinition = {
  id: string;
  title: string;
  model: string;
  effort: ModelSelection['effort'];
  modelTier?: ModelTier;
  modelStep?: AgentStep;
  prompt: URL;
  inputFiles?: readonly string[]; // Relative to this pipeline directory; previous deliveries are read-only.
  requiredFiles: readonly string[];
  previewFiles?: readonly string[]; // Published optional previews; * matches within this step.
  krita?: false; // The step does not operate Krita: it takes no Krita slot and its agents get no krita tool.
  review?: { prompt: URL; repairPrompt: URL; model: string; effort: ModelSelection['effort']; modelTier?: ModelTier; modelStep?: AgentStep; repairModelStep?: AgentStep };
};

export async function buildPrompt(step: StepDefinition, input: PartLayeringInput, output: string, previous: readonly string[] = []): Promise<string> {
  // The final report also checkpoints the initial drawing before review begins.
  // Publish it only after the agent turn and all delivery checks have succeeded.
  const report = step.review ? 'report.md.tmp' : 'report.md';
  const responsibilities = step.id === 'step01' ? await readFile(new URL('./drawing-responsibilities.md', import.meta.url), 'utf8') : '';
  const body = await readFile(step.prompt, 'utf8');
  const requiredFiles = step.requiredFiles.map(file => file === 'report.md' ? report : file);
  // Every task path shown to the agent is absolute under the task root.
  const root = taskRootOf(dirname(output)), at = (path: string) => agentPath(root, path);
  const json = async (path: string) => JSON.stringify(await at(path));
  const list = async (paths: readonly string[]) => JSON.stringify(await Promise.all(paths.map(at)));
  return renderPrompt(body, {
    drawing_report_filename: report, drawing_responsibilities: responsibilities,
    runtime_context: renderPromptFile(new URL('../prompts/raster-runtime.md', import.meta.url), {
      pipeline_directory: await json(dirname(output)),
      input_files: await list((step.inputFiles ?? []).map(file => join(dirname(output), file))),
      upstream_directory: await json(input.directory),
      parts_path: await json(input.parts),
      references_directory: await json(join(input.directory, 'references')),
      original_character_reference: input.originalCharacter ? renderPromptFile(new URL('../prompts/raster-original-reference.md',import.meta.url),{original_character_path:await json(input.originalCharacter)}).trim() : '',
      output_directory: await json(output),
      previous_steps: JSON.stringify(await Promise.all(previous.map(async directory => ({ directory: await at(directory), report: await at(join(directory, 'report.md')) })))),
      required_files: await list(requiredFiles.map(file => join(output, file))),
      report_path: await json(join(output, report)),
      report_publish_rule: step.review ? renderPromptFile(new URL('../prompts/raster-report-publish.md',import.meta.url)).trim() : ''
    })
  }, String(step.prompt), ['drawing_responsibilities','runtime_context',...(step.review?['drawing_report_filename']:[])]);
}

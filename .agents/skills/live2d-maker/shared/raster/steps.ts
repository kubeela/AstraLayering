import { stepKnowledge } from '../knowledge.ts';
import type { ModelSelection, ModelTier } from '../codex/environment.ts';
import type { AgentStep } from '../agents/models.ts';
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
  knowledge: { section: string; step: string }; // knowledge/<section>/<step>/agent.json
  inputFiles?: readonly string[]; // Relative to this section directory; previous deliveries are read-only.
  requiredFiles: readonly string[];
  previewFiles?: readonly string[]; // Published optional previews; * matches within this step.
  krita?: false; // The step does not operate Krita: it takes no Krita slot and its agents get no krita tool.
  review?: { model: string; effort: ModelSelection['effort']; modelTier?: ModelTier; modelStep?: AgentStep; repairModelStep?: AgentStep };
};

export async function buildPrompt(step: StepDefinition, input: PartLayeringInput, output: string, previous: readonly string[] = []): Promise<string> {
  // The final report also checkpoints the initial drawing before review begins.
  // Publish it only after the agent turn and all delivery checks have succeeded.
  const report = step.review ? 'report.md.tmp' : 'report.md';
  const requiredFiles = step.requiredFiles.map(file => file === 'report.md' ? report : file);
  // Every task path shown to the agent is absolute under the task root.
  const root = taskRootOf(dirname(output)), at = (path: string) => agentPath(root, path);
  const json = async (path: string) => JSON.stringify(await at(path));
  const list = async (paths: readonly string[]) => JSON.stringify(await Promise.all(paths.map(at)));
  return stepKnowledge(step.knowledge.section, step.knowledge.step).render('main', {
    drawing_report_filename: report,
    section_directory: await json(dirname(output)),
    input_files: await list((step.inputFiles ?? []).map(file => join(dirname(output), file))),
    upstream_directory: await json(input.directory),
    parts_path: await json(input.parts),
    references_directory: await json(join(input.directory, 'references')),
    output_directory: await json(output),
    previous_steps: JSON.stringify(await Promise.all(previous.map(async directory => ({ directory: await at(directory), report: await at(join(directory, 'report.md')) })))),
    required_files: await list(requiredFiles.map(file => join(output, file))),
    report_path: await json(join(output, report)),
    // Only clothing raster has the original clothed character; its prompts name it.
    ...(input.originalCharacter ? { original_character_path: await json(input.originalCharacter) } : {}),
  }, { taskRoot: root });
}

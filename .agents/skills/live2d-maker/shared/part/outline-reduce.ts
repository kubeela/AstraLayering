import { layerStepId } from './part-steps.ts';
import {renderPrompt} from '../prompts/render.ts';
import { partStep } from '../agents/models.ts';
import { agentOutcomeError } from '../codex/diagnostics.ts';
import { toolDefinition } from '../codex/tool-config.ts';
import { partProfile } from './profile.ts';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import type { CodexAgents } from '../codex/agents.ts';
import { writeAtomic } from './groups.ts';
import { textResult, type FunctionTool } from '../codex/function-tools.ts';
import type { OutlineReduction, OutlineReductionContext } from './layering-types.ts';
import { createSvgPreviewTool, createSvgReadTool, validateGroupSvg, type SvgObservation } from './svg-tools.ts';
import { editXmlAttributes, svgBody, svgSource } from '../xml.ts';

export async function reduceGroupOutlines(context: OutlineReductionContext, agents: Pick<CodexAgents, 'run'>): Promise<OutlineReduction> {
  const reference = resolve(context.directory, context.references.baseSubject);
  const metadata = await sharp(reference).metadata();
  const canvas = { width: metadata.autoOrient.width, height: metadata.autoOrient.height };
  const palette = ['#ef476f', '#118ab2', '#ffd166', '#06d6a0', '#9b5de5', '#fb8500', '#4361ee', '#f15bb5'];
  const merged = join(context.directory, 'observations', 'outline-reduce', String(context.depth), 'merged.draft.svg');
  const parts = await Promise.all(context.entries.map(async (entry, index) => {
    let text = (await readFile((entry.current ?? entry.outline).path)).toString();
    for (const node of svgSource(text).elements.reverse()) {
      const fill = node.element.getAttribute('fill');
      if (fill !== null && fill !== 'none') text = editXmlAttributes(text, node, { fill: palette[index % palette.length] });
    }
    return svgBody(text);
  }));
  await writeAtomic(merged, `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">${parts.map(part => `<g opacity="0.65">${part}</g>`).join('')}</svg>`);
  const observations: SvgObservation[] = [];
  const preview = createSvgPreviewTool({ directory: context.directory, reference, canvas,
    observationDirectory: join(context.directory, layerStepId(context.depth), 'workspace'),
    observed: entry => observations.push(entry) });
  let submitted: OutlineReduction | undefined;
  const write: FunctionTool = {
    ...toolDefinition('write_reduction_svg'),
    async execute(value, signal) {
      signal.throwIfAborted();
      if (submitted) throw new Error('本层去重已提交');
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['groupId', 'svg'].includes(key))) {
        throw new Error('仅提交 groupId 与 svg，草稿路径由程序绑定');
      }
      const raw = value as { groupId?: unknown; svg?: unknown };
      const entry = context.entries.find(item => item.group.id === raw.groupId);
      if (!entry || typeof raw.svg !== 'string' || !raw.svg.trim() || !entry.outputPath.endsWith('.draft.svg')) {
        throw new Error('须指定本层组及非空 SVG');
      }
      for (let i = observations.length - 1; i >= 0; i--) {
        if (observations[i].source === resolve(entry.outputPath)) observations.splice(i, 1);
      }
      await writeAtomic(entry.outputPath, raw.svg);
      const bytes = await validateGroupSvg(entry.outputPath, entry.group.id, canvas, entry.parent?.steps.completion.output?.path, true);
      return textResult({ path: entry.outputPath, bytes: bytes.length, note: '草稿检查通过，仍须预览自检' });
    },
  };
  const submit: FunctionTool = {
    ...toolDefinition('submit_reduction'),
    async execute(value, signal) {
      signal.throwIfAborted();
      if (submitted) throw new Error('本层去重已提交');
      const result = value as OutlineReduction;
      if (!result || !Array.isArray(result.changed) || typeof result.note !== 'string') throw new Error('无效去重结果');
      if (!observations.some(entry => entry.source === merged && entry.mode === 'blend')) throw new Error('先查看整层合成 blend');
      const seen = new Set<string>();
      for (const change of result.changed) {
        const entry = context.entries.find(entry => entry.group.id === change.groupId);
        if (!entry || seen.has(change.groupId) || typeof change.path !== 'string' || resolve(change.path) !== entry.outputPath) {
          throw new Error('去重只能提交本层组对应的 .draft.svg，不能重复提交组或修改原轮廓');
        }
        seen.add(change.groupId);
        const parent = entry.parent?.steps.completion.output?.path;
        await validateGroupSvg(change.path, change.groupId, canvas, parent, true);
        if (!observations.some(item => item.source === resolve(change.path) && ['blend', 'edge'].includes(item.mode))) {
          throw new Error(`${change.groupId}: 修改后须用 blend 或 edge 查看`);
        }
      }
      submitted = structuredClone(result);
      return textResult(submitted);
    },
  };
  const response = await agents.run({ step: partStep(partProfile(context).id, 'reduce'), name: `同层轮廓去重-${context.depth}`, cwd: context.directory, outputDirectory: join(context.directory, layerStepId(context.depth)), sandboxMode: 'workspace-write',
    imageGeneration: false, tools: [preview, write, submit, createSvgReadTool(context.directory,
      [merged, ...context.entries.flatMap(entry => [entry.outline.path, entry.current?.path, entry.outputPath, entry.parent?.steps.completion.output?.path])])],
    prompt: renderPrompt(await readFile(join(partProfile(context).promptsDirectory, '8-同层轮廓去重.md'), 'utf8'), {runtime_context: JSON.stringify({
      depth: context.depth, reference, canvas, mergedPreview: merged,
      groups: context.entries.map(entry => ({ id: entry.group.id, kind: entry.group.kind ?? 'group', note: entry.group.note,
        sourceSvg: (entry.current ?? entry.outline).path, originalOutline: entry.outline.path,
        reusedReduction: !!entry.current, outputDraft: entry.outputPath, parentSvg: entry.parent?.steps.completion.output?.path ?? null })),
    }, null, 2)}, join(partProfile(context).promptsDirectory, '8-同层轮廓去重.md'), ["runtime_context"]),
  });
  if (!submitted) throw agentOutcomeError('同层去重未通过 submit_reduction 提交', response);
  return submitted;
}

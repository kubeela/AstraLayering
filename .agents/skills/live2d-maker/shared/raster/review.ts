import {renderPrompt, renderPromptFile} from '../prompts/render.ts';
import { readFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { StepResult } from './agent.ts';
import { fileInfo } from './run-store.ts';
import type { StepDefinition } from './steps.ts';
import { publishReportAssets } from '../report-assets.ts';

const reports = ['review-01.md', 'repair-01.md', 'review-02.md', 'repair-02.md'] as const;
export type ReviewTask = { kind: 'review' | 'repair'; filename: typeof reports[number]; index: number };

async function verdict(directory: string, filename: string, kind: ReviewTask['kind']): Promise<string | undefined> {
  const path = join(directory, filename), info = await fileInfo(path);
  if (!info) return;
  if (!info.isFile() || info.isSymbolicLink()) throw new Error(`报告必须是普通文件：${path}`);
  const [first, ...body] = (await readFile(path, 'utf8')).trim().split(/\r?\n/);
  const value = first?.match(/^结论[：:]\s*(\S+)\s*$/)?.[1];
  const allowed = kind === 'review' ? ['通过', '需要修复', '无法完成检查'] : ['已修复', '仍有问题'];
  if (!value || !allowed.includes(value) || !body.join('\n').trim()) {
    throw new Error(`报告缺少有效结论或正文：${path}`);
  }
  return value;
}

// Only finalized Markdown reports advance the sequence. A repair report is final
// only when every finding has been resolved; incomplete attempts do not use a round.
export async function nextReviewTask(directory: string): Promise<ReviewTask | undefined> {
  for (let index = 0; index < reports.length; index += 2) {
    const review = await verdict(directory, reports[index], 'review');
    if (!review) return { kind: 'review', filename: reports[index], index };
    if (review === '通过') return;
    if (review !== '需要修复') throw new Error(`检查尚未完成：${reports[index]}。删除该报告后可重新检查。`);
    const repair = await verdict(directory, reports[index + 1], 'repair');
    if (!repair) return { kind: 'repair', filename: reports[index + 1], index: index + 1 };
    if (repair !== '已修复') throw new Error(`修复尚未完成：${reports[index + 1]}。删除该报告后继续修复。`);
  }
  // The second repair completed all findings and its self-check. No third review.
}

export async function buildReviewPrompt(step: StepDefinition, task: ReviewTask): Promise<string> {
  if (!step.review) throw new Error('步骤未配置 reviewer');
  const source = task.kind === 'review' ? step.review.prompt : step.review.repairPrompt;
  const reviewFilename = task.kind === 'review' ? `${task.filename}.tmp` : reports[task.index - 1];
  const responsibilities = task.kind === 'repair' ? await readFile(new URL('./drawing-responsibilities.md', import.meta.url), 'utf8') : '';
  const body = await readFile(source, 'utf8');
  return renderPrompt(body, {
    review_report_filename: reviewFilename, repair_report_filename: task.filename + '.tmp',
    drawing_responsibilities: responsibilities,
    runtime_context: renderPromptFile(new URL('../prompts/raster-review-runtime.md', import.meta.url))
  }, String(source), ['drawing_responsibilities','runtime_context','review_report_filename',...(task.kind==='repair'?['repair_report_filename']:[])]);
}

export async function discardReviewReports(directory: string, from = 0): Promise<void> {
  for (const name of reports.slice(from).reverse()) {
    await rm(join(directory, name), { force: true });
    await rm(join(directory, `${name}.tmp`), { force: true });
  }
}

type ReviewOptions = {
  step: StepDefinition;
  directory: string;
  signal?: AbortSignal;
  progress?: (message: string) => void;
  invoke: (prompt: string, task: ReviewTask) => Promise<StepResult>;
  validate: () => Promise<void>;
};

export async function runReviews(options: ReviewOptions): Promise<void> {
  let task: ReviewTask | undefined;
  while ((task = await nextReviewTask(options.directory))) {
    options.signal?.throwIfAborted();
    // Deleting an earlier report invalidates later reports, retaining the artwork.
    await discardReviewReports(options.directory, task.index + 1);
    const draft = `${task.filename}.tmp`;
    await rm(join(options.directory, draft), { force: true });
    const result = await options.invoke(await buildReviewPrompt(options.step, task), task);
    if (result.status !== 'completed') throw new Error(`本次${task.kind === 'review' ? '检查' : '修复'}未完成：${result.summary}`);
    const conclusion = await verdict(options.directory, draft, task.kind);
    if (!conclusion) throw new Error(`缺少完整报告：${draft}`);
    if (conclusion === '无法完成检查') throw new Error(`检查尚未完成：${result.summary}`);
    if (conclusion === '仍有问题') {
      options.progress?.('反馈尚未全部解决，继续原 thread 修复；不进入下一次 review。');
      continue;
    }
    await options.validate();
    await publishReportAssets(join(options.directory, draft), join(options.directory, 'workspace'));
    options.signal?.throwIfAborted();
    await rename(join(options.directory, draft), join(options.directory, task.filename));
    options.progress?.(`${task.filename}：${conclusion}`);
  }
}

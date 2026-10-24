import { readFile } from 'node:fs/promises';
import { matchesHash, reviewedArtifact, svgHash } from '../.agents/skills/live2d-maker/shared/part/artifact-facts.ts';
import { safePath } from './files.ts';
import { currentAgentCalls, type AgentCall } from './agent-progress.ts';
import { partStages } from './part-stages.ts';
import { partReviewRounds } from './part-review.ts';

export const phases = ['outline', 'review', 'reduction', 'completion', 'completionCheck', 'children'] as const;
type Phase = typeof phases[number];

// These are file observations for display, not a second scheduler or a resume check.
// In particular, never run recovery/migration or follow dependency paths from reports.
export async function partProgress(directory: string, pipeline: string, groups: any[], files: Set<string>,
  json: (path: string) => Promise<any>, errors: string[], activeSince?: string, failedSince?: string) {
  const bytes = new Map<string, Promise<Buffer | undefined>>();
  const read = (path: string) => {
    if (!bytes.has(path)) bytes.set(path, (async () => {
      if (!files.has(path)) return;
      try { return await readFile(await safePath(directory, path)); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push(path + ': ' + String(error)); }
    })());
    return bytes.get(path)!;
  };
  const entries: { node: any; depth: number }[] = [];
  const visit = (nodes: any[], depth: number) => nodes.forEach(node => { entries.push({ node, depth }); visit(node.groups ?? [], depth + 1); });
  visit(groups, 0);
  const receipts = new Map<number, any>();
  const reviewInputs = new Map<any, { report: any; outline: Buffer | undefined }>();
  for (const depth of new Set(entries.map(entry => entry.depth))) {
    receipts.set(depth, await json(`${pipeline}/stages/outline-reduce/layers/${depth}.json`));
  }
  for (const { node, depth } of entries) {
    const path = (stage: string, suffix = '.svg') => `${pipeline}/${stage}/${node.id}${suffix}`;
    node.webPhases = Object.fromEntries(phases.map(phase => [phase, 'pending']));
    node.webMessages = {};
    node.webDetails = {};
    const mark = (phase: Phase, done: boolean, present: boolean, message: string) => {
      node.webPhases[phase] = done ? 'done' : present ? 'available' : 'pending';
      node.webMessages[phase] = done ? '已完成' : present ? '已有产物' : '待执行';
      if (present) node.webDetails[phase] = message;
    };
    const outline = await read(path('stages/outline'));
    const reduced = await read(path('stages/outline-reduce'));
    const completed = await read(path('parts'));
    const draft = files.has(path('stages/outline', '.draft.svg'));
    mark('outline', !!outline, !!outline || draft, outline ? '已落稿' : '草稿 · 未落稿');

    const report = await json(path('stages/review', '.review.json'));
    const validReport = report?.groupId === node.id && Array.isArray(report.reviews);
    reviewInputs.set(node, { report: validReport ? report : undefined, outline });
    const reviewed = outline && validReport ? reviewedArtifact(outline, path('stages/outline'), report) : undefined;
    const last = validReport ? report.reviews.at(-1) : undefined;
    mark('review', !!reviewed, !!report, reviewed ? reviewed.note ?? '复核通过'
      : last && outline && matchesHash(outline, last.candidateHash)
        ? last.verdict === 'revise' ? '需要返修' : last.verdict === 'blocked' ? '复核受阻' : '记录待确认'
        : '复核记录与当前稿未匹配');

    const receipt = receipts.get(depth);
    const reducedRecord = receipt?.depth === depth && Array.isArray(receipt.groups)
      ? receipt.groups.find((item: any) => item.id === node.id) : undefined;
    const reductionDone = !!(reduced && outline && matchesHash(outline, reducedRecord?.inputHash) && matchesHash(reduced, reducedRecord?.outputHash));
    mark('reduction', reductionDone, !!reduced || files.has(path('stages/outline-reduce', '.draft.svg')),
      reductionDone ? '已落稿 · 去重记录匹配' : reduced ? '已有正式稿 · 记录待确认' : '草稿 · 未落稿');

    const completionDone = !!(completed && reduced && completed.toString().match(/\bdata-source-sha256=['"]([^'"]+)['"]/)?.[1] === svgHash(reduced));
    mark('completion', completionDone, !!completed || files.has(path('parts', '.draft.svg')),
      completionDone ? '已落稿 · 来源匹配' : completed ? '已有正式稿 · 来源待确认' : '草稿 · 未落稿');
    const check = await json(path('stages/completion-check', '.json'));
    const checked = !!(check?.groupId === node.id && check.passed === true && reduced && completed
      && matchesHash(reduced, check.beforeHash) && matchesHash(completed, check.afterHash));
    mark('completionCheck', checked, !!check, checked ? '补全检查通过' : '检查记录与当前稿未匹配');
    const childrenDone = !!(completed && node.childrenAnalysis && matchesHash(completed, node.childrenAnalysis.sourceHash));
    mark('children', childrenDone || (node.kind === 'part' && checked), !!node.childrenAnalysis || !!node.groups?.length,
      childrenDone ? `已分析 · ${node.groups?.length ?? 0} 个直属节点` : '已有分组 · 来源待确认');
    if (node.kind === 'part') node.webDetails.children = '终止 part，不再拆分';
  }

  // request.json is created only after the agent obtains a concurrency slot.
  // A leftover draft or a queued group is not evidence that an agent is drawing.
  const calls = await currentAgentCalls(directory, pipeline, files, errors, activeSince ?? failedSince, !!failedSince);
  for (const { node } of entries) {
    const { report, outline } = reviewInputs.get(node)!;
    node.webReviewRounds = partReviewRounds(node.id, report, outline, calls, !!activeSince);
  }
  const latest = new Map<string, { call: AgentCall; phase: Phase; targets: any[] }>();
  for (const call of calls) {
    const match = /^(组轮廓绘制|组轮廓返修|组轮廓review|正面遮挡补全|直属结构拆分|同层轮廓去重)-(.+)$/.exec(call.name);
    if (!match) continue;
    const phase: Phase = ({ '组轮廓绘制': 'outline', '组轮廓返修': 'review', '组轮廓review': 'review',
      '正面遮挡补全': 'completion', '直属结构拆分': 'children', '同层轮廓去重': 'reduction' } as const)[match[1]]!;
    const targets = entries.filter(({ node, depth }) => phase === 'reduction' ? String(depth) === match[2] : node.id === match[2]).map(entry => entry.node);
    for (const node of targets) {
      const id = `${node.id}:${phase}`;
      latest.set(id, { call, phase, targets: [node] });
    }
  }
  for (const { call, phase, targets } of latest.values()) {
    if (call.failed) {
      for (const node of targets) {
        node.webPhases[phase] = 'failed'; node.webMessages[phase] = '执行失败';
        node.webDetails[phase] = '调用失败，请查看运行记录：' + call.name;
      }
      continue;
    }
    if (!activeSince) continue;
    if (call.finished) continue;
    for (const node of targets) {
      node.webPhases[phase] = 'running';
      node.webMessages[phase] = '进行中';
      node.webDetails[phase] = call.name.startsWith('组轮廓返修') ? '正在返修草稿'
        : ({ outline: '正在绘制 / 自检', review: '正在复核', reduction: '正在同层去重', completion: '正在补全 / 自检', children: '正在分析直属结构' } as any)[phase];
    }
  }
  return partStages(directory, pipeline, groups, files, json, read, calls, errors, !!activeSince);
}

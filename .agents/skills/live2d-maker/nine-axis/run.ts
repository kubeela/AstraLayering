import { parseArgs } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatAgentError } from '../shared/codex/diagnostics.ts';
import { acquireTaskLock } from '../workflow/state.ts';
import { sectionDirectory, taskDirectory, resolveInput, resolveRunsDirectory } from '../shared/paths.ts';
import { knowledgeDirectory, renderKnowledge, selectKnowledge } from '../shared/knowledge.ts';
import { runSection } from '../shared/step-section.ts';
import { loadWorkflowEnvironment, type VideoApi, type WorkflowEnvironment } from '../shared/codex/environment.ts';
import { ffmpegPath, produceTurn, resolveTurnInput, turnOutputs, type TurnInput } from './turn.ts';

export const help = `nine-axis — 头部九轴
pnpm nine-axis --name <任务名> --knowledge <先验知识目录> [--dir <绝对运行根目录>] [--dry-run]
step01_turn：从工作台当前的角色图（阴影蒙版交付后为 shadow/step01_mask/character-shadowed.png，否则为组装图）
按脸、头发、头饰形状截取头顶到胸口的方形上半身，作为首帧交给生视频模型，镜头匀速环绕 0→90°；
程序按帧序取出 30° 关键帧 turn-30.png。需要 .env 的 layering_video_base_url / layering_video_api_key 和 ffmpeg。
提示词：<knowledge>/nine-axis/step01_turn/prompts/orbit.md。上游产物重做后 step01 随之重做。
总入口：pnpm start --name <任务名> --from nine-axis --to nine-axis。
`;
export const turnPromptPath = () => join(knowledgeDirectory(), 'nine-axis/step01_turn/prompts/orbit.md');
export function turnPrompt(): string {
  const path = turnPromptPath();
  if (!existsSync(path)) throw new Error(`先验知识缺少转头视频提示词：${path}`);
  const text = renderKnowledge(readFileSync(path, 'utf8'), {}).trim();
  if (!text) throw new Error(`转头视频提示词为空：${path}`);
  return text;
}
// Checked before any step starts, so a run without the video service fails at once.
export function requireVideoApi(environment: Pick<WorkflowEnvironment, 'videoApi'>): VideoApi {
  if (!environment.videoApi) throw new Error('头部九轴转头视频需要生视频接口：请在 live2d-maker/.env（或网页「设置」的生图服务）填写 layering_video_base_url 与 layering_video_api_key。未配置时此步骤无法运行。');
  return environment.videoApi;
}

export type NineAxisOptions = { name: string; dir?: string; dryRun?: boolean; signal?: AbortSignal; progress?: (message: string) => void };
export type NineAxisDependencies = { environment?: Pick<WorkflowEnvironment, 'videoApi'>; ffmpeg?: string;
  produce?: typeof produceTurn; resolveInput?: (name: string, root: string) => Promise<TurnInput> };
export async function runWorkflow(options: NineAxisOptions, dependencies: NineAxisDependencies = {}): Promise<string> {
  const root = resolveRunsDirectory(options.dir), progress = options.progress ?? (() => {});
  const api = requireVideoApi(dependencies.environment ?? loadWorkflowEnvironment());
  const prompt = turnPrompt(), ffmpeg = dependencies.ffmpeg ?? await ffmpegPath();
  const input = await (dependencies.resolveInput ?? resolveTurnInput)(options.name, root);
  const produce = dependencies.produce ?? produceTurn;
  let summary = 'nine-axis/step01_turn 已完成（沿用已有结果）';
  await runSection({ directory: sectionDirectory(options.name, 'nine-axis', root), root: taskDirectory(options.name, root),
    steps: [{ number: 1, note: 'turn', upstream: [input.source.id], outputs: turnOutputs }], upstream: [input.source],
    dryRun: options.dryRun, signal: options.signal, progress, resetNote: '（来源角色图已变化）',
    async step(step, status) {
      if (status === 'completed') return undefined;
      return async () => {
        if (options.dryRun) { progress(`预览：从 ${input.color} 截取上半身，用 ${api.model} 生成转头视频并取 30° 帧。\n提示词：\n${prompt}`); summary = '预览完成，未调用模型'; return; }
        const frame = await produce(step.directory, input, api, prompt, { signal: options.signal, progress, ffmpeg });
        summary = `nine-axis/step01_turn 已完成：第 ${frame.frameIndex}/${frame.frameCount - 1} 帧（约 ${frame.angle.toFixed(1)}°）`;
      };
    } });
  return summary;
}

export function parseRunArguments(args: string[]) {
  const { values } = parseArgs({ args, options: { name: { type: 'string' }, dir: { type: 'string' }, knowledge: { type: 'string' },
    'dry-run': { type: 'boolean' }, help: { type: 'boolean', short: 'h' } }, allowPositionals: false });
  if (!values.help && !values.name?.trim()) throw new Error('必须提供 --name <任务名>。');
  if (!values.help && !values.knowledge?.trim()) throw new Error('必须提供 --knowledge <先验知识目录>；独立 section 不保存配置，每次启动（含续跑）都须指定。');
  if (values.dir !== undefined) resolveRunsDirectory(values.dir);
  return values;
}
if (import.meta.main) {
  (async () => {
    const args = parseRunArguments(process.argv.slice(2));
    if (args.help) { console.log(help); return; }
    selectKnowledge(resolveInput(args.name!, args.knowledge!, args.dir));
    const controller = new AbortController(), stop = () => controller.abort(new Error('头部九轴已中断；续跑会重新生成未完成的步骤。'));
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    const release = args['dry-run'] ? undefined : await acquireTaskLock(taskDirectory(args.name!, args.dir));
    try { console.log(await runWorkflow({ name: args.name!, dir: args.dir, dryRun: args['dry-run'], signal: controller.signal, progress: console.log })); }
    finally { await release?.(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
  })().catch(error => { console.error(formatAgentError(error)); process.exitCode = 1; });
}

import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { CodexAgents, type AgentOptions, type GeneratedImage } from './agents.ts';
import { defaultAgentConcurrency } from './agent-runtime.ts';
import { nodeKind, normalizeGroups, walkGroups } from './groups.ts';
import { GroupExecutionError, runLayering } from './layering.ts';
import { createLayeringSteps } from './layering-steps.ts';
import { groupStages, type GroupInput, type GroupNode, type LayeringResult, type LayeringSteps, type SvgMerger } from './layering-types.ts';
import { getPreparationDirectory, loadPreparedReferences, prepareReferences, type PreparationInput, type PreparationReferences, type PreparationSteps } from './preparation.ts';
import { defaultConcurrency, validateWorkflowOptions } from './workflow.ts';

function imageTaskPrompt(drawingPrompt: string): string {
  return `【绘制提示词】\n${drawingPrompt.trim()}\n\n【执行规则】\n将绘制提示词原样传给 image_generation，不增补绘制要求。传入两张参考图，启用透明背景，输出 PNG。只调用一次；完成后直接返回路径，不检查、不返修、不重试。成功时 savedPath 为真实路径、error 为 null；失败时 savedPath 为 null、error 填原因。`;
}

async function saveImage(image: GeneratedImage | undefined, output: string): Promise<void> {
  if (!image) throw new Error('image_generation did not produce an image');
  const bytes = await readFile(image.savedPath);
  if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    throw new Error('image_generation did not produce a PNG image');
  }
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes);
    await rename(temporary, output);
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

export function createPreparationSteps(agents: Pick<CodexAgents, 'run'>): PreparationSteps {
  const imageOutputSchema = {
    type: 'object', properties: { savedPath: { type: ['string', 'null'] }, error: { type: ['string', 'null'] } },
    required: ['savedPath', 'error'], additionalProperties: false,
  };
  const styleReference = fileURLToPath(new URL('resources/简化参考图片.png', import.meta.url));
  return {
    judge: async (image, prompt) => {
      const result = await agents.run({
        name: '参考判断', prompt, images: [
          { path: image, description: '图 1：角色原始参考图。' },
          { path: styleReference, description: '图 2：目标 Live2D 立绘画风参考，只比较画法。' },
        ],
        outputSchema: {
          type: 'object', properties: { needsSimplification: { type: 'boolean' }, reason: { type: 'string' } },
          required: ['needsSimplification', 'reason'], additionalProperties: false,
        },
      });
      return JSON.parse(result.text);
    },
    simplify: async (image, output, prompt) => {
      const result = await agents.run({
        name: '简化图片', prompt: imageTaskPrompt(prompt), imageGeneration: true, outputSchema: imageOutputSchema,
        images: [
          { path: image, description: '图 1：角色设计参考。' },
          { path: styleReference,
            description: '图 2：目标画风参考。' },
        ],
      });
      await saveImage(result.images.at(-1), output);
    },
    baseSubject: async (image, output, prompt) => {
      const result = await agents.run({
        name: '素体换装', prompt: imageTaskPrompt(prompt), imageGeneration: true, outputSchema: imageOutputSchema,
        images: [
          { path: image, description: '图 1：已准备的角色参考图。' },
          { path: fileURLToPath(new URL('resources/连体服参考.jpg', import.meta.url)),
            description: '图 2：连体服款式参考。' },
        ],
      });
      await saveImage(result.images.at(-1), output);
    },
  };
}

export async function runPartLayering(
  input: { reference: PreparationInput; groups: GroupInput | GroupInput[] | null; concurrency?: number; maxDepth?: number },
  adapters: { steps?: LayeringSteps; mergeSvg?: SvgMerger } = {},
  agentOptions: AgentOptions = {},
): Promise<{ references: PreparationReferences; layering: LayeringResult }> {
  validateWorkflowOptions({ concurrency: input.concurrency, maxDepth: input.maxDepth });
  const directory = getPreparationDirectory(input.reference.runName);
  const agents = new CodexAgents({
    ...agentOptions, logDirectory: agentOptions.logDirectory ?? join(dirname(directory), 'agents'),
  });
  const references = input.groups === null
    ? await prepareReferences(input.reference, createPreparationSteps(agents), agentOptions.progress)
    : await loadPreparedReferences(input.reference.runName);
  const layering = await runLayering({
    directory: dirname(directory), references, groups: input.groups,
    steps: adapters.steps ?? createLayeringSteps(agents), mergeSvg: adapters.mergeSvg,
    concurrency: input.concurrency, maxDepth: input.maxDepth, progress: agentOptions.progress,
  });
  return { references, layering };
}

export async function readGroupInput(path: string): Promise<GroupInput | GroupInput[]> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (Array.isArray(value)) return normalizeGroups(value);
  if (!value || typeof value !== 'object') throw new Error('分组输入必须是组、组数组或 groups 文档');
  const object = value as Record<string, unknown>;
  if (typeof object.id === 'string') return normalizeGroups([object])[0];
  if (object.version !== undefined && object.version !== 1) throw new Error('Unsupported groups document version');
  return normalizeGroups(object.groups);
}

export function parseRunArguments(args: string[] = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    image: { type: 'string' }, name: { type: 'string' }, help: { type: 'boolean' },
    groups: { type: 'string' },
    jobs: { type: 'string', short: 'j' },
    agents: { type: 'string', short: 'a' },
    'max-depth': { type: 'string' },
  } });
  const concurrency = values.jobs === undefined ? defaultConcurrency : Number(values.jobs);
  if (values.jobs !== undefined && (!/^[1-9]\d*$/.test(values.jobs) || !Number.isSafeInteger(concurrency))) {
    throw new Error('--jobs / -j 必须是正整数');
  }
  const agentConcurrency = values.agents === undefined ? defaultAgentConcurrency : Number(values.agents);
  if (values.agents !== undefined && (!/^[1-9]\d*$/.test(values.agents) || !Number.isSafeInteger(agentConcurrency))) {
    throw new Error('--agents / -a 必须是正整数');
  }
  const maxDepth = values['max-depth'] === undefined ? undefined : Number(values['max-depth']);
  if (values['max-depth'] !== undefined && (!/^[1-9]\d*$/.test(values['max-depth']) || !Number.isSafeInteger(maxDepth))) {
    throw new Error('--max-depth 必须是正整数');
  }
  return { ...values, concurrency, agentConcurrency, maxDepth };
}

export function formatLayeringSummary(groups: GroupNode[]): string[] {
  const labels = { outline: '轮廓绘制', review: '轮廓 review', reduction: '同层轮廓去重', completion: '直接遮挡补形',
    completionCheck: '补形自检', children: '子组分析' };
  return walkGroups(groups).map(({ group }) => {
    const review = group.steps.review;
    const stage = groupStages.find(stage => group.steps[stage].status === 'failed')
      ?? groupStages.find(stage => group.steps[stage].status !== 'completed');
    const repaired = review.output?.reviewOutcome === 'repaired';
    if (!stage) return `[${group.id}] 本组流程已完成（${nodeKind(group)}）${repaired ? `；轮廓：${review.output!.note ?? '两轮返修及自检完成，不再复审'}` : ''}`;
    const step = group.steps[stage];
    const reviewLabel = review.status === 'completed'
      ? repaired ? `轮廓：${review.output!.note ?? '两轮返修及自检完成，不再复审'}` : '轮廓 review 已通过'
      : '轮廓 review 尚未通过';
    const detail = step.status === 'failed' ? `失败：${step.message}`
      : step.message?.includes('：待接入') ? '待接入'
      : stage === 'review' && step.message?.startsWith('轮廓 review blocked') ? '无法核对（blocked），保留待办'
      : stage === 'review' && step.message?.startsWith('轮廓 review revise') ? '需要返修（revise）'
      : '等待执行';
    return `[${group.id}] ${reviewLabel}；${labels[stage]}：${detail}`;
  });
}

if (import.meta.main) {
  try {
    const values = parseRunArguments();
    if (values.help) {
      console.log('pnpm start --name <运行名> [--image <角色图片路径>] [--groups <分组JSON路径>] [--jobs <并发组数>] [--agents <agent并发数>]');
      console.log('--image 首次启动需要；续跑使用运行目录中的原图，并自动补齐缺失的参考输出。');
      console.log('--groups 选择本次运行已有的组及其子组；祖先和整层去重须已完成，缺失时提示依赖，不自动启动未选分支。省略时按层自动准备或续跑。');
      console.log(`--jobs / -j 设置层内组调度并发上限，默认 ${defaultConcurrency}。绘制、review、整层去重、补形及子组分析已接入。`);
      console.log('--max-depth 限制本次制作层数：1 完成第一层并登记第二层，2 制作到第二层并登记第三层，以此类推。省略时继续到终止部件。');
      console.log(`--agents / -a 设置所有步骤共享的 agent 调用并发上限，默认 ${defaultAgentConcurrency}。临时服务错误等待后沿用会话恢复，次数不设上限，过程写入 agent 日志。`);
    } else {
      if (!values.name) throw new Error('需要 --name <运行名>');
      const { references, layering } = await runPartLayering({
        reference: { image: values.image, runName: values.name },
        groups: values.groups ? await readGroupInput(values.groups) : null, concurrency: values.concurrency, maxDepth: values.maxDepth,
      }, {}, { progress: console.log, agentConcurrency: values.agentConcurrency });
      console.log(`参考输出：${references.directory}`);
      console.log(`分组：${layering.groupsPath}`);
      console.log(`事实产物目录：${layering.statePath}`);
      for (const line of formatLayeringSummary(layering.groups)) console.log(line);
      console.log(layering.status === 'completed' ? `Layering 已完成：${layering.output}` : 'Layering 未完成，正式产物与检查记录已保存；各组状态见上方。');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof GroupExecutionError) {
      console.error('Layering 未完成：停止派发新待办，已启动的组已结束；其余未启动的待办未执行。');
      for (const line of formatLayeringSummary(error.groups)) console.error(line);
      console.error(`事实产物目录：${error.statePath}`);
    }
    process.exitCode = 1;
  }
}

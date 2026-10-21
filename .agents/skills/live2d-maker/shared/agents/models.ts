export const modelHarnesses = {
  'gpt-6.1-sol': 'codex',
  'gpt-6-astra': 'codex',
  'claude-sonnet-5.5': 'claude',
  'claude-opus-5.5': 'claude',
  'claude-haiku-5.5': 'claude',
  'gemini-4-argon': 'agv',
} as const;
export type Harness = typeof modelHarnesses[keyof typeof modelHarnesses];
export type ModelId = keyof typeof modelHarnesses;
export const reasoningEfforts = ['low', 'medium', 'high', 'xhigh'] as const;
export type ReasoningEffort = typeof reasoningEfforts[number];
export type AgentModel = { model: ModelId; effort: ReasoningEffort; harness: Harness };

const medium = 'gpt-6.1-sol-xhigh', high = 'gpt-6-astra-xhigh';
// Stable keys correspond to task kinds, never to dynamically generated group names.
export const stepDefaults = {
  part_pose_judgment: medium, part_standardize: medium,
  part_reference_judgment: medium, part_simplify: medium, part_base_subject: medium,
  part_initial_groups: medium, part_outline: medium, part_outline_review: medium,
  part_outline_repair: medium, part_reduce: medium, part_completion: medium,
  part_children: medium, part_occlusion: medium,
  clothing_preparation: medium, clothing_initial_groups: medium,
  clothing_outline: medium, clothing_outline_review: medium, clothing_outline_repair: medium,
  clothing_reduce: medium, clothing_completion: medium, clothing_children: medium, clothing_occlusion: medium,
  raster_step01: high, raster_step02: high, raster_step02_review: high, raster_step02_repair: high,
  raster_step03: medium,
  clothing_raster_step01: high, clothing_raster_step02: high,
  clothing_raster_step02_review: high, clothing_raster_step02_repair: high,
  assembly: medium,
} as const;
export type AgentStep = keyof typeof stepDefaults;
export const imageSteps: readonly AgentStep[] = [
  'part_standardize', 'part_simplify', 'part_base_subject', 'clothing_preparation',
  'raster_step01', 'clothing_raster_step01',
];
export function parseAgentModel(value: string, key: string): AgentModel {
  const match = value.trim().match(/^(.+)-(low|medium|high|xhigh)$/);
  if (!match || !Object.hasOwn(modelHarnesses, match[1])) {
    throw new Error(`${key} 必须为已支持的模型 ID 加思考力度后缀；模型：${Object.keys(modelHarnesses).join(', ')}；力度：${reasoningEfforts.join(', ')}。`);
  }
  const model = match[1] as ModelId;
  return { model, effort: match[2] as ReasoningEffort, harness: modelHarnesses[model] };
}
export function partStep(pipeline: 'part-layering' | 'clothing-part-layering', kind: string): AgentStep {
  const key = `${pipeline === 'part-layering' ? 'part' : 'clothing'}_${kind}`;
  if (!Object.hasOwn(stepDefaults, key)) throw new Error(`未知 agent 小步骤：${key}`);
  return key as AgentStep;
}

export const imageModelProviders = {
  'codex-native': 'codex',
  'gpt-image-2.5-sunburst': 'openai',
  'gpt-image-2.5-flare': 'openai',
  'gemini-nano-banana-2.1': 'google',
} as const;
export type ImageModel = keyof typeof imageModelProviders;
export type ImageApi = { baseUrl: string; apiKey: string; protocol: 'openai' | 'gemini' };

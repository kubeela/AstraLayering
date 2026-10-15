import type { PreparationReferences } from './preparation.ts';
import type { GroupStore } from './groups.ts';

export const groupStages = ['outline', 'review', 'reduction', 'completion', 'completionCheck', 'children'] as const;
export type GroupStage = typeof groupStages[number];

export type SvgArtifact = { path: string; note?: string };
export type ReviewedSvgArtifact = SvgArtifact & { reviewOutcome?: 'pass' | 'repaired' };
export type CompletionCheck = { passed: true; note?: string };
export type StepProgress<T> = {
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: T;
  message?: string;
  updatedAt?: string;
};
export type StepResult<T> =
  | { status: 'completed'; output: T }
  | { status: 'pending'; message: string };

export type GroupStageOutputs = {
  outline: SvgArtifact;
  review: ReviewedSvgArtifact;
  reduction: SvgArtifact;
  completion: SvgArtifact;
  completionCheck: CompletionCheck;
  children: { ids: string[] };
};
export type GroupProgress = { [S in GroupStage]: StepProgress<GroupStageOutputs[S]> };

// 初始层仍只识别 group；后续直属节点明确区分可递归的 group 与终止的 part。
export type GroupSeed = {
  id: string;
  kind?: 'group' | 'part';
  name?: string;
  note?: string;
  metadata?: Record<string, unknown>;
};
export type GroupInput = GroupSeed & { groups?: GroupInput[]; steps?: Partial<GroupProgress> };
export type GroupNode = GroupSeed & { groups: GroupNode[]; steps: GroupProgress };
export type Subject = 'character' | 'other';
export type InitialGrouping = { groups: GroupSeed[]; subject?: Subject };
export type ChildrenAnalysis = { groups: GroupSeed[]; note?: string };
export type GroupsDocument = {
  version: 1;
  subject?: Subject;
  groups: GroupNode[];
  merge: StepProgress<SvgArtifact>;
};

export type InitialContext = { directory: string; references: PreparationReferences; store?: GroupStore };
export type GroupContext = InitialContext & {
  group: GroupNode;
  parent?: GroupNode;
};
// 所有 SVG 生产接口只写 .draft.svg；正式路径由调度器验证后发布。
export type DrawingContext = GroupContext & { outputPath: string };
export type ReviewContext = GroupContext & { outline: SvgArtifact; reportPath: string };

export type LayeringSteps = {
  close?(): Promise<void>;
  initialGroups(context: InitialContext): Promise<StepResult<InitialGrouping>>;
  drawOutline(context: DrawingContext): Promise<StepResult<SvgArtifact>>;
  reviewOutline(context: ReviewContext): Promise<StepResult<ReviewedSvgArtifact>>;
  reduceOutlines?(context: OutlineReductionContext): Promise<StepResult<OutlineReduction>>;
  completeOcclusion(context: DrawingContext & { reviewed: SvgArtifact }): Promise<StepResult<SvgArtifact>>;
  checkCompletion(context: GroupContext & {
    before: SvgArtifact; after: SvgArtifact;
  }): Promise<StepResult<CompletionCheck>>;
  splitChildren(context: GroupContext & { completed: SvgArtifact }): Promise<StepResult<ChildrenAnalysis>>;
};

export type OutlineReductionContext = InitialContext & {
  depth: number;
  entries: { group: GroupNode; parent?: GroupNode; outline: SvgArtifact; outputPath: string }[];
};
export type OutlineReduction = {
  changed: { groupId: string; path: string }[];
  note?: string;
};

export type SvgMergeContext = {
  directory: string;
  outputPath: string;
  groups: GroupNode[];
  parts: { groupId: string; svg: SvgArtifact }[];
};
// 合并由程序适配器负责，不调用 agent。具体 SVG 组合规则随后单独实现。
export type SvgMerger = (context: SvgMergeContext) => Promise<StepResult<SvgArtifact>>;

export type LayeringResult = {
  status: 'pending' | 'completed';
  statePath: string;
  groupsPath: string;
  groups: GroupNode[];
  output?: string;
};

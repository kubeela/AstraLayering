import type { PreparationReferences } from './preparation.ts';
import type { GroupStore } from './groups.ts';

export const groupStages = ['outline', 'review', 'completion', 'completionCheck', 'children'] as const;
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
  completion: SvgArtifact;
  completionCheck: CompletionCheck;
  children: { ids: string[] };
};
export type GroupProgress = { [S in GroupStage]: StepProgress<GroupStageOutputs[S]> };

// Agent 拆分只返回直属组；进度由程序维护，部位信息留在 metadata 中。
export type GroupSeed = {
  id: string;
  name?: string;
  note?: string;
  metadata?: Record<string, unknown>;
};
export type GroupInput = GroupSeed & { groups?: GroupInput[]; steps?: Partial<GroupProgress> };
export type GroupNode = GroupSeed & { groups: GroupNode[]; steps: GroupProgress };
export type Subject = 'character' | 'other';
export type InitialGrouping = { groups: GroupSeed[]; subject?: Subject };
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
export type DrawingContext = GroupContext & { outputPath: string };
export type ReviewContext = GroupContext & { outline: SvgArtifact; reportPath: string };

export type LayeringSteps = {
  close?(): Promise<void>;
  initialGroups(context: InitialContext): Promise<StepResult<InitialGrouping>>;
  drawOutline(context: DrawingContext): Promise<StepResult<SvgArtifact>>;
  reviewOutline(context: ReviewContext): Promise<StepResult<ReviewedSvgArtifact>>;
  completeOcclusion(context: DrawingContext & { reviewed: SvgArtifact }): Promise<StepResult<SvgArtifact>>;
  checkCompletion(context: GroupContext & {
    before: SvgArtifact; after: SvgArtifact;
  }): Promise<StepResult<CompletionCheck>>;
  splitChildren(context: GroupContext & { completed: SvgArtifact }): Promise<StepResult<{ groups: GroupSeed[] }>>;
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

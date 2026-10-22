export type ProgressStatus = 'pending' | 'running' | 'available' | 'done';
export type GroupPhase = 'outline' | 'review' | 'reduction' | 'completion' | 'completionCheck' | 'children';
export interface ProgressGroup {
  webPhases?: Partial<Record<GroupPhase, string>>;
}
export interface Artifact {
  path: string;
  label: string;
  kind: 'image' | 'file';
}
export interface ProgressStep {
  id: string;
  title: string;
  status: string;
  children: ProgressStep[];
  note: string;
  childrenMode?: 'alternative';
}
export const groupPhases: [GroupPhase, string][];
export const statusNames: Record<ProgressStatus, string>;
export function displayStatus(status?: string, hasArtifacts?: boolean): ProgressStatus;
export function statusLabel(status?: string): string;
export function groupSummary(group: ProgressGroup): { status: ProgressStatus; text: string };
export function groupPreviewArtifacts(group: ProgressGroup, phaseFiles: Record<GroupPhase, Artifact[]>,
  files: Set<string>, versions?: Record<string, string>): Artifact[];
export function groupLayers<T extends { groups?: T[] }>(groups: T[]): T[][];
export function groupArtifacts(pipeline: string, group: { id: string }, depth: number): Record<GroupPhase, Artifact[]>;
export const pipelineSteps: ProgressStep[][];
export const stepArtifacts: Record<string, Artifact[]>[];
export function shadowInspectionArtifacts(files: string[]): Artifact[];

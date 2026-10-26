import { stepId } from '../step-section.ts';

// Fixed identities shared by preparation checkpoints and agent workspaces.
export const preparationStages = ['original', 'options', 'pose', 'standard', 'judgment', 'simplified', 'base', 'ready'] as const;
export type PreparationStage = typeof preparationStages[number];
export const stageStep = (stage: PreparationStage) => stepId(preparationStages.indexOf(stage) + 1);
export const stepStage = (id: string) => preparationStages[Number(id.slice(4)) - 1];

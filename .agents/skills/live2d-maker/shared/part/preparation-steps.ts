import { stepId } from '../step-section.ts';

// Fixed identities shared by preparation checkpoints and agent workspaces.
// The retired style judgment used step05; retain every other step number.
export const preparationNumbers = { original: 1, options: 2, pose: 3, standard: 4, simplified: 6, base: 7, ready: 8 } as const;
export type PreparationStage = keyof typeof preparationNumbers;
export const preparationStages = Object.keys(preparationNumbers) as PreparationStage[];
export const stageStep = (stage: PreparationStage) => stepId(preparationNumbers[stage]);
export const stepStage = (id: string) => preparationStages.find(stage => stageStep(stage) === id)!;

import { partSteps, stepNumber, stepPattern } from '../step-paths.js';

// The preparation stages are the first steps of the part section.
export const preparationStages = ['original', 'options', 'pose', 'standard', 'simplified', 'base', 'ready'] as const;
export type PreparationStage = typeof preparationStages[number];
export const stageStep = (stage: PreparationStage) => partSteps[stage];
export const stageNumber = (stage: PreparationStage) => stepNumber(partSteps[stage])!;
export const stageNote = (stage: PreparationStage) => stepPattern.exec(partSteps[stage])![2];
export const stepStage = (id: string) => preparationStages.find(stage => stageStep(stage) === id)!;

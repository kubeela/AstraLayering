export type PreparationInput = { image?: string; runName: string; dir?: string; standard?: boolean; krita?: string };
export type PreparationReferences = {
  directory: string; originalImage?: string; standardImage?: string; simplifiedSubject: string; baseSubject: string;
};

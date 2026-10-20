export type PreparationInput = { image?: string; runName: string; dir?: string; standard?: boolean };
export type PreparationReferences = {
  directory: string; originalImage?: string; standardImage?: string; judgment: string; simplifiedSubject: string; baseSubject: string;
};

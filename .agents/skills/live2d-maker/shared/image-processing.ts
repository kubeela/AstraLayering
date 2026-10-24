export type ImageProcessingOptions = {
  env?: NodeJS.ProcessEnv;
  krita?: string;
  runsRoot?: string;
  progress?: (message: string) => void;
};

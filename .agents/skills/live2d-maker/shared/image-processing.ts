export type ImageProcessingOptions = {
  env?: NodeJS.ProcessEnv;
  runsRoot?: string;
  progress?: (message: string) => void;
};

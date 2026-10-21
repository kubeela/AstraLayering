export type ImageProcessingOptions = {
  env?: NodeJS.ProcessEnv;
  krita?: string;
  runsRoot?: string;
  progress?: (message: string) => void;
  matte?: (input: string, output: string, options: ImageProcessingOptions, signal: AbortSignal) => Promise<Record<string, unknown>>;
};

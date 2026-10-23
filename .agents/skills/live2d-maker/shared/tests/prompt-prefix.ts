// Compare the unchanged task introduction; dynamic slots are checked separately.
export const staticPromptPrefix = (source: string) => source.split(/\{[a-z][a-z0-9_]*\}/, 1)[0];

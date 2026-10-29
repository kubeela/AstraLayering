// Compare the unchanged task introduction; dynamic slots are checked separately.
export const staticPromptPrefix = (source: string) => source.split(/\{(?:[a-z][a-z0-9_]*\}|(?:uri|reference|shared_reference):)/, 1)[0];

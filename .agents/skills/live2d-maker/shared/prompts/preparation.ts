import {renderPrompt,renderPromptFile} from './render.ts';

export function preparationImagePrompt(source: string, kind: 'image'|'standardize'|'clothing'): string {
  const rules = renderPromptFile(new URL(`./preparation-${kind}-rules.md`,import.meta.url));
  // Stage Markdown declares the slot. Direct API callers supplying only art text
  // use the equally visible wrapper template rather than code-appended rules.
  return source.includes('{image_execution_rules}')
    ? renderPrompt(source,{image_execution_rules:rules},'preparation stage')
    : renderPromptFile(new URL('./preparation-image-task.md',import.meta.url),{drawing_prompt:source.trim(),image_execution_rules:rules});
}

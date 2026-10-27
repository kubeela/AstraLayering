import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireUpstream, simplifiedCharacter } from '../shared/upstream.ts';
import type { ShadowMode } from '../shared/shadow.ts';
import { readDressup } from '../shared/part/dressup.ts';
import { taskDirectory } from '../shared/paths.ts';

export type ShadowInput = {
  characterKra: string; characterColor: string; simplifiedCharacter: string;
  structureFiles: string[];
};
export function isShadowInput(value: unknown): value is ShadowInput {
  const input = value as ShadowInput | null;
  return !!input && [input.characterKra, input.characterColor, input.simplifiedCharacter]
    .every(path => typeof path === 'string' && !!path.trim())
    && Array.isArray(input.structureFiles) && input.structureFiles.every(path => typeof path === 'string');
}
export async function resolveShadowInput(name: string, root: string, mode: ShadowMode): Promise<ShadowInput> {
  const assembly = await requireUpstream(name, 'character-assembly', [
    { path: 'step01/character-assembled.kra' }, { path: 'step01/character-assembled.png' },
  ], root);
  const structureFiles: string[] = [];
  // Without a dress-up the clothing lane is skipped and only the character has
  // structure; older runs that made clothing parts anyway keep them.
  const clothing = mode === 'mask' && (await readDressup(taskDirectory(name, root)) !== false
    || await present(name, 'clothing-part-layering', root));
  if (mode === 'mask') for (const id of clothing ? ['part-layering', 'clothing-part-layering'] as const : ['part-layering'] as const) {
    const directory = await requireUpstream(name, id, [{ path: 'groups.json' }, { path: 'occlusion.json' }], root);
    structureFiles.push(join(directory, 'groups.json'), join(directory, 'occlusion.json'));
  }
  return { characterKra: join(assembly, 'step01/character-assembled.kra'),
    characterColor: join(assembly, 'step01/character-assembled.png'),
    simplifiedCharacter: await simplifiedCharacter(name, root), structureFiles };
}
const present = (name: string, id: 'clothing-part-layering', root: string) =>
  requireUpstream(name, id, [{ path: 'groups.json' }, { path: 'occlusion.json' }], root).then(() => true, () => false);
export function inputDirectories(input: ShadowInput): string[] {
  return [...new Set([dirname(dirname(input.characterKra)), dirname(dirname(input.simplifiedCharacter)),
    ...input.structureFiles.map(dirname)])];
}
export async function fileHash(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}
export async function inputFingerprint(input: ShadowInput, mode: ShadowMode, prompt: URL, rules: URL[] = []): Promise<string> {
  const hashes = await Promise.all([input.characterKra, input.characterColor, input.simplifiedCharacter,
    ...input.structureFiles].map(fileHash));
  return createHash('sha256').update(JSON.stringify({ version: 1, mode, hashes,
    prompt: await readFile(prompt, 'utf8'), ...(rules.length ? { rules: await Promise.all(rules.map(p => fileHash(fileURLToPath(p)))) } : {}) })).digest('hex');
}

// Code/path-only upgrades keep completed art. Change recipe deliberately when
// drawing behavior changes; inputs, instructions and visual guides stay hashed.
export async function shadowInputFingerprint(input: ShadowInput, mode: ShadowMode, prompt: URL, rules: URL[] = []): Promise<string> {
  const hashes = await Promise.all([input.characterKra, input.characterColor, input.simplifiedCharacter, ...input.structureFiles].map(fileHash));
  return createHash('sha256').update(JSON.stringify({ version: 2, recipe: 1, mode, hashes,
    prompt: await readFile(prompt, 'utf8'), rules: await Promise.all(rules.map(p => fileHash(fileURLToPath(p)))) })).digest('hex');
}
// Prompt texts a completed branch may have been recorded with: the current one
// and the one before the shared Krita environment line was removed.
const earlierPrompts = (prompt: string) => [prompt, prompt.replace('{runtime_context}', '{krita_environment}\n\n{runtime_context}')];
export async function compatibleShadowFingerprint(input: ShadowInput, recorded: string | undefined, mode: ShadowMode, prompt: URL, rules: URL[] = []): Promise<boolean> {
  if (!recorded) return false;
  const currentRules = await Promise.all(rules.map(p => fileHash(fileURLToPath(p))));
  const hashes = await Promise.all([input.characterKra, input.characterColor, input.simplifiedCharacter, ...input.structureFiles].map(fileHash));
  const recipes: { mode: ShadowMode; promptHash: string; rules: string[] }[] = JSON.parse(await readFile(new URL('./legacy-recipes.json', import.meta.url), 'utf8'));
  const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  return earlierPrompts(await readFile(prompt, 'utf8')).some(currentPrompt => {
    if (recorded === digest({ version: 2, recipe: 1, mode, hashes, prompt: currentPrompt, rules: currentRules })) return true;
    const oldPrompt = currentPrompt.replace('先读运行信息中列出的 inputs.json、production.md', '先读 references/inputs.json、production.md');
    const promptHash = createHash('sha256').update(oldPrompt).digest('hex');
    return recipes.some(recipe => recipe.mode === mode && recipe.promptHash === promptHash
      && JSON.stringify(recipe.rules.slice(0, currentRules.length)) === JSON.stringify(currentRules)
      && recorded === digest({ version: 1, mode, hashes, prompt: oldPrompt, ...(recipe.rules.length ? { rules: recipe.rules } : {}) }));
  });
}

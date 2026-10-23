import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {renderPromptFile} from '../prompts/render.ts';
import type {KritaInstallation} from '../raster/krita.ts';
export async function kritaEnvironmentPrompt(krita: KritaInstallation): Promise<string> {
  const source = new URL('./environment.md', import.meta.url);
  return renderPromptFile(new URL('./environment-section.md',import.meta.url), {
    source_path:fileURLToPath(source), environment_rules:await readFile(source,'utf8'),
    krita_executable:JSON.stringify(krita.executable), krita_version:krita.version,
  });
}

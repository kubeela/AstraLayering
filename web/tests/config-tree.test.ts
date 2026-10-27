import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const tree = source.slice(source.indexOf('function configTree()'), source.indexOf('function configPage()'));
const files = [
  'shared/prompts/nano-solid-background.md',
  'shared/tools/submit_review/description.md',
  'shared/tools/submit_review/schema.json',
  'shared/tools/schema_only/schema.json',
  'shadow/prompts/mask.md',
  'shadow/tools/inspect_shadow_mask/description.md',
  'shadow/tools/inspect_shadow_mask/schema.json',
  'part-layering/prompts/groups/prompt.md',
  'part-layering/prompts/groups/face/prompt.md',
  'part-layering/prompts/groups/face/eye_left/prompt.md',
  'SKILL.md',
];
function render(file: string, configFilter = '', configFolders = new Map<string, boolean>()): string {
  return runInNewContext(tree + '\nconfigTree();', {
    configFiles: files,
    state: { file, configFilter, configFolders },
    icon: () => '',
    esc: (value: string) => value,
  });
}

test('shared prompts coexist with tool descriptions and schema-only tools', () => {
  const html = render('SKILL.md');
  assert.ok(html.includes('data-config-file="shared/prompts/nano-solid-background.md"'));
  assert.ok(html.includes('data-config-file="shared/tools/submit_review/description.md"'));
  assert.ok(html.includes('data-config-file="shared/tools/schema_only/schema.json"'));
});

test('selected tools and search results retain access to both definition files', () => {
  for (const html of [render(files[1]), render('SKILL.md', 'submit_review')]) {
    assert.ok(html.includes('data-config-file="shared/tools/submit_review/description.md"'));
    assert.ok(html.includes('data-config-file="shared/tools/submit_review/schema.json"'));
  }
});

// The opening tag of the folder holding `path`.
const folder = (html: string, path: string) => html.match(new RegExp(`<details class="config-(?:folder|family)" data-config-folder="${path}"[^>]*>`))?.[0] ?? '';

test('tools are folders holding their definition files, in every owner', () => {
  const html = render('SKILL.md');
  // shadow/tools holds one tool, so the two share a row; shared/tools holds two.
  assert.match(html, /<span>tools \/ inspect_shadow_mask<\/span>/);
  assert.match(html, /<span>tools<\/span>[\s\S]*<span>submit_review<\/span>/);
  assert.ok(html.includes('data-config-file="shadow/tools/inspect_shadow_mask/schema.json"'));
  assert.match(html, /<span>schema.json<\/span>/);
});

test('same-named prompts sit in their own nested folders; a folder with one folder shares its row', () => {
  const html = render('part-layering/prompts/groups/face/eye_left/prompt.md');
  // prompts holds only groups: one row.
  assert.match(html, /<span>prompts \/ groups<\/span>/);
  assert.ok(html.indexOf('data-config-folder="part-layering/prompts/groups/face"') < html.indexOf('data-config-folder="part-layering/prompts/groups/face/eye_left"'));
  // Every folder around the selected file is open, the others are not.
  for (const path of ['part-layering', 'part-layering/prompts/groups', 'part-layering/prompts/groups/face', 'part-layering/prompts/groups/face/eye_left'])
    assert.match(folder(html, path), / open>$/, path);
  assert.doesNotMatch(folder(html, 'shared/tools/submit_review'), / open>$/);
  assert.match(folder(html, '.'), /data-config-folder="\."/);
  assert.ok(html.includes('data-config-file="SKILL.md"'));
});

test('a folder the user opened or closed keeps that state; a search opens everything', () => {
  const selected = 'part-layering/prompts/groups/face/eye_left/prompt.md';
  const html = render(selected, '', new Map([['part-layering/prompts/groups/face', false], ['shared/tools/submit_review', true]]));
  assert.doesNotMatch(folder(html, 'part-layering/prompts/groups/face'), / open>$/);
  assert.match(folder(html, 'shared/tools/submit_review'), / open>$/);
  const searched = render(selected, 'mask', new Map([['shadow/tools/inspect_shadow_mask', false]]));
  assert.match(folder(searched, 'shadow/tools/inspect_shadow_mask'), / open>$/);
  assert.ok(!searched.includes('data-config-file="SKILL.md"'));
});

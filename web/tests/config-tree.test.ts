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
];
function render(file: string, configFilter = ''): string {
  return runInNewContext(tree + '\nconfigTree();', {
    configFiles: files,
    state: { file, configFilter },
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

test('pipeline-owned tools group by tool name like shared ones', () => {
  const closed = render('SKILL.md');
  assert.ok(closed.includes('data-config-file="shadow/tools/inspect_shadow_mask/description.md"'));
  assert.ok(!closed.includes('data-config-file="shadow/tools/inspect_shadow_mask/schema.json"'));
  assert.match(closed, /<span>inspect_shadow_mask<\/span>/);
  const open = render('shadow/tools/inspect_shadow_mask/schema.json');
  assert.ok(open.includes('data-config-file="shadow/tools/inspect_shadow_mask/description.md"'));
  assert.match(open, /<span>inspect_shadow_mask \/ schema.json<\/span>/);
  assert.match(open, /<span>mask.md<\/span>/);
});

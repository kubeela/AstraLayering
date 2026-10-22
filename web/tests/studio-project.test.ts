import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, symlink, rm } from "node:fs/promises";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from 'node:crypto';
import { createWorkbench } from "../server.ts";
import { studioArtifacts } from "../../.agents/skills/live2d-maker/shared/studio-artifacts.ts";
import { steps } from "../../.agents/skills/live2d-maker/character-assembly/steps.ts";
import { shadowArtifacts } from '../../.agents/skills/live2d-maker/shared/shadow.ts';

async function fixture(t: any) {
  const root = await mkdtemp(join(tmpdir(), "astra-project-")),
    dir = join(root, "runs"),
    name = "角色",
    project = join(dir, name);
  await mkdir(project, { recursive: true });
  const server = await createWorkbench({
    defaultDir: dir,
    settingsPath: join(root, "settings.json"),
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  });
  const base = "http://127.0.0.1:" + (server.address() as any).port;
  const get = (override = {}) =>
    fetch(
      base +
        "/api/studio/project?" +
        new URLSearchParams({ name, dir, ...override }),
    );
  const put = async (path: string, value = "fixture") => {
    const file = join(project, path);
    await mkdir(join(file, ".."), { recursive: true });
    await writeFile(file, value);
  };
  return { root, dir, name, project, get, put };
}
test("Project preview reads only the fixed assembly and lighting outputs; absent maps are pending", async (t) => {
  const f = await fixture(t);
  await f.put("backups/character-assembled.kra");
  await f.put("normal.png");
  await f.put("raster-layering/step01/depth.png");
  let data = (await (await f.get()).json()) as any;
  assert.equal(data.files.document.available, false);
  assert.equal(data.files.normal.available, false);
  assert.equal(data.files.depth.available, false);
  await f.put(studioArtifacts.document);
  await f.put(studioArtifacts.color);
  data = (await (await f.get()).json()) as any;
  assert.equal(data.files.document.path, studioArtifacts.document);
  assert.equal(data.files.document.available, true);
  assert.equal(data.files.normal.available, false);
  await f.put(studioArtifacts.normal, "normal");
  await f.put(studioArtifacts.depth, "depth");
  data = (await (await f.get()).json()) as any;
  assert.equal(data.files.normal.available, true);
  assert.equal(data.files.depth.available, true);
  const version = data.files.normal.version;
  await f.put(studioArtifacts.normal, "updated normal");
  assert.notEqual(
    ((await (await f.get()).json()) as any).files.normal.version,
    version,
  );
  await f.put(studioArtifacts.normal, "");
  assert.equal(
    ((await (await f.get()).json()) as any).files.normal.available,
    false,
  );
  assert.ok(
    steps[0].requiredFiles.includes(basename(studioArtifacts.document) as any),
  );
  assert.ok(
    steps[0].requiredFiles.includes(basename(studioArtifacts.color) as any),
  );
  assert.ok(
    studioArtifacts.document.startsWith(
      "character-assembly/" + steps[0].id + "/",
    ),
  );
});
test("Project preview rejects stale directories, escaping names and symlinked outputs", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.get({ dir: f.root })).status, 409);
  assert.equal((await f.get({ name: "../outside" })).status, 400);
  await mkdir(join(f.project, "lighting"));
  const outside = join(f.root, "private.png");
  await writeFile(outside, "private");
  await symlink(outside, join(f.project, studioArtifacts.normal));
  assert.equal((await f.get()).status, 400);
});
test('Two shadow routes coexist: last complete selection chooses its document and pauses stale maps', async t => {
  const f = await fixture(t), hash = (value: string) => createHash('sha256').update(value).digest('hex');
  await f.put(studioArtifacts.document, 'source'); await f.put(studioArtifacts.color, 'color');
  await f.put(studioArtifacts.normal); await f.put(studioArtifacts.depth);
  await f.put(shadowArtifacts.maskDocument); await f.put(shadowArtifacts.maskColor);
  const selection = { version: 1, mode: 'mask', sourceKraHash: hash('source'), sourceColorHash: hash('color') };
  await f.put(shadowArtifacts.selection, JSON.stringify(selection));
  let data = await (await f.get()).json() as any;
  assert.equal(data.shadowMode, 'mask'); assert.equal(data.files.document.path, shadowArtifacts.maskDocument);
  assert.equal(data.files.normal.available, false); assert.equal(data.files.depth.available, false);
  await f.put(shadowArtifacts.selection, JSON.stringify({ ...selection, mode: 'normal-depth' }));
  data = await (await f.get()).json() as any;
  assert.equal(data.files.document.path, studioArtifacts.document); assert.equal(data.files.normal.available, true);
  await f.put(studioArtifacts.document, 'changed');
  data = await (await f.get()).json() as any;
  assert.equal(data.shadowStale, true); assert.equal(data.files.normal.available, false);
});

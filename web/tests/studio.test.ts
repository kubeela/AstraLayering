import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  defaults,
  validateSettings,
  lightDirection,
  reliefGrid,
  projectionDepth,
  rendererVersion,
} from "../studio/lighting-model.js";
import { saveStudioReview, studioAsset, studioReviews } from "../studio.ts";

test("camera-space light axes, bounded recipes and uncompressed orthographic UVs", () => {
  assert.deepEqual(lightDirection(0, 0), [0, 0, 1]);
  const right = lightDirection(90, 0);
  assert.ok(right[0] > 0.999 && Math.abs(right[2]) < 1e-10);
  assert.throws(() => validateSettings({ normalY: 0 }), /Y/);
  assert.throws(() => validateSettings({ azimuth: NaN }), /azimuth/);
  assert.throws(() => validateSettings({ shadow: "false" }), /布尔/);
  assert.throws(() => validateSettings({ shade: "url(secret)" }), /颜色/);
  const w = 5,
    h = 5,
    depth = new Uint8Array(w * h * 4),
    alpha = new Uint8Array(w * h * 4).fill(255);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) depth[(y * w + x) * 4] = x < 2 ? 90 : 200;
  const g = reliefGrid(depth, alpha, w, h, 4);
  assert.equal(g.vertices, 25);
  assert.equal(g.display.length, 4 * 4 * 6);
  assert.ok(g.caster.length > 0 && g.caster.length < g.display.length);
  assert.deepEqual(Array.from(g.uv.slice(0, 2)), [0, 1]);
  assert.deepEqual(Array.from(g.uv.slice(-2)), [1, 0]);
  for (let i = 0; i < g.caster.length; i += 3) {
    const z = [0, 1, 2].map((j) => g.positions[g.caster[i + j] * 3 + 2]);
    assert.ok(
      Math.max(...z) - Math.min(...z) < 0.09,
      "no curtain across the hand/face discontinuity",
    );
  }
});

test("inspection records bind input hashes and renderer, reject missing assets and keep concurrent records", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "astra-studio-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const folder = join(root, "demos/lighting-lab");
  await mkdir(join(folder, "a"), { recursive: true });
  const digest = createHash("sha256").update("fixture").digest("hex"),
    sha256 = { color: digest, normal: digest, depth: digest };
  await writeFile(
    join(folder, "catalog.json"),
    JSON.stringify([
      {
        id: "a",
        files: {
          color: "a/color.png",
          normal: "a/color.png",
          depth: "a/color.png",
        },
        sha256,
      },
    ]),
  );
  await writeFile(join(folder, "a/color.png"), "fixture");
  assert.equal(
    await studioAsset(root, "a", "color"),
    join(folder, "a/color.png"),
  );
  await assert.rejects(studioAsset(root, "../../secret", "color"), /未登记/);
  await assert.rejects(studioAsset(root, "a", "../../secret"), /类型/);
  const value = {
    sample: "a",
    renderer: rendererVersion,
    inputs: sha256,
    settings: defaults,
    verdict: "accepted",
    note: "face checked",
  };
  await assert.rejects(
    saveStudioReview(root, root, { ...value, inputs: {} }),
    /素材版本/,
  );
  await assert.rejects(
    saveStudioReview(root, root, { ...value, renderer: "old" }),
    /版本/,
  );
  await Promise.all([
    saveStudioReview(root, root, value),
    saveStudioReview(root, root, { ...value, verdict: "needs-work" }),
  ]);
  const records = await studioReviews(root, root, "a");
  assert.equal(records.length, 2);
  assert.notEqual(records[0].id, records[1].id);
  assert.equal(records[0].settings.azimuth, defaults.azimuth);
  await writeFile(join(folder, "a/color.png"), "changed after loading");
  await assert.rejects(saveStudioReview(root, root, value), /贴图文件已改变/);
});

test("projection depth removes quantization noise without smoothing across foreground/background steps", () => {
  const w = 32,
    h = 8,
    depth = new Uint8Array(w * h * 4),
    alpha = new Uint8Array(w * h * 4).fill(255);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      depth[(y * w + x) * 4] = (x < 16 ? 80 : 200) + (x % 2);
  const original = depth.slice(),
    surface = projectionDepth(depth, alpha, w, h);
  assert.deepEqual(depth, original, "source PNG values are never mutated");
  assert.ok(
    surface[4 * w + 15] < 0.33 && surface[4 * w + 16] > 0.77,
    "occlusion step survives",
  );
  assert.ok(
    Math.abs(surface[4 * w + 8] - surface[4 * w + 9]) < 0.001,
    "one-byte stair steps are suppressed",
  );
  assert.ok([...surface].every(Number.isFinite));
});

// Integration acceptance against an already running, Krita-enabled workbench.
// No authoring files or workflow documents are modified.
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writePsdUint8Array } from "ag-psd";
import sharp from "sharp";
import { layerState } from "../../web/studio/layer-model.js";
const base = process.argv[2] || "http://127.0.0.1:4388/";
const out = ".web/layer-check";
await mkdir(out, { recursive: true });
const sessions = new Set();
async function post(op, value) {
  const r = await fetch(new URL("api/studio/layers/" + op, base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  return data;
}
async function open(bytes, format) {
  const r = await fetch(
    new URL("api/studio/layers/open?format=" + format, base),
    { method: "POST", body: bytes },
  );
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  sessions.add(data.session);
  return data;
}
async function asset(s, kind = "png") {
  const r = await fetch(
    new URL(
      "studio-layer-asset?" +
        new URLSearchParams({ session: s.session, revision: s.revision, kind }),
      base,
    ),
  );
  assert.ok(r.ok);
  return Buffer.from(await r.arrayBuffer());
}
async function pixels(s) {
  const { data, info } = await sharp(await asset(s))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 32);
  assert.equal(info.height, 32);
  return (x, y) => [...data.subarray((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)];
}
function image(fn) {
  const data = new Uint8ClampedArray(32 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) data.set(fn(x, y), (y * 32 + x) * 4);
  return { width: 32, height: 32, data };
}
const expected = (x, y) =>
  y >= 16
    ? [20, 40, 60, 255]
    : x < 8
      ? [20, 60, 220, 255]
      : x < 16
        ? [220, 40, 30, 255]
        : [40, 80, 120, 255];
const fixture = writePsdUint8Array({
  width: 32,
  height: 32,
  imageData: image(expected),
  children: [
    { name: "Background", imageData: image(() => [40, 80, 120, 255]) },
    {
      name: "Clip Group",
      blendMode: "normal",
      children: [
        {
          name: "Base",
          imageData: image((x, y) => [220, 40, 30, x < 16 && y < 16 ? 255 : 0]),
        },
        {
          name: "Clipped Blue",
          clipping: true,
          imageData: image((x, y) => [20, 60, 220, y < 16 ? 255 : 0]),
          mask: {
            top: 0,
            left: 0,
            bottom: 32,
            right: 32,
            defaultColor: 0,
            imageData: image((x) =>
              x < 8 ? [255, 255, 255, 255] : [0, 0, 0, 255],
            ),
          },
        },
        {
          name: "Hidden Child",
          hidden: true,
          imageData: image(() => [250, 240, 0, 255]),
        },
      ],
    },
    {
      name: "Blend Group",
      blendMode: "pass through",
      children: [
        {
          name: "Multiply",
          blendMode: "multiply",
          imageData: image((x, y) => [128, 128, 128, y >= 16 ? 255 : 0]),
        },
      ],
    },
  ],
});
await writeFile(out + "/fixture.psd", fixture);
const sourceHash = createHash("sha256").update(fixture).digest("hex");
try {
  let s = await open(fixture, "psd");
  const original = layerState(s.layers);
  assert.equal(
    s.layers.filter((l) => l.mask).length,
    1,
    "clipping conversion must retain attached masks",
  );
  assert.equal(
    s.layers.find((l) => l.name === "Clipped Blue").inheritAlpha,
    true,
  );
  let p = await pixels(s);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) assert.deepEqual(p(x, y), expected(x, y));
  async function edit(name, property, value) {
    const layers = layerState(s.layers),
      l = layers.find((l) => l.id === s.layers.find((l) => l.name === name).id);
    l[property] = value;
    s = await post("edit", {
      session: s.session,
      revision: s.revision,
      state: layers,
    });
    return pixels(s);
  }
  p = await edit("Clip Group", "visible", false);
  assert.deepEqual(p(4, 4), [40, 80, 120, 255]);
  assert.equal(s.layers.find((l) => l.name === "Hidden Child").visible, false);
  assert.equal(s.layers.find((l) => l.name === "Clipped Blue").visible, true);
  p = await edit("Clip Group", "visible", true);
  assert.deepEqual(p(4, 4), expected(4, 4));
  p = await edit("Transparency Mask", "visible", false);
  assert.deepEqual(p(12, 4), [20, 60, 220, 255]);
  assert.deepEqual(
    p(24, 4),
    [40, 80, 120, 255],
    "clip does not spill beyond base alpha",
  );
  p = await edit("Base", "visible", false);
  assert.deepEqual(
    p(4, 4),
    [40, 80, 120, 255],
    "hidden base removes clipped paint",
  );
  await edit("Base", "visible", true);
  p = await edit("Clipped Blue", "inheritAlpha", false);
  assert.deepEqual(p(24, 4), [20, 60, 220, 255]);
  await edit("Clipped Blue", "inheritAlpha", true);
  p = await edit("Blend Group", "passThrough", false);
  assert.deepEqual(p(24, 24), [128, 128, 128, 255]);
  p = await edit("Blend Group", "opacity", 128);
  assert.deepEqual(p(24, 24), [84, 104, 124, 255]);
  await assert.rejects(
    post("edit", {
      session: s.session,
      revision: s.revision - 1,
      state: layerState(s.layers),
    }),
    /版本/,
  );
  const invalid = layerState(s.layers);
  invalid[0].opacity = 256;
  await assert.rejects(
    post("edit", { session: s.session, revision: s.revision, state: invalid }),
    /范围/,
  );
  const before = await asset(s);
  await post("export", { session: s.session, revision: s.revision });
  const kra = await asset(s, "kra");
  await writeFile(out + "/edited.kra", kra);
  const reopened = await open(kra, "kra");
  assert.equal(reopened.layers.filter((l) => l.mask).length, 1);
  assert.deepEqual(
    await sharp(await asset(reopened))
      .raw()
      .toBuffer(),
    await sharp(before).raw().toBuffer(),
    "KRA round trip preserves edited composite",
  );
  s = await post("edit", {
    session: s.session,
    revision: s.revision,
    state: original,
  });
  assert.equal(s.baseline, true);
  p = await pixels(s);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) assert.deepEqual(p(x, y), expected(x, y));
  assert.equal(
    createHash("sha256")
      .update(await readFile(out + "/fixture.psd"))
      .digest("hex"),
    sourceHash,
  );
  await post("close", { session: s.session });
  sessions.delete(s.session);
  await assert.rejects(
    post("export", { session: s.session, revision: s.revision }),
    /会话/,
  );
  console.log(
    "PASS: PSD mask/clipping, inherited visibility, group passthrough, opacity, revisions, KRA round trip and source preservation",
  );
} finally {
  await Promise.all([...sessions].map((session) => post("close", { session })));
}

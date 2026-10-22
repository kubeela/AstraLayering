// Run layer-check.mjs first to create the small deterministic PSD fixture.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
const driver = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = driver.default || driver;
const base = process.argv[2] || "http://127.0.0.1:4388/";
const out = ".web/layer-browser";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1480, height: 1000 },
  ignoreHTTPSErrors: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const diagnostics = () => page.evaluate(() => window.studioDiagnostics());
async function ready() {
  await page.waitForFunction(
    () =>
      window.studioDiagnostics?.().layerSession &&
      !window.studioDiagnostics().busy &&
      !window.studioDiagnostics().layerBusy,
    null,
    { timeout: 90000 },
  );
}
async function edit(action) {
  const before = (await diagnostics()).layerRevision;
  await action();
  await page.waitForFunction(
    (r) =>
      window.studioDiagnostics().layerRevision > r &&
      !window.studioDiagnostics().busy &&
      !window.studioDiagnostics().layerBusy,
    before,
    { timeout: 30000 },
  );
}
try {
  await page.goto(new URL("studio", base).href);
  await page
    .locator("#file-document")
    .setInputFiles(".web/layer-check/fixture.psd");
  await ready();
  assert.equal(
    (await diagnostics()).layerStates.filter(
      (l) => l.type === "transparencymask",
    ).length,
    1,
  );
  const groupEye = page.getByRole("button", {
    name: "显示图层 Clip Group",
    exact: true,
  });
  await edit(() => groupEye.click());
  assert.equal(
    await page
      .getByRole("button", { name: "显示图层 Clipped Blue", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "显示图层 Hidden Child", exact: true })
      .getAttribute("aria-pressed"),
    "false",
  );
  assert.equal(await page.locator(".inherited-hidden").count(), 5);
  await edit(() => groupEye.click());
  await page
    .getByRole("button", { name: "收起 Clip Group", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "选择 Clipped Blue", exact: true })
      .count(),
    0,
  );
  await page.locator("#layer-filter").fill("Transparency");
  assert.equal(
    await page.locator("#layers .layer-row").count(),
    4,
    "filter retains ancestry through collapsed groups",
  );
  await edit(() =>
    page
      .getByRole("button", { name: "启用蒙版 Transparency Mask", exact: true })
      .click(),
  );
  await page
    .getByRole("button", { name: "选择 Transparency Mask", exact: true })
    .click();
  assert.equal(
    await page.locator("#layer-paint-properties").isVisible(),
    false,
  );
  await edit(() => page.locator("#layer-undo").click());
  await edit(() => page.locator("#layer-redo").click());
  await edit(() => page.locator("#layer-restore").click());
  await page.locator("#layer-filter").fill("");
  await page
    .getByRole("button", { name: "展开 Clip Group", exact: true })
    .click();
  await page
    .getByRole("button", { name: "选择 Clipped Blue", exact: true })
    .click();
  assert.equal(await page.locator("#layer-inherit").isChecked(), true);
  // Multiple inputs form one gesture and only the newest state reaches the canvas.
  await edit(() =>
    page.locator("#layer-opacity").evaluate((el) => {
      for (const v of [20, 80, 40]) {
        el.value = v;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }),
  );
  assert.equal(
    (await diagnostics()).layerStates.find((l) => l.name === "Clipped Blue")
      .opacity,
    102,
  );
  await edit(() => page.locator("#layer-undo").click());
  assert.equal(
    (await diagnostics()).layerStates.find((l) => l.name === "Clipped Blue")
      .opacity,
    255,
  );
  await page.screenshot({ path: out + "/fixture.png" });
  const oldSession = (await diagnostics()).layerSession;
  await page.locator("#close-document").click();
  await page.waitForTimeout(350);
  assert.equal(
    (
      await page.request.get(
        new URL(
          "studio-layer-asset?session=" + oldSession + "&revision=0",
          base,
        ).href,
      )
    ).status(),
    400,
  );
  await page.goto(new URL("studio?sample=jianma", base).href);
  await ready();
  const original = await diagnostics();
  assert.equal(original.layers, 171);
  assert.equal(
    original.layerStates.filter((l) => l.type === "transparencymask").length,
    12,
  );
  assert.deepEqual(original.maps, { normal: true, depth: true });
  assert.equal(original.tool, "move");
  await page.locator("#actual").click();
  const zoom = await page.locator("#zoom").textContent();
  const first = original.layerStates.find((l) => l.type === "paintlayer");
  await page.locator("#layer-filter").fill(first.name);
  await edit(() =>
    page
      .getByRole("button", { name: "显示图层 " + first.name, exact: true })
      .click(),
  );
  const changed = await diagnostics();
  assert.deepEqual(changed.maps, { normal: false, depth: false });
  assert.equal(changed.view, "color");
  assert.deepEqual(changed.settings, original.settings);
  assert.equal(await page.locator("#zoom").textContent(), zoom);
  assert.ok(changed.textureSizes.every(([w, h]) => w === 1024 && h === 1536));
  assert.equal(await page.locator("#map-validity").isVisible(), true);
  const normalFile = out + "/test-normal.png";
  await sharp({
    create: {
      width: 1024,
      height: 1536,
      channels: 4,
      background: { r: 128, g: 128, b: 255, alpha: 1 },
    },
  })
    .png()
    .toFile(normalFile);
  await page.locator("#file-normal").setInputFiles(normalFile);
  await page.waitForFunction(
    () =>
      !window.studioDiagnostics().busy &&
      window.studioDiagnostics().maps.normal,
  );
  assert.equal(
    (await diagnostics()).layerSession,
    changed.layerSession,
    "binding a map preserves the layer session",
  );
  await edit(() => page.locator("#layer-restore").click());
  await edit(() =>
    page
      .getByRole("button", { name: "显示图层 " + first.name, exact: true })
      .click(),
  );
  assert.deepEqual(
    (await diagnostics()).maps,
    { normal: true, depth: false },
    "maps are associated with this exact layer composition",
  );
  await edit(() => page.locator("#layer-restore").click());
  const restored = await diagnostics();
  assert.deepEqual(restored.maps, original.maps);
  assert.equal(restored.layerKey, "baseline");
  await page.locator("#fit").click();
  await page.locator("#layer-filter").fill("穿戴遮罩");
  const mask = restored.layerStates.find((l) => l.type === "transparencymask");
  await page.locator(`[data-layer="${mask.id}"] .layer-select`).click();
  await page.screenshot({ path: out + "/jianma-masks.png" });
  await edit(() =>
    page.locator(`[data-layer="${mask.id}"] [data-eye]`).click(),
  );
  const download = page.waitForEvent("download");
  await page.locator("#export-image").click();
  const png = out + "/jianma-edited.png";
  await (await download).saveAs(png);
  const meta = await sharp(png).metadata();
  assert.equal(meta.width, 1024);
  assert.equal(meta.height, 1536);
  await edit(() => page.locator("#layer-restore").click());
  await page.locator("#layer-filter").fill("");
  await page.locator("#layers").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  assert.ok(await page.locator("#layers").evaluate((el) => el.scrollTop > 0));
  await page.locator("aside.sources").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.screenshot({ path: out + "/jianma-panel-scroll.png" });
  await page.locator("#close-document").click();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: layer tree, search, parent visibility, masks, undo/redo, coalesced opacity, session cleanup, Jianma map invalidation/restoration, full-resolution export and panel scrolling",
  );
} finally {
  await browser.close();
}

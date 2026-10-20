// Run against an already-started workbench. Supply an installed Playwright module
// via PLAYWRIGHT_MODULE when it is not in this checkout's node_modules.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
const driver = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = driver.default || driver;
const url = process.argv[2] || "http://127.0.0.1:4387/";
const out = ".web/browser-check";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  await page.goto(new URL("studio", url).href);
  await page.waitForFunction(
    () =>
      window.studioDiagnostics?.().source && !window.studioDiagnostics().busy,
  );
  const original = await page.evaluate(() => window.studioDiagnostics());
  assert.equal(original.tool, "move");
  const box = await page.locator("#stage").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 30,
    box.y + box.height / 2 + 20,
  );
  await page.mouse.up();
  assert.deepEqual(
    (await page.evaluate(() => window.studioDiagnostics())).settings,
    original.settings,
    "move must not change light",
  );
  await page.locator("#fit").click();
  await page.locator('[data-tool="light"]').click();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2);
  await page.mouse.up();
  await page.waitForFunction(
    (a) => window.studioDiagnostics().settings.azimuth !== a,
    original.settings.azimuth,
  );
  const moved = await page.evaluate(() => window.studioDiagnostics());
  assert.deepEqual(
    moved.textureSizes,
    original.textureSizes,
    "interaction preserves full source textures",
  );
  const recipeDownload = page.waitForEvent("download");
  await page.locator("#export-recipe").click();
  const recipe = await recipeDownload;
  const recipePath = join(out, "recipe.json");
  await recipe.saveAs(recipePath);
  await page.selectOption("#preset", "soft");
  await page.locator("#import-recipe").setInputFiles(recipePath);
  await page.waitForFunction(
    (a) => window.studioDiagnostics().settings.azimuth === a,
    moved.settings.azimuth,
  );
  assert.deepEqual(
    (await page.evaluate(() => window.studioDiagnostics())).settings,
    moved.settings,
  );
  for (const view of ["color", "normal", "depth", "shading", "split", "lit"]) {
    await page.locator(`[data-view="${view}"]`).click();
    assert.equal(
      (await page.evaluate(() => window.studioDiagnostics())).view,
      view,
    );
  }
  const pngDownload = page.waitForEvent("download");
  await page.locator("#export-image").click();
  const png = await pngDownload;
  const pngPath = join(out, "render.png");
  await png.saveAs(pngPath);
  const meta = await sharp(pngPath).metadata();
  assert.equal(meta.width, original.source.width);
  assert.equal(meta.height, original.source.height);
  assert.equal(meta.hasAlpha, true);
  // A small calibration plate catches gamma, light energy and alpha regressions
  // independently of model-generated artwork.
  const calibration = await page.evaluate(async () => {
    const base = new URL("./studio/", location.href),
      { LightingStage, loadImage } = await import(
        new URL("renderer.js", base).href
      ),
      { defaults } = await import(new URL("lighting-model.js", base).href);
    const host = document.createElement("div");
    host.style = "position:fixed;inset:0;width:256px;height:256px";
    document.body.append(host);
    const canvas = document.createElement("canvas");
    host.append(canvas);
    const stage = new LightingStage(canvas);
    async function make(color) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d");
      ctx.fillStyle = color;
      ctx.fillRect(10, 10, 108, 108);
      return loadImage(c.toDataURL());
    }
    await stage.load({
      color: await make("#808080"),
      normal: await make("rgb(128,128,255)"),
      depth: await make("#808080"),
    });
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    async function sample(azimuth) {
      stage.apply({
        ...defaults,
        azimuth,
        elevation: 0,
        shadow: true,
        ambient: 0,
      });
      const u = URL.createObjectURL(await stage.exportPNG()),
        im = await loadImage(u);
      URL.revokeObjectURL(u);
      ctx.clearRect(0, 0, 128, 128);
      ctx.drawImage(im, 0, 0);
      return [...ctx.getImageData(64, 64, 1, 1).data];
    }
    const lit = await sample(0),
      dark = await sample(180),
      edge = [...ctx.getImageData(0, 0, 1, 1).data];
    stage.dispose();
    host.remove();
    return { lit, dark, edge };
  });
  assert.ok(
    Math.abs(calibration.lit[0] - 128) <= 2,
    "light-facing albedo stays unchanged",
  );
  assert.ok(calibration.dark[0] < calibration.lit[0] - 10);
  assert.equal(calibration.edge[3], 0);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        source: original.source,
        textureSizes: moved.textureSizes,
        exportSize: [meta.width, meta.height],
        calibration,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}

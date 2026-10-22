// Run against an already-started workbench. Supply an installed Playwright module
// via PLAYWRIGHT_MODULE when it is not in this checkout's node_modules.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { writePsdUint8Array } from "ag-psd";
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
  errors = [],
  requests = [];
page.on("request", (r) => requests.push(r.url()));
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  await page.goto(new URL("studio", url).href);
  await page.waitForFunction(() => !!window.studioDiagnostics);
  assert.equal(await page.locator("#empty-state").isVisible(), true);
  assert.equal(
    requests.some((u) => u.includes("studio-asset") || u.includes("samples")),
    false,
    "empty editor downloads no test characters",
  );
  await page.goto(new URL("studio?sample=jianma", url).href);
  await page.waitForFunction(
    () =>
      window.studioDiagnostics?.().source && !window.studioDiagnostics().busy,
  );
  const original = await page.evaluate(() => window.studioDiagnostics());
  assert.equal(original.tool, "move");
  assert.equal(original.layers, original.layerSession ? 171 : 159);
  assert.equal(original.document, "jianma-assembled.kra");
  assert.equal(await page.locator("#light-overlay").isVisible(), false);
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
    (a) => window.studioDiagnostics().settings.lightX !== a,
    original.settings.lightX,
  );
  const moved = await page.evaluate(() => window.studioDiagnostics());
  assert.equal(await page.locator("#light-overlay").isVisible(), true);
  const handle = await page.locator("#light-handle").boundingBox();
  assert.ok(
    Math.abs(handle.x + handle.width / 2 - box.x - moved.projectedLight[0]) < 1,
  );
  assert.ok(
    Math.abs(handle.y + handle.height / 2 - box.y - moved.projectedLight[1]) <
      1,
  );
  await page.locator("#light-handle").press("ArrowRight");
  await page.waitForFunction(
    (x) =>
      Math.abs(window.studioDiagnostics().settings.lightX - x - 0.02) < 0.0001,
    moved.settings.lightX,
  );
  await page.locator("#light-handle").press("ArrowLeft");
  await page.waitForFunction(
    (x) => Math.abs(window.studioDiagnostics().settings.lightX - x) < 0.0001,
    moved.settings.lightX,
  );
  const beforeDepth = await page.locator("#stage").screenshot();
  await page.locator("#number-lightZ").fill("3");
  await page.locator("#number-lightZ").press("Enter");
  await page.waitForFunction(
    () => window.studioDiagnostics().settings.lightZ === 0.06,
  );
  const nearDepth = await page.locator("#stage").screenshot();
  assert.notDeepEqual(
    nearDepth,
    beforeDepth,
    "finite light depth changes rendered pixels",
  );
  await page.locator("#number-lightZ").fill(String(moved.settings.lightZ * 50));
  await page.locator("#number-lightZ").press("Enter");
  await page.waitForFunction(
    (z) => window.studioDiagnostics().settings.lightZ === z,
    moved.settings.lightZ,
  );
  assert.deepEqual(
    moved.textureSizes,
    original.textureSizes,
    "interaction preserves full source textures",
  );
  await page.locator("#actual").click();
  assert.equal(await page.locator("#zoom").textContent(), "100%");
  const zoomed = await page.evaluate(() => window.studioDiagnostics());
  const zoomHandle = await page.locator("#light-handle").boundingBox();
  assert.ok(
    Math.abs(
      zoomHandle.x + zoomHandle.width / 2 - box.x - zoomed.projectedLight[0],
    ) < 1,
    "light projection follows zoom",
  );
  await page.locator("#fit").click();
  const recipeDownload = page.waitForEvent("download");
  await page.locator("#export-recipe").click();
  const recipe = await recipeDownload;
  const recipePath = join(out, "recipe.json");
  await recipe.saveAs(recipePath);
  await page.selectOption("#preset", "soft");
  await page.locator("#import-recipe").setInputFiles(recipePath);
  await page.waitForFunction(
    (a) => window.studioDiagnostics().settings.lightX === a,
    moved.settings.lightX,
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
  // Laptop controls remain independently scrollable, with document file state intact.
  await page.setViewportSize({ width: 1366, height: 800 });
  await page.locator("#export-recipe").scrollIntoViewIfNeeded();
  assert.ok(await page.locator(".controls").evaluate((e) => e.scrollTop > 0));
  await page.locator("#preset").scrollIntoViewIfNeeded();
  await page.selectOption("#preset", "jianma");
  await page.screenshot({ path: join(out, "studio-laptop.png") });
  // Real browser worker import, optional maps, binding mismatch recovery and close.
  await page.locator("#close-document").click();
  assert.equal(await page.locator("#empty-state").isVisible(), true);
  const fixture = join(out, "test-document.psd"),
    color = new Uint8ClampedArray(32 * 48 * 4);
  for (let i = 0; i < color.length; i += 4) color.set([90, 140, 210, 255], i);
  await writeFile(
    fixture,
    writePsdUint8Array({
      width: 32,
      height: 48,
      imageData: { width: 32, height: 48, data: color },
      children: [{ name: "eyes" }, { name: "hair" }],
    }),
  );
  await page.locator("#file-document").setInputFiles(fixture);
  await page.waitForFunction(
    () =>
      window.studioDiagnostics().document === "test-document.psd" &&
      !window.studioDiagnostics().busy,
  );
  assert.equal(
    (await page.evaluate(() => window.studioDiagnostics())).layers,
    2,
  );
  assert.equal(await page.locator("#lightX").isDisabled(), true);
  const normal = join(out, "normal.png"),
    bad = join(out, "bad-size.png");
  await sharp({
    create: {
      width: 32,
      height: 48,
      channels: 4,
      background: { r: 128, g: 128, b: 255, alpha: 1 },
    },
  })
    .png()
    .toFile(normal);
  await sharp({
    create: { width: 33, height: 48, channels: 4, background: "white" },
  })
    .png()
    .toFile(bad);
  await page.locator("#file-normal").setInputFiles(bad);
  await page.waitForFunction(() => !window.studioDiagnostics().busy);
  assert.equal(
    (await page.evaluate(() => window.studioDiagnostics())).maps.normal,
    false,
  );
  assert.equal(await page.locator("#toast").isVisible(), true);
  await page.locator("#file-normal").setInputFiles(normal);
  await page.waitForFunction(
    () =>
      window.studioDiagnostics().maps.normal &&
      !window.studioDiagnostics().busy,
  );
  assert.equal(await page.locator("#lightX").isDisabled(), false);
  assert.equal(await page.locator("#shadow").isDisabled(), true);
  await page.locator("#file-depth").setInputFiles(normal);
  await page.waitForFunction(
    () =>
      window.studioDiagnostics().maps.depth && !window.studioDiagnostics().busy,
  );
  assert.equal(await page.locator("#shadow").isDisabled(), false);
  await page.locator("#remove-normal").click();
  await page.waitForFunction(
    () =>
      !window.studioDiagnostics().maps.normal &&
      !window.studioDiagnostics().busy,
  );
  assert.equal(
    (await page.evaluate(() => window.studioDiagnostics())).view,
    "color",
  );
  await page.locator("#close-document").click();
  assert.deepEqual(
    (await page.evaluate(() => window.studioDiagnostics())).textureSizes,
    [],
  );
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
    async function sample(lightZ) {
      stage.apply({
        ...defaults,
        lightX: 0,
        lightY: 0,
        lightZ,
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
    const lit = await sample(3),
      dark = await sample(-3),
      edge = [...ctx.getImageData(0, 0, 1, 1).data];
    // A raised strip over a flat receiver isolates native point shadow behavior.
    const depthCanvas = document.createElement("canvas");
    depthCanvas.width = depthCanvas.height = 128;
    const depthCtx = depthCanvas.getContext("2d");
    depthCtx.fillStyle = "rgb(51,51,51)";
    depthCtx.fillRect(0, 0, 128, 128);
    depthCtx.fillStyle = "rgb(204,204,204)";
    depthCtx.fillRect(44, 42, 20, 44);
    await stage.load({
      color: await make("#808080"),
      normal: await make("rgb(128,128,255)"),
      depth: await loadImage(depthCanvas.toDataURL()),
    });
    async function projected(z, enabled) {
      stage.apply({
        ...defaults,
        lightX: -1.5,
        lightY: 0,
        lightZ: z,
        ambient: 0,
        toony: 0.99,
        shift: 0,
        depthScale: 0.9,
        shade: "#808080",
        shadow: enabled,
        shadowStrength: 1,
        shadowSoftness: 1,
        bias: 0,
      });
      const u = URL.createObjectURL(await stage.exportPNG()),
        im = await loadImage(u);
      URL.revokeObjectURL(u);
      ctx.clearRect(0, 0, 128, 128);
      ctx.drawImage(im, 0, 0);
      return ctx.getImageData(0, 0, 128, 128).data;
    }
    function shadowPixels(on, off) {
      let count = 0,
        sumX = 0;
      for (let y = 44; y < 84; y++)
        for (let x = 66; x < 116; x++) {
          const i = (y * 128 + x) * 4;
          if (off[i] - on[i] > 10) {
            count++;
            sumX += x;
          }
        }
      return { count, centerX: sumX / count };
    }
    const nearCount = shadowPixels(
      await projected(1, true),
      await projected(1, false),
    );
    const farCount = shadowPixels(
      await projected(3, true),
      await projected(3, false),
    );
    stage.dispose();
    host.remove();
    return {
      lit,
      dark,
      edge,
      nearShadow: nearCount,
      farShadow: farCount,
    };
  });
  assert.ok(
    Math.abs(calibration.lit[0] - 128) <= 2,
    "light-facing albedo stays unchanged",
  );
  assert.ok(calibration.dark[0] < calibration.lit[0] - 10);
  assert.equal(calibration.edge[3], 0);
  assert.ok(
    calibration.nearShadow.centerX > calibration.farShadow.centerX + 15,
    "near point light projects the raised strip farther across the receiver",
  );
  assert.ok(
    calibration.farShadow.count > 100 && calibration.nearShadow.count > 100,
    "occlusion remains visible at the farther position",
  );
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

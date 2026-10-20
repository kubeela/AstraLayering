// Isolated project fixtures exercise the real HTTP and file-discovery route.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { zipSync, strToU8 } from "fflate";
import sharp from "sharp";
import { createWorkbench } from "../../web/server.ts";
import { studioArtifacts } from "../../.agents/skills/live2d-maker/shared/studio-artifacts.ts";
const driver = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { chromium } = driver.default || driver;
const root = await mkdtemp(join(tmpdir(), "astra-project-browser-")),
  dir = join(root, "runs");
const server = await createWorkbench({
  defaultDir: dir,
  settingsPath: join(root, "settings.json"),
});
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  await mkdir(join(dir, "ready"), { recursive: true });
  await mkdir(join(dir, "waiting"), { recursive: true });
  const put = async (path, bytes) => {
    const p = join(dir, "ready", path);
    await mkdir(join(p, ".."), { recursive: true });
    await writeFile(p, bytes);
  };
  const png = await sharp({
    create: { width: 32, height: 48, channels: 4, background: "#aa9988" },
  })
    .png()
    .toBuffer();
  const kra = zipSync({
    "mergedimage.png": png,
    "maindoc.xml": strToU8(
      '<DOC><IMAGE width="32" height="48"><layers><layer name="Character" nodetype="paintlayer" visible="1" opacity="255"/></layers></IMAGE></DOC>',
    ),
  });
  await put(studioArtifacts.document, kra);
  await put(studioArtifacts.color, png);
  await put("references/normal.png", png);
  await put("backups/character-assembled.kra", kra);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const page = await browser.newPage({
      viewport: { width: 1366, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/studio");
  await page.locator("#open-task").click();
  assert.equal(
    await page.locator("#task-dialog select").count(),
    0,
    "project picker does not expose file selectors",
  );
  await page.getByRole("button", { name: "ready", exact: true }).click();
  await page.waitForFunction(
    () =>
      window.studioDiagnostics?.().project === "ready" &&
      !window.studioDiagnostics().busy,
  );
  assert.equal(await page.locator("#task-dialog").isVisible(), false);
  assert.equal(
    await page.locator("#normal-status").textContent(),
    "待管线生成",
  );
  await mkdir(".web/project-browser", { recursive: true });
  await page.screenshot({ path: ".web/project-browser/automatic-project.png" });
  assert.equal(await page.locator("#depth-status").textContent(), "待管线生成");
  assert.equal(await page.locator(".map-bind").first().isVisible(), false);
  assert.deepEqual(await page.evaluate(() => window.studioDiagnostics().maps), {
    normal: false,
    depth: false,
  });
  assert.equal(new URL(page.url()).searchParams.get("project"), "ready");
  // A producer publishing at the reserved output paths is enough; no manual pairing.
  const normal = await sharp({
    create: {
      width: 32,
      height: 48,
      channels: 4,
      background: { r: 128, g: 128, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  await put(studioArtifacts.normal, normal);
  await put(studioArtifacts.depth, png);
  await page.locator("#refresh-project").click();
  await page.waitForFunction(
    () =>
      window.studioDiagnostics().maps.normal &&
      window.studioDiagnostics().maps.depth &&
      !window.studioDiagnostics().busy,
  );
  assert.equal(
    await page.locator("#normal-status").textContent(),
    "管线产物 · 已绑定",
  );
  assert.equal(await page.locator("#remove-normal").isVisible(), false);
  await page.reload();
  await page.waitForFunction(
    () =>
      window.studioDiagnostics?.().project === "ready" &&
      window.studioDiagnostics().maps.normal &&
      !window.studioDiagnostics().busy,
  );
  assert.equal(
    await page.locator("#task-dialog").isVisible(),
    false,
    "project deep link opens immediately",
  );
  await page.locator("#open-task").click();
  await page.getByRole("button", { name: "waiting", exact: true }).click();
  await page.waitForFunction(() => !window.studioDiagnostics().busy);
  assert.match(
    await page.locator("#project-status").textContent(),
    /组装结果尚未生成/,
  );
  assert.equal(
    (await page.evaluate(() => window.studioDiagnostics())).project,
    "ready",
    "missing output does not replace the active character with an arbitrary file",
  );
  await page.locator("#task-dialog .dialog-close").click();
  await page.locator("#close-document").click();
  assert.equal(new URL(page.url()).searchParams.has("project"), false);
  await page.goto(base + "/studio?project=waiting");
  await page.waitForFunction(
    () =>
      window.studioDiagnostics &&
      !window.studioDiagnostics().busy &&
      !document.querySelector("#project-empty").hidden,
  );
  assert.equal(
    await page.locator("#project-empty-name").textContent(),
    "waiting",
  );
  assert.equal(await page.locator("#empty-state").isVisible(), false);
  await page.locator("#retry-project").click();
  await page.waitForFunction(() => !window.studioDiagnostics().busy);
  assert.equal(await page.locator("#project-empty").isVisible(), true);
  const emptyBox = await page.locator("#project-empty").boundingBox();
  const viewportBox = await page.locator("#drop-zone").boundingBox();
  assert.equal(emptyBox.x, viewportBox.x);
  assert.equal(emptyBox.y, viewportBox.y);
  await page.screenshot({ path: ".web/project-browser/pending-project.png" });

  await page
    .locator("#file-document")
    .setInputFiles({ name: "local.png", mimeType: "image/png", buffer: png });
  await page.waitForFunction(
    () =>
      window.studioDiagnostics().document === "local.png" &&
      !window.studioDiagnostics().busy,
  );
  assert.equal(
    await page.locator(".map-bind").first().isVisible(),
    true,
    "local file binding remains available",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: project selection and deep links, fixed outputs, pending maps, automatic map binding on refresh, missing-output preservation, local import",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await server.disposeLayers();
  await rm(root, { recursive: true, force: true });
}

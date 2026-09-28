#!/usr/bin/env node
/* Deterministic local compilation/scan. LLM authors the recipe; this tool never calls a model. */
const fs = require("node:fs"),
  path = require("node:path");
const sourceSvg = require("./svg-source.cjs");
const { validateCapabilityProfile } = require("../preview/svg-boundary-runtime.js");
const { execFileSync } = require("node:child_process");
function schemaCheck(value, name) {
  execFileSync(
    process.env.ASTRA_PYTHON || "python3",
    [
      "-c",
      "import json,sys,jsonschema; jsonschema.Draft202012Validator(json.load(open(sys.argv[1]))).validate(json.load(sys.stdin))",
      path.join(__dirname, name),
    ],
    {
      input: JSON.stringify(value),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}
const read = (p) => fs.readFileSync(p, "utf8"),
  json = (p) => JSON.parse(read(p));
const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const check = (ok, m) => {
  if (!ok) throw Error(m);
};
async function open(options) {
  const result = await sourceSvg.open(options);
  for (const p of [
    "../preview/svg-boundary-runtime.js",
    "boundary-compiler.js",
  ])
    await result.page.addScriptTag({ path: path.resolve(__dirname, p) });
  return result;
}
async function inspect(options) {
  const result = await sourceSvg.inspect(options),
    inv = json(options.out);
  inv.schema_version = "0.3.0";
  write(options.out, inv);
  return result;
}
async function build(options) {
  const bytes = fs.readFileSync(options.svg),
    recipeText = read(options.recipe),
    recipe = JSON.parse(recipeText),
    out = path.resolve(options["out-dir"]);
  schemaCheck(recipe, "boundary-recipe.schema.json");
  check(
    sourceSvg.sha(bytes) === recipe.source_sha256,
    "Source SVG fingerprint mismatch",
  );
  for (const file of ["character.svg", "controls.json", "build-report.json"])
    check(
      ![options.svg, options.recipe].some(
        (p) => path.resolve(p) === path.join(out, file),
      ),
      "Output cannot overwrite author source",
    );
  const { browser, page } = await open(options);
  try {
    await sourceSvg.mount(page, bytes.toString("utf8"));
    const result = await page.evaluate(
      (recipe) => AstraBoundaryCompiler.compile(rigSvg, recipe),
      recipe,
    );
    result.rig.source.recipe_sha256 = sourceSvg.sha(recipeText);
    schemaCheck(result.rig, "boundary-rig.schema.json");
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "character.svg"), bytes);
    write(path.join(out, "controls.json"), result.rig);
    const report = {
      status: "compiled",
      visual_status: "not_reviewed",
      source: result.rig.source,
      bindings: result.rig.bindings.length,
      coordinates: result.rig.bindings.reduce((n, b) => n + b.rest.length, 0),
      warnings: result.warnings,
      diagnostics: result.diagnostics,
      capabilities: validateCapabilityProfile(result.rig),
    };
    write(path.join(out, "build-report.json"), report);
    return report;
  } finally {
    await browser.close();
  }
}
function casesFor(rig) {
  const defaults = Object.fromEntries(
      Object.entries(rig.parameters).map(([id, p]) => [id, p.default]),
    ),
    cases = [{ id: "neutral", kind: "neutral", parameters: { ...defaults } }];
  for (const [id, p] of Object.entries(rig.parameters))
    for (const f of [0, 0.25, 0.5, 0.75, 1])
      cases.push({
        id: id + "-" + String(f),
        kind: f === 0 ? "axis_min" : f === 1 ? "axis_max" : "intermediate",
        parameters: { ...defaults, [id]: p.min + (p.max - p.min) * f },
      });
  for (const r of rig.regions)
    if (r.axes.length === 2) {
      const [a, b] = r.axes.map((a) => ({
        id: a.parameter,
        ...rig.parameters[a.parameter],
      }));
      for (const x of [0, 0.25, 0.5, 0.75, 1])
        for (const y of [0, 0.25, 0.5, 0.75, 1])
          cases.push({
            id: r.id + "-grid-" + x + "-" + y,
            kind:
              [0, 1].includes(x) && [0, 1].includes(y)
                ? "corner"
                : "intermediate",
            parameters: {
              ...defaults,
              [a.id]: a.min + (a.max - a.min) * x,
              [b.id]: b.min + (b.max - b.min) * y,
            },
          });
    }
  for (const r of rig.regions.filter(r => r.axes.length === 3)) {
    let cells = [{}];
    for (const axis of r.axes) {
      const p = rig.parameters[axis.parameter];
      cells = cells.flatMap(c => [...new Set([p.min, p.default, p.max])].map(value => ({ ...c, [axis.parameter]: value })));
    }
    cells.forEach((parameters, i) => cases.push({ id: r.id + "-volume-" + i, kind: "corner", parameters: { ...defaults, ...parameters } }));
  }
  if (rig.capability_profile === "basic-face-v1")
    for (const side of ["left", "right"])
      for (const open of [0, 1])
        for (const curve of [-1, 1])
          for (const angle of [-1, 1])
            cases.push({ id: `${side}-eye-brow-${open}-${curve}-${angle}`, kind: "corner", parameters: {
              ...defaults, [`eye.${side}.open`]: open, [`eye.${side}.curve`]: curve,
              [`brow.${side}.height`]: angle, [`brow.${side}.angle`]: angle, [`brow.${side}.curve`]: curve,
            }});
  cases.push(
    {
      id: "all-min",
      kind: "corner",
      parameters: Object.fromEntries(
        Object.entries(rig.parameters).map(([id, p]) => [id, p.min]),
      ),
    },
    {
      id: "all-max",
      kind: "corner",
      parameters: Object.fromEntries(
        Object.entries(rig.parameters).map(([id, p]) => [id, p.max]),
      ),
    },
  );
  const signature = values => JSON.stringify(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
  const seen = new Set(cases.map(c => signature(c.parameters)));
  // Authored corrective keys can fall between the regular quarter samples.
  for (const region of rig.regions) {
    let cells = [{}];
    for (const axis of region.axes)
      cells = cells.flatMap(c => axis.keys.map(value => ({ ...c, [axis.parameter]: value })));
    cells.forEach((cell, i) => {
      const parameters = { ...defaults, ...cell }, key = signature(parameters);
      if (!seen.has(key)) {
        seen.add(key);
        cases.push({ id: region.id + "-authored-" + i, kind: "corner", parameters });
      }
    });
  }
  return cases;
}
async function checkRig(options) {
  const bytes = fs.readFileSync(options.svg),
    rig = json(options.rig),
    out = path.resolve(options["out-dir"]);
  schemaCheck(rig, "boundary-rig.schema.json");
  check(
    sourceSvg.sha(bytes) === rig.source.svg_sha256,
    "SVG and rig fingerprints differ",
  );
  const { browser, page } = await open(options),
    cases = casesFor(rig),
    failures = [];
  try {
    await sourceSvg.mount(page, bytes.toString("utf8"));
    fs.mkdirSync(path.join(out, "frames"), { recursive: true });
    const crop = await page.evaluate((rig) => {
      window.runtime = new AstraBoundaryRig.Runtime(rigSvg, rig);
      window.nodeCount = rigSvg.querySelectorAll("*").length;
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const r of rig.regions) {
        const m = AstraSvgGeometry.authorMatrix(
            rigSvg.querySelector("#" + CSS.escape(r.space)),
            rigSvg,
          ),
          [l, t, rgt, b] = r.bounds;
        for (const [x, y] of [
          [l, t],
          [rgt, b],
          [l, b],
          [rgt, t],
        ]) {
          const p = new DOMPoint(x, y).matrixTransform(m);
          x0 = Math.min(x0, p.x);
          x1 = Math.max(x1, p.x);
          y0 = Math.min(y0, p.y);
          y1 = Math.max(y1, p.y);
        }
      }
      const pad = 12,
        size = Math.max(x1 - x0, y1 - y0) + 2 * pad;
      return [(x0 + x1 - size) / 2, (y0 + y1 - size) / 2, size, size];
    }, rig);
    await page
      .locator("#stage")
      .screenshot({ path: path.join(out, "full-neutral.png") });
    await page.evaluate(
      (crop) => rigSvg.setAttribute("viewBox", crop.join(" ")),
      crop,
    );
    for (let i = 0; i < cases.length; i++) {
      const c = cases[i],
        stem = String(i).padStart(3, "0");
      try {
        c.update = await page.evaluate((values) => {
          const stats = runtime.setParameters(values);
          if (rigSvg.querySelectorAll("*").length !== nodeCount)
            throw Error("SVG topology changed");
          return stats;
        }, c.parameters);
        c.image = "frames/" + stem + ".png";
        await page
          .locator("#stage")
          .screenshot({ path: path.join(out, c.image) });
      } catch (e) {
        delete c.image;
        failures.push({ id: c.id, error: e.message });
      }
    }
    const state = { status: "frames_complete", source: rig.source,
      rig_sha256: sourceSvg.sha(fs.readFileSync(options.rig)),
      visual_cases: cases.map(c => ({ ...c, ...(c.image ? { image_sha256: sourceSvg.sha(fs.readFileSync(path.join(out, c.image))) } : {}) })), failures };
    write(path.join(out, "scan-state.json"), state);
    await browser.close();
    return await finalizeScan(options);
  } finally {
    await browser.close();
  }
}
async function finalizeScan(options) {
  const rig = json(options.rig), out = path.resolve(options["out-dir"]);
  schemaCheck(rig, "boundary-rig.schema.json");
  const state = json(path.join(out, "scan-state.json"));
  check(state.status === "frames_complete", "Scan frames are incomplete");
  check(state.rig_sha256 === sourceSvg.sha(fs.readFileSync(options.rig)), "Scan controls changed");
  check(sourceSvg.sha(fs.readFileSync(options.svg)) === rig.source.svg_sha256, "Scan SVG changed");
  check(JSON.stringify(state.source) === JSON.stringify(rig.source), "Scan source changed");
  const expected = casesFor(rig), cases = state.visual_cases, failures = state.failures;
  check(expected.length === cases.length, "Scan case count changed");
  cases.forEach((c, i) => {
    check(c.id === expected[i].id && JSON.stringify(c.parameters) === JSON.stringify(expected[i].parameters), "Scan parameter mapping changed");
    if (!c.image) return;
    check(/^frames\/\d+\.png$/.test(c.image), "Invalid scan image path");
    check(sourceSvg.sha(fs.readFileSync(path.join(out, c.image))) === c.image_sha256, "Scan image changed: " + c.id);
  });
  const { browser, page } = await sourceSvg.open(options);
  const sheets = [];
  try {
    await page.setViewportSize({ width: 1600, height: 900 });
    const available = cases.filter(c => c.image);
    for (let start = 0; start < available.length; start += 20) {
      await page.setContent("<style>body{margin:0;background:#e5e7eb;font:14px sans-serif}main{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:6px}figure{margin:0;background:white}img{width:100%;display:block}figcaption{padding:6px}</style><main></main>");
      const cards = available.slice(start, start + 20).map(c => ({ id: c.id, image: fs.readFileSync(path.join(out, c.image)).toString("base64") }));
      await page.evaluate(async cards => {
        const images = [];
        for (const c of cards) {
          const f = document.createElement("figure"), i = document.createElement("img"), t = document.createElement("figcaption");
          i.src = "data:image/png;base64," + c.image; t.textContent = c.id;
          f.append(i, t); document.querySelector("main").append(f); images.push(i);
        }
        await Promise.all(images.map(i => i.decode()));
      }, cards);
      const file = start === 0 ? "contact-sheet.png" : "contact-sheet-" + (start / 20 + 1) + ".png";
      await page.screenshot({ path: path.join(out, file), fullPage: true }); sheets.push(file);
    }
    const report = {
      status: failures.length ? "failed" : "ready_for_visual_review",
      visual_status: "not_reviewed",
      source: rig.source,
      ...(rig.capability_profile ? { capability_profile: rig.capability_profile } : {}),
      capabilities: validateCapabilityProfile(rig),
      visual_cases: cases,
      contact_sheets: sheets,
      ...(state.recovery ? { recovery: state.recovery } : {}),
      failures,
      checks: [
        "source SHA-256",
        "complete authored Cartesian grid",
        "finite compiled coordinates",
        "fixed SVG node topology",
        "axis boundaries and intermediate samples",
        "two-axis eye and mouth grids",
        "three-axis brow grids and mixed eye/brow boundaries when declared",
      ],
      not_proven: [
        "art quality until independent visual review",
        "all possible parameter combinations",
        "global self-intersection freedom",
        "60 FPS in the integrated workbench",
      ],
    };
    write(path.join(out, "report.json"), report);
    return report;
  } finally {
    await browser.close();
  }
}
async function main() {
  const [command, ...args] = process.argv.slice(2),
    options = {};
  if (command === "--help" || !command) {
    console.log(
      "boundary-rig.cjs inspect --svg SVG --out inventory.json\nboundary-rig.cjs build --svg SVG --recipe recipe.json --out-dir DIR\nboundary-rig.cjs check --svg SVG --rig controls.json --out-dir DIR\nboundary-rig.cjs finalize --svg SVG --rig controls.json --out-dir DIR",
    );
    return;
  }
  check(args.length % 2 === 0, "Options require --key value pairs");
  for (let i = 0; i < args.length; i += 2) {
    check(args[i].startsWith("--"), "Invalid option");
    options[args[i].slice(2)] = args[i + 1];
  }
  const fn = { inspect, build, check: checkRig, finalize: finalizeScan }[command];
  check(fn, "Unknown command");
  const result = await fn(options);
  console.log(
    JSON.stringify(
      ["check", "finalize"].includes(command)
        ? {
            status: result.status,
            cases: result.visual_cases.length,
            failures: result.failures,
          }
        : result,
      null,
      2,
    ),
  );
  if (result.status === "failed") process.exitCode = 1;
}
module.exports = { open, inspect, build, checkRig, finalizeScan, casesFor };
if (require.main === module)
  main().catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  });

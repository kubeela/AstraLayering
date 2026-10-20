import { LightingStage, loadImage } from "./renderer.js";
import {
  defaults,
  presets,
  ranges,
  validateSettings,
  rendererVersion,
} from "./lighting-model.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const state = {
  settings: { ...defaults },
  sample: null,
  inputs: null,
  tool: "move",
  view: "lit",
  load: 0,
  busy: false,
  taskFiles: [],
  objectURLs: [],
};
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
async function get(path) {
  const r = await fetch(path),
    v = await r.json();
  if (!r.ok) throw Error(v.error || r.statusText);
  return v;
}
function error(e) {
  console.error(e);
  toast(e.message);
}
function download(blob, name) {
  const u = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
}
const sliders = {
  azimuth: ["灯光左右角度", 1, "°"],
  elevation: ["灯光高度", 1, "°"],
  ambient: ["环境补光", 0.01, ""],
  toony: ["明暗边界清晰度", 0.01, ""],
  shift: ["明暗位置", 0.01, ""],
  depthScale: ["深度起伏", 0.01, ""],
  shadowStrength: ["投影强度", 0.01, ""],
  shadowSoftness: ["投影柔度", 0.25, ""],
  bias: ["投影偏移", 0.00005, ""],
  normalStrength: ["法线起伏", 0.01, ""],
  rim: ["轮廓补光", 0.005, ""],
};
function slider(key) {
  const [name, step, unit] = sliders[key],
    range = ranges[key];
  return `<label class="slider"><div><span>${name}</span><output id="out-${key}"></output></div><input id="${key}" data-setting="${key}" type="range" min="${range[0]}" max="${range[1]}" step="${step}" aria-label="${name}"></label>`;
}
$("#main-controls").innerHTML =
  ["azimuth", "elevation", "ambient", "toony", "shift"].map(slider).join("") +
  '<label class="field">阴影颜色<input type="color" id="shade"></label>';
$("#shadow-controls").innerHTML = [
  "depthScale",
  "shadowStrength",
  "shadowSoftness",
]
  .map(slider)
  .join("");
$("#detail-controls").innerHTML = ["normalStrength", "bias", "rim"]
  .map(slider)
  .join("");
$("#preset").innerHTML = Object.entries(presets)
  .map(([k, p]) => `<option value="${k}">${p.label}</option>`)
  .join("");
let stage;
try {
  stage = new LightingStage($("#stage"));
} catch (e) {
  $("#loading").textContent = "当前浏览器无法创建 WebGL2 预览：" + e.message;
  throw e;
}
$("#stage").addEventListener("studio-error", (e) => {
  toast(e.detail);
  $("#loading").textContent = e.detail;
  $("#loading").hidden = false;
});
function sync() {
  for (const [k, [, step, unit]] of Object.entries(sliders)) {
    $("#" + k).value = state.settings[k];
    $("#out-" + k).textContent =
      Number(state.settings[k]).toFixed(step >= 1 ? 0 : step < 0.001 ? 5 : 2) +
      unit;
  }
  $("#shade").value = state.settings.shade;
  $("#background").value = state.settings.background;
  $("#normal-y").value = state.settings.normalY;
  $("#shadow").checked = state.settings.shadow;
  $("#zoom").textContent = Math.round(stage.zoom * 100) + "%";
}
function apply() {
  state.settings = validateSettings(state.settings);
  stage.apply(state.settings);
  sync();
  $("#step-light").textContent = "可预览";
  $("#step-light").className = "ready";
}
let frame = 0;
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    apply();
  });
}
for (const el of document.querySelectorAll("[data-setting]"))
  el.addEventListener("input", () => {
    state.settings[el.dataset.setting] = Number(el.value);
    schedule();
  });
for (const k of ["shade", "background"])
  $("#" + k).addEventListener("input", (e) => {
    state.settings[k] = e.target.value;
    schedule();
  });
$("#normal-y").onchange = (e) => {
  state.settings.normalY = Number(e.target.value);
  apply();
};
$("#shadow").onchange = (e) => {
  state.settings.shadow = e.target.checked;
  apply();
};
$("#preset").onchange = (e) => {
  state.settings = { ...presets[e.target.value].values };
  apply();
};
for (const el of document.querySelectorAll("[data-az]"))
  el.onclick = () => {
    state.settings.azimuth = Number(el.dataset.az);
    state.settings.elevation = Number(el.dataset.el);
    apply();
  };
function selectView(view) {
  state.view = view;
  stage.setMode(view);
  $("#split-line").hidden = view !== "split";
  for (const el of $("#views").children)
    el.classList.toggle("active", el.dataset.view === view);
}
$("#views").onclick = (e) => {
  const b = e.target.closest("[data-view]");
  if (b) selectView(b.dataset.view);
};
$("#interaction").onclick = (e) => {
  const b = e.target.closest("[data-tool]");
  if (!b) return;
  state.tool = b.dataset.tool;
  for (const x of $("#interaction").children)
    x.classList.toggle("active", x === b);
  $("#stage").classList.toggle("light", state.tool === "light");
  $("#light-guide").hidden = state.tool !== "light";
};
let pointer = null;
$("#stage").onpointerdown = (e) => {
  if (state.busy) return;
  pointer = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    pan: [...stage.pan],
    az: state.settings.azimuth,
    el: state.settings.elevation,
  };
  e.target.setPointerCapture(e.pointerId);
};
$("#stage").onpointermove = (e) => {
  if (!pointer || e.pointerId !== pointer.id) return;
  const b = e.target.getBoundingClientRect(),
    dx = e.clientX - pointer.x,
    dy = e.clientY - pointer.y;
  if (state.tool === "light") {
    state.settings.azimuth = Math.max(
      -180,
      Math.min(180, pointer.az + dx * 0.35),
    );
    state.settings.elevation = Math.max(
      -75,
      Math.min(75, pointer.el - dy * 0.3),
    );
    schedule();
  } else {
    const s = (stage.camera.top - stage.camera.bottom) / b.height;
    stage.pan = [pointer.pan[0] - dx * s, pointer.pan[1] + dy * s];
    stage.render();
  }
};
$("#stage").onpointerup = $("#stage").onpointercancel = () => {
  pointer = null;
};
$("#stage").addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    stage.zoom = Math.min(
      10,
      Math.max(0.5, stage.zoom * Math.exp(-e.deltaY * 0.001)),
    );
    stage.render();
    sync();
  },
  { passive: false },
);
$("#fit").onclick = () => {
  stage.zoom = 1;
  stage.pan = [0, 0];
  stage.render();
  sync();
};
$("#actual").onclick = () => {
  if (!stage.source) return;
  const h = $("#stage").getBoundingClientRect().height;
  stage.zoom = (stage.source.h * 1.1) / h;
  stage.pan = [0, 0];
  stage.render();
  sync();
};
$("#export-image").onclick = async () => {
  try {
    download(
      await stage.exportPNG(),
      (state.sample?.id || "character") + "-" + state.view + ".png",
    );
  } catch (e) {
    error(e);
  }
};
async function sha(url) {
  const bytes = await (await fetch(url)).arrayBuffer(),
    hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function load(urls, sample) {
  const generation = ++state.load;
  state.busy = true;
  $("#loading").hidden = false;
  $("#loading").textContent = "载入完整尺寸贴图…";
  try {
    const entries = await Promise.all(
      Object.entries(urls).map(async ([k, url]) => [k, await loadImage(url)]),
    );
    if (generation !== state.load) return;
    const images = Object.fromEntries(entries),
      inputs =
        sample?.sha256 ||
        Object.fromEntries(
          await Promise.all(
            Object.entries(urls).map(async ([k, u]) => [k, await sha(u)]),
          ),
        );
    if (generation !== state.load) return;
    state.sample = sample;
    state.inputs = inputs;
    if (sample?.id === "jianma") {
      state.settings = { ...presets.jianma.values };
      $("#preset").value = "jianma";
    } else {
      state.settings = { ...presets.anime.values };
      $("#preset").value = "anime";
    }
    stage.settings = { ...state.settings };
    const info = await stage.load(images);
    apply();
    $("#quality").textContent =
      `${info.width} × ${info.height} 原始贴图 · 投影 ${Math.round(info.triangles / 1000)}k 面 · 2048 阴影`;
    $("#description").textContent =
      sample?.description ||
      "已导入自选素材。配方可导出，并记录三张输入的 SHA-256。";
    for (const key of ["color", "maps"]) {
      $("#step-" + key).textContent = "已载入";
      $("#step-" + key).className = "ready";
    }
    $("#step-review").textContent = "待记录";
    $("#step-review").className = "";
    $("#loading").hidden = true;
    await refreshReviews();
    const u = new URL(location.href);
    if (sample) u.searchParams.set("sample", sample.id);
    else u.searchParams.delete("sample");
    history.replaceState(null, "", u);
  } catch (e) {
    if (generation === state.load) {
      $("#loading").textContent = "素材未能载入\n" + e.message;
      error(e);
    }
  } finally {
    if (generation === state.load) state.busy = false;
  }
}
let samples = [],
  directory = "";
function recipe() {
  return {
    schema: 1,
    renderer: rendererVersion,
    sample: state.sample?.id || "local",
    inputs: state.inputs,
    settings: { ...state.settings },
    createdAt: new Date().toISOString(),
  };
}
$("#export-recipe").onclick = () => {
  if (!state.inputs) return toast("请先载入素材");
  download(
    new Blob([JSON.stringify(recipe(), null, 2)], { type: "application/json" }),
    "lighting-recipe.json",
  );
};
$("#import-recipe").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    const r = JSON.parse(await file.text());
    if (r.schema !== 1 || r.renderer !== rendererVersion)
      throw Error("配方格式或渲染器版本不匹配");
    if (
      !state.inputs ||
      ["color", "normal", "depth"].some(
        (k) => r.inputs?.[k] !== state.inputs[k],
      )
    )
      throw Error("配方对应的贴图与当前素材不同，请先载入原素材");
    state.settings = validateSettings(r.settings);
    apply();
    toast("光照配方已恢复");
  } catch (e) {
    error(e);
  } finally {
    e.target.value = "";
  }
};
$("#import-images").onclick = async () => {
  try {
    const files = Object.fromEntries(
      ["color", "normal", "depth"].map((k) => [k, $("#file-" + k).files[0]]),
    );
    if (Object.values(files).some((v) => !v))
      throw Error("请选择原画、法线和深度三张 PNG");
    state.objectURLs.forEach(URL.revokeObjectURL);
    state.objectURLs = [];
    const urls = {};
    for (const [k, f] of Object.entries(files)) {
      urls[k] = URL.createObjectURL(f);
      state.objectURLs.push(urls[k]);
    }
    await load(urls, null);
  } catch (e) {
    error(e);
  }
};
async function refreshReviews() {
  if (!state.sample) {
    $("#reviews").textContent = "自选素材通过导出配方留存。";
    return;
  }
  const reviews = await get(
    "./api/studio/reviews?sample=" + encodeURIComponent(state.sample.id),
  );
  $("#reviews").innerHTML =
    reviews
      .slice(0, 8)
      .map(
        (r) =>
          `<p>${r.verdict === "accepted" ? "✓ 当前灯位可用" : "△ 需要修正"} · ${esc(new Date(r.createdAt).toLocaleString())}<br>${esc(r.note)}<br>左右 ${r.settings.azimuth}° / 高度 ${r.settings.elevation}°</p>`,
      )
      .join("") || '<p class="hint">尚无检查记录。载入成功不等于效果通过。</p>';
  if (reviews.length) {
    $("#step-review").textContent = `${reviews.length} 条记录`;
    $("#step-review").className = "ready";
  }
}
$("#save-review").onclick = async () => {
  try {
    if (!state.sample)
      throw Error("自选素材请导出配方保存；内置样例可在服务器记录。");
    const r = await fetch("./api/studio/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...recipe(),
          dir: directory,
          verdict: $("#verdict").value,
          note: $("#note").value,
        }),
      }),
      v = await r.json();
    if (!r.ok) throw Error(v.error);
    await refreshReviews();
    toast("本灯位与贴图版本已记录");
  } catch (e) {
    error(e);
  }
};
async function taskFiles() {
  const name = $("#task").value;
  if (!name) {
    $("#task-files").innerHTML = "";
    return;
  }
  const data = await get(
    "./api/task?" + new URLSearchParams({ name, dir: directory }),
  );
  state.taskFiles = data.files.filter((p) => /\.png$/i.test(p));
  $("#task-files").innerHTML = ["color", "normal", "depth"]
    .map(
      (k, i) =>
        `<label class="field">${["原画", "法线", "深度"][i]}<select id="task-${k}"><option value="">选择产物</option>${state.taskFiles.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select></label>`,
    )
    .join("");
  for (const k of ["normal", "depth"]) {
    const p = state.taskFiles.find((p) =>
      new RegExp("(^|/)" + k + "[^/]*\\.png$", "i").test(p),
    );
    if (p) $("#task-" + k).value = p;
  }
}
$("#task").onchange = () => taskFiles().catch(error);
$("#import-task").onclick = async () => {
  try {
    const urls = {};
    for (const k of ["color", "normal", "depth"]) {
      const path = $("#task-" + k)?.value;
      if (!path) throw Error("请选择任务的三张贴图");
      urls[k] =
        "./artifact?" +
        new URLSearchParams({ name: $("#task").value, dir: directory, path });
    }
    await load(urls, null);
  } catch (e) {
    error(e);
  }
};
try {
  const [catalog, tasks] = await Promise.all([
    get("./api/studio/samples"),
    get("./api/tasks"),
  ]);
  samples = catalog;
  directory = tasks.directory;
  $("#samples").innerHTML = samples
    .map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`)
    .join("");
  $("#task").innerHTML =
    '<option value="">选择任务</option>' +
    tasks.tasks
      .map((t) => `<option value="${esc(t.name)}">${esc(t.name)}</option>`)
      .join("");
  const requested = new URLSearchParams(location.search).get("name");
  if (tasks.tasks.some((t) => t.name === requested)) {
    $("#task").value = requested;
    await taskFiles();
  }
  $("#samples").onchange = () => {
    const s = samples.find((s) => s.id === $("#samples").value);
    return load(
      Object.fromEntries(
        ["color", "normal", "depth"].map((k) => [
          k,
          "./studio-asset?" + new URLSearchParams({ sample: s.id, kind: k }),
        ]),
      ),
      s,
    );
  };
  const chosen = new URLSearchParams(location.search).get("sample");
  $("#samples").value = samples.some((s) => s.id === chosen)
    ? chosen
    : samples[0]?.id;
  if (samples.length) await $("#samples").onchange();
  else $("#loading").textContent = "正在制作测试素材；也可导入自己的三张贴图。";
  sync();
} catch (e) {
  $("#loading").textContent = e.message;
  error(e);
}
window.addEventListener("pagehide", () => {
  stage.dispose();
  state.objectURLs.forEach(URL.revokeObjectURL);
});
// Small read-only diagnostics for reproducible browser acceptance, no renderer mutation.
window.studioDiagnostics = () => ({
  renderer: rendererVersion,
  sample: state.sample?.id,
  settings: { ...state.settings },
  view: state.view,
  tool: state.tool,
  busy: state.busy,
  source: stage.source
    ? { width: stage.source.w, height: stage.source.h }
    : null,
  textureSizes: stage.textures.map((t) => [t.image.width, t.image.height]),
  drawCalls: stage.renderer.info.render.calls,
});

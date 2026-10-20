import { LightingStage, loadImage } from "./renderer.js";
import { LayerPanel } from "./layer-panel.js";
import { stateKey } from "./layer-model.js";
import { openDocument } from "./document-loader.js";
import {
  defaults,
  presets,
  validateSettings,
  rendererVersion,
} from "./lighting-model.js";
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const state = {
  settings: { ...presets.jianma.values },
  tool: "move",
  view: "lit",
  source: null,
  inputs: null,
  busy: false,
  layerBusy: false,
  generation: 0,
};
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("visible"), 5500);
}
async function get(url) {
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) throw Error(data.error || r.statusText);
  return data;
}
async function blob(url) {
  const r = await fetch(url);
  if (!r.ok) throw Error(`文件读取失败 (${r.status})`);
  return r.blob();
}
function download(file, name) {
  const u = URL.createObjectURL(file),
    a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 10000);
}
async function hash(file) {
  if (!file) return null;
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
// UI units are separate from renderer units. One world unit = half canvas height.
const sliders = {
  lightX: [
    "左右",
    -300,
    300,
    1,
    "%",
    "左",
    "右",
    (v) => v * 50,
    (v) => v / 50,
    "相对画布高度；画布中心为 0",
  ],
  lightY: [
    "上下",
    -300,
    300,
    1,
    "%",
    "下",
    "上",
    (v) => v * 50,
    (v) => v / 50,
    "相对画布高度；画布中心为 0",
  ],
  lightZ: [
    "前后",
    -200,
    400,
    1,
    "%",
    "背后",
    "面前",
    (v) => v * 50,
    (v) => v / 50,
    "画面为 0；100% 等于一个画布高度。近灯方向变化更明显",
  ],
  ambient: [
    "暗部提亮",
    0,
    70,
    1,
    "%",
    "深",
    "浅",
    (v) => v * 100,
    (v) => v / 100,
    "增加环境补光，亮面亮度保持不变",
  ],
  toony: [
    "边缘硬度",
    0,
    100,
    1,
    "%",
    "柔",
    "硬",
    (v) => (v / 0.99) * 100,
    (v) => v * 0.0099,
    "控制明暗分界的过渡宽度",
  ],
  shift: [
    "亮部范围",
    0,
    100,
    1,
    "%",
    "少",
    "多",
    (v) => ((v + 0.9) / 1.8) * 100,
    (v) => v * 0.018 - 0.9,
    "移动明暗分界，扩大或缩小受光区域",
  ],
  depthScale: [
    "厚度",
    0,
    75,
    1,
    "%",
    "平",
    "厚",
    (v) => v * 50,
    (v) => v / 50,
    "深度全黑到全白的距离，相对画布高度",
  ],
  shadowStrength: [
    "浓度",
    0,
    100,
    1,
    "%",
    "淡",
    "浓",
    (v) => v * 100,
    (v) => v / 100,
    "部件互相遮挡时的投影浓度",
  ],
  shadowSoftness: [
    "柔边",
    0,
    100,
    1,
    "%",
    "锐",
    "柔",
    (v) => ((v - 1) / 7) * 100,
    (v) => 1 + v * 0.07,
    "阴影贴图的滤波半径",
  ],
  normalStrength: [
    "立体感",
    0,
    200,
    1,
    "%",
    "平",
    "强",
    (v) => v * 100,
    (v) => v / 100,
    "法线横向倾斜的强度；100% 为原始法线",
  ],
};
function slider(key) {
  const [label, min, max, step, unit, left, right, , , title] = sliders[key];
  return `<div class="slider" title="${title}"><div class="slider-head"><label for="${key}">${label}</label><label class="slider-number"><input type="number" id="number-${key}" data-number="${key}" min="${min}" max="${max}" step="${step}" aria-label="${label}数值"><span>${unit}</span></label></div><div class="range-wrap"><input id="${key}" data-setting="${key}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}">${min < 0 ? `<i class="zero-mark" style="--zero:${(-min / (max - min)) * 100}%" title="${key === "lightZ" ? "画面" : "中心"}"></i>` : ""}</div><div class="range-ends"><span>${left}</span>${key === "lightZ" ? "<span>0 = 画面</span>" : ""}<span>${right}</span></div></div>`;
}
$("#position-controls").innerHTML = ["lightX", "lightY", "lightZ"]
  .map(slider)
  .join("");
$("#main-controls").innerHTML = ["ambient", "toony", "shift"]
  .map(slider)
  .join("");
$("#shadow-controls").innerHTML = ["shadowStrength", "shadowSoftness"]
  .map(slider)
  .join("");
$("#map-controls").innerHTML = ["normalStrength", "depthScale"]
  .map(slider)
  .join("");
$("#preset").innerHTML =
  Object.entries(presets)
    .map(([k, p]) => `<option value="${k}">${p.label}</option>`)
    .join("") + '<option value="custom" disabled>自定义</option>';
$("#preset").value = "jianma";
let stage;
try {
  stage = new LightingStage($("#stage"));
} catch (e) {
  $("#empty-state").textContent = "无法创建 WebGL2 预览：" + e.message;
  throw e;
}
$("#stage").addEventListener("studio-error", (e) => toast(e.detail));
function overlay() {
  const active =
    state.tool === "light" && !!state.source?.normal && !state.busy;
  $("#light-overlay").hidden = !active;
  if (!active) return;
  const b = $("#stage").getBoundingClientRect();
  const [x, y] = stage.worldToScreen(
      state.settings.lightX,
      state.settings.lightY,
    ),
    [cx, cy] = stage.worldToScreen(0, 0);
  const px = Math.max(38, Math.min(b.width - 38, x)),
    py = Math.max(30, Math.min(b.height - 70, y));
  const outside = Math.abs(px - x) > 1 || Math.abs(py - y) > 1;
  const h = $("#light-handle");
  h.style.left = px + "px";
  h.style.top = py + "px";
  h.classList.toggle("behind", state.settings.lightZ < 0);
  h.dataset.outside = String(outside);
  h.classList.toggle("edge-right", px > b.width - 90);
  h.classList.toggle("edge-left", px < 90);
  $("#light-label").textContent =
    `${outside ? "画外 · " : ""}${state.settings.lightZ < 0 ? "后" : "前"} ${Math.round(Math.abs(state.settings.lightZ) * 50)}%`;
  const line = $("#light-line line"),
    origin = $("#light-line circle");
  for (const [k, v] of Object.entries({ x1: cx, y1: cy, x2: px, y2: py }))
    line.setAttribute(k, v);
  origin.setAttribute("cx", cx);
  origin.setAttribute("cy", cy);
}
stage.onRender = () => {
  overlay();
  $("#zoom").textContent = Math.round(stage.viewScale() * 100) + "%";
};
function sync() {
  for (const [k, spec] of Object.entries(sliders)) {
    const value = spec[7](state.settings[k]);
    $("#" + k).value = value;
    $("#number-" + k).value = Number(value.toFixed(1));
    $("#" + k).style.setProperty(
      "--fill",
      `${((value - spec[1]) / (spec[2] - spec[1])) * 100}%`,
    );
  }
  $("#shade").value = state.settings.shade;
  $("#background").value = state.settings.background;
  $("#normal-y").value = state.settings.normalY;
  $("#shadow").checked = state.settings.shadow;
  const hasNormal = !!state.source?.normal,
    hasDepth = !!state.source?.depth;
  $("#lighting-controls").disabled = !hasNormal || state.busy;
  $("#lighting-status").hidden = hasNormal;
  $("#shadow").disabled = !hasDepth;
  $("#shadow-controls").disabled = !hasDepth || !state.settings.shadow;
  $("#depthScale").disabled = $("#number-depthScale").disabled =
    !hasDepth || state.busy;
  $("#depth-status-hint").hidden = hasDepth;
  for (const k of ["normalStrength", "number-normalStrength", "normal-y"])
    $("#" + k).disabled = !hasNormal || state.busy;
  $('[data-tool="light"]').disabled = !hasNormal || state.busy;
  $("#zoom").textContent = Math.round(stage.viewScale() * 100) + "%";
  for (const el of document.querySelectorAll("[data-view]")) {
    const view = el.dataset.view;
    el.disabled =
      !state.source ||
      (view === "normal" && !hasNormal) ||
      (view === "depth" && !hasDepth) ||
      (["lit", "split", "shading"].includes(view) && !hasNormal);
    el.classList.toggle("active", view === state.view);
  }
  for (const id of ["export-image", "export-recipe", "actual"])
    $("#" + id).disabled = !state.source || state.busy || state.layerBusy;
  for (const k of ["normal", "depth"]) {
    $("#file-" + k).disabled = $("#remove-" + k).disabled =
      state.busy || state.layerBusy;
  }
  overlay();
}
function apply(custom = false) {
  state.settings = validateSettings(state.settings);
  stage.apply(state.settings);
  if (custom) $("#preset").value = "custom";
  sync();
}
let frame = 0;
function schedule() {
  if (!frame)
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply(true);
    });
}
for (const el of document.querySelectorAll("[data-setting],[data-number]")) {
  const key = el.dataset.setting || el.dataset.number,
    spec = sliders[key];
  el.addEventListener(el.dataset.number ? "change" : "input", () => {
    if (el.value === "" || !Number.isFinite(el.valueAsNumber)) {
      sync();
      return;
    }
    state.settings[key] = spec[8](
      Math.max(spec[1], Math.min(spec[2], el.valueAsNumber)),
    );
    schedule();
  });
}
for (const k of ["shade", "background"])
  $("#" + k).oninput = (e) => {
    state.settings[k] = e.target.value;
    schedule();
  };
$("#normal-y").onchange = (e) => {
  state.settings.normalY = Number(e.target.value);
  apply(true);
};
$("#shadow").onchange = (e) => {
  state.settings.shadow = e.target.checked;
  apply(true);
};
$("#preset").onchange = (e) => {
  state.settings = { ...presets[e.target.value].values };
  apply();
};
$("#reset").onclick = () => {
  const key = state.source?.sample === "jianma" ? "jianma" : "anime";
  $("#preset").value = key;
  state.settings = { ...presets[key].values };
  apply();
};
const positions = {
  left: [-2.8, 0.5, 1],
  front: [0, 0.4, 3],
  right: [2.8, 0.5, 1],
  top: [0.4, 2.8, 0.8],
};
for (const el of document.querySelectorAll("[data-position]"))
  el.onclick = () => {
    [state.settings.lightX, state.settings.lightY, state.settings.lightZ] =
      positions[el.dataset.position];
    apply(true);
  };
function selectView(view) {
  state.view = view;
  stage.setMode(view);
  $("#split-line").hidden = view !== "split";
  sync();
}
$("#views").onclick = (e) => {
  const el = e.target.closest("[data-view]");
  if (el && !el.disabled) selectView(el.dataset.view);
};
function selectTool(tool) {
  state.tool = tool;
  for (const el of document.querySelectorAll("[data-tool]"))
    el.classList.toggle("active", el.dataset.tool === tool);
  $("#stage").classList.toggle("light", tool === "light");
  overlay();
}
$("#interaction").onclick = (e) => {
  const el = e.target.closest("[data-tool]");
  if (el && !el.disabled) selectTool(el.dataset.tool);
};
let pointer;
function placeLight(e) {
  const b = $("#stage").getBoundingClientRect(),
    [x, y] = stage.screenToWorld(e.clientX - b.x, e.clientY - b.y);
  state.settings.lightX = Math.max(-6, Math.min(6, x));
  state.settings.lightY = Math.max(-6, Math.min(6, y));
  schedule();
}
for (const el of [$("#stage"), $("#light-handle")]) {
  el.onpointerdown = (e) => {
    if (state.busy || !state.source || e.button !== 0) return;
    pointer = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      pan: [...stage.pan],
      tool: state.tool,
    };
    el.setPointerCapture(e.pointerId);
    // A click in light mode places the actual XY projection at the pointer.
    if (state.tool === "light") placeLight(e);
  };
  el.onpointermove = (e) => {
    if (!pointer || pointer.id !== e.pointerId) return;
    if (pointer.tool === "light") placeLight(e);
    else {
      const b = $("#stage").getBoundingClientRect(),
        s = (stage.camera.top - stage.camera.bottom) / b.height;
      stage.pan = [
        pointer.pan[0] - (e.clientX - pointer.x) * s,
        pointer.pan[1] + (e.clientY - pointer.y) * s,
      ];
      stage.render();
    }
  };
  el.onpointerup =
    el.onpointercancel =
    el.onlostpointercapture =
      () => {
        pointer = null;
      };
}
$("#light-handle").onkeydown = (e) => {
  const step = e.shiftKey ? 0.2 : 0.02,
    s = state.settings;
  if (e.key === "ArrowLeft") s.lightX -= step;
  else if (e.key === "ArrowRight") s.lightX += step;
  else if (e.key === "ArrowUp") s.lightY += step;
  else if (e.key === "ArrowDown") s.lightY -= step;
  else if (e.key === "PageUp") s.lightZ += step;
  else if (e.key === "PageDown") s.lightZ -= step;
  else return;
  e.preventDefault();
  s.lightX = Math.max(-6, Math.min(6, s.lightX));
  s.lightY = Math.max(-6, Math.min(6, s.lightY));
  s.lightZ = Math.max(-4, Math.min(8, s.lightZ));
  apply(true);
};
$("#drop-zone").addEventListener(
  "wheel",
  (e) => {
    if (!state.source || state.busy) return;
    e.preventDefault();
    if (state.tool === "light" && e.altKey) {
      state.settings.lightZ = Math.max(
        -4,
        Math.min(8, state.settings.lightZ - e.deltaY * 0.005),
      );
      schedule();
    } else {
      stage.zoom = Math.max(
        0.25,
        Math.min(40, stage.zoom * Math.exp(-e.deltaY * 0.001)),
      );
      stage.render();
      sync();
    }
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
  if (stage.source) {
    stage.actualSize();
    sync();
  }
};
$("#export-image").onclick = async () => {
  try {
    download(
      await stage.exportPNG(),
      (state.source?.name || "character").replace(/\.[^.]+$/, "") +
        "-" +
        state.view +
        ".png",
    );
  } catch (e) {
    toast(e.message);
  }
};
const layers = new LayerPanel({
  download,
  error: toast,
  busy(value) {
    state.layerBusy = value;
    sync();
  },
  changed(owner, rows) {
    if (state.source?.layerDocument !== owner.layerDocument) return;
    state.source.layers = rows;
    showSource();
  },
  async composite(owner, data, color) {
    if (state.source?.layerDocument !== owner.layerDocument) return;
    const source = state.source;
    const key = data.baseline ? "baseline" : stateKey(data.layers);
    const maps = source.mapBindings.get(key) || {};
    const id = begin("正在更新预览…");
    try {
      await install(
        {
          ...source,
          layers: data.layers,
          layerKey: key,
          color: data.baseline ? source.originalColor : color,
          normal: maps.normal || null,
          depth: maps.depth || null,
        },
        id,
        false,
      );
      if (!maps.normal) selectTool("move");
    } finally {
      finish(id);
    }
  },
});
function showSource() {
  const source = state.source;
  $("#document-info").hidden = !source;
  $("#empty-state").hidden = !!source;
  if (source) {
    $("#document-name").textContent = source.name;
    $("#document-meta").textContent =
      `${stage.source.w} × ${stage.source.h}${source.layers?.length ? " · " + source.layers.filter((l) => !l.mask).length + " 层" : ""}`;
  }
  $("#quality").textContent = source
    ? `${stage.source.w} × ${stage.source.h} px`
    : "未打开文件";
  $("#download-document").hidden = !source?.file;
  for (const k of ["normal", "depth"]) {
    $("#" + k + "-status").textContent = source?.[k]
      ? source[k].name || "已绑定"
      : "未绑定";
    $("#remove-" + k).hidden = !source?.[k];
  }
  $("#map-validity").hidden =
    !source || source.layerKey === "baseline" || !!source.normal;
  sync();
}
function begin(message) {
  state.busy = true;
  const id = ++state.generation;
  $("#loading").hidden = false;
  $("#loading").textContent = message;
  sync();
  return id;
}
function finish(id) {
  if (id !== state.generation) return;
  state.busy = false;
  $("#loading").hidden = true;
  sync();
}
async function install(source, id, reset = true) {
  const urls = {};
  try {
    for (const k of ["color", "normal", "depth"])
      if (source[k]) urls[k] = URL.createObjectURL(source[k]);
    const [entries, hashes] = await Promise.all([
      Promise.all(
        Object.entries(urls).map(async ([k, url]) => [k, await loadImage(url)]),
      ),
      Promise.all(
        ["color", "normal", "depth"].map(async (k) => [
          k,
          await hash(source[k]),
        ]),
      ),
    ]);
    if (id !== state.generation) return;
    const priorZoom = stage.zoom,
      priorPan = [...stage.pan];
    // Stage validates dimensions before replacing GPU resources. Failed bindings
    // leave the active document and its existing maps intact.
    await stage.load(Object.fromEntries(entries));
    if (!reset) {
      stage.zoom = priorZoom;
      stage.pan = priorPan;
    }
    if (reset) {
      source.layerDocument = Symbol("document");
      source.layerKey = "baseline";
      source.originalColor = source.color;
      source.savedLayers = source.layers;
      source.mapBindings = new Map([
        ["baseline", { normal: source.normal, depth: source.depth }],
      ]);
    }
    state.source = source;
    state.inputs = Object.fromEntries(hashes);
    if (reset) {
      const key = source.sample === "jianma" ? "jianma" : "anime";
      state.settings = { ...presets[key].values };
      $("#preset").value = key;
      selectTool("move");
    }
    apply();
    selectView(
      source.normal
        ? reset || state.view === "color"
          ? "lit"
          : state.view === "depth" && !source.depth
            ? "lit"
            : state.view
        : "color",
    );
    showSource();
    const u = new URL(location.href);
    u.searchParams.delete("sample");
    u.searchParams.delete("name");
    if (source.sample) u.searchParams.set("name", source.sample);
    history.replaceState(null, "", u);
    if (reset) void layers.open(source);
  } finally {
    Object.values(urls).forEach(URL.revokeObjectURL);
  }
}
async function open(file, options = {}) {
  layers.clear();
  const id = begin("正在打开 " + file.name + "…");
  try {
    const source = /\.png$/i.test(file.name)
      ? { name: file.name, file, color: file, layers: [] }
      : await openDocument(file);
    if (id !== state.generation) return;
    await install({ ...source, ...options }, id);
  } catch (e) {
    if (id === state.generation) toast(e.message);
  } finally {
    finish(id);
  }
}
$("#file-document").onchange = (e) => {
  const file = e.target.files[0];
  if (file) void open(file);
  e.target.value = "";
};
for (const k of ["normal", "depth"]) {
  $("#file-" + k).onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!state.source) return toast("请先打开角色文件");
    const id = begin("正在绑定贴图…");
    try {
      await install({ ...state.source, [k]: file }, id, false);
      if (id === state.generation) {
        state.source.mapBindings.set(state.source.layerKey, {
          normal: state.source.normal,
          depth: state.source.depth,
        });
      }
    } catch (e) {
      toast(e.message);
    } finally {
      finish(id);
    }
  };
  $("#remove-" + k).onclick = async () => {
    if (!state.source || state.busy) return;
    const id = begin("正在更新贴图…");
    try {
      await install({ ...state.source, [k]: null }, id, false);
      if (id === state.generation)
        state.source.mapBindings.set(state.source.layerKey, {
          normal: state.source.normal,
          depth: state.source.depth,
        });
      if (k === "normal") selectTool("move");
    } catch (e) {
      toast(e.message);
    } finally {
      finish(id);
    }
  };
}
$("#download-document").onclick = () => {
  if (state.source?.file) download(state.source.file, state.source.name);
};
$("#close-document").onclick = () => {
  layers.clear();
  state.generation++;
  state.busy = false;
  state.source = null;
  state.inputs = null;
  $("#loading").hidden = true;
  stage.clear();
  selectTool("move");
  selectView("color");
  showSource();
  const u = new URL(location.href);
  u.searchParams.delete("name");
  u.searchParams.delete("sample");
  history.replaceState(null, "", u);
};
let dragDepth = 0;
$("#drop-zone").ondragover = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
};
$("#drop-zone").ondragenter = (e) => {
  e.preventDefault();
  dragDepth++;
  $("#drop-hint").hidden = false;
};
$("#drop-zone").ondragleave = () => {
  if (--dragDepth <= 0) $("#drop-hint").hidden = true;
};
$("#drop-zone").ondrop = (e) => {
  e.preventDefault();
  dragDepth = 0;
  $("#drop-hint").hidden = true;
  const file = e.dataTransfer.files[0];
  if (file) void open(file);
};
// Do not navigate away from the editor when a file is dropped on a sidebar.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());
$("#export-recipe").onclick = () => {
  if (!state.inputs) return toast("请先打开角色文件");
  download(
    new Blob(
      [
        JSON.stringify(
          {
            schema: 2,
            renderer: rendererVersion,
            document: state.source.name,
            inputs: state.inputs,
            settings: state.settings,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    "lighting-recipe.json",
  );
};
$("#import-recipe").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    const r = JSON.parse(await file.text());
    if (r.schema !== 2 || r.renderer !== rendererVersion)
      throw Error("参数版本不匹配；旧平行光参数请在原版本中打开");
    if (
      !state.inputs ||
      ["color", "normal", "depth"].some(
        (k) => r.inputs?.[k] !== state.inputs[k],
      )
    )
      throw Error("参数对应的贴图与当前文件不同");
    state.settings = validateSettings(r.settings);
    apply(true);
    toast("参数已载入");
  } catch (e) {
    toast(e.message);
  } finally {
    e.target.value = "";
  }
};
async function openJianma() {
  layers.clear();
  const id = begin("正在打开 Jianma…");
  try {
    const [kra, normal, depth] = await Promise.all([
      blob("./studio-document?id=jianma"),
      blob("./studio-asset?sample=jianma&kind=normal"),
      blob("./studio-asset?sample=jianma&kind=depth"),
    ]);
    if (id !== state.generation) return;
    const source = await openDocument(new File([kra], "jianma-assembled.kra"));
    await install({ ...source, normal, depth, sample: "jianma" }, id);
  } catch (e) {
    if (id === state.generation) toast(e.message);
  } finally {
    finish(id);
  }
}
$("#open-jianma").onclick = openJianma;
let directory = "",
  taskGeneration = 0;
async function taskFiles() {
  const id = ++taskGeneration,
    name = $("#task").value;
  $("#task-files").innerHTML = "";
  $("#import-task").disabled = true;
  if (!name) return;
  const data = await get(
    "./api/task?" + new URLSearchParams({ name, dir: directory }),
  );
  if (id !== taskGeneration) return;
  const docs = data.files.filter((p) => /\.(kra|psd|png)$/i.test(p)),
    maps = data.files.filter((p) => /\.png$/i.test(p));
  $("#task-files").innerHTML = ["document", "normal", "depth"]
    .map(
      (k, i) =>
        `<label class="field">${["角色文件", "法线（可选）", "深度（可选）"][i]}<select id="task-${k}"><option value="">${i ? "不绑定" : "选择 KRA / PSD / PNG"}</option>${(i ? maps : docs).map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select></label>`,
    )
    .join("");
  const file =
    docs.find((p) => /assembled[^/]*\.kra$/i.test(p)) ||
    docs.find((p) => /\.(kra|psd)$/i.test(p));
  if (file) $("#task-document").value = file;
  for (const k of ["normal", "depth"]) {
    const p = maps.find((p) =>
      new RegExp("(^|/)" + k + "[^/]*\\.png$", "i").test(p),
    );
    if (p) $("#task-" + k).value = p;
  }
  $("#import-task").disabled = false;
}
$("#task").onchange = () => taskFiles().catch((e) => toast(e.message));
async function openTask(requestedName) {
  $("#task-dialog").showModal();
  try {
    const data = await get("./api/tasks");
    directory = data.directory;
    $("#task").innerHTML =
      '<option value="">选择任务</option>' +
      data.tasks
        .map((t) => `<option value="${esc(t.name)}">${esc(t.name)}</option>`)
        .join("");
    $("#task-files").innerHTML = "";
    $("#import-task").disabled = true;
    if (data.tasks.some((t) => t.name === requestedName)) {
      $("#task").value = requestedName;
      await taskFiles();
    }
  } catch (e) {
    toast(e.message);
  }
}
$("#open-task").onclick = () => openTask();
$("#import-task").onclick = async () => {
  const path = $("#task-document")?.value;
  if (!path) return toast("请选择角色文件");
  const selected = {};
  for (const k of ["normal", "depth"]) selected[k] = $("#task-" + k).value;
  layers.clear();
  const name = $("#task").value,
    id = begin("正在打开任务产物…");
  $("#task-dialog").close();
  try {
    const fetchFile = (p) =>
      blob(
        "./artifact?" + new URLSearchParams({ name, dir: directory, path: p }),
      );
    const [doc, normal, depth] = await Promise.all([
      fetchFile(path),
      selected.normal ? fetchFile(selected.normal) : null,
      selected.depth ? fetchFile(selected.depth) : null,
    ]);
    if (id !== state.generation) return;
    const file = new File([doc], path.split("/").at(-1));
    const source = /\.png$/i.test(path)
      ? { name: file.name, file, color: file, layers: [] }
      : await openDocument(file);
    await install({ ...source, normal, depth }, id);
  } catch (e) {
    if (id === state.generation) toast(e.message);
  } finally {
    finish(id);
  }
};
sync();
// No test gallery, no test-image downloads. Jianma is a real layered document.
const requested = new URLSearchParams(location.search);
if (requested.get("name") === "jianma" || requested.get("sample") === "jianma")
  void openJianma();
else if (requested.get("name")) void openTask(requested.get("name"));
window.addEventListener("pagehide", () => {
  layers.clear(true);
  cancelAnimationFrame(frame);
  stage.dispose();
});
window.studioDiagnostics = () => ({
  renderer: rendererVersion,
  document: state.source?.name,
  sample: state.source?.sample,
  layers: state.source?.layers?.length || 0,
  layerSession: layers.session,
  layerRevision: layers.revision,
  layerBusy: state.layerBusy || layers.pending,
  layerKey: state.source?.layerKey === "baseline" ? "baseline" : "edited",
  layerStates: layers.layers.map(
    ({
      id,
      name,
      type,
      parentId,
      visible,
      opacity,
      inheritAlpha,
      passThrough,
    }) => ({
      id,
      name,
      type,
      parentId,
      visible,
      opacity,
      inheritAlpha,
      passThrough,
    }),
  ),
  maps: { normal: !!state.source?.normal, depth: !!state.source?.depth },
  settings: { ...state.settings },
  view: state.view,
  tool: state.tool,
  busy: state.busy,
  source: stage.source
    ? { width: stage.source.w, height: stage.source.h }
    : null,
  textureSizes: stage.textures.map((t) => [t.image.width, t.image.height]),
  drawCalls: stage.renderer.info.render.calls,
  projectedLight: stage.source
    ? stage.worldToScreen(state.settings.lightX, state.settings.lightY)
    : null,
});

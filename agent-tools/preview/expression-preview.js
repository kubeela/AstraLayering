/* Offline console. The SVG viewer owns rendering; this page owns controls. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), viewer = $('viewer');
  const pending = new Map(); let requestId = 0, readyResolve;
  const ready = new Promise(resolve => readyResolve = resolve);
  let candidate = { svg: null, name: '', rig: null, jsonName: '' }, loaded = null, state = null, loading = false, loadingQueue = Promise.resolve();
  const parameterControls = new Map(), recipeControls = new Map(), instanceControls = new Map();
  const format = v => typeof v === 'number' ? +v.toFixed(4) : v;
  function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
  function request(method, data) {
    return ready.then(() => new Promise((resolve, reject) => {
      const id = String(++requestId), timeout = setTimeout(() => { pending.delete(id); reject(new Error('预览器响应超时，请检查文件或重新打开页面')); }, 30000);
      pending.set(id, { resolve, reject, timeout }); viewer.contentWindow.postMessage({ channel: 'astra-expression', request_id: id, method, data }, '*');
    }));
  }
  window.addEventListener('message', event => {
    const m = event.data; if (!m || m.channel !== 'astra-expression') return;
    if (event.source === window.opener && m.event === 'handoff') {
      candidate = { ...m.data, jsonName: m.data.rig ? '来自表情控制台' : '' }; enqueueLoad(); return;
    }
    if (event.source !== viewer.contentWindow) return;
    if (m.event === 'ready') readyResolve();
    if (m.event === 'state' && !loading) { update(m.state); if (m.error) status('播放已暂停：' + m.error, true); }
    if (m.request_id && pending.has(m.request_id)) {
      const p = pending.get(m.request_id); clearTimeout(p.timeout); pending.delete(m.request_id); if (m.error) p.reject(new Error(m.error)); else p.resolve(m.result);
    }
  });
  if (window.opener) window.opener.postMessage({ channel: 'astra-expression', event: 'console-ready' }, '*');
  async function load(data) {
    if (!data.svg) { status('已选择控制 JSON，请继续选择角色 SVG。'); $('jsonName').textContent = data.jsonName + ' · 待配对'; return; }
    loading = true; status('正在载入角色与控制定义…');
    try {
      const result = await request('load', data); loaded = data; state = result;
      $('svgName').textContent = data.name; $('jsonName').textContent = data.jsonName || '尚未选择';
      $('character').textContent = data.rig?.character_id || '仅 SVG';
      $('controls').hidden = !data.rig; $('empty').hidden = !!data.rig;
      $('pauseAll').disabled = $('resetAll').disabled = !data.rig;
      if (data.rig) { build(data.rig); update(result); }
      status(data.rig ? `${data.rig.character_id} 已就绪 · ${Object.values(data.rig.parameters).filter(p => p.access === 'public').length} 个公开参数` : '角色已打开，请选择对应的控制 JSON。');
      return { ok: true, state: result };
    } catch (e) { status('未载入：' + e.message, true); return { ok: false, error: e.message }; }
    finally { loading = false; }
  }
  function enqueueLoad() { const data = structuredClone(candidate); loadingQueue = loadingQueue.then(() => load(data)); return loadingQueue; }
  async function files(list) {
    try {
      for (const file of list) {
        if (/\.svg$/i.test(file.name)) { candidate.svg = await file.text(); candidate.name = file.name; }
        else if (/\.json$/i.test(file.name)) {
          const rig = JSON.parse(await file.text()); if (!rig || rig.document_type !== 'rig') throw new Error('控制 JSON 应是 rig 定义；command 指令请在程序控制区域执行');
          candidate.rig = rig; candidate.jsonName = file.name;
        }
        else throw new Error('请选择 .svg 或 .json 文件');
      }
      await enqueueLoad();
    } catch (e) { status(e.message, true); }
  }
  $('loadSvg').onclick = () => $('svgFile').click(); $('loadJson').onclick = () => $('jsonFile').click();
  for (const id of ['svgFile', 'jsonFile']) $(id).onchange = async e => { await files([...e.target.files]); e.target.value = ''; };
  document.addEventListener('dragover', e => { e.preventDefault(); });
  document.addEventListener('drop', e => { e.preventDefault(); files([...e.dataTransfer.files]); });
  $('demo').onclick = () => { candidate = { ...structuredClone(AstraExpressionDemo), jsonName: 'controls.example.json · 协议样例' }; enqueueLoad(); };
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function button(text, handler, cls = '') { const b = el('button', cls, text); b.onclick = handler; return b; }
  function command(actions) { if (!loaded?.rig) return Promise.reject(new Error('请先加载控制定义')); return request('command', { schema_version: '0.1.0', document_type: 'command', character_id: loaded.rig.character_id, actions }); }
  async function act(actions) {
    try { const result = await command(actions); update(result); status('已应用控制。'); return result; }
    catch (e) { status(e.message, true); update(state); return null; }
  }
  function range(min, max, value, step, label) { const n = el('input'); n.type = 'range'; Object.assign(n, { min, max, value, step }); n.setAttribute('aria-label', label); return n; }
  function build(rig) {
    for (const id of ['parameters', 'expressions', 'animations', 'instances']) $(id).replaceChildren();
    parameterControls.clear(); recipeControls.clear(); instanceControls.clear(); $('search').value = '';
    for (const [id, p] of Object.entries(rig.parameters).filter(([, p]) => p.access === 'public')) {
      const group = el('div', 'control'); group.dataset.search = (id + ' ' + p.label).toLowerCase(); group.dataset.parameter = id;
      const label = el('label', 'control-label', p.label); label.title = p.description; const mark = el('small'); label.append(mark); group.append(label);
      let input, slider;
      const set = value => act([{ op: 'set_parameters', values: { [id]: value }, transition_s: 0 }]);
      if (p.type === 'number') {
        const row = el('div', 'row'); slider = range(p.min, p.max, p.default, (p.max - p.min) / 1000, p.label);
        input = el('input'); input.type = 'number'; Object.assign(input, { min: p.min, max: p.max, step: 'any', value: p.default }); input.setAttribute('aria-label', p.label + '数值');
        slider.oninput = () => { input.value = format(Number(slider.value)); set(Number(slider.value)); }; input.onchange = () => set(Number(input.value)); row.append(slider, input); group.append(row);
      } else {
        input = el('select'); input.setAttribute('aria-label', p.label);
        for (const choice of p.choices) { const o = el('option', '', choice); o.value = choice; input.append(o); }
        input.value = p.default; input.onchange = () => set(input.value); group.append(input);
      }
      input.id = 'parameter-' + id; label.htmlFor = input.id; group.append(el('div', 'hint', id)); $('parameters').append(group);
      parameterControls.set(id, { input, slider, mark });
    }
    for (const [id, e] of Object.entries(rig.expressions)) {
      const card = el('div', 'recipe'), label = el('label'), enabled = el('input'); enabled.type = 'checkbox'; enabled.dataset.expression = id;
      label.append(enabled, document.createTextNode(e.label)); const description = el('p', '', e.description), row = el('div', 'row');
      const weight = range(0, 1, 1, .01, e.label + '强度'), output = el('output', '', '100%'); row.append(weight, output); card.append(label, description, row); $('expressions').append(card);
      const apply = () => act([{ op: 'apply_expression', expression: id, instance_id: 'ui_expr_' + id, weight: Number(weight.value) }]);
      enabled.onchange = () => enabled.checked ? apply() : act([{ op: 'release_expression', instance_id: 'ui_expr_' + id }]);
      weight.oninput = () => { output.value = Math.round(weight.value * 100) + '%'; if (enabled.checked) apply(); };
      recipeControls.set(id, { enabled, weight, output });
    }
    for (const [id, a] of Object.entries(rig.animations)) {
      const card = el('div', 'anim'), head = el('div', 'anim-head'), speed = el('select'); speed.setAttribute('aria-label', a.label + '播放速度');
      for (const v of [.25, .5, 1, 1.5, 2]) { const o = el('option', '', v + '×'); o.value = v; speed.append(o); } speed.value = 1;
      head.append(el('span', '', a.label), button('播放', () => act([{ op: 'play_animation', animation: id, instance_id: 'ui_anim_' + id, speed: Number(speed.value), weight: 1 }])));
      card.append(head, el('p', '', `${a.loop ? '循环' : '单次'} · ${a.duration_s} 秒 · ${a.description}`), speed); $('animations').append(card);
    }
    $('command').value = JSON.stringify({ schema_version: '0.1.0', document_type: 'command', character_id: rig.character_id, actions: [{ op: 'reset' }] }, null, 2);
  }
  function update(s) {
    if (!s || !loaded?.rig) return; const paused = s.paused ?? state?.paused ?? false; state = { ...s, paused };
    $('pauseAll').textContent = paused ? '继续时间' : '暂停时间';
    for (const [id, controls] of parameterControls) {
      if (document.activeElement !== controls.input) controls.input.value = format(s.parameters[id]);
      if (controls.slider && document.activeElement !== controls.slider) controls.slider.value = s.parameters[id];
      controls.mark.textContent = s.manual.includes(id) ? '手动覆盖' : '';
    }
    for (const [id, controls] of recipeControls) {
      const active = s.expressions.find(e => e.instance_id === 'ui_expr_' + id);
      controls.enabled.checked = !!active && !active.releasing; controls.enabled.disabled = !!active?.releasing;
      if (active && document.activeElement !== controls.weight) { controls.weight.value = active.weight; controls.output.value = Math.round(active.weight * 100) + '%'; }
    }
    for (const [id, item] of instanceControls) if (!s.animations.some(a => a.instance_id === id)) { item.card.remove(); instanceControls.delete(id); }
    for (const a of s.animations) {
      let item = instanceControls.get(a.instance_id);
      if (!item) {
        const card = el('div', 'instance'), head = el('div', 'anim-head'); card.dataset.instance = a.instance_id;
        head.append(el('span', '', a.instance_id)); const time = el('span', 'time'); head.append(time);
        const slider = range(0, a.duration_s, 0, .001, a.instance_id + '时间位置');
        slider.oninput = () => act([{ op: 'seek_animation', instance_id: a.instance_id, time_s: Number(slider.value) }]);
        const row = el('div', 'anim-controls'), pause = button('暂停', () => {
          const current = state.animations.find(i => i.instance_id === a.instance_id); if (current) act([{ op: current.paused ? 'resume_animation' : 'pause_animation', instance_id: a.instance_id }]);
        });
        const stop = button('停止', () => act([{ op: 'stop_animation', instance_id: a.instance_id }]));
        const speed = el('input'); speed.type = 'number'; speed.min = .01; speed.step = .1; speed.setAttribute('aria-label', a.instance_id + '速度'); speed.style.width = '60px';
        speed.onchange = () => act([{ op: 'set_animation_speed', instance_id: a.instance_id, speed: Number(speed.value) }]);
        row.append(pause, stop, speed, document.createTextNode('×')); card.append(head, slider, row); $('instances').append(card);
        item = { card, time, slider, pause, stop, speed }; instanceControls.set(a.instance_id, item);
      }
      item.time.textContent = `${a.time_s.toFixed(2)} / ${a.duration_s}s`; if (document.activeElement !== item.slider) item.slider.value = a.time_s;
      item.pause.textContent = a.paused ? '继续' : '暂停'; item.stop.textContent = a.stopping ? '退出中' : '停止'; item.stop.disabled = item.slider.disabled = item.pause.disabled = a.stopping;
      if (document.activeElement !== item.speed) item.speed.value = a.speed;
    }
  }
  $('search').oninput = () => { const q = $('search').value.toLowerCase(); for (const n of $('parameters').children) n.hidden = !n.dataset.search.includes(q); };
  $('pauseAll').onclick = async () => { update(await request('pause', { paused: !state?.paused })); };
  $('resetAll').onclick = async () => { await act([{ op: 'reset' }]); update(await request('pause', { paused: false })); };
  $('clearManual').onclick = async () => { try { update(await request('clearManual')); status('已清除手动覆盖。'); } catch (e) { status(e.message, true); } };
  $('runCommand').onclick = async () => { try { const result = await request('command', JSON.parse($('command').value)); update(result); status('指令已执行。'); } catch (e) { status(e.message, true); } };
  function download(name, content, type = 'application/json') { const url = URL.createObjectURL(new Blob([content], { type })), a = el('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  $('exportSvg').onclick = async () => { const s = await request('snapshot'); download(s.name.replace(/\.svg$/i, '') + '-expression.svg', s.svg, 'image/svg+xml'); };
  $('exportCatalog').onclick = async () => download('expression-capabilities.json', JSON.stringify(await request('catalog'), null, 2));
  $('exportCommand').onclick = async () => {
    const s = await request('state'), actions = [{ op: 'reset' }];
    for (const e of s.expressions.filter(e => !e.releasing)) actions.push({ op: 'apply_expression', expression: e.expression, instance_id: e.instance_id, weight: e.weight });
    for (const a of s.animations.filter(a => !a.instance_id.includes('/') && !a.stopping)) actions.push({ op: 'play_animation', animation: a.animation, instance_id: a.instance_id, speed: a.speed, weight: a.target_weight });
    for (const a of s.animations.filter(a => a.instance_id.includes('/') && !a.stopping && s.expressions.some(e => !e.releasing && a.instance_id.startsWith(e.instance_id + '/')))) actions.push({ op: 'set_animation_speed', instance_id: a.instance_id, speed: a.speed });
    if (s.manual.length) actions.push({ op: 'set_parameters', values: Object.fromEntries(s.manual.map(p => [p, s.parameters[p]])), transition_s: 0 });
    download('expression-command.json', JSON.stringify({ schema_version: '0.1.0', document_type: 'command', character_id: s.character_id, actions }, null, 2));
  };
  // Public API for a local caller/LLM host. It accepts the same validated commands.
  window.expressionPreview = { load: async data => {
    if (typeof data.svg !== 'string' || !data.svg.trim()) throw new Error('load 需要完整的 SVG 文本');
    candidate = { ...data, jsonName: data.jsonName || (data.rig ? 'controls.json' : '') };
    const result = await enqueueLoad(); if (!result.ok) throw new Error(result.error); return result.state;
  }, command: async data => { const s = await request('command', data); update(s); return s; }, getState: () => request('state'), getCapabilities: () => request('catalog') };
  window.addEventListener('load', () => viewer.contentWindow.postMessage({ channel: 'astra-expression', event: 'ping' }, '*'));
})();

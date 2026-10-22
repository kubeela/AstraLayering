import { ClothBody, bindingDefaults, validateBinding, physicsVersion } from './physics-model.js';
import { PhysicsRenderer } from './physics-renderer.js';
const $ = s => document.querySelector(s);
const specs = {
  fixed: ['固定范围', 0, 85, 1, '%', 100], transition: ['过渡范围', 5, 40, 1, '%', 100],
  maxAngle: ['最大摆角', 1, 45, 1, '°', 1], maxTravel: ['最大末端位移', 1, 30, 1, '%', 100],
  stretch: ['最大拉伸', .5, 8, .5, '%', 100], stiffness: ['回弹速度', 1, 25, .5, '', 1], damping: ['衰减速度', .5, 12, .5, '', 1],
};
export class PhysicsPanel {
  constructor({ stage, surfaces, source, fingerprint, workspace, tool, busy, error, changed, download, selectLayer }) {
    Object.assign(this, { stage, surfaces, source, fingerprint, workspace, tool, busy, error, changed, download, selectLayer });
    this.bindings = new Map(); this.bodies = new Map(); this.epoch = 0; this.paused = false; this.enabled = false;
    this.radius = 90; this.force = .7; this.showGuides = true; this.scope = 'current';
    for (const [key, [label, min, max, step, unit]] of Object.entries(specs)) {
      const box = document.createElement('div'); box.className = 'slider';
      box.innerHTML = `<div class="slider-head"><label for="physics-${key}">${label}</label><label class="slider-number"><input id="physics-number-${key}" type="number" min="${min}" max="${max}" step="${step}" aria-label="${label}数值"><span>${unit}</span></label></div><input id="physics-${key}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}">`;
      $('#physics-' + (['maxAngle','maxTravel','stretch'].includes(key) ? 'limits' : 'material')).append(box);
      for (const id of ['physics-' + key, 'physics-number-' + key]) $('#' + id).addEventListener(id.includes('number') ? 'change' : 'input', e => {
        if (!Number.isFinite(e.target.valueAsNumber) || e.target.value === '') return this.sync();
        this.edit(key, Math.max(min, Math.min(max, e.target.valueAsNumber)) / specs[key][5]);
      });
    }
    $('#physics-prepare').onclick = () => void this.prepare();
    $('#physics-close').onclick = () => this.source()?.physicsCase ? this.clear() : void this.surfaces.close();
    $('#physics-demo').onchange = e => this.setDemo(e.target.checked);
    $('#physics-part').onchange = e => this.select(e.target.value);
    $('#physics-filter').oninput = () => this.options();
    $('#physics-enabled').onchange = e => this.edit('enabled', e.target.checked);
    $('#physics-direction').onchange = e => this.edit('direction', e.target.value);
    $('#physics-kind').onchange = e => { const old = this.bindings.get(this.selected); this.bindings.set(this.selected, { ...bindingDefaults(e.target.value), enabled: old.enabled, direction: old.direction }); this.rebuild(); this.save(); this.sync(); };
    $('#physics-pause').onclick = () => { this.paused = !this.paused; this.lastTime = 0; this.sync(); };
    $('#physics-step').onclick = () => { this.paused = true; this.advance(1 / 60); this.sync(); };
    $('#physics-reset').onclick = () => { for (const b of this.bodies.values()) b.reset(); this.render(); this.sync(); };
    $('#physics-pulse').onclick = () => this.pulse();
    $('#physics-guides').onchange = e => { this.showGuides = e.target.checked; this.overlay(); };
    $('#physics-scope').onchange = e => { this.scope = e.target.value; this.pointer = null; };
    $('#physics-radius').oninput = e => { this.radius = e.target.valueAsNumber; $('#physics-radius-value').textContent = this.radius + ' px'; this.overlay(); };
    $('#physics-force').oninput = e => { this.force = e.target.valueAsNumber / 100; $('#physics-force-value').textContent = e.target.value + '%'; };
    $('#physics-export').onclick = () => this.download(new Blob([JSON.stringify(this.recipe(), null, 2) + '\n'], { type: 'application/json' }), 'character.physics.json');
    $('#physics-import').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { if (f.size > 1024 * 1024) throw Error('物理配置过大'); this.restore(JSON.parse(await f.text())); this.rebuild(); this.save(); this.sync(); }
      catch (error) { this.error(error.message); } finally { e.target.value = ''; }
    };
    this.onBlur = () => { this.pointer = null; this.lastTime = 0; this.accumulator = 0; this.overlay(); };
    window.addEventListener('blur', this.onBlur); document.addEventListener('visibilitychange', this.onBlur);
    this.sync();
  }
  options() {
    const query = $('#physics-filter').value.toLowerCase();
    const choices = this.parts?.filter(l => l.name.toLowerCase().includes(query) || l.id === this.selected) || [];
    $('#physics-part').replaceChildren(...choices.map(l => new Option(`${this.bindings.get(l.id)?.enabled ? '● ' : ''}${l.name}`, l.id)));
    $('#physics-part').value = this.selected || '';
  }
  select(id) {
    if (!this.bindings.has(id)) return;
    this.selected = id; this.pointer = null; this.selectLayer?.(id); this.sync(); this.overlay();
  }
  async prepare({ draft, enabled = true, selected, paused = false, internal = false } = {}) {
    if (this.ready || this.preparing || !this.source() || (!internal && this.busy())) return;
    const epoch = ++this.epoch, owner = this.source(); this.preparing = true; this.sync();
    try {
      const fixture = owner.physicsCase;
      const ok = fixture || await this.surfaces.prepare({ allowFlat: true });
      if (!ok || epoch !== this.epoch || this.source() !== owner) return;
      this.parts = fixture?.layers || this.surfaces.layers; this.size = fixture?.size || this.surfaces.size; this.owner = owner;
      this.sourceHash = this.fingerprint(); this.bindings.clear();
      for (const l of this.parts) {
        const ribbon = /(?:left|right)_long_tail|飘带/.test(l.name), skirt = /skirt_(?:front|side_back)|裙摆/.test(l.name);
        const binding = fixture?.bindings[l.id] || bindingDefaults(ribbon ? 'ribbon' : 'cloth');
        if (!fixture) binding.enabled = ribbon || skirt;
        if (!fixture && skirt) { binding.maxTravel = .08; binding.maxAngle = 12; binding.fixed = .32; }
        this.bindings.set(l.id, binding);
      }
      try { const saved = draft || JSON.parse(localStorage.getItem(this.storageKey()) || 'null'); if (saved) this.restore(saved); } catch (error) { this.error('旧物理草稿未加载：' + error.message); }
      this.selected = this.bindings.has(selected) ? selected : [...this.bindings].find(([, p]) => p.enabled)?.[0] || this.parts[0]?.id;
      this.ready = true; this.enabled = enabled; this.paused = paused; this.rebuild(); this.save(); this.options(); this.selectLayer?.(this.selected); this.sync(); this.changed();
      this.lastTime = 0; this.frame = requestAnimationFrame(t => this.tick(t));
    } catch (error) { this.clear(); this.error(error.message); }
    finally { this.preparing = false; this.sync(); }
  }
  async setEnabled(enabled) {
    if (enabled && !this.ready) return this.prepare();
    this.enabled = enabled && this.ready;
    this.pointer = null; this.lastTime = 0; this.accumulator = 0;
    if (!this.enabled) for (const b of this.bodies.values()) b.reset();
    this.render(); this.sync(); this.changed();
  }
  setDemo(enabled) {
    this.demo = !!enabled && !!this.source()?.physicsCase && this.ready;
    this.demoElapsed = 0; this.demoDirection = 1;
    if (this.demo && this.enabled && !this.paused) this.pulse();
    this.sync();
  }
  edit(key, value) {
    const p = this.bindings.get(this.selected); if (!p) return;
    const next=validateBinding({ ...p, [key]: value }); this.bindings.set(this.selected,next);
    if(['maxAngle','maxTravel','stretch','stiffness','damping'].includes(key)){
      const b=this.bodies.get(this.selected);
      if(b){
        if(key==='maxTravel'){const scale=next.maxTravel/b.binding.maxTravel;b.maxDistance*=scale;for(let i=0;i<b.limits.length;i++)b.limits[i]*=scale;}
        b.binding=next;
        if(['maxAngle','maxTravel','stretch'].includes(key))b.step();
        this.render();
      }
    }else this.rebuild();
    this.save(); this.sync();
  }
  rebuild() {
    this.renderer?.dispose(); this.bodies.clear(); this.pointer = null;
    for (const l of this.parts) { const p = this.bindings.get(l.id); if (p.enabled) this.bodies.set(l.id, new ClothBody(l.bounds, p)); }
    this.renderer = new PhysicsRenderer(this.stage, this.parts, this.bodies, this.size);
    this.lastTime = 0; this.accumulator = 0; this.render();
  }
  storageKey() { return 'astra-physics-1:' + this.sourceHash; }
  recipe() { return { schema: 1, solver: physicsVersion, sourceHash: this.sourceHash, size: this.size, bindings: Object.fromEntries(this.bindings) }; }
  restore(recipe) {
    if (recipe?.schema !== 1 || recipe.solver !== physicsVersion || recipe.sourceHash !== this.sourceHash || recipe.size?.[0] !== this.size[0] || recipe.size?.[1] !== this.size[1]) throw Error('物理配置与当前角色素材或版本不匹配');
    const entries = Object.entries(recipe.bindings || {});
    if (entries.length !== this.parts.length || entries.some(([id]) => !this.parts.some(l => l.id === id))) throw Error('物理配置的部件身份不匹配');
    const bindings = new Map(entries.map(([id, p]) => [id, validateBinding(p)])); this.bindings = bindings;
  }
  save() { try { localStorage.setItem(this.storageKey(), JSON.stringify(this.recipe())); $('#physics-draft').textContent = '草稿 · 已保存到本机'; } catch { $('#physics-draft').textContent = '本机保存不可用，请导出配置'; } }
  input(e) {
    if (!this.ready || !this.enabled || this.tool() !== 'disturb' || this.workspace() !== 'physics' || this.busy() || this.paused || document.hidden || !document.hasFocus()) { this.pointer = null; return; }
    const rect = this.stage.canvas.getBoundingClientRect(), [wx, wy] = this.stage.screenToWorld(e.clientX - rect.x, e.clientY - rect.y);
    const [w, h] = this.size, x = wx * h / 2 + w / 2, y = h / 2 - wy * h / 2, time = e.timeStamp;
    if (this.pointer) {
      const dt = (time - this.pointer.time) / 1000;
      if (dt > 0 && dt < .12) {
        const vx = (x - this.pointer.x) / dt * this.force, vy = (y - this.pointer.y) / dt * this.force;
        for (const [id, body] of this.bodies) if ((this.scope === 'all' || id === this.selected) && body.hit(x, y, [this.parts.find(l => l.id === id)])) body.impulse(x, y, vx, vy, this.radius);
      }
    }
    this.pointer = { x, y, time }; this.overlay();
  }
  pulse(direction = 1) {
    if (!this.ready || !this.enabled) return;
    for (const [id, b] of this.bodies) if (this.scope === 'all' || id === this.selected) {
      const l = this.parts.find(l => l.id === id);
      let target = -1, best = 0;
      const vertical = ['down', 'up'].includes(b.binding.direction), reverse = ['up', 'left'].includes(b.binding.direction);
      for (let i = 0; i < b.weights.length; i++) {
        const t = vertical ? (b.rest[i * 2 + 1] - l.bounds.y) / l.bounds.height : (b.rest[i * 2] - l.bounds.x) / l.bounds.width;
        const score = b.weights[i] * (.01 + (reverse ? 1 - t : t));
        if (score > best && b.hit(b.positions[i * 2], b.positions[i * 2 + 1], [l])) { target = i; best = score; }
      }
      if (target >= 0) {
        const velocity = b.freeLength * 1.5 * this.force * direction;
        b.impulse(b.positions[target * 2], b.positions[target * 2 + 1], vertical ? velocity : 0, vertical ? 0 : velocity, Math.max(this.radius, b.freeLength * .8));
      }
    }
    this.lastTime = 0;
  }
  advance(dt) { if (!this.enabled) return; for (let t = 0; t < dt - 1e-9; t += 1 / 120) for (const b of this.bodies.values()) b.step(); this.render(); }
  render() { this.renderer?.update(); this.stage.render(); this.overlay(); }
  tick(time) {
    if (!this.ready) return;
    const dt = this.lastTime ? Math.min(.05, (time - this.lastTime) / 1000) : 0; this.lastTime = time;
    if (this.demo && this.enabled && !this.paused && !document.hidden) {
      this.demoElapsed += dt;
      if (this.demoElapsed >= 2.4) { this.demoDirection *= -1; this.pulse(this.demoDirection); this.demoElapsed = 0; }
    }
    if (this.enabled && !document.hidden && !this.paused && [...this.bodies.values()].some(b => b.moving())) {
      this.accumulator = (this.accumulator || 0) + dt;
      let steps = 0; while (this.accumulator >= 1 / 120 && steps < 6) { for (const b of this.bodies.values()) b.step(); this.accumulator -= 1 / 120; steps++; }
      if (steps) this.render();
    } else this.accumulator = 0;
    if (!this.statsTime || time - this.statsTime > 180) { this.stats(); this.statsTime = time; }
    this.frame = requestAnimationFrame(t => this.tick(t));
  }
  stats() {
    const b = this.bodies.get(this.selected), el = $('#physics-stats');
    el.textContent = b ? `位移 ${b.stats.travel.toFixed(1)} / ${b.maxDistance.toFixed(1)} px · 摆角 ${b.stats.angle.toFixed(1)} / ${b.binding.maxAngle}°${b.stats.limited ? ' · 已限幅' : ''}` : '当前部件未绑定物理';
    el.classList.toggle('limited', !!b?.stats.limited);
  }
  sync() {
    const canPrepare = this.source()?.physicsCase || this.surfaces.session()?.session;
    const requestedCase = $('#physics-case-select').value;
    const canLoadCase = requestedCase && (!this.ready || requestedCase !== this.source()?.physicsCase?.id);
    $('#effect-physics').checked = this.enabled || this.preparing;
    $('#effect-physics').disabled = this.preparing || !this.source() || this.busy() || !canPrepare;
    $('#physics-prepare').disabled = this.preparing || this.busy() || (requestedCase ? !canLoadCase : this.ready || !this.source() || !canPrepare);
    $('#physics-prepare').textContent = this.preparing ? '正在准备…' : '加载部件';
    $('#physics-controls').hidden = !this.ready; $('#physics-close').hidden = !this.ready;
    $('#physics-status').textContent = this.preparing ? '读取当前部件与贴图…' : this.ready ? `${this.bodies.size} 个绑定 · ${this.enabled ? '已启用' : '已关闭'}` : this.source()&&!canPrepare ? '等待原生图层就绪…' : '开启摆动物理后自动准备部件';
    $('#physics-demo').checked = !!this.demo;
    $('#physics-demo').disabled = !this.ready || this.busy();
    $('#physics-pause').textContent = this.paused ? '继续' : '暂停';
    for (const id of ['physics-pause','physics-step','physics-pulse']) $('#' + id).disabled = !this.enabled || this.busy();
    const p = this.bindings.get(this.selected); if (!p) { this.overlay(); return; }
    this.options(); $('#physics-enabled').checked = p.enabled; $('#physics-kind').value = p.kind; $('#physics-direction').value = p.direction;
    for (const [key, [, min, max, , , factor]] of Object.entries(specs)) for (const id of ['physics-' + key, 'physics-number-' + key]) {
      const el = $('#' + id); el.value = Number((p[key] * factor).toFixed(2)); el.style.setProperty('--fill', (p[key] * factor - min) / (max - min) * 100 + '%');
    }
    const b = this.bodies.get(this.selected); $('#physics-limit-hint').textContent = b ? `位移上限按自由段长度计算：${b.maxDistance.toFixed(1)} px` : '启用后显示位移上限';
    this.stats(); this.overlay();
  }
  overlay() {
    const svg = $('#physics-overlay'); if (!svg) return;
    const enabled = this.ready && this.enabled && this.workspace() === 'physics'; svg.toggleAttribute('hidden', !enabled);
    if (!enabled) return;
    const [w, h] = this.size, screen = (x, y) => this.stage.worldToScreen((x - w / 2) * 2 / h, (h / 2 - y) * 2 / h);
    const b = this.bodies.get(this.selected), commands = [], fixed = [], paths = [];
    if (b && this.showGuides) {
      for (const e of b.edges) if (!e.bend && (Math.abs(e.dx) < 1e-6 || Math.abs(e.dy) < 1e-6)) {
        const a = screen(b.positions[e.a * 2], b.positions[e.a * 2 + 1]), c = screen(b.positions[e.b * 2], b.positions[e.b * 2 + 1]);
        (b.weights[e.a] === 0 && b.weights[e.b] === 0 ? fixed : commands).push(`M${a[0]},${a[1]}L${c[0]},${c[1]}`);
      }
      // Envelope of allowed positions along the actual free edge, including
      // transition weights. This is an authored movement range, not a collider.
      const vertical = ['down', 'up'].includes(b.binding.direction), reverse = ['up', 'left'].includes(b.binding.direction);
      const indices = vertical ? Array.from({length:b.cols},(_,x)=>(reverse?0:b.rows-1)*b.cols+x) : Array.from({length:b.rows},(_,y)=>y*b.cols+(reverse?0:b.cols-1));
      for (const side of [-1,1]) paths.push(indices.map(i => { const p=screen(b.rest[i*2]+(vertical?side*b.limits[i]:0),b.rest[i*2+1]+(vertical?0:side*b.limits[i])); return p.join(','); }).join(' '));
    }
    svg.querySelector('.physics-mesh').setAttribute('d', commands.join('')); svg.querySelector('.physics-fixed').setAttribute('d', fixed.join(''));
    svg.querySelectorAll('.physics-boundary').forEach((p, i) => p.setAttribute('points', paths[i] || ''));
    const circle = svg.querySelector('circle'); circle.style.display = this.pointer && this.tool() === 'disturb' ? '' : 'none';
    if (this.pointer) { const p = screen(this.pointer.x,this.pointer.y), r = Math.abs(screen(this.pointer.x+this.radius,this.pointer.y)[0]-p[0]); circle.setAttribute('cx',p[0]);circle.setAttribute('cy',p[1]);circle.setAttribute('r',r); }
  }
  clear() {
    this.epoch++; cancelAnimationFrame(this.frame); this.ready = false; this.preparing = false; this.enabled = false; this.renderer?.dispose(); this.renderer = null;
    this.parts = null; this.bindings.clear(); this.bodies.clear(); this.selected = null; this.pointer = null; this.lastTime = 0; this.paused = false; this.demo = false; this.sync(); this.changed();
  }
  diagnostics() { return { ready: !!this.ready, enabled: this.enabled, demo: !!this.demo, paused: this.paused, selected: this.selected, solver: physicsVersion, size: this.size,
    parts: this.parts?.map(l => ({ id:l.id,name:l.name,bounds:l.bounds,binding:this.bindings.get(l.id),stats:this.bodies.get(l.id)?.stats,impulses:this.bodies.get(l.id)?.impulses || 0 })) || [],
    drawItems: this.renderer?.items.length || 0, textureSizes: this.renderer?.targets.map(t=>[t.width,t.height]) || [] }; }
}

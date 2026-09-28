/* Astra expression protocol 0.1.0. No network, eval or user-provided scripts. */
(function (host) {
  'use strict';
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const copy = value => structuredClone(value);
  const entries = Object.entries;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const progress = (age, duration) => duration === 0 ? 1 : clamp(age / duration);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const arity = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };

  // Interpreter for the keywords used by the checked-in 2020-12 contract.
  // The build/test script detects schema drift; this is not a general schema library.
  function schemaCheck(value, schema = host.AstraExpressionSchema, path = '$') {
    if (schema === true) return;
    check(schema !== false, `${path}: 不允许此字段`);
    if (schema.$ref) return schemaCheck(value, schema.$ref.split('/').slice(1).reduce((o, k) => o[k], host.AstraExpressionSchema), path);
    if (schema.oneOf) {
      const results = schema.oneOf.map(s => { try { schemaCheck(value, s, path); return null; } catch (e) { return e; } });
      check(results.filter(e => !e).length === 1, results.filter(Boolean).map(e => e.message).join(' / '));
    }
    for (const s of schema.allOf || []) schemaCheck(value, s, path);
    if (schema.if) {
      let matched = true; try { schemaCheck(value, schema.if, path); } catch { matched = false; }
      if (matched && schema.then) schemaCheck(value, schema.then, path);
      if (!matched && schema.else) schemaCheck(value, schema.else, path);
    }
    if (schema.not) {
      let matched = true; try { schemaCheck(value, schema.not, path); } catch { matched = false; }
      check(!matched, `${path}: 不允许的组合`);
    }
    if (own(schema, 'const')) check(value === schema.const, `${path}: 应为 ${schema.const}`);
    if (schema.enum) check(schema.enum.includes(value), `${path}: 不在允许的枚举内`);
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      check(types.some(t => t === 'null' ? value === null : t === 'array' ? Array.isArray(value) : t === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : t === 'integer' ? Number.isInteger(value) : typeof value === t), `${path}: 类型应为 ${types.join('/')}`);
    }
    if (typeof value === 'number') {
      check(Number.isFinite(value), `${path}: 数值必须有限`);
      for (const [k, f] of entries({ minimum: (v, n) => v >= n, maximum: (v, n) => v <= n, exclusiveMinimum: (v, n) => v > n }))
        if (own(schema, k)) check(f(value, schema[k]), `${path}: 超出 ${k} ${schema[k]}`);
    }
    if (typeof value === 'string') {
      check(value.length >= (schema.minLength || 0), `${path}: 字符串为空`);
      if (schema.pattern) check(new RegExp(schema.pattern).test(value), `${path}: 格式不合法`);
    }
    if (Array.isArray(value)) {
      check(value.length >= (schema.minItems || 0) && value.length <= (schema.maxItems ?? Infinity), `${path}: 数组长度不合法`);
      if (schema.uniqueItems) check(new Set(value.map(v => JSON.stringify(v))).size === value.length, `${path}: 数组有重复项`);
      if (schema.items !== undefined) value.forEach((v, i) => schemaCheck(v, schema.items, `${path}[${i}]`));
    } else if (value && typeof value === 'object') {
      check(Object.keys(value).length >= (schema.minProperties || 0), `${path}: 对象为空`);
      for (const k of schema.required || []) check(own(value, k), `${path}: 缺少 ${k}`);
      for (const [k, v] of entries(value)) {
        check(!['__proto__', 'prototype', 'constructor'].includes(k), `${path}: 非法键 ${k}`);
        if (schema.propertyNames) schemaCheck(k, schema.propertyNames, path);
        if (schema.properties && own(schema.properties, k)) schemaCheck(v, schema.properties[k], `${path}.${k}`);
        else if (schema.additionalProperties !== undefined) schemaCheck(v, schema.additionalProperties, `${path}.${k}`);
      }
    }
  }
  function pathData(d) {
    const pattern = /[MLCQZ]|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/g;
    check(!d.replace(pattern, '').replace(/[\s,]/g, ''), '路径只支持显式绝对 M/L/C/Q/Z');
    const tokens = d.match(pattern) || [], commands = [], values = [], ends = [];
    for (let i = 0; i < tokens.length;) {
      const c = tokens[i++]; check(own(arity, c), '路径命令必须显式写出'); commands.push(c);
      for (let j = 0; j < arity[c]; j++) { const n = Number(tokens[i++]); check(Number.isFinite(n), '路径坐标缺失'); values.push(n); }
      ends.push(values.length);
    }
    check(commands[0] === 'M', '路径必须以 M 开始'); return { commands, values, ends };
  }
  function pathString(p, values = p.values) {
    let i = 0; return p.commands.map(c => c + ' ' + values.slice(i, i += arity[c]).map(v => +v.toFixed(7)).join(' ')).join(' ');
  }
  function interval(xs, x) {
    let i = 0; while (i < xs.length - 2 && x >= xs[i + 1]) i++;
    return [i, clamp((x - xs[i]) / (xs[i + 1] - xs[i]))];
  }
  function curve(keys, x, mode) {
    const [i, t] = interval(keys.map(k => k[0]), x);
    return lerp(keys[i][1], keys[i + 1][1], mode === 'step' ? (t === 1 ? 1 : 0) : mode === 'smoothstep' ? t * t * (3 - 2 * t) : t);
  }
  class Runtime {
    constructor(svg, rig) {
      schemaCheck(rig); check(rig.document_type === 'rig', '请选择 rig 控制定义，command 是运行指令');
      this.svg = svg; this.rig = copy(rig); this.nodes = new Map(); this.originals = new Map(); this.morphs = new Map();
      for (const n of [svg, ...svg.querySelectorAll('[id]')]) if (n.id) { check(!this.nodes.has(n.id), `SVG id 重复：${n.id}`); this.nodes.set(n.id, n); }
      this.order = []; this.validate(); this.state = this.empty(); this.values = this.defaults();
      for (const b of Object.values(rig.bindings)) {
        if (b.type === 'variant') for (const ids of Object.values(b.cases)) for (const id of ids) this.remember(id, 'opacity');
        else this.remember(b.svg_id, b.type === 'path_morph' ? 'd' : b.property === 'opacity' ? 'opacity' : 'transform');
      }
      for (const a of Object.values(rig.attachments)) this.remember(a.svg_id, 'transform');
    }
    empty() { return { manual: {}, expressions: {}, animations: {} }; }
    defaults() { return Object.fromEntries(entries(this.rig.parameters).map(([id, p]) => [id, p.default])); }
    node(id) { check(this.nodes.has(id), `SVG 缺少部件：${id}`); return this.nodes.get(id); }
    parameter(id, type) { const p = this.rig.parameters[id]; check(p && (!type || p.type === type), `参数不存在或类型不符：${id}`); return p; }
    value(id, v, publicOnly = false) {
      const p = this.parameter(id); check(!publicOnly || p.access === 'public', `内部动画参数不可直接设置：${id}`);
      check(p.type === 'number' ? typeof v === 'number' && Number.isFinite(v) && v >= p.min - 1e-9 && v <= p.max + 1e-9 : p.choices.includes(v), `参数取值不合法：${id} = ${v}`);
    }
    remember(id, prop) {
      const k = id + ':' + prop; if (this.originals.has(k)) return;
      const node = this.node(id); this.originals.set(k, { node, prop, attr: node.getAttribute(prop), css: node.style.getPropertyValue(prop), priority: node.style.getPropertyPriority(prop) });
    }
    restore() {
      for (const o of this.originals.values()) {
        if (o.attr === null) o.node.removeAttribute(o.prop); else o.node.setAttribute(o.prop, o.attr);
        if (o.css) o.node.style.setProperty(o.prop, o.css, o.priority); else o.node.style.removeProperty(o.prop);
      }
    }
    validate() {
      const r = this.rig, claims = new Set(), transforms = new Map();
      const claim = (id, prop) => { this.node(id); const k = id + ':' + prop; check(!claims.has(k), `重复控制：${k}`); claims.add(k); };
      const wrapper = id => {
        const n = this.node(id); check(n.localName === 'g', `变换控制需要独立 g 层：${id}`);
        check(!n.hasAttribute('transform') && !n.style.transform, `控制层必须是初始单位变换：${id}`);
      };
      for (const [id, p] of entries(r.parameters)) {
        if (p.type === 'number') { check(p.min < p.max, `参数范围无效：${id}`); if (p.role === 'phase') check(p.min === 0 && p.max === 1 && p.access === 'animation', `相位定义无效：${id}`); }
        this.value(id, p.default);
      }
      for (const [id, b] of entries(r.bindings)) {
        if (b.type === 'path_morph') {
          const n = this.node(b.svg_id); check(n.localName === 'path', `形变目标不是 path：${id}`); claim(b.svg_id, 'd');
          const axes = b.parameters.map(p => this.parameter(p, 'number'));
          check(b.interpolation === (axes.length === 1 ? 'linear' : 'bilinear'), `形变维数错误：${id}`);
          const keys = b.keys.map(k => ({ ...k, path: pathData(k.d) }));
          check(keys.every(k => k.at.length === axes.length), `形变坐标维数错误：${id}`);
          const levels = axes.map((a, i) => [...new Set(keys.map(k => k.at[i]))].sort((a, b) => a - b));
          check(new Set(keys.map(k => k.at.join(','))).size === keys.length && levels.reduce((a, xs) => a * xs.length, 1) === keys.length, `形变网格不完整：${id}`);
          levels.forEach((xs, i) => check(xs[0] === axes[i].min && xs.at(-1) === axes[i].max, `形变范围不完整：${id}`));
          check(keys.every(k => k.path.commands.join() === keys[0].path.commands.join()), `形变拓扑不一致：${id}`);
          const def = keys.find(k => k.at.every((v, i) => v === axes[i].default));
          check(def && pathString(def.path) === pathString(pathData(n.getAttribute('d') || '')), `默认轮廓与 SVG 不一致：${id}`);
          this.morphs.set(id, { keys, levels });
        } else if (b.type === 'scalar_map') {
          const p = this.parameter(b.parameter, 'number'); claim(b.svg_id, b.property);
          check(b.keys[0][0] === p.min && b.keys.at(-1)[0] === p.max && b.keys.every((k, i) => !i || k[0] > b.keys[i - 1][0]), `映射范围或顺序错误：${id}`);
          if (b.property === 'opacity') check(b.keys.every(k => k[1] >= 0 && k[1] <= 1), `不透明度范围错误：${id}`);
          else {
            wrapper(b.svg_id); const prior = transforms.get(b.svg_id);
            check(!prior || prior.join() === b.pivot.join(), `同层变换中心不一致：${b.svg_id}`); transforms.set(b.svg_id, b.pivot);
          }
        } else {
          const p = this.parameter(b.parameter, 'enum'); check(Object.keys(b.cases).sort().join() === [...p.choices].sort().join(), `变体不完整：${id}`);
          for (const ids of Object.values(b.cases)) for (const nid of ids) claim(nid, 'opacity');
        }
      }
      for (const [id, a] of entries(r.anchors)) {
        const n = this.node(a.svg_id);
        if (a.type === 'path_vertex') { const p = pathData(n.getAttribute('d') || ''); check(a.command_index < p.commands.length && p.commands[a.command_index] !== 'Z', `锚点索引错误：${id}`); }
      }
      const targets = new Map();
      for (const [id, a] of entries(r.attachments)) {
        wrapper(a.svg_id); check(!targets.has(a.svg_id) && !transforms.has(a.svg_id), `重复附着变换：${id}`); targets.set(a.svg_id, id);
        check(r.anchors[a.anchor], `锚点不存在：${id}`);
        const source = this.node(r.anchors[a.anchor].svg_id); check(!this.node(a.svg_id).contains(source), `附着依赖自身：${id}`);
        if (a.sample === 'cycle_start') check(r.animations[a.clock]?.loop, `出生锚点需要循环动画：${id}`);
      }
      const visited = new Set(), pending = new Set();
      const visit = id => {
        check(!pending.has(id), '附着关系存在循环'); if (visited.has(id)) return; pending.add(id);
        const a = r.attachments[id];
        for (const start of [this.node(r.anchors[a.anchor].svg_id), this.node(a.svg_id).parentElement])
          for (let n = start; n && n !== this.svg; n = n.parentElement) if (targets.has(n.id)) visit(targets.get(n.id));
        pending.delete(id); visited.add(id); this.order.push(id);
      };
      for (const id of Object.keys(r.attachments)) visit(id);
      for (const [id, a] of entries(r.animations)) {
        check(a.loop ? a.seam !== 'not_applicable' : a.seam === 'not_applicable', `循环模式错误：${id}`);
        check(a.fade_in_s <= a.duration_s && a.fade_out_s <= a.duration_s, `淡入淡出过长：${id}`);
        check(new Set(a.tracks.map(t => t.parameter)).size === a.tracks.length, `动画重复通道：${id}`);
        for (const t of a.tracks) {
          const p = this.parameter(t.parameter, 'number'); if (p.role === 'phase') check(t.blend === 'replace', `相位必须 replace：${id}`);
          check(t.keys[0].time_s === 0 && t.keys.at(-1).time_s === a.duration_s && t.keys.every((k, i) => !i || k.time_s > t.keys[i - 1].time_s), `时间轴不完整：${id}`);
          if (t.blend === 'replace') t.keys.forEach(k => this.value(t.parameter, k.value));
          if (a.seam === 'continuous') check(t.keys[0].value === t.keys.at(-1).value, `循环首尾不连续：${id}`);
        }
      }
      for (const e of Object.values(r.expressions)) {
        for (const [p, v] of entries(e.parameters)) this.value(p, v, true);
        check(new Set(e.animations.map(a => a.animation)).size === e.animations.length, '表情内动画重复');
        e.animations.forEach(a => check(r.animations[a.animation], `动画不存在：${a.animation}`));
      }
      for (const c of r.constraints) for (const v of [...c.when, ...c.require]) { this.value(v.parameter, v.value); check(v.op === 'eq' || this.parameter(v.parameter).type === 'number', '枚举不能进行大小比较'); }
    }
    expressionWeight(e) {
      const spec = this.rig.expressions[e.id];
      if (e.releaseAge !== null) return e.releaseWeight * (1 - progress(e.releaseAge, spec.fade_out_s));
      if (e.releasing) return e.holdWeight;
      return e.weight * progress(e.age, spec.fade_in_s);
    }
    animationWeight(a, state) {
      const spec = this.rig.animations[a.id];
      const envelope = a.stopAge === null ? progress(a.age, spec.fade_in_s) : a.stopWeight * (1 - progress(a.stopAge, spec.fade_out_s));
      return a.weight * envelope * (a.owner ? this.expressionWeight(state.expressions[a.owner]) : 1);
    }
    compose(state, target = false) {
      const values = this.defaults(), gates = {}, mixes = {}, enums = {};
      for (const a of Object.values(this.rig.attachments)) if (a.sample === 'cycle_start') check(Object.values(state.animations).filter(v => v.id === a.clock).length <= 1, `出生锚点不能共享多个时钟实例：${a.clock}`);
      for (const e of Object.values(state.expressions)) {
        const w = target && !e.releasing ? e.weight : this.expressionWeight(e); if (w <= 0) continue;
        for (const [p, v] of entries(this.rig.expressions[e.id].parameters)) {
          if (this.parameter(p).type === 'number') { const m = mixes[p] ||= [0, 0]; m[0] += v * w; m[1] += w; }
          else if (v !== values[p]) { check(!enums[p] || enums[p] === v, `表情变体冲突：${p}`); enums[p] = v; }
        }
      }
      for (const [p, [sum, w]] of entries(mixes)) values[p] = (sum + values[p] * Math.max(0, 1 - w)) / Math.max(1, w);
      Object.assign(values, enums);
      for (const [p, m] of entries(state.manual)) values[p] = typeof m.to === 'number' ? lerp(m.from, m.to, target ? 1 : progress(m.age, m.duration)) : m.to;
      const tracks = [], replacements = new Set();
      for (const [instance, a] of entries(state.animations)) {
        const spec = this.rig.animations[a.id], t = spec.loop ? a.time % spec.duration_s : Math.min(a.time, spec.duration_s);
        const weight = this.animationWeight(a, state);
        for (const track of spec.tracks) {
          if (track.blend === 'replace') { check(!replacements.has(track.parameter), `动画 replace 通道冲突：${track.parameter}`); replacements.add(track.parameter); }
          tracks.push({ ...track, weight, instance, value: curve(track.keys.map(k => [k.time_s, k.value]), t, track.interpolation) });
        }
      }
      for (const blend of ['add', 'multiply', 'replace']) for (const t of tracks.filter(t => t.blend === blend)) {
        const p = t.parameter;
        if (this.parameter(p).role === 'phase') { values[p] = t.value; gates[p] = t.weight; }
        else if (blend === 'add') values[p] += t.value * t.weight;
        else if (blend === 'multiply') values[p] *= lerp(1, t.value, t.weight);
        else values[p] = lerp(values[p], t.value, t.weight);
      }
      for (const [p, v] of entries(values)) this.value(p, v);
      const matches = c => c.op === 'eq' ? values[c.parameter] === c.value : c.op === 'gte' ? values[c.parameter] >= c.value : values[c.parameter] <= c.value;
      for (const c of this.rig.constraints) if (c.when.every(matches)) check(c.require.every(matches), c.message);
      return { values, gates };
    }
    play(state, id, instance, speed, weight, owner = null) {
      check(this.rig.animations[id], `动画不存在：${id}`); check(!state.expressions[instance], `实例名称已用于表情：${instance}`);
      const a = state.animations[instance];
      if (a) { check(a.id === id && a.owner === owner && a.stopAge === null && a.finishAt === null, `实例仍占用，请先停止：${instance}`); a.speed = speed; a.weight = weight; }
      else state.animations[instance] = { id, speed, weight, owner, time: 0, age: 0, paused: false, stopAge: null, stopWeight: 1, finishAt: null, captures: {} };
    }
    stop(state, a) {
      const spec = this.rig.animations[a.id]; if (a.stopAge !== null || a.finishAt !== null) return;
      a.paused = false;
      if (spec.exit === 'finish_cycle') a.finishAt = (Math.floor(a.time / spec.duration_s) + 1) * spec.duration_s;
      else { a.stopWeight = progress(a.age, spec.fade_in_s); a.stopAge = 0; }
    }
    command(command) {
      schemaCheck(command); check(command.document_type === 'command' && command.character_id === this.rig.character_id, '指令角色与当前角色不一致');
      let s = copy(this.state);
      for (const a of command.actions) {
        if (a.op === 'reset') { s = this.empty(); continue; }
        if (a.op === 'set_parameters') {
          const from = this.compose(s).values;
          for (const [p, v] of entries(a.values)) { this.value(p, v, true); s.manual[p] = { from: from[p], to: v, age: 0, duration: a.transition_s }; }
        } else if (a.op === 'apply_expression') {
          const spec = this.rig.expressions[a.expression]; check(spec, `表情不存在：${a.expression}`);
          check(!s.animations[a.instance_id], `实例已用于动画：${a.instance_id}`);
          const e = s.expressions[a.instance_id];
          if (e) { check(e.id === a.expression && !e.releasing, `表情实例仍占用：${a.instance_id}`); e.weight = a.weight; }
          else {
            s.expressions[a.instance_id] = { id: a.expression, weight: a.weight, age: 0, releasing: false, releaseAge: null, releaseWeight: 0 };
            for (const play of spec.animations) this.play(s, play.animation, a.instance_id + '/' + play.animation, play.speed, play.weight, a.instance_id);
          }
        } else if (a.op === 'release_expression') {
          const e = s.expressions[a.instance_id]; check(e, `表情实例不存在：${a.instance_id}`);
          if (!e.releasing) { e.holdWeight = this.expressionWeight(e); e.releasing = true; for (const an of Object.values(s.animations).filter(an => an.owner === a.instance_id)) this.stop(s, an); }
        } else if (a.op === 'play_animation') this.play(s, a.animation, a.instance_id, a.speed, a.weight);
        else {
          const an = s.animations[a.instance_id]; check(an, `动画实例不存在：${a.instance_id}`); const spec = this.rig.animations[an.id];
          if (a.op === 'stop_animation') this.stop(s, an);
          if (a.op === 'pause_animation') an.paused = true;
          if (a.op === 'resume_animation') an.paused = false;
          if (a.op === 'set_animation_speed') an.speed = a.speed;
          if (a.op === 'seek_animation') {
            check(a.time_s <= spec.duration_s, '定位时间超出单个周期');
            check(an.stopAge === null && an.finishAt === null, '退出中的动画不可定位');
            an.time = Math.floor(an.time / spec.duration_s) * spec.duration_s + Math.min(a.time_s, spec.duration_s - 1e-9);
          }
        }
      }
      // Validate both current and transition targets before committing any action.
      this.advance(s, 0); this.compose(s, true); const result = this.compose(s);
      this.safeRender(result, s); this.state = s; this.values = result.values;
      if (command.actions.at(-1).op === 'reset') this.restore();
      return this.snapshot();
    }
    advance(s, dt) {
      for (const m of Object.values(s.manual)) m.age += dt;
      for (const e of Object.values(s.expressions)) { e.age += dt; if (e.releaseAge !== null) e.releaseAge += dt; }
      for (const [id, a] of entries(s.animations)) {
        const spec = this.rig.animations[a.id]; if (!a.paused) {
          a.age += dt;
          if (a.stopAge !== null) a.stopAge += dt;
          else {
            a.time += dt * a.speed;
            if (a.finishAt !== null && a.time >= a.finishAt) { a.stopAge = (a.time - a.finishAt) / a.speed; a.time = a.finishAt - 1e-9; a.stopWeight = 1; }
          }
        }
        if ((!spec.loop && a.time >= spec.duration_s && a.stopAge === null) || (a.stopAge !== null && a.stopAge >= spec.fade_out_s)) delete s.animations[id];
      }
      for (const [id, e] of entries(s.expressions)) if (e.releasing) {
        if (e.releaseAge === null && !Object.values(s.animations).some(a => a.owner === id)) { e.releaseWeight = this.expressionWeight(e); e.releaseAge = 0; }
        if (e.releaseAge !== null && e.releaseAge >= this.rig.expressions[e.id].fade_out_s) delete s.expressions[id];
      }
    }
    tick(dt) {
      check(Number.isFinite(dt) && dt >= 0, '时间增量无效'); const s = copy(this.state); this.advance(s, dt);
      const result = this.compose(s); this.safeRender(result, s); this.state = s; this.values = result.values; return this.values;
    }
    safeRender(result, state) {
      try { this.render(result, state); }
      catch (e) { this.restore(); this.render(this.compose(this.state), this.state); throw e; }
    }
    render({ values, gates }, state) {
      if (!Object.keys(state.manual).length && !Object.keys(state.expressions).length && !Object.keys(state.animations).length) { this.restore(); return; }
      const transforms = new Map();
      const opacity = (id, v) => { const n = this.node(id); n.setAttribute('opacity', String(v)); n.style.setProperty('opacity', String(v), 'important'); };
      for (const [id, b] of entries(this.rig.bindings)) {
        if (b.type === 'path_morph') {
          const m = this.morphs.get(id), axes = m.levels.map((xs, i) => interval(xs, values[b.parameters[i]]));
          const result = m.keys[0].path.values.map(() => 0);
          for (let corner = 0; corner < 2 ** axes.length; corner++) {
            let weight = 1; const at = axes.map(([i, t], dim) => { const bit = (corner >> dim) & 1; weight *= bit ? t : 1 - t; return m.levels[dim][i + bit]; });
            const k = m.keys.find(k => k.at.every((v, i) => v === at[i])); k.path.values.forEach((v, i) => result[i] += v * weight);
          }
          this.node(b.svg_id).setAttribute('d', pathString(m.keys[0].path, result));
        } else if (b.type === 'variant') for (const [choice, ids] of entries(b.cases)) ids.forEach(id => opacity(id, choice === values[b.parameter] ? 1 : 0));
        else {
          const v = curve(b.keys, values[b.parameter], b.interpolation);
          if (b.property === 'opacity') opacity(b.svg_id, v * (this.parameter(b.parameter).role === 'phase' ? gates[b.parameter] || 0 : 1));
          else { if (!transforms.has(b.svg_id)) transforms.set(b.svg_id, { pivot: b.pivot, translate_x: 0, translate_y: 0, rotate: 0, scale_x: 1, scale_y: 1 }); transforms.get(b.svg_id)[b.property] = v; }
        }
      }
      for (const [id, t] of transforms) { const [x, y] = t.pivot; this.node(id).setAttribute('transform', `translate(${t.translate_x} ${t.translate_y}) translate(${x} ${y}) rotate(${t.rotate}) scale(${t.scale_x} ${t.scale_y}) translate(${-x} ${-y})`); }
      for (const id of this.order) {
        const a = this.rig.attachments[id], n = this.node(a.svg_id), anchor = this.rig.anchors[a.anchor], source = this.node(anchor.svg_id);
        let point = anchor.point;
        if (anchor.type === 'path_vertex') { const p = pathData(source.getAttribute('d')); point = p.values.slice(p.ends[anchor.command_index] - 2, p.ends[anchor.command_index]); }
        const matrix = () => {
          const parent = n.parentElement.getCTM(), src = source.getCTM(); check(parent && src, `无法求取锚点坐标：${id}`);
          const m = parent.inverse().multiply(src), pt = new DOMPoint(point[0] + a.offset[0], point[1] + a.offset[1]).matrixTransform(m);
          const result = a.follow === 'position' ? [1, 0, 0, 1, pt.x, pt.y] : [m.a, m.b, m.c, m.d, pt.x, pt.y];
          check(result.every(Number.isFinite), `锚点坐标不可逆：${id}`); return result;
        };
        let transform;
        if (a.sample === 'cycle_start') {
          const clocks = Object.values(state.animations).filter(v => v.id === a.clock); check(clocks.length <= 1, `出生锚点不能共享多个时钟实例：${id}`);
          if (clocks.length) {
            const clock = clocks[0], cycle = Math.floor(clock.time / this.rig.animations[clock.id].duration_s);
            const captures = clock.captures[id] ||= {};
            transform = captures[cycle] ||= matrix();
            const previous = Object.keys(captures).map(Number).sort((a, b) => a - b); while (previous.length > 256) delete captures[previous.shift()];
          } else transform = matrix();
        } else transform = matrix();
        n.setAttribute('transform', `matrix(${transform.join(' ')})`);
      }
    }
    clearManual() { const s = copy(this.state); s.manual = {}; const result = this.compose(s); this.safeRender(result, s); this.state = s; this.values = result.values; }
    needsTick() { return Object.keys(this.state.animations).length || Object.values(this.state.manual).some(m => m.age < m.duration) || Object.values(this.state.expressions).some(e => e.releasing || e.age < this.rig.expressions[e.id].fade_in_s); }
    snapshot() {
      return { character_id: this.rig.character_id, parameters: copy(this.values), manual: Object.keys(this.state.manual),
        expressions: entries(this.state.expressions).map(([instance_id, e]) => ({ instance_id, expression: e.id, weight: e.weight, releasing: e.releasing })),
        animations: entries(this.state.animations).map(([instance_id, a]) => ({ instance_id, animation: a.id, time_s: a.time % this.rig.animations[a.id].duration_s, duration_s: this.rig.animations[a.id].duration_s, speed: a.speed, weight: this.animationWeight(a, this.state), target_weight: a.weight, paused: a.paused, stopping: a.finishAt !== null || a.stopAge !== null })) };
    }
    catalog() { return { character_id: this.rig.character_id, schema_version: this.rig.schema_version, parameters: Object.fromEntries(entries(this.rig.parameters).filter(([, p]) => p.access === 'public')), expressions: this.rig.expressions, animations: this.rig.animations, constraints: this.rig.constraints }; }
  }
  host.AstraExpression = { Runtime, schemaCheck, pathData, curve };
})(globalThis);

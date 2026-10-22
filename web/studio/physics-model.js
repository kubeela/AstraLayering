// Constraint equations follow XPBD (Macklin et al., 2016), not Cubism SDK code.
// Motion state is separate from the authored binding and its final hard limits.
export const physicsVersion = 'astra-cloth-1';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export function bindingDefaults(kind = 'cloth') {
  return { enabled: false, kind, direction: 'down', fixed: kind === 'ribbon' ? 0.16 : 0.28,
    transition: 0.18, maxAngle: 18, maxTravel: 0.12, stretch: 0.025,
    stiffness: kind === 'ribbon' ? 5 : 9, damping: 3.5 };
}
export function validateBinding(value) {
  const d = bindingDefaults(value?.kind);
  if (!value || !['cloth', 'ribbon'].includes(value.kind) || !['down', 'up', 'left', 'right'].includes(value.direction) || typeof value.enabled !== 'boolean') throw Error('物理绑定类型无效');
  const ranges = { fixed: [0, .85], transition: [.05, .4], maxAngle: [1, 45], maxTravel: [.01, .3], stretch: [.005, .08], stiffness: [1, 25], damping: [.5, 12] };
  for (const [key, [lo, hi]] of Object.entries(ranges)) {
    const n = value[key];
    if (!Number.isFinite(n) || n < lo || n > hi) throw Error(`物理参数超出范围：${key}`);
    d[key] = n;
  }
  return { ...d, enabled: value.enabled, direction: value.direction };
}
function divisions(n, boundaries) {
  return [...new Set([...Array.from({ length: n + 1 }, (_, i) => i / n), ...boundaries])].sort((a, b) => a - b);
}
export class ClothBody {
  constructor(bounds, binding) {
    this.bounds = { ...bounds }; this.binding = validateBinding(binding);
    const p = this.binding, vertical = ['down', 'up'].includes(p.direction), reversed = ['up', 'left'].includes(p.direction);
    const boundaries = [p.fixed, Math.min(1, p.fixed + p.transition)].map(t => reversed ? 1 - t : t);
    const xs = divisions(vertical ? (p.kind === 'ribbon' ? 3 : 10) : 18, vertical ? [] : boundaries);
    const ys = divisions(vertical ? 18 : (p.kind === 'ribbon' ? 3 : 10), vertical ? boundaries : []);
    this.cols = xs.length; this.rows = ys.length;
    const n = xs.length * ys.length;
    this.rest = new Float64Array(n * 2); this.positions = new Float64Array(n * 2);
    this.velocity = new Float64Array(n * 2); this.previous = new Float64Array(n * 2);
    this.weights = new Float64Array(n); this.limits = new Float64Array(n);
    this.freeLength = (vertical ? bounds.height : bounds.width) * (1 - p.fixed);
    this.maxDistance = this.freeLength * p.maxTravel;
    for (let y = 0; y < ys.length; y++) for (let x = 0; x < xs.length; x++) {
      const i = y * xs.length + x, s = vertical ? ys[y] : xs[x], t = reversed ? 1 - s : s;
      this.rest[i * 2] = bounds.x + xs[x] * bounds.width;
      this.rest[i * 2 + 1] = bounds.y + ys[y] * bounds.height;
      const mobility = t <= p.fixed + 1e-9 ? 0 : smooth((t - p.fixed) / p.transition);
      this.weights[i] = mobility;
      // Both the transition and the root-to-tip distribution are constrained.
      this.limits[i] = this.maxDistance * mobility * Math.pow(clamp((t - p.fixed) / (1 - p.fixed), 0, 1), .8);
    }
    this.positions.set(this.rest); this.previous.set(this.rest);
    this.edges = []; this.triangles = [];
    const edge = (a, b, bend = false) => {
      const dx = this.rest[b * 2] - this.rest[a * 2], dy = this.rest[b * 2 + 1] - this.rest[a * 2 + 1];
      this.edges.push({ a, b, length: Math.hypot(dx, dy), dx, dy, bend, diagonal: Math.abs(dx)>1e-6&&Math.abs(dy)>1e-6, lambda: 0,
        along: vertical ? Math.abs(dx) < 1e-6 : Math.abs(dy) < 1e-6 });
    };
    for (let y = 0; y < ys.length; y++) for (let x = 0; x < xs.length; x++) {
      const a = y * xs.length + x;
      if (x + 1 < xs.length) edge(a, a + 1);
      if (y + 1 < ys.length) edge(a, a + xs.length);
      if (x + 1 < xs.length && y + 1 < ys.length) {
        const b = a + 1, c = a + xs.length, d = c + 1;
        edge(a, d); edge(b, c); this.triangles.push(a, b, c, b, d, c);
      }
      if (vertical && y + 2 < ys.length) edge(a, a + xs.length * 2, true);
      if (!vertical && x + 2 < xs.length) edge(a, a + 2, true);
    }
    this.indices = new Uint32Array(this.triangles);
    this.stats = { travel: 0, angle: 0, stretch: 0, limited: false }; this.impulses = 0;
  }
  reset() { this.positions.set(this.rest); this.previous.set(this.rest); this.velocity.fill(0); this.stats = { travel: 0, angle: 0, stretch: 0, limited: false }; }
  impulse(x, y, vx, vy, radius) {
    if (![x, y, vx, vy, radius].every(Number.isFinite) || radius <= 0) return;
    const speed = Math.hypot(vx, vy), cap = this.freeLength * 2;
    const scale = speed ? cap * Math.tanh(speed / cap) / speed : 0;
    let applied = false;
    for (let i = 0; i < this.weights.length; i++) {
      const d = Math.hypot(this.positions[i * 2] - x, this.positions[i * 2 + 1] - y);
      if (d >= radius || !this.weights[i]) continue;
      const w = smooth(1 - d / radius) * this.weights[i];
      this.velocity[i * 2] += vx * scale * w; this.velocity[i * 2 + 1] += vy * scale * w; applied = true;
    }
    if (applied) this.impulses++;
  }
  inspect(scale = 1) {
    const p = this.positions, r = this.rest, config = this.binding;
    const at = (i, axis) => r[i * 2 + axis] + (p[i * 2 + axis] - r[i * 2 + axis]) * scale;
    let valid = true, travel = 0, angle = 0, stretch = 0, shear = 0;
    for (let i = 0; i < this.weights.length; i++) {
      const d = Math.hypot(at(i, 0) - r[i * 2], at(i, 1) - r[i * 2 + 1]);
      travel = Math.max(travel, d);
      if (!Number.isFinite(d) || d > this.limits[i] + 1e-6) valid = false;
    }
    for (const e of this.edges) {
      const dx = at(e.b, 0) - at(e.a, 0), dy = at(e.b, 1) - at(e.a, 1), ratio = Math.hypot(dx, dy) / e.length;
      const a = Math.abs(Math.atan2(e.dx * dy - e.dy * dx, e.dx * dx + e.dy * dy)) * 180 / Math.PI;
      if(!e.diagonal)stretch = Math.max(stretch, ratio - 1); if (e.along) angle = Math.max(angle, a);
      // Diagonal distances constrain shear, not material stretch. Treating
      // them as equally rigid turns a wide cloth mesh into a rigid plate.
      if (ratio > 1 + (e.diagonal ? .18 : config.stretch) + 1e-7 || ratio < (e.diagonal ? .7 : .85) || e.along && a > config.maxAngle + 1e-6) valid = false;
    }
    for (let i = 0; i < this.triangles.length; i += 3) {
      const a=this.triangles[i], b=this.triangles[i+1], c=this.triangles[i+2];
      const area = (at(b, 0) - at(a, 0)) * (at(c, 1) - at(a, 1)) - (at(b, 1) - at(a, 1)) * (at(c, 0) - at(a, 0));
      const restArea = (r[b * 2] - r[a * 2]) * (r[c * 2 + 1] - r[a * 2 + 1]) - (r[b * 2 + 1] - r[a * 2 + 1]) * (r[c * 2] - r[a * 2]);
      if (!Number.isFinite(area) || area < restArea * .45) valid = false;
      if(i%6===0){
        const bx=at(b,0)-at(a,0),by=at(b,1)-at(a,1),cx=at(c,0)-at(a,0),cy=at(c,1)-at(a,1);
        const lengths=Math.hypot(bx,by)*Math.hypot(cx,cy);
        const skew=Math.abs(90-Math.acos(clamp((bx*cx+by*cy)/Math.max(1e-12,lengths),-1,1))*180/Math.PI);
        shear=Math.max(shear,skew);if(skew>18+1e-6)valid=false;
      }
    }
    return { valid, travel, angle, stretch, shear };
  }
  step(dt = 1 / 120) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 1 / 30) throw Error('物理步长无效');
    const p = this.positions, v = this.velocity, r = this.rest, w = this.weights, cfg = this.binding;
    this.previous.set(p);
    const omega = cfg.stiffness * 2, drag = Math.exp(-cfg.damping * dt);
    for (let i = 0; i < w.length; i++) for (let a = 0; a < 2; a++) {
      const q = i * 2 + a;
      if (!w[i]) { p[q] = r[q]; v[q] = 0; continue; }
      v[q] = (v[q] - omega * omega * (p[q] - r[q]) * dt) * drag; p[q] += v[q] * dt;
    }
    for (const e of this.edges) e.lambda = 0;
    for (let iteration = 0; iteration < 6; iteration++) {
      for (const e of this.edges) {
        const a = e.a * 2, b = e.b * 2, dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], length = Math.hypot(dx, dy);
        const mass = w[e.a] + w[e.b]; if (!mass || length < 1e-8) continue;
        const compliance = (e.diagonal ? .002 : e.bend ? .0004 : .00000002) / (dt * dt);
        const dl = (-(length - e.length) - compliance * e.lambda) / (mass + compliance);
        e.lambda += dl;
        const sx = dl * dx / length, sy = dl * dy / length;
        p[a] -= w[e.a] * sx; p[a + 1] -= w[e.a] * sy; p[b] += w[e.b] * sx; p[b + 1] += w[e.b] * sy;
      }
    }
    // A guard on the *final* mesh covers all force sources and combined inputs.
    // Backtracking towards the valid neutral pose preserves fixed vertices and
    // prevents folds even if the iterative XPBD solve has not converged.
    let result = this.inspect(), limited = !result.valid;
    if (limited) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (this.inspect(mid).valid) lo = mid; else hi = mid; }
      for (let q = 0; q < p.length; q++) p[q] = r[q] + (p[q] - r[q]) * lo;
      result = this.inspect();
    }
    for (let q = 0; q < p.length; q++) v[q] = (p[q] - this.previous[q]) / dt;
    // Remove spurious longitudinal velocity left by a finite positional solve.
    // This is constraint damping; lateral bending and its delayed rebound stay.
    for(let iteration=0;iteration<3;iteration++)for(const e of this.edges){
      if(e.diagonal||e.bend)continue;
      const a=e.a*2,b=e.b*2,dx=p[b]-p[a],dy=p[b+1]-p[a+1],d2=dx*dx+dy*dy,mass=w[e.a]+w[e.b];
      if(!mass||d2<1e-10)continue;
      const relative=((v[b]-v[a])*dx+(v[b+1]-v[a+1])*dy)/d2/mass;
      v[a]+=w[e.a]*relative*dx;v[a+1]+=w[e.a]*relative*dy;v[b]-=w[e.b]*relative*dx;v[b+1]-=w[e.b]*relative*dy;
    }
    for(let q=0;q<v.length;q++)v[q]*=drag;
    // Remove only outward boundary velocity; tangential motion and rebound remain.
    for (let i = 0; i < w.length; i++) {
      const q = i * 2, dx = p[q] - r[q], dy = p[q + 1] - r[q + 1], d = Math.hypot(dx, dy);
      if (d && d >= this.limits[i] * .98) {
        const outward = Math.max(0, (v[q] * dx + v[q + 1] * dy) / (d * d)); v[q] -= outward * dx; v[q + 1] -= outward * dy;
      }
    }
    this.stats = { ...result, limited };
  }
  moving() {
    for (let q = 0; q < this.positions.length; q++) if (Math.abs(this.positions[q] - this.rest[q]) > .015 || Math.abs(this.velocity[q]) > .03) return true;
    return false;
  }
  hit(x, y, layers) {
    const p = this.positions, r = this.rest;
    for (let i = 0; i < this.triangles.length; i += 3) {
      const a=this.triangles[i], b=this.triangles[i+1], c=this.triangles[i+2], ax = p[a * 2], ay = p[a * 2 + 1];
      const bx = p[b * 2] - ax, by = p[b * 2 + 1] - ay, cx = p[c * 2] - ax, cy = p[c * 2 + 1] - ay, det = bx * cy - by * cx;
      if (Math.abs(det) < 1e-8) continue;
      const u = ((x - ax) * cy - (y - ay) * cx) / det, v = (bx * (y - ay) - by * (x - ax)) / det;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const rx = r[a * 2] + u * (r[b * 2] - r[a * 2]) + v * (r[c * 2] - r[a * 2]);
      const ry = r[a * 2 + 1] + u * (r[b * 2 + 1] - r[a * 2 + 1]) + v * (r[c * 2 + 1] - r[a * 2 + 1]);
      for (const l of layers) { const b = l.bounds, ix = Math.floor(rx - b.x), iy = Math.floor(ry - b.y); if (ix >= 0 && iy >= 0 && ix < b.width && iy < b.height && l.maskedRgba[(iy * b.width + ix) * 4 + 3] > 32) return true; }
    }
    return false;
  }
}

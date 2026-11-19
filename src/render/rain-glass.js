// FAR-RAIN: beads of water on glass, as a small simulation the view draws from. View only, runnable without graphics.
//
// Two kinds of glass. The windscreen, seen from the driver's seat, measures in millimetres on the glass: beads land,
// join when they touch, run when they grow heavy (or creep up the glass when the car is fast), leave small beads behind
// them, and are swept off by the wiper. The chase camera's lens measures in screen heights: a few large, soft drops that
// sit until they dry. Its random numbers come from its own seeded generator (src/rng.js), never the race's.
import {makeRng} from '../rng.js';
import {RAIN_LOOK} from './rain-look.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };
const BEAD = 0, TRAIL = 1;

export function createRainGlass({kind = 'windscreen', capacity, seed = 0x52414e, look} = {}) {
  const lens = kind === 'lens';
  look ??= lens ? RAIN_LOOK.lens : RAIN_LOOK.glass;
  capacity = Math.max(1, Math.floor(capacity ?? (lens ? look.beads : look.beadsHigh)));
  const rng = makeRng(seed);
  const x = new Float32Array(capacity), y = new Float32Array(capacity), r = new Float32Array(capacity);
  const pin = new Float32Array(capacity), age = new Float32Array(capacity), life = new Float32Array(capacity);
  const travel = new Float32Array(capacity), vy = new Float32Array(capacity), sort = new Uint8Array(capacity);
  let count = 0, waiting = 0, hits = 0;
  const window = {width: 1, height: 1};

  function remove(index) {
    count--;
    if (index === count) return;
    x[index] = x[count]; y[index] = y[count]; r[index] = r[count]; pin[index] = pin[count]; age[index] = age[count];
    life[index] = life[count]; travel[index] = travel[count]; vy[index] = vy[count]; sort[index] = sort[count];
  }
  function absorb(into, from) {
    const a = r[into] ** 3, b = r[from] ** 3, sum = a + b;
    x[into] = (x[into] * a + x[from] * b) / sum; y[into] = (y[into] * a + y[from] * b) / sum;
    r[into] = Math.cbrt(sum);
    if (sort[from] === BEAD) sort[into] = BEAD;
  }
  function place(px, py, radius, type = BEAD) {
    // A new drop that touches a bead joins it.
    for (let i = 0; i < count; i++) {
      const reach = r[i] + radius;
      if ((x[i] - px) ** 2 + (y[i] - py) ** 2 < reach * reach) {
        const a = r[i] ** 3, b = radius ** 3, sum = a + b;
        x[i] = (x[i] * a + px * b) / sum; y[i] = (y[i] * a + py * b) / sum; r[i] = Math.cbrt(sum);
        if (type === BEAD) sort[i] = BEAD;
        return i;
      }
    }
    let index = count;
    if (count === capacity) {
      // Full: the oldest small bead makes room; failing that, the drop joins the nearest bead.
      index = -1;
      let oldest = -1;
      for (let i = 0; i < count; i++) if (sort[i] === TRAIL && (index < 0 || age[i] > oldest)) { index = i; oldest = age[i]; }
      if (index < 0) {
        let best = Infinity;
        for (let i = 0; i < count; i++) { const d = (x[i] - px) ** 2 + (y[i] - py) ** 2; if (d < best) { best = d; index = i; } }
        r[index] = Math.cbrt(r[index] ** 3 + radius ** 3);
        return index;
      }
    } else count++;
    x[index] = px; y[index] = py; r[index] = radius; age[index] = 0; travel[index] = 0; vy[index] = 0; sort[index] = type;
    pin[index] = lens ? 0 : look.runRadiusMm * (.85 + rng.float() * .4);
    life[index] = lens ? look.lifeSeconds[0] + rng.float() * (look.lifeSeconds[1] - look.lifeSeconds[0]) : 0;
    return index;
  }
  function spawn() {
    hits++;
    const [low, high] = lens ? look.radius : look.dropRadiusMm;
    // Small beads are many, big ones few.
    const radius = low + (high - low) * Math.pow(rng.float(), 2.2);
    place((rng.float() - .5) * window.width, (rng.float() - .5) * window.height, radius);
  }

  function moveBeads(dt, speedKmh) {
    const slide = look.slideMmPerSecond, air = Math.pow(Math.max(0, speedKmh) / look.airLiftKmh, 2);
    for (let i = 0; i < count; i++) {
      age[i] += dt;
      if (sort[i] !== BEAD) { vy[i] = 0; continue; }
      const weight = (r[i] - pin[i]) / pin[i];
      const down = weight > 0 ? slide * Math.min(2.5, weight * 1.6 + .25) : 0;
      // Past the lift speed the air drives all but the smallest beads up the glass, the bigger the faster.
      const up = air > 1 && r[i] > look.dropRadiusMm[0] * 1.4 ? slide * Math.min(3, (air - 1) * 1.2) * clamp(r[i] / look.runRadiusMm, .4, 2) : 0;
      vy[i] = up - down;
      if (vy[i] === 0) continue;
      const dy = vy[i] * dt;
      y[i] += dy;
      x[i] += (rng.float() - .5) * look.wobbleMm * Math.min(1, Math.abs(dy) / 2) * 2;
      travel[i] += Math.abs(dy);
      if (travel[i] >= look.trailEveryMm && count < capacity) {
        travel[i] = 0;
        const [low, high] = look.trailRadiusMm, small = low + (high - low) * rng.float();
        if (r[i] ** 3 > small ** 3 * 2) {
          r[i] = Math.cbrt(r[i] ** 3 - small ** 3);
          const behind = count++;
          x[behind] = x[i]; y[behind] = y[i] - Math.sign(dy) * (r[i] + small); r[behind] = small; age[behind] = 0;
          travel[behind] = 0; vy[behind] = 0; sort[behind] = TRAIL; pin[behind] = look.runRadiusMm; life[behind] = 0;
        }
      }
      // A running bead takes up the beads in its way.
      for (let j = 0; j < count; j++) {
        if (j === i) continue;
        const reach = r[i] + r[j];
        if ((x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2 < reach * reach) {
          absorb(i, j); remove(j);
          if (j < i) i--;
          j--;
        }
      }
    }
    const margin = look.dropRadiusMm[1] * 4, halfW = window.width / 2 + margin, halfH = window.height / 2 + margin;
    for (let i = count - 1; i >= 0; i--) if (Math.abs(x[i]) > halfW || Math.abs(y[i]) > halfH) remove(i);
  }

  function ageLens(dt) {
    for (let i = count - 1; i >= 0; i--) { age[i] += dt; if (age[i] >= life[i]) remove(i); }
  }

  return {
    kind,
    capacity,
    get count() { return count; },
    get hits() { return hits; },
    // `rate`: drops landing per second; `width`, `height`: the glass in view, in its own units.
    step(dt, {rate = 0, width = window.width, height = window.height, speedKmh = 0} = {}) {
      if (!(dt > 0)) return;
      window.width = width; window.height = height;
      waiting += Math.max(0, rate) * dt * (.5 + rng.float());
      while (waiting >= 1) { waiting -= 1; spawn(); }
      if (lens) ageLens(dt); else moveBeads(dt, speedKmh);
    },
    // A drop placed by hand. `sits`: it holds where it lands until something takes it (the first drop of the shower).
    drop(px, py, radius, {sits = false} = {}) {
      hits++;
      const index = place(px, py, radius);
      if (sits && !lens) pin[index] = Math.max(pin[index], r[index] * 1.4);
      return index;
    },
    // Remove every bead the wiper passed over, between two angles about its pivot.
    sweep(pivotX, pivotY, length, from, to, halfWidth = 0) {
      const low = Math.min(from, to) - halfWidth, high = Math.max(from, to) + halfWidth;
      let swept = 0;
      for (let i = count - 1; i >= 0; i--) {
        const dx = x[i] - pivotX, dy = y[i] - pivotY, distance = Math.hypot(dx, dy), angle = Math.atan2(dy, dx);
        if (distance > length + r[i] || distance < length * .08) continue;
        if (angle >= low && angle <= high) { remove(i); swept++; }
      }
      return swept;
    },
    clear() { count = 0; waiting = 0; },
    // Writes each bead for drawing: position, radius and how strongly it shows, then how far it is drawn out by its run.
    write(beads, shapes, toScreen = 1) {
      for (let i = 0; i < count; i++) {
        const fade = lens ? smooth((life[i] - age[i]) / 1.5) * smooth(age[i] / .12) : smooth(age[i] / .05);
        beads[i * 4] = x[i] * toScreen; beads[i * 4 + 1] = y[i] * toScreen; beads[i * 4 + 2] = r[i] * toScreen;
        beads[i * 4 + 3] = fade * (sort[i] === TRAIL ? .8 : 1);
        shapes[i * 2] = 1 + Math.min(1.1, Math.abs(vy[i]) / Math.max(1, look.slideMmPerSecond ?? 1) * .45);
        shapes[i * 2 + 1] = vy[i] === 0 ? look.sag ?? 0 : 0;
      }
      return count;
    },
    snapshot() {
      return Array.from({length: count}, (_, i) => ({x: x[i], y: y[i], r: r[i], trail: sort[i] === TRAIL, moving: vy[i] !== 0}));
    },
  };
}

// The wiper: off until the driver sees enough beads, then once in a while, then without stopping in heavy rain.
export function createRainWiper(look = RAIN_LOOK.glass.wiper) {
  let on = false, phase = 'parked', t = 0, wait = 0, angle = look.restAngle;
  const swept = {from: angle, to: angle, moving: false};
  const stroke = share => look.restAngle + (look.endAngle - look.restAngle) * (.5 - .5 * Math.cos(Math.PI * clamp(share)));
  return {
    get angle() { return angle; },
    get on() { return on; },
    step(dt, {beads = 0, drops = 0} = {}) {
      swept.from = angle; swept.moving = false;
      if (!(dt > 0)) { swept.to = angle; return swept; }
      if (!on && beads >= look.afterBeads) { on = true; wait = 0; }
      if (!on && drops <= 0) { swept.to = angle; return swept; }
      if (drops <= 0 && phase === 'parked') on = false;
      const period = look.intermittentSeconds + (look.continuousSeconds - look.intermittentSeconds) *
        smooth((drops - look.continuousFrom + .25) / .35);
      t += dt;
      if (phase === 'parked') {
        wait -= dt;
        if (on && wait <= 0) { phase = 'out'; t = 0; }
      }
      if (phase === 'out') {
        angle = stroke(t / look.strokeSeconds);
        if (t >= look.strokeSeconds) { phase = 'back'; t -= look.strokeSeconds; }
      }
      if (phase === 'back') {
        angle = stroke(1 - t / look.strokeSeconds);
        if (t >= look.strokeSeconds) { phase = 'parked'; angle = look.restAngle; wait = Math.max(0, period - 2 * look.strokeSeconds); }
      }
      swept.to = angle; swept.moving = swept.to !== swept.from;
      return swept;
    },
  };
}

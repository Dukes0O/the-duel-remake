// The rules for the Kelp Coast's sea life, with no graphics (docs/THE_DEEP.md
// sections 5 and 8, card DEEP-LIFE). The drawing in sea-life.js reads these;
// the tests check them in Node.
//
// Sea life is scenery. Every function here takes the car's position as a
// number it reads and never writes, owns its own generator (src/rng.js,
// seeded from the zone and the creature), and keeps its own state. Nothing
// here touches race state, saves or the race's random streams.
import { makeRng } from '../rng.js';
import { FISH_HARD_CAP } from './fish-rules.js';
import { zoneSeed } from './zone-floor.js';

// Hard cap of animals drawn per type for a whole scene. Sardines are counted in
// fish (the cap is fish-rules.js's), the rest in animals.
export const SEA_LIFE_CAPS = Object.freeze({
  'silver-school': FISH_HARD_CAP, turtle: 6, ray: 4, 'sea-lion': 4, otter: 2, crab: 12, whale: 1,
});

export const SURFACE_Y = 0;          // the sea surface in the scene's own frame
export const SURFACE_MARGIN = 1.2;   // animals stay this far below it (the otter floats in it)
export const FLOOR_MARGIN = 0.12;    // a crab's belly or a resting ray above the ground

export const REACH = Object.freeze({
  turtle: Object.freeze({ near: 5, far: 16, push: 6 }),
  ray: Object.freeze({ near: 4, far: 11, push: 7, lift: 2.4 }),
  crab: Object.freeze({ near: 2.5, far: 7, push: 3.5 }),
  otter: Object.freeze({ near: 5, far: 14, push: 4 }),
  seaLion: Object.freeze({ keep: 3.5, pullNear: 30, pullFar: 70, pull: 0.5 }),
});

export const WHALE = Object.freeze({
  speed: 3, halfPath: 110, seaward: 22, seconds: 2 * 110 / 3,
  triggerRange: 70, above: 6, shallowest: -5.5, deepest: -16,
});

const TAU = Math.PI * 2;
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
// 0 at a, 1 at b, smooth between; works whether a is below or above b.
export function smooth(a, b, x) {
  if (a === b) return x < a ? 0 : 1;
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

// How far an animal is from the car: height counts for more than width (the
// car is low), as for the fish.
export function carDistance(x, y, z, car) {
  return Math.hypot(x - car.x, (y - car.y) * 1.5, z - car.z);
}

// Move a smoothed offset toward its target: an exponential ease with a top
// speed, so a startled animal glides away and never jumps. Writes `state`.
export function easeToward(state, target, dt, { tau = 0.6, maxSpeed = 4 } = {}) {
  const k = 1 - Math.exp(-Math.max(0, dt) / tau);
  let dx = (target.x - state.x) * k, dy = (target.y - state.y) * k, dz = (target.z - state.z) * k;
  const step = Math.hypot(dx, dy, dz), limit = maxSpeed * Math.max(0, dt);
  if (step > limit && step > 0) { const s = limit / step; dx *= s; dy *= s; dz *= s; }
  state.x += dx; state.y += dy; state.z += dz;
  return state;
}
// Turn an angle toward a target at most `rate` radians a second.
export function turnToward(angle, target, rate, dt) {
  const delta = wrapAngle(target - angle), limit = rate * Math.max(0, dt);
  return wrapAngle(angle + clamp(delta, -limit, limit));
}

// A stable small number from text, so each creature has its own generator.
function hashText(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// ---- where each animal lives ----------------------------------------------------------

// The animals of a zone, from its `spots` (creature, trailIndex, count) and
// nothing else: the same zone always gives the same plan. Returns
// { turtle: [...], ray: [...], crab: [...], 'sea-lion': [...], otter: [...], 'silver-school': [...], whale: {...} | null,
//   total: {id: count} }. Counts are capped per type.
export function planSeaLife(zone, { fishBudget = FISH_HARD_CAP } = {}) {
  const seed = zoneSeed(zone.id), plan = { turtle: [], ray: [], crab: [], 'sea-lion': [], otter: [], 'silver-school': [], whale: null };
  const trail = zone.trail ?? [];
  const spread = (rng, spot, near, far) => {
    const a = rng.float() * TAU, d = rng.range(near, far);
    return { x: spot.x + Math.cos(a) * d, z: spot.z + Math.sin(a) * d };
  };
  (zone.spots ?? []).forEach((row, spotIndex) => {
    const spot = trail[row.trailIndex];
    if (!spot) return;
    if (!Object.hasOwn(SEA_LIFE_CAPS, row.creature)) return;      // another coast's creature
    const rng = makeRng((seed ^ hashText(row.creature) ^ Math.imul(spotIndex + 1, 0x9E3779B1)) >>> 0);
    if (row.creature === 'whale') {
      plan.whale ??= { x: spot.x, z: spot.z, depth: spot.depth, trailIndex: row.trailIndex };
      return;
    }
    const list = plan[row.creature];
    for (let i = 0; i < row.count; i++) {
      const phase = rng.float() * TAU;
      if (row.creature === 'turtle') {
        const centre = spread(rng, spot, 3, 9);
        list.push({ kind: 'turtle', ...centre, radius: rng.range(10, 16), dir: rng.chance(0.5) ? 1 : -1, speed: rng.range(0.7, 1.0), phase, breath: rng.range(0, 80), size: rng.range(0.9, 1.15) });
      } else if (row.creature === 'ray') {
        const home = spread(rng, spot, 3, 8);
        list.push({ kind: 'ray', ...home, yaw: rng.float() * TAU, phase, size: rng.range(0.95, 1.2) });
      } else if (row.creature === 'crab') {
        const home = spread(rng, spot, 0.5, 6);
        list.push({ kind: 'crab', ...home, yaw: rng.float() * TAU, phase, size: rng.range(0.85, 1.25) });
      } else if (row.creature === 'otter') {
        const home = spread(rng, spot, 1.5, 4);
        list.push({ kind: 'otter', ...home, radius: rng.range(2.5, 5), dir: rng.chance(0.5) ? 1 : -1, speed: rng.range(0.12, 0.2), phase, size: rng.range(0.95, 1.1) });
      } else if (row.creature === 'sea-lion') {
        list.push({ kind: 'sea-lion', x: spot.x, z: spot.z, depth: spot.depth, radius: rng.range(18, 26), speed: rng.range(4.5, 6), phase, dir: i % 2 ? -1 : 1, size: rng.range(0.95, 1.1) });
      } else {
        // A school: its home is a little way off the others, so they do not overlap.
        const home = spread(rng, spot, 4, 16);
        list.push({ kind: 'silver-school', ...home, depth: spot.depth, phase, seed: (seed ^ Math.imul(spotIndex + 1, 7919) ^ i) >>> 0 });
      }
    }
  });
  for (const [id, cap] of Object.entries(SEA_LIFE_CAPS)) {
    if (id === 'whale' || id === 'silver-school') continue;
    plan[id].length = Math.min(plan[id].length, cap);
  }
  // Sardines: the fish budget (the quality's count) is shared out between the schools.
  const schools = plan['silver-school'];
  const budget = Math.min(Math.max(0, Math.floor(fishBudget)), SEA_LIFE_CAPS['silver-school']);
  const each = schools.length ? Math.floor(budget / schools.length) : 0;
  schools.forEach(school => { school.count = each; });
  plan.total = { 'silver-school': each * schools.length, turtle: plan.turtle.length, ray: plan.ray.length, crab: plan.crab.length,
    'sea-lion': plan['sea-lion'].length, otter: plan.otter.length, whale: plan.whale ? 1 : 0 };
  return plan;
}

// ---- each animal's motion ---------------------------------------------------------------

// Every animal keeps a small state { x, y, z, yaw, pitch, roll, flap, anim, off:{x,y,z}, ... } that
// stepAnimal advances. `ctx` is { floorAt(x, z) } and `car` is { x, y, z } (read only).
// Pure: the same state, time and car always give the same answer.

export function makeAnimal(spec) {
  return { spec, x: spec.x ?? 0, y: 0, z: spec.z ?? 0, yaw: spec.yaw ?? 0, pitch: 0, roll: 0, flap: 0, anim: 0, speed: 0,
    off: { x: 0, y: 0, z: 0 }, ready: false, centre: { x: spec.x ?? 0, y: 0, z: spec.z ?? 0 } };
}

const awayFrom = (x, z, car) => {
  const dx = x - car.x, dz = z - car.z, d = Math.hypot(dx, dz);
  return d > 1e-6 ? { x: dx / d, z: dz / d } : { x: 1, z: 0 };
};

function setPoseFromMotion(a, nx, ny, nz, dt, turnRate) {
  if (a.ready && dt > 0) {
    const vx = (nx - a.x) / dt, vy = (ny - a.y) / dt, vz = (nz - a.z) / dt, horizontal = Math.hypot(vx, vz);
    a.speed = Math.hypot(vx, vy, vz);
    if (horizontal > 0.05) {
      a.yaw = turnToward(a.yaw, Math.atan2(vx, vz), turnRate, dt);
      a.pitch += (clamp(Math.atan2(vy, horizontal), -0.5, 0.5) - a.pitch) * (1 - Math.exp(-dt / 0.5));
    }
  }
  a.x = nx; a.y = ny; a.z = nz; a.ready = true;
}

function stepTurtle(a, t, dt, car, ctx) {
  const s = a.spec, ang = s.phase + s.dir * (s.speed / s.radius) * t;
  const px = s.x + Math.cos(ang) * s.radius, pz = s.z + Math.sin(ang) * s.radius;
  const floor = ctx.floorAt(px, pz);
  let py = floor + 2.4 + 0.8 * Math.sin(0.3 * t + s.phase);
  // Every 80 s it rises to breathe over about 11 s, stays up a moment, and goes back down.
  const u = (((t + s.breath) % 80) + 80) % 80 / 80, v = clamp((u - 0.65) / 0.35, 0, 1);
  const rise = smooth(0, 0.4, v) * (1 - smooth(0.7, 1, v));
  const top = Math.max(floor + 1, SURFACE_Y - 1.9);
  py += (top - py) * rise;
  // Turn away from the car: slide off sideways, smoothly.
  const r = REACH.turtle, d = carDistance(px, py, pz, car), p = 1 - smooth(r.near, r.far, d), away = awayFrom(px, pz, car);
  easeToward(a.off, { x: away.x * p * r.push, y: 0, z: away.z * p * r.push }, dt, { tau: 0.8, maxSpeed: 2.5 });
  setPoseFromMotion(a, px + a.off.x, clamp(py, floor + 0.8, SURFACE_Y - SURFACE_MARGIN), pz + a.off.z, dt, 1.0);
  a.roll = 0.18 * Math.sin(0.5 * t + s.phase) + clamp(a.off.x * 0.02, -0.2, 0.2);
  a.anim = t * 1.0 + s.phase;               // flipper stroke clock (seconds of the clip)
}

function stepRay(a, t, dt, car, ctx) {
  const s = a.spec, r = REACH.ray, rest = ctx.floorAt(s.x, s.z) + FLOOR_MARGIN;
  const d = carDistance(s.x + a.off.x, rest + a.off.y, s.z + a.off.z, car), away = awayFrom(s.x, s.z, car);
  const lift = 1 - smooth(r.near, r.far, d), flee = 1 - smooth(r.near - 1, r.far - 2, d);
  easeToward(a.off, { x: away.x * flee * r.push, y: lift * r.lift, z: away.z * flee * r.push }, dt, { tau: 0.5, maxSpeed: 3.5 });
  const x = s.x + a.off.x, z = s.z + a.off.z;
  const y = Math.max(ctx.floorAt(x, z) + FLOOR_MARGIN, rest + a.off.y);
  const moving = Math.hypot(a.off.x, a.off.z) > 0.2;
  if (a.ready && moving && dt > 0) a.yaw = turnToward(a.yaw, Math.atan2(a.off.x, a.off.z), 1.6, dt);
  else if (!a.ready) a.yaw = s.yaw;
  a.pitch += (clamp(a.off.y / r.lift, 0, 1) * 0.22 - a.pitch) * (1 - Math.exp(-Math.max(dt, 0) / 0.5));
  // Wing beat: a slow ripple at rest (it breathes), a strong flap when it lifts.
  a.flap = 0.1 + 0.9 * clamp(Math.hypot(a.off.x, a.off.y, a.off.z) / 2.2, 0, 1);
  a.anim = t * (1.2 + 4.5 * (a.flap - 0.1)) + s.phase;
  a.x = x; a.y = y; a.z = z; a.ready = true; a.roll = 0;
}

function stepCrab(a, t, dt, car, ctx) {
  const s = a.spec, r = REACH.crab, d = carDistance(s.x + a.off.x, ctx.floorAt(s.x, s.z), s.z + a.off.z, car), away = awayFrom(s.x, s.z, car);
  const p = 1 - smooth(r.near, r.far, d);
  const before = Math.hypot(a.off.x, a.off.z);
  easeToward(a.off, { x: away.x * p * r.push, y: 0, z: away.z * p * r.push }, dt, { tau: 0.35, maxSpeed: 2.2 });
  const x = s.x + a.off.x, z = s.z + a.off.z;
  a.speed = dt > 0 ? Math.abs(Math.hypot(a.off.x, a.off.z) - before) / dt : 0;
  // A crab goes sideways: its body is square across the way it is going.
  const target = a.speed > 0.05 ? Math.atan2(a.off.x, a.off.z) + Math.PI / 2 : s.yaw;
  a.yaw = a.ready ? turnToward(a.yaw, wrapAngle(target), 3, dt) : s.yaw;
  a.anim += dt * (0.2 + clamp(a.speed, 0, 2.2) * 1.4) ;
  a.x = x; a.y = ctx.floorAt(x, z) + FLOOR_MARGIN; a.z = z; a.ready = true; a.pitch = 0; a.roll = 0;
}

// Sea lions: fast looping passes round the spot, drawn a little toward the car
// when it is near enough to see them, and never closer than `keep` metres.
function stepSeaLion(a, t, dt, car, ctx) {
  const s = a.spec, r = REACH.seaLion;
  if (!a.ready) a.centre.y = -s.depth * 0.5;
  const dCar = Math.hypot(s.x - car.x, s.z - car.z), pull = r.pull * (1 - smooth(r.pullNear, r.pullFar, dCar));
  easeToward(a.centre, { x: s.x + (car.x - s.x) * pull, y: -s.depth * 0.5, z: s.z + (car.z - s.z) * pull }, dt, { tau: 5, maxSpeed: 3 });
  const w = s.speed / s.radius, ang = s.phase + s.dir * w * t;
  let x = a.centre.x + Math.cos(ang) * s.radius, z = a.centre.z + Math.sin(2 * ang) * s.radius * 0.55;
  let y = a.centre.y + 2.6 * Math.sin(1.3 * ang + s.phase);
  const floor = ctx.floorAt(x, z);
  y = clamp(y, floor + 1.3, SURFACE_Y - 2.5);
  // Keep a clear gap round the car.
  const dx = x - car.x, dy = (y - car.y) * 1.5, dz = z - car.z, d = Math.hypot(dx, dy, dz);
  if (d < r.keep) {
    const k = d > 1e-6 ? r.keep / d : 0;
    if (k) { x = car.x + dx * k; z = car.z + dz * k; y = clamp(car.y + (dy * k) / 1.5, floor + 1.3, SURFACE_Y - 2.5); }
    else x = car.x + r.keep;
  }
  setPoseFromMotion(a, x, y, z, dt, 3.5);
  a.roll = 0.9 * Math.sin(0.7 * t + s.phase) + clamp(a.pitch * 0.5, -0.3, 0.3);
  a.anim += dt * (0.8 + 0.25 * clamp(a.speed, 0, 8));
}

// Sea otters float on their backs at the surface, turning slowly on the spot, and
// drift away from the car without ever diving.
function stepOtter(a, t, dt, car) {
  const s = a.spec, r = REACH.otter, ang = s.phase + s.dir * (s.speed / s.radius) * t;
  const px = s.x + Math.cos(ang) * s.radius, pz = s.z + Math.sin(ang) * s.radius;
  const py = SURFACE_Y - 0.02 + 0.03 * Math.sin(0.8 * t + s.phase);
  const d = carDistance(px, py, pz, car), p = 1 - smooth(r.near, r.far, d), away = awayFrom(px, pz, car);
  easeToward(a.off, { x: away.x * p * r.push, y: 0, z: away.z * p * r.push }, dt, { tau: 1.2, maxSpeed: 1.5 });
  setPoseFromMotion(a, px + a.off.x, py, pz + a.off.z, dt, 0.6);
  a.pitch = 0;
  a.roll = 0.05 * Math.sin(0.9 * t + s.phase);
  a.anim = t * 0.8 + s.phase;
}

export function stepAnimal(a, t, dt, car, ctx) {
  switch (a.spec.kind) {
    case 'turtle': stepTurtle(a, t, dt, car, ctx); break;
    case 'ray': stepRay(a, t, dt, car, ctx); break;
    case 'crab': stepCrab(a, t, dt, car, ctx); break;
    case 'sea-lion': stepSeaLion(a, t, dt, car, ctx); break;
    case 'otter': stepOtter(a, t, dt, car); break;
    default: throw new Error(`No motion rules for ${a.spec.kind}`);
  }
  return a;
}

// ---- the gray whale --------------------------------------------------------------------------

// One slow pass per visit. A pass starts when the car comes near the Drop-off
// whale's spot, or when the Sirena is raised (deepRaised for 'sirena-car'), and
// only if this visit's whale has not passed yet. It starts and ends 110 m out,
// inside the water's murk, so it swims in and away unseen. It swims a straight line past
// the anchor, `seaward` metres out on the deeper side, about 6 m above the
// ground and always under the surface, against the way the trail runs.
export function createWhale(plan) {
  return { plan, state: 'waiting', passed: false, start: 0, anchor: null, dir: { x: 0, z: 1 }, sideSign: 1, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, anim: 0, progress: 0 };
}

// shape: the zone's floor (frameAt, floorHeight). Returns true if a pass began.
export function startWhalePass(w, t, shape, anchorPoint) {
  if (w.passed || w.state === 'passing') return false;
  const at = shape.sample(anchorPoint.x, anchorPoint.z), f = shape.frameAt(at?.along ?? 0), tx = f.tx, tz = f.tz;
  // Against the way the trail runs, on whichever side has the deeper water 22 m out.
  const left = { x: tz, z: -tx };
  const a = shape.floorHeight(anchorPoint.x + left.x * WHALE.seaward, anchorPoint.z + left.z * WHALE.seaward);
  const b = shape.floorHeight(anchorPoint.x - left.x * WHALE.seaward, anchorPoint.z - left.z * WHALE.seaward);
  w.sideSign = a <= b ? 1 : -1;
  w.dir = { x: -tx, z: -tz };
  w.anchor = { x: anchorPoint.x + left.x * w.sideSign * WHALE.seaward, z: anchorPoint.z + left.z * w.sideSign * WHALE.seaward };
  w.start = t; w.state = 'passing'; w.progress = 0;
  return true;
}

export function stepWhale(w, t, shape) {
  if (w.state !== 'passing') return w;
  w.progress = (t - w.start) / WHALE.seconds;
  if (w.progress >= 1) { w.state = 'gone'; w.passed = true; return w; }
  const along = (w.progress * 2 - 1) * WHALE.halfPath;     // -110 .. +110 m about the anchor
  w.x = w.anchor.x + w.dir.x * along + -w.dir.z * Math.sin(0.4 * t) * 0.8;
  w.z = w.anchor.z + w.dir.z * along + w.dir.x * Math.sin(0.4 * t) * 0.8;
  const floor = shape.floorHeight(w.x, w.z);
  w.y = clamp(floor + WHALE.above, WHALE.deepest, WHALE.shallowest) + 0.5 * Math.sin(0.33 * t);
  w.yaw = Math.atan2(w.dir.x, w.dir.z) + 0.04 * Math.sin(0.4 * t);
  w.pitch = 0.04 * Math.cos(0.33 * t);
  w.roll = 0.05 * Math.sin(0.27 * t);
  w.anim = t * 0.7;
  return w;
}

// Where rescues happen (docs/HELI_RESCUE.md section 5): the lost hiker and
// the clearing near them, the avalanche slide and its buried beacon, the
// driver stuck below the road, the supply crates and the yard they go to,
// and the beacon receiver and the hiker's flare. Pure and repeatable: every
// pick comes from the mission seed, so the same save gives the same rescues.
// It reads courses only through their samplers and obstacles.
import {makeRng} from '../rng.js';
import {heliHash} from './heli-save.js';
import {fireGrid} from './heli-fire.js';
import {airFactor, GRAVITY, KESTREL} from './heli-flight.js';

export const SEARCH = Object.freeze({
  // The lost hiker (5.1).
  areaRadius: 300, hikerFromPoint: 250, clearingWithin: 120, clearingRadius: 6,
  spotSideways: 70, spotHeight: 120, flareSeconds: 60, hikerWalk: 1.2,
  // The avalanche (5.2). Tremblant Snow's ski hill is 36 m high and gentle\n  // (its slopes average 10 to 13 degrees), so a slide's mean slope may be 10\n  // to 40 degrees, nearest 30 preferred: Summit Run's snowfields give 30.
  slideAcross: 200, slideDown: 80, slideSlope: Object.freeze([10, 40]), slideIdeal: 30, slideClear: 30,
  beaconRange: 60, beepAt: Object.freeze([0.15, 1.6]), beepPitch: Object.freeze([900, 1400]),
  // The hoist rescue (5.3).
  hoistSlope: Object.freeze([25, 40]), hoistBelowRoad: 10, hoistFromEdge: Object.freeze([20, 120]), hoistTreeClear: 12,
  hoistSections: Object.freeze(['Mountain Climb', 'The Ridge']),
  // The supply run (5.4): the yard is a clear 10 m circle near the hut or lodge.
  yardRadius: 5, yardSearch: Object.freeze([15, 80]),
});

// The supply crates and their masses live in heli-rescue.js (SUPPLY_CRATES);
// this card tuned the fuel drums there to 820 kg for Summit Run's climb.

const rng = (seed, purpose, n = 0) => makeRng(heliHash(seed, purpose, n));
const slopeAt = (ground, x, z, d = 5) => {
  const dx = (ground.height(x + d, z) - ground.height(x - d, z)) / (2 * d);
  const dz = (ground.height(x, z + d) - ground.height(x, z - d)) / (2 * d);
  return {degrees: Math.atan(Math.hypot(dx, dz)) * 180 / Math.PI, downX: -dx, downZ: -dz};
};
const roadGap = (course, x, z) => { const near = course.nearest(x, z); return Math.abs(near.lateral) - course.roadHalfWidthAt(course.phase(near.s)); };
const landmark = (course, id) => {
  const kit = (course.def?.kitPlacements ?? []).find(item => item.id === id);
  return kit ? course.worldAt(course.phase(kit.s), kit.lateral) : null;
};

// H1's clear circle test (heli-session.js): off the road, level within
// `flatness` metres, nothing tall in it.
export function clearCircle(course, ground, x, z, radius, flatness = 1.5) {
  if (roadGap(course, x, z) < 6 + radius * 0.5) return false;
  const centre = ground.height(x, z);
  let low = centre, high = centre;
  for (let ring = 1; ring <= 2; ring++) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, r = radius * ring / 2, y = ground.height(x + Math.cos(a) * r, z + Math.sin(a) * r);
    low = Math.min(low, y); high = Math.max(high, y);
  }
  if (high - low > flatness) return false;
  return ground.near(x, z, radius + 4).every(o => o.top <= centre + 0.5 && o.shape !== 'cone');
}

// A clear circle near a point: rings outward, the first that passes.
function clearNear(course, ground, x, z, from, to, radius) {
  for (let r = from; r <= to; r += 6) for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (clearCircle(course, ground, px, pz, radius)) return {x: px, z: pz, y: ground.height(px, pz), radius};
  }
  return null;
}

// ---- the lost hiker (5.1) --------------------------------------------------
// Forest cells (the fire grid's: 3 trees or more in 20 m) with a clearing
// within 120 m.
export function hikerSpots(course, ground, site) {
  const grid = fireGrid(course, ground, site), out = [];
  for (const cell of grid.cells.values()) {
    if (out.length >= 400) break;
    const clearing = clearNear(course, ground, cell.x, cell.z, 20, SEARCH.clearingWithin, SEARCH.clearingRadius);
    if (clearing) out.push(Object.freeze({x: cell.x, z: cell.z, y: cell.y, clearing: Object.freeze(clearing)}));
  }
  return out;
}

export function pickHiker(spots, seed, n = 0) {
  if (!spots.length) return null;
  const r = rng(seed, 'hiker', n), spot = spots[r.int(0, spots.length - 1)];
  const angle = r.range(0, Math.PI * 2), off = r.range(0, SEARCH.hikerFromPoint);
  return Object.freeze({hiker: spot, lastSeen: Object.freeze({x: spot.x + Math.cos(angle) * off, z: spot.z + Math.sin(angle) * off,
    radius: SEARCH.areaRadius}), clearing: spot.clearing});
}

// The hiker hears the helicopter within 70 m sideways and no more than 120 m up.
export function hikerSpotted(heli, hiker, ground) {
  return Math.hypot(heli.x - hiker.x, heli.z - hiker.z) <= SEARCH.spotSideways &&
    heli.y - ground.height(heli.x, heli.z) <= SEARCH.spotHeight;
}

// Where the hiker is, walking to the clearing at 1.2 m/s from when spotted.
export function hikerWalk(hiker, clearing, seconds) {
  const dx = clearing.x - hiker.x, dz = clearing.z - hiker.z, d = Math.hypot(dx, dz), done = Math.min(d, Math.max(0, seconds) * SEARCH.hikerWalk);
  return {x: hiker.x + (d ? dx / d * done : 0), z: hiker.z + (d ? dz / d * done : 0), arrived: done >= d};
}

// ---- the avalanche (5.2) ---------------------------------------------------
// Slides: 200 m across the fall line and 80 m down it, on a course's ski
// hill (Tremblant Snow) or snowfields well off the road (Summit Run), with a
// mean slope of 12 to 40 degrees, at least 30 m from the lift, the lodge and
// every building. Best first: nearest a 30 degree mean.
export function slideSpots(course, ground, {max = 12} = {}) {
  const hill = course.def?.hills?.[0], lodge = landmark(course, 'ski-lodge') ?? landmark(course, 'summit-hut');
  // Buildings and lift towers (tall props), not fences and signs.
  const buildings = (course.features?.obstacles ?? []).filter(o => o.kind === 'prop' && (o.modelMaxY ?? o.y + (o.height ?? 0)) - (o.modelMinY ?? o.y) > 4);
  const centres = [];
  if (hill) {
    for (let du = -hill.along; du <= hill.along; du += 20) for (let dv = -hill.across; dv <= hill.across; dv += 12) {
      if (Math.hypot(du / hill.along, dv / hill.across) > 0.85) continue;
      const p = course.worldAt(course.phase(hill.s + du), hill.lateral + dv);
      centres.push({x: p.x, z: p.z});
    }
  } else {
    for (let s = 0; s < course.length; s += 150) for (const side of [-1, 1]) for (const off of [80, 160, 240]) {
      const p = course.worldAt(course.phase(s), side * (course.roadHalfWidthAt(course.phase(s)) + off));
      centres.push({x: p.x, z: p.z});
    }
  }
  const found = [];
  for (const c of centres) {
    const fall = slopeAt(ground, c.x, c.z, 10), len = Math.hypot(fall.downX, fall.downZ);
    // A centre far off the slope band cannot hold a slide: skip it before sampling the rest.
    if (len < 1e-6 || fall.degrees < SEARCH.slideSlope[0] - 6 || fall.degrees > SEARCH.slideSlope[1] + 6) continue;
    const dx = fall.downX / len, dz = fall.downZ / len, ax = -dz, az = dx;
    let sum = 0, n = 0, ok = true;
    for (let a = -1; a <= 1 && ok; a += .5) for (let d = -1; d <= 1 && ok; d += .5) {
      const x = c.x + ax * a * SEARCH.slideAcross / 2 + dx * d * SEARCH.slideDown / 2, z = c.z + az * a * SEARCH.slideAcross / 2 + dz * d * SEARCH.slideDown / 2;
      if (roadGap(course, x, z) < SEARCH.slideClear) ok = false;
      if (lodge && Math.hypot(x - lodge.x, z - lodge.z) < SEARCH.slideClear) ok = false;
      if (buildings.some(o => Math.hypot(o.x - x, o.z - z) < SEARCH.slideClear)) ok = false;
      sum += slopeAt(ground, x, z).degrees; n++;
    }
    const mean = sum / n;
    if (!ok || mean < SEARCH.slideSlope[0] || mean > SEARCH.slideSlope[1]) continue;
    found.push({x: c.x, z: c.z, y: ground.height(c.x, c.z), down: Object.freeze({x: dx, z: dz}), slope: mean});
  }
  // Best slopes first; slides kept apart so each is its own place.
  found.sort((a, b) => Math.abs(a.slope - SEARCH.slideIdeal) - Math.abs(b.slope - SEARCH.slideIdeal) || a.x - b.x || a.z - b.z);
  const out = [];
  for (const spot of found) {
    if (out.length >= max) break;
    if (out.every(other => Math.hypot(other.x - spot.x, other.z - spot.z) > 90)) out.push(Object.freeze({...spot, slope: Math.round(spot.slope * 10) / 10}));
  }
  return out;
}

// The slide and the buried beacon at a seeded point inside it.
export function pickSlide(slides, seed, ground, n = 0) {
  if (!slides.length) return null;
  const r = rng(seed, 'slide', n), slide = slides[r.int(0, slides.length - 1)];
  const across = r.range(-.4, .4) * SEARCH.slideAcross, down = r.range(-.35, .35) * SEARCH.slideDown;
  const x = slide.x - slide.down.z * across + slide.down.x * down, z = slide.z + slide.down.x * across + slide.down.z * down;
  return Object.freeze({slide, beacon: Object.freeze({x, z, y: ground.height(x, z)})});
}

// The receiver: heard within 60 m (height included); a beep every
// 0.15 + 1.6 x distance / 60 seconds, pitch 900 to 1,400 Hz as you close,
// and a signal bar fading with the square of the distance. No direction.
export function beaconSignal(heli, beacon) {
  const d = Math.hypot(heli.x - beacon.x, heli.y - beacon.y, heli.z - beacon.z);
  if (d > SEARCH.beaconRange) return Object.freeze({heard: false, distance: d, bar: 0, interval: null, pitch: null});
  const share = d / SEARCH.beaconRange;
  return Object.freeze({heard: true, distance: d, bar: (1 - share) ** 2, interval: SEARCH.beepAt[0] + SEARCH.beepAt[1] * share,
    pitch: SEARCH.beepPitch[1] - (SEARCH.beepPitch[1] - SEARCH.beepPitch[0]) * share});
}

// ---- the hoist rescue (5.3) ------------------------------------------------
// Below the road along Mountain Climb and The Ridge: 25 to 40 degrees, 10 m
// or more below the road, 20 to 120 m from its edge, no tree within 12 m.
export function hoistSpots(course, ground, {step = 16} = {}) {
  const out = [];
  for (let s = 0; s < course.length; s += step) {
    if (!SEARCH.hoistSections.includes(course.sectionAt(s)?.name)) continue;
    const roadY = course.at(s).y, half = course.roadHalfWidthAt(s);
    for (const side of [-1, 1]) for (let off = SEARCH.hoistFromEdge[0]; off <= SEARCH.hoistFromEdge[1]; off += 10) {
      const p = course.worldAt(s, side * (half + off)), y = ground.height(p.x, p.z), slope = slopeAt(ground, p.x, p.z).degrees;
      if (roadY - y < SEARCH.hoistBelowRoad || slope < SEARCH.hoistSlope[0] || slope > SEARCH.hoistSlope[1]) continue;
      if (ground.near(p.x, p.z, SEARCH.hoistTreeClear).some(o => o.kind === 'tree')) continue;
      out.push(Object.freeze({x: p.x, z: p.z, y, s, side, slope: Math.round(slope * 10) / 10}));
      off += 30; // one spot per stretch of slope
    }
  }
  return out;
}

// The driver at a seeded spot, their car beside them.
export function pickHoist(spots, seed, ground, n = 0) {
  if (!spots.length) return null;
  const r = rng(seed, 'hoist', n), spot = spots[r.int(0, spots.length - 1)], a = r.range(0, Math.PI * 2);
  const car = {x: spot.x + Math.cos(a) * 5, z: spot.z + Math.sin(a) * 5};
  return Object.freeze({driver: spot, car: Object.freeze({...car, y: ground.height(car.x, car.z), heading: r.range(0, Math.PI * 2)})});
}

// ---- the supply run (5.4) --------------------------------------------------
// The yard: a clear 10 m circle near the summit hut, or the lodge.
export function supplyYard(course, ground) {
  const at = landmark(course, 'summit-hut') ?? landmark(course, 'ski-lodge');
  return at ? clearNear(course, ground, at.x, at.z, SEARCH.yardSearch[0], SEARCH.yardSearch[1], SEARCH.yardRadius) : null;
}

// Three clear spots for the crates near a landing zone.
export function crateSpots(course, ground, zone) {
  const out = [];
  for (let r = 22; r <= 60 && out.length < 3; r += 6) for (let k = 0; k < 12 && out.length < 3; k++) {
    const a = k * Math.PI / 6, x = zone.x + Math.cos(a) * r, z = zone.z + Math.sin(a) * r;
    if (out.every(o => Math.hypot(o.x - x, o.z - z) > 8) && clearCircle(course, ground, x, z, 3, 1))
      out.push(Object.freeze({x, z, y: ground.height(x, z)}));
  }
  return out;
}

// The most Kestrel One holds in the air at an altitude (H1: thrust times
// e to the minus altitude over 8,500 m), in kg of everything flying.
export const liftAt = altitudeM => KESTREL.maxThrust * airFactor(altitudeM) / GRAVITY;

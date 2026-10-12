// The waterside of a night circuit: a low railing along the wall where the road runs beside water,
// tall street lamps with their reflections on the water, yachts and a marina with masts and riding
// lights, a lighthouse at the harbour mouth with a sweeping beam, and palm trees along the promenade.
// A circuit asks for it with `waterside` in its definition (see src/circuits/harbour-lights.js); a
// circuit that does not ask gets nothing. Drawing only: nothing here changes race state.
//
// `planWaterside` works out where everything stands from the road and the basins (pure arithmetic,
// a fixed seed, no graphics) so the road glow (src/circuit-water.js) and the small soft lights
// (src/night-glows.js) can use the same positions. `addWaterside` turns the plan into a few
// instanced draws, split by stretch of road so only the stretch in view is drawn.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeRng } from './rng.js';
import { registerSceneSystem } from './scene-systems.js';
import { TRACK_SCRIPT } from './track-script.js';
import { basinReach } from './circuit-hills.js';
import { lakeLevel } from './circuit-effects.js';
import { renderedGroundHeight } from './rendered-ground.js';

const WALL_OUT = TRACK_SCRIPT.wallSetback + TRACK_SCRIPT.wallThickness;
const TAU = Math.PI * 2;
const plans = new WeakMap();

function groundPoint(course, s, lateral) {
  const g = course.groundAt(s, lateral);
  let y = g.y;
  try { const r = renderedGroundHeight(course, { ...g, s, off: lateral }, { requireSurface: true }); if (Number.isFinite(r)) y = r; } catch { /* keep the road-table height */ }
  return { x: g.x, y, z: g.z, heading: g.heading };
}
const sideOf = basin => Math.sign(basin.lateral) || -1;

// ---------------------------------------------------------------------------
// The plan

export function planWaterside(course) {
  if (plans.has(course)) return plans.get(course);
  const cfg = course.def.waterside, basins = course.def.basins ?? [];
  const plan = { rails: [], lamps: [], yachts: [], pier: [], palms: [], lighthouse: null, lights: [], reflections: [], cfg };
  plans.set(course, plan);
  if (!cfg) return plan;
  const rng = makeRng(0x5ea5 ^ (course.def.stage * 977));
  const levels = new Map(basins.map(basin => [basin.id, lakeLevel(course, basin)]));
  const basinById = id => {
    const basin = basins.find(item => item.id === id);
    if (!basin) throw new Error(`Waterside names no basin called "${id}".`);
    return basin;
  };
  // Light a point may cast on the water: `level` is the water below it.
  const light = (point, colour, size, strength, level = null) => {
    plan.lights.push({ point, colour, size, strength });
    if (level !== null) plan.reflections.push({ x: point[0], z: point[2], level, h: point[1] - level, colour, strength: Math.min(1, strength), width: Math.max(.3, size * .5) });
  };

  // --- railing on the wall beside each basin
  if (cfg.rail) for (const basin of basins) {
    const side = sideOf(basin), height = cfg.rail.height ?? 1.7, runs = [];
    let run = null;
    for (let s = basin.s - basin.along; s <= basin.s + basin.along; s += 2) {
      const open = basinReach(basin, s - basin.s, side * (course.roadHalfWidthAt(s) + 10) - basin.lateral) < 1;
      if (open) { if (!run) runs.push(run = { from: s, to: s }); run.to = s; } else run = null;
    }
    const posts = [];
    for (const item of runs) for (let s = item.from; s <= item.to + 1e-6; s += cfg.rail.every ?? 2.4) {
      const lateral = side * (course.roadHalfWidthAt(s) + WALL_OUT * .5 + .35), ground = groundPoint(course, s, lateral);
      posts.push({ x: ground.x, y: ground.y, z: ground.z, s });
    }
    plan.rails.push({ basin: basin.id, height, posts, runs: runs.length });
  }

  // --- tall street lamps
  (cfg.lamps ?? []).forEach((rule, zone) => {
    const height = rule.height ?? 11.5, side = rule.side ?? -1, arm = rule.arm ?? 3.9;
    for (let s = rule.from; s <= rule.to; s += rule.every ?? 40) {
      const half = course.roadHalfWidthAt(s), base = groundPoint(course, s, side * (half + WALL_OUT + .9)), head = course.groundAt(s, side * (half + WALL_OUT + .9 - arm));
      const basin = basins.find(item => sideOf(item) === side && Math.abs(s - item.s) < item.along * .95), level = basin ? levels.get(basin.id) : null;
      const lamp = { zone, s, side, height, arm, x: base.x, y: base.y, z: base.z, angle: base.heading + (side > 0 ? Math.PI : 0), colour: rule.colour ?? 0xffdfb0, pool: rule.pool ?? .12,
        head: [head.x, base.y + height - .15, head.z] };
      plan.lamps.push(lamp);
      light(lamp.head, lamp.colour, rule.halo ?? 1.9, rule.strength ?? .95, level);
    }
  });

  // --- the ordinary street lamps beside the water also show in it
  const street = course.def.streetLight;
  if (street) for (const basin of basins) {
    const side = sideOf(basin), every = street.every ?? 40, level = levels.get(basin.id);
    for (let s = Math.ceil((basin.s - basin.along) / every) * every; s <= basin.s + basin.along; s += every) {
      const half = course.roadHalfWidthAt(s), head = course.groundAt(s, side * (half - 2)), pole = course.groundAt(s, side * (half + 3.4));
      plan.reflections.push({ x: head.x, z: head.z, level, h: pole.y + 10.2 - level, colour: 0xffe2bc, strength: .7, width: .5 });
    }
  }

  // --- palms along the promenade
  (cfg.palms ?? []).forEach((rule, zone) => {
    const kit = (course.def.kitPlacements ?? []).filter(piece => !/wall|fence|tyre|string|boat|sign/.test(piece.id));
    for (let s = rule.from; s <= rule.to; s += (rule.every ?? 18) * rng.range(.85, 1.2)) {
      // Keep clear of the lamps (every 40 m, and every 40 m between) and of the buildings.
      if (Math.abs(((s + 20) % 40) - 20) < 3.5 || Math.abs((s % 40) - 20) < 3.5) continue;
      const lateral = rule.side * (course.roadHalfWidthAt(s) + WALL_OUT + (rule.back ?? 2.6) + rng.range(-.3, .6)), p = groundPoint(course, s, lateral);
      const w = course.worldAt(s, lateral);
      if (kit.some(piece => { const q = course.worldAt(piece.s, piece.lateral); return Math.hypot(q.x - w.x, q.z - w.z) < 4.5 + (/shop/.test(piece.id) ? 4 : 2) * (piece.scale?.[0] ?? piece.scale ?? 1); })) continue;
      if (basins.some(basin => basinReach(basin, s - basin.s, lateral - basin.lateral) < 1.12)) continue;
      plan.palms.push({ zone, x: p.x, y: p.y, z: p.z, scale: rng.range(.8, 1.25), yaw: rng.range(0, TAU), lean: rng.range(-.09, .09) });
    }
  });

  // --- yachts, the marina and the lighthouse
  const taken = [];
  for (const piece of course.def.kitPlacements ?? []) if (piece.id === 'harbour-boat') { const w = course.worldAt(piece.s, piece.lateral); taken.push([w.x, w.z, 9]); }
  const free = (x, z, r) => taken.every(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) > tr + r);
  const yacht = (basin, x, z, heading, kind, scale = 1) => {
    const level = levels.get(basin.id), look = YACHTS[kind], lit = rng.float();
    const entry = { basin: basin.id, kind, x, y: level, z, heading, scale, tint: rng.pick([0xffffff, 0xf1ebdc, 0xd9dfe6, 0xc8d2e0, 0xe7dcc4]) };
    plan.yachts.push(entry); taken.push([x, z, look.length * scale * .5 + 1.2]);
    const at = ([px, py, pz]) => [x + (px * Math.cos(heading) + pz * Math.sin(heading)) * scale, level + py * scale, z + (-px * Math.sin(heading) + pz * Math.cos(heading)) * scale];
    light(at([0, look.mast + .35, look.mastZ]), 0xfff2d8, .6, .85, level);
    if (lit < .55) light(at([0, 2.3, -look.length * .5 + .3]), 0xffffff, .4, .6, level);
    if (lit > .5) light(at([lit > .8 ? -.9 : 0, 1.4, look.length * .2]), 0xffb868, .5, .55, level);
    if (lit > .82) { light(at([-.7, 1.2, look.length * .5 - .6]), 0xff3028, .35, .7); light(at([.7, 1.2, look.length * .5 - .6]), 0x28ff60, .35, .7); }
  };
  const inWater = (basin, x, z, limit) => {
    const n = course.nearest(x, z, basin.s);
    return basinReach(basin, ((n.s - basin.s + course.length * 1.5) % course.length) - course.length / 2, n.lateral - basin.lateral) < limit;
  };
  for (const group of cfg.yachts ?? []) {
    const basin = basinById(group.basin);
    for (let i = 0, tries = 0; i < group.count && tries < group.count * 14; tries++) {
      const du = rng.range(-.8, .8) * basin.along, dv = rng.range(-.8, .8) * basin.across;
      if (basinReach(basin, du, dv) > .7) continue;
      const w = course.worldAt(basin.s + du, basin.lateral + dv);
      const kind = rng.chance(.7) ? 'sail' : 'motor', scale = rng.range(.85, 1.3);
      if (!free(w.x, w.z, YACHTS[kind].length * scale * .5 + 1.2)) continue;
      yacht(basin, w.x, w.z, w.heading + (rng.chance(.75) ? 0 : rng.range(-.5, .5)) + (rng.chance(.5) ? Math.PI : 0), kind, scale);
      i++;
    }
  }
  if (cfg.marina) {
    const marina = cfg.marina, basin = basinById(marina.basin), side = sideOf(basin), level = levels.get(basin.id), top = level + .55;
    const pierLateral = side * (marina.pier ?? 38), s0 = basin.s + (marina.centre ?? 0), length = marina.length ?? 110, spacing = marina.spacing ?? 11, finger = marina.finger ?? 14;
    // A pontoon: `across` metres along the road's lateral direction, `along` metres along the road.
    const pontoon = (s, lateral, across, along) => { const w = course.worldAt(s, lateral); plan.pier.push({ x: w.x, y: level, z: w.z, sx: across, sy: 1.1, sz: along, yaw: w.heading }); };
    pontoon(s0, pierLateral, 2.4, length);
    for (let s = s0 - length / 2 + 6; s <= s0 + length / 2 - 4; s += spacing) {
      const middle = course.worldAt(s, pierLateral + side * (finger / 2 + 1.2));
      if (!inWater(basin, middle.x, middle.z, .78)) continue;
      pontoon(s, pierLateral + side * (finger / 2 + 1.2), finger, 1.1);
      // A yacht on each side of the finger, bows out over the water.
      for (const berth of [-1, 1]) {
        if (!rng.chance(marina.fill ?? .85)) continue;
        const kind = rng.chance(.78) ? 'sail' : 'motor', scale = rng.range(.8, 1.05), centre = pierLateral + side * (finger * .62 + 1.2);
        const at = course.worldAt(s + berth * 2.5, centre), out = course.worldAt(s + berth * 2.5, centre + side * 5);
        if (!inWater(basin, at.x, at.z, .8)) continue;
        yacht(basin, at.x, at.z, Math.atan2(out.x - at.x, out.z - at.z), kind, scale);
      }
    }
    // Lamps along the pier.
    for (let s = s0 - length / 2 + 4; s <= s0 + length / 2; s += marina.lampEvery ?? 15) {
      const w = course.worldAt(s, pierLateral - side * .9);
      light([w.x, top + 3.1, w.z], 0xffd9a0, 1.5, .9, level);
      plan.pier.push({ x: w.x, y: top + 1.55, z: w.z, sx: .12, sy: 3.1, sz: .12, yaw: 0 });
    }
  }
  if (cfg.lighthouse) {
    const lighthouse = cfg.lighthouse, basin = basinById(lighthouse.basin), side = sideOf(basin), level = levels.get(basin.id);
    let du = (lighthouse.at?.[0] ?? .78) * basin.along, dv = (lighthouse.at?.[1] ?? 0) * basin.across;
    while (basinReach(basin, du, dv) > .8) { du *= .96; dv *= .96; }
    const s = basin.s + du, lateral = basin.lateral + dv, w = course.worldAt(s, lateral), bed = groundPoint(course, s, lateral);
    const inner = side * (course.roadHalfWidthAt(s) + WALL_OUT + 9), moleLength = Math.abs(lateral - inner);
    const mole = course.worldAt(s, (lateral + inner) / 2);
    plan.lighthouse = { x: w.x, z: w.z, bed: Math.min(bed.y, level - .8), level, mole: { x: mole.x, z: mole.z, length: moleLength, yaw: mole.heading + Math.PI / 2 }, height: lighthouse.height ?? 24 };
    const top = level + 2.6 + plan.lighthouse.height;
    light([w.x, top - 1.1, w.z], 0xffe6b0, lighthouse.halo ?? 15, 1.7, level);
    light([w.x, level + 4.2, w.z], 0x30ff70, 1.4, 1.1, level);
    // The harbour entrance light at the near end of the mole.
    const entrance = course.worldAt(s, inner - side * 2.5);
    light([entrance.x, level + 3.4, entrance.z], 0xff3028, 1.2, 1.1, level);
    plan.pier.push({ x: entrance.x, y: level + 1.7, z: entrance.z, sx: .15, sy: 3.4, sz: .15, yaw: 0 });
  }

  // --- the town's lights across the water: a few windows on the far shore
  for (const basin of basins) {
    const level = levels.get(basin.id), side = sideOf(basin), centre = course.worldAt(basin.s, basin.lateral);
    let count = 0;
    for (const building of course.features.buildings ?? []) {
      if (count >= (cfg.farLights ?? 14)) break;
      const n = course.nearest(building.x, building.z, basin.s);
      if (Math.abs(n.s - basin.s) > basin.along * 1.1 || side * n.lateral < Math.abs(basin.lateral) + basin.across * .6 || Math.hypot(building.x - centre.x, building.z - centre.z) > basin.along + basin.across + 180) continue;
      for (let i = 0; i < 2; i++) {
        const colour = rng.pick([0xffc77a, 0xffe2b0, 0xffb060, 0xbcd8ff]), h = rng.range(5, Math.max(8, Math.min(building.height * .8, 38))) + (building.y - level);
        plan.reflections.push({ x: building.x + rng.range(-3, 3), z: building.z + rng.range(-3, 3), level, h, colour, strength: .5, width: .7 });
      }
      count++;
    }
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Yacht shapes

const YACHTS = {
  sail: { length: 10.5, mast: 13.5, mastZ: .9 },
  motor: { length: 16, mast: 7.4, mastZ: -3.2 },
};

const matrixOf = (position, yaw = 0, scale = [1, 1, 1], pitch = 0, roll = 0) => new THREE.Matrix4().compose(new THREE.Vector3(...position),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), new THREE.Vector3(...scale));

// Merge coloured parts into one geometry (position, normal and colour only).
function assemble(parts) {
  const list = parts.map(({ geometry, colour, matrix }) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    g.deleteAttribute('uv');
    const c = new THREE.Color(colour), count = g.attributes.position.count, array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { array[i * 3] = c.r; array[i * 3 + 1] = c.g; array[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(array, 3));
    return g;
  });
  const merged = mergeGeometries(list, false);
  list.forEach(g => g.dispose());
  return merged;
}
const box = (size, position, colour, yaw = 0, pitch = 0) => ({ geometry: new THREE.BoxGeometry(...size), colour, matrix: matrixOf(position, yaw, [1, 1, 1], pitch) });
function beam(a, b, thickness, colour) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), axis = to.clone().sub(from), length = axis.length();
  const matrix = new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis.normalize()), new THREE.Vector3(1, 1, 1));
  return { geometry: new THREE.BoxGeometry(length, thickness, thickness), colour, matrix };
}

// A hull lofted from stations along its length: [position along 0..1, half width, bottom raise, deck lift].
function hullGeometry(length, width, draft, free, colours) {
  const stations = [[0, .8, .5, 0], [.1, .96, .2, 0], [.3, 1, 0, 0], [.55, 1, 0, 0], [.8, .88, .14, .04], [.93, .52, .5, .12], [1, .03, .92, .2]];
  const rings = stations.map(([t, w, raise, lift]) => {
    const z = (t - .5) * length, half = width / 2 * w, bottom = -draft + raise * draft, deck = free + lift * free * 2;
    return [[-half * .5, bottom], [-half, deck * .35], [-half * .94, deck], [half * .94, deck], [half, deck * .35], [half * .5, bottom]].map(([x, y]) => [x, y, z]);
  });
  const positions = [], tints = [], tone = new THREE.Color();
  const push = (p, c) => { positions.push(...p); tone.set(c); tints.push(tone.r, tone.g, tone.b); };
  const colourAt = y => (y < -draft * .35 ? colours.bottom : y < .05 ? colours.stripe : colours.hull);
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < 6; j++) {
    const a = rings[i][j], b = rings[i][(j + 1) % 6], c = rings[i + 1][(j + 1) % 6], d = rings[i + 1][j];
    for (const p of [a, b, c, a, c, d]) push(p, colourAt(p[1]));
  }
  const last = rings[0];
  for (const j of [1, 2, 3, 4]) for (const p of [last[0], last[j + 1 > 5 ? 5 : j + 1], last[j]]) push(p, colourAt(p[1]));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  // Wind every triangle outward from the hull's middle.
  const centre = new THREE.Vector3(0, free * .3, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 9) {
    a.fromArray(positions, i); b.fromArray(positions, i + 3); c.fromArray(positions, i + 6);
    n.subVectors(b, a).cross(c.clone().sub(a));
    if (n.dot(a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(centre)) < 0) for (let k = 0; k < 3; k++) { const t = positions[i + 3 + k]; positions[i + 3 + k] = positions[i + 6 + k]; positions[i + 6 + k] = t; }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function yachtGeometry(kind) {
  const hull = kind === 'sail' ? { length: 10.5, width: 3.3, draft: .9, free: 1.0 } : { length: 16, width: 4.6, draft: 1.1, free: 1.2 };
  const body = hullGeometry(hull.length, hull.width, hull.draft, hull.free, { hull: 0xf0ede4, stripe: 0x2b3f58, bottom: 0x1c2733 });
  const out = [];
  const glass = 0x1a2530, teak = 0xa89270, white = 0xf2efe6, steel = 0xaab0b5, rope = 0x34383c;
  if (kind === 'sail') {
    out.push(box([3.4, .55, 2.0], [0, 1.28, -.7], teak), box([2.2, .1, 1.2], [0, 1.58, -.7], 0xd9d2c0));
    out.push(box([.05, .3, 1.5], [1.05, 1.5, -.7], glass), box([.05, .3, 1.5], [-1.05, 1.5, -.7], glass));
    out.push(box([.14, 13.4, .14], [0, 1 + 6.7, .9], steel));
    out.push(box([.09, .09, 3.8], [0, 2.9, -.95], 0x2a4a6a));
    out.push(beam([0, 13.2, .9], [0, 1.1, 5.0], .035, rope), beam([0, 13.2, .9], [0, 1.3, -5.0], .035, rope));
    out.push(box([1.6, .06, .06], [0, 8.8, .9], steel), box([1.6, .06, .06], [0, 5.6, .9], steel));
  } else {
    out.push(box([3.7, 1.7, 7.4], [0, 2.05, -1.4], white), box([3.76, .5, 5.2], [0, 2.25, -1.6], glass));
    out.push(box([3.2, 1.2, 3.4], [0, 3.5, -2.5], white), box([3.26, .42, 2.4], [0, 3.6, -2.3], glass));
    out.push(box([3.9, .08, 7.8], [0, 2.93, -1.4], 0xcfcabc));
    out.push(box([.1, 3.6, .1], [0, 6.0, -3.2], steel), box([1.3, .08, .12], [0, 6.2, -3.2], steel));
    out.push(box([3.8, .2, 3.8], [0, 1.28, 4.2], teak));
  }
  const rest = assemble(out), merged = mergeGeometries([body, rest], false);
  body.dispose(); rest.dispose();
  return merged;
}

// ---------------------------------------------------------------------------
// Other pieces

function palmGeometry() {
  const parts = [];
  const trunk = 6.6, segments = 7, bend = .5;
  let previous = null;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, y = t * trunk, x = bend * t * t, radius = .26 - t * .1;
    if (previous) {
      const a = new THREE.Vector3(previous.x, previous.y, 0), b = new THREE.Vector3(x, y, 0);
      const length = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(.5), angle = Math.atan2(b.x - a.x, b.y - a.y);
      parts.push({ geometry: new THREE.CylinderGeometry(radius * .9, previous.radius, length, 6, 1, true), colour: i % 2 ? 0x5a4a3a : 0x4a3d30,
        matrix: matrixOf([mid.x, mid.y, 0], 0, [1, 1, 1], 0, -angle) });
    }
    previous = { x, y, radius };
  }
  const top = [bend, trunk, 0];
  // Fronds: long curved blades that arch and droop.
  const fronds = 11, positions = [], tints = [], tone = new THREE.Color();
  for (let f = 0; f < fronds; f++) {
    const angle = f / fronds * TAU + (f % 2) * .2, length = 3.2 + (f % 3) * .35, rise = .7 + (f % 2) * .5;
    const dir = [Math.cos(angle), Math.sin(angle)], side = [-dir[1], dir[0]], steps = 5;
    const point = (t, w) => [top[0] + dir[0] * t * length + side[0] * w, top[1] + rise * (Math.sin(t * Math.PI * .75)) * 1.2 - t * t * length * .55, dir[1] * t * length + side[1] * w];
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps, t1 = (k + 1) / steps, w0 = .5 * Math.sin(Math.PI * Math.min(1, t0 * .9 + .12)), w1 = .5 * Math.sin(Math.PI * Math.min(1, t1 * .9 + .12));
      const a = point(t0, -w0), b = point(t0, w0), c = point(t1, w1), d = point(t1, -w1);
      for (const p of [a, b, c, a, c, d]) positions.push(...p);
      tone.set(k > 2 ? 0x3c5b32 : 0x233f26);
      for (let q = 0; q < 6; q++) tints.push(tone.r, tone.g, tone.b);
    }
  }
  const frondGeometry = new THREE.BufferGeometry();
  frondGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  frondGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
  frondGeometry.computeVertexNormals();
  const trunkGeometry = assemble(parts);
  const merged = mergeGeometries([trunkGeometry, frondGeometry], false);
  trunkGeometry.dispose(); frondGeometry.dispose();
  return merged;
}

function lampGeometry() {
  const height = 11.5, arm = 3.9, parts = [];
  parts.push({ geometry: new THREE.CylinderGeometry(.09, .15, height, 8), colour: 0x2d3338, matrix: matrixOf([0, height / 2, 0]) });
  parts.push({ geometry: new THREE.CylinderGeometry(.2, .2, .5, 8), colour: 0x2d3338, matrix: matrixOf([0, .25, 0]) });
  parts.push(box([arm, .13, .13], [arm / 2, height - .1, 0], 0x2d3338));
  parts.push(beam([.25, height - 2.2, 0], [arm * .62, height - .2, 0], .07, 0x2d3338));
  parts.push(box([1.1, .16, .5], [arm, height - .2, 0], 0x23282c));
  return assemble(parts);
}

function instanced(group, name, geometry, material, matrices, { colours = null, cast = false } = {}) {
  if (!matrices.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  mesh.name = name;
  matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
  if (colours) { const colour = new THREE.Color(); colours.forEach((hex, i) => mesh.setColorAt(i, colour.set(hex))); }
  mesh.castShadow = cast; mesh.receiveShadow = false;
  mesh.computeBoundingSphere(); mesh.boundingSphere.radius += 1;
  mesh.userData.excludeAmbientOcclusion = true;
  group.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Reflections of lights on the water: broken vertical streaks.

const STREAK_VERTEX = `
attribute vec3 aPos; attribute vec4 aInfo; attribute vec3 aColour;
varying vec2 vUv; varying vec3 vColour; varying float vSeed; varying float vBright;
void main(){
  vec3 C = cameraPosition;
  vec2 P = aPos.xz; float h = aInfo.x;
  float camH = max(C.y - aPos.y, .4);
  // The mirror image lies as far below the water as the light stands above it; the streak runs
  // from where the eye meets that image on the water, smeared along the eye's direction.
  float t = camH / (camH + max(h, .2));
  vec2 R = C.xz + (P - C.xz) * t;
  vec2 dir = R - C.xz; float dist = length(dir); dir /= max(dist, .001);
  float span = clamp(dist * .34, 2.0, 40.0) * aInfo.z;
  float wid = aInfo.y + dist * .014;
  vec2 side = vec2(-dir.y, dir.x);
  vec2 xz = R + dir * (position.y * span) + side * (position.x * wid);
  vec3 world = vec3(xz.x, aPos.y + .04, xz.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  vUv = position.xy * 2.0; vColour = aColour;
  vSeed = fract(sin(dot(aPos.xz + aInfo.xx, vec2(12.9898, 78.233))) * 43758.5453);
  float lampDistance = length(P - C.xz);
  vBright = smoothstep(2.5, 9.0, dist) / (1.0 + pow(dist / 80.0, 2.0)) * (1.0 - smoothstep(180.0, 420.0, lampDistance));
}`;
const STREAK_FRAGMENT = `
uniform float time;
varying vec2 vUv; varying vec3 vColour; varying float vSeed; varying float vBright;
void main(){
  float across = exp(-vUv.x * vUv.x * 5.0);
  float ends = 1.0 - pow(abs(vUv.y), 2.2);
  float ripple = .5 + .5 * sin(vUv.y * 9.0 + vSeed * 40.0 + time * .8 + sin(vUv.y * 21.0 - time * 1.3) * 1.6);
  float broken = smoothstep(.2, .85, ripple);
  vec3 colour = vColour * across * ends * (.25 + .75 * broken) * vBright;
  gl_FragColor = vec4(colour, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function addReflections(group, plan) {
  const list = plan.reflections;
  if (!list.length) return null;
  const quad = new THREE.PlaneGeometry(1, 1), geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index; geometry.setAttribute('position', quad.attributes.position);
  geometry.instanceCount = list.length;
  const pos = new Float32Array(list.length * 3), info = new Float32Array(list.length * 4), colour = new Float32Array(list.length * 3), tone = new THREE.Color();
  list.forEach((item, i) => {
    pos.set([item.x, item.level, item.z], i * 3);
    info.set([item.h, item.width, 1, 0], i * 4);
    tone.set(item.colour);
    colour.set([tone.r * item.strength, tone.g * item.strength, tone.b * item.strength], i * 3);
  });
  geometry.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
  geometry.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
  geometry.setAttribute('aColour', new THREE.InstancedBufferAttribute(colour, 3));
  const time = { value: 0 };
  const material = new THREE.ShaderMaterial({ name: 'Water reflections', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { time }, vertexShader: STREAK_VERTEX, fragmentShader: STREAK_FRAGMENT });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'water-reflections'; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.userData.excludeAmbientOcclusion = true;
  group.add(mesh);
  registerSceneSystem(group, { animate: seconds => { time.value = seconds; } });
  return mesh;
}

// ---------------------------------------------------------------------------
// The lighthouse: stone base, banded tower, gallery, lantern room, and a beam that sweeps round.

const BEAM_VERTEX = 'varying vec3 vN; varying vec3 vV; varying float vT; uniform float beamLength; void main(){ vec4 v = modelViewMatrix * vec4(position, 1.0); vV = v.xyz; vN = normalize(normalMatrix * normal); vT = position.x / beamLength; gl_Position = projectionMatrix * v; }';
const BEAM_FRAGMENT = `varying vec3 vN; varying vec3 vV; varying float vT;
void main(){
  float edge = pow(abs(dot(normalize(vN), normalize(-vV))), 1.4);
  float a = pow(max(1.0 - vT, 0.0), 1.4) * smoothstep(0.0, .04, vT) * edge * .18;
  gl_FragColor = vec4(vec3(1.0, .86, .6) * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function addLighthouse(group, plan) {
  const lh = plan.lighthouse;
  if (!lh) return null;
  const height = lh.height, base = lh.level + 2.6, parts = [];
  const stone = 0x4a4d50, white = 0xe8e4da, red = 0xb8322a;
  parts.push({ geometry: new THREE.CylinderGeometry(4.6, 5.2, base - lh.bed, 14), colour: stone, matrix: matrixOf([0, (base + lh.bed) / 2 - lh.level, 0]) });
  const bands = 4, band = height / bands;
  for (let i = 0; i < bands; i++) {
    const r0 = 2.7 - i * (1.2 / bands), r1 = 2.7 - (i + 1) * (1.2 / bands);
    parts.push({ geometry: new THREE.CylinderGeometry(r1, r0, band, 14), colour: i % 2 ? red : white, matrix: matrixOf([0, base - lh.level + band * (i + .5), 0]) });
  }
  const topY = base - lh.level + height;
  parts.push({ geometry: new THREE.CylinderGeometry(2.4, 2.1, .4, 14), colour: 0x2b2f33, matrix: matrixOf([0, topY + .2, 0]) });
  parts.push({ geometry: new THREE.CylinderGeometry(1.15, 1.15, 2.2, 10, 1, true), colour: 0x23282c, matrix: matrixOf([0, topY + 1.5, 0]) });
  parts.push({ geometry: new THREE.ConeGeometry(1.7, 1.6, 10), colour: red, matrix: matrixOf([0, topY + 3.4, 0]) });
  for (let i = 0; i < 8; i++) parts.push(box([.07, .9, .07], [Math.cos(i / 8 * TAU) * 2.3, topY + .85, Math.sin(i / 8 * TAU) * 2.3], 0x2b2f33));
  const body = assemble(parts), material = new THREE.MeshStandardMaterial({ name: 'Lighthouse', vertexColors: true, roughness: .8, emissive: 0x0a0806 });
  const tower = new THREE.Mesh(body, material);
  tower.position.set(lh.x, lh.level, lh.z); tower.name = 'lighthouse'; tower.userData.excludeAmbientOcclusion = true;
  group.add(tower);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, 2.0, 10), new THREE.MeshBasicMaterial({ color: 0xffe9b8, toneMapped: false }));
  lantern.position.set(lh.x, lh.level + topY + 1.5, lh.z); lantern.userData.excludeAmbientOcclusion = true; group.add(lantern);
  // The mole to the shore.
  const mole = new THREE.Mesh(new THREE.BoxGeometry(lh.mole.length, 1.9, 3.4), new THREE.MeshStandardMaterial({ color: 0x3b3e42, roughness: .95 }));
  mole.position.set(lh.mole.x, lh.level + .35, lh.mole.z); mole.rotation.y = lh.mole.yaw; mole.userData.excludeAmbientOcclusion = true; group.add(mole);
  // Two beams, opposite each other, turning once in about six seconds.
  const length = 240, spin = new THREE.Group();
  const cone = new THREE.ConeGeometry(10, length, 20, 1, true).translate(0, -length / 2, 0).rotateZ(Math.PI / 2);
  const beamMaterial = new THREE.ShaderMaterial({ name: 'Lighthouse beam', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { beamLength: { value: length } }, vertexShader: BEAM_VERTEX, fragmentShader: BEAM_FRAGMENT });
  const one = new THREE.Mesh(cone, beamMaterial), two = new THREE.Mesh(cone, beamMaterial);
  two.rotation.y = Math.PI;
  for (const item of [one, two]) { item.frustumCulled = false; item.renderOrder = 5; item.userData.excludeAmbientOcclusion = true; spin.add(item); }
  spin.position.set(lh.x, lh.level + topY + 1.5, lh.z);
  group.add(spin);
  registerSceneSystem(group, { animate: seconds => { spin.rotation.y = seconds * 1.05; } });
  return tower;
}

// ---------------------------------------------------------------------------

export function addWaterside(group, course) {
  const cfg = course.def.waterside;
  if (!cfg) return null;
  const plan = planWaterside(course), counts = { rails: 0, lamps: 0, yachts: 0, palms: 0 };
  const water = new THREE.Group(); water.name = 'Waterside';
  const steel = new THREE.MeshStandardMaterial({ name: 'Railing', color: 0x2a3036, roughness: .55, metalness: .55 });

  // Railing: slim posts and two rails on top of the wall, so the water shows through.
  const post = new THREE.BoxGeometry(.07, 1, .07), rail = new THREE.BoxGeometry(1, .05, .05);
  for (const item of plan.rails) {
    const posts = [], rails = [];
    item.posts.forEach((p, i) => {
      posts.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + item.height / 2, p.z), new THREE.Quaternion(), new THREE.Vector3(1, item.height, 1)));
      const q = item.posts[i + 1];
      if (!q || Math.hypot(q.x - p.x, q.z - p.z) > 4) return;
      for (const lift of [.78, item.height * .93]) {
        const a = new THREE.Vector3(p.x, p.y + lift, p.z), b = new THREE.Vector3(q.x, q.y + lift, q.z), axis = b.clone().sub(a);
        rails.push(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis.clone().normalize()), new THREE.Vector3(axis.length(), 1, 1)));
      }
    });
    instanced(water, `Railing posts ${item.basin}`, post, steel, posts); instanced(water, `Railing rails ${item.basin}`, rail, steel, rails);
    counts.rails += posts.length;
  }

  // Tall street lamps.
  const lampMaterial = new THREE.MeshStandardMaterial({ name: 'Harbour lamps', vertexColors: true, roughness: .5, metalness: .5 }), lampBody = lampGeometry();
  const lensMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4b8, toneMapped: false }), lens = new THREE.BoxGeometry(.9, .06, .38);
  const lampZones = new Map();
  for (const lamp of plan.lamps) { if (!lampZones.has(lamp.zone)) lampZones.set(lamp.zone, []); lampZones.get(lamp.zone).push(lamp); }
  for (const [zone, lamps] of lampZones) {
    const bodies = lamps.map(l => matrixOf([l.x, l.y, l.z], l.angle, [1, (l.height) / 11.5, 1]));
    const lenses = lamps.map(l => matrixOf([l.head[0], l.head[1] - .1, l.head[2]], l.angle));
    instanced(water, `Harbour lamps ${zone}`, lampBody, lampMaterial, bodies, { cast: true }); instanced(water, `Harbour lamp lenses ${zone}`, lens, lensMaterial, lenses);
    counts.lamps += lamps.length;
  }

  // Yachts and the pier.
  const yachtMaterial = new THREE.MeshStandardMaterial({ name: 'Yachts', vertexColors: true, roughness: .5, metalness: .12, emissive: 0x06080a, side: THREE.DoubleSide });
  const byBasin = new Map();
  for (const y of plan.yachts) { const key = y.basin + '/' + y.kind; if (!byBasin.has(key)) byBasin.set(key, []); byBasin.get(key).push(y); }
  const geometries = {};
  for (const [key, list] of byBasin) {
    const kind = key.split('/')[1];
    geometries[kind] ??= yachtGeometry(kind);
    instanced(water, `Yachts ${key}`, geometries[kind], yachtMaterial, list.map(y => matrixOf([y.x, y.y, y.z], y.heading, [y.scale, y.scale, y.scale])), { colours: list.map(y => y.tint), cast: true });
    counts.yachts += list.length;
  }
  if (plan.pier.length) {
    const timber = new THREE.MeshStandardMaterial({ name: 'Pontoons', color: 0x3a312a, roughness: .9 }), cube = new THREE.BoxGeometry(1, 1, 1);
    instanced(water, 'Pontoons', cube, timber, plan.pier.map(p => matrixOf([p.x, p.y, p.z], p.yaw, [p.sx, p.sy, p.sz])));
  }
  addLighthouse(water, plan);

  // Palms.
  if (plan.palms.length) {
    const material = new THREE.MeshStandardMaterial({ name: 'Palms', vertexColors: true, roughness: .85, side: THREE.DoubleSide, emissive: 0x050a05 }), geometry = palmGeometry(), zones = new Map();
    for (const palm of plan.palms) { if (!zones.has(palm.zone)) zones.set(palm.zone, []); zones.get(palm.zone).push(palm); }
    for (const [zone, palms] of zones) instanced(water, `Palms ${zone}`, geometry, material, palms.map(p => matrixOf([p.x, p.y, p.z], p.yaw, [p.scale, p.scale, p.scale], 0, p.lean)), { cast: true });
    counts.palms += plan.palms.length;
  }
  addReflections(water, plan);
  group.add(water);
  water.userData.waterside = counts;
  return counts;
}

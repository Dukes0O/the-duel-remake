// Puts an authored track script (src/track-script.js) into a Course: the
// sampled centreline, the finish, the racing line and the solid walls. Like the
// Pit's builder, this runs only for definitions that carry a `script`.
import { TRACK_SCRIPT, TrackScriptError, buildRacingLine } from './track-script.js';
import { checkSurfaceRules, iceBoards } from './race-surfaces.js';

// Cars are slower than the course's top speed on tight corners; the racing line
// is stored for a reference car and computer racers scale it to their own.
export function installTrackScript(course, dynamics) {
  const script = course.script, f = course.features;
  course.samples = script.samples.map(sample => ({ ...sample }));
  course.racingLine = buildRacingLine(script, dynamics);
  f.walls = [];
  f.kerbs = script.kerbs.map(kerb => ({ ...kerb }));
  f.boards = script.boards.map(board => ({ ...board }));
  // Surface patches (ice, a drift of deep snow...) lie on top of the script's stretches.
  f.surfacePatches = (course.def.surfacePatches || []).map(patch => ({ from: -Infinity, to: Infinity, ...patch }));
  const problems = checkSurfaceRules(script, f.surfacePatches);
  if (problems.length) throw new TrackScriptError(`Track script "${script.id}" breaks the surface rules: ${problems.join(' ')}`);
  f.boards.push(...iceBoards(script, f.surfacePatches));
  if (!course.def.practice) f.checkpoints.push({ s: course.raceLength, kind: 'finish' });
  if (!course.def.practice) for (let i = 1; i < 4; i++) f.lapGates.push({ s: course.length * i / 4 });
}

// Walls are short solid boxes of finite height, so a car airborne over a crest
// clears one while a grounded car hits it (the POLISH-HEIGHT rules).
function wallSegments(course) {
  const script = course.script, walls = [];
  let serial = 0;
  for (const span of script.walls) {
    const tight = script.pieces[span.piece].radius < 30;
    const target = tight ? 3 : 4, count = Math.max(1, Math.ceil((span.s1 - span.s0) / target));
    const size = (span.s1 - span.s0) / count;
    for (let i = 0; i < count; i++) {
      const a = span.s0 + i * size, b = a + size, c = (a + b) / 2;
      const off = span.side * (script.halfWidthAt(c) + TRACK_SCRIPT.wallSetback + TRACK_SCRIPT.wallThickness / 2);
      const centre = course.groundAt(c, off);
      const heights = [a, c, b].map(s => course.groundAt(s, span.side * (script.halfWidthAt(s) + TRACK_SCRIPT.wallSetback + TRACK_SCRIPT.wallThickness / 2)).y);
      const low = Math.min(...heights), high = Math.max(...heights);
      walls.push({
        id: `wall-${span.side > 0 ? 'left' : 'right'}-${serial++}`, kind: 'prop', shape: 'box', barrier: true, trackWall: true,
        s: course.phase(c), off, x: centre.x, y: low - .1, z: centre.z, heading: centre.heading,
        halfX: TRACK_SCRIPT.wallThickness / 2, halfZ: size / 2 + .05,
        height: high - low + .1 + TRACK_SCRIPT.wallHeight,
        minY: low - .1, maxY: high + TRACK_SCRIPT.wallHeight,
        theme: course.themeAt(c),
      });
    }
  }
  return walls;
}

// Trees, rocks, mountains and (in a city section) street blocks, placed with the
// course's own seeded generator so a seed always gives the same scenery. Nothing
// goes on the road, inside the runoff beside it, or on the inside of a corner
// where it would hide the exit.
function scatterScenery(course) {
  const f = course.features, rng = course.rng, script = course.script, TAU = Math.PI * 2;
  const options = { trees: 800, rocks: 190, mountains: true, ...(course.def.scenery ?? {}) };
  const add = (id, kind, s, off, halfX, halfZ, angle = 0, extra = {}) => {
    const p = course.groundAt(s, off), o = { id, kind, s: course.phase(s), off, x: p.x, y: p.y, z: p.z, heading: p.heading + angle, halfX, halfZ, shape: 'box', theme: course.themeAt(s), ...extra };
    f.obstacles.push(o); return o;
  };
  const roadClear = (s, off, radius = 0, margin = 2) => {
    const p = course.worldAt(s, off), n = course.nearest(p.x, p.z), width = course.roadHalfWidthAt(n.s);
    const side = Math.sign(n.lateral) || 1, room = Math.max(3, script.runoffAt(n.s, side));
    if (n.distance < width + room + radius + margin) return false;
    // Keep the inside of every corner open so the exit can be seen.
    const piece = script.pieceAt(n.s);
    if (piece.kind === 'turn' && side === piece.dir && n.distance < width + 30 + radius) return false;
    return true;
  };
  const vacant = (s, off, radius) => {
    const p = course.groundAt(s, off);
    return f.obstacles.every(o => Math.hypot(o.x - p.x, o.z - p.z) > Math.hypot(o.halfX, o.halfZ) + radius);
  };
  for (let i = 0; i < options.rocks; i++) {
    const s = rng.range(50, course.length - 50), off = (i % 2 ? 1 : -1) * rng.range(18, 72), sx = rng.range(1.3, 4), sz = rng.range(1.2, 4), sy = rng.range(.9, 3), angle = rng.range(0, TAU);
    if (!roadClear(s, off, Math.hypot(sx, sz), 4) || !vacant(s, off, 5)) continue;
    const rock = { s, off, theme: course.themeAt(s), scale: [sx, sy, sz], angle, radiusX: sx, radiusZ: sz };
    f.rocks.push(rock); add(`rock-${i}`, 'rock', s, off, sx, sz, angle, { shape: 'ellipse', source: rock });
  }
  if (options.mountains) {
    for (let i = 0; i < Math.floor(course.length / 95); i++) {
      const s = rng.range(0, course.length), theme = course.themeAt(s);
      if (theme === 'city') continue;
      const sx = rng.range(55, 115), sz = rng.range(55, 110), height = rng.range(65, theme === 'alpine' ? 200 : 120), side = i % 2 ? 1 : -1;
      let off = side * rng.range(180, 330); const radius = Math.hypot(sx, sz) * 1.1;
      for (let j = 0; j < 9 && !roadClear(s, off, radius, 25); j++) off += side * 40;
      if (!roadClear(s, off, radius, 25)) continue;
      f.mountains.push(add(`mountain-${i}`, 'mountain', s, off, sx, sz, rng.range(0, TAU), { height, scale: [sx, height, sz], shape: 'ellipse' }));
    }
  }
  for (const section of course.sections) if (section.theme === 'city') {
    let index = 0;
    for (const row of [0, 1]) for (let s = section.start + 35; s < section.end - 30; s += row ? 62 : 29) for (const side of [-1, 1]) {
      const hx = row ? rng.range(10, 18) : rng.range(6.5, 9.5), hz = row ? rng.range(15, 22) : rng.range(10.5, 13), off = side * (row ? rng.range(85, 120) : rng.range(28, 34));
      if (!roadClear(s, off, Math.hypot(hx, hz), 3) || !vacant(s, off, Math.hypot(hx, hz) * .78)) continue;
      const building = add(`warehouse-${section.start}-${index++}`, 'building', s, off, hx, hz, 0, { height: row ? rng.range(28, 66) : rng.range(11, 29) });
      let lowest = building.y;
      for (const u of [-1, -.5, 0, .5, 1]) for (const v of [-1, -.5, 0, .5, 1]) {
        const x = u * hx, z = v * hz, c = Math.cos(building.heading), sn = Math.sin(building.heading);
        const n = course.nearest(building.x + c * x + sn * z, building.z - sn * x + c * z);
        lowest = Math.min(lowest, course.groundAt(n.s, n.lateral).y);
      }
      building.foundationDepth = building.y - lowest + .65; f.buildings.push(building);
    }
  }
  for (let i = 0; i < options.trees; i++) {
    const s = rng.range(5, course.length - 5), theme = course.themeAt(s);
    if (theme === 'city' && i % 5 || theme === 'desert' && i % 3) continue;
    const off = (i % 2 ? 1 : -1) * rng.range(13, 80), scale = rng.range(.65, 1.7);
    if (roadClear(s, off, 2.1 * scale, 3) && vacant(s, off, 2.1 * scale) && course.groundAt(s, off).y > -12) f.trees.push(add(`tree-${i}`, 'tree', s, off, .23 * scale, .23 * scale, rng.range(0, TAU), { scale }));
  }
}

export function trackScriptSolids(course) {
  const f = course.features, script = course.script;
  const finishS = course.closed ? 0 : course.length;
  for (const side of [-1, 1]) {
    const off = side * (script.halfWidthAt(finishS) + 1.5), p = course.groundAt(finishS, off);
    f.obstacles.push({ id: `finish-post-${side}`, kind: 'prop', s: course.phase(finishS), off, x: p.x, y: p.y, z: p.z,
      heading: p.heading, halfX: .25, halfZ: .25, shape: 'box', theme: course.themeAt(finishS) });
  }
  f.walls = wallSegments(course);
  f.obstacles.push(...f.walls);
  scatterScenery(course);
  course.obstacleBuckets = new Map(); course.rockBuckets = new Map();
  const buckets = Math.ceil(course.length / 64);
  course.bucketCount = buckets;
  for (const o of f.obstacles) {
    const reach = Math.hypot(o.halfX, o.halfZ) * 1.5 + 20;
    for (let b = Math.floor((o.s - reach) / 64); b <= Math.floor((o.s + reach) / 64); b++) {
      const key = ((b % buckets) + buckets) % buckets;
      if (!course.obstacleBuckets.has(key)) course.obstacleBuckets.set(key, []);
      course.obstacleBuckets.get(key).push(o);
    }
  }
}

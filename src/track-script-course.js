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

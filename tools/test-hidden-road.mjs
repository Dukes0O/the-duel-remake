import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { Course } from '../src/course.js';
import { Duel } from '../src/game.js';
import { CARS, COURSE } from '../src/config.js';
import { ROUTE_VARIANTS } from '../src/route-variants.js';
import { FEATURE_STATES, createFeatureFlags } from '../src/feature-flags.js';
import { buildRouteMapGeometry } from '../src/route-map.js';
import { NpcRoutePlanner } from '../src/npc-route.js';
import { sweepObstacle } from '../src/collision.js';

// EGG-01 public geometry contract: explicit Course option; a corridor separate
// from racing shortcuts; physical poses expressed in existing race coordinates.
// Screenshots and actual concealment are reviewed by the browser/art helpers.
const definition = COURSE.find(course => course.id === 'pacific-canyon');
const fixtureUrl = new URL('./replays/hidden-road-ordinary.json', import.meta.url);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
let checks = 0;
const failures = [];
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
function courseFor(seed, enabled = true) {
  return new Course(definition, seed, { hiddenRoad: enabled });
}
function corridor(course) {
  assert.ok(course.hiddenRoad, 'enabled Pacific Canyon must expose its separate hiddenRoad corridor');
  assert.equal(typeof course.hiddenRoad.poseAt, 'function', 'corridor exposes progress/arrival poses');
  assert.equal(typeof course.hiddenRoad.contains, 'function', 'corridor exposes physical containment');
  return course.hiddenRoad;
}
function race(seed = 1989, car = 'falcone_f42', enabled = true) {
  const duel = new Duel({ seed, featureFlags: { 'hidden-road': enabled } });
  duel.startCampaign({ startStage: 0, seed, car, mode: 'duel', difficulty: 'casual', cpuDifficulty: 'medium' });
  duel.state.status = 'racing';
  return duel;
}
function place(duel, pose, { speed = 25, heading = pose.heading } = {}) {
  const state = duel.state;
  Object.assign(state, { s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral,
    speedMph: speed, headingError: angle(heading - duel.course.at(pose.s).heading),
    yawVelocity: 0, steerVisual: 0, slipAngle: 0, groundHeight: pose.y, airborne: false,
    airHeight: 0, impactTimer: 0, pushVelocity: 0 });
}
function world(duel) { return duel.course.groundAt(duel.state.s, duel.state.lateral); }
function sample(duel) {
  const state = duel.state;
  const keys = ['s', 'lateral', 'speedMph', 'headingError', 'yawVelocity', 'status',
    'nextLapGate', 'completedLaps', 'boundaryResets', 'majorCrashes', 'score', 'stageTimeSec'];
  const pick = actor => actor && Object.fromEntries(keys.map(key => [key, actor[key] ?? null]));
  return { player: pick(state), opponents: state.opponents.map(pick),
    traffic: state.traffic.map(pick), police: state.police, results: state.results };
}
function roadReplay(seed, enabled, fps = 60) {
  const duel = race(seed, 'falcone_f42', enabled);
  const start = { ...duel.course.groundAt(1320, -2), s: 1320, lateral: -2 };
  place(duel, start, { speed: 45 });
  duel.state.nextLapGate = 1;
  const samples = [];
  let tick = 0;
  // The same fixed 120 Hz input/simulation stream, delivered at shared wall
  // times by 30/60/144 Hz render schedules, as in the approved replay suite.
  for (let frame = 1; frame <= fps * 8; frame++) {
    const target = Math.min(960, Math.floor(frame * 120 / fps + 1e-9));
    while (tick < target) {
      const state = duel.state;
      const targetHeading = duel.course.at(state.s + 12).heading;
      const error = angle(duel.course.at(state.s).heading + state.headingError - targetHeading);
      duel.setInput({ throttle: state.speedMph < 45 ? .4 : 0, brake: 0,
        steer: clamp(error * 2 + (state.lateral + 2) * .05, -1, 1), boost: false });
      duel.step(1 / 120);
      if (++tick % 120 === 0) samples.push(sample(duel));
    }
  }
  assert.ok(duel.state.s > 1450, 'ordinary control must drive past the entrance');
  assert.equal(duel.state.boundaryResets, 0, 'ordinary control stays on the road');
  return hash(samples);
}
function ordinaryGeometry(course) {
  const planner = new NpcRoutePlanner(course, { car: CARS.falcone_f42,
    surfaceAt: (s, lateral) => course.surfaceAt(s, lateral) });
  return hash({ samples: course.samples, sections: course.sections,
    gates: course.features.lapGates, finish: course.features.checkpoints,
    shortcuts: course.features.shortcuts, map: buildRouteMapGeometry(course),
    npc: planner.cuts.map(cut => planner.profile(cut.id, 'medium')) });
}

// Record ONLY before implementation, explicitly, in this new fixture. Never
// regenerate existing signatures or replay fixtures to accommodate a change.
if (process.argv.includes('--record-baseline')) {
  const routes = Object.fromEntries(ROUTE_VARIANTS.map(route => [route.id, {
    seed: route.seed, geometry: ordinaryGeometry(courseFor(route.seed, false)),
    roadFollowing: roadReplay(route.seed, false),
  }]));
  writeFileSync(fixtureUrl, JSON.stringify({ version: 1, capturedCommit: '6592c43',
    scope: 'Pre-EGG-01 ordinary ABC map, racing/NPC route geometry and eight seconds of road following past the entrance; fixed 120 Hz simulation.', routes }, null, 2) + '\n');
  console.log('Hidden Road baseline: 3 pre-change ordinary route fingerprints recorded.');
  process.exit(0);
}
assert.equal(process.argv.length, 2, 'usage: node tools/test-hidden-road.mjs');
const baseline = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

check('dev-only switch and explicit construction', () => {
  assert.equal(FEATURE_STATES['hidden-road'], 'dev', 'hidden-road starts as a dev switch');
  assert.equal(createFeatureFlags({ storage: null, qa: false }).enabled('hidden-road'), false);
  assert.equal(createFeatureFlags({ storage: null, qa: true, search: '?flags=hidden-road' }).enabled('hidden-road'), true);
  assert.ok(!courseFor(1989, false).hiddenRoad, 'flag-off course has no corridor');
  assert.ok(!new Course(COURSE[1], 1989, { hiddenRoad: true }).hiddenRoad, 'other courses have no corridor');
  corridor(race().course); // Proves the actual game passes its feature flag.
});

for (const route of ROUTE_VARIANTS) {
  const label = route.label;
  const enabled = courseFor(route.seed);
  check(`${label} deterministic entrance and length`, () => {
    const road = corridor(enabled), again = corridor(courseFor(route.seed));
    assert.ok(road.length >= 900 && road.length <= 1200, 'exploration corridor must be 900-1200 m');
    assert.ok(Math.abs(road.entrance.s - 1408) <= .1, 'recorded entrance is at s=1408 m');
    assert.ok(Math.abs(road.entrance.lateral - 8.5) <= 1, 'mouth is near +8.5 m on the right');
    assert.equal(enabled.sectionAt(road.entrance.s).name, 'Mojave Canyon');
    assert.ok(enabled.at(road.entrance.s).curvature < 0, 'right side is outside this bend');
    assert.ok(!enabled.features.shortcuts.includes(road), 'corridor is not a racing shortcut');
    for (const progress of [0, 150, road.length - 300, road.length]) {
      assert.deepEqual(road.poseAt(progress), again.poseAt(progress), 'geometry is repeatable');
    }
    assert.ok(distance(road.poseAt(0), enabled.groundAt(road.entrance.s, road.entrance.lateral)) < .1, 'entrance joins actual ground');
  });
  check(`${label} continuous prepared ground and swept vehicle clearance`, () => {
    const road = corridor(enabled);
    let previous = road.poseAt(0), measured = 0;
    for (let progress = 5; progress <= road.length; progress += 5) {
      const point = road.poseAt(progress);
      const step = distance(previous, point);
      assert.ok(step > 4.7 && step < 5.3, 'progress measures actual continuous metres');
      measured += step;
      assert.ok(Math.abs(point.y - previous.y) < 1, 'prepared track has no cliff or ground seam');
      assert.ok(distance(point, enabled.groundAt(point.s, point.lateral)) < .2, 'simulation support agrees with corridor ground');
      assert.equal(road.contains(point.x, point.z), true, 'every centre sample is protected');
      for (const obstacle of enabled.features.obstacles) {
        assert.equal(sweepObstacle(previous, point, obstacle, point.heading,
          { halfWidth: 1.4, halfLength: 2.6, height: 3.6 }), null,
        `full Titan hull is blocked at ${progress} m by ${obstacle.id}`);
      }
      previous = point;
    }
    assert.ok(Math.abs(measured - road.length) <= 6, 'reported length matches measured drive');
  });
  check(`${label} straight salt-flat arrival`, () => {
    const road = corridor(enabled), start = road.poseAt(road.length - 300), end = road.poseAt(road.length);
    const heading = Math.atan2(end.x - start.x, end.z - start.z);
    assert.ok(Math.abs(Math.hypot(end.x - start.x, end.z - start.z) - 300) < 3, 'last 300 m goes directly to the gate');
    for (let progress = road.length - 300; progress <= road.length; progress += 25) {
      const point = road.poseAt(progress), cross = (point.x - start.x) * Math.cos(heading) - (point.z - start.z) * Math.sin(heading);
      assert.ok(Math.abs(cross) < .25, 'salt-flat centreline stays straight');
      assert.ok(Math.abs(angle(point.heading - heading)) < .02, 'arrival pose faces the gate');
    }
  });
  check(`${label} ordinary geometry, map, AI and RNG preserved`, () => {
    const ordinary = courseFor(route.seed, false);
    assert.equal(ordinaryGeometry(ordinary), baseline.routes[route.id].geometry, 'pre-change ordinary geometry fingerprint');
    assert.equal(ordinaryGeometry(enabled), baseline.routes[route.id].geometry, 'hidden corridor is absent from undiscovered map and NPC route plans');
    assert.deepEqual(Array.from({ length: 8 }, () => enabled.rng.float()), Array.from({ length: 8 }, () => ordinary.rng.float()), 'corridor does not consume racing RNG');
  });
  check(`${label} flag-on road-following fingerprint`, () => {
    for (const fps of [30, 60, 144]) for (const flag of [false, true]) {
      assert.equal(roadReplay(route.seed, flag, fps), baseline.routes[route.id].roadFollowing,
        `${fps} Hz, hidden-road=${flag}: ordinary race/traffic/opponent results must not change`);
    }
  });
  check(`${label} physical corridor has bounded protection and solid wash walls`, () => {
    const duel = race(route.seed), road = corridor(duel.course), middle = road.poseAt(250);
    const edge = side => {
      for (let offset = 1; offset <= 100; offset++) {
        const point = road.poseAt(250, offset * side);
        if (!road.contains(point.x, point.z)) return point;
      }
      assert.fail('corridor protection must end before 100 m from its centre');
    };
    for (const side of [-1, 1]) {
      const outside = edge(side);
      assert.equal(road.contains(outside.x, outside.z), false, 'outside edge has no corridor protection');
      assert.ok(duel.course.features.obstacles.some(obstacle => sweepObstacle(middle, outside, obstacle,
        middle.heading + side * Math.PI / 2, { halfWidth: 1, halfLength: 2.35, height: 1.2 })), 'solid wall stops a car from leaving the wash');
    }
  });
}

for (const car of Object.keys(CARS)) check(`${car} prepared dirt, outbound drive and return heading`, () => {
  const duel = race(1989, car), road = corridor(duel.course);
  // Clear dynamic actors only; preserve every real obstacle and surface.
  duel.state.traffic = []; duel.state.opponents = []; duel.state.rival = null;
  for (const [progress, reverse] of [[35, false], [100, true]]) {
    const pose = road.poseAt(progress);
    place(duel, pose, { heading: pose.heading + (reverse ? Math.PI : 0) });
    duel.setInput({ throttle: .2, brake: 0, steer: 0, boost: false });
    for (let tick = 0; tick < 60; tick++) duel.step(1 / 120);
    const after = world(duel), forward = (after.x - pose.x) * Math.sin(pose.heading) + (after.z - pose.z) * Math.cos(pose.heading);
    assert.ok(reverse ? forward < -3 : forward > 3, `${car} can physically drive ${reverse ? 'back toward the entrance' : 'into the wash'}`);
    assert.equal(duel.state.preparedGravel, true, `${car} receives prepared-dirt handling`);
    assert.equal(duel.state.boundaryResets, 0, `${car} gets no boundary or water reset`);
    assert.equal(duel.state.boundaryWarning, false, `${car} gets no out-of-bounds warning`);
    assert.equal(duel.state.majorCrashes, 0, `${car} has an unobstructed driving corridor`);
  }
});

check('player-only reset protection and ordinary outside controls', () => {
  const duel = race(), road = corridor(duel.course);
  const pose = road.poseAt(road.length - 100);
  assert.ok(Math.abs(pose.lateral) > 100, 'control uses a truly remote part of the corridor');
  place(duel, pose);
  duel._boundary(duel.state);
  assert.equal(duel.state.boundaryResets, 0, 'actual player protected deep in corridor');
  const npc = duel.state.rival;
  Object.assign(npc, { s: pose.s, prevS: pose.s, lateral: pose.lateral, prevLateral: pose.lateral });
  duel._boundary(npc);
  assert.ok(Math.abs(npc.lateral) < 10, 'NPC at identical corridor position is reset normally');
  const outside = { ...duel.course.groundAt(1408, -160), s: 1408, lateral: -160 };
  place(duel, outside);
  duel._boundary(duel.state);
  assert.equal(duel.state.boundaryResets, 1, 'ordinary land beyond corridor still resets');
  let water;
  for (let s = 2400; s < 3800 && !water; s += 50) {
    const point = duel.course.groundAt(s, 80);
    if (point.y < -14 && !road.contains(point.x, point.z)) water = { ...point, s, lateral: 80 };
  }
  assert.ok(water, 'real coast water control exists');
  place(duel, water);
  duel._boundary(duel.state);
  assert.equal(duel.state.boundaryResets, 2, 'water outside corridor still resets');
});

check('corridor travel cannot earn gates or cause missed-gate recovery', () => {
  const duel = race(), road = corridor(duel.course), events = [];
  duel.onChange((state, event) => { if (event.checkpointReset || event.lapCompleted) events.push(event); });
  duel.state.traffic = []; duel.state.opponents = []; duel.state.rival = null;
  duel.state.nextLapGate = 1;
  for (let progress = 25; progress < road.length - 20; progress += 10) {
    place(duel, road.poseAt(progress), { speed: 35 });
    duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false });
    duel.step(1 / 30);
    assert.equal(duel.state.nextLapGate, 1, 'exploration does not earn a racing checkpoint');
    assert.equal(duel.state.completedLaps, 0, 'exploration does not finish a lap');
    assert.equal(duel.state.boundaryResets, 0, 'exploration stays protected along the entire path');
    assert.equal(duel.state.status, progress < 150 ? 'racing' : 'exploring',
      'EGG-03 preserves the return window, then leaves the race after 150 physical corridor metres');
  }
  // If the real corridor projects across a racing gate, drive through that
  // exact projection in production step(), rather than skipping over it with
  // fixture placement. A layout confined between gates needs no special case.
  for (let progress = 10; progress < road.length - 10; progress += 10) {
    const before = road.poseAt(progress - 10), after = road.poseAt(progress);
    for (const gate of duel._lapGates) {
      if (!(before.s < gate && after.s >= gate)) continue;
      let low = progress - 10, high = progress;
      for (let iteration = 0; iteration < 20; iteration++) {
        const middle = (low + high) / 2;
        if (road.poseAt(middle).s < gate) low = middle; else high = middle;
      }
      const pose = road.poseAt(Math.max(0, low - .2));
      place(duel, pose, { speed: 35 });
      const originalGate = duel.state.nextLapGate;
      for (let tick = 0; tick < 12; tick++) duel.step(1 / 120);
      assert.equal(duel.state.nextLapGate, originalGate, 'physical corridor crossing cannot validate projected racing gate');
      assert.equal(duel.state.boundaryResets, 0);
    }
  }
  assert.deepEqual(events, [], 'exploration has no gate recovery or lap-completion event');
});

check('shared-time corridor movement at 30/60/144 Hz', () => {
  const run = fps => {
    const duel = race(), road = corridor(duel.course);
    duel.state.traffic = []; duel.state.opponents = []; duel.state.rival = null;
    place(duel, road.poseAt(road.length - 200), { speed: 30 });
    duel.setInput({ throttle: .2, brake: 0, steer: 0, boost: false });
    let tick = 0;
    for (let frame = 1; frame <= fps * 2; frame++) {
      const target = Math.floor(frame * 120 / fps + 1e-9);
      while (tick < target) { duel.step(1 / 120); tick++; }
    }
    assert.equal(duel.state.boundaryResets, 0);
    return sample(duel);
  };
  assert.deepEqual(run(30), run(60));
  assert.deepEqual(run(144), run(60));
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Hidden Road: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;

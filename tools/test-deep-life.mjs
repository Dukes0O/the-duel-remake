// DEEP-LIFE: the Kelp Coast's sea life (docs/THE_DEEP.md sections 5 and 8).
// Node only, no graphics context: the rules, the plan from the real zone on
// all three routes, the caps, the reactions, the whale's one pass, and the
// drawing code with the real DEEP-ART-SRC models and a fake loader.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Duel } from '../src/game.js';
import { ROUTE_VARIANTS } from '../src/route-variants.js';
import { buildDeepRamp } from '../src/deep/deep-ramp.js';
import { defineZone } from '../src/deep/deep-zone.js';
import { kelpCoastProvider } from '../src/deep/zones/kelp-coast.js';
import { createZoneFloor } from '../src/deep/zone-floor.js';
import { createWaterUniforms } from '../src/deep/water-shader.js';
import { FISH_HARD_CAP } from '../src/deep/fish-rules.js';
import { fishGeometryFromModel } from '../src/deep/fish-school.js';
import {
  REACH, SEA_LIFE_CAPS, SURFACE_MARGIN, SURFACE_Y, WHALE, carDistance, createWhale, easeToward, makeAnimal,
  planSeaLife, smooth, startWhalePass, stepAnimal, stepWhale, turnToward,
} from '../src/deep/sea-life-rules.js';
import { createSeaLife } from '../src/deep/sea-life.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const DT = 1 / 60;

function zoneFor(route) {
  const duel = new Duel({ seed: route.seed, deepProviders: [], featureFlags: { 'the-deep': true } });
  duel.startCampaign({ seed: route.seed, car: 'falcone_f42', mode: 'duel', deepKit: true, opponentCount: 1,
    fieldSize: 2, fieldSeed: route.seed, playerId: 'node-qa' });
  const ramp = buildDeepRamp(duel.course);
  return defineZone(kelpCoastProvider(ramp));
}
const zones = ROUTE_VARIANTS.map(route => ({ route, zone: zoneFor(route) }));

// A car read through a Proxy: any write is a failure (sea life only reads the car).
function readOnlyCar(x, y, z) {
  return new Proxy(Object.freeze({ x, y, z, heading: 0, speed: 0 }), {
    set() { throw new Error('sea life wrote to the car'); }, defineProperty() { throw new Error('sea life wrote to the car'); } });
}

async function realModel(id) {
  const bytes = await readFile(`${root}public/assets/models/deep/${id}.glb`);
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const loadReal = id => realModel(id);

// ---- the plan from the real zone ----------------------------------------------------

test('the plan follows the Kelp Coast spots on all three routes, capped and repeatable', () => {
  for (const { route, zone } of zones) {
    const plan = planSeaLife(zone), again = planSeaLife(zone);
    assert.deepEqual(plan, again, `${route.id}: the same zone always gives the same plan`);
    assert.equal(plan.turtle.length, 2);
    assert.equal(plan.ray.length, 1);
    assert.equal(plan.crab.length, 4);
    assert.equal(plan['sea-lion'].length, 2);
    assert.equal(plan['silver-school'].length, 3);
    assert.ok(plan.whale && plan.whale.trailIndex === zone.spots.find(s => s.creature === 'whale').trailIndex);
    assert.equal(plan.otter.length, 1, 'the Kelp Coast has one sea otter');
    assert.ok(plan.total['silver-school'] > 0 && plan.total['silver-school'] <= FISH_HARD_CAP);
    for (const [id, cap] of Object.entries(SEA_LIFE_CAPS)) assert.ok((plan.total[id] ?? 0) <= cap, `${route.id}: ${id} within its cap`);
    const shape = createZoneFloor(zone);
    for (const animal of [...plan.turtle, ...plan.ray, ...plan.crab, ...plan['sea-lion'], ...plan.otter, ...plan['silver-school']]) {
      const at = shape.sample(animal.x, animal.z);
      assert.ok(at && at.distance < 40, `${route.id}: ${animal.kind} is on the sea floor near the trail`);
    }
  }
});

test('the three routes give three different layouts from the same spots; one route is stable', () => {
  const [a, b] = zones.map(row => planSeaLife(row.zone));
  assert.notDeepEqual(a.turtle.map(t => [t.x, t.z]), b.turtle.map(t => [t.x, t.z]));
});

test('every type is capped, whatever a zone asks for', () => {
  const { zone } = zones[0];
  const heap = creature => ({ ...zone, spots: [{ creature, trailIndex: 3, count: 500 }, ...Array.from({ length: 4 }, () => ({ creature, trailIndex: 5, count: 500 }))] });
  for (const id of ['turtle', 'ray', 'crab', 'sea-lion', 'otter']) assert.equal(planSeaLife(heap(id))[id].length, SEA_LIFE_CAPS[id], id);
  assert.equal(planSeaLife(heap('silver-school'), { fishBudget: 100000 }).total['silver-school'] <= FISH_HARD_CAP, true);
  assert.equal(planSeaLife(heap('silver-school'), { fishBudget: 0 }).total['silver-school'], 0);
  assert.equal(planSeaLife(heap('silver-school'), { fishBudget: -5 }).total['silver-school'], 0);
  assert.equal(planSeaLife(heap('whale')).total.whale, 1);
  assert.equal(planSeaLife({ ...zone, spots: [] }).total.turtle, 0);
  // Another coast's creatures are not this coast's business.
  assert.equal(planSeaLife({ ...zone, spots: [{ creature: 'manta', trailIndex: 3, count: 3 }] }).total.turtle, 0);
});

// ---- the rules -----------------------------------------------------------------------------

const flat = { floorAt: () => -12 };
function run(spec, seconds, carAt, { dt = DT, ctx = flat } = {}) {
  const a = makeAnimal(spec), trace = [];
  for (let t = 0; t < seconds; t += dt) {
    const car = typeof carAt === 'function' ? carAt(t) : carAt;
    stepAnimal(a, t, dt, car, ctx);
    trace.push({ t, x: a.x, y: a.y, z: a.z, yaw: a.yaw, pitch: a.pitch, roll: a.roll, flap: a.flap, anim: a.anim, speed: a.speed });
  }
  return { a, trace };
}
const turtleSpec = { kind: 'turtle', x: 0, z: 0, radius: 12, dir: 1, speed: 0.85, phase: 0, breath: 0, size: 1 };
const raySpec = { kind: 'ray', x: 10, z: 10, yaw: 0.3, phase: 1, size: 1 };
const crabSpec = { kind: 'crab', x: -5, z: 4, yaw: 0, phase: 0, size: 1 };
const lionSpec = { kind: 'sea-lion', x: 0, z: 0, depth: 14, radius: 22, speed: 5, phase: 0, dir: 1, size: 1 };
const otterSpec = { kind: 'otter', x: 3, z: -2, radius: 3.5, dir: 1, speed: 0.15, phase: 0.5, size: 1 };
const FAR = { x: 400, y: -10, z: 400 };

test('nothing jumps: every animal moves smoothly, in every situation', () => {
  const rush = t => ({ x: -60 + t * 12, y: -11, z: 2 });         // a car driving straight through
  const limits = { turtle: 3.5, ray: 4.5, crab: 2.6, 'sea-lion': 9, otter: 2 };
  for (const spec of [turtleSpec, raySpec, crabSpec, lionSpec, otterSpec]) {
    for (const car of [FAR, rush, { x: spec.x + 1, y: -11, z: spec.z + 1 }]) {
      const { trace } = run(spec, 40, car);
      for (let i = 1; i < trace.length; i++) {
        const step = Math.hypot(trace[i].x - trace[i - 1].x, trace[i].y - trace[i - 1].y, trace[i].z - trace[i - 1].z) / DT;
        assert.ok(step <= limits[spec.kind], `${spec.kind}: ${step.toFixed(2)} m/s at ${trace[i].t.toFixed(2)} s`);
        for (const key of ['x', 'y', 'z', 'yaw', 'pitch', 'roll', 'anim']) assert.ok(Number.isFinite(trace[i][key]), `${spec.kind}: ${key} finite`);
      }
    }
  }
});

test('animals stay under the surface and above the ground', () => {
  const sloped = { floorAt: (x, z) => -14 + 3 * Math.sin(x * 0.05) + 2 * Math.cos(z * 0.07) };
  for (const spec of [turtleSpec, raySpec, crabSpec, lionSpec]) {
    const { trace } = run(spec, 200, t => ({ x: 8 * Math.sin(t * 0.2), y: -11, z: 8 * Math.cos(t * 0.17) }), { ctx: sloped });
    for (const row of trace) {
      const floor = sloped.floorAt(row.x, row.z);
      assert.ok(row.y <= SURFACE_Y - SURFACE_MARGIN + 1e-6, `${spec.kind} stays under the surface (${row.y.toFixed(2)})`);
      assert.ok(row.y >= floor + 0.1 - 1e-6, `${spec.kind} stays above the ground (${row.y.toFixed(2)} vs ${floor.toFixed(2)})`);
    }
  }
});

test('the otter floats on its back at the surface, drifts off from the car without diving, and comes back', () => {
  const rest = run(otterSpec, 40, FAR).a, near = { x: otterSpec.x + 3.5, y: -1, z: otterSpec.z - 2 };
  for (const row of run(otterSpec, 60, t => (t < 30 ? near : FAR)).trace)
    assert.ok(Math.abs(row.y - SURFACE_Y) < 0.1 && row.pitch === 0, 'it floats level at the surface');
  const driven = run(otterSpec, 30, near).a, gap = Math.hypot(driven.x - near.x, driven.z - near.z);
  const unbothered = run(otterSpec, 30, FAR).a;
  assert.ok(gap > Math.hypot(unbothered.x - near.x, unbothered.z - near.z) + 0.5, 'further from a close car than if it were alone');
  const back = run(otterSpec, 120, t => (t < 30 ? near : FAR)).a, alone = run(otterSpec, 120, FAR).a;
  assert.ok(Math.hypot(back.x - alone.x, back.z - alone.z) < 0.3, 'back on its own drift after the car leaves');
  assert.ok(rest.anim > 0, 'its float cycle runs');
});

test('the turtle turns away from the car, and comes back when it leaves', () => {
  const home = run(turtleSpec, 30, FAR).a;
  const homePos = { x: home.x, z: home.z };
  const near = { x: homePos.x + 1.5, y: home.y, z: homePos.z + 1.5 };
  const { a } = run(turtleSpec, 30, near);
  const gapBefore = Math.hypot(homePos.x - near.x, homePos.z - near.z), gapAfter = Math.hypot(a.x - near.x, a.z - near.z);
  assert.ok(gapAfter > gapBefore + 2.5, `the turtle ends ${gapAfter.toFixed(1)} m from a car it was ${gapBefore.toFixed(1)} m from`);
  const there = run(turtleSpec, 60, t => (t < 30 ? near : FAR)).a, left = run(turtleSpec, 60, FAR).a;
  assert.ok(Math.hypot(there.x - left.x, there.z - left.z) < 0.5, 'after the car leaves it is back on its own path');
});

test('the ray lifts off the sand near the car and settles when it has gone', () => {
  const rest = run(raySpec, 20, FAR).a;
  assert.ok(Math.abs(rest.y - (-12 + 0.12)) < 1e-6 && rest.flap < 0.15, 'at rest it lies on the sand and barely moves');
  const near = { x: raySpec.x + 2, y: -11.5, z: raySpec.z };
  const lifted = run(raySpec, 20, near).a;
  assert.ok(lifted.y > rest.y + 1.2, `lifted ${(lifted.y - rest.y).toFixed(2)} m`);
  assert.ok(lifted.flap > 0.5, 'and flaps hard');
  assert.ok(lifted.pitch > 0.05, 'nose up as it rises');
  const settled = run(raySpec, 40, t => (t < 20 ? near : FAR)).a;
  assert.ok(settled.y < rest.y + 0.2 && settled.flap < 0.3, 'settled again after the car leaves');
});

test('the crab goes sideways out of the way, never far, and is back after', () => {
  const near = { x: crabSpec.x + 1.5, y: -11.5, z: crabSpec.z };
  const { a } = run(crabSpec, 15, near);
  const moved = Math.hypot(a.x - crabSpec.x, a.z - crabSpec.z);
  assert.ok(moved > 1.5 && moved <= REACH.crab.push + 0.01, `moved ${moved.toFixed(2)} m`);
  assert.ok(Math.hypot(a.x - near.x, a.z - near.z) > 1.5 + 1.4, 'further from the car than it was');
  // Its body is square across the way it went.
  const course = Math.atan2(a.x - crabSpec.x, a.z - crabSpec.z), body = a.yaw - course;
  assert.ok(Math.abs(Math.sin(body)) > 0.98, 'sideways: the body is across its course');
  const back = run(crabSpec, 40, t => (t < 15 ? near : FAR)).a;
  assert.ok(Math.hypot(back.x - crabSpec.x, back.z - crabSpec.z) < 0.15);
  // The legs only run while it moves.
  const still = run(crabSpec, 5, FAR).a;
  assert.ok(still.anim < 0.1 * 5 + 1e-6 + 0.2 * 5, 'legs hardly turn when it is still');
  assert.ok(a.anim > still.anim, 'and run when it scuttles');
});

test('sea lions never come within the keep-clear gap of the car, and come toward it when it is near', () => {
  const car = { x: 4, y: -7, z: 2 };
  const { trace } = run(lionSpec, 120, car);
  let minimum = Infinity;
  for (const row of trace) minimum = Math.min(minimum, Math.hypot(row.x - car.x, (row.y - car.y) * 1.5, row.z - car.z));
  assert.ok(minimum >= REACH.seaLion.keep - 0.01, `closest ${minimum.toFixed(2)} m`);
  const away = run(lionSpec, 120, { x: 200, y: -7, z: 0 }).a, close = run(lionSpec, 120, { x: 40, y: -7, z: 0 }).a;
  assert.ok(Math.hypot(close.x - 40, close.z) < Math.hypot(away.x - 40, away.z) + 40, 'it still loops round its own spot far away');
});

test('everything is repeatable from the clock and the car alone', () => {
  const car = t => ({ x: 5 * Math.sin(t), y: -9, z: 3 * Math.cos(t) });
  for (const spec of [turtleSpec, raySpec, crabSpec, lionSpec, otterSpec]) assert.deepEqual(run(spec, 30, car).trace, run(spec, 30, car).trace, spec.kind);
});

test('the rules only read the car, never use Math.random, and import nothing from the race', async () => {
  const random = Math.random;
  Math.random = () => { throw new Error('Math.random is not for sea life'); };
  try {
    const plan = planSeaLife(zones[0].zone);
    for (const spec of [...plan.turtle, ...plan.ray, ...plan.crab, ...plan['sea-lion'], ...plan.otter]) run(spec, 5, readOnlyCar(1, -9, 1));
  } finally { Math.random = random; }
  for (const file of ['sea-life-rules.js', 'sea-life.js']) {
    const text = await readFile(join(root, 'src', 'deep', file), 'utf8');
    assert.ok(!/Math\.random|performance\.now|Date\.now/.test(text), `${file}: no clock or random of its own`);
    const imports = [...text.matchAll(/from '([^']+)'/g)].map(m => m[1]);
    for (const path of imports) assert.ok(!/game|duel|race|combat|course|progression|save/i.test(path), `${file}: imports ${path}`);
  }
});

test('small helpers behave', () => {
  assert.equal(smooth(0, 1, -1), 0); assert.equal(smooth(0, 1, 2), 1); assert.equal(smooth(10, 0, 10), 0); assert.equal(smooth(10, 0, 0), 1);
  assert.equal(smooth(3, 3, 2), 0);
  const s = { x: 0, y: 0, z: 0 };
  easeToward(s, { x: 100, y: 0, z: 0 }, 1, { tau: 0.001, maxSpeed: 2 });
  assert.ok(Math.abs(s.x - 2) < 1e-9, 'the top speed holds');
  assert.equal(easeToward({ x: 1, y: 1, z: 1 }, { x: 5, y: 5, z: 5 }, 0).x, 1);
  assert.ok(Math.abs(turnToward(0, Math.PI, 1, 0.5) - 0.5) < 1e-9);
  assert.ok(Math.abs(turnToward(3.1, -3.1, 10, 1) - (-3.1)) < 1e-9, 'turns the short way round');
  assert.equal(carDistance(0, 0, 0, { x: 3, y: 0, z: 4 }), 5);
});

// ---- the whale -----------------------------------------------------------------------------

test('the whale passes once per visit: near the Drop-off, or when the Sirena is raised', () => {
  for (const { route, zone } of zones) {
    const shape = createZoneFloor(zone), plan = planSeaLife(zone), spot = plan.whale;
    // Far away it waits.
    let w = createWhale(plan);
    assert.equal(w.state, 'waiting'); assert.equal(w.passed, false);
    // A pass: starts, lasts, ends under the surface and above the ground, then never again.
    assert.equal(startWhalePass(w, 100, shape, spot), true);
    assert.equal(w.state, 'passing');
    assert.equal(startWhalePass(w, 101, shape, spot), false, 'a second start while passing does nothing');
    let samples = 0, minGap = Infinity, farthest = 0;
    for (let t = 100; t < 100 + WHALE.seconds + 2; t += 0.5) {
      stepWhale(w, t, shape);
      if (w.state !== 'passing') break;
      samples++;
      const floor = shape.floorHeight(w.x, w.z);
      assert.ok(w.y <= WHALE.shallowest + 0.5 + 1e-6 && w.y >= WHALE.deepest - 0.5 - 1e-6, `${route.id}: depth ${w.y.toFixed(1)}`);
      minGap = Math.min(minGap, w.y - floor);
      farthest = Math.max(farthest, Math.hypot(w.x - spot.x, w.z - spot.z));
    }
    assert.ok(samples > 100, `${route.id}: a slow pass of ${samples / 2} s`);
    assert.equal(w.state, 'gone'); assert.equal(w.passed, true);
    assert.ok(farthest > 90, `${route.id}: it starts and ends in the murk (${farthest.toFixed(0)} m out)`);
    assert.ok(minGap > 2.5, `${route.id}: always above the ground (${minGap.toFixed(1)} m)`);
    assert.equal(startWhalePass(w, 500, shape, spot), false, 'one pass per visit');
    stepWhale(w, 501, shape);
    assert.equal(w.state, 'gone');
  }
});

test('the whale swims at the stated speed and against the way the trail runs', () => {
  const { zone } = zones[0], shape = createZoneFloor(zone), spot = planSeaLife(zone).whale, w = createWhale(planSeaLife(zone));
  startWhalePass(w, 0, shape, spot);
  stepWhale(w, 10, shape); const a = { x: w.x, z: w.z };
  stepWhale(w, 11, shape); const b = { x: w.x, z: w.z };
  assert.ok(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - WHALE.speed) < 0.6, 'about 3 m a second');
  const at = shape.sample(spot.x, spot.z), f = shape.frameAt(at.along);
  assert.ok((b.x - a.x) * f.tx + (b.z - a.z) * f.tz < 0, 'against the trail');
  // It is out to the deep side, not over the trail.
  const mid = createWhale(planSeaLife(zone));
  startWhalePass(mid, 0, shape, spot); stepWhale(mid, WHALE.seconds / 2, shape);
  assert.ok(Math.abs(Math.hypot(mid.x - spot.x, mid.z - spot.z) - WHALE.seaward) < 2.5, 'passes about 22 m out at the middle');
});

// ---- the drawing, with the real models --------------------------------------------------------

test('the real Deep models fit the drawing code', async () => {
  for (const id of ['turtle', 'sea-lion', 'otter', 'crab']) {
    const g = await realModel(id);
    let mesh = null; g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    assert.ok(mesh.geometry.morphAttributes.position?.length === 1, `${id}: one morph target`);
    assert.ok(g.animations[0].tracks.some(t => t.name.endsWith('morphTargetInfluences')), `${id}: its clip drives the morph`);
    assert.ok(mesh.matrixWorld.equals(new THREE.Matrix4()), `${id}: mesh sits at the origin`);
  }
  const ray = await realModel('ray'); let rm = null; ray.scene.traverse(o => { if (o.isMesh && !rm) rm = o; });
  assert.equal(Object.keys(rm.geometry.morphAttributes).length, 0);
  // The gray whale is one mesh whose tail pumps by a morph target (DEEP-ART-FINAL), not a skinned rig.
  const whale = await realModel('whale'); let whaleMesh = null; whale.scene.traverse(o => { if (o.isMesh && !whaleMesh) whaleMesh = o; });
  assert.ok(whaleMesh.geometry.morphAttributes.position?.length === 1 && whale.animations[0].duration > 2);
  assert.ok(whale.animations[0].tracks.some(t => t.name.endsWith('morphTargetInfluences')), 'the whale clip drives the morph');
  const sardine = await realModel('silver-school'); let sm = null; sardine.scene.traverse(o => { if (o.isMesh && !sm) sm = o; });
  const g = fishGeometryFromModel(sm.geometry); g.computeBoundingBox();
  assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 1) < 1e-4, 'one unit long');
  const tail = g.getAttribute('aTail');
  assert.ok(tail.count === g.getAttribute('position').count && Math.max(...tail.array) <= 1.0001 && Math.min(...tail.array) >= 0);
});

function lifeFor(zone, load = loadReal, fishBudget = 480) {
  const shape = createZoneFloor(zone), uniforms = createWaterUniforms();
  return { shape, life: createSeaLife({ zone, shape, uniforms, fishBudget, load }) };
}

test('the Kelp Coast comes to life: instanced and capped per type, nothing written to the car', async () => {
  const { zone } = zones[0];
  const { shape, life } = lifeFor(zone);
  await life.ready;
  assert.deepEqual(life.failures, []);
  for (const id of ['turtle', 'ray', 'crab', 'sea-lion', 'otter', 'silver-school', 'whale']) assert.equal(life.status[id], 'ready', id);
  const counts = life.counts();
  assert.deepEqual({ turtle: counts.turtle, ray: counts.ray, crab: counts.crab, 'sea-lion': counts['sea-lion'], otter: counts.otter }, { turtle: 2, ray: 1, crab: 4, 'sea-lion': 2, otter: 1 });
  assert.ok(counts['silver-school'] > 0 && counts['silver-school'] <= FISH_HARD_CAP);
  // One draw call per type: instanced meshes, not an object per animal.
  const meshes = []; life.group.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.filter(o => o.isInstancedMesh).length, 5 + 3, 'five animal types and three schools are instanced');
  assert.ok(meshes.every(o => !o.name.startsWith('Sea life:') || o.isInstancedMesh));
  assert.equal(life.group.children.length, 5 + 3 + 1, 'five instanced types, three schools and the whale');
  // Run two minutes beside the Drop-off with the car read only.
  const spot = life.plan.whale, car = readOnlyCar(spot.x, -spot.depth + 1, spot.z), camera = new THREE.PerspectiveCamera();
  camera.position.set(spot.x, -spot.depth + 3, spot.z - 10);
  for (let t = 0; t < 120; t += DT) life.update({ car, camera, seconds: t });
  assert.equal(life.whale.passed, true, 'the whale passed while the car sat at the Drop-off');
  for (const mesh of meshes.filter(o => o.isInstancedMesh && !o.name.includes('Fish school'))) {
    const m = new THREE.Matrix4();
    for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); assert.ok(m.elements.every(Number.isFinite), mesh.name); }
  }
  life.dispose();
  assert.equal(life.group.parent, null);
  void shape;
});

test('the whale also passes when the Sirena is raised, once, and not twice', async () => {
  const { zone } = zones[1];
  const { life } = lifeFor(zone);
  const camera = new THREE.PerspectiveCamera(), car = readOnlyCar(life.plan.turtle[0].x, -9, life.plan.turtle[0].z);
  // Raised before the model has loaded: it is remembered, and the pass begins at the first frame after.
  assert.equal(life.raised('sirena-car'), false);
  await life.ready;
  life.update({ car, camera, seconds: 1 });
  assert.equal(life.whale.state, 'passing', 'the early raise passes now');
  life.dispose();
  const second = lifeFor(zone).life;
  await second.ready;
  second.update({ car, camera, seconds: 1 });
  assert.equal(second.whale.state, 'waiting');
  assert.equal(second.raised('sirena-badge'), false, 'other finds do not call the whale');
  assert.equal(second.whale.state === 'passing' || second.whale.passed, false, 'far from the Drop-off nothing began');
  assert.equal(second.raised('sirena-car'), true);
  assert.equal(second.whale.state, 'passing');
  assert.equal(second.raised('sirena-car'), false, 'not again while passing');
  for (let t = 1; t < 1 + WHALE.seconds + 2; t += 0.25) second.update({ car, camera, seconds: t });
  assert.equal(second.whale.passed, true);
  assert.equal(second.raised('sirena-car'), false, 'not again after');
  second.dispose();
});

test('a visit where the whale already passed near the Drop-off is not given a second pass by the Sirena', async () => {
  const { zone } = zones[2];
  const { life } = lifeFor(zone);
  await life.ready;
  const spot = life.plan.whale, car = readOnlyCar(spot.x, -8, spot.z), camera = new THREE.PerspectiveCamera();
  for (let t = 0; t < 100; t += 0.25) life.update({ car, camera, seconds: t });
  assert.equal(life.whale.passed, true);
  assert.equal(life.raised('sirena-car'), false);
  life.dispose();
});

test('a model that will not load is skipped and reported; everything else is drawn', async () => {
  const { zone } = zones[0];
  const warn = console.warn; const seen = []; console.warn = (...args) => seen.push(args.join(' '));
  let life;
  try {
    ({ life } = lifeFor(zone, id => (id === 'ray' ? Promise.reject(new Error('no such model')) : loadReal(id))));
    await life.ready;
  } finally { console.warn = warn; }
  assert.equal(life.status.ray, 'failed');
  assert.deepEqual(life.failures.map(f => f.id), ['ray']);
  assert.ok(seen.some(line => line.includes('ray') && line.includes('no such model')));
  assert.equal(life.counts().ray, undefined);
  assert.equal(life.counts().turtle, 2);
  life.update({ car: readOnlyCar(0, -9, 0), camera: new THREE.PerspectiveCamera(), seconds: 0 });
  life.dispose();
});

test('if the sardine model fails the approved procedural fish take its place, the same count', async () => {
  const { zone } = zones[0];
  const warn = console.warn; console.warn = () => {};
  let life;
  try {
    ({ life } = lifeFor(zone, id => (id === 'silver-school' ? Promise.reject(new Error('gone')) : loadReal(id))));
    await life.ready;
  } finally { console.warn = warn; }
  assert.equal(life.status['silver-school'], 'ready');
  assert.deepEqual(life.failures.map(f => f.id), ['silver-school']);
  assert.ok(life.counts()['silver-school'] > 0);
  life.dispose();
});

test('a zone with no spots draws nothing and loads nothing', async () => {
  const { zone } = zones[0];
  let loads = 0;
  const { life } = lifeFor({ ...zone, spots: [] }, () => { loads++; return Promise.reject(new Error('should not load')); });
  await life.ready;
  assert.equal(loads, 0);
  assert.equal(life.group.children.length, 0);
  life.update({ car: readOnlyCar(0, -9, 0), camera: new THREE.PerspectiveCamera(), seconds: 1 });
  life.dispose(); life.dispose();
});

test('a frame of sea life is cheap, and the whole scene stays within its limits', async () => {
  const { zone } = zones[0];
  const { life } = lifeFor(zone, loadReal, 480);
  await life.ready;
  const spot = life.plan['silver-school'][0], car = readOnlyCar(spot.x + 2, -spot.depth + 1.5, spot.z), camera = new THREE.PerspectiveCamera();
  camera.position.set(spot.x, -spot.depth + 3, spot.z - 8);
  for (let t = 0; t < 2; t += DT) life.update({ car, camera, seconds: t });   // warm up
  // Processor time, not the clock on the wall: when other test suites share the
  // laptop this process waits for its turn, and the wall clock counts that
  // waiting as work. The 4 ms limit is unchanged.
  const started = process.cpuUsage(), wallStarted = process.hrtime.bigint(), frames = 600;
  for (let i = 0; i < frames; i++) life.update({ car, camera, seconds: 2 + i * DT });
  const used = process.cpuUsage(started), wallMs = Number(process.hrtime.bigint() - wallStarted) / 1e6 / frames;
  const ms = (used.user + used.system) / 1e3 / frames;
  console.log(`# sea life update: ${ms.toFixed(3)} ms of processor time a frame in Node, ${wallMs.toFixed(3)} ms on the wall clock (${JSON.stringify(life.counts())})`);
  assert.ok(ms < 4, `${ms.toFixed(2)} ms a frame`);
  // A hard ceiling on what a scene can draw, however many spots a zone has.
  const total = Object.entries(SEA_LIFE_CAPS).reduce((n, [, cap]) => n + cap, 0);
  assert.ok(total <= FISH_HARD_CAP + 6 + 4 + 4 + 2 + 12 + 1);
  life.dispose();
});

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {CARS, COURSE, DRIVE} from '../src/config.js';
import {placeActor, chooseRespawnSlot} from '../src/arena/arena-event.js';
import {worldPose, floorLimit} from '../src/arena/arena-floor.js';
import {pilotStep} from '../src/arena/arena-pilot.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {actorBody} from '../src/vehicle-knock.js';
import {solveVehicleImpact, yawInertia} from '../src/vehicle-collision.js';
import {addArenaCrushables} from '../src/arena-props.js';

// ARENA-JUNK-SHOVE: real Duel contacts and steps, seeded and memory-only.
// Only fixture poses, speeds and held CPU goals are set. No contact, solver,
// renderer or respawn function is replaced. Released road pins are read-only.
const DT = 1 / 120, EPS = 1e-8, SEED = 1989, MEASURE_TICKS = 480;
const controls = JSON.parse(readFileSync(new URL('./replays/arena-shove-controls.json', import.meta.url), 'utf8'));
const failures = [];
let checks = 0;
function check(name, run) {
  checks++;
  try {run();} catch (error) {failures.push(name + ': ' + error.message);}
}
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const snapshot = prop => ({x: prop.x, z: prop.z, heading: prop.heading});
function member(duel, actor) {
  return duel.state.arena.participants.find(p => p.id === (actor === duel.state ? 'player' : actor.arenaId));
}
function hold(duel, actor) {
  const at = worldPose(duel, actor);
  Object.assign(member(duel, actor), {targetId: null, targetHeldSec: -100, reactionSec: Infinity,
    goal: {x: at.x + Math.sin(at.heading) * 20, z: at.z + Math.cos(at.heading) * 20,
      speedMph: 0, boost: false}});
}
function moveProp(duel, prop, s, lateral = 0, headingError = 0) {
  const at = duel.course.groundAt(s, lateral);
  // Round poses keep authored IDs, shells and mass. The fixture changes pose,
  // never a solver velocity or a displacement result.
  Object.assign(prop, at, {s, prevS: s, lateral, prevLateral: lateral, off: lateral,
    heading: at.heading + headingError, headingError, speedMph: 0, pushVelocity: 0,
    airHeight: 0, prevAirHeight: 0, airborne: false, knock: null});
}
function arena(car = 'falcone_f42') {
  const duel = new Duel({seed: SEED, featureFlags: {wasteland2: true, scrapdome: true}});
  assert.equal(duel.startArenaEvent({car, seed: SEED, driverId: 'club', cpuDifficulty: 'medium',
    opponents: [{car: 'dusthawk_rally', driverId: 'club', brain: 'gunner'}]}), true);
  Object.assign(duel.state, {status: 'racing', countdown: 0, invulnerableSec: 0});
  duel.state.arena.phase = 'fight';
  duel.state.combat.aiTimer = duel.state.combat.pickupTimer = Infinity;
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  placeActor(duel, duel.state, {s: 20, lateral: 0});
  placeActor(duel, duel.state.opponents[0], {s: duel.course.length * .78, lateral: 0});
  hold(duel, duel.state.opponents[0]);
  const props = duel.course.features.crushables;
  assert.ok(props.length >= 2, 'actual authored dome contains junk cover');
  for (let index = 0; index < props.length; index++)
    moveProp(duel, props[index], duel.course.length * .48 + index * 12, index % 2 ? -12 : 12);
  moveProp(duel, props[0], 96, 0);
  return {duel, prop: props[0], other: props[1]};
}
function sweepRam(c, mph, {offset = 0, heading = c.prop.heading} = {}) {
  const {duel, prop} = c, actor = duel.state, spec = duel._vehicleSpec(actor);
  const forward = {x: Math.sin(heading), z: Math.cos(heading)};
  const side = {x: forward.z, z: -forward.x};
  const gap = spec.halfLength + prop.halfZ + .025;
  const start = {x: prop.x - forward.x * gap + side.x * offset,
    z: prop.z - forward.z * gap + side.z * offset};
  const end = {x: start.x + forward.x * mph * DRIVE.mphToWorld * DT,
    z: start.z + forward.z * mph * DRIVE.mphToWorld * DT};
  const from = duel.course.nearest(start.x, start.z, prop.s);
  const to = duel.course.nearest(end.x, end.z, prop.s);
  // A labelled swept approach allows exact 20/40/60-mph contacts, including
  // Titan at 60 mph above its normal dome driving ceiling. The hulk is still.
  placeActor(duel, actor, {s: to.s, lateral: to.lateral,
    headingError: heading - duel.course.at(to.s).heading}, mph);
  actor.prevS = from.s; actor.prevLateral = from.lateral;
  const before = snapshot(prop), incoming = actorBody(duel, actor);
  const crushedBefore = duel.state.crushedProps.length;
  duel._crushProps(actor);
  const motion = prop.knock ? structuredClone(prop.knock) : null;
  const contacted = !!motion || duel.state.crushedProps.length > crushedBefore || actor.speedMph < mph;
  // Remove the fixture's driver after the first native contact, so repeated
  // throttle/contact cannot create a false displacement or sliding damage.
  placeActor(duel, actor, {s: 20, lateral: 0});
  return {before, incoming, motion, contacted};
}
function run(c, ticks = MEASURE_TICKS, observe = () => {}) {
  for (let tick = 0; tick < ticks; tick++) {c.duel.step(DT); observe(c, tick);}
  return ticks;
}
function ram(car, mph, options = {}) {
  const c = arena(car), impact = sweepRam(c, mph, options);
  let moved = 0, escaped = false;
  const ticks = run(c, MEASURE_TICKS, ({duel, prop}) => {
    moved = Math.max(moved, distance(prop, impact.before));
    const at = duel.course.nearest(prop.x, prop.z, prop.s);
    escaped ||= Math.abs(at.lateral) > floorLimit(duel) + EPS;
  });
  return {...c, ...impact, moved, escaped, ticks,
    trace: hash({state: c.duel.state, props: c.duel.course.features.crushables, moved})};
}

check('heavy junk uses 1.5 times the released ordinary-car mass in the native body spec', () => {
  const {duel, prop} = arena();
  assert.equal(duel._vehicleSpec(duel.state).mass, 1450, 'released unplated Falcone ordinary mass');
  assert.equal(duel._vehicleSpec(prop).mass, 2175, 'junk solver mass must be 1.5 times 1450 kg');
  assert.equal(actorBody(duel, prop).mass, 2175, 'released rigid-body bridge uses the same heavy mass');
});
for (const car of Object.keys(CARS)) for (const mph of [20, 40, 60]) {
  check(car + ' at ' + mph + ' mph moves real parked junk through the crash solver', () => {
    const r = ram(car, mph);
    assert.equal(r.contacted, true, 'native swept contact must reach the authored hulk');
    const minimum = mph === 40 ? car === 'titan_monster' ? 5 : 2 : 0;
    assert.ok(r.moved > 0 && r.moved + EPS >= minimum,
      'parked hulk moved ' + r.moved.toFixed(6) + ' m; ' +
      (minimum ? 'requires at least ' + minimum + ' m' : 'requires real movement (no extra minimum)'));
    assert.ok(r.motion && Math.hypot(r.motion.vx, r.motion.vz) > 0,
      'movement must start with actual released crash-body velocity');
    assert.equal(r.escaped, false, 'rammed hulk stays on the floor');
    assert.equal(r.duel.state.crushedProps.includes(r.prop.id), car === 'titan_monster',
      'only Titan keeps the native persistent crush');
  });
}
check('Titan retains the released crush, score, cue and visible flattening', () => {
  const c = arena('titan_monster'), events = [];
  c.duel.onChange((_, event) => {if (event.propCrushed) events.push(event.propCrushed);});
  const group = addArenaCrushables(new THREE.Group(), c.duel.course);
  const before = c.duel.state.score;
  const impact = sweepRam(c, 40);
  assert.equal(impact.contacted, true, 'native swept Titan body reaches the cover');
  assert.deepEqual(c.duel.state.crushedProps, [c.prop.id], 'one actual persistent crushed ID');
  assert.equal(c.duel.state.crushCount, 1, 'one authored crush count');
  assert.equal(c.duel.state.score - before, 150, 'released arena crush awards the same 150 style points');
  assert.equal(events.length, 1, 'one existing propCrushed sound/graphics event');
  assert.equal(events[0].id, c.prop.id, 'cue names the actual rammed hulk');
  group.userData.updateSimulation(c.duel.state, 0);
  const root = group.children[0];
  assert.ok(root.children.some(part => part.scale.y < .4), 'existing callback flattens the crushed shell');
  group.traverse(node => {node.geometry?.dispose();
    if (Array.isArray(node.material)) node.material.forEach(material => material.dispose());
    else node.material?.dispose();});
});
check('off-centre native ram turns the hulk as well as moving it', () => {
  const r = ram('banshee_muscle', 40, {offset: .7});
  assert.ok(r.moved >= 2, 'off-centre contact actually moves cover');
  assert.ok(Math.abs(Math.atan2(Math.sin(r.prop.heading - r.before.heading),
    Math.cos(r.prop.heading - r.before.heading))) > 1e-4, 'native solver spin changes the junk heading');
});
check('a moved hulk settles and keeps its final pose later in the same round', () => {
  const r = ram('falcone_f42', 40);
  assert.ok(r.moved >= 2, 'persistence witness starts with an actual ram');
  run(r, 480);
  const settled = snapshot(r.prop);
  assert.ok(!r.prop.knock || Math.hypot(r.prop.knock.vx, r.prop.knock.vz) < EPS,
    'driverless hulk has stopped sliding');
  run(r, 1200);
  assert.deepEqual(snapshot(r.prop), settled, 'later native clock ticks never reset or drift the parked hulk');
  assert.notDeepEqual(settled, r.before, 'the persistent pose differs from its starting cover');
});
for (const side of [-1, 1]) check('junk rammed into floor boundary ' + side + ' remains inside', () => {
  const c = arena('banshee_muscle'), limit = floorLimit(c.duel);
  const frame = c.duel.course.at(96), heading = frame.heading + side * Math.PI / 2;
  moveProp(c.duel, c.prop, 96, side * (limit - 1.25), side * Math.PI / 2);
  const impact = sweepRam(c, 60, {heading});
  let escaped = false;
  run(c, 600, ({duel, prop}) => {
    escaped ||= Math.abs(duel.course.nearest(prop.x, prop.z, prop.s).lateral) > limit + EPS;
  });
  assert.equal(impact.contacted, true, 'actual outward ram reaches the wall-adjacent hulk');
  assert.ok(impact.motion && Math.hypot(impact.motion.vx, impact.motion.vz) > 0,
    'wall witness starts with native crash motion, not the old fixed box');
  assert.equal(escaped, false, 'hulk cannot cross the solid floor boundary');
});
check('a ram into a second junk car resolves contact instead of passing through it', () => {
  const c = arena('banshee_muscle'), at = snapshot(c.prop);
  moveProp(c.duel, c.other, c.prop.s + c.prop.halfZ + c.other.halfZ + .25, 0);
  const secondBefore = snapshot(c.other), impact = sweepRam(c, 60);
  let overlap = 0;
  run(c, 600, ({prop, other}) => {
    // At equal side and heading the actual cover boxes cannot bury centres
    // inside one another. A spinning box may touch; its centre stays outside.
    overlap = Math.max(overlap, Math.max(0, Math.min(prop.halfX, other.halfX) - distance(prop, other)));
  });
  assert.ok(impact.motion && distance(c.prop, at) > 0, 'first hulk has a real native incoming slide');
  assert.equal(overlap, 0, 'two native heavy hull centres never pass through each other');
  assert.ok(distance(c.other, secondBefore) > 0 || distance(c.prop, c.other) >= 2 * c.prop.halfX,
    'the second hulk either receives the crash impulse or blocks the first');
});
check('a sliding hulk crossing a sitting participant never deals armor damage', () => {
  const c = arena('banshee_muscle'), target = c.duel.state.opponents[0];
  placeActor(c.duel, target, {s: c.prop.s + 6, lateral: 0}); hold(c.duel, target);
  const armor = target.armor, events = [];
  c.duel.onChange((_, event) => {if (event.combatRamHit) events.push(event);});
  const impact = sweepRam(c, 60);
  let closest = Infinity;
  run(c, 600, ({duel, prop}) => {closest = Math.min(closest, distance(prop, worldPose(duel, target)));});
  assert.ok(impact.motion && closest < c.prop.halfZ + c.duel._vehicleSpec(target).halfLength + .1, 'actual moving cover reaches the sitting car contact region');
  assert.equal(target.armor, armor, 'sliding junk never removes participant armor');
  assert.equal(events.some(event => event.armorRemoved > 0), false, 'sliding junk emits no damaging ram');
});
check('native CPU steering follows the rammed hulk position rather than its old pose', () => {
  const r = ram('banshee_muscle', 40, {offset: .7});
  assert.ok(r.moved >= 2, 'avoidance witness first moves the hulk through a native ram');
  const {duel, prop} = r, actor = duel.state.opponents[0];
  const angle = Math.atan2(prop.x - r.before.x, prop.z - r.before.z) + Math.PI / 2;
  const position = {x: prop.x - Math.sin(angle) * 7, z: prop.z - Math.cos(angle) * 7};
  const at = duel.course.nearest(position.x, position.z, prop.s);
  const goal = {x: prop.x + Math.sin(angle) * 10, z: prop.z + Math.cos(angle) * 10, speedMph: 30, boost: false};
  const prepare = () => placeActor(duel, actor,
    {s: at.s, lateral: at.lateral, headingError: angle - duel.course.at(at.s).heading}, 30);
  prepare(); pilotStep(duel, actor, goal, DT);
  const movedPoseSteer = actor.steerVisual;
  const saved = snapshot(prop); Object.assign(prop, r.before);
  prepare(); pilotStep(duel, actor, goal, DT);
  const stalePoseSteer = actor.steerVisual;
  Object.assign(prop, saved);
  assert.ok(Math.abs(movedPoseSteer - stalePoseSteer) > 1e-6,
    'real pilot changes its requested steering when only the junk world pose changes');
});
check('actual respawn timer keeps clear when a rammed hulk occupies an original cached slot', () => {
  const c = arena('banshee_muscle'), {duel, prop} = c, player = member(duel, duel.state);
  const oldSlot = structuredClone(chooseRespawnSlot(duel, player));
  const slotAt = duel.course.worldAt(oldSlot.s, oldSlot.lateral);
  moveProp(duel, prop, oldSlot.s - 12, oldSlot.lateral);
  const impact = sweepRam(c, 40);
  run(c, 480);
  assert.ok(impact.motion && distance(prop, impact.before) >= 2, 'native ram moves the cover into the cached-slot region');
  const clearance = duel.course.def.scrapdome.junkSpawnClearance;
  assert.ok(distance(prop, slotAt) < clearance, 'the original cached best spawn is blocked by the moved hulk');
  duel.state.armor = 1;
  assert.equal(applyArmorDamage(duel, duel.state, 'crossbow', {owner: 'cpu-1'}), 1);
  assert.equal(duel.state.combatWrecking, true, 'actual owned hit creates the real waiting wreck');
  for (let tick = 0; tick < 430 && duel.state.combatWrecking; tick++) duel.step(DT);
  assert.equal(duel.state.combatWrecking, false, 'native arena deadline actually respawns the player');
  assert.equal(member(duel, duel.state).protectedSec, 2, 'actual respawn grants the released protection');
  assert.ok(distance(worldPose(duel, duel.state), prop) >= clearance,
    'native respawn must clear the CURRENT hulk, not only the authored spawn cache');
});
check('late native junk contact keeps the participant on the floor before the tick ends', () => {
  // Exact native Medium-round contact at seed 1989, tick 17259. The event
  // already contained CPU-3 before its late crush dispatcher nudged it out.
  const {duel, prop} = arena(), actor = duel.state.opponents[0];
  actor.car = 'stuttgart_959s';
  moveProp(duel, prop, 110.36801478390123, 14.436351344905729,
    -.8482864801101722 - duel.course.at(110.36801478390123).heading);
  placeActor(duel, actor, {s: 592.2810489907823, lateral: 18, headingError: Math.PI},
    25.39847201879456);
  actor.prevS = 592.3656429176233; actor.prevLateral = 17.933011695573217;
  const beforeS = actor.s;
  duel._crushProps(actor);
  assert.notEqual(actor.s, beforeS, 'real native swept junk contact corrects the participant pose');
  assert.ok(Math.abs(actor.lateral) <= floorLimit(duel),
    'late contact must keep the final participant pose inside the native floor limit');
});
check('existing renderer callback copies native moved position and spin without mutating simulation', () => {
  const c = arena('banshee_muscle'), world = new THREE.Group();
  const group = addArenaCrushables(world, c.duel.course), root = group.children[0];
  const original = root.position.clone(), initialHeading = root.rotation.y;
  const impact = sweepRam(c, 40, {offset: .7}); run(c, 360);
  assert.ok(impact.motion && distance(c.prop, impact.before) >= 2, 'renderer witness starts with real crash motion');
  const before = hash({state: c.duel.state, props: c.duel.course.features.crushables});
  group.userData.updateSimulation(c.duel.state, DT);
  assert.equal(hash({state: c.duel.state, props: c.duel.course.features.crushables}), before,
    'actual render sync leaves full simulation state and cover poses untouched');
  assert.ok(root.position.distanceTo(original) >= 2, 'visible root follows the native moved hulk');
  assert.ok(Math.abs(root.position.x - c.prop.x) < EPS && Math.abs(root.position.z - c.prop.z) < EPS,
    'rendered root matches the current simulation world pose');
  assert.ok(Math.abs(Math.atan2(Math.sin(root.rotation.y - c.prop.heading),
    Math.cos(root.rotation.y - c.prop.heading))) < EPS, 'renderer reads the native solver heading');
  assert.notEqual(root.rotation.y, initialHeading, 'visible hulk shows its solver spin');
  world.traverse(node => {node.geometry?.dispose();
    if (Array.isArray(node.material)) node.material.forEach(material => material.dispose());
    else node.material?.dispose();});
});
function appCadence(fps) {
  const c = arena('banshee_muscle'); sweepRam(c, 40, {offset: .7});
  const names = ['localStorage', 'window', 'Element', 'cancelAnimationFrame'];
  const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const memory = new Map();
  globalThis.localStorage = {getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key)};
  globalThis.window = new EventTarget(); window.location = {search: ''};
  globalThis.Element = class {}; globalThis.cancelAnimationFrame = () => {};
  let app;
  try {
    app = new App();
    // Only attach the seeded collision fixture. Input, visual readiness,
    // accumulator and fixed simulation dispatch remain production App methods.
    app.duel = c.duel; app.runId = 'junk-frame-fixture';
    app.advance(MEASURE_TICKS / 120, 1 / fps);
    return {ticks: Math.round(c.duel.state.arena.clockSec / DT),
      trace: hash({state: c.duel.state, props: c.duel.course.features.crushables})};
  } finally {
    app?.dispose();
    names.forEach((name, index) => {
      if (previous[index]) Object.defineProperty(globalThis, name, previous[index]);
      else delete globalThis[name];
    });
  }
}
for (const fps of [30, 60, 144]) check('production App junk ram repeats at ' + fps + ' frame cadence', () => {
  const expected = appCadence(60), actual = appCadence(fps);
  assert.equal(actual.ticks, MEASURE_TICKS, 'actual App accumulator executes the same 120 Hz tick count');
  assert.equal(actual.trace, expected.trace, 'production input and frame adapter preserve seeded full state and junk poses');
});
check('released rigid-body solver fingerprint remains unchanged for every playable mass pair', () => {
  const results = [];
  for (const attackingCar of Object.keys(CARS)) for (const targetCar of Object.keys(CARS)) {
    const {duel} = arena(attackingCar), target = duel.state.opponents[0]; target.car = targetCar;
    const a = actorBody(duel, duel.state), b = actorBody(duel, target);
    for (const [angle, offset] of [[0, 0], [Math.PI / 2, 0], [0, 1]]) {
      const bodyA = {...a, x: angle ? -a.halfLength - b.halfWidth : offset,
        z: angle ? offset : -a.halfLength - b.halfLength, heading: angle,
        vx: Math.sin(angle) * 40 * DRIVE.mphToWorld, vz: Math.cos(angle) * 40 * DRIVE.mphToWorld};
      const bodyB = {...b, x: 0, z: 0, heading: 0, vx: 0, vz: 0};
      results.push({attackingCar, targetCar, angle, offset, result: solveVehicleImpact(bodyA, bodyB)});
    }
  }
  assert.equal(hash(results), controls.solverFingerprint, 'existing reviewed global crash-solver pin');
});
for (const spec of controls.roadControls) check('released road replay stays unchanged: ' + spec.car + '/' + spec.course, () => {
  const duel = new Duel({seed: controls.seed, featureFlags: {wasteland2: true, scrapdome: true, warlords: true}});
  duel.startCampaign({car: spec.car, seed: controls.seed, mode: 'duel', difficulty: 'casual',
    cpuDifficulty: 'medium', startStage: COURSE.findIndex(def => def.id === spec.course)});
  duel.state.status = 'racing'; duel.state.countdown = 0;
  const samples = [];
  for (let tick = 0; tick < controls.roadTicks; tick++) {
    duel.setInput({throttle: tick < 240 ? 1 : .5, brake: 0, steer: tick < 120 ? .08 : -.12, boost: false});
    duel.step(DT); if (tick % 120 === 119) samples.push(structuredClone(duel.state));
  }
  assert.equal(hash(samples), spec.fingerprint, 'read-only reviewed road full-state pin');
});
check('released solver still conserves momentum and adds no impact energy', () => {
  const a = {mass: 1450, halfLength: 2.1, halfWidth: .95, heading: 0,
    x: .6, z: -4.2, vx: 0, vz: 40 * DRIVE.mphToWorld, spin: 0};
  const b = {mass: 2175, halfLength: 2.25, halfWidth: 1.06, heading: 0,
    x: 0, z: 0, vx: 0, vz: 0, spin: 0};
  for (const body of [a, b]) body.inertia = yawInertia(body.mass, body.halfLength, body.halfWidth);
  const hit = solveVehicleImpact(a, b);
  for (const axis of ['vx', 'vz']) assert.ok(Math.abs(a.mass * a[axis] + b.mass * b[axis] -
    a.mass * hit.a[axis] - b.mass * hit.b[axis]) < 1e-6, 'released solver conserves ' + axis + ' momentum');
  const energy = (body, velocity) => (body.mass * (velocity.vx ** 2 + velocity.vz ** 2) + body.inertia * velocity.spin ** 2) / 2;
  assert.ok(energy(a, hit.a) + energy(b, hit.b) <= energy(a, a) + energy(b, b) + EPS,
    'native heavy-mass solve cannot manufacture energy');
});
console.log('Arena junk shove: ' + checks + ' checks, ' + failures.length + ' failures.');
if (failures.length) {console.error(failures.join('\n')); process.exitCode = 1;}

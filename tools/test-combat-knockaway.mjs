import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CARS, COURSE, LIVES } from '../src/config.js';
import { Duel } from '../src/game.js';
import {LegacyRoadsideDuel} from './legacy-roadside-duel.mjs';
import { roadsideTrafficDecision } from '../src/destructibles.js';
import { Course } from '../src/course.js';
import { buildEnvironment, disposeTree } from '../src/world.js';
import { syncScene } from '../src/scene-systems.js';
import { addDesertCacti, CACTUS_FALL_SECONDS } from '../src/desert-detail.js';
import { createRoadsideDebris } from '../src/roadside-debris.js';
import { upgradedCar } from '../src/progression.js';

// CMB-08 emits one flagged-only roadsideImpact per object. The tests also
// check simulation and scene objects, not just the event payload.
const stageIndex = COURSE.findIndex(stage => !stage.kind && stage.hasRival);
const zeroDamage = () => ({ front: 0, rear: 0, left: 0, right: 0 });

function fixture({ mode = 'wasteland', legacy = false, wasteland2 = true } = {}) {
  const duel = new (legacy ? LegacyRoadsideDuel : Duel)({
    seed: 1989,
    featureFlags: { wasteland2 },
  });
  duel.startCampaign({ startStage: stageIndex, mode, car: 'falcone_f42' });
  const point = (s, lateral = 0) => ({ x: lateral, y: 0, z: s, heading: 0, curvature: 0 });
  duel.course = {
    def: { theme: 'desert' }, length: 1000, closed: false,
    features: { obstacles: [], shortcuts: [], mountains: [] },
    at: point, worldAt: point, groundAt: point, phase: s => s,
    nearest: (x, z) => ({ s: z, lateral: x }),
    obstaclesNear: () => duel.course.features.obstacles,
    roadHalfWidthAt: () => 7,
    surfaceAt: (_, lateral) => ({ road: Math.abs(lateral) <= 7, mainRoad: Math.abs(lateral) <= 7, roadHalfWidth: 7 }),
  };
  duel._obstacleArray = duel.course.features.obstacles;
  duel._obstacleQueryCache = new Map();
  Object.assign(duel.state, {
    status: 'racing', s: 100, prevS: 100, lateral: 0, prevLateral: 0,
    speedMph: 0, traffic: [], opponents: [], invulnerableSec: 0,
  });
  if (duel.state.combat) duel.state.combat.shield = 0;
  return duel;
}

const cactus = () => ({ id: 'cactus-1', kind: 'tree', theme: 'desert', shape: 'ellipse',
  s: 110, off: 0, x: 0, y: 0, z: 110, heading: 0, halfX: .45, halfZ: .45, height: 4 });
const tree = () => ({ id: 'tree-1', kind: 'tree', theme: 'alpine', shape: 'ellipse', scale: .8,
  s: 110, off: 0, x: 0, y: 0, z: 110, heading: 0, halfX: .2, halfZ: .2, height: 4.8 });
const post = () => ({ id: 'road-sign-0-post-0', kind: 'prop', signSupport: true, shape: 'box',
  s: 110, off: 0, x: 0, y: 0, z: 110, heading: 0, halfX: .07, halfZ: .08, height: 4 });
const chevron = () => ({ ...post(), id: 'turn-chevron-0' });

function staticHit(duel, obstacle, speedMph) {
  duel.course.features.obstacles.push(obstacle);
  const state = duel.state, events = [];
  duel.onChange((_, event) => events.push(event));
  Object.assign(state, { prevS: 100, s: 120, prevLateral: 0, lateral: 0, speedMph });
  const armor = state.armor, crashes = state.stageCrashes, penalty = state.racePenaltySec;
  duel._staticContacts(state, true);
  const hits = events.filter(event => event.roadsideImpact).map(event => event.roadsideImpact);
  return { state, hits, events, armor, crashes, penalty };
}

function trafficHit(duel, playerMph, { targetMph = 0, direction = 1 } = {}) {
  const state = duel.state;
  const traffic = { alive: true, s: 110, prevS: direction < 0 ? 115 : 110, lateral: .6, prevLateral: .6,
    speedMph: targetMph, dir: direction, headingError: 0, pushVelocity: 0,
    damageZones: zeroDamage(), damageCooldown: 0 };
  state.traffic = [traffic];
  Object.assign(state, { prevS: 100, s: 107, prevLateral: 0, lateral: 0,
    speedMph: playerMph, headingError: 0, pushVelocity: 0 });
  const events = [];
  duel.onChange((_, event) => events.push(event));
  const armor = state.armor, crashes = state.stageCrashes, penalty = state.racePenaltySec;
  assert.equal(duel._vehicleContact(state, traffic, 'traffic'), true, 'fixture crosses the traffic car');
  return { state, traffic, events, armor, crashes, penalty };
}

test('released roadside behavior is on in Wasteland and legacy isolation stays test-only', () => {
  assert.equal(fixture({wasteland2: true}).destructionEnabled(), true,
    'Wasteland 2 uses released roadside destruction');
  assert.equal(fixture({wasteland2: false}).roadsideKnockAwayEnabled(), true,
    'released roadside destruction does not depend on Wasteland 2');
  assert.equal(fixture({mode: 'duel', wasteland2: false}).roadsideKnockAwayEnabled(), false,
    'ordinary races keep their old contact rules');
  assert.equal(fixture({legacy: true, wasteland2: false}).roadsideKnockAwayEnabled(), false,
    'historical contact isolation exists only in the test adapter');
});

test('the boundary is half the striking car current upgraded top speed', () => {
  const duel = fixture();
  const original = duel.car.topSpeed;
  duel.state.upgrades.engine = 3;
  const upgraded = duel.car.topSpeed;
  assert.ok(upgraded > original, 'fixture really changes top speed');
  const threshold = upgraded * .5;
  for (const targetMass of [850, 1450, 3500]) {
    const input = { topSpeedMph: upgraded, targetMass };
    assert.equal(roadsideTrafficDecision({ ...input, impactMph: threshold - .01 }).wreck, false,
      'below half top speed is a knock for every target mass');
    assert.equal(roadsideTrafficDecision({ ...input, impactMph: threshold }).wreck, true,
      'equality starts the high tier');
    assert.equal(roadsideTrafficDecision({ ...input, impactMph: threshold + .01 }).thresholdMph, threshold,
      'target mass does not move the boundary');
  }
});

for (const [name, kind, make] of [['cactus', 'cactus', cactus],
  ['road sign', 'sign', post], ['chevron', 'chevron', chevron],
  ['small tree', 'tree', tree]]) {
  for (const tier of ['knock', 'obliterate']) test(`${name} ${tier} clears its collider once without wrecking the player`, () => {
    const duel = fixture(), speed = duel.car.topSpeed * (tier === 'knock' ? .3 : .7);
    const { state, hits, events, armor, crashes, penalty } = staticHit(duel, make(), speed);
    assert.equal(hits.length, 1, 'one contact emits one outcome');
    assert.equal(hits[0].outcome, tier, 'outcome is explicit for visuals and audio');
    assert.equal(hits[0].kind, kind);
    assert.equal(hits[0].id, make().id.startsWith('road-sign-') ? 'road-sign-0' : make().id);
    assert.ok(Number.isFinite(hits[0].impactMph) && Number.isFinite(hits[0].thresholdMph));
    assert.ok(['x', 'y', 'z'].every(axis => Number.isFinite(hits[0].hitPosition?.[axis])));
    assert.ok(state.speedMph < speed && state.speedMph >= speed - 25,
      'the player feels one bounded speed cost');
    assert.equal(state.armor, armor, 'light movable scenery costs no combat armor');
    assert.deepEqual([state.stageCrashes, state.racePenaltySec], [crashes, penalty],
      'light movable scenery consumes no crash or time penalty');
    assert.equal(duel._obstacles(100, 120).some(obstacle => obstacle.id === make().id), false,
      'the struck object no longer has a live road collider');
    const speedAfter = state.speedMph;
    Object.assign(state, { prevS: 100, s: 120 });
    duel._staticContacts(state, true);
    assert.equal(state.speedMph, speedAfter, 'overlap or repeat crossing cannot apply another speed cost');
    assert.equal((state.fallenCacti?.length || 0) + (state.brokenScenery?.length || 0), 1,
      'one incident creates one persistent visual record');
    assert.equal(events.filter(event => event.roadsideImpact).length, 1,
      'a repeat crossing does not emit another impact');
  });
}

test('low closing speed shoves traffic visibly clear and leaves it there for the stage', () => {
  const duel = fixture();
  const hit = trafficHit(duel, duel.car.topSpeed * .3);
  const { state, traffic, events, armor, crashes, penalty } = hit;
  const impact = events.filter(event => event.roadsideImpact).map(event => event.roadsideImpact);
  assert.equal(impact.length, 1, 'one traffic contact produces one flagged event');
  assert.equal(impact[0].actor, traffic);
  assert.equal(impact[0].kind, 'traffic');
  assert.equal(impact[0].outcome, 'knock');
  assert.equal(state.callout, 'TRAFFIC SHOVED CLEAR');
  const entrySpeed = state.speedMph, startLateral = traffic.lateral;
  for (let i = 0; i < 120; i++) duel._traffic(1 / 120);
  assert.ok(Math.abs(traffic.lateral - startLateral) > 2,
    'the car itself moves clear of the occupied lane');
  const displaced = traffic.lateral;
  for (let i = 0; i < 240; i++) duel._traffic(1 / 120);
  assert.ok(Math.abs(traffic.lateral - displaced) < 1,
    'traffic does not steer back into the player lane during this stage');
  assert.equal(duel._vehicleContact(state, traffic, 'traffic'), false,
    'the same knocked car cannot be hit every frame');
  assert.equal(events.filter(event => event.roadsideImpact).length, 1);
  assert.ok(entrySpeed < duel.car.topSpeed * .3 && entrySpeed > duel.car.topSpeed * .3 - 25);
  assert.equal(state.armor, armor);
  assert.deepEqual([state.stageCrashes, state.racePenaltySec], [crashes, penalty]);
});

test('outside clips and aligned rear hits send traffic to its nearest shoulder', () => {
  for (const [name, playerLateral, trafficLateral, direction] of [
    ['outside clip', 4.8, 3.8, 1],
    ['aligned negative-lane rear hit', -3.8, -3.8, -1],
  ]) {
    const duel = fixture(), state = duel.state;
    const traffic = {alive: true, s: 110, prevS: 110,
      lateral: trafficLateral, prevLateral: trafficLateral,
      speedMph: 0, dir: 1, headingError: 0, pushVelocity: 0};
    state.traffic = [traffic];
    Object.assign(state, {s: 107, prevS: 100,
      lateral: playerLateral, prevLateral: playerLateral,
      speedMph: duel.car.topSpeed * .3});
    const events = [];
    duel.onChange((_, event) => { if (event.roadsideImpact) events.push(event.roadsideImpact); });
    assert.equal(duel._vehicleContact(state, traffic, 'traffic'), true, `${name} is a contact`);
    assert.equal(events.length, 1, `${name} emits once`);
    assert.equal(events[0].outcome, 'knock');
    for (let i = 0; i < 120; i++) duel._traffic(1 / 120);
    assert.equal(Math.sign(traffic.lateral), direction,
      `${name} remains on the traffic car's original side of the road`);
    assert.ok(Math.abs(traffic.lateral) > duel.course.roadHalfWidthAt(traffic.s) +
      duel._vehicleSpec(traffic).halfWidth,
    `${name} parks the whole car beyond the paved route`);
    assert.equal(duel._surface(traffic.s, traffic.lateral).road, false,
      `${name} cannot become a non-collidable ghost in another lane`);
  }
});

test('high closing speed removes traffic after its burst and never costs player armor', () => {
  const duel = fixture();
  const hit = trafficHit(duel, duel.car.topSpeed * .7);
  const { state, traffic, events, armor, crashes, penalty } = hit;
  const impact = events.filter(event => event.roadsideImpact).map(event => event.roadsideImpact);
  assert.equal(impact.length, 1, 'one traffic collision starts one visible burst');
  assert.equal(impact[0].actor, traffic);
  assert.equal(impact[0].kind, 'traffic');
  assert.equal(impact[0].outcome, 'obliterate');
  assert.equal(state.callout, 'TRAFFIC OBLITERATED');
  for (let i = 0; i < 180; i++) duel._traffic(1 / 120);
  assert.ok(!traffic.alive && !traffic.wrecked,
    'the renderer must no longer show an intact or flying traffic car after the burst');
  assert.equal(duel._vehicleContact(state, traffic, 'traffic'), false);
  assert.equal(state.armor, armor);
  assert.deepEqual([state.stageCrashes, state.racePenaltySec], [crashes, penalty]);
});

test('an oncoming car uses closing speed, even when player speed is below half top speed', () => {
  const duel = fixture();
  const playerMph = duel.car.topSpeed * .3, targetMph = duel.car.topSpeed * .25;
  const { traffic, events } = trafficHit(duel, playerMph, { targetMph, direction: -1 });
  const impacts = events.filter(event => event.roadsideImpact).map(event => event.roadsideImpact);
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].actor, traffic);
  assert.equal(impacts[0].outcome, 'obliterate', 'relative 55% top speed enters the high tier');
  assert.ok(impacts[0].impactMph > duel.car.topSpeed * .5);
});

test('a later CPU uses its own upgraded top speed for traffic and scenery', () => {
  const duel = fixture(), state = duel.state;
  const car = 'falcone_f42', upgrades = {engine: 3};
  const baseTopSpeed = CARS[car].topSpeed;
  const upgradedTopSpeed = upgradedCar(CARS[car], upgrades).topSpeed;
  const speedMph = (baseTopSpeed + upgradedTopSpeed) / 4;
  const cpu = {car, driverId: 'mara_vale', upgrades,
    s: 107, prevS: 100, lateral: 0, prevLateral: 0,
    speedMph, dir: 1, headingError: 0, pushVelocity: 0};
  state.opponents = [{car}, {car}, cpu];
  const traffic = {alive: true, s: 110, prevS: 110, lateral: .6,
    prevLateral: .6, speedMph: 0, dir: 1, headingError: 0,
    pushVelocity: 0};
  state.traffic = [traffic];
  const events = [];
  duel.onChange((_, event) => { if (event.roadsideImpact) events.push(event.roadsideImpact); });
  assert.equal(duel._vehicleContact(cpu, traffic, 'traffic'), true);
  assert.equal(events.length, 1);
  assert.equal(events[0].thresholdMph, upgradedTopSpeed * .5);
  assert.equal(events[0].outcome, 'knock',
    'a base-car threshold would have obliterated this traffic car');
  state.traffic = [];
  duel.course.features.obstacles.push(post());
  Object.assign(cpu, {s: 120, prevS: 100, lateral: 0, prevLateral: 0,
    speedMph});
  duel._staticContacts(cpu, false);
  assert.equal(events.length, 2);
  assert.equal(events[1].thresholdMph, upgradedTopSpeed * .5);
  assert.equal(events[1].outcome, 'knock');
});

test('major fixed scenery still costs 20 armor and never enters the knock-away pool', () => {
  const duel = fixture(), state = duel.state;
  const rock = { id: 'fixed-rock', kind: 'rock', shape: 'ellipse', theme: 'desert',
    s: 110, off: 0, x: 0, y: 0, z: 110, heading: 0, halfX: 2, halfZ: 2, height: 4 };
  const { hits, armor } = staticHit(duel, rock, duel.car.topSpeed * .7);
  assert.equal(hits.length, 0, 'fixed rock is not a roadsideImpact');
  assert.equal(armor - state.armor, 20, 'existing major scenery armor rule remains');
  assert.equal(duel._obstacles(100, 120).some(obstacle => obstacle.id === rock.id), true);
});

test('ordinary and test-only legacy Wasteland keep their established contacts', () => {
  const ordinary = fixture({ mode: 'duel', wasteland2: false });
  const old = staticHit(ordinary, cactus(), 25);
  assert.equal(old.state.fallenCacti.length, 1, 'ordinary cactus fall remains enabled');
  assert.equal(old.state.speedMph, 23, 'ordinary cactus retains its 8% speed loss');
  const off = fixture({ legacy: true, wasteland2: false });
  const sign = staticHit(off, post(), 45);
  assert.equal(sign.state.brokenScenery.length, 0, 'flag-off Wasteland sign stays solid');
  assert.ok(sign.state.s < 110, 'old contact wall remains in place');
  assert.deepEqual([old.state.lives, off.state.lives], [LIVES.start, LIVES.start]);
});

test('30, 60 and 144 FPS produce one equal outcome and no extra contact cost', () => {
  const replay = fps => {
    const duel = fixture();
    const state = duel.state, travel = 20, duration = .2;
    duel.course.features.obstacles.push(post());
    const events = [];
    duel.onChange((_, event) => { if (event.roadsideImpact) events.push(event.roadsideImpact); });
    for (let i = 0; i < Math.ceil(duration * fps); i++) {
      const from = 100 + travel * i / (duration * fps);
      const to = 100 + travel * (i + 1) / (duration * fps);
      Object.assign(state, { prevS: from, s: to, prevLateral: 0, lateral: 0,
        speedMph: duel.car.topSpeed * .7, stageTimeSec: 1 });
      duel._staticContacts(state, true);
    }
    return { events: events.map(event => [event.id, event.outcome]),
      colliders: duel._obstacles(100, 120).length, crashes: state.stageCrashes };
  };
  assert.deepEqual(replay(30), replay(60));
  assert.deepEqual(replay(60), replay(144));
  assert.deepEqual(replay(60).events, [['road-sign-0', 'obliterate']]);
});

test('30, 60 and 144 FPS resolve the same traffic actor once', () => {
  const replay = fps => {
    const duel = fixture(), state = duel.state;
    const traffic = { alive: true, s: 110, prevS: 110, lateral: .6, prevLateral: .6,
      speedMph: 0, dir: 1, headingError: 0, pushVelocity: 0,
      damageZones: zeroDamage(), damageCooldown: 0 };
    state.traffic = [traffic];
    const events = [];
    duel.onChange((_, event) => { if (event.roadsideImpact) events.push(event.roadsideImpact); });
    const steps = Math.ceil(fps * .2);
    for (let i = 0; i < steps; i++) {
      Object.assign(state, { prevS: 100 + i * 20 / steps, s: 100 + (i + 1) * 20 / steps,
        prevLateral: 0, lateral: 0, speedMph: duel.car.topSpeed * .7, stageTimeSec: 1 });
      duel._vehicleContact(state, traffic, 'traffic');
    }
    return { events: events.map(event => [event.kind, event.outcome, event.impactMph]),
      crashes: state.stageCrashes, trafficAlive: traffic.alive };
  };
  assert.deepEqual(replay(30), replay(60));
  assert.deepEqual(replay(60), replay(144));
  assert.equal(replay(60).events.length, 1);
});

test('real cactus instance is displaced on a knock and removed after an obliteration', () => {
  const course = new Course(COURSE.find(def => def.id === 'pacific-canyon'), 1989);
  const view = Object.create(course);
  view.def = { ...course.def, theme: 'desert' };
  view.features = { ...course.features, trees: course.features.trees.filter(item => item.theme === 'desert') };
  const group = new THREE.Group(), update = addDesertCacti(group, view);
  try {
    const mesh = group.children.find(child => child.userData.cactusFeatures?.length);
    assert.ok(mesh, 'fixture uses the production instanced cactus mesh');
    const item = mesh.userData.cactusFeatures[0], index = 0, matrix = new THREE.Matrix4();
    mesh.getMatrixAt(index, matrix);
    const original = new THREE.Vector3().setFromMatrixPosition(matrix);
    const event = { id: item.tree.id, atTime: 1, directionX: 1, directionZ: 0, outcome: 'knock' };
    update({ status: 'racing', stageTimeSec: 1 + CACTUS_FALL_SECONDS, fallenCacti: [event] });
    mesh.getMatrixAt(index, matrix);
    assert.ok(new THREE.Vector3().setFromMatrixPosition(matrix).distanceTo(original) > 1,
      'low-tier cactus instance itself moves away from the car path');
    update({ status: 'menu', stageTimeSec: 0, fallenCacti: [] });
    update({ status: 'racing', stageTimeSec: 1 + CACTUS_FALL_SECONDS,
      fallenCacti: [{ ...event, outcome: 'obliterate' }] });
    mesh.getMatrixAt(index, matrix);
    const center = new THREE.Vector3().setFromMatrixPosition(matrix);
    assert.ok(!mesh.parent || Math.abs(matrix.determinant()) < 1e-6 || center.distanceTo(original) > 50,
      'high-tier cactus no longer contributes an instance at its road position');
  } finally { disposeTree(group); }
});

test('real sign scene object moves for a knock and disappears after obliteration', () => {
  const oldLoad = THREE.TextureLoader.prototype.load, oldDocument = globalThis.document;
  THREE.TextureLoader.prototype.load = () => new THREE.Texture();
  const context = new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: () => ({ width: 40 }), createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => target[key] ?? (() => {}) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  let world;
  try {
    const course = new Course(COURSE.find(def => def.id === 'high-country'), 1989);
    world = buildEnvironment(course);
    const sign = course.features.signs[0], group = world.children.find(child => child.userData.roadSignId === sign.id);
    assert.ok(group, 'fixture uses the real road sign render group');
    const original = group.position.clone();
    const event = { id: sign.id, kind: 'sign', atTime: 1, directionX: 1, directionZ: 0, outcome: 'knock' };
    syncScene(world, { status: 'racing', stageTimeSec: 2, brokenScenery: [event], fallenCacti: [], crushedProps: [] }, 0);
    assert.ok(group.position.distanceTo(original) > 1, 'low-tier sign is displaced, not merely tilted in place');
    syncScene(world, { status: 'menu', stageTimeSec: 0, brokenScenery: [], fallenCacti: [], crushedProps: [] }, 0);
    const high = { ...event, outcome: 'obliterate' };
    syncScene(world, { status: 'racing', stageTimeSec: 3, brokenScenery: [high], fallenCacti: [], crushedProps: [] }, 0);
    assert.ok(!group.parent || !group.visible || group.scale.length() < .1 || group.position.distanceTo(original) > 50,
      'the high-tier sign group leaves the rendered scene after its debris burst');
  } finally {
    if (world) disposeTree(world);
    THREE.TextureLoader.prototype.load = oldLoad;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});

test('real chevron and small-tree instances move and then leave their cells', () => {
  const oldLoad = THREE.TextureLoader.prototype.load, oldDocument = globalThis.document;
  THREE.TextureLoader.prototype.load = () => new THREE.Texture();
  const context = new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: () => ({ width: 40 }), createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => target[key] ?? (() => {}) });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  let world;
  try {
    const course = new Course(COURSE.find(def => def.id === 'high-country'), 1989);
    world = buildEnvironment(course);
    const tree = course.features.trees.find(item => item.theme !== 'desert' && item.scale <= 1.1);
    const chevron = course.features.chevrons[0];
    const trunks = world.children.filter(mesh => mesh.userData.vegetationCell?.entries.some(
      ({feature}) => feature.id === tree.id));
    const turnMesh = world.children.find(mesh => mesh.userData.turnSignCell?.entries.some(
      ({feature}) => feature.id === chevron.id));
    assert.equal(trunks.length, 2, 'the pine has a trunk and a crown');
    assert.ok(turnMesh, 'the chevron has a real instanced board or post');
    const treeIndex = trunks[0].userData.vegetationCell.entries.findIndex(
      ({feature}) => feature.id === tree.id);
    const turnIndex = turnMesh.userData.turnSignCell.entries.findIndex(
      ({feature}) => feature.id === chevron.id);
    const matrix = new THREE.Matrix4(), original = [];
    for (const mesh of [...trunks, turnMesh]) {
      mesh.getMatrixAt(mesh === turnMesh ? turnIndex : treeIndex, matrix);
      original.push(new THREE.Vector3().setFromMatrixPosition(matrix));
    }
    const events = [
      {id: tree.id, kind: 'tree', outcome: 'knock', atTime: 1, directionX: 1, directionZ: 0},
      {id: chevron.id, kind: 'chevron', outcome: 'knock', atTime: 1, directionX: 1, directionZ: 0},
    ];
    syncScene(world, {status: 'racing', stageTimeSec: 2, brokenScenery: events,
      fallenCacti: [], crushedProps: []}, 0);
    for (const [index, mesh] of [...trunks, turnMesh].entries()) {
      mesh.getMatrixAt(mesh === turnMesh ? turnIndex : treeIndex, matrix);
      assert.ok(new THREE.Vector3().setFromMatrixPosition(matrix).distanceTo(original[index]) > 1,
        `${mesh.name} actually moves in the instance matrix`);
    }
    syncScene(world, {status: 'menu', stageTimeSec: 0, brokenScenery: [],
      fallenCacti: [], crushedProps: []}, 0);
    syncScene(world, {status: 'racing', stageTimeSec: 2,
      brokenScenery: events.map(event => ({...event, outcome: 'obliterate'})),
      fallenCacti: [], crushedProps: []}, 0);
    for (const mesh of [...trunks, turnMesh]) {
      mesh.getMatrixAt(mesh === turnMesh ? turnIndex : treeIndex, matrix);
      assert.ok(Math.abs(matrix.determinant()) < 1e-6,
        `${mesh.name} instance is removed from its draw cell`);
    }
  } finally {
    if (world) disposeTree(world);
    THREE.TextureLoader.prototype.load = oldLoad;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});

test('debris uses a fixed pool and is visible on the first impact frame', () => {
  const pool = createRoadsideDebris();
  try {
    const geometryIds = pool.resources.geometries.map(resource => resource.uuid);
    const materialIds = pool.resources.materials.map(resource => resource.uuid);
    let children = 0;
    pool.group.traverse(() => children++);
    const event = {serial: 1, id: 'traffic-0', kind: 'traffic', atTime: 5,
      x: 10, y: 0, z: 20, impactMph: 120};
    pool.update({status: 'racing', stageTimeSec: 5, roadsideBursts: [event]});
    assert.equal(pool.resources.slots[1].burst.visible, true,
      'the first dt=0 frame shows a burst and prebuilt shards');
    assert.ok(pool.resources.slots[1].shards.every(mesh => mesh.visible));
    const pose = pool.resources.slots[1].burst.position.toArray();
    pool.update({status: 'racing', paused: true, stageTimeSec: 5, roadsideBursts: [event]});
    assert.deepEqual(pool.resources.slots[1].burst.position.toArray(), pose,
      'a paused stage holds the same effect pose');
    pool.update({status: 'racing', stageTimeSec: 6, roadsideBursts: [event]});
    assert.ok(pool.resources.slots.every(slot => !slot.burst.visible),
      'expired debris disappears without replacing its meshes');
    pool.update({status: 'racing', stageTimeSec: 5, roadsideBursts: Array.from({length: 24},
      (_, index) => ({...event, serial: index + 1}))});
    let after = 0;
    pool.group.traverse(() => after++);
    assert.equal(after, children, 'repeated impacts never add scene objects');
    assert.deepEqual(pool.resources.geometries.map(resource => resource.uuid), geometryIds);
    assert.deepEqual(pool.resources.materials.map(resource => resource.uuid), materialIds);
  } finally { disposeTree(pool.group); }
});

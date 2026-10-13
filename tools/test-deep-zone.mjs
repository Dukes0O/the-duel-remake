import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Duel } from '../src/game.js';
import { App } from '../src/app.js';
import { CARS, COURSE } from '../src/config.js';
import { ROUTE_VARIANTS } from '../src/route-variants.js';
import { SEA_LEVEL, shoreOffset } from '../src/coastal-water.js';
import { createFeatureFlags } from '../src/feature-flags.js';
import { environmentKey } from '../src/environment-key.js';
import { defineZone } from '../src/deep/deep-zone.js';

const DT = 1 / 120;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const near = (a, b, label, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${label}: ${a} differs from ${b}`);
// This is the only test zone; production receives no providers by default.
function provider(ramp) {
  assert.ok(Object.isFrozen(ramp) && Object.isFrozen(ramp.points));
  const end = ramp.points.at(-1), dx = Math.sin(ramp.heading), dz = Math.cos(ramp.heading);
  return defineZone({ id: 'test-kelp', circuit: 'pacific-canyon', switch: 'the-deep',
    ramp: { atDistance: ramp.atDistance, side: ramp.side, length: 120, endDepth: 8 },
    trail: [{ x: end.x, z: end.z, depth: 8, width: 6 },
      { x: end.x + dx * 60, z: end.z + dz * 60, depth: 10, width: 6 },
      { x: end.x + dx * 60 + dz * 40, z: end.z + dz * 60 - dx * 40, depth: 10, width: 6 },
      { x: end.x + dz * 40, z: end.z - dx * 40, depth: 8, width: 6 }].map(point => ({ ...point, surface: 'sea-floor' })),
    places: [], pearls: [], spots: [] });
}
function race({ seed = 1989, car = 'falcone_f42', enabled = true, kit = true, providers = [provider], mode = 'duel', deepFound = [], qualifying = false } = {}) {
  const duel = new Duel({ seed, deepProviders: providers, featureFlags: { 'the-deep': enabled } });
  duel.startCampaign({ seed, car, mode, deepKit: kit, deepFound, qualifying, opponentCount: 1, fieldSize:2, fieldSeed:seed, playerId: 'node-qa' });
  Object.assign(duel.state, { status: 'racing', countdown: 0 });
  return duel;
}
function advance(duel, seconds) { for (let i = 0; i < Math.round(seconds / DT); i++) duel.step(DT); }
function place(duel, point, heading, speed = 0, actor = duel.state) {
  const near = duel.course.nearest(point.x, point.z), frame = duel.course.at(near.s);
  Object.assign(actor, { s: near.s, prevS: near.s, lateral: near.lateral, prevLateral: near.lateral,
    headingError: wrap(heading - frame.heading), speedMph: speed, groundHeight: point.y,
    airHeight: 0, prevAirHeight: 0, airborne: false, impactTimer: 0, yawVelocity: 0,
    steerVisual: 0, slipAngle: 0, pushVelocity: 0, _jumpY: null });
}
function rampPoint(ramp, progress) {
  for (let i = 1; i < ramp.points.length; i++) {
    const a = ramp.points[i - 1], b = ramp.points[i];
    if (progress > b.progress && i < ramp.points.length - 1) continue;
    const t = (progress - a.progress) / (b.progress - a.progress);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }
}
const frozenRace = state => JSON.stringify({ stage: state.stageTimeSec, total: state.totalTimeSec,
  lap: state.lapTimeSec, opponents: state.opponents, traffic: state.traffic, police: state.police, field:state.field, qualifying:state.qualifying });
function choose(duel) {
  const ramp = duel.course.deepRamp;
  assert.ok(ramp, 'real provider resolves a physical ramp');
  place(duel, rampPoint(ramp, ramp.shoreline.center.progress - .04), ramp.heading, 35);
  duel.setInput({ throttle: 0, brake: 0, steer: 0, boost: false });
  const before = frozenRace(duel.state);
  duel.step(DT);
  assert.equal(duel.state.deepJourney?.phase, 'choice');
  assert.equal(frozenRace(duel.state), before, 'crossing freezes the exact clocks and CPU packet');
  return ramp;
}
function dive(duel) {
  const ramp = choose(duel);
  assert.equal(duel.chooseDeep('dive'), true);
  assert.equal(duel.chooseDeep('dive'), false, 'a queued choice is unique');
  advance(duel, 3);
  assert.equal(duel.state.deepJourney.phase, 'underwater');
  return ramp;
}

test('per-Duel providers resolve immutable actual A/B/C ramps without changing generation or RNG', () => {
  for (const route of ROUTE_VARIANTS) {
    const list = [provider], duel = race({ seed: route.seed, providers: list }), control = race({ seed: route.seed, enabled: false });
    list.length = 0;
    assert.ok(Object.isFrozen(duel.deepProviders));
    assert.equal(duel.deepProviders.length, 1);
    assert.ok(duel.course.deepRamp);
    assert.equal(duel.course.deepZone.zone.circuit, 'pacific-canyon');
    near(duel.course.deepRamp.length, 120, 'ramp length');
    near(duel.course.deepRamp.points.at(-1).y, -23, 'ramp bottom');
    assert.equal(JSON.stringify(duel.course.features), JSON.stringify(control.course.features));
    assert.deepEqual(Array.from({ length: 12 }, () => duel.course.rng.float()),
      Array.from({ length: 12 }, () => control.course.rng.float()));
    const other = race({ seed: route.seed, providers: [] });
    assert.equal(other.course.deepRamp, undefined);
    assert.notEqual(duel.deepProviders, other.deepProviders);
  }
});

test('no provider, invalid provider, flag off, kit off and Mad Max retain physical shoreline recovery', () => {
  for (const options of [{ providers: [] }, { providers: [() => null] }, { providers: [() => ({ id: 'invalid' })] },
    { enabled: false }, { kit: false }, { mode: 'wasteland' }]) {
    const duel = race(options);
    assert.equal(duel.course.deepRamp, undefined);
    const coast = duel.course.sections.find(section => section.theme === 'coast');
    let distance = coast.start, offset = null;
    while (offset === null && distance < coast.end) { offset = shoreOffset(duel.course, distance); if (offset === null) distance += 8; }
    assert.ok(offset !== null);
    const point = duel.course.groundAt(distance, offset + 3);
    place(duel, point, point.heading, 0);
    duel._boundary(duel.state);
    assert.equal(duel.state.boundaryResets, 1, JSON.stringify(options));
    assert.equal(duel.state.status, 'racing');
    assert.equal(duel.state.deepJourney, undefined);
  }
});

test('off and unused-ramp simulation packets and old environment keys stay exact', () => {
  for (const route of ROUTE_VARIANTS) {
    const ordinary = race({ seed: route.seed, providers: [], enabled: false });
    const off = race({ seed: route.seed, enabled: false });
    const unused = race({ seed: route.seed });
    assert.equal(environmentKey(off.course), environmentKey(ordinary.course));
    for (const duel of [ordinary, off, unused]) duel.setInput({ throttle: .4, steer: .08 });
    for (let i = 0; i < 240; i++) for (const duel of [ordinary, off, unused]) duel.step(DT);
    assert.equal(JSON.stringify(off.state), JSON.stringify(ordinary.state));
    assert.equal(JSON.stringify(unused.state), JSON.stringify(ordinary.state));
    assert.notEqual(environmentKey(unused.course), environmentKey(ordinary.course), 'only installed ramp adds a marker');
  }
});

test('Grand Prix is a saved-zone revisit only; qualifying and unrelated saved ids remain excluded', () => {
  for(const options of [{mode:'grandprix'}, {mode:'grandprix',deepFound:['other-zone']},
    {mode:'grandprix',deepFound:['test-kelp'],qualifying:true}]) {
    const duel=race(options);assert.equal(duel.course.deepRamp,undefined);
    assert.equal(duel._deepProtected(),false);
  }
  const duel=race({mode:'grandprix',deepFound:['test-kelp']});
  assert.ok(duel.course.deepRamp);choose(duel);
  const packet=frozenRace(duel.state);advance(duel,.3);assert.equal(frozenRace(duel.state),packet);
});

test('choice locks inputs and freezes clocks/CPU; Turn back physically resumes the existing race', () => {
  const duel = race(), ramp = choose(duel), before = frozenRace(duel.state);
  const position = [duel.state.s, duel.state.lateral];
  duel.setInput({ throttle: 1, steer: 1, boost: true });
  advance(duel, .5);
  assert.equal(frozenRace(duel.state), before);
  assert.deepEqual([duel.state.s, duel.state.lateral], position);
  assert.equal(duel.state.input.throttle, 0);
  assert.equal(duel.chooseDeep('turn-back'), true);
  duel.step(DT);
  assert.equal(duel.state.deepJourney.phase, 'turn-back');
  const progress = duel.state.deepJourney.progress;
  duel.state.headingError = wrap(ramp.heading + Math.PI - duel.course.at(duel.state.s).heading);
  duel.state.speedMph = 20;
  duel.setInput({ throttle: 0, steer: 0 });
  advance(duel, .2);
  assert.ok(duel.state.deepJourney.progress < progress - 1, 'ordinary car physically turns and drives up the ramp');
  const road = duel.course.groundAt(ramp.atDistance, 0);
  place(duel, road, road.heading, 0);
  duel.step(DT);
  assert.equal(duel.state.status, 'racing');
  assert.equal(duel.state.deepJourney, undefined);
  near(duel.state.stageTimeSec, 0, 'race resumes on next step without retroactive elapsed time');
  duel.step(DT);
  assert.ok(duel.state.stageTimeSec > 0);
});

test('Dive commits once, keeps world/floor continuity, and all cars physically ascend to menu without rejoining', () => {
  for (const car of Object.keys(CARS)) {
    const duel = race({ car }), events = [];
    duel.onChange((_state, event) => events.push(event));
    const ramp = dive(duel), before = frozenRace(duel.state);
    const point = duel.course.groundAt(duel.state.s, duel.state.lateral);
    near(point.x, ramp.points.at(-1).x, 'entry x'); near(point.z, ramp.points.at(-1).z, 'entry z');
    near(point.y, SEA_LEVEL + duel.deepRuntime.floor.floorHeight(point.x, point.z), 'coast-world floor y');
    near(point.y, -23, 'continuous entry height');
    assert.equal(events.filter(event => event.deepCommitted).length, 1);
    assert.equal(events.filter(event => event.deepEntered).length, 1);
    place(duel, point, ramp.heading + Math.PI, 20);
    duel.setInput({ throttle: 0, steer: 0 });
    advance(duel, .2);
    assert.equal(duel.state.deepJourney.phase, 'ascending');
    assert.equal(frozenRace(duel.state), before);
    place(duel, ramp.points[0], ramp.heading + Math.PI, 10);
    duel.step(DT);
    assert.equal(duel.state.status, 'menu');
    assert.equal(duel.state.deepJourney, undefined);
    assert.equal(events.filter(event => event.deepExited).length, 1);
    advance(duel, .5); assert.equal(duel.state.status, 'menu');
  }
});

test('boundary and physical heading admission is bounded, finite and player-only', () => {
  const duel = race(), ramp = duel.course.deepRamp;
  assert.ok(ramp);
  place(duel, rampPoint(ramp, 108), ramp.heading, 0);
  assert.equal(duel._deepProtected(), true);
  duel._boundary(duel.state); assert.equal(duel.state.boundaryResets, 0);
  const npc = duel.state.opponents[0];
  place(duel, rampPoint(ramp, 108), ramp.heading, 0, npc);
  const npcLateral = npc.lateral;
  duel._boundary(npc);
  assert.notEqual(npc.lateral, npcLateral, 'NPC retains its normal shoreline reset');
  duel.state.lateral += 20; assert.equal(duel._deepProtected(), false);
  duel.state.lateral = NaN; assert.equal(duel._deepProtected(), false);
  place(duel,rampPoint(ramp,108),ramp.heading,0);duel.state.groundHeight=NaN;assert.equal(duel._deepProtected(),false);
  place(duel,rampPoint(ramp,108),ramp.heading,0);duel.state.objective={kind:'checkpointRush'};assert.equal(duel._deepProtected(),false);
});

test('memory-only App abandons and remembers discovery once, with no bank charge or record', () => {
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), values = new Map();
  const savedCancel=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
  Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:()=>{}});
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } });
  let app;
  try {
    app = new App({ deepProviders: [provider] });
    app.duel.featureFlags = createFeatureFlags({ storage: null, overrides: { 'the-deep': true } });
    app.audio.flags = app.duel.featureFlags;
    app.profile = { ...app.profile, credits: 5000, deep: { kit: true } }; app._saveProfile();
    app.startCampaign({ mode: 'duel', seed: 1989, opponentCount: 1 });
    Object.assign(app.duel.state, { status: 'racing', countdown: 0 });
    app._markActiveRace(app.duel.state);
    const bank = app.profile.credits, records = JSON.stringify(app.leaderboard), settled = app.profile.settledResults.length;
    dive(app.duel);
    assert.equal(app.profile.credits, bank);
    assert.equal(app.profile.settledResults.length, settled + 1);
    assert.deepEqual(app.profile.deep.found, ['test-kelp']);
    assert.equal(JSON.stringify(app.leaderboard), records);
    app.returnToMenu(); app.returnToMenu();
    assert.equal(app.profile.settledResults.length, settled + 1);
    assert.equal(app.duel.deepRuntime, null);
  } finally {
    app?.dispose();
    if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage); else delete globalThis.localStorage;
    if(savedCancel)Object.defineProperty(globalThis,'cancelAnimationFrame',savedCancel);else delete globalThis.cancelAnimationFrame;
  }
});

test('memory-only Grand Prix revisits abandon once with no pay, charge, record or duplicate discovery', () => {
  const savedStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const savedCancel=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame'),values=new Map();
  Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:()=>{}});
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
    getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}});
  let app;
  try {
    app=new App({deepProviders:[provider]});
    app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'the-deep':true,'grand-prix-career':true}});
    app.audio.flags=app.duel.featureFlags;
    app.profile={...app.profile,credits:5000,deep:{kit:true,found:['test-kelp']}};app._saveProfile();
    app.startCampaign({mode:'grandprix',seed:1989,fieldSeed:1989,fieldSize:2});
    Object.assign(app.duel.state,{status:'racing',countdown:0});
    const bank=app.profile.credits,records=JSON.stringify(app.leaderboard),settled=app.profile.settledResults.length;
    dive(app.duel);
    assert.equal(app.profile.credits,bank);assert.equal(app.profile.settledResults.length,settled+1);
    assert.equal(JSON.stringify(app.leaderboard),records);assert.deepEqual(app.profile.deep.found,['test-kelp']);
    app.returnToMenu();app.returnToMenu();
    assert.equal(app.profile.credits,bank);assert.equal(app.profile.settledResults.length,settled+1);
  }finally {
    app?.dispose();
    if(savedStorage)Object.defineProperty(globalThis,'localStorage',savedStorage);else delete globalThis.localStorage;
    if(savedCancel)Object.defineProperty(globalThis,'cancelAnimationFrame',savedCancel);else delete globalThis.cancelAnimationFrame;
  }
});

test('view uses translated copies and owns private scene/pass and material/parent restoration', async () => {
  const { createDeepView, surfaceLocalCamera } = await import('../src/deep/deep-ui.js');
  const worldCamera = new THREE.PerspectiveCamera(54, 1.5, .15, 2400);
  worldCamera.position.set(4, -19, 8); worldCamera.lookAt(4, -23, 30); worldCamera.updateMatrixWorld();
  const cameraCopy = surfaceLocalCamera(worldCamera);
  near(cameraCopy.position.y, -4, 'surface-local camera');
  near(worldCamera.position.y, -19, 'world camera never moved');
  assert.notEqual(cameraCopy, worldCamera);
  const duel = race(); dive(duel);
  const raceScene = new THREE.Scene(), background = new THREE.Color('red'), environment = new THREE.Texture();
  raceScene.background = background; raceScene.environment = environment;
  const material = new THREE.MeshStandardMaterial(), car = new THREE.Mesh(new THREE.BoxGeometry(), material);
  raceScene.add(car);
  const worldGround=duel.course.groundAt(duel.state.s,duel.state.lateral);
  car.position.set(worldGround.x,worldGround.y+.25,worldGround.z);
  const calls = [], renderer = { autoClear: true, render: (scene, camera) => calls.push({ scene, camera }) };
  let attached, privateScene, privateCamera, disposedLook = 0, disposedPass = 0, disposedPipeline = 0;
  // Controlled resource factories test ownership; production injects the existing
  // unchanged underwater scene, waterline and ambient-shading factories.
  const view = createDeepView({ renderer,
    createUnderwaterScene: ({ scene }) => { privateScene = scene; return {
      attachCar: object => { attached = object; object.material = material.clone(); },
      update: ({ car: pose, camera }) => { privateCamera = camera; near(pose.y, -8, 'surface-local car'); },
      dispose: () => { attached.material.dispose(); attached.material = material; disposedLook++; } }; },
    createWaterline: () => ({ active: false, update() {}, dispose() {} }),
    createAmbientShading: (scene, camera) => { assert.notEqual(scene, raceScene); return {
      refresh() {}, enabled: true, dispose: () => disposedPass++ }; },
    createPipeline: () => ({ setSize() {}, render() {}, dispose: () => disposedPipeline++ }) });
  const before = JSON.stringify(duel.state), originalPosition = car.position.clone();
  assert.equal(view.render({ duel, car, camera: worldCamera, seconds: 1, high: true, width: 640, height: 360 }), true);
  assert.notEqual(privateScene, raceScene); assert.notEqual(privateCamera, worldCamera);
  assert.equal(car.parent, privateScene); assert.notEqual(car.material, material);
  near(car.position.y,originalPosition.y-SEA_LEVEL,'visual model offset is translated once');
  assert.equal(JSON.stringify(duel.state), before);
  assert.equal(raceScene.background, background); assert.equal(raceScene.environment, environment);
  // Main renderer grounds the model in world coordinates before each render,
  // including a quality switch while the car has moved since entry.
  const movedPosition=originalPosition.clone();movedPosition.x+=7;movedPosition.y+=.4;
  car.position.copy(movedPosition);
  assert.equal(view.render({duel,car,camera:worldCamera,seconds:2,high:false,width:640,height:360}),true);
  near(car.position.x,movedPosition.x,'quality change keeps current model x');
  near(car.position.y,movedPosition.y-SEA_LEVEL,'quality change translates current model y once');
  assert.equal(JSON.stringify(duel.state),before);
  view.dispose(); view.dispose();
  assert.equal(car.parent, raceScene); assert.equal(car.material, material);
  assert.deepEqual(car.position, movedPosition);
  assert.equal(disposedLook, 2); assert.equal(disposedPass, 2); assert.equal(disposedPipeline, 2);
  car.geometry.dispose(); material.dispose(); environment.dispose();
});

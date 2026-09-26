import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createCombatEffects} from '../src/combat-effects.js';
import {LegacyRoadsideDuel} from './legacy-roadside-duel.mjs';

const course = {groundAt: (s, lateral) => ({x: lateral * 4, y: 2, z: s * 3})};
const flatCourse = {groundAt: (s, lateral) => ({x: lateral, y: 2, z: s,
  heading: 0})};
const point = {x: 17, y: 3.5, z: -9};

function loader() {
  return () => new THREE.Texture();
}

function visible(root, name) {
  const object = root.getObjectByName(name);
  assert.ok(object, `${name} is prebuilt`);
  return object;
}

function state(actor = {}) {
  return {mode: 'duel', status: 'racing', paused: false, stageTimeSec: 4,
    s: 10, lateral: 1, opponents: [{s: 12, lateral: -2, ...actor}],
    traffic: [], police: {pursuit: null}};
}

test('crash-effects starts as a named dev switch', () => {
  const flags = createFeatureFlags({storage: null, search: '', qa: false});
  assert.equal(flags.state('crash-effects'), 'dev');
  assert.equal(flags.enabled('crash-effects'), false);
  const qa = createFeatureFlags({storage: null,
    search: '?flags=crash-effects', qa: true});
  assert.equal(qa.enabled('crash-effects'), true);
});

test('vehicleSmash uses the exact point and bounded delta-v scale', () => {
  const effects = createCombatEffects({loadTexture: loader(), crashPresentation: true});
  try {
    const event = {severity: 'smashed', dvMph: 32, point: {...point}};
    const before = JSON.stringify(event);
    assert.equal(effects.recordVehicleSmash(event, {enabled: true}), true);
    effects.update({state: state(), course, dt: 0, crashEnabled: true});
    const spark = visible(effects.group, 'crash-vfx-impact-0-sparks');
    const crumple = visible(effects.group, 'crash-vfx-impact-0-crumple');
    assert.equal(spark.visible, true);
    assert.equal(crumple.visible, true);
    assert.deepEqual(spark.position.toArray(), [point.x, point.y, point.z]);
    assert.deepEqual(crumple.position.toArray(), [point.x, point.y, point.z]);
    assert.ok(spark.scale.x >= 3 && spark.scale.x <= 8,
      'change in velocity produces a bounded readable spark size');
    assert.equal(JSON.stringify(event), before,
      'presentation does not mutate the simulation event');
  } finally {
    effects.dispose();
  }
});

test('ordinary rigid-body contact identifies the struck actor and damage zone', () => {
  const duel = new LegacyRoadsideDuel({seed: 624,
    featureFlags: {'crash-physics': true}});
  duel.startCampaign({mode: 'duel', car: 'banshee_muscle', startStage: 0});
  const player = duel.state, rival = player.rival, events = [];
  Object.assign(player, {status: 'racing', invulnerableSec: 0, traffic: [],
    s: 100, prevS: 80, lateral: 0, prevLateral: 0, speedMph: 130});
  Object.assign(rival, {s: 105, prevS: 105, lateral: .6, prevLateral: .6,
    speedMph: 25, headingError: 0, pushVelocity: 0, contactCooldown: 0});
  duel.onChange((_, event) => events.push(event));
  assert.equal(duel._vehicleContact(player, rival, 'rival'), true);
  const smash = events.find(event => event.vehicleSmash)?.vehicleSmash;
  assert.equal(smash?.actor, rival);
  assert.equal(smash?.zone, 'rear');
  assert.ok(smash?.dvMph > 45 && ['x', 'z']
    .every(axis => Number.isFinite(smash.point?.[axis])));
  assert.ok(rival.damageZones.rear > 0,
    'the same contacted panel receives the permanent crumple damage');
});

test('impact animation age comes from simulation time at 30, 60 and 144 FPS', () => {
  const snapshots = [];
  for (const dt of [1 / 30, 1 / 60, 1 / 144]) {
    const effects = createCombatEffects({loadTexture: loader(),
      crashPresentation: true});
    try {
      effects.recordVehicleSmash({severity: 'smashed', dvMph: 38,
        point: {x: point.x, z: point.z}}, {enabled: true, y: point.y,
        atTime: 4});
      const current = state();
      for(let elapsed=dt;elapsed<.6;elapsed+=dt){
        current.stageTimeSec=4+elapsed;
        effects.update({state: current, course, dt, crashEnabled: true});
      }
      current.stageTimeSec=4.6;
      effects.update({state: current, course, dt, crashEnabled: true});
      const spark = visible(effects.group, 'crash-vfx-impact-0-sparks');
      const crumple = visible(effects.group, 'crash-vfx-impact-0-crumple');
      assert.ok(crumple.material.opacity < .25,
        'the effect has reached its late simulation-time fade');
      snapshots.push(JSON.stringify({
        sparkOpacity: spark.material.opacity,
        sparkUv: [...spark.geometry.getAttribute('uv').array],
        crumpleOpacity: crumple.material.opacity,
        crumpleUv: [...crumple.geometry.getAttribute('uv').array],
      }));
    } finally {
      effects.dispose();
    }
  }
  assert.equal(new Set(snapshots).size, 1,
    'equal simulation time produces one visual at every render rate');
});

test('impact presentation clears when simulation time or course resets', () => {
  const effects=createCombatEffects({loadTexture:loader(),crashPresentation:true});
  try {
    effects.recordVehicleSmash({severity:'smashed',dvMph:42,point},
      {enabled:true,atTime:100});
    const current=state();current.stageTimeSec=100.2;
    effects.update({state:current,course,dt:1/60,crashEnabled:true});
    const spark=visible(effects.group,'crash-vfx-impact-0-sparks');
    assert.equal(spark.visible,true);
    current.stageTimeSec=0;
    effects.update({state:current,course,dt:1/60,crashEnabled:true});
    assert.equal(spark.visible,false,'an old-stage hit cannot survive time reversal');

    effects.recordVehicleSmash({severity:'knocked',dvMph:24,point},
      {enabled:true,atTime:0});
    effects.update({state:current,course,dt:1/60,crashEnabled:true});
    const nextSpark=visible(effects.group,'crash-vfx-impact-1-sparks');
    assert.equal(nextSpark.visible,true);
    effects.update({state:current,course:{...course},dt:1/60,crashEnabled:true});
    assert.equal(nextSpark.visible,false,
      'an old-course hit cannot appear in a new world');
  } finally { effects.dispose(); }
});

test('impact presentation freezes while paused and expires after its bound', () => {
  const effects = createCombatEffects({loadTexture: loader(), crashPresentation: true});
  try {
    effects.recordVehicleSmash({severity: 'launched', dvMph: 80, point},
      {enabled: true});
    const current = state();
    current.paused = true;
    effects.update({state: current, course, dt: 1, crashEnabled: true});
    const spark = visible(effects.group, 'crash-vfx-impact-0-sparks');
    const frozen = spark.material.opacity;
    effects.update({state: current, course, dt: 1, crashEnabled: true});
    assert.equal(spark.material.opacity, frozen);
    current.paused = false;
    effects.update({state: current, course, dt: 1, crashEnabled: true});
    assert.equal(spark.visible, false, 'the one-shot retires after its bound');
  } finally {
    effects.dispose();
  }
});

test('tyre smoke exists only for live knocked motion', () => {
  const effects = createCombatEffects({loadTexture: loader(), crashPresentation: true});
  try {
    const current = state({knock: {severity: 'knocked', age: .2}});
    const before = JSON.stringify(current);
    effects.update({state: current, course, dt: 1 / 60, crashEnabled: true});
    const smoke = visible(effects.group, 'crash-vfx-knock-0-smoke');
    const second = visible(effects.group, 'crash-vfx-knock-1-smoke');
    assert.equal(smoke.visible, true);
    assert.equal(second.visible, true);
    const ground=course.groundAt(12,-2);
    const expected={x:ground.x-.68,y:ground.y,z:ground.z-1.05};
    assert.equal(smoke.position.x, expected.x);
    assert.equal(smoke.position.z, expected.z);
    assert.ok(smoke.position.y > expected.y && smoke.position.y < expected.y + 1,
      'smoke rises less than one metre from the tyre contact');
    assert.notDeepEqual(second.position.toArray(), smoke.position.toArray(),
      'the two rear tyre sites remain distinct');
    current.opponents[0].knock = null;
    effects.update({state: current, course, dt: 1 / 60, crashEnabled: true});
    assert.equal(smoke.visible, false);
    assert.equal(second.visible, false);
    assert.equal(JSON.stringify({...current,
      opponents: [{...current.opponents[0], knock: {severity: 'knocked', age: .2}}]}),
    before, 'rendering does not mutate actor state');
  } finally {
    effects.dispose();
  }
});

test('rear tyre smoke follows forward, spun and reverse vehicle yaw', () => {
  const effects=createCombatEffects({loadTexture:loader(),crashPresentation:true});
  try {
    const current=state({s:100,lateral:0,dir:1,headingError:0,
      knock:{severity:'knocked',age:.2}});
    const positions=[];
    for(const pose of [{dir:1,headingError:0},{dir:1,headingError:Math.PI/2},
      {dir:-1,headingError:0}]){
      Object.assign(current.opponents[0],pose);
      effects.update({state:current,course:flatCourse,dt:1/60,crashEnabled:true});
      positions.push([0,1].map(index=>{
        const p=visible(effects.group,`crash-vfx-knock-${index}-smoke`).position;
        return [p.x,p.z];
      }));
    }
    assert.deepEqual(positions[0],[[-.68,98.95],[.68,98.95]]);
    assert.deepEqual(positions[1],[[-1.05,100.68],[-1.05,99.32]]);
    assert.ok(positions[2].every(([,z])=>Math.abs(z-101.05)<1e-9),
      'a reverse-facing car emits behind its displayed body');
  } finally { effects.dispose(); }
});

test('the fixed smoke pool covers eight simultaneous knocked actors', () => {
  const effects=createCombatEffects({loadTexture:loader(),crashPresentation:true});
  try {
    const knocked=index=>({s:30+index,lateral:index,dir:1,headingError:0,
      knock:{severity:'knocked',age:.2}});
    const current=state();
    current.opponents=[knocked(0),knocked(1),knocked(2)];
    current.police.pursuit=knocked(3);
    current.traffic=[knocked(4),knocked(5),knocked(6),knocked(7)];
    effects.update({state:current,course:flatCourse,dt:1/60,crashEnabled:true});
    for(let index=0;index<16;index++)assert.equal(
      visible(effects.group,`crash-vfx-knock-${index}-smoke`).visible,true,
      `smoke slot ${index} covers an active tyre`);
  } finally { effects.dispose(); }
});

test('flag-off builds no crash pool and records no hit', () => {
  const effects = createCombatEffects({loadTexture: loader(), crashPresentation: false});
  try {
    assert.equal(effects.recordVehicleSmash(
      {severity: 'smashed', dvMph: 40, point}, {enabled: false}), false);
    assert.equal(!!effects.group.getObjectByName('crash-vfx-impact-0-sparks'), false);
    assert.equal(!!effects.group.getObjectByName('crash-vfx-impact-0-crumple'), false);
    assert.equal(!!effects.group.getObjectByName('crash-vfx-knock-0-smoke'), false);
  } finally {
    effects.dispose();
  }
});

test('all crash hits reuse one fixed pool', () => {
  const effects = createCombatEffects({loadTexture: loader(), crashPresentation: true});
  try {
    const initial = [];
    effects.group.traverse(object => initial.push(object.uuid));
    for (let index = 0; index < 80; index++) {
      effects.recordVehicleSmash({severity: 'smashed', dvMph: 25 + index,
        point: {x: index, y: 2, z: -index}}, {enabled: true});
      effects.update({state: state(), course, dt: 1 / 60, crashEnabled: true});
    }
    const after = [];
    effects.group.traverse(object => after.push(object.uuid));
    assert.deepEqual(after, initial);
  } finally {
    effects.dispose();
  }
});

test('launched traffic keeps the physical CRASH-01 wreck roll', async () => {
  const source = await import('../src/render3d.js?crash-roll-contract');
  assert.equal(source.crashRollVisual({wrecked: {roll: 1.25,
    severity: 'launched'}}), 1.25);
  assert.equal(source.crashRollVisual({wrecked: {roll: .2,
    severity: 'smashed'}}), .2);
  assert.equal(source.crashRollVisual({}), 0);
});

test('renderer owns one flagged listener, readiness gate and disposal path', async () => {
  const source=await readFile(new URL('../src/render3d.js',import.meta.url),'utf8');
  assert.match(source,/const stopCrashEvents=crashEffectsFlag\(\)\?app\.duel\.onChange/);
  assert.match(source,/if\(effectsField&&!combatEffectsPrepared\)\{/);
  assert.match(source,/if\(disposed\)return;disposed=true;stopCrashEvents\(\)/,
    'renderer disposal removes the crash event listener before resources');
});

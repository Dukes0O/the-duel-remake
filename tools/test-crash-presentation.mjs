import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createCombatEffects} from '../src/combat-effects.js';

const course = {groundAt: (s, lateral) => ({x: lateral * 4, y: 2, z: s * 3})};
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
    assert.equal(smoke.visible, true);
    const expected = course.groundAt(12, -2);
    assert.equal(smoke.position.x, expected.x);
    assert.equal(smoke.position.z, expected.z);
    assert.ok(smoke.position.y > expected.y && smoke.position.y < expected.y + 1,
      'smoke rises less than one metre from the tyre contact');
    current.opponents[0].knock = null;
    effects.update({state: current, course, dt: 1 / 60, crashEnabled: true});
    assert.equal(smoke.visible, false);
    assert.equal(JSON.stringify({...current,
      opponents: [{...current.opponents[0], knock: {severity: 'knocked', age: .2}}]}),
    before, 'rendering does not mutate actor state');
  } finally {
    effects.dispose();
  }
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

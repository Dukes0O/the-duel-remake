import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {createCombatEffects} from '../src/combat-effects.js';

// CRASH-05 (docs/CRASH_PHYSICS.md section 7). Kyle, 27 September 2026: at high
// speed Mad Max drove through traffic "like it's a gas". A struck car is a
// solid: it is smashed ahead and the attacker pays for it in speed. Only a
// hit over 250 km/h closing explodes the car, after it has been smashed
// forward. Wrecks stay solid and smoulder for the rest of the race.
const STAGE = COURSE.findIndex(stage => !stage.kind && stage.hasRival);
const BASE = 900;

function start(playerMph, {car = 'falcone_f42'} = {}) {
  const duel = new Duel({seed: 2709,
    featureFlags: {wasteland2: true}});
  duel.startCampaign({mode: 'wasteland', startStage: STAGE, car, opponentCount: 1});
  const s = duel.state;
  Object.assign(s, {status: 'racing', countdown: 0, invulnerableSec: 0,
    s: BASE, prevS: BASE, lateral: 0, prevLateral: 0, speedMph: playerMph,
    pushVelocity: 0, headingError: 0});
  Object.assign(s.input, {throttle: 1, brake: 0, steer: 0});
  for (const opponent of s.opponents) Object.assign(opponent, {s: BASE + 4000, prevS: BASE + 4000});
  s.traffic = []; s.trafficTimer = 999;
  const events = [];
  duel.onChange((state, event) => { if (event) events.push({event, time: state.stageTimeSec}); });
  return {duel, s, events};
}

function traffic(s, {mph = 40, at = BASE + 15, lateral = .3} = {}) {
  const car = {s: at, prevS: at, lateral, prevLateral: lateral, speedMph: mph,
    dir: 1, alive: true, headingError: 0, pushVelocity: 0, model: 'sedan'};
  s.traffic.push(car);
  return car;
}

const steps = (duel, seconds, each = () => {}) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) { duel.step(1 / 60); each(); }
};

for (const playerMph of [100, 160]) {
  test(`Mad Max: a ${playerMph} mph hit smashes the car ahead instead of passing through`, () => {
    const {duel, s} = start(playerMph);
    const car = traffic(s);
    const length = duel._vehicleSpec(s).halfLength + duel._vehicleSpec(car).halfLength;
    const width = duel._vehicleSpec(s).halfWidth + duel._vehicleSpec(car).halfWidth;
    let hitSpeed = null, overlaps = 0, ahead = null;
    steps(duel, 2.5, () => {
      if (hitSpeed == null && (car.wrecked || car.knock)) {
        hitSpeed = s.speedMph; return;
      }
      if (hitSpeed == null) return;
      ahead ??= car.s - s.s;
      // After the hit the bodies never share space: no driving through it.
      if (Math.abs(car.s - s.s) < length * .9 && Math.abs(car.lateral - s.lateral) < width * .9) overlaps++;
    });
    assert.ok(hitSpeed != null, 'the cars collide');
    assert.equal(overlaps, 0, 'the attacker never drives through the struck car');
    assert.ok(ahead > 0, 'the struck car is thrown ahead of the attacker');
    // Equal masses, closing C: each car's speed changes by about 0.6 C.
    const closing = playerMph - 40;
    assert.ok(hitSpeed <= playerMph - closing * .4,
      `the attacker pays in speed (${playerMph} to ${hitSpeed.toFixed(0)} mph)`);
  });
}

test('Mad Max: an armored player keeps control when smashing traffic', () => {
  const {duel, s} = start(160);
  traffic(s);
  let spun = false;
  steps(duel, 1, () => { spun ||= !!s.knock; });
  assert.equal(spun, false);
  assert.equal(s.stageCrashes || 0, 0, 'no crash penalty');
});

test('Mad Max: below 250 km/h closing a smashed car is wrecked but does not explode', () => {
  const {duel, s, events} = start(160);
  const car = traffic(s);
  steps(duel, 3);
  assert.ok(car.wrecked?.physical, 'the car is wrecked');
  assert.ok(!events.some(({event}) => event.roadsideImpact?.outcome === 'obliterate'),
    '193 km/h closing is no explosion');
  assert.ok(events.some(({event}) => event.roadsideImpact?.outcome === 'smash'), 'reported as a smash');
});

test('Mad Max: over 250 km/h the car is smashed forward first, then explodes', () => {
  const {duel, s, events} = start(200);
  const car = traffic(s, {mph: 30});
  let hitAt = null, hitS = null;
  steps(duel, 3, () => {
    if (hitAt == null && car.wrecked) { hitAt = s.stageTimeSec; hitS = car.s; }
  });
  const blast = events.find(({event}) => event.roadsideImpact?.outcome === 'obliterate');
  assert.ok(blast, '274 km/h closing explodes the car');
  assert.ok(blast.time - hitAt >= .3, `the blast follows the smash (${(blast.time - hitAt).toFixed(2)} s later)`);
  const blastS = duel.course.nearest(blast.event.roadsideImpact.hitPosition.x,
    blast.event.roadsideImpact.hitPosition.z, hitS).s;
  assert.ok(blastS > hitS + 8, `it explodes where the hulk has been thrown (${(blastS - hitS).toFixed(1)} m ahead)`);
  assert.ok(car.wrecked.exploded, 'the hulk is marked as burnt out');
});

test('Mad Max: a wreck stays solid; ramming it shoves it and costs speed', () => {
  const {duel, s} = start(20);
  const car = traffic(s, {mph: 0, at: BASE + 30, lateral: 0});
  car.alive = false;
  car.wrecked = {atTime: 0, age: 20, side: 1, lateralVelocity: 0, forwardVelocity: 0,
    verticalVelocity: 0, spinVelocity: 0, physical: true, rollLimit: .2};
  s.speedMph = 80;
  const before = car.s;
  let slowest = Infinity;
  steps(duel, 1.5, () => { slowest = Math.min(slowest, s.speedMph); });
  assert.ok(car.s - before >= 5, `the hulk is shoved along (${(car.s - before).toFixed(1)} m)`);
  assert.ok(slowest < 60, `the rammer slows (${slowest.toFixed(0)} mph)`);
});

test('Mad Max: wreckage smoulders for the rest of the race', () => {
  const effects = createCombatEffects({loadTexture: () => new THREE.Texture()});
  const course = {groundAt: (s, lateral) => ({x: lateral, y: 2, z: s, heading: 0})};
  const wreck = (s, exploded = false) => ({s, lateral: 12, alive: false,
    wrecked: {physical: true, age: 200, exploded}});
  const state = {mode: 'wasteland', status: 'racing', paused: false,
    stageTimeSec: 240, s: 100, lateral: 0, combat: {bursts: [], projectiles: [], pickups: []},
    opponents: [], traffic: [{s: 300, alive: true}, wreck(160), wreck(420, true), wreck(5000)],
    police: {pursuit: null}};
  try {
    effects.update({state, course, dt: 1 / 60});
    const smoke = effects.group.getObjectByName('combat-vfx-traffic-wreck-0-smoke');
    assert.ok(smoke?.visible, 'a wreck still smokes minutes after the crash');
    const shown = effects.group.children.filter(child =>
      child.name.startsWith('combat-vfx-traffic-wreck-') && child.name.endsWith('-smoke') && child.visible);
    assert.equal(shown.length, 2, 'the two wrecks near the player smoke; one far away does not');
    const ember = effects.group.getObjectByName('combat-vfx-traffic-wreck-1-fire');
    assert.ok(ember?.visible, 'a burnt-out hulk still glows');
  } finally { effects.dispose(); }
});

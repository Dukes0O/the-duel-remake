import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {fireWeapon} from '../src/combat-weapons.js';
import * as pickups from '../src/combat-pickups.js';

const {buildSeededPickupPlan, sweptPickupFraction, stepPickups} = pickups;

function race({seed = 1989, startStage = 0, cpuDifficulty = 'hard',
  wasteland2 = true, opponentCount = 3} = {}) {
  const duel = new Duel({seed, featureFlags: {wasteland2}});
  duel.startCampaign({mode: 'wasteland', seed, startStage, cpuDifficulty,
    opponentCount});
  const state = duel.state;
  assert.equal(state.mode, 'wasteland', 'fixture must be a combat race');
  state.status = 'racing';
  state.countdown = 0;
  state.traffic = [];
  state.combat.aiTimer = Infinity;
  state.combat.pickupTimer = Infinity;
  place(state, 500);
  state.opponents.forEach((actor, index) => place(actor, 900 + index * 50));
  return {duel, state, combat: state.combat};
}

function place(actor, s, lateral = 0) {
  actor.s = actor.prevS = s;
  actor.lateral = actor.prevLateral = lateral;
  actor.airHeight = actor.prevAirHeight = 0;
  actor.impactTimer = 0;
  actor.combatWrecking = false;
  actor.finished = false;
  actor.crushed = false;
}

function cross(actor, fromS, toS, lateral = 0) {
  actor.prevS = fromS;
  actor.s = toS;
  actor.prevLateral = actor.lateral = lateral;
}

function crate(kind, extras = {}) {
  return {id: `fixture-${kind}`, kind, lap: 0, s: 200, lateral: 0,
    age: 0, ...extras};
}

function close(actual, expected, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-6,
    `${label}: expected ${expected}, got ${actual}`);
}

test('a seeded two-lap plan has three drivable crates per lap and no inert ammo', () => {
  assert.equal(typeof buildSeededPickupPlan, 'function',
    'CMB-04 exports its deterministic plan seam');
  const {duel, state} = race();
  const plan = buildSeededPickupPlan(duel);
  assert.ok(Array.isArray(plan), 'plan is an ordered array');
  assert.equal(state.lapsTotal, 2, 'fixture expects two laps');
  assert.equal(plan.length, 6, 'three per lap and six maximum');
  assert.equal(new Set(plan.map(pickup => pickup.id)).size, 6,
    'each crate has a stable unique identity');
  for (const lap of [0, 1]) {
    const lapCrates = plan.filter(pickup => pickup.lap === lap);
    assert.equal(lapCrates.length, 3, `lap ${lap + 1} has three crates`);
    assert.equal(lapCrates.filter(pickup => pickup.kind === 'armor').length, 1,
      `lap ${lap + 1} has one repair crate`);
    assert.equal(lapCrates.filter(pickup => pickup.kind === 'weapon').length, 2,
      `lap ${lap + 1} has two weapon crates`);
    assert.ok(lapCrates.some(pickup => pickup.lateral < -0.5) &&
      lapCrates.some(pickup => pickup.lateral > 0.5),
    `lap ${lap + 1} spreads crates across both sides of the road`);
  }
  for (const pickup of plan) {
    assert.ok(Number.isFinite(pickup.s) && pickup.s > 0 &&
      pickup.s < duel.raceLength, 'crate is within the event route');
    assert.equal(Math.floor(pickup.s / duel.course.length), pickup.lap,
      'lap identity matches absolute route position');
    assert.ok(Number.isFinite(pickup.lateral) &&
      Math.abs(pickup.lateral) <= duel.course.roadHalfWidthAt(pickup.s) - 1.5,
    'crate is inside a drivable car-width road margin');
    assert.equal(duel.course.surfaceAt(pickup.s, pickup.lateral).road, true);
    if (pickup.kind === 'weapon') {
      assert.ok(['ufo', 'bomb', 'crossbow', 'star'].includes(pickup.weapon),
        'weapon crate identifies a current usable weapon');
    }
    assert.notEqual(pickup.kind, 'ammo',
      'on-foot ammo does not spawn before fighters exist');
  }
});

test('plan depends on seed and stage, not speed, frame history or CPU list order', () => {
  const {duel, state} = race();
  const original = buildSeededPickupPlan(duel);
  state.s = 1200;
  state.speedMph = 240;
  state.completedLaps = 1;
  state.combat.pickupCount = 99;
  state.combat.pickupTimer = -99;
  state.opponents.reverse();
  assert.deepEqual(buildSeededPickupPlan(duel), original,
    'progress, pace, timers and CPU order cannot change fixed crates');
  const seeded = buildSeededPickupPlan(race({seed: 2027}).duel);
  const staged = buildSeededPickupPlan(race({startStage: 1}).duel);
  const positions = plan => plan.map(({s, lateral, kind, weapon}) =>
    [s, lateral, kind, weapon]);
  assert.notDeepEqual(positions(seeded), positions(original),
    'another seed produces another fixed layout');
  assert.notDeepEqual(positions(staged), positions(original),
    'another stage produces another fixed layout');
});

test('swept contact uses the lateral position at the road crossing', () => {
  assert.equal(typeof sweptPickupFraction, 'function',
    'CMB-04 exports the swept contact seam');
  const pickup = crate('weapon', {weapon: 'star'});
  const actor = {prevS: 190, s: 210, prevLateral: -5,
    lateral: 5, airHeight: 0, impactTimer: 0};
  close(sweptPickupFraction(actor, pickup), .5, 'diagonal midpoint contact');
  actor.prevLateral = actor.lateral = 5;
  assert.equal(sweptPickupFraction(actor, pickup), null,
    'crossing the same road point in another lane misses');
  actor.prevS = 210;
  actor.s = 190;
  actor.prevLateral = actor.lateral = 0;
  assert.equal(sweptPickupFraction(actor, pickup), null,
    'reverse traversal does not collect a forward-road crate');
});

test('one crate goes to the earliest eligible crossing, including later CPU cars', () => {
  const {duel, state, combat} = race();
  const later = state.opponents[2];
  state.armor = state.maxArmor - 40;
  later.armor = later.maxArmor - 40;
  cross(state, 190, 210); // fraction 0.5
  cross(later, 198, 205); // fraction 2/7, earlier in the same step
  combat.pickups.push(crate('armor'));
  stepPickups(duel, 1 / 30);
  close(later.armor, later.maxArmor - 15, 'earlier CPU gets +25');
  close(state.armor, state.maxArmor - 40, 'later player gets none');
  assert.equal(combat.pickups.length, 0, 'crate is removed once');
});

test('equal crossing fractions resolve in player then CPU list order', () => {
  const {duel, state, combat} = race();
  state.armor = state.maxArmor - 40;
  state.opponents.forEach(actor => { actor.armor = actor.maxArmor - 40; });
  cross(state, 190, 210);
  state.opponents.forEach(actor => cross(actor, 190, 210));
  combat.pickups.push(crate('armor'));
  stepPickups(duel, 1 / 60);
  close(state.armor, state.maxArmor - 15, 'player wins exact tie');
  for (const actor of state.opponents) {
    close(actor.armor, actor.maxArmor - 40, 'CPU does not share the crate');
  }

  const next = race();
  const [first, second] = next.state.opponents;
  first.armor = first.maxArmor - 40;
  second.armor = second.maxArmor - 40;
  cross(first, 190, 210);
  cross(second, 190, 210);
  next.combat.pickups.push(crate('armor'));
  stepPickups(next.duel, 1 / 60);
  close(first.armor, first.maxArmor - 15, 'first CPU wins CPU tie');
  close(second.armor, second.maxArmor - 40, 'second CPU gets none');
});

test('repair adds at most 25, clamps at each car maximum and skips full or wrecking cars', () => {
  const {duel, state, combat} = race();
  const [first, second] = state.opponents;
  state.armor = state.maxArmor;
  first.armor = first.maxArmor - 10;
  first.combatWrecking = true;
  second.armor = second.maxArmor - 10;
  cross(state, 194, 206);
  cross(first, 190, 210);
  cross(second, 190, 210);
  combat.pickups.push(crate('armor'));
  stepPickups(duel, 1 / 60);
  close(state.armor, state.maxArmor, 'full player is unchanged');
  close(first.armor, first.maxArmor - 10, 'wrecking CPU is unchanged');
  close(second.armor, second.maxArmor, 'later eligible CPU fills at its own cap');
  assert.equal(combat.pickups.length, 0);

  const untouched = race();
  untouched.state.armor = untouched.state.maxArmor;
  cross(untouched.state, 190, 210);
  untouched.combat.pickups.push(crate('armor'));
  stepPickups(untouched.duel, 1 / 60);
  assert.equal(untouched.combat.pickups.length, 1,
    'a full car cannot waste repair when nobody needs it');
});

test('weapon crates recharge only a usable weapon, with CPU ownership kept separate', () => {
  const {duel, state, combat} = race();
  cross(state, 190, 210);
  combat.cooldowns.star = 5;
  combat.pickups.push(crate('weapon', {weapon: 'star'}));
  stepPickups(duel, 1 / 60);
  close(combat.cooldowns.star, 0, 'player star recharged');
  assert.equal(combat.pickups.length, 0);

  const next = race();
  const later = next.state.opponents[2];
  cross(later, 190, 210);
  next.combat.pickups.push(crate('weapon', {weapon: 'crossbow'}));
  stepPickups(next.duel, 1 / 60);
  assert.equal(later.cpuPickupCharges?.crossbow, 1,
    'later CPU gets its own weapon charge');
  assert.equal(next.combat.cpuPickupCharges.crossbow, 0,
    'first-rival charge pool remains separate');
  assert.equal(next.combat.pickups.length, 0);

  const ready = race();
  cross(ready.state, 190, 210);
  ready.combat.cooldowns.star = 0;
  ready.combat.pickups.push(crate('weapon', {weapon: 'star'}));
  stepPickups(ready.duel, 1 / 60);
  assert.equal(ready.combat.pickups.length, 1,
    'an already ready weapon does not waste a crate');
});

test('UFO crate cannot bypass the one-jump-per-lap gate', () => {
  const {duel, state, combat} = race();
  state.nextLapGate = 1;
  combat.ufoUsedLaps[state.completedLaps] = true;
  combat.cooldowns.ufo = 10;
  cross(state, 190, 210);
  combat.pickups.push(crate('weapon', {weapon: 'ufo'}));
  stepPickups(duel, 1 / 60);
  assert.equal(combat.ufoUsedLaps[state.completedLaps], true);
  assert.equal(fireWeapon(duel, 'ufo'), false,
    'a collected recharge still cannot jump twice on one lap');
});

test('Easy CPU ignores crates and leaves them for another eligible actor', () => {
  const {duel, state, combat} = race({cpuDifficulty: 'easy'});
  place(state, 180);
  const later = state.opponents[2];
  later.armor = later.maxArmor - 40;
  cross(later, 190, 210);
  combat.pickups.push(crate('armor'));
  stepPickups(duel, 1 / 60);
  close(later.armor, later.maxArmor - 40, 'Easy CPU cannot repair');
  assert.equal(combat.pickups.length, 1, 'Easy CPU does not remove the crate');
});

test('30, 60 and 144 FPS all collect one crate on a swept crossing', () => {
  for (const fps of [30, 60, 144]) {
    const {duel, state, combat} = race();
    state.armor = state.maxArmor - 40;
    combat.pickups.push(crate('armor'));
    let collected = 0;
    duel.onChange((_, event) => {
      if (event.powerupCollected) collected++;
    });
    for (let frame = 1; frame <= fps; frame++) {
      const from = 180 + 40 * (frame - 1) / fps;
      const to = 180 + 40 * frame / fps;
      cross(state, from, to);
      stepPickups(duel, 1 / fps);
    }
    close(state.armor, state.maxArmor - 15, `${fps} FPS armor repair`);
    assert.equal(combat.pickups.length, 0, `${fps} FPS crate removed once`);
    assert.equal(collected, 1, `${fps} FPS emits one collection event`);
  }
});

test('flag-off Wasteland keeps the timed center-lane legacy crate', () => {
  const {duel, state, combat} = race({wasteland2: false, opponentCount: 1});
  place(state, 100);
  combat.pickupTimer = 4;
  stepPickups(duel, 4);
  assert.equal(combat.pickups.length, 1);
  const pickup = combat.pickups[0];
  assert.equal(pickup.weapon, 'ufo');
  assert.equal(pickup.lateral, undefined,
    'legacy crate has no new lateral field');
  assert.equal(pickup.kind, undefined,
    'legacy crate shape is unchanged');
  combat.cooldowns.ufo = 10;
  cross(state, pickup.s - 10, pickup.s + 10, 0);
  stepPickups(duel, .05);
  assert.equal(combat.cooldowns.ufo, 0,
    'flag-off collection retains the old recharge rule');
  assert.equal(combat.pickups.length, 0);
});

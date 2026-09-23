import assert from 'node:assert/strict';
import test from 'node:test';
import {CARS} from '../src/config.js';
import {Duel} from '../src/game.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {stepCombat} from '../src/combat.js';

const close = (actual, expected, message, tolerance = 1e-6) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`);

function race({mode = 'wasteland', car = 'falcone_f42', opponentCount = 3,
  wasteland2 = true, startStage = 0} = {}) {
  const duel = new Duel({seed: 1989, car, featureFlags: {wasteland2}});
  duel.startCampaign({mode, car, startStage, opponentCount, cpuDifficulty: 'hard'});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  state.s = state.prevS = 500;
  state.lateral = state.prevLateral = 0;
  state.speedMph = 0;
  state.invulnerableSec = 0;
  state.traffic = [];
  if (state.combat) {
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
  }
  state.opponents.forEach((actor, index) => place(actor, 100 + index * 80));
  return {duel, state};
}

function place(actor, s, lateral = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral,
    speedMph: 0, pushVelocity: 0, headingError: 0, impactTimer: 0,
    bombImpactCooldown: 0});
}

function boltAt(duel, actor, enemy = false) {
  const at = duel.course.groundAt(actor.s, actor.lateral);
  duel.state.combat.projectiles.push({kind: 'crossbow', enemy, level: 0,
    x: at.x, y: at.y + 2, z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
}

function bombAt(duel, actor, {enemy = false, age = 1.5, sourceIndex} = {}) {
  const at = duel.course.groundAt(actor.s, actor.lateral);
  duel.state.combat.projectiles.push({kind: 'bomb', enemy, level: 0,
    x: at.x, y: at.y + 1, z: at.z, vx: 0, vy: 0, vz: 0, age,
    ...(sourceIndex == null ? {} : {sourceIndex})});
}

function advance(duel, seconds) {
  const frames = Math.round(seconds * 60);
  for (let index = 0; index < frames; index++) duel.step(1 / 60);
}

function seedArmor(state) {
  // Isolate damage-path assertions from the separate starting-armor test.
  for (const actor of [state, ...state.opponents]) {
    actor.maxArmor ??= 100;
    actor.armor ??= actor.maxArmor;
  }
}

test('wasteland2 starts as a dev feature and flag-off races keep their current state', () => {
  assert.equal(FEATURE_STATES.wasteland2, 'dev');
  for (const options of [
    {mode: 'wasteland', wasteland2: false},
    {mode: 'duel'},
    {mode: 'timetrial'},
    {mode: 'duel', startStage: 7},
  ]) {
    const {state} = race(options);
    assert.equal(state.armor, undefined, `${options.mode} player has no new armor`);
    assert.ok(state.opponents.every(actor => actor.armor === undefined),
      `${options.mode} CPU cars have no new armor`);
  }
});

test('ordinary and flag-off races have no armor before the new feature is enabled', () => {
  for (const options of [
    {mode: 'wasteland', wasteland2: false},
    {mode: 'duel'},
    {mode: 'timetrial'},
    {mode: 'duel', startStage: 7},
  ]) {
    const {state} = race(options);
    assert.equal(state.armor, undefined, `${options.mode} player retains prior state`);
    assert.ok(state.opponents.every(actor => actor.armor === undefined),
      `${options.mode} opponents retain prior state`);
  }
});

test('all nine car masses and both clamps set the exact base maximum armor', async () => {
  const {maxArmorForMass} = await import('../src/combat-armor.js');
  const expected = {
    falcone_f42: 100,
    stuttgart_959s: 100,
    falcone_heritage: 100,
    aurora_gt: 100,
    dusthawk_rally: 93.95523512235255,
    banshee_muscle: 111.72626647610515,
    viper_proto: 80.51557998728975,
    titan_monster: 160,
    koenigsegg_jesko: 97.90917677394559,
  };
  assert.deepEqual(Object.keys(CARS).sort(), Object.keys(expected).sort(),
    'every selectable car must have an armor expectation');
  for (const [key, car] of Object.entries(CARS)) {
    close(maxArmorForMass(car.mass ?? 1450), expected[key], key);
  }
  close(maxArmorForMass(100), 80, 'lightweight clamp');
  close(maxArmorForMass(10000), 160, 'heavyweight clamp');
});

test('damage table, upgrades, falloff and the ram threshold have exact values', async () => {
  const {armorDamageFor} = await import('../src/combat-armor.js');
  close(armorDamageFor('crossbow'), 12, 'level-zero crossbow');
  close(armorDamageFor('bomb'), 18, 'bomb center');
  close(armorDamageFor('rocket'), 10, 'rocket pod');
  close(armorDamageFor('rpg-direct'), 35, 'RPG direct');
  close(armorDamageFor('rpg-splash'), 20, 'RPG splash');
  close(armorDamageFor('scenery'), 20, 'major scenery');
  close(armorDamageFor('crossbow', {level: 1}), 13.8, 'level-one bolt');
  close(armorDamageFor('crossbow', {level: 3}), 17.4, 'level-three bolt');
  close(armorDamageFor('bomb', {level: 1}), 20.7, 'level-one bomb center');
  const half = armorDamageFor('bomb', {distanceFraction: .5});
  assert.ok(half > 0 && half < 18, 'bomb damage falls with distance');
  close(armorDamageFor('bomb', {distanceFraction: 1}), 0, 'bomb radius edge');
  close(armorDamageFor('ram', {relativeKph: 40}), 0, 'ram threshold is strictly above 40 km/h');
  close(armorDamageFor('ram', {relativeKph: 50}), 10, '50 km/h ram');
  close(armorDamageFor('ram', {relativeKph: 50, spiked: true}), 15, 'future spiked bumper');
});

test('wasteland2 initializes independent armor for the player and three CPU cars', () => {
  const {state} = race({car: 'viper_proto'});
  close(state.maxArmor, 80.51557998728975, 'player Viper maximum');
  close(state.armor, state.maxArmor, 'player starts full');
  assert.equal(state.opponents.length, 3);
  for (const [index, actor] of state.opponents.entries()) {
    assert.ok(Number.isFinite(actor.maxArmor) && actor.maxArmor >= 80 && actor.maxArmor <= 160,
      `CPU ${index + 1} gets mass-based armor`);
    close(actor.armor, actor.maxArmor, `CPU ${index + 1} starts full`);
  }
  assert.equal(state.rival, state.opponents[0], 'legacy first-rival alias remains');
});

test('a level-zero bolt removes 12 armor from only the struck later opponent', () => {
  const {duel, state} = race();
  seedArmor(state);
  const [first, second, third] = state.opponents;
  const before = second.armor;
  boltAt(duel, second);
  stepCombat(duel, .01);
  close(second.armor, before - 12, 'second opponent bolt loss');
  close(first.armor, first.maxArmor, 'first opponent is untouched');
  close(third.armor, third.maxArmor, 'third opponent is untouched');
  close(state.armor, state.maxArmor, 'player is untouched');
});

test('a centered bomb reaches 18 armor damage and falls off for a farther car', () => {
  const {duel, state} = race();
  seedArmor(state);
  const [first, second, third] = state.opponents;
  place(first, 300);
  place(second, 100);
  place(third, 110);
  bombAt(duel, second);
  stepCombat(duel, .01);
  close(second.maxArmor - second.armor, 18, 'centered level-zero blast');
  assert.ok(third.maxArmor - third.armor > 0 && third.maxArmor - third.armor < 18,
    'third car receives smaller blast damage');
  close(first.armor, first.maxArmor, 'distant car is outside the blast');
});

test('each actor’s own star blocks bolts, bombs and self damage', () => {
  const {duel, state} = race();
  seedArmor(state);
  const [first, second, third] = state.opponents;
  state.combat.shield = 2;
  state.combat.rivalShield = 2;
  second.combatShield = 2;
  boltAt(duel, second);
  bombAt(duel, first);
  bombAt(duel, state);
  stepCombat(duel, .01);
  for (const actor of [state, first, second]) close(actor.armor, actor.maxArmor,
    'a shielded actor takes no armor damage');
  close(third.armor, third.maxArmor, 'distant unshielded CPU stays full');
});

test('a high-relative-speed car ram costs armor, but the target star blocks it', () => {
  function contact(shielded) {
    const {duel, state} = race();
    seedArmor(state);
    const [target, second, third] = state.opponents;
    place(state, 102);
    state.prevS = 98;
    state.speedMph = 80;
    place(target, 104);
    target.speedMph = 20;
    place(second, 300);
    place(third, 400);
    if (shielded) state.combat.rivalShield = 2;
    assert.equal(duel._vehicleContact(state, target, 'rival'), true,
      'the fixture makes a real swept car contact');
    return {target, state};
  }
  const clear = contact(false);
  assert.ok(clear.target.armor < clear.target.maxArmor,
    'the unshielded target loses armor in a fast ram');
  const blocked = contact(true);
  close(blocked.target.armor, blocked.target.maxArmor,
    'the target star blocks fast ram armor loss');
});

test('major scenery costs 20 armor and a star blocks that loss', () => {
  const clear = race();
  seedArmor(clear.state);
  const original = clear.state.armor;
  clear.duel._crash('rock', 1, 120);
  close(clear.state.armor, original - 20, 'major rock crash armor cost');
  assert.equal(clear.state.status, 'racing');
  assert.equal(clear.state.stageCrashes, 0,
    'armor-bearing major impact does not spend the ordinary crash slots');
  const protectedRace = race();
  seedArmor(protectedRace.state);
  protectedRace.state.combat.shield = 2;
  protectedRace.duel._crash('rock', 1, 120);
  close(protectedRace.state.armor, protectedRace.state.maxArmor,
    'player star blocks major scenery armor loss');
});

test('a bomb near its thrower waits 0.35 s to arm and limits self damage', () => {
  const {duel, state} = race();
  seedArmor(state);
  const initial = state.armor;
  bombAt(duel, state, {age: 0});
  // A bomb touching ground inside its thrower's footprint is the arming edge.
  state.combat.projectiles.at(-1).y = duel.course.groundAt(state.s, state.lateral).y + .2;
  stepCombat(duel, .34);
  close(state.armor, initial, 'unarmed nearby bomb leaves thrower unharmed');
  assert.equal(state.combat.projectiles.length, 1,
    'nearby bomb remains live while unarmed');
  stepCombat(duel, .02);
  const selfDamage = initial - state.armor;
  assert.ok(selfDamage > 0 && selfDamage <= 18 * .25 + 1e-6,
    `armed bomb self damage is at most one quarter, got ${selfDamage}`);
});

test('zero armor wrecks the player once, then restores 60% near the impact', () => {
  const {duel, state} = race();
  seedArmor(state);
  const events = [];
  duel.onChange((_, event) => { if (event.combatWreck) events.push(event); });
  const origin = duel.course.worldAt(state.s, state.lateral);
  const before = {lives: state.lives, stageCrashes: state.stageCrashes,
    majorCrashes: state.majorCrashes, penalty: state.racePenaltySec,
    time: state.stageTimeSec};
  state.armor = 12;
  boltAt(duel, state, true);
  stepCombat(duel, .01);
  close(state.armor, 0, 'exact zero starts the wreck');
  assert.equal(events.length, 1, 'one wreck emits once');
  assert.equal(events[0].victim, 'player');
  assert.ok(['x', 'y', 'z'].every(axis => Number.isFinite(events[0].hitPosition?.[axis])));
  assert.equal(state.status, 'racing', 'combat wreck does not end the race');
  assert.equal(state.lives, before.lives);
  assert.equal(state.stageCrashes, before.stageCrashes);
  assert.equal(state.majorCrashes, before.majorCrashes);
  advance(duel, 3.6);
  close(state.armor, state.maxArmor * .6, 'player refill after recovery');
  const recovered = duel.course.worldAt(state.s, state.lateral);
  assert.ok(Math.hypot(recovered.x - origin.x, recovered.z - origin.z) <= 12.1,
    'player recovers within the existing 12 m clearance search');
  assert.equal(events.length, 1, 'wreck does not repeat during recovery');
  assert.equal(state.racePenaltySec, before.penalty,
    'the 3.5 s loss is the recovery lock, not a second added penalty');
  assert.ok(state.stageTimeSec - before.time >= 3.45,
    'the recovery lock consumes about 3.5 s of race time');
});

test('a later CPU car wrecks separately and returns with its own 60% armor', () => {
  const {duel, state} = race();
  seedArmor(state);
  const [first, second, third] = state.opponents;
  const events = [];
  duel.onChange((_, event) => { if (event.combatWreck) events.push(event); });
  const origin = duel.course.worldAt(second.s, second.lateral);
  second.armor = 12;
  boltAt(duel, second);
  stepCombat(duel, .01);
  close(second.armor, 0, 'second CPU reaches zero');
  assert.equal(events.length, 1);
  assert.equal(events[0].victim, 'rival', 'existing rival event category remains stable');
  assert.equal(events[0].opponentIndex, 1, 'event identifies the second CPU car');
  assert.ok(['x', 'y', 'z'].every(axis => Number.isFinite(events[0].hitPosition?.[axis])));
  close(first.armor, first.maxArmor, 'first CPU owns separate armor');
  close(third.armor, third.maxArmor, 'third CPU owns separate armor');
  advance(duel, 3.6);
  close(second.armor, second.maxArmor * .6, 'second CPU refills its own maximum');
  const recovered = duel.course.worldAt(second.s, second.lateral);
  assert.ok(Math.hypot(recovered.x - origin.x, recovered.z - origin.z) <= 12.1,
    'second CPU recovers near its own crash site');
  assert.equal(state.status, 'racing');
});

test('ordinary racing still spends its original crash slot with the new switch on', () => {
  const {duel, state} = race({mode: 'duel', opponentCount: 1});
  const before = {lives: state.lives, stageCrashes: state.stageCrashes};
  duel._crash('rock', 1, 80);
  assert.equal(state.lives, before.lives - 1);
  assert.equal(state.stageCrashes, before.stageCrashes + 1);
  assert.equal(state.armor, undefined);
});

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {DRIVE} from '../src/config.js';
import {LegacyRoadsideDuel, ClassicDestructionDuel} from './legacy-roadside-duel.mjs';
import {armorDamageFor} from '../src/combat-armor.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';

const KPH_PER_MPH = COMBAT_TUNING.armor.kphPerMph;
const close = (actual, expected, label, tolerance = 1e-6) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);
const round = value => Number.isFinite(value) ? +value.toFixed(6) : value ?? null;

function place(actor, s, lateral = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral,
    speedMph: 0, pushVelocity: 0, headingError: 0, slipAngle: 0,
    impactTimer: 0, contactCooldown: 0, damageCooldown: 0,
    airborne: false, airHeight: 0, prevAirHeight: 0});
}

function race({mode = 'wasteland', wasteland2 = true, crashPhysics = true,
  car = 'falcone_f42', classicDestruction = false} = {}) {
  // Pin the legacy control even after roadside destruction is on by default.
  const duel = new (classicDestruction ? ClassicDestructionDuel : LegacyRoadsideDuel)({seed: 1989, car,
    featureFlags: {wasteland2, 'crash-physics': crashPhysics}});
  duel.startCampaign({mode, car, startStage: 0, opponentCount: 3,
    cpuDifficulty: 'hard'});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  place(state, 500);
  state.invulnerableSec = 0;
  state.traffic = [];
  state.opponents.forEach((actor, index) => place(actor, 600 + index * 80));
  if (state.combat) {
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    state.combat.shield = 0;
    state.combat.rivalShield = 0;
  }
  const events = [];
  duel.onChange((_, event) => events.push(event));
  return {duel, state, events};
}

function rearContact(field, attacker, victim, {attackerMph = 80,
  victimMph = 20, lateral = 0} = {}) {
  place(attacker, 102);
  attacker.prevS = 98;
  attacker.speedMph = attackerMph;
  place(victim, 104, lateral);
  victim.speedMph = victimMph;
  assert.equal(field.duel._vehicleContact(attacker, victim, 'rival'), true,
    'the swept rear contact reaches the target');
}

function ramEvents(field) {
  return field.events.filter(event => event.combatRamHit);
}

function ownedHit(field, attackerIndex, victimIndex) {
  return ramEvents(field).find(event =>
    event.attackerIndex === attackerIndex && event.victimIndex === victimIndex);
}

function checkHit(event, {attackerIndex, victimIndex, armorRemoved, closingKph,
  spiked}) {
  assert.ok(event, `ram hit ${attackerIndex} to ${victimIndex} is emitted`);
  assert.equal(event.attackerIndex, attackerIndex);
  assert.equal(event.victimIndex, victimIndex);
  assert.equal(event.attacker, attackerIndex < 0 ? 'player' : 'rival');
  assert.equal(event.victim, victimIndex < 0 ? 'player' : 'rival');
  close(event.armorRemoved, armorRemoved, 'actual armor removed');
  close(event.closingKph, closingKph, 'closing speed uses km/h');
  assert.equal(event.spiked, spiked);
  assert.ok(event.hitPosition &&
    [event.hitPosition.x, event.hitPosition.y, event.hitPosition.z].every(Number.isFinite),
  'ram event carries a finite hit position');
}

test('ram damage uses a strict 40 km/h closing threshold and an 80-armor cap', () => {
  close(armorDamageFor('ram', {relativeKph: 40}), 0, '40 km/h does no damage');
  close(armorDamageFor('ram', {relativeKph: 40.001}), 8.0002,
    'just over 40 km/h starts proportional damage');
  close(armorDamageFor('ram', {relativeKph: 50}), 10, '50 km/h plain ram');
  close(armorDamageFor('ram', {relativeKph: 50, spiked: true}), 15,
    'equipped front bumper adds fifty percent');
  close(armorDamageFor('ram', {relativeKph: 500, spiked: true}), 80,
    'the high-speed armor hit remains capped');
});

test('a player front bumper spikes only the struck CPU car', () => {
  const field = race();
  const target = field.state.opponents[1];
  const closingKph = 60 * KPH_PER_MPH;
  rearContact(field, field.state, target);
  const targetLoss = target.maxArmor - target.armor;
  const playerLoss = field.state.maxArmor - field.state.armor;
  close(targetLoss, armorDamageFor('ram', {relativeKph: closingKph, spiked: true}),
    'front bumper increases damage to the target');
  close(playerLoss, armorDamageFor('ram', {relativeKph: closingKph}),
    'front bumper does not increase damage to its own car');
  checkHit(ownedHit(field, -1, 1), {attackerIndex: -1, victimIndex: 1,
    armorRemoved: targetLoss, closingKph, spiked: true});
});

test('a disabled bumper and rear or side contact have plain ram damage', () => {
  const disabled = race();
  const disabledTarget = disabled.state.opponents[1];
  disabled.state.combatBumperSpikes = false;
  rearContact(disabled, disabled.state, disabledTarget);
  close(disabledTarget.maxArmor - disabledTarget.armor,
    armorDamageFor('ram', {relativeKph: 60 * KPH_PER_MPH}),
    'explicitly disabled front spikes give plain damage');
  assert.equal(ownedHit(disabled, -1, 1)?.spiked, false);

  const reversing = race();
  const rearTarget = reversing.state.opponents[1];
  place(reversing.state, 104);
  reversing.state.prevS = 110;
  reversing.state.speedMph = -80;
  place(rearTarget, 102);
  assert.equal(reversing.duel._vehicleContact(reversing.state, rearTarget, 'rival'), true);
  close(rearTarget.maxArmor - rearTarget.armor,
    armorDamageFor('ram', {relativeKph: 80 * KPH_PER_MPH}),
    'a reverse strike with the player rear receives no front-spike bonus');
  assert.equal(ownedHit(reversing, -1, 1)?.spiked, false);

  const side = race();
  const sideTarget = side.state.opponents[1];
  place(side.state, 102, -1);
  side.state.prevLateral = -6;
  side.state.pushVelocity = 25;
  place(sideTarget, 102, 0);
  assert.equal(side.duel._vehicleContact(side.state, sideTarget, 'rival'), true);
  const lateralKph = 25 / DRIVE.mphToWorld * KPH_PER_MPH;
  close(sideTarget.maxArmor - sideTarget.armor,
    armorDamageFor('ram', {relativeKph: lateralKph}),
    'a lateral shove receives no front-spike bonus');
  assert.equal(ownedHit(side, -1, 1)?.spiked, false);
});

test('both equipped fronts can strike in a head-on CPU contact', () => {
  const field = race();
  const first = field.state.opponents[1], second = field.state.opponents[2];
  place(first, 102);
  first.prevS = 98;
  first.speedMph = 80;
  place(second, 106);
  second.prevS = 110;
  second.speedMph = 80;
  second.dir = -1;
  assert.equal(field.duel._vehicleContact(first, second, 'rival'), true);
  const closingKph = 160 * KPH_PER_MPH;
  const damage = armorDamageFor('ram', {relativeKph: closingKph, spiked: true});
  close(first.maxArmor - first.armor, damage, 'first CPU takes the other front spike');
  close(second.maxArmor - second.armor, damage, 'second CPU takes the first front spike');
  checkHit(ownedHit(field, 1, 2), {attackerIndex: 1, victimIndex: 2,
    armorRemoved: damage, closingKph, spiked: true});
  checkHit(ownedHit(field, 2, 1), {attackerIndex: 2, victimIndex: 1,
    armorRemoved: damage, closingKph, spiked: true});
});

test('player can strike every CPU and a later CPU can strike the player', () => {
  for (const index of [0, 1, 2]) {
    const field = race();
    const target = field.state.opponents[index];
    rearContact(field, field.state, target);
    assert.ok(target.armor < target.maxArmor, `CPU ${index} loses armor`);
    checkHit(ownedHit(field, -1, index), {attackerIndex: -1,
      victimIndex: index, armorRemoved: target.maxArmor - target.armor,
      closingKph: 60 * KPH_PER_MPH, spiked: true});
  }

  const field = race();
  const cpu = field.state.opponents[1];
  place(field.state, 102);
  field.state.prevS = 98;
  field.state.speedMph = 20;
  place(cpu, 106);
  cpu.prevS = 110;
  cpu.speedMph = 80;
  cpu.dir = -1;
  assert.equal(field.duel._vehicleContact(field.state, cpu, 'rival'), true,
    'an intentional head-on CPU approach is a contact, not a cut-in yield');
  assert.ok(field.state.armor < field.state.maxArmor,
    'the CPU strike removes player armor');
  checkHit(ownedHit(field, 1, -1), {attackerIndex: 1, victimIndex: -1,
    armorRemoved: field.state.maxArmor - field.state.armor,
    closingKph: 100 * KPH_PER_MPH, spiked: true});
});

test('a shield blocks armor loss but still allows the physical shove', () => {
  const field = race();
  const target = field.state.opponents[1];
  target.combatShield = 2;
  rearContact(field, field.state, target, {lateral: .6});
  close(target.armor, target.maxArmor, 'the target star blocks armor damage');
  assert.ok(target.pushVelocity > 0 || target.speedMph > 20,
    'the shielded target still receives the physical push');
  checkHit(ownedHit(field, -1, 1), {attackerIndex: -1, victimIndex: 1,
    armorRemoved: 0, closingKph: 60 * KPH_PER_MPH, spiked: true});
});

test('a lower-speed rear contact transfers momentum without armor damage', () => {
  const field = race();
  const target = field.state.opponents[1];
  rearContact(field, field.state, target, {attackerMph: 20,
    victimMph: 10, lateral: .6});
  assert.ok(field.state.speedMph < 20, 'the striking car gives up speed');
  assert.ok(target.speedMph > 10, 'the struck car gains speed');
  assert.ok(target.pushVelocity > 0, 'the off-centre contact moves the target sideways');
  close(field.state.armor, field.state.maxArmor, 'striker keeps its armor');
  close(target.armor, target.maxArmor, 'target keeps its armor');
  assert.equal(field.state.stageCrashes, 0);
  assert.equal(ramEvents(field).length, 0, 'sub-threshold contact has no armor-hit event');
});

test('equal-speed 300 km/h cars can shovel without armor loss or crash recovery', () => {
  const field = race();
  const target = field.state.opponents[1];
  const speed = 300 / KPH_PER_MPH;
  field.state.input.steer = 1;
  rearContact(field, field.state, target, {attackerMph: speed,
    victimMph: speed, lateral: .6});
  close(field.state.armor, field.state.maxArmor, 'player armor stays full');
  close(target.armor, target.maxArmor, 'target armor stays full');
  assert.ok(target.pushVelocity > 0, 'the equal-speed target is shoveable');
  assert.equal(field.state.impactTimer, 0);
  assert.equal(field.state.stageCrashes, 0);
  assert.equal(target.combatWrecking, false);
});

test('a severe mass-driven ram launches a car; overkill wrecks and recovers locally', () => {
  const field = race({car: 'titan_monster'});
  const target = field.state.opponents[1];
  target.car = 'viper_proto';
  target.armor = 5;
  const crashes = field.state.stageCrashes;
  rearContact(field, field.state, target, {attackerMph: 140,
    victimMph: 20, lateral: .6});
  assert.ok(target._ramVerticalSpeed > 0 || target.combatWrecking,
    'closing momentum briefly launches the struck car');
  assert.equal(target.combatWrecking, true);
  close(target.armor, 0, 'overkill stops at zero armor');
  assert.ok(target.maxArmor > 0, 'the victim retains its original maximum armor');
  assert.notEqual(target.crushed, true, 'the combat car is recoverable');
  assert.equal(field.state.stageCrashes, crashes, 'no ordinary crash slot is spent');
  checkHit(ownedHit(field, -1, 1), {attackerIndex: -1, victimIndex: 1,
    armorRemoved: 5, closingKph: 120 * KPH_PER_MPH, spiked: true});
  for (let tick = 0; tick < 216; tick++) field.duel.step(1 / 60);
  assert.equal(target.combatWrecking, false, 'the CPU returns after its local wreck');
  close(target.armor, target.maxArmor * .6, 'recovery restores 60% armor');
});

test('one continuous actor-pair contact hits once and rearms only after separation', () => {
  const field = race();
  const target = field.state.opponents[1];
  rearContact(field, field.state, target);
  const firstArmor = [field.state.armor, target.armor];
  const firstEvents = ramEvents(field).length;
  assert.ok(firstEvents > 0, 'first contact emits a ram-hit event');
  const firstMotion = [field.state.speedMph, target.speedMph,
    field.state.pushVelocity, target.pushVelocity];
  for (let frame = 0; frame < 90; frame++) {
    field.state.stageTimeSec += 1 / 60;
    field.state.s = 102;
    field.state.prevS = 98;
    target.s = target.prevS = 104;
    assert.equal(field.duel._vehicleContact(field.state, target, 'rival'), true,
      'the continuing overlap is still physically separated');
  }
  assert.deepEqual([field.state.armor, target.armor], firstArmor,
    'time spent overlapping cannot repeat armor damage');
  assert.equal(ramEvents(field).length, firstEvents,
    'time spent overlapping cannot emit another hit');
  assert.deepEqual([field.state.speedMph, target.speedMph,
    field.state.pushVelocity, target.pushVelocity], firstMotion,
  'time spent overlapping cannot repeat the impulse');

  place(field.state, 100);
  place(target, 120);
  assert.equal(field.duel._vehicleContact(field.state, target, 'rival'), false,
    'separation clears the contact envelope');
  rearContact(field, field.state, target);
  assert.ok(ramEvents(field).length > firstEvents,
    'returning to the same coordinates starts a new incident');
  assert.ok(target.armor < firstArmor[1], 'a new incident can remove armor');
});

test('scripted contact incidents replay at 30, 60 and 144 FPS', () => {
  const traces = [];
  for (const fps of [30, 60, 144]) {
    const field = race();
    const target = field.state.opponents[1];
    for (let frame = 0; frame < fps; frame++) {
      field.state.stageTimeSec += 1 / fps;
      if (frame === 0 || frame === Math.floor(fps * .75)) {
        rearContact(field, field.state, target, {attackerMph: 80,
          victimMph: 20});
      } else if (frame === Math.floor(fps * .5)) {
        place(field.state, 100);
        place(target, 120);
        field.duel._vehicleContact(field.state, target, 'rival');
      } else if (frame < Math.floor(fps * .5) || frame > Math.floor(fps * .75)) {
        field.state.s = 102;
        field.state.prevS = 98;
        target.s = target.prevS = 104;
        field.duel._vehicleContact(field.state, target, 'rival');
      }
    }
    traces.push({fps, events: ramEvents(field).map(event =>
      [event.attackerIndex, event.victimIndex, round(event.armorRemoved),
        round(event.closingKph), event.spiked]),
    armor: [round(field.state.armor), round(target.armor)]});
  }
  assert.deepEqual(traces[1].events, traces[0].events,
    '60 FPS keeps the 30 FPS ownership and hit order');
  assert.deepEqual(traces[2].events, traces[0].events,
    '144 FPS keeps the 30 FPS ownership and hit order');
  assert.deepEqual(traces[1].armor, traces[0].armor,
    '60 FPS keeps the 30 FPS armor outcome');
  assert.deepEqual(traces[2].armor, traces[0].armor,
    '144 FPS keeps the 30 FPS armor outcome');
  assert.ok(traces[0].events.length > 0, 'the fixture actually contains ram hits');
});

function legacyDigest(mode, wasteland2, crashPhysics = true) {
  const field = race({mode, wasteland2, crashPhysics});
  const target = field.state.opponents[0];
  field.state.input.steer = .75;
  rearContact(field, field.state, target, {attackerMph: 130,
    victimMph: 25, lateral: .6});
  const actor = value => ({s: round(value.s), lateral: round(value.lateral),
    speedMph: round(value.speedMph), pushVelocity: round(value.pushVelocity),
    headingError: round(value.headingError), impactTimer: round(value.impactTimer)});
  const snapshot = {player: actor(field.state), opponent: actor(target),
    crashes: field.state.stageCrashes, penalty: round(field.state.racePenaltySec),
    events: field.events.filter(event => event.vehicleRam).map(event => ({
      vehicleRam: event.vehicleRam, victim: event.victim,
      impactMph: round(event.impactMph), lateralKick: round(event.lateralKick),
      launched: event.launched})),
    combatRamHits: ramEvents(field).length};
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

test('enabled crash physics has reviewed contact replays while switch-off stays pinned', () => {
  assert.equal(legacyDigest('duel', false),
    '90ae44392f1e118f66f38b57677448c16d9f5db7e444585277c66cafc9e38ff5',
    'ordinary race keeps its collision and vehicleRam result');
  assert.equal(legacyDigest('duel', true),
    '90ae44392f1e118f66f38b57677448c16d9f5db7e444585277c66cafc9e38ff5',
    'wasteland2 does not change ordinary races');
  assert.equal(legacyDigest('wasteland', false, false),
    'd414293c318c4ddb90b1aecd7a0ffd60ed59455434febc825518b23665066fdc',
    'switch-off Wasteland keeps its integration armored-contact fingerprint');
  assert.equal(legacyDigest('wasteland', false, true),
    '77e512edd147264c2da17858eca6ed4fb74f031500dba8ce95e891ea3676bb38',
    'enabled crash physics governs Wasteland contact when Wasteland 2 is off');
  assert.equal(legacyDigest('duel', false, false),
    '81b4193349b1b5aa06d0180d02ddf6879156b9bc23c762eac8a1ca6a3222caaa',
    'switch-off ordinary contact keeps the integration fingerprint');
});

test('enabled crash physics lets smashed traffic stay wrecked in every mode', () => {
  for (const mode of ['duel', 'wasteland']) {
    const field = race({mode, wasteland2: false, classicDestruction: true});
    const traffic = {s: 105, prevS: 115, lateral: .6, prevLateral: .6,
      speedMph: 20, dir: -1, alive: true};
    field.state.traffic.push(traffic);
    place(field.state, 102);
    field.state.prevS = 98;
    field.state.speedMph = 90;
    assert.equal(field.duel._vehicleContact(field.state, traffic, 'head_on'), true);
    assert.ok(traffic.wrecked, `${mode} can wreck smashed traffic under crash physics`);
    assert.equal(traffic.alive, false);
    if (mode === 'wasteland') {
      assert.equal(field.events.filter(event => event.trafficWrecked).length, 1);
    } else {
      assert.equal(field.events.filter(event => event.trafficWrecked).length, 0);
      assert.ok(field.state.stageCrashes > 0,
        'the ordinary head-on still crashes the player');
    }
    assert.equal(ramEvents(field).length, 0, 'legacy traffic has no new combat event');
  }
});

test('crash-physics off keeps ordinary solid traffic and the released Wasteland wreck path', () => {
  for (const mode of ['duel', 'wasteland']) {
    const field = race({mode, wasteland2: false, classicDestruction: true,
      crashPhysics: false});
    const traffic = {s: 105, prevS: 115, lateral: .6, prevLateral: .6,
      speedMph: 20, dir: -1, alive: true};
    field.state.traffic.push(traffic);
    place(field.state, 102);
    field.state.prevS = 98;
    field.state.speedMph = 90;
    assert.equal(field.duel._vehicleContact(field.state, traffic, 'head_on'), true);
    if (mode === 'wasteland') {
      assert.ok(traffic.wrecked, 'switch-off Wasteland keeps its released traffic wreck');
      assert.equal(traffic.alive, false);
      assert.equal(field.events.filter(event => event.trafficWrecked).length, 1);
      assert.ok(traffic.wrecked.lateralVelocity || traffic.wrecked.forwardVelocity,
        'switch-off Wasteland keeps the released wreck motion');
    } else {
      assert.equal(traffic.wrecked, undefined, 'switch-off ordinary traffic stays solid');
      assert.equal(traffic.alive, true);
      assert.equal(field.events.filter(event => event.trafficWrecked).length, 0);
      assert.ok(field.state.stageCrashes > 0, 'switch-off ordinary head-on keeps its crash cost');
    }
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {stepCombat} from '../src/combat.js';
import {createResultsScreen} from '../src/screen-results.js';

const FIELDS = ['hitsLanded', 'wrecksCaused', 'wrecksTaken', 'knockdowns',
  'damageDealt', 'bestCombo', 'combatStyleScore'];
const close = (actual, expected, message) => assert.ok(Number.isFinite(actual) &&
  Math.abs(actual - expected) < 1e-6,
  `${message}: expected ${expected}, got ${actual}`);

function place(actor, s, lateral = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral,
    speedMph: 0, pushVelocity: 0, headingError: 0, slipAngle: 0,
    impactTimer: 0, contactCooldown: 0, damageCooldown: 0,
    bombImpactCooldown: 0, airborne: false, airHeight: 0, prevAirHeight: 0});
}

function race({mode = 'wasteland', wasteland2 = true, difficulty = 'casual',
  opponentCount = 3} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
  duel.startCampaign({mode, difficulty, startStage: 0, opponentCount,
    cpuDifficulty: 'hard'});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  state.invulnerableSec = 0;
  state.traffic = [];
  place(state, 500);
  state.opponents.forEach((actor, index) => place(actor, 100 + index * 100));
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

function bolt(field, actor, {enemy = false, level = 0, step = false} = {}) {
  const at = field.duel.course.groundAt(actor.s, actor.lateral);
  field.state.combat.projectiles.push({kind: 'crossbow', enemy, level,
    x: at.x, y: at.y + (actor.airHeight || 0) + field.duel._vehicleSpec(actor).height / 2,
    z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
  if (step) field.duel.step(1 / 60);
  else stepCombat(field.duel, .01);
}

function bomb(field, atActor, {enemy = false, sourceIndex, level = 0} = {}) {
  const at = field.duel.course.groundAt(atActor.s, atActor.lateral);
  field.state.combat.projectiles.push({kind: 'bomb', enemy, level,
    ...(sourceIndex == null ? {} : {sourceIndex}),
    x: at.x, y: at.y + 1, z: at.z, vx: 0, vy: 0, vz: 0, age: 1.5});
  stepCombat(field.duel, .01);
}

function rearRam(field, attacker, victim) {
  place(attacker, 102);
  attacker.prevS = 98;
  attacker.speedMph = 80;
  place(victim, 104);
  victim.speedMph = 20;
  assert.equal(field.duel._vehicleContact(attacker, victim, 'rival'), true,
    'the scripted swept contact reaches the victim');
}

function finish(field) {
  const {duel, state} = field;
  state.s = duel.raceLength;
  state.completedLaps = state.lapsTotal;
  state.stageTimeSec = 80;
  assert.equal(duel._finishStage(), true, 'fixture completes a real race');
  return state.results;
}

function timeout(field) {
  field.state.timeLimitSec = 1;
  field.state.stageTimeSec = 1;
  assert.equal(field.duel._deadline(), true, 'fixture ends at a real deadline');
  return field.state.results;
}

function stats(result) {
  return Object.fromEntries(FIELDS.map(key => [key, result[key]]));
}

function resultMarkup(field) {
  const modal = createResultsScreen({
    app: {runId: 'combat-scoring-test', profileSaved: true},
    profile: () => ({credits: 0}),
    credits: value => Math.floor(Number(value) || 0).toLocaleString(),
    escapeHTML: value => String(value),
    time: value => Number(value || 0).toFixed(2),
    arrow: '',
  });
  return modal(field.state);
}

test('ordinary and flag-off results keep their score shape and no combat fields', () => {
  for (const options of [
    {mode: 'duel', wasteland2: false},
    {mode: 'duel', wasteland2: true},
    {mode: 'wasteland', wasteland2: false},
  ]) {
    const field = race(options);
    const result = finish(field);
    assert.equal(result.completed, true);
    assert.equal(result.styleScore, 0);
    assert.equal(result.score, 4454,
      'the pinned seed/time keeps the prior race score');
    assert.equal(result.won, true);
    assert.equal(result.position, 1);
    assert.equal(result.score, field.state.score);
    assert.equal(result.creditReward, undefined,
      'CMB-03 does not settle credits in a bare Duel');
    for (const key of FIELDS) assert.equal(result[key], undefined,
      `${options.mode}/${options.wasteland2} keeps the prior result shape`);
    assert.doesNotMatch(resultMarkup(field), /HITS LANDED|COMBAT STYLE|DAMAGE DEALT/,
      'ordinary and flag-off results keep their existing layout');
  }
});

test('positive player bolts on all three CPUs count real armor and one combo', () => {
  const field = race();
  for (const actor of field.state.opponents) bolt(field, actor);
  assert.equal(field.state.combat.hits, 3, 'all three real bolt paths land');
  const losses = field.state.opponents.map(actor => actor.maxArmor - actor.armor);
  losses.forEach((loss, index) => close(loss, 12, `CPU ${index + 1} armor loss`));
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 3, wrecksCaused: 0,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 36, bestCombo: 3,
    combatStyleScore: 600});
  close(result.styleScore, 600, 'combat points join existing style score once');
  close(field.state.score, result.score,
    'combat points are not added a second time at finish');
  const score = field.state.score;
  assert.equal(field.duel._finishStage(), false, 'a completed stage cannot finish twice');
  close(field.state.score, score, 'a second finish cannot bank combat style twice');
});

test('fatal overkill counts only armor actually removed and one caused wreck', () => {
  const field = race();
  const victim = field.state.opponents[1];
  victim.armor = 5;
  bolt(field, victim);
  assert.equal(victim.combatWrecking, true);
  assert.deepEqual(field.events.filter(event => event.combatWreck)
    .map(event => event.opponentIndex), [1]);
  assert.ok(field.events.findIndex(event => event.combatHit) <
    field.events.findIndex(event => event.combatWreck),
  'the projectile hit currently emits before its fatal wreck');
  bolt(field, victim);
  assert.equal(field.events.filter(event => event.combatWreck).length, 1,
    'shots during one recovery cannot make a second wreck');
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 1, wrecksCaused: 1,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 5, bestCombo: 1,
    combatStyleScore: 500});
});

test('one bomb hitting two low-armor CPUs credits two victims, not two explosions', () => {
  const field = race();
  const [first, second, third] = field.state.opponents;
  place(first, 100);
  place(second, 104);
  place(third, 300);
  first.armor = second.armor = 5;
  bomb(field, first);
  assert.equal(first.combatWrecking, true);
  assert.equal(second.combatWrecking, true);
  assert.equal(third.combatWrecking, false);
  assert.deepEqual(field.events.filter(event => event.combatWreck)
    .map(event => event.opponentIndex), [0, 1]);
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 2, wrecksCaused: 2,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 10, bestCombo: 2,
    combatStyleScore: 1100});
});

test('a caused wreck stays counted once through the actual recovery interval', () => {
  const field = race();
  const victim = field.state.opponents[1];
  victim.armor = 5;
  bolt(field, victim);
  for (let frame = 0; frame < 216; frame++) field.duel.step(1 / 60);
  assert.equal(victim.combatWrecking, false,
    'the same CPU returns after its local 3.5-second recovery');
  close(victim.armor, victim.maxArmor * .6,
    'recovery refills the expected armor without a second hit');
  assert.equal(field.events.filter(event => event.combatWreck &&
    event.opponentIndex === 1).length, 1,
  'the incident emitted only one wreck event');
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 1, wrecksCaused: 1,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 5, bestCombo: 1,
    combatStyleScore: 500});
});

test('CPU-owned projectile and player wreck count taken, never player-caused', () => {
  const field = race();
  field.state.armor = 5;
  bolt(field, field.state, {enemy: true});
  assert.equal(field.state.combatWrecking, true);
  assert.equal(field.events.filter(event => event.combatWreck).length, 1);
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 0, wrecksCaused: 0,
    wrecksTaken: 1, knockdowns: 0, damageDealt: 0, bestCombo: 0,
    combatStyleScore: 0});
});

test('self bombs, traffic hits and scenery wrecks cannot earn player attack points', () => {
  const field = race();
  const traffic = {...field.state.opponents[0], alive: true, dir: 1};
  place(traffic, 700);
  delete traffic.armor;
  delete traffic.maxArmor;
  field.state.traffic.push(traffic);
  bomb(field, traffic);
  bomb(field, field.state);
  assert.ok(field.events.some(event => event.combatHit && event.victim === 'traffic'),
    'the traffic hit path is actually exercised');
  assert.ok(field.state.armor < field.state.maxArmor,
    'the player bomb does self damage');
  field.state.armor = 5;
  field.duel._crash('rock', 1, 120);
  assert.equal(field.state.combatWrecking, true,
    'the scenery impact causes a real player wreck');
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 0, wrecksCaused: 0,
    wrecksTaken: 1, knockdowns: 0, damageDealt: 0, bestCombo: 0,
    combatStyleScore: 0});
});

test('shields and zero-delta contact events do not count as hits', () => {
  const field = race();
  const victim = field.state.opponents[1];
  victim.combatShield = 2;
  bolt(field, victim);
  rearRam(field, field.state, victim);
  assert.ok(field.events.some(event => event.combatRamHit &&
    event.victimIndex === 1 && event.armorRemoved === 0),
  'the shielded physical ram still reports its zero-damage contact');
  close(victim.armor, victim.maxArmor, 'shield blocks armor damage');
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 0, wrecksCaused: 0,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 0, bestCombo: 0,
    combatStyleScore: 0});
});

test('player ram gets actual victim damage despite wreck-before-hit event order', () => {
  const field = race();
  const victim = field.state.opponents[2];
  victim.armor = 5;
  rearRam(field, field.state, victim);
  assert.equal(victim.combatWrecking, true);
  assert.ok(field.events.findIndex(event => event.combatWreck &&
    event.opponentIndex === 2) < field.events.findIndex(event =>
    event.combatRamHit && event.attackerIndex === -1 && event.victimIndex === 2),
  'the real ram wreck event precedes its owned hit');
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 1, wrecksCaused: 1,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 5, bestCombo: 1,
    combatStyleScore: 500});
});

test('CPU-to-CPU rams never become player hits or caused wrecks', () => {
  const field = race();
  const [attacker, victim] = field.state.opponents;
  victim.armor = 5;
  rearRam(field, attacker, victim);
  assert.equal(victim.combatWrecking, true);
  assert.ok(field.events.some(event => event.combatRamHit &&
    event.attackerIndex === 0 && event.victimIndex === 1),
  'the CPU-owned ram path is exercised');
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 0, wrecksCaused: 0,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 0, bestCombo: 0,
    combatStyleScore: 0});
});

test('combat combo caps at five, expires after five seconds, and leaves near-miss combo alone', () => {
  const field = race();
  const victim = field.state.opponents[0];
  field.state.combo = 2;
  field.state.comboTimer = 4;
  for (let index = 0; index < 6; index++) bolt(field, victim);
  assert.equal(field.state.combat.hits, 6, 'six successive real bolts land');
  assert.equal(field.state.combo, 2, 'combat uses a separate chain');
  assert.equal(field.state.comboTimer, 4, 'combat does not restart the near-miss clock');
  // The regular fixed-step clock must expire the combat chain.
  place(victim, 100);
  for (let frame = 0; frame < 306; frame++) field.duel.step(1 / 60);
  place(victim, 100);
  bolt(field, victim);
  assert.equal(field.state.combat.hits, 7,
    'the post-expiry real bolt lands');
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 7, wrecksCaused: 0,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 84, bestCombo: 5,
    combatStyleScore: 2100});
});

test('Pro applies the existing double score multiplier to hit and wreck style', () => {
  const field = race({difficulty: 'pro'});
  assert.equal(field.duel.scoreMultiplier, 2);
  const victim = field.state.opponents[1];
  victim.armor = 5;
  bolt(field, victim);
  const result = finish(field);
  assert.deepEqual(stats(result), {hitsLanded: 1, wrecksCaused: 1,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 5, bestCombo: 1,
    combatStyleScore: 1000});
  close(result.styleScore, 1000, 'combat style uses the existing Pro multiplier');
});

test('the next stage starts fresh counters and timeout snapshots its own combat stats', () => {
  const field = race();
  bolt(field, field.state.opponents[0]);
  field.duel._loadStage(1);
  field.state.status = 'racing';
  field.state.countdown = 0;
  field.state.combat.aiTimer = Infinity;
  field.state.combat.pickupTimer = Infinity;
  const clean = timeout(field);
  assert.deepEqual(stats(clean), {hitsLanded: 0, wrecksCaused: 0,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 0, bestCombo: 0,
    combatStyleScore: 0});

  const timed = race();
  bolt(timed, timed.state.opponents[2]);
  const result = timeout(timed);
  assert.deepEqual(stats(result), {hitsLanded: 1, wrecksCaused: 0,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 12, bestCombo: 1,
    combatStyleScore: 100});
  assert.equal(timed.duel._deadline(), false, 'timeout cannot snapshot twice');
});

test('flagged results show each combat metric; ordinary results do not', () => {
  const field = race();
  bolt(field, field.state.opponents[0]);
  finish(field);
  const html = resultMarkup(field);
  for (const label of ['HITS LANDED', 'WRECKS CAUSED', 'WRECKS TAKEN',
    'KNOCKDOWNS', 'DAMAGE DEALT', 'BEST COMBO', 'COMBAT STYLE']) {
    assert.ok(html.includes(label), `results panel must show ${label}`);
  }
  assert.ok(html.includes('result-metric'), 'stats use existing result markup');
  const ordinary = race({mode: 'duel', wasteland2: true});
  finish(ordinary);
  assert.doesNotMatch(resultMarkup(ordinary), /HITS LANDED|COMBAT STYLE/);
});

test('scripted player hits have the same score at 30, 60 and 144 FPS', () => {
  const traces = [];
  for (const fps of [30, 60, 144]) {
    const field = race();
    const victim = field.state.opponents[0];
    for (let frame = 0; frame <= fps * 2; frame++) {
      if (frame % fps === 0) {
        place(victim, 100);
        const at = field.duel.course.groundAt(victim.s, victim.lateral);
        field.state.combat.projectiles.push({kind: 'crossbow', enemy: false,
          level: 0, x: at.x,
          y: at.y + (victim.airHeight || 0) + field.duel._vehicleSpec(victim).height / 2,
          z: at.z,
          vx: 0, vy: 0, vz: 0, age: 0});
      }
      field.duel.step(1 / fps);
    }
    assert.equal(field.state.combat.hits, 3,
      `${fps} FPS fixture lands three real player-owned bolts`);
    const result = finish(field);
    traces.push(stats(result));
  }
  assert.deepEqual(traces[1], traces[0], '60 FPS preserves score and ownership');
  assert.deepEqual(traces[2], traces[0], '144 FPS preserves score and ownership');
  assert.deepEqual(traces[0], {hitsLanded: 3, wrecksCaused: 0,
    wrecksTaken: 0, knockdowns: 0, damageDealt: 36, bestCombo: 3,
    combatStyleScore: 600}, 'fixture lands three positive bolts');
});

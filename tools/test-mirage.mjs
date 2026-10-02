import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {stepArenaEvent, arenaRanking} from '../src/arena/arena-event.js';
import {MIRAGE_RULES} from '../src/warlords/mirage.js';
import {warlordDefenseMultiplier} from '../src/vehicle-contact-modifiers.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {noteArenaDamage} from '../src/combat-teams.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {arenaHud} from '../src/screen-arena.js';

// Mother Mirage (docs/SCRAPDOME.md section 5): the split into three cars, the
// copies that burst on a hit, the stun window and phase two's ramming copies.
// The real dome course and arena step; null flag storage; no browser or saves.
const DT = 1 / 120;
const FLAGS = {wasteland2: true, scrapdome: true, warlords: true};
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
test.after(() => console.log('Mother Mirage: ' + checks + ' checks.'));

function fight({phase = 1, gap = 30, difficulty = 'medium'} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: FLAGS});
  assert.equal(startWarlordEvent(duel, {warlordId: 'mirage', car: 'falcone_f42', cpuDifficulty: difficulty}), true);
  assert.equal(beginWarlordEvent(duel), true);
  duel.state.countdown = 0;
  duel.state.status = 'racing';
  stepArenaEvent(duel, DT);
  const boss = duel.state.opponents[0];
  duel.state.arena.warlordPhase = phase;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0;
  Object.assign(boss, {s: 100, prevS: 100, lateral: 0, prevLateral: 0, headingError: 0, speedMph: 0});
  Object.assign(duel.state, {s: 100 + gap, prevS: 100 + gap, lateral: 0, prevLateral: 0,
    headingError: 0, speedMph: 0});
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  return {duel, boss};
}
function run(f, seconds, each = () => {}) {
  for (let t = 0; t < seconds - 1e-9; t += DT) { stepArenaEvent(f.duel, DT); each(); }
}
const copiesOf = f => f.duel.state.opponents.filter(car => car.decoy);
// Make the split ready now instead of waiting out the opening cooldown.
const ready = f => { f.boss.mirage.nextSplitSec = 0; };
function split(f) {
  ready(f);
  run(f, .1);
  equal(f.boss.mirage.stage, 'tell', 'the tell comes first');
  // The tell lasts .5, .8 or 1.2 s by difficulty.
  for (let t = 0; t < 1.5 && f.boss.mirage.stage === 'tell'; t += DT) stepArenaEvent(f.duel, DT);
  equal(f.boss.mirage.stage, 'split', 'then the split');
}

test('no split at the start of the fight: her cooldown runs from the opening bell', () => {
  const f = fight();
  run(f, 3);
  equal(f.boss.mirage.stage, 'idle', 'still idle');
  equal(copiesOf(f).length, 0, 'no copies');
});

test('ready and the player within 40 m: a heat shimmer, then two copies 8 m either side', () => {
  const f = fight();
  ready(f);
  run(f, .1);
  equal(f.boss.mirage.stage, 'tell', 'tell');
  ok(f.boss.arenaShimmerSec > 0, 'a heat shimmer around her car');
  equal(copiesOf(f).length, 0, 'no copies during the tell');
  run(f, .9);
  const copies = copiesOf(f);
  equal(copies.length, 2, 'two copies, so three matching cars');
  equal(f.duel.state.arena.participants.filter(p => p.decoy).length, 2, 'copies are arena participants');
  ok(copies.every(copy => copy.car === f.boss.car), 'they match her car');
  ok(Math.abs(Math.abs(copies[0].lateral - f.boss.lateral) - MIRAGE_RULES.spreadMetres) < 1.5,
    'spread about 8 m');
});

test('no split when the player is farther than 40 m', () => {
  const f = fight({gap: 60});
  ready(f);
  run(f, 1);
  equal(f.boss.mirage.stage, 'idle', 'too far');
});

test('only the real car fires; a copy never takes the real car\'s shots', () => {
  const f = fight();
  split(f);
  const shooters = new Set();
  run(f, 4, () => {
    for (const bolt of f.duel.state.combat.projectiles) if (bolt.ownerId) shooters.add(bolt.ownerId);
  });
  ok([...shooters].every(id => id === 'cpu-1'), 'every shot has the real owner id: ' + [...shooters]);
});

test('a copy bursts into scrap on its first hit, and the real car is not stunned', () => {
  const f = fight();
  split(f);
  const [copy] = copiesOf(f);
  copy.armor -= 1;
  run(f, .05);
  ok(!f.duel.state.opponents.includes(copy), 'the hit copy is gone');
  equal(copiesOf(f).length, 1, 'the other copy stays');
  equal(f.boss.mirage.stage, 'split', 'she is not stunned');
});

test('hitting the real car during the split ends it and stuns her for 2 s; hits then deal 1.5 times', () => {
  const f = fight();
  split(f);
  f.boss.armor -= 5;
  run(f, .05);
  equal(f.boss.mirage.stage, 'stunned', 'stunned');
  equal(copiesOf(f).length, 0, 'the copies burst');
  equal(warlordDefenseMultiplier(f.duel, f.boss, 'front'), MIRAGE_RULES.windowMultiplier, '1.5 times damage');
  run(f, MIRAGE_RULES.stunSec + .1);
  equal(f.boss.mirage.stage, 'idle', 'the stun ends');
  equal(warlordDefenseMultiplier(f.duel, f.boss, 'front'), 1, 'normal damage again');
});

test('an untouched split ends after 6 s and the copies leave', () => {
  const f = fight();
  split(f);
  run(f, MIRAGE_RULES.splitSec);
  equal(f.boss.mirage.stage, 'idle', 'split over');
  equal(copiesOf(f).length, 0, 'copies gone');
});

test('cooldown is 12, 10 and 8 s by difficulty, and 20 percent shorter in phase two', () => {
  for (const [difficulty, base] of [['easy', 12], ['medium', 10], ['hard', 8]]) {
    for (const phase of [1, 2]) {
      const f = fight({difficulty, phase});
      split(f);
      const wait = f.boss.mirage.nextSplitSec - f.duel.state.stageTimeSec;
      const want = phase === 2 ? base / MIRAGE_RULES.phaseTwoRate : base;
      ok(Math.abs(wait - want) < .2, `${difficulty} phase ${phase}: ${wait.toFixed(2)} s`);
    }
  }
});

test('phase two: copies are rammers and ram for half damage', () => {
  const f = fight({phase: 2});
  split(f);
  const copies = copiesOf(f);
  ok(copies.every(copy => copy.ramDamageScale === MIRAGE_RULES.phaseTwoRamScale), 'half ram damage');
  const twins = f.duel.state.arena.participants.filter(p => p.decoy);
  ok(twins.every(p => p.brain === 'rammer'), 'rammer brain');
  const phaseOne = fight();
  split(phaseOne);
  ok(copiesOf(phaseOne).every(copy => copy.ramDamageScale === 1), 'phase one copies ram normally');
});

test('decoys never score: damage and wrecks credit the real car, and ranking ignores them', () => {
  const f = fight();
  split(f);
  const copy = copiesOf(f)[0], player = f.duel.state.arena.participants.find(p => p.id === 'player');
  noteArenaDamage(f.duel, f.duel.state, 10, copy.arenaId);
  equal(player.lastHitBy, 'cpu-1', 'the last hit is credited to the real car');
  const boss = f.duel.state.arena.participants.find(p => p.id === 'cpu-1');
  ok(boss.damageDealt >= 10, 'the real car holds the damage');
  equal(f.duel.state.arena.participants.find(p => p.id === copy.arenaId).damageDealt, 0, 'the copy holds none');
  ok(arenaRanking(f.duel.state.arena).every(p => !p.decoy), 'ranking lists only real cars');
  equal(arenaHud(f.duel.state).field, 2, 'the placing shows two cars, not four');
});

test('the fight settles with copies still on the floor', () => {
  const f = fight();
  split(f);
  const arena = f.duel.state.arena;
  arena.phase = 'over';
  arena.result = {reason: 'three-wrecks', winnerId: 'player', placings: ['player', 'cpu-1']};
  arena.participants.find(p => p.id === 'player').wrecks = 3;
  arena.participants.find(p => p.id === 'cpu-1').wrecked = 3;
  const profile = {version: 2, unlockedCars: ['falcone_f42'], wasteland: {version: 1,
    discoveredGate: true, scrap: 0, xp: 0, settledResults: [], territories: {mirage: {hold: 100}},
    warlords: {}, crew: {unlocked: ['rook'], selected: 'rook'}}};
  const won = settleWarlordResult(profile, {runId: 'm', ownerPlayerId: 'p', activePlayerId: 'p',
    arena: JSON.parse(JSON.stringify(arena)), car: 'falcone_f42', cpuDifficulty: 'easy'});
  ok(won.awarded && won.firstWin, 'first win pays');
  equal(won.scrapEarned, 600 + 100 * 2, 'third rung pays 800 on Easy');
});

test('only the real car leaves tyre marks, during the split, and they go after 8 s', () => {
  const f = fight();
  const marks = () => (f.duel.state.arena.markers || []).filter(marker => marker.kind === 'tyre');
  equal(marks().length, 0, 'none before the split');
  split(f);
  // She circles at speed while split; give her room to travel.
  run(f, 3, () => {});
  ok(marks().length > 0, 'the real car marks the floor');
  ok(marks().every(m => m.owner === 'mirage' && Number.isFinite(m.x) && Number.isFinite(m.heading)), 'marks are well formed');
  const oldest = Math.min(...marks().map(m => m.until));
  // Another split may begin meanwhile; the marks of the first must be gone.
  run(f, MIRAGE_RULES.splitSec + MIRAGE_RULES.markLifeSec + .5);
  ok(marks().every(m => m.until > f.duel.state.stageTimeSec && m.until > oldest), 'expired marks are gone');
});

test('her car is the Aurora GTR gunner', () => {
  const f = fight();
  equal(f.boss.car, 'aurora_gt', 'car');
  equal(f.duel.state.arena.participants.find(p => p.id === 'cpu-1').brain, 'gunner', 'brain');
  ok(worldPose(f.duel, f.boss), 'on the floor');
});

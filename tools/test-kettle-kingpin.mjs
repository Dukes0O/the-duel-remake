import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {stepArenaEvent} from '../src/arena/arena-event.js';
import {KETTLE_RULES} from '../src/warlords/kettle.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {worldPose} from '../src/arena/arena-floor.js';

// The Kettle Kingpin (docs/SCRAPDOME.md section 5): the Kettle Drop's ring,
// leap and landing, the stuck window, phase two's double drop and his reward.
// The real dome course and arena step; null flag storage; no browser or saves.
const DT = 1 / 120;
const FLAGS = {wasteland2: true, scrapdome: true, warlords: true};
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
test.after(() => console.log('Kettle Kingpin: ' + checks + ' checks.'));

function fight({phase = 1, gap = 25} = {}) {
  const duel = new Duel({seed: 1989, featureFlags: FLAGS});
  assert.equal(startWarlordEvent(duel, {warlordId: 'kettle', car: 'falcone_f42', cpuDifficulty: 'medium'}), true);
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

test('a player 12 to 40 m away triggers the tell and a red ring on the floor', () => {
  const f = fight();
  run(f, .1);
  equal(f.boss.kettleDrop.stage, 'tell', 'tell starts');
  const ring = f.duel.state.arena.markers?.find(marker => marker.kind === 'ring');
  ok(ring && ring.radius === KETTLE_RULES.ringRadius, 'a 4 m ring marks the landing');
  const player = worldPose(f.duel, f.duel.state);
  ok(Math.hypot(ring.x - player.x, ring.z - player.z) < 3, 'aimed at a parked player');
});

test('no drop when the player is too close or too far', () => {
  for (const gap of [6, 60]) {
    const f = fight({gap});
    run(f, .5);
    ok(f.boss.kettleDrop.stage !== 'tell' && f.boss.kettleDrop.stage !== 'leap', `${gap} m: no drop`);
  }
});

test('he leaps over 1.2 s, lands, hurts and shoves a car in the ring, then is stuck', () => {
  const f = fight();
  const armor = f.duel.state.armor;
  let peak = 0;
  run(f, 1.3 + KETTLE_RULES.arcSec, () => { peak = Math.max(peak, f.boss.airHeight || 0); });
  ok(peak > 3, 'he leaves the ground');
  ok(f.duel.state.armor <= armor - KETTLE_RULES.ringArmor + 1e-6, 'the player in the ring loses armor');
  ok(f.duel.state.knock, 'the player is shoved');
  equal(f.boss.kettleDrop.stage, 'window', 'he is stuck after landing');
  ok(!f.duel.state.arena.markers?.length, 'the ring is gone');
  run(f, KETTLE_RULES.windowSec + .1);
  equal(f.boss.kettleDrop.stage, 'idle', 'the window ends');
});

test('a player who leaves the ring takes nothing', () => {
  const f = fight();
  run(f, .2);
  Object.assign(f.duel.state, {lateral: 12, prevLateral: 12});
  const armor = f.duel.state.armor;
  run(f, 1.2 + KETTLE_RULES.arcSec);
  equal(f.duel.state.armor, armor, 'escaped the ring');
});

test('phase two drops twice; the window follows only the second landing', () => {
  const f = fight({phase: 2});
  // Enough armor to survive both landings, so the second drop has a target.
  f.duel.state.maxArmor = f.duel.state.armor = 500;
  let landings = 0, windowBeforeSecond = false;
  f.duel.onChange((_s, event) => { if (event.kettleLanding) landings++; });
  run(f, 1.3 + KETTLE_RULES.arcSec * 2 + .1, () => {
    if (landings === 1 && f.boss.kettleDrop.stage === 'window') windowBeforeSecond = true;
  });
  equal(landings, 2, 'two landings');
  ok(!windowBeforeSecond, 'no window between the drops');
  equal(f.boss.kettleDrop.stage, 'window', 'window after the second');
});

test('first win fits the Warlord kit to the Titan and saves Tusk', () => {
  const profile = {version: 2, unlockedCars: ['falcone_f42', 'titan_monster'], wasteland: {version: 1,
    discoveredGate: true, scrap: 0, xp: 0, settledResults: [], territories: {kettle: {hold: 100}},
    warlords: {}, crew: {unlocked: ['rook'], selected: 'rook'}}};
  const arena = {version: 1, venueId: 'scrapdome', mode: 'warlord', warlordId: 'kettle',
    warlordBossId: 'cpu-1', phase: 'over', result: {reason: 'three-wrecks', winnerId: 'player', placings: ['player', 'cpu-1']},
    participants: [{id: 'player', kind: 'player', team: 'player', wrecks: 3, wrecked: 0},
      {id: 'cpu-1', kind: 'cpu', team: 'warlord:kettle', wrecks: 0, wrecked: 3}]};
  const won = settleWarlordResult(profile, {runId: 'k', ownerPlayerId: 'p', activePlayerId: 'p',
    arena, car: 'falcone_f42', cpuDifficulty: 'easy'});
  ok(won.awarded && won.firstWin, 'first win');
  ok(won.profile.wasteland.kits.titan_monster.owned.includes('warlord'), 'kit on the Titan');
  equal(won.profile.wasteland.kits.titan_monster.equipped, 'warlord', 'fitted, since the Titan had none');
  ok(won.profile.wasteland.crew.unlocked.includes('tusk'), 'Tusk saved');
  equal(won.crewEarned, 'tusk', 'reported');
  equal(won.scrapEarned, 600 + 100 * 4, 'fifth rung pays 1000 on Easy');
});

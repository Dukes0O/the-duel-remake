import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {WARLORDS, BUILT_WARLORD_IDS} from '../src/warlords.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {getProfileWeapons} from '../src/weapon-upgrades.js';

// WAR-03a: settled admission and reward. Move timing and aiming tests wait
// for Claude to settle the open trigger and aim-lock rules before source work.
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Gearhead Gunn: ${checks} acceptance checks executed.`));

function admitted({enabled = true, discovered = true} = {}) {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {warlords: enabled, scrapdome: true}});
  const duel = new Duel({seed: 304, featureFlags: flags});
  duel.state.wastelandGateDiscovered = discovered;
  return {duel, started: startWarlordEvent(duel, {warlordId: 'gunn',
    car: 'falcone_f42', cpuDifficulty: 'medium', playerId: 'gunn-driver'})};
}
function fight() {
  const {duel, started} = admitted();
  equal(started, true, 'native warlord entry must admit the built Gunn fight');
  equal(beginWarlordEvent(duel), true, 'Gunn intro must start the native countdown');
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  return duel;
}
function completed() {
  const duel = fight(), boss = duel.state.opponents[0];
  for (let n = 0; n < 3; n++) {
    for (let tick = 0; boss.combatWrecking && tick < 600; tick++) duel.step(DT);
    ok(!boss.combatWrecking, 'the previous native wreck must respawn before the next hit');
    for (const p of duel.state.arena.participants) p.protectedSec = 0;
    duel.state.invulnerableSec = 0;
    duel.state.combat.shield = duel.state.combat.rivalShield = 0;
    boss.combatShield = 0; boss.armor = 1;
    applyArmorDamage(duel, boss, 'crossbow', {owner: 'player'}); duel.step(DT);
    if (n === 0) equal(duel.state.arena.warlordPhase, 2, 'the first native Gunn wreck starts phase two');
  }
  equal(duel.state.status, 'arena_result', 'three credited native Gunn wrecks complete the fight');
  equal(duel.state.arena.result.winnerId, 'player', 'three Gunn wrecks produce a player win');
  return duel.state.arena;
}

test('Gunn is built with the settled car, kiter brain and Pit venue', () => {
  ok(BUILT_WARLORD_IDS.includes('gunn'), 'Gunn must be available as a built fight');
  equal(WARLORDS.gunn.car, 'stuttgart_959s', 'Gunn drives the Stuttgart 959-S');
  equal(WARLORDS.gunn.brain, 'kiter', 'Gunn uses the settled kiter brain');
  equal(WARLORDS.gunn.venue, 'pit', 'Gunn fights in the Pit');
});

test('native Gunn admission starts the actual Pit and intro before countdown', () => {
  const {duel, started} = admitted();
  equal(started, true, 'native warlord entry must admit Gunn');
  equal(duel.state.arena.venueId, 'pit', 'Gunn selects the Pit event');
  equal(duel.course.def.id, 'pit', 'the actual course is the Pit');
  equal(duel.state.status, 'warlord_intro', 'Gunn shows his intro before the countdown');
  equal(duel.state.arena.participants.length, 2, 'Gunn fights alone against the player');
  equal(duel.state.arena.timeLimitSec, 240, 'Gunn retains the four-minute shared warlord format');
});

test('Gunn admission respects the warlords switch and gate discovery', () => {
  equal(admitted({enabled: false}).started, false, 'Gunn cannot launch with warlords disabled');
  equal(admitted({discovered: false}).started, false, 'Gunn cannot launch before discovery');
});

test('native Gunn win earns Rocket Pods and territory exactly once for its named owner', () => {
  const arena = completed();
  const profile = {version: 2, credits: 123, unlockedCars: ['falcone_f42'],
    wasteland: {version: 1, discoveredGate: true, scrap: 17, xp: 0,
      settledResults: [], territories: {gunn: {hold: 100}}, warlords: {}}};
  const before = structuredClone(profile);
  const payload = {runId: 'gunn-native', ownerPlayerId: 'gunn-driver',
    activePlayerId: 'gunn-driver', arena, car: 'falcone_f42', cpuDifficulty: 'medium'};
  const won = settleWarlordResult(profile, payload);
  equal(won.awarded, true, 'a genuine Gunn win settles');
  equal(won.scrapEarned, 1080, 'fourth-rung first win pays 900 times Medium factor 1.2');
  equal(won.weaponEarned, 'rockets', 'the win earns Rocket Pods early');
  ok(getProfileWeapons(won.profile).unlocked.includes('rockets'), 'Rocket Pods are owned after settlement');
  equal(won.profile.wasteland.territories.gunn.claimed, true, 'Gunn territory is claimed');
  equal(won.profile.credits, 123, 'Gunn pay leaves racing credits unchanged');
  equal(profile, before, 'settlement preserves its input profile');
  equal(settleWarlordResult(won.profile, payload).awarded, false, 'repeated settlement cannot pay again');
  equal(settleWarlordResult(profile, {...payload, activePlayerId: 'other-driver'}).awarded,
    false, 'another named player cannot collect the Gunn result');
});

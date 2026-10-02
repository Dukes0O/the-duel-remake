import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {thinkBrain} from '../src/arena/arena-brains.js';
import {hazardsFor, stepHazards} from '../src/arsenal/hazards.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {DUST_RULES} from '../src/warlords/dustmonger.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {getProfileWeapons} from '../src/weapon-upgrades.js';
import {hazardsActive} from '../src/combat-weapons.js';

// The Dustmonger (docs/SCRAPDOME.md section 5): Dust Veil, oil on a straight
// line, the coughing-engine window, phase two and the Smoke Screen reward.
// Synthetic straight course, null flag storage, no browser or real saves.
const DT = .01;
const FLAGS = {wasteland2: true, scrapdome: true, warlords: true};
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
test.after(() => console.log('Dustmonger: ' + checks + ' checks.'));

function fight(difficulty = 'medium') {
  const duel = new Duel({seed: 1989, featureFlags: FLAGS});
  assert.equal(startWarlordEvent(duel, {warlordId: 'dustmonger', car: 'falcone_f42', cpuDifficulty: difficulty}), true);
  assert.equal(beginWarlordEvent(duel), true);
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  const actor = duel.state.opponents[0], participant = duel.state.arena.participants[1];
  const layout = duel.course.def.scrapdome;
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  duel.course = {def: {theme: 'desert', scrapdome: {...layout, floorHalfWidth: 1000}}, length: 10000,
    at: point, worldAt: point, groundAt: point, nearest: (x, z) => ({s: z, lateral: x, distance: Math.abs(x)}),
    roadHalfWidthAt: () => 1000, features: {obstacles: []}};
  Object.assign(actor, {s: 200, prevS: 200, lateral: 0, prevLateral: 0, headingError: 0, speedMph: 35});
  Object.assign(duel.state, {s: 180, prevS: 180, lateral: 0, prevLateral: 0, headingError: 0, speedMph: 35});
  participant.targetId = 'player'; participant.goal = null; participant.reactionSec = 0;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0;
  return {duel, actor, participant};
}
function advance(f, seconds) {
  let left = seconds;
  while (left > 1e-9) {
    const dt = Math.min(DT, left);
    f.duel.state.stageTimeSec += dt;
    thinkBrain(f.duel, f.participant, f.actor, dt);
    left -= dt;
  }
}
const kinds = duel => hazardsFor(duel).map(hazard => hazard.kind).sort();

test('hazards run in warlord fights with the arsenal switch off', () => {
  const f = fight();
  ok(f.duel.featureFlags.enabled('arsenal') === false, 'arsenal is off in this fixture');
  ok(hazardsActive(f.duel), 'his smoke and oil still work');
});

test('a player close behind him triggers a tell, then a smoke cloud and oil on a straight line', () => {
  const f = fight();
  advance(f, .6);
  equal(f.actor.dustVeil.stage, 'tell', 'player 20 m behind: the tell starts');
  ok(f.actor.arenaTellSec > 0, 'the shared tell shows');
  advance(f, 1);
  equal(kinds(f.duel), ['oil', 'smoke'], 'straight line: cloud and oil strip');
  const oil = hazardsFor(f.duel).find(hazard => hazard.kind === 'oil');
  const smoke = hazardsFor(f.duel).find(hazard => hazard.kind === 'smoke');
  equal([oil.shape, oil.width, oil.length], ['strip', DUST_RULES.oilWidth, DUST_RULES.oilLength], 'strip is 4 by 8 m');
  ok(oil.z < smoke.z - smoke.radius + 1e-6, 'the oil starts beyond the cloud');
  equal(smoke.radius, DUST_RULES.cloudRadius, 'phase one cloud is 7 m');
  equal(f.actor.dustVeil.stage, 'window', 'his engine coughs after the veil');
});

test('no veil when the player is ahead, and no oil when he was turning', () => {
  const ahead = fight();
  Object.assign(ahead.duel.state, {s: 230, prevS: 230});
  advance(ahead, 2);
  equal(ahead.actor.dustVeil.stage, 'idle', 'player ahead: no veil');
  const turning = fight();
  // He keeps turning at about 57 degrees a second through the tell and release.
  for (let i = 0; i < 120; i++) { turning.actor.headingError += .01; advance(turning, DT); }
  equal(kinds(turning.duel), ['smoke'], 'turning: cloud only, no oil');
});

test('the window: rear hits 1.5 times, other faces unchanged; it ends after 2 s', () => {
  const f = fight();
  advance(f, 1.6);
  equal(f.actor.dustVeil.stage, 'window', 'window open');
  const before = f.actor.armor;
  applyArmorDamage(f.duel, f.actor, 'crossbow', {owner: 'player', contactFace: 'rear'});
  const rear = before - f.actor.armor;
  f.actor.armor = before;
  applyArmorDamage(f.duel, f.actor, 'crossbow', {owner: 'player', contactFace: 'front'});
  const front = before - f.actor.armor;
  ok(front > 0, 'a front hit does damage');
  ok(Math.abs(rear - front * DUST_RULES.windowRearMultiplier) < 1e-6, 'rear hit is 1.5 times a front hit');
  advance(f, DUST_RULES.windowSec + .05);
  equal(f.actor.dustVeil.stage, 'idle', 'window over');
});

test('cooldown, then phase two veils more often with wider clouds and a dust storm', () => {
  const f = fight();
  advance(f, 1.6);
  const first = f.actor.dustVeil.nextVeilSec - f.duel.state.stageTimeSec;
  ok(first > 0 && first <= DUST_RULES.cooldownSec.medium, 'medium cooldown is at most 8 s');
  const g = fight();
  g.duel.state.arena.warlordPhase = 2;
  advance(g, 1.6);
  const smoke = hazardsFor(g.duel).find(hazard => hazard.kind === 'smoke');
  ok(Math.abs(smoke.radius - DUST_RULES.cloudRadius * DUST_RULES.phaseTwoCloudScale) < 1e-9, 'cloud 1.3 times wider');
  equal(g.duel.state.arena.weather, 'dust-storm', 'the dust storm rises');
  const left = g.actor.dustVeil.nextVeilSec - g.duel.state.stageTimeSec;
  ok(left <= DUST_RULES.cooldownSec.medium / DUST_RULES.phaseTwoRate + 1e-9, 'veils 20% more often');
});

test('the oil strip slips a car that drives into it', () => {
  const f = fight();
  advance(f, 1.6);
  const oil = hazardsFor(f.duel).find(hazard => hazard.kind === 'oil');
  Object.assign(f.duel.state, {s: oil.z, prevS: oil.z, lateral: oil.x, prevLateral: oil.x, speedMph: 40});
  stepHazards(f.duel, DT);
  ok(f.duel.state.speedMph < 40, 'the player slips and slows');
});

test('first win pays and unlocks Smoke Screen; a rematch does not unlock again', () => {
  const profile = {version: 2, unlockedCars: ['falcone_f42'], wasteland: {version: 1, discoveredGate: true,
    scrap: 0, xp: 0, settledResults: [], territories: {dustmonger: {hold: 100}}, warlords: {}}};
  const arena = {version: 1, venueId: 'scrapdome', mode: 'warlord', warlordId: 'dustmonger',
    warlordBossId: 'cpu-1', phase: 'over', result: {reason: 'three-wrecks', winnerId: 'player', placings: ['player', 'cpu-1']},
    participants: [{id: 'player', kind: 'player', team: 'player', wrecks: 3, wrecked: 1},
      {id: 'cpu-1', kind: 'cpu', team: 'warlord:dustmonger', wrecks: 1, wrecked: 3}]};
  const won = settleWarlordResult(profile, {runId: 'a', ownerPlayerId: 'p', activePlayerId: 'p',
    arena, car: 'falcone_f42', cpuDifficulty: 'medium'});
  ok(won.awarded && won.firstWin, 'first win settles');
  equal(won.weaponEarned, 'smoke', 'Smoke Screen earned');
  equal(won.kitEarned, null, 'no kit');
  equal(won.scrapEarned, Math.round(700 * 1.2), 'second rung pays 700 times the Medium factor');
  ok(getProfileWeapons(won.profile).unlocked.includes('smoke'), 'Smoke Screen is unlocked');
  ok(won.profile.wasteland.territories.dustmonger.claimed, 'territory claimed');
  const again = settleWarlordResult(won.profile, {runId: 'b', ownerPlayerId: 'p', activePlayerId: 'p',
    arena, car: 'falcone_f42', cpuDifficulty: 'medium'});
  ok(again.awarded && !again.firstWin && again.weaponEarned === null, 'rematch pays without a second unlock');
});

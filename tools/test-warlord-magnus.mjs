import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {WARLORDS, WARLORD_LADDER, warlordUnlockSatisfied} from '../src/warlords.js';
import {warlordEnabled} from '../src/warlords/index.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {getProfileWeapons} from '../src/weapon-upgrades.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {MAGNUS_RULES, MAGNUS_FIGHT} from '../src/warlords/magnus.js';
import {territoryPanel} from '../src/screen-territory.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {storyCardFor} from '../src/warlord-cards.js';

// WARLORD-NINE: Magnus the Magnet (docs/SCRAPDOME.md, "Settled for build: Magnus the Magnet").
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Magnus the Magnet: ${checks} checks.`));

const ON = {'hidden-road': true, 'warlord-nine': true};
const beaten = ids => Object.fromEntries(ids.map(id => [id, {defeated: true, wins: 1, losses: 0}]));

function fight({difficulty = 'medium', flags = ON} = {}) {
  const duel = new Duel({seed: 909, featureFlags: flags});
  duel.state.wastelandGateDiscovered = true;
  const started = startWarlordEvent(duel, {warlordId: 'magnus', car: 'falcone_f42', cpuDifficulty: difficulty, playerId: 'magnus-driver'});
  if (!started) return {duel, started};
  beginWarlordEvent(duel);
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  return {duel, started, boss: duel.state.opponents[0]};
}
// The player parked `metres` ahead of Magnus on his line, facing away, nobody protected.
function place(duel, boss, metres, speedMph = 0) {
  const state = duel.state;
  for (const p of state.arena.participants) p.protectedSec = 0;
  state.invulnerableSec = 0;
  state.s = boss.s + metres; state.lateral = boss.lateral; state.headingError = 0; boss.headingError = 0;
  state.speedMph = speedMph; state.pushVelocity = 0;
}
const gap = (duel, boss) => { const a = worldPose(duel, duel.state), b = worldPose(duel, boss); return Math.hypot(a.x - b.x, a.z - b.z); };
const runUntil = (duel, done, seconds = 10) => { for (let t = 0; t < seconds / DT && !done(); t++) duel.step(DT); };

test('Magnus opens after the Baron, on the ladder after him, behind his own switch', () => {
  equal(WARLORD_LADDER.at(-1), 'magnus', 'Magnus is the ninth place on the ladder');
  const seven = WARLORD_LADDER.slice(0, WARLORD_LADDER.indexOf('blackiron'));
  equal(seven.length, 7, 'the Baron still needs the seven before him');
  const career = warlords => ({wasteland: {version: 1, discoveredGate: true, territories: {}, warlords}});
  ok(!warlordUnlockSatisfied(career(beaten(seven)), 'magnus'), 'Magnus waits while the Baron stands');
  ok(warlordUnlockSatisfied(career(beaten([...seven, 'blackiron'])), 'magnus'), 'beating the Baron opens Magnus, with no hold');
  const baron = warlords => ({wasteland: {version: 1, territories: {blackiron: {hold: 100}}, warlords}});
  ok(warlordUnlockSatisfied(baron(beaten(seven)), 'blackiron') && !warlordUnlockSatisfied(baron(beaten(seven.slice(1))), 'blackiron'),
    'the Baron\'s own gate is unchanged: a full hold and the seven before him');
  ok(!warlordEnabled({featureFlags: createFeatureFlags({storage: null, qa: false, overrides: {'warlord-nine': false}})}, 'magnus'),
    'with the switch off there is no Magnus fight');
  equal(fight({flags: {'hidden-road': true, 'warlord-nine': false}}).started, false, 'the switch off refuses the fight');
});

test('his fight is on the Salt Flats with his own armor by level', () => {
  const easy = fight({difficulty: 'easy'}), medium = fight();
  ok(easy.started && medium.started, 'the fight starts');
  equal(easy.duel.state.arena.venueId ?? easy.duel.course.def.id, 'salt-flats', 'his hideout is the Salt Flats');
  equal([easy.boss.maxArmor, medium.boss.maxArmor], [MAGNUS_RULES.armor.easy, MAGNUS_RULES.armor.medium], 'Easy has his own lower armor');
  equal(easy.boss.car ?? WARLORDS.magnus.car, 'falcone_heritage', 'he drives the Falcone Heritage');
});

test('the Big Pull: a blue ring, then a parked car is dragged in and a car driving away gets free', () => {
  const parked = fight(), {duel, boss} = parked;
  place(duel, boss, 20);
  boss.magnusPull.nextPullSec = duel.state.stageTimeSec;
  runUntil(duel, () => boss.magnusPull.stage === 'tell', 1);
  equal(boss.magnusPull.stage, 'tell', 'he starts the tell with the player 20 m away');
  const ring = duel.state.arena.markers.find(marker => marker.owner === 'magnus');
  equal([ring?.kind, ring?.color, ring?.radius], ['ring', 'magnet', MAGNUS_RULES.reachMetres], 'the ring shows his reach in blue');
  runUntil(duel, () => boss.magnusPull.stage === 'pull', 3);
  equal(boss.magnusPull.stage, 'pull', 'the pull follows the tell');
  duel.state.speedMph = 0;
  const before = gap(duel, boss);
  runUntil(duel, () => boss.magnusPull.stage !== 'pull', 3);
  ok(gap(duel, boss) < before - 4, `a parked car is dragged in (${before.toFixed(1)} m to ${gap(duel, boss).toFixed(1)} m)`);

  const escape = fight(), d2 = escape.duel, b2 = escape.boss;
  place(d2, b2, 20, 60);
  b2.magnusPull.nextPullSec = d2.state.stageTimeSec;
  runUntil(d2, () => b2.magnusPull.stage === 'pull', 3);
  place(d2, b2, 20, 60);
  d2.setInput({throttle: 1, brake: 0, steer: 0});
  const start = gap(d2, b2);
  runUntil(d2, () => b2.magnusPull.stage !== 'pull', 3);
  ok(gap(d2, b2) > start + 10, `full throttle away gets free (${start.toFixed(1)} m to ${gap(d2, b2).toFixed(1)} m)`);
});

test('a pulled car that reaches the magnet takes a clang, then his magnet is red hot', () => {
  const {duel, boss} = fight();
  place(duel, boss, 12);
  boss.magnusPull.nextPullSec = duel.state.stageTimeSec;
  runUntil(duel, () => boss.magnusPull.stage === 'pull', 3);
  ok(WARLORDS.magnus && boss.magnusPull.stage === 'pull', 'the pull is on');
  const armor = duel.state.armor;
  place(duel, boss, 4);
  runUntil(duel, () => boss.magnusPull.stage !== 'pull', 1);
  equal(armor - duel.state.armor, MAGNUS_RULES.clangArmor.medium, 'the clang takes its armor');
  ok(duel.state.knock, 'the clang throws the car clear');
  equal(boss.magnusPull.stage, 'hot', 'the magnet is red hot after the clang');
  const hit = boss.armor;
  applyArmorDamage(duel, boss, 'fixed', {owner: 'player', amount: 10});
  equal(hit - boss.armor, 10 * MAGNUS_RULES.hotDefense, 'a hit counts 1.5 times while it cools');
  runUntil(duel, () => boss.magnusPull.stage !== 'hot', MAGNUS_RULES.hotSec + 1);
  equal(boss.magnusPull.stage, 'idle', 'the window ends');
});

test('phase two pulls twice; Easy never shoots and rams for half', () => {
  const {duel, boss} = fight();
  duel.state.arena.warlordPhase = 2;
  place(duel, boss, 25);
  boss.magnusPull.nextPullSec = duel.state.stageTimeSec;
  const stages = [];
  for (let t = 0; t < 12 / DT && stages.at(-1) !== 'hot'; t++) {
    place(duel, boss, 25);
    duel.step(DT);
    if (stages.at(-1) !== boss.magnusPull.stage) stages.push(boss.magnusPull.stage);
  }
  equal(stages.filter(stage => stage !== 'idle'), ['tell', 'pull', 'gap', 'pull', 'hot'], 'two pulls, then the window');
  const easy = fight({difficulty: 'easy'});
  equal([MAGNUS_FIGHT.mayFire(easy.duel, easy.boss), MAGNUS_FIGHT.mayFire(duel, {magnusPull: {stage: 'idle'}})], [false, true],
    'on Easy he never shoots; on Medium he shoots between pulls');
  equal(MAGNUS_FIGHT.attack(easy.duel, easy.boss, easy.duel.state).multiplier, .5, 'his rams on Easy are half an ordinary ram');
});

test('the first win pays the ninth place, gives the Tesla Coil and claims no territory', () => {
  const {duel, boss} = fight();
  for (let n = 0; n < 3; n++) {
    runUntil(duel, () => !boss.combatWrecking, 6);
    for (const p of duel.state.arena.participants) p.protectedSec = 0;
    boss.combatShield = 0; boss.armor = 1;
    applyArmorDamage(duel, boss, 'crossbow', {owner: 'player'}); duel.step(DT);
  }
  equal(duel.state.arena.result?.winnerId, 'player', 'three wrecks win the fight');
  const seven = WARLORD_LADDER.slice(0, WARLORD_LADDER.indexOf('blackiron'));
  const profile = {version: 2, credits: 5, unlockedCars: ['falcone_f42'], wasteland: {version: 1, discoveredGate: true, scrap: 0, xp: 0,
    settledResults: [], territories: {}, warlords: beaten([...seven, 'blackiron']), cards: []}};
  const won = settleWarlordResult(profile, {runId: 'magnus-1', ownerPlayerId: 'p', activePlayerId: 'p', arena: duel.state.arena,
    car: 'falcone_f42', cpuDifficulty: 'medium', warlordCardsEnabled: true});
  equal([won.awarded, won.firstWin, won.scrapEarned], [true, true, Math.round(1400 * 1.2)], 'ninth-place first-win pay at Medium');
  equal(won.weaponEarned, 'tesla', 'the Tesla Coil is earned');
  ok(getProfileWeapons(won.profile).unlocked.includes('tesla'), 'the Tesla Coil is owned');
  ok(!Object.hasOwn(won.profile.wasteland.territories, 'magnus') && won.territoryClaimed === false, 'no territory row is made');
  equal(won.profile.wasteland.warlords.magnus, {defeated: true, wins: 1, losses: 0}, 'his record is saved');
  ok(won.profile.wasteland.cards.some(card => card.id === 'magnus'), 'his story card is earned');
  equal(storyCardFor('magnus')?.carId, 'falcone_heritage', 'his card shows his car');
  const flags = createFeatureFlags({storage: null, qa: false, overrides: {'warlord-nine': true}});
  const map = territoryPanel(won.profile, {featureFlags: flags});
  ok(map.includes('<h4>Magnus the Magnet</h4>') && map.includes('data-warlord="magnus">REMATCH'), 'the map offers a rematch');
  const before = territoryPanel(profile, {featureFlags: flags});
  ok(before.includes('data-warlord="magnus">FIGHT'), 'after the Baron the map offers his fight');
  const off = territoryPanel(profile, {featureFlags: createFeatureFlags({storage: null, qa: false, overrides: {'warlord-nine': false}})});
  ok(!off.includes('Magnus'), 'with the switch off the map has no Magnus card');
});

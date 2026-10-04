import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {WARLORDS, BUILT_WARLORD_IDS} from '../src/warlords.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {getProfileWeapons} from '../src/weapon-upgrades.js';
import {thinkBrain} from '../src/arena/arena-brains.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {stepCombat} from '../src/combat.js';
import {armorDamageFor} from '../src/combat-armor.js';
import {equipArmorKit, armorKitBonus, armorKitMass} from '../src/armor-kits.js';

// WAR-03a: native entry, combat and rewards; Claude settled the move on 4 October.
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Gearhead Gunn: ${checks} acceptance checks executed.`));

function admitted({enabled = true, discovered = true, difficulty = 'medium'} = {}) {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {warlords: enabled, scrapdome: true}});
  const duel = new Duel({seed: 304, featureFlags: flags});
  duel.state.wastelandGateDiscovered = discovered;
  return {duel, started: startWarlordEvent(duel, {warlordId: 'gunn',
    car: 'falcone_f42', cpuDifficulty: difficulty, playerId: 'gunn-driver'})};
}
function fight(options) {
  const {duel, started} = admitted(options);
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

function combatFixture(options = {}) {
  const duel = fight(options), boss = duel.state.opponents[0];
  const participant = duel.state.arena.participants.find(p => p.id === boss.arenaId);
  const launches = [], tells = [];
  duel.onChange((state, event) => {
    if (event.arsenalCue === 'weapon.rockets.fire' && event.actor === boss)
      launches.push({...event.projectile, observedAt: duel.state.stageTimeSec});
    if (event.arenaTell?.id === boss.arenaId) tells.push({...event.arenaTell, at: duel.state.stageTimeSec});
  });
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0; duel.state.combat.aiTimer = Infinity;
  duel.state.s = duel.state.prevS = 100; duel.state.lateral = duel.state.prevLateral = 0;
  boss.s = boss.prevS = 100; boss.lateral = boss.prevLateral = 55;
  boss.speedMph = duel.state.speedMph = 0;
  participant.targetId = 'player';
  const advance = seconds => {
    for (let n = 0; n < Math.round(seconds / DT); n++) {
      duel.state.stageTimeSec += DT;
      const goal = thinkBrain(duel, participant, boss, DT);
      stepCombat(duel, DT);
      participant.goal = goal;
    }
  };
  return {duel, boss, participant, launches, tells, advance};
}

for (const [difficulty, cooldown, tell] of [['easy', 9, 1.2], ['medium', 7, .8], ['hard', 5, .5]]) {
  test(`${difficulty}: native barrage waits its cooldown, tells fully and launches three spaced rockets`, () => {
    const f = combatFixture({difficulty});
    f.advance(cooldown - .05);
    equal(f.tells.length, 0, 'the initial cooldown starts with the fight');
    f.advance(.1);
    equal(f.tells.length, 1, 'a ready barrage begins its native tell at clear 55 m range');
    equal(f.tells[0].seconds, tell, 'the full difficulty tell is observable before firing');
    const at = f.tells[0].at;
    f.advance(tell - .1);
    equal(f.launches.filter(p => p.observedAt >= at).length, 0, 'no single or barrage rocket fires through the tell');
    f.advance(.7);
    const barrage = f.launches.filter(p => p.observedAt >= at);
    equal(barrage.length, 3, 'phase one launches exactly three Rocket Pods rockets');
    for (let n = 1; n < barrage.length; n++)
      ok(Math.abs(barrage[n].launchedAt - barrage[n - 1].launchedAt - .25) < DT,
        'barrage rockets launch 0.25 seconds apart');
    equal(f.boss.gunnBarrage.stage, 'window', 'the barrage enters its overheat window');
    const before = f.launches.length, armor = f.boss.armor;
    applyArmorDamage(f.duel, f.boss, 'crossbow', {owner: 'player'});
    ok(Math.abs(armor - f.boss.armor - armorDamageFor('crossbow') * 1.5) < 1e-7,
      'native hits during overheat deal the shared 1.5-times window damage');
    f.advance(2.4);
    equal(f.launches.length, before, 'the three-second window cannot fire any rocket');
  });
}

test('phase two shortens the tell and fires five rockets at one committed predictive point', () => {
  const f = combatFixture({difficulty: 'hard'});
  f.duel.state.arena.warlordPhase = 2;
  f.duel.state.speedMph = 20;
  f.advance(5.1);
  equal(f.tells.length, 1, 'phase two starts a native barrage');
  ok(Math.abs(f.tells[0].seconds - .4) < 1e-9, 'phase two tells are 80 percent as long');
  f.advance(.45);
  const first = f.launches.find(p => p.observedAt >= f.tells[0].at);
  ok(first, 'the first native phase-two rocket launches after lock');
  const target = worldPose(f.duel, f.duel.state);
  const dx = target.x - first.x, dz = target.z - first.z;
  ok(Math.abs(first.vx * dz - first.vz * dx) > 1,
    'the locked point leads the moving player rather than aiming at their current position');
  f.duel.state.headingError += Math.PI / 2;
  f.advance(1.1);
  const shots = f.launches.filter(p => p.observedAt >= f.tells[0].at);
  equal(shots.length, 5, 'phase two launches five rockets');
  const rays = shots.map(p => ({x: p.x, z: p.z, vx: p.vx, vz: p.vz}));
  for (const ray of rays.slice(1))
    ok(Math.abs(ray.vx * first.vz - ray.vz * first.vx) < 1e-6,
      'turning after lock does not retarget later rockets from the stationary turret');
});

for (const range of [24, 91]) test(`barrage rejects ${range} metres even after cooldown`, () => {
  const f = combatFixture(); f.boss.lateral = f.boss.prevLateral = range;
  f.advance(10);
  equal(f.tells.length, 0, 'barrage requires the settled inclusive 25 to 90 m range');
});

test('breaking sight at lock time cancels the barrage and still earns a full window', () => {
  const f = combatFixture(); f.advance(7.1);
  equal(f.tells.length, 1, 'the clear sight line starts the tell');
  const me = worldPose(f.duel, f.boss), at = worldPose(f.duel, f.duel.state);
  const blocker = {x: (me.x + at.x) / 2, z: (me.z + at.z) / 2, y: -10,
    halfX: 10, halfZ: 10, height: 30, shape: 'box'};
  f.duel._obstacles = () => [blocker];
  const count = f.launches.length;
  f.advance(.8);
  equal(f.launches.length, count, 'a wall between Gunn and player at lock time cancels all barrage rockets');
  equal(f.boss.gunnBarrage.stage, 'window', 'a successfully broken lock still overheats Gunn');
  f.advance(2.8);
  equal(f.boss.gunnBarrage.stage, 'window', 'the counter retains the full three-second window');
});

test('single rockets use their own three-second cadence and require clear 40 to 80 m sight', () => {
  const f = combatFixture({difficulty: 'easy'}); f.advance(6.2);
  equal(f.launches.length, 2, 'only two single rockets fire before the nine-second barrage');
  ok(Math.abs(f.launches[1].launchedAt - f.launches[0].launchedAt - 3) < DT,
    'single rockets fire every three seconds');
  for (const range of [39, 81]) {
    const outside = combatFixture({difficulty: 'easy'});
    outside.boss.lateral = outside.boss.prevLateral = range; outside.advance(6.2);
    equal(outside.launches.length, 0, 'single rockets never fire outside 40 to 80 metres');
  }
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

test('the first Gunn win earns a turret look usable on another car without changing physics', () => {
  const arena = completed();
  const profile = {version: 2, credits: 500, unlockedCars: ['falcone_f42', 'dusthawk_rally'],
    wasteland: {version: 1, discoveredGate: true, scrap: 0, xp: 0,
      settledResults: [], territories: {}, warlords: {}}};
  const won = settleWarlordResult(profile, {runId: 'gunn-look', ownerPlayerId: 'driver',
    activePlayerId: 'driver', arena, car: 'falcone_f42', cpuDifficulty: 'medium'});
  ok(won.kitEarned, 'a first Gunn victory saves the turret as an earned kit look');
  const equipped = equipArmorKit(won.profile, 'dusthawk_rally', won.kitEarned);
  equal(equipped.ok, true, 'the same earned turret look can be worn on a different unlocked car');
  equal(equipped.cost, 0, 'wearing an earned look spends nothing');
  equal(armorKitBonus(won.kitEarned), 0, 'the cosmetic turret adds no armor');
  equal(armorKitMass(won.kitEarned), 0, 'the cosmetic turret adds no crash mass');
});

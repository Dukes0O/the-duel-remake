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
import {worldPose, floorLimit} from '../src/arena/arena-floor.js';
import {sweepObstacle} from '../src/collision.js';
import {stepCombat} from '../src/combat.js';
import {armorDamageFor} from '../src/combat-armor.js';
import {equipArmorKit, armorKitBonus, armorKitMass} from '../src/armor-kits.js';
import {createProfile} from '../src/progression.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {createArmoryScreen} from '../src/screen-armory.js';
import {territoryPanel} from '../src/screen-territory.js';
import {arenaYardPanel} from '../src/screen-arena.js';
import {SOUND_BANK} from '../src/sound-bank.js';

// WAR-03a: native entry, combat and rewards; Claude settled the move on 4 October.
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Gearhead Gunn: ${checks} acceptance checks executed.`));

function yardFlagFixture() {
  const profile = createProfile();
  profile.wasteland.discoveredGate = true;
  profile.wasteland.territories = {sal: {hold: 100}, gunn: {hold: 100}};
  const escapeHTML = value => String(value ?? '');
  const yard = flags => yardHomeScreen({profile, playerName: 'Gunn yard driver', escapeHTML,
    panel: 'territory', arenaMarkup: arenaYardPanel({profile, featureFlags: flags}), warlordsAvailable: true,
    ...(flags ? {featureFlags: flags} : {})});
  const armory = flags => createArmoryScreen({profile: () => profile, credits: String, escapeHTML,
    getGarageMessage: () => '', kitsEnabled: () => true,
    action: (label, verb) => `<button data-action="${verb}">${label}</button>`,
    ...(flags ? {featureFlags: flags} : {})})();
  const gunnCard = markup => markup.match(/<article class="territory-card"><h4>Gearhead Gunn<\/h4>[\s\S]*?<\/article>/)?.[0];
  return {profile, yard, armory, gunnCard};
}

test('native yard and Armory retain default/off Gunn and released Sal behavior', () => {
  const f = yardFlagFixture(), before = structuredClone(f.profile);
  const baseline = {yard: f.yard(), armory: f.armory()};
  for (const flags of [createFeatureFlags({storage: null, qa: false}),
    createFeatureFlags({storage: null, qa: true, overrides: {gunn: false}})]) {
    const yard = f.yard(flags), armory = f.armory(flags);
    equal(yard, baseline.yard, 'default/off injection preserves the native yard markup');
    equal(armory, baseline.armory, 'default/off injection preserves the native Armory markup');
    ok(yard.includes('data-warlord="sal"'), 'released Sal remains fightable from the enabled yard');
    ok(!yard.includes('data-warlord="gunn"'), 'default/off Gunn has no yard launch control');
    ok(f.gunnCard(armory)?.includes('WARLORD FIGHT COMING LATER'), 'default/off Armory keeps Gunn unavailable');
    ok(!armory.includes('data-warlord='), 'main-menu Armory never contains a fight launch control');
  }
  equal(f.profile, before, 'both native presentation paths preserve the supplied career');
});

test('native yard forwards the injected Gunn-on flag to its territory launch control', () => {
  const f = yardFlagFixture(), before = structuredClone(f.profile);
  const flags = createFeatureFlags({storage: null, qa: true, overrides: {gunn: true}});
  ok(territoryPanel(f.profile, {featureFlags: flags}).includes('data-warlord="gunn"'),
    'the real territory panel admits Gunn with the same valid injected context');
  const markup = f.yard(flags);
  equal(f.profile, before, 'native yard presentation cannot mutate career state');
  ok(markup.includes('data-warlord="sal"'), 'enabling Gunn does not remove released Sal');
  ok(markup.includes('data-warlord="gunn"'), 'native yard must forward the injected flag instead of the default singleton');
});

test('native Armory forwards injected Gunn availability but keeps territory information read-only', () => {
  const f = yardFlagFixture(), before = structuredClone(f.profile);
  const flags = createFeatureFlags({storage: null, qa: true, overrides: {gunn: true}});
  ok(territoryPanel(f.profile, {featureFlags: flags, canFight: false}).includes('GEARHEAD GUNN IS WAITING'),
    'the real read-only territory panel admits the same injected Gunn context');
  const markup = f.armory(flags);
  equal(f.profile, before, 'native Armory presentation cannot mutate career state');
  ok(!markup.includes('data-warlord='), 'even Gunn-on main-menu Armory cannot launch any warlord');
  ok(f.gunnCard(markup)?.includes('GEARHEAD GUNN IS WAITING') &&
    f.gunnCard(markup)?.includes('FIGHT FROM THE YARD'),
  'native Armory must display injected Gunn availability and direct fighting to the yard');
});

function admitted({enabled = true, discovered = true, difficulty = 'medium'} = {}) {
  // Gunn's card names gunn; warlords and scrapdome are not catalog switches.
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {gunn: enabled}});
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

// The old 0/55 offsets placed Gunn beyond the 32 m Pit floor and behind its
// real outer wall. These opposite offsets keep both bodies on valid floor.
function clearPoses(duel, boss, range = 55) {
  if (range <= 60) {
    duel.state.s = duel.state.prevS = boss.s = boss.prevS = 100;
    duel.state.lateral = duel.state.prevLateral = -27.5;
    boss.lateral = boss.prevLateral = -27.5 + range;
  } else {
    const radius = duel.course.def.pit.radius + 27.5;
    const arc = duel.course.def.pit.radius * 2 * Math.asin(range / (2 * radius));
    duel.state.s = duel.state.prevS = 100 - arc / 2;
    boss.s = boss.prevS = 100 + arc / 2;
    duel.state.lateral = duel.state.prevLateral = boss.lateral = boss.prevLateral = 27.5;
  }
}
function rayBlockers(duel, boss) {
  const from = {...worldPose(duel, boss), y: duel.course.groundAt(boss.s, boss.lateral).y + 1};
  const to = {...worldPose(duel, duel.state), y: duel.course.groundAt(duel.state.s, duel.state.lateral).y + 1};
  const a = duel.course.nearest(from.x, from.z), b = duel.course.nearest(to.x, to.z, a.s);
  return duel._obstacles(Math.min(a.s, b.s) - 100, Math.max(a.s, b.s) + 100)
    .filter(obstacle => sweepObstacle(from, to, obstacle, 0, {halfWidth: 0, halfLength: 0, height: 0}));
}
test('the corrected Gunn fixture uses real Pit floor and has no native wall or pile intersection', () => {
  const duel = new Duel({seed: 304}); duel.state.wastelandGateDiscovered = true;
  equal(duel.startArenaEvent({venueId: 'pit', mode: 'last-car-rolling', car: 'falcone_f42',
    opponents: [{car: 'stuttgart_959s'}]}), true, 'the fixture check enters the actual Pit');
  const boss = duel.state.opponents[0];
  for (const range of [24, 39, 55, 81, 91]) {
    clearPoses(duel, boss, range);
    for (const actor of [duel.state, boss])
      ok(Math.abs(actor.lateral) + duel._vehicleSpec(actor).halfWidth < floorLimit(duel),
        'both complete car bodies remain inside the native Pit floor');
    const a = worldPose(duel, boss), b = worldPose(duel, duel.state);
    ok(Math.abs(Math.hypot(a.x - b.x, a.z - b.z) - range) < 1e-7, 'native world poses retain the requested range');
    equal(rayBlockers(duel, boss).map(obstacle => obstacle.id), [], 'actual Pit obstacles leave the fixture sight line clear');
  }
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
  clearPoses(duel, boss);
  equal(rayBlockers(duel, boss).length, 0, 'the native Pit ray is clear before Gunn combat');
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

test('Gunn has a switched rising-whine recipe without changing the default charge tell', () => {
  equal(SOUND_BANK['arena.tell'], {bus: 'impacts', volume: 1, pitchRange: [1, 1],
    volumeRange: [1, 1], priority: 68, limit: 3, spatial: null, duck: null,
    layers: [
      {kind: 'tone', frequency: 92, duration: .7, volume: .15, type: 'sawtooth', delay: 0, endFrequency: 185},
      {kind: 'tone', frequency: 184, duration: .55, volume: .06, type: 'square', delay: .06, endFrequency: 370},
    ]}, 'the existing engine-roar default remains exact');
  const cue = SOUND_BANK['arena.gunn-barrage'];
  ok(cue, 'the native barrage cue has a named sound-bank recipe');
  equal(cue.flag, 'gunn', 'the new sound shares Gunn\'s dev switch');
  equal(cue.bus, 'impacts', 'the positional warning uses the existing tell bus');
  ok(!cue.file && !cue.files && !cue.loop, 'the whine needs no new asset or persistent loop');
  ok(cue.layers.length >= 1, 'the recipe contains audible layers');
  for (const layer of cue.layers) {
    equal(layer.kind, 'tone', 'the existing tone API produces the whine');
    ok(layer.frequency >= 400 && layer.endFrequency > layer.frequency,
      'the warning rises above the default low engine roar');
    ok([layer.frequency, layer.endFrequency, layer.volume, layer.duration, layer.delay].every(Number.isFinite) &&
      layer.volume > 0 && layer.duration > 0 && layer.delay >= 0,
      'each layer has a positive finite envelope');
    ok(layer.delay + layer.duration + .02 <= .4,
      'including the oscillator tail, the whine fits the shortest native tell');
  }
});

test('native Gunn tells name the barrage whine and preserve their settled timing and position', () => {
  for (const [difficulty, phase, cooldown, seconds] of [
    ['easy', 1, 9, 1.2], ['medium', 1, 7, .8], ['hard', 1, 5, .5], ['hard', 2, 5, .4],
  ]) {
    const f = combatFixture({difficulty});
    f.duel.state.arena.warlordPhase = phase;
    f.advance(cooldown + .05);
    equal(f.tells.length, 1, 'one ready barrage emits one native tell');
    const tell = f.tells[0], me = worldPose(f.duel, f.boss);
    equal(tell.cue, 'arena.gunn-barrage', 'the native event selects the named whine');
    equal(tell.targetId, 'player', 'the warning still names its native target');
    ok(Math.abs(tell.seconds - seconds) < 1e-9, 'the event retains the full difficulty/phase tell');
    equal(tell.position, {x: me.x, y: f.duel.course.groundAt(f.boss.s, f.boss.lateral).y, z: me.z},
      'the warning retains the actual boss ground position');
    equal(f.launches.filter(shot => shot.observedAt >= tell.at).length, 0,
      'adding sound metadata cannot fire a rocket during the tell');
  }
});

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
  const lock = {...f.boss.gunnBarrage.aim};
  f.duel.state.headingError += Math.PI / 2;
  f.advance(1.1);
  const shots = f.launches.filter(p => p.observedAt >= f.tells[0].at);
  equal(shots.length, 5, 'phase two launches five rockets');
  for (const shot of shots) {
    const dx = lock.x - shot.x, dy = lock.y - shot.y, dz = lock.z - shot.z;
    const speedSquared = shot.vx ** 2 + shot.vy ** 2 + shot.vz ** 2;
    const arrival = (dx * shot.vx + dy * shot.vy + dz * shot.vz) / speedSquared;
    ok(arrival > 0 && Math.hypot(shot.x + shot.vx * arrival - lock.x,
      shot.y + shot.vy * arrival - lock.y, shot.z + shot.vz * arrival - lock.z) < 1e-5,
    'turning after lock leaves every tube trajectory aimed at the same locked world point');
  }
});

for (const range of [24, 91]) test(`barrage rejects ${range} metres even after cooldown`, () => {
  const f = combatFixture(); clearPoses(f.duel, f.boss, range);
  f.advance(10);
  equal(f.tells.length, 0, 'barrage requires the settled inclusive 25 to 90 m range');
});

test('breaking sight at lock time cancels the barrage and still earns a full window', () => {
  const f = combatFixture(); f.advance(7.1);
  equal(f.tells.length, 1, 'the clear sight line starts the tell');
  f.duel.state.s = f.duel.state.prevS = 100 + Math.PI * f.duel.course.def.pit.radius;
  ok(rayBlockers(f.duel, f.boss).some(obstacle => obstacle.id === 'pit-centre-pile'),
    'the real centre pile breaks the sight line at lock time');
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
    clearPoses(outside.duel, outside.boss, range); outside.advance(6.2);
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

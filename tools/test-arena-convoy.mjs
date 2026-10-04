import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {arenaReward, settleArenaResult} from '../src/arena/arena-settlement.js';
import {createFighter} from '../src/onfoot.js';
import {stepFootTransition} from '../src/onfoot-transition.js';
import {App} from '../src/app.js';
import {CONVOY_ROOF_PLATE, convoyPoint, damageConvoyValves} from '../src/arena/convoy.js';
import {stepConvoyRaid} from '../src/arena/modes/convoy-raid.js';
import {startBoarding} from '../src/crew-gear/boarding.js';

// ARENA-07: native rules and the pure settlement contract settled on 4 October.
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Convoy Raid: ${checks} acceptance checks executed.`));
const FIELD = [{car: 'stuttgart_959s'}, {car: 'dusthawk_rally'}, {car: 'aurora_gt'}];

function admitted({venueId = 'salt-flats', discovered = true, enabled = true, difficulty = 'medium'} = {}) {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {'convoy-raid': enabled, 'salt-flats': true, 'crew-gear': true}});
  const duel = new Duel({seed: 307, featureFlags: flags});
  duel.state.wastelandGateDiscovered = discovered;
  return {duel, started: duel.startArenaEvent({venueId, mode: 'convoy-raid',
    car: 'falcone_f42', cpuDifficulty: difficulty, playerId: 'convoy-driver', opponents: FIELD})};
}
function fight(options) {
  const {duel, started} = admitted(options);
  equal(started, true, 'native arena entry must accept Convoy Raid on Salt Flats');
  duel.state.countdown = 0; duel.step(1 / 120); duel.step(1 / 120);
  return duel;
}

function exposedFight() {
  const duel = fight(), rig = duel.state.opponents[0];
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = 0; duel.state.combat.aiTimer = Infinity;
  rig.combatShield = 0;
  return {duel, rig, at: duel.course.groundAt(rig.s, rig.lateral)};
}
function breakAll(f) {
  for (let n = 0; n < 10 && f.duel.state.arena.convoy.valves.some(hp => hp > 0); n++)
    applyArmorDamage(f.duel, f.rig, 'bomb', {owner: 'player', damageMultiplier: 100,
      hitPosition: f.at, blastRadius: 20});
  equal(f.duel.state.arena.convoy.valves, [0, 0, 0], 'native blasts break every valve inside their radius');
  f.duel.step(DT);
}

// ART-FIT-TANKER's amber plate, not the 3.5 m lamp-inclusive body envelope.
const PLATE = {x: -.0000006035, y: 3.02, z: -2.4441381118,
  halfWidth: .69862524, halfLength: 1.24205031};
function roofCrossing(f, local = PLATE) {
  const state = f.duel.state, ground = f.duel.course.groundAt(f.rig.s, f.rig.lateral);
  const at = convoyPoint(f.duel, f.rig, [local.x, local.y, local.z]);
  state.onFoot = true; state.crewId = 'rook';
  state.fighter = createFighter(f.duel.course, state, {s: f.rig.s, lateral: f.rig.lateral});
  Object.assign(state.fighter, {x: at.x, z: at.z, y: at.y + .02,
    groundY: ground.y, airHeight: at.y - ground.y + .02, verticalSpeed: -3});
  state.fighterInput = {fire: false};
  return at;
}
function moduleWindow(f) {
  // Use the real mode damage API while its central armor caller is held.
  equal(damageConvoyValves(f.duel, f.rig, 450, 'bomb',
    {owner: 'player', hitPosition: f.at, blastRadius: 20}), 450,
  'native valve damage opens the isolated boarding fixture');
  equal(f.duel.state.arena.convoy.valves, [0, 0, 0], 'all three real valves are broken');
}
function advance(duel, seconds) {
  for (let n = 0; n < Math.round(seconds / DT); n++) duel.step(DT);
}
function settleNativeOnce(duel, expectedScrap, runId) {
  const profile = {wasteland: {version: 1, discoveredGate: true,
    scrap: 0, settledResults: [], territories: {tollkeeper: {hold: 0}}}};
  const payload = {runId, ownerPlayerId: 'convoy-driver', activePlayerId: 'convoy-driver',
    cpuDifficulty: 'medium', arena: duel.state.arena};
  const first = settleArenaResult(profile, payload);
  equal(first.awarded, true, 'the actual native result settles');
  equal(first.scrapEarned, expectedScrap, 'the actual result pays the settled amount');
  equal(settleArenaResult(first.profile, payload).awarded, false,
    'the same native event cannot settle twice');
}

test('native projectile hits damage only the nearest valve and never destroy the rig body', () => {
  const f = exposedFight(), armor = f.rig.armor;
  applyArmorDamage(f.duel, f.rig, 'crossbow', {owner: 'player', hitPosition: f.at});
  const damaged = f.duel.state.arena.convoy.valves.filter(hp => hp < 150);
  equal(damaged.length, 1, 'a native projectile impact damages exactly its nearest fuel valve');
  equal(f.rig.armor, armor, 'valve damage cannot reduce the invulnerable rigid body armor');
  for (let n = 0; n < 20; n++) applyArmorDamage(f.duel, f.rig, 'fixed', {owner: 'player', amount: 1000});
  equal(f.rig.armor, armor, 'unlocated body damage cannot destroy the tanker');
  equal(f.rig.combatWrecking, false, 'ordinary body hits never start a tanker wreck');
  equal(f.duel.state.status, 'racing', 'body damage never completes Convoy Raid');
});

test('rams farther than three metres from every valve cannot damage a weak point', () => {
  const f = exposedFight();
  const before = [...f.duel.state.arena.convoy.valves];
  applyArmorDamage(f.duel, f.rig, 'ram', {owner: 'player', relativeKph: 80,
    contactPoint: {...f.at, x: f.at.x + 100}});
  equal(f.duel.state.arena.convoy.valves, before, 'a distant ram contact only strikes the body');
  equal(f.rig.combatWrecking, false, 'a ram body hit cannot wreck the rig');
});

test('breaking all valves slows the real rig, opens a sixty-second boarding window and restores half armor', () => {
  const f = exposedFight(); breakAll(f);
  ok(Math.abs(f.rig.speedMph * 1.609344 - 35) < .01, 'all broken valves slow the native loop to 35 km/h');
  ok(f.duel.state.arena.convoy.boardingLeftSec > 59.9, 'all broken valves grant sixty seconds to board');
  equal(f.duel.state.status, 'racing', 'breaking valves alone is not a win');
  for (let n = 0; n < Math.round(59.8 / DT); n++) f.duel.step(DT);
  equal(f.duel.state.arena.convoy.valves, [0, 0, 0], 'valves remain broken before the deadline');
  for (let n = 0; n < 60; n++) f.duel.step(DT);
  equal(f.duel.state.arena.convoy.valves, [75, 75, 75], 'an unplanted deadline restores each valve at half armor');
  equal(f.duel.state.arena.convoy.boardingLeftSec, 0, 'expired boarding lamps switch off');
  ok(Math.abs(f.rig.speedMph * 1.609344 - 55) < .01, 'the restored rig returns to 55 km/h');
});

test('the real rooftop crossing, fire hold and fuse are required to win', () => {
  const f = exposedFight(); breakAll(f);
  const state = f.duel.state;
  roofCrossing(f);
  stepFootTransition(f.duel, DT);
  equal(state.boarding?.phase, 'roof', 'an ordinary crew member boards the slow rig by a real roof crossing');
  state.fighterInput.fire = true;
  for (let n = 0; n < Math.round(.9 / DT); n++) stepFootTransition(f.duel, DT);
  equal(state.status, 'racing', 'less than one second of planting cannot win');
  for (let n = 0; n < Math.round(.2 / DT); n++) stepFootTransition(f.duel, DT);
  equal(state.boarding?.phase, 'charge', 'holding fire plants the actual native charge');
  equal(state.status, 'racing', 'a planted charge must still finish its fuse');
  for (let n = 0; n < Math.round(2.1 / DT); n++) stepFootTransition(f.duel, DT);
  f.duel.step(DT);
  equal(state.status, 'arena_result', 'the finishing boarding charge completes the native event');
  equal(state.arena.result.winnerId, 'player', 'the charge awards the player a Convoy win');
});

test('boarding fixtures use the approved amber plate plane and bounds', () => {
  equal(CONVOY_ROOF_PLATE, PLATE, 'runtime boarding geometry matches the approved plate');
  ok(PLATE.y < 3.5, 'warning lamps above the plate are not its landing plane');
  ok(Math.abs(PLATE.z) > PLATE.halfLength, 'the plate does not include the rig centre');
});

test('a native downward plate crossing mounts at the plate rather than the body centre', () => {
  const f = exposedFight(); moduleWindow(f);
  const at = roofCrossing(f);
  stepFootTransition(f.duel, DT);
  equal(f.duel.state.boarding?.phase, 'roof', 'a real downward amber plate crossing boards the rig');
  const fighter = f.duel.state.fighter;
  ok(Math.hypot(fighter.x - at.x, fighter.y - at.y, fighter.z - at.z) < .01,
    'the mounted fighter stays on the approved plate, not on lamp tops or cab centre');
});

test('native boarding rejects the cab, tank outside the plate, lamp tops and upward crossings', () => {
  for (const local of [
    {...PLATE, z: 3},
    {...PLATE, x: PLATE.x + PLATE.halfWidth + .05},
    {...PLATE, z: PLATE.z - PLATE.halfLength - .05},
    {...PLATE, y: 3.5},
  ]) {
    const f = exposedFight(); moduleWindow(f);
    const at = roofCrossing(f, local);
    f.duel.state.fighter.y = at.y - .005;
    equal(startBoarding(f.duel, f.rig, {previousY: at.y + .02}), false,
      'a downward crossing of another tanker surface is not a plate landing');
    equal(f.duel.state.boarding, null, 'a rejected surface creates no boarding or charge');
  }
  const f = exposedFight(); moduleWindow(f);
  const at = roofCrossing(f);
  f.duel.state.fighter.verticalSpeed = 3;
  equal(startBoarding(f.duel, f.rig, {previousY: at.y - .02}), false,
    'rising through the plate is not a landing');
});

for (const deadline of ['boarding window', 'event']) {
  test(`a charge legally planted just before the ${deadline} deadline keeps its full fuse and settles once`, () => {
    const f = exposedFight(), state = f.duel.state;
    if (deadline === 'event') stepConvoyRaid(f.duel, 298.8 - state.arena.clockSec);
    moduleWindow(f);
    if (deadline === 'boarding window') stepConvoyRaid(f.duel, 58.8);
    let results = 0;
    f.duel.onChange((_state, event) => { if (event.arenaResult) results++; });
    roofCrossing(f); f.duel.step(DT);
    equal(state.boarding?.phase, 'roof', 'the deadline fixture boards through the native plate path');
    state.fighterInput.fire = true;
    advance(f.duel, 1 - DT);
    equal(state.boarding?.phase, 'roof', 'one tick short of the one-second hold is still unplanted');
    advance(f.duel, DT);
    equal(state.boarding?.phase, 'charge', 'the complete native hold plants exactly one charge');
    equal(state.boarding.chargesPlanted, 1, 'only one charge was planted');
    equal(state.arena.convoy.chargePlanted, true, 'the actual mode records the legal plant');
    ok(state.arena.clockSec < 300 && state.arena.convoy.boardingLeftSec > 0,
      'planting completed before both relevant deadlines');
    advance(f.duel, 2 - DT);
    equal(state.status, 'racing', 'the original full fuse survives the crossed deadline');
    equal(state.boarding?.phase, 'charge', 'the pending native charge is not discarded at timeout');
    equal(state.arena.convoy.valves, [0, 0, 0], 'a planted charge prevents valve restoration');
    equal(results, 0, 'neither deadline publishes an early result');
    advance(f.duel, DT);
    equal(state.status, 'arena_result', 'detonation after the full two seconds finishes the event');
    equal(state.arena.result.reason, 'charge', 'the native result is a charge win, not a timeout loss');
    equal(state.arena.result.winnerId, 'player', 'the player wins after the deadline');
    equal(results, 1, 'the native event publishes exactly one result');
    advance(f.duel, .5);
    equal(results, 1, 'later game ticks cannot publish another result');
    settleNativeOnce(f.duel, 840, `near-${deadline}`);
  });
}

test('an unplanted window expires, restores valves and rejects later plate landings', () => {
  const f = exposedFight(); moduleWindow(f);
  stepConvoyRaid(f.duel, 60 - DT);
  equal(f.duel.state.arena.convoy.valves, [0, 0, 0], 'valves stay broken one tick before the deadline');
  advance(f.duel, 2 * DT);
  equal(f.duel.state.arena.convoy.valves, [75, 75, 75], 'an unplanted deadline restores all valves');
  equal(f.duel.state.arena.convoy.boardingLeftSec, 0, 'the unplanted window is closed');
  equal(f.duel.state.arena.convoy.chargePlanted, false, 'timeout cannot invent a planted charge');
  equal(f.duel.state.status, 'racing', 'window expiry alone does not finish the five-minute event');
  const at = roofCrossing(f);
  f.duel.state.fighter.y = at.y - .005;
  equal(startBoarding(f.duel, f.rig, {previousY: at.y + .02}), false,
    'a closed window cannot admit a late plate landing');
});

test('the five-minute deadline without a charge loses and settles only once', () => {
  const f = exposedFight(); moduleWindow(f);
  stepConvoyRaid(f.duel, 300 - f.duel.state.arena.clockSec - DT);
  let results = 0;
  f.duel.onChange((_state, event) => { if (event.arenaResult) results++; });
  advance(f.duel, 2 * DT);
  equal(f.duel.state.status, 'arena_result', 'an unplanted five-minute deadline ends the native event');
  equal(f.duel.state.arena.result.reason, 'time', 'the loss comes from the event clock');
  equal(f.duel.state.arena.result.winnerId, f.rig.arenaId, 'the convoy wins an unplanted timeout');
  equal(f.duel.state.arena.convoy.finished, false, 'timeout does not claim a charge finish');
  equal(f.duel.state.boarding, null, 'there is no pending charge after an unplanted timeout');
  equal(results, 1, 'timeout publishes one result');
  advance(f.duel, .5);
  equal(results, 1, 'later ticks do not repeat the timeout result');
  settleNativeOnce(f.duel, 144, 'unplanted-timeout');
});

// Result fixtures test the immutable settlement boundary, not the live charge path above.
function resultFixture({won = true, broken = 3} = {}) {
  const participants = [{id: 'player', kind: 'player', team: 'player', wrecks: 0, wrecked: 0, damageDealt: 0},
    ...[1, 2, 3].map(n => ({id: `cpu-${n}`, kind: 'cpu', team: 'convoy', wrecks: 0, wrecked: 0, damageDealt: 0}))];
  const placings = won ? ['player', 'cpu-1', 'cpu-2', 'cpu-3'] : ['cpu-1', 'player', 'cpu-2', 'cpu-3'];
  return {version: 1, venueId: 'salt-flats', mode: 'convoy-raid', phase: 'over', clockSec: won ? 90 : 300,
    participants, convoy: {rigId: 'cpu-1', valves: won ? [0, 0, 0] : [75, 75, 75],
      playerValvesBroken: broken, boardingLeftSec: 0, finished: won},
    result: {winnerId: placings[0], placings, reason: won ? 'charge' : 'time'}};
}
for (const [difficulty, factor] of [['easy', 1], ['medium', 1.2], ['hard', 1.4]]) {
  test(`${difficulty}: a charge win pays 700 and a loss pays only forty per player-broken valve`, () => {
    equal(arenaReward(resultFixture(), difficulty).total, Math.round(700 * factor), 'Convoy wins use their settled large payout');
    for (const broken of [0, 1, 2, 3])
      equal(arenaReward(resultFixture({won: false, broken}), difficulty).total,
        Math.round(40 * broken * factor), 'loss pay counts only player-broken valves');
  });
}

test('Convoy settlement credits only the starting player once and grows Tollkeeper rather than Kettle hold', () => {
  const profile = {version: 2, credits: 77, future: {kept: true}, wasteland: {version: 1,
    discoveredGate: true, scrap: 10, settledResults: [], territories: {
      tollkeeper: {hold: 10, future: 'kept'}, kettle: {hold: 50}}}};
  const before = structuredClone(profile), payload = {runId: 'convoy-real-owner', ownerPlayerId: 'driver',
    activePlayerId: 'driver', cpuDifficulty: 'medium', arena: resultFixture()};
  const won = settleArenaResult(profile, payload);
  equal(won.awarded, true, 'a completed Convoy charge result is accepted');
  equal(won.scrapEarned, 840, 'Medium charge win pays 840 scrap');
  equal(won.profile.wasteland.territories.tollkeeper.hold, 35, 'a win adds 25 Tollkeeper hold');
  equal(won.profile.wasteland.territories.kettle.hold, 50, 'Convoy does not grow Kettle hold');
  equal(profile, before, 'settlement never mutates its input');
  equal(won.profile.credits, 77, 'ordinary racing credits remain unchanged');
  equal(won.profile.future, profile.future, 'unknown profile fields survive');
  equal(settleArenaResult(won.profile, payload).awarded, false, 'replaying a settled event cannot pay twice');
  equal(settleArenaResult(profile, {...payload, activePlayerId: 'other'}).awarded, false,
    'another named player cannot collect this Convoy result');
  const lost = settleArenaResult(profile, {...payload, runId: 'convoy-loss', arena: resultFixture({won: false, broken: 2})});
  equal(lost.scrapEarned, 96, 'two player-broken valves pay 96 on a Medium loss');
  equal(lost.profile.wasteland.territories.tollkeeper.hold, 10, 'a loss adds no territory hold');
});

test('the native yard entry requires unlocked Salt Flats and some race-earned Tollkeeper hold, not full hold', () => {
  const memory = new Map();
  globalThis.localStorage = {getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key)};
  globalThis.cancelAnimationFrame = () => {};
  function enter({xp, hold}) {
    memory.clear(); const app = new App();
    try {
      app.duel.featureFlags = createFeatureFlags({storage: null, qa: true,
        overrides: {'convoy-raid': true, 'salt-flats': true, 'hidden-road': true, 'scrapdome': true}});
      app.audio.unlock = () => {};
      app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true, xp,
        territories: {...app.profile.wasteland?.territories, tollkeeper: {hold}}}};
      ok(app._saveProfile(), 'fixture profile stays in memory-only storage');
      ok(app.visitWasteland(), 'the actual native App enters the yard'); app.advance(8);
      return app.startArenaEvent({venueId: 'salt-flats', mode: 'convoy-raid'});
    } finally {app.dispose?.();}
  }
  equal(enter({xp: 1_000_000, hold: 1}), true, 'one earned hold opens Convoy after Salt Flats unlock');
  equal(enter({xp: 1_000_000, hold: 0}), false, 'rank alone never opens Convoy without Tollkeeper hold');
  equal(enter({xp: 0, hold: 25}), false, 'Tollkeeper hold cannot bypass the Salt Flats unlock');
});

test('Convoy Raid has its own dev switch', () => {
  equal(FEATURE_STATES['convoy-raid'], 'dev', 'the unfinished Convoy mode must have a dev switch');
  const released = createFeatureFlags({storage: {getItem: () => 'true'}, qa: false,
    search: '?flags=convoy-raid'});
  equal(released.enabled('convoy-raid'), false, 'Convoy stays hidden in the released player build');
});

test('native entry admits Convoy Raid on the actual Salt Flats', () => {
  const {duel, started} = admitted();
  equal(started, true, 'native arena entry must admit the registered Convoy Raid mode');
  equal(duel.state.arena.mode, 'convoy-raid', 'entry retains the requested mode');
  equal(duel.state.arena.venueId, 'salt-flats', 'Convoy keeps the Salt Flats venue');
  equal(duel.course.def.id, 'salt-flats', 'the actual Convoy course is Salt Flats');
  equal(duel.state.arena.timeLimitSec, 300, 'Convoy has a five-minute limit');
});

test('initial convoy has one twelve-tonne rigid rig and two allied guard escorts', () => {
  const duel = fight(), arena = duel.state.arena;
  equal(duel.state.opponents.length, 3, 'one rig and two escorts are three native actors');
  equal(arena.participants.length, 4, 'the player fights the rig and its two escorts');
  const [rig, ...escorts] = duel.state.opponents;
  equal(rig.arenaRole, 'convoy-rig', 'the first actor is the rigid tanker');
  equal(duel._vehicleSpec(rig).mass, 12000, 'crash physics sees the twelve-tonne rig');
  equal(arena.participants.slice(2).map(p => p.brain), ['guard', 'guard'], 'two escorts use the guard brain');
  const rigTeam = arena.participants[1].team;
  ok(rigTeam !== arena.participants[0].team, 'the rig is hostile to the player');
  equal(arena.participants.slice(2).map(p => p.team), [rigTeam, rigTeam], 'escorts share the rig team');
  equal(escorts.length, 2, 'no separate trailer actor is created');
});

test('initial convoy drives at 55 km/h with three intact 150-armor valves', () => {
  const duel = fight(), convoy = duel.state.arena.convoy;
  equal(convoy.valves, [150, 150, 150], 'the tanker has exactly three intact fuel valves');
  equal(convoy.boardingLeftSec, 0, 'the roof lamps remain off before the valves break');
  ok(Math.abs(duel.state.opponents[0].speedMph * 1.609344 - 55) < .01,
    'the intact rig follows its fixed loop at 55 km/h');
});

test('Convoy rejects other venues, a disabled switch and undiscovered careers', () => {
  equal(admitted({venueId: 'scrapdome'}).started, false, 'Convoy cannot run on the Scrapdome');
  equal(admitted({venueId: 'pit'}).started, false, 'Convoy cannot run in the Pit');
  equal(admitted({enabled: false}).started, false, 'Convoy rejects a disabled feature switch');
  equal(admitted({discovered: false}).started, false, 'Convoy rejects an undiscovered career');
});

test('identical native entry seeds and inputs keep the convoy repeatable', () => {
  function run() {
    const duel = fight();
    for (let n = 0; n < 120; n++) {
      duel.setInput({throttle: 1, steer: .1, brake: 0, boost: false}); duel.step(1 / 120);
    }
    return {arena: structuredClone(duel.state.arena),
      rig: duel.state.opponents.map(actor => [actor.s, actor.lateral, actor.speedMph, actor.armor])};
  }
  equal(run(), run(), 'a fixed seed and fixed inputs produce the same rig, escort and valve state');
});

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
import {stepConvoyRaid, CONVOY_RULES} from '../src/arena/modes/convoy-raid.js';
import {startBoarding} from '../src/crew-gear/boarding.js';
import {gearContact} from '../src/crew-gear/contacts.js';
import {carBodyPoint} from '../src/arsenal/hazards.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {fireWeapon} from '../src/combat-weapons.js';
import {stepArenaPickups} from '../src/arena/arena-pickups.js';
import {cpuPickupCharges} from '../src/combat-pickups.js';
import {placeActor} from '../src/arena/arena-event.js';
import {convoyValvePoints} from '../src/arena/convoy.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {PLAYERS_KEY} from '../src/progression.js';
import {thinkBrain} from '../src/arena/arena-brains.js';
import {CONVOY_BODY} from '../src/arena/modes/convoy-raid.js';
import {startRocketVolley, ROCKET_RULES} from '../src/arsenal/rockets.js';
import {launchHarpoon} from '../src/arsenal/harpoon.js';
import {carEffect, carAlongPush, stepCarEffects} from '../src/arsenal/car-effects.js';
import {point} from '../src/combat-weapons.js';
import {sweepObstacle} from '../src/collision.js';
import {launchMortar, stepMortars, MORTAR_RULES} from '../src/arsenal/mortar.js';

// ARENA-07: native rules and the pure settlement contract settled on 4 October.
const DT = 1 / 120;
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
test.after(() => console.log(`Convoy Raid: ${checks} acceptance checks executed.`));
const FIELD = [{car: 'stuttgart_959s'}, {car: 'dusthawk_rally'}, {car: 'aurora_gt'}];

function admitted({venueId = 'salt-flats', discovered = true, enabled = true, difficulty = 'medium', seed = 307} = {}) {
  const flags = createFeatureFlags({storage: null, qa: true,
    overrides: {'convoy-raid': enabled, 'salt-flats': true, 'crew-gear': true}});
  const duel = new Duel({seed, featureFlags: flags});
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

function exposedFight(options) {
  const duel = fight(options), rig = duel.state.opponents[0];
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

test('native Convoy admission is independently default-off, explicit-off and explicit-on', () => {
  const outcomes = [];
  for (const request of [null, false, true]) {
    const flags = createFeatureFlags({storage: null, qa: request !== null,
      overrides: {'salt-flats': true, ...(request === null ? {} : {'convoy-raid': request})}});
    const duel = new Duel({seed: 307, featureFlags: flags});
    duel.state.wastelandGateDiscovered = true;
    outcomes.push(duel.startArenaEvent({venueId: 'salt-flats', mode: 'convoy-raid', opponents: FIELD}));
  }
  equal(outcomes, [false, false, true], 'native Convoy entry requires its own explicit request, not released Salt access');
});

test('an actual native Crossbow sweep routes its real impact to the nearest valve, not rig armor', () => {
  const f = exposedFight(), {duel, rig} = f, at = duel.course.groundAt(rig.s, rig.lateral);
  const pose = duel.course.nearest(at.x + Math.cos(at.heading) * 20,
    at.z - Math.sin(at.heading) * 20, rig.s);
  placeActor(duel, duel.state, pose); rig.speedMph = 0;
  const armor = rig.armor, hits = [];
  duel.onChange((_state, event) => {if (event.combatHit && event.victim === 'rival') hits.push(event);});
  equal(duel.fireWeapon('crossbow'), true, 'the real player producer launches its native Crossbow');
  const shot = duel.state.combat.projectiles.find(p => p.kind === 'crossbow' && !p.enemy);
  ok(shot, 'a real native bolt exists before the sweep');
  const start = {x: shot.x, y: shot.y, z: shot.z}, radius = duel._vehicleSpec(rig).halfWidth + COMBAT_TUNING.projectileRadiusPadding;
  const dx = start.x - at.x, dz = start.z - at.z;
  const a = shot.vx ** 2 + shot.vz ** 2, b = 2 * (dx * shot.vx + dz * shot.vz);
  const arrival = (-b - Math.sqrt(b * b - 4 * a * (dx * dx + dz * dz - radius ** 2))) / (2 * a);
  const impact = {x: start.x + shot.vx * arrival, y: start.y + shot.vy * arrival, z: start.z + shot.vz * arrival};
  ok(Number.isFinite(arrival) && arrival > 0, 'the actual bolt ray crosses the native vehicle sweep envelope');
  for (let n = 0; n < 240 && !hits.length; n++) stepProjectiles(duel, DT);
  equal(hits.length, 1, 'native stepProjectiles produces one actual body hit');
  const gaps = convoyValvePoints(duel, rig).map(p => Math.hypot(p.x - impact.x, p.y - impact.y, p.z - impact.z));
  const nearest = gaps.indexOf(Math.min(...gaps));
  equal(duel.state.arena.convoy.valves.filter(hp => hp < 150).length, 1,
    'the actual native projectile consumer damages exactly one fuel valve');
  ok(duel.state.arena.convoy.valves[nearest] < 150, 'the damaged valve is nearest the actual swept impact');
  equal(rig.armor, armor, 'real projectile damage leaves the invulnerable tanker body unchanged');
  equal(rig.combatWrecking, false, 'a native bolt cannot cause an ordinary rig kill');
  ok(Math.hypot(hits[0].hitPosition.x - impact.x, hits[0].hitPosition.y - impact.y,
    hits[0].hitPosition.z - impact.z) < 1e-5, 'the native hit event retains the first swept intersection');
  const lateral = rig.lateral, push = rig.pushVelocity;
  ok(Math.abs(push) > 0, 'the actual native body impact supplies a side shove');
  duel.step(DT);
  const recovery = (CONVOY_RULES.loopOffset - lateral) * (1 - Math.exp(-DT));
  ok(Math.abs(rig.lateral - lateral - recovery - push * DT) < 1e-9,
    'the next native rig tick moves the body by its actual hit shove');
  ok(Math.abs(rig.pushVelocity) < Math.abs(push), 'the native rig tick damps its body-hit shove');
});

test('a native solver side ram within three metres damages a valve but only shoves the rig body', () => {
  const f = exposedFight(), {duel, rig} = f, state = duel.state;
  const s = rig.s - .7320454717;
  placeActor(duel, state, {s, lateral: rig.lateral + 2, headingError: -Math.PI / 2}, 80);
  state.prevLateral = rig.lateral + 10; rig.speedMph = 0;
  const armor = rig.armor, before = {s: rig.s, lateral: rig.lateral}, events = [];
  duel.onChange((_state, event) => {if (event.combatRamHit && event.attacker === 'player') events.push(event);});
  equal(duel._vehicleContact(state, rig, 'convoy native ram'), true, 'the actual swept car solver detects the side impact');
  equal(events.length, 1, 'the real solver emits one credited ram incident');
  const contact = events[0].hitPosition;
  ok(Math.min(...convoyValvePoints(duel, rig).map(p => Math.hypot(p.x - contact.x,
    p.y - contact.y, p.z - contact.z))) <= 3, 'the real native ram contact is within the settled valve reach');
  ok(rig.s !== before.s || rig.lateral !== before.lateral || Math.abs(rig.pushVelocity || 0) > 0,
    'the real rigid-body response still shoves the tanker');
  equal(rig.armor, armor, 'the solver ram cannot drain rigid tanker body armor');
  equal(rig.combatWrecking, false, 'the solver ram cannot wreck the tanker as an ordinary car');
  equal(duel.state.arena.convoy.valves.filter(hp => hp < 150).length, 1,
    'the native ram consumer forwards its contact to exactly one nearby valve');
});

function collectedDefenses(f, actor) {
  const {duel} = f, pose = {s: actor.s, lateral: actor.lateral, headingError: actor.headingError}, speed = actor.speedMph;
  stepArenaPickups(duel, 3);
  for (const weapon of ['star', 'ufo']) {
    const crate = duel.state.combat.pickups.find(p => p.weapon === weapon);
    ok(crate, `the actual seeded arena field contains ${weapon}`);
    placeActor(duel, actor, crate); stepArenaPickups(duel, DT);
    equal(cpuPickupCharges(duel.state, duel.state.combat, actor)[weapon], 1,
      `the native pickup caller actually gives this actor one ${weapon}, not a fake inventory`);
  }
  placeActor(duel, actor, pose, speed);
  actor.weaponLoadout = ['bomb', 'crossbow', 'star', 'ufo'];
}
for (const phase of ['whole event', 'pending fuse']) test(`the rig has no native offense, Star or UFO during the ${phase}`, () => {
  const f = exposedFight({seed: 310}); collectedDefenses(f, f.rig);
  if (phase === 'pending fuse') {
    moduleWindow(f); roofCrossing(f); stepFootTransition(f.duel, DT);
    f.duel.state.fighterInput.fire = true;
    for (let n = 0; n < 120; n++) stepFootTransition(f.duel, DT);
    equal(f.duel.state.boarding?.phase, 'charge', 'a real roof hold creates the pending fuse');
  }
  const {s, lateral} = f.rig, armor = f.rig.armor;
  const actions = ['bomb', 'star', 'ufo'].map(id => fireWeapon(f.duel, id, true, f.rig));
  equal(actions, [false, false, false], 'the native rig weapon producer refuses offense, shield and relocation throughout Convoy');
  equal({s: f.rig.s, lateral: f.rig.lateral}, {s, lateral}, 'the UFO attempt cannot move the fixed-loop rig');
  equal(f.rig.armor, armor, 'weapon attempts do not change tanker body armor');
  equal(f.duel.state.combat.rivalShield, 0, 'the rig never raises a Star shield');
});

test('the native escort responds to a real valve attack and retains car weapons, Star and collected UFO', () => {
  const f = exposedFight({seed: 310}), escort = f.duel.state.opponents[1];
  collectedDefenses(f, escort);
  const at = f.duel.course.groundAt(escort.s, escort.lateral), pose = f.duel.course.nearest(
    at.x + Math.sin(at.heading) * 30, at.z + Math.cos(at.heading) * 30, escort.s);
  placeActor(f.duel, f.duel.state, pose);
  damageConvoyValves(f.duel, f.rig, 1, 'crossbow', {owner: 'player', hitPosition: convoyValvePoints(f.duel, f.rig)[0]});
  const participant = f.duel.state.arena.participants.find(p => p.id === escort.arenaId);
  thinkBrain(f.duel, participant, escort, DT);
  equal(participant.targetId, 'player', 'the actual guard brain responds to the real player valve attack');
  equal(fireWeapon(f.duel, 'crossbow', true, escort), true, 'the reacting native escort retains its actual Crossbow offense');
  equal(['bomb', 'star', 'ufo'].map(id => fireWeapon(f.duel, id, true, escort)),
    [true, true, true], 'rig-only suppression leaves the ordinary native escort actions working');
});

test('a legal planted charge cannot finish early and its due record is still present at the central hit', () => {
  const f = exposedFight(); moduleWindow(f); roofCrossing(f); stepFootTransition(f.duel, DT);
  f.duel.state.fighterInput.fire = true;
  for (let n = 0; n < 120; n++) stepFootTransition(f.duel, DT);
  equal(f.duel.state.boarding?.phase, 'charge', 'the native one-second hold creates one actual pending charge');
  const armor = f.rig.armor;
  equal(applyArmorDamage(f.duel, f.rig, 'fixed', {owner: 'player', amount: 35, convoyCharge: true}), 0,
    'a premature central charge request cannot bypass the actual two-second fuse');
  equal(f.rig.armor, armor, 'an early charge request cannot drain invulnerable rig body armor');
  equal(f.duel.state.arena.convoy.finished, false, 'an early charge request does not finish the mode');
  for (let n = 0; n < 240; n++) stepFootTransition(f.duel, DT);
  equal(f.duel.state.arena.convoy.finished, true, 'the due native fuse completes before boarding is cleared');
  equal(f.duel.state.boarding, null, 'only the completed native charge clears the pending boarding record');
});

function memoryAppConvoy(run) {
  const previousStorage = globalThis.localStorage, previousCancel = globalThis.cancelAnimationFrame;
  const values = new Map(), storage = {fail: false, writes: 0,
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      if (key === PLAYERS_KEY) {
        this.writes++;
        if (this.fail) throw Error('Convoy synthetic registry write failure');
      }
      values.set(key, String(value));
    }, removeItem: key => values.delete(key)};
  globalThis.localStorage = storage; globalThis.cancelAnimationFrame = () => {};
  const app = new App();
  try {
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: true,
      overrides: {'convoy-raid': true, 'salt-flats': true, 'hidden-road': true, 'crew-gear': true}});
    app.audio.unlock = () => {}; app.cpuDifficulty = 'medium';
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
      discoveredGate: true, xp: 1_000_000, scrap: 23,
      territories: {...app.profile.wasteland.territories, tollkeeper: {hold: 10}, kettle: {hold: 50}}}};
    equal(app._saveProfile(), true, 'the starting real App owner is saved only in memory');
    equal(app.visitWasteland(), true, 'the actual App visits its discovered yard'); app.advance(8);
    // This production owner/run path bypasses only the held public mode allow-list.
    equal(app._startArenaFight({venueId: 'salt-flats', mode: 'convoy-raid', opponents: 3}), true,
      'the production App fight initializer creates a real Convoy run for its starting owner');
    app.duel.state.countdown = 0; app.duel.step(DT); app.duel.step(DT);
    const rig = app.duel.state.opponents[0];
    moduleWindow({duel: app.duel, rig, at: app.duel.course.groundAt(rig.s, rig.lateral)});
    return run({app, storage, values});
  } finally {
    app.dispose?.(); globalThis.localStorage = previousStorage; globalThis.cancelAnimationFrame = previousCancel;
  }
}
function timeoutAppConvoy(app) {
  stepConvoyRaid(app.duel, 300 - app.duel.state.arena.clockSec);
  app.duel.step(DT);
  equal(app.duel.state.status, 'arena_result', 'the real event clock emits an actual native timeout result');
  equal(app.duel.state.arena.result.reason, 'time', 'App settlement uses the genuine Convoy timeout, not a synthetic result');
  return app.duel.state.arena.result;
}
test('the real App durably pays its native Convoy loss once to the starting owner', () => memoryAppConvoy(({app, storage, values}) => {
  const before = structuredClone(app.profile), ownerId = app.player.id;
  const result = timeoutAppConvoy(app);
  equal(result.settlementSaved, true, 'the real App exposes a saved native Convoy settlement');
  equal(result.scrapEarned, 144, 'three actually broken valves pay forty times Medium on a native loss');
  const paid = values.get(PLAYERS_KEY), registry = JSON.parse(paid);
  const owner = registry.players.find(player => player.id === ownerId);
  equal(owner.profile.wasteland.scrap, before.wasteland.scrap + 144, 'the durable memory registry pays the actual starting owner');
  equal(owner.profile.wasteland.territories.tollkeeper.hold, 10, 'a genuine loss adds no Tollkeeper hold');
  equal(owner.profile.credits, before.credits, 'the native Convoy loss does not change ordinary credits');
  const writes = storage.writes;
  equal(app._settleArenaResult({result}, app.duel.state), false, 'replaying the same actual App result cannot award again');
  equal(app.retryArenaSettlement(), false, 'a saved actual Convoy result cannot be retried for extra pay');
  equal(values.get(PLAYERS_KEY), paid, 'duplicates preserve every durable paid registry byte');
  equal(storage.writes, writes, 'duplicates make no additional registry write');
}));
test('an actual failed App Convoy result write retains one retry and banks no early pay', () => memoryAppConvoy(({app, storage, values}) => {
  const durable = values.get(PLAYERS_KEY), before = structuredClone(app.profile);
  storage.fail = true;
  const result = timeoutAppConvoy(app); storage.fail = false;
  equal(values.get(PLAYERS_KEY), durable, 'the actual failed settlement leaves durable owner bytes unchanged');
  equal(app.profile.wasteland.scrap, before.wasteland.scrap, 'failed native settlement exposes no early scrap');
  equal(result.settlementSaved, false, 'the actual failed result cannot claim a successful save');
  equal(result.settlementRetryable, true, 'the same actual Convoy completion retains a public Retry');
  equal(result.hold, 10, 'a failed Convoy write still displays Tollkeeper hold, not Kettle hold');
  equal(app.retryArenaSettlement(), true, 'public Retry durably saves that genuine completed Convoy event');
  equal(app.profile.wasteland.scrap, before.wasteland.scrap + 144, 'retry pays the native loss exactly once');
  const paid = values.get(PLAYERS_KEY), writes = storage.writes;
  equal(app.retryArenaSettlement(), false, 'a second public Retry cannot pay the event again');
  equal(values.get(PLAYERS_KEY), paid, 'repeat Retry keeps the exact durable paid bytes');
  equal(storage.writes, writes, 'repeat Retry does not write again');
}));

test('adopting an already paid native Convoy result displays Tollkeeper hold without another write', () => memoryAppConvoy(({app, storage, values}) => {
  const result = timeoutAppConvoy(app), paid = values.get(PLAYERS_KEY), writes = storage.writes;
  Object.assign(result, {settlementSaved: false, settlementRetryable: false});
  equal(app._settleArenaResult({result}, app.duel.state), false, 'a durable existing payment cannot award again');
  equal(result.settlementSaved, true, 'the existing durable payment is adopted');
  equal(result.hold, 10, 'adopting Convoy displays Tollkeeper hold rather than the different Kettle hold');
  equal(values.get(PLAYERS_KEY), paid, 'adoption preserves the exact paid registry bytes');
  equal(storage.writes, writes, 'adoption needs no additional registry write');
}));

test('the real App durably pays a native charge win and Tollkeeper hold once', () => memoryAppConvoy(({app, values}) => {
  const before = structuredClone(app.profile), rig = app.duel.state.opponents[0];
  roofCrossing({duel: app.duel, rig});
  stepFootTransition(app.duel, DT); app.duel.state.fighterInput.fire = true;
  for(let n=0;n<360;n++)stepFootTransition(app.duel, DT);
  app.duel.step(DT);
  const result = app.duel.state.arena.result;
  equal(result?.reason, 'charge', 'a real roof hold and full fuse create the native win');
  equal(result.settlementSaved, true, 'the actual App saves the completed charge result');
  equal(result.scrapEarned, 840, 'the native Medium win pays 840');
  const saved = values.get(PLAYERS_KEY), owner = JSON.parse(saved).players.find(p=>p.id===app.player.id);
  equal(owner.profile.wasteland.scrap, before.wasteland.scrap + 840, 'the starting owner receives the saved payout');
  equal(owner.profile.wasteland.territories.tollkeeper.hold, 35, 'the native win adds 25 Tollkeeper hold');
  equal(owner.profile.credits, before.credits, 'ordinary credits stay unchanged');
  equal(app._settleArenaResult({result}, app.duel.state), false, 'the completed win cannot pay twice');
  equal(values.get(PLAYERS_KEY), saved, 'a repeated win event leaves saved bytes unchanged');
}));

test('native Odessa turret reports its swept body contact, with unchanged nearest-target damage and cadence', () => {
  const duel = new Duel({seed: 1989, featureFlags: createFeatureFlags({storage: null, qa: true,
    overrides: {arsenal: true, 'crew-gear': true}})});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', crewId: 'odessa',
    discoveredGate: true, arsenalRank: 30, seed: 1989, opponentCount: 2, cpuDifficulty: 'easy'});
  const state = duel.state;
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
  const place = (actor, s, lateral = 0) => Object.assign(actor, {s, prevS: s,
    lateral, prevLateral: lateral, speedMph: 0, headingError: 0, yawVelocity: 0,
    pushVelocity: 0, impactTimer: 0, combatShield: 0, airHeight: 0,
    prevAirHeight: 0, contactCooldown: 0});
  place(state, 500);
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  state.opponents.forEach((actor, n) => place(actor, 650 + n * 30));
  duel.setInput({interact: true}); advance(duel, .4);
  equal(state.onFoot, true, 'the real exit hold creates Odessa on foot');
  equal(state.fighter.crewId, 'odessa', 'native exit retains the selected crew');
  duel.setInput({interact: false}); duel.step(DT);
  equal(duel.selectFootGear(3), true, 'native slot three selects Odessa signature gear');
  equal(state.footWeapons.selected, 'scrap-turret', 'native slot three selects the actual turret');
  const poses = state.opponents.map((actor, n) => {
    const f = state.fighter, metres = n === 0 ? 20 : 30;
    const at = duel.course.nearest(f.x + Math.sin(f.yaw) * metres,
      f.z + Math.cos(f.yaw) * metres, f.s);
    place(actor, at.s, at.lateral);
    return {actor, s: at.s, lateral: at.lateral, armor: actor.armor};
  });
  const shots = [];
  const stop = duel.onChange((_state, event) => {
    if (!event.footGearHit || !event.combatHit) return;
    const turret = state.crewGear.turret, aim = carBodyPoint(duel, poses[0].actor);
    const contact = gearContact(duel, {x: turret.x, y: turret.y + .85, z: turret.z}, aim, state);
    shots.push({time: state.stageTimeSec, hit: structuredClone(event.hitPosition),
      point: contact?.point, actor: contact?.actor, aim});
  });
  try {
    duel.setFighterInput({fire: true}); duel.step(DT);
    const deployedAt = state.stageTimeSec;
    ok(state.crewGear.turret, 'native signature fire deploys the real ground turret');
    equal(shots.length, 0, 'deployment itself does not manufacture a hit');
    duel.setFighterInput({fire: false});
    const hold = ticks => {
      for (let n = 0; n < ticks; n++) {
        for (const pose of poses) place(pose.actor, pose.s, pose.lateral);
        duel.step(DT);
      }
    };
    hold(Math.round(.8 / DT) - 1);
    equal(shots.length, 0, 'the turret cannot fire before its first 0.8-second interval');
    hold(1);
    equal(shots.length, 1, 'the first native interval produces exactly one real hit');
    equal(poses[0].armor - poses[0].actor.armor, 4, 'the nearest native car loses exactly four armor');
    equal(poses[1].actor.armor, poses[1].armor, 'the farther native car remains untouched');
    ok(Math.abs(shots[0].time - deployedAt - .8) < DT + 1e-6, 'the first native shot arrives after 0.8 seconds');
    hold(Math.round(.8 / DT));
    equal(shots.length, 2, 'the second interval produces exactly one more hit');
    equal(poses[0].armor - poses[0].actor.armor, 8, 'the second native shot removes another four armor');
    equal(poses[1].actor.armor, poses[1].armor, 'the farther car is still untouched after two shots');
    ok(Math.abs(shots[1].time - shots[0].time - .8) < 1e-6, 'the second real shot follows exactly 0.8 seconds later');
    equal(shots[0].actor, poses[0].actor, 'the real swept ray first contacts the nearest car');
    ok(shots[0].point, 'native collision supplies an actual body surface intersection');
    ok(Math.hypot(shots[0].point.x - shots[0].aim.x, shots[0].point.y - shots[0].aim.y,
      shots[0].point.z - shots[0].aim.z) > .5, 'the actual intersection is demonstrably not the aimed body centre');
    ok(Math.hypot(shots[0].hit.x - shots[0].point.x, shots[0].hit.y - shots[0].point.y,
      shots[0].hit.z - shots[0].point.z) < 1e-6,
    'native turret footGearHit/combatHit must report the actual swept contact, not the aimed body centre');
  } finally {stop();}
});

function ordinaryProjectileFight() {
  const duel = new Duel({seed: 307, featureFlags: createFeatureFlags({storage: null, qa: true})});
  duel.state.wastelandGateDiscovered = true;
  equal(duel.startArenaEvent({venueId: 'salt-flats', mode: 'last-car-rolling',
    car: 'falcone_f42', opponents: [{car: 'dusthawk_rally'}]}), true,
  'the ordinary-car control enters the released native Salt fight');
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  duel.state.invulnerableSec = duel.state.combat.shield = duel.state.combat.rivalShield = 0;
  duel.state.combat.aiTimer = Infinity;
  const car = duel.state.opponents[0], at = duel.course.groundAt(car.s, car.lateral);
  placeActor(duel, car, {s: car.s, lateral: car.lateral}, 0);
  car.pushVelocity = 0; car.combatShield = 0;
  placeActor(duel, duel.state, duel.course.nearest(at.x - Math.cos(at.heading) * 20,
    at.z + Math.sin(at.heading) * 20, car.s), 0);
  return {duel, car};
}
function nativeRocketAt(duel, target) {
  const at = point(duel, duel.state);
  duel.state.headingError = Math.atan2(target.x - at.x, target.z - at.z) - at.heading -
    ROCKET_RULES.bearings[0] * Math.PI / 180;
  const volley = startRocketVolley(duel, duel.state);
  ok(volley, 'the actual native player Rocket Pods producer creates a volley');
  const shot = duel.state.combat.projectiles.find(p => p.id === volley.shotIds[0]);
  ok(shot, 'the tested rocket is the real first native volley shot');
  return shot;
}
function resolveNativeProduct(duel, shot) {
  const events = [], stop = duel.onChange((_state, event) => events.push(event));
  try {
    for (let n = 0; n < 240 && duel.state.combat.projectiles.includes(shot); n++) stepProjectiles(duel, DT);
    ok(!duel.state.combat.projectiles.includes(shot), 'the native projectile path consumes the actual product once');
    return events;
  } finally {stop();}
}
function requireNativeTankerSpec(f) {
  const spec = f.duel._vehicleSpec(f.rig);
  equal({mass: spec.mass, halfWidth: spec.halfWidth, halfLength: spec.halfLength, height: spec.height},
    CONVOY_BODY, 'geometry witnesses require the real native tanker spec, never an overridden Stuttgart box');
  f.rig.speedMph = 0;
  f.duel.state.opponents.slice(1).forEach((car, i) => placeActor(f.duel, car,
    {s: f.rig.s - 100 - i * 40, lateral: f.rig.lateral}, 0));
}
function placeBesideValve(f, index = 0, distance = 20) {
  const valve = convoyValvePoints(f.duel, f.rig)[index];
  const at = f.duel.course.groundAt(f.rig.s, f.rig.lateral);
  placeActor(f.duel, f.duel.state, f.duel.course.nearest(valve.x + Math.cos(at.heading) * distance,
    valve.z - Math.sin(at.heading) * distance, f.rig.s), 0);
  return valve;
}
function measuredRocketBodyContact(duel, shot, car) {
  const ground = duel.course.groundAt(car.s, car.lateral), spec = duel._vehicleSpec(car);
  const from = {x: shot.x, y: shot.y, z: shot.z};
  const to = {x: shot.x + shot.vx, y: shot.y + shot.vy, z: shot.z + shot.vz};
  const hit = sweepObstacle(from, to, {...ground, y: ground.y + (car.airHeight || 0),
    halfX: spec.halfWidth, halfZ: spec.halfLength, height: spec.height, shape: 'box'},
  0, {halfWidth: .08, halfLength: .08, height: .16});
  ok(hit, 'the unmodified native rocket ray crosses the actual actor body');
  return {x: from.x + (to.x - from.x) * hit.t, y: from.y + (to.y - from.y) * hit.t,
    z: from.z + (to.z - from.z) * hit.t};
}

test('geometry transfer: ordinary car native Rocket Pods still removes ten armor once', () => {
  const {duel, car} = ordinaryProjectileFight(), armor = car.armor;
  const shot = nativeRocketAt(duel, point(duel, car)), events = resolveNativeProduct(duel, shot);
  equal(car.armor, armor - 10, 'ordinary-car Rocket Pods damage remains exactly ten armor');
  equal(events.filter(e => e.arsenalCue === 'weapon.rockets.hit').length, 1, 'one real rocket emits one ordinary blast');
  stepProjectiles(duel, DT);
  equal(car.armor, armor - 10, 'retired ordinary rocket cannot apply damage twice');
});

test('geometry transfer: ordinary car native Harpoon keeps six armor, sideways yank and three-second tether', () => {
  const {duel, car} = ordinaryProjectileFight(), armor = car.armor;
  const shot = launchHarpoon(duel, duel.state, false, 0);
  ok(shot, 'the real ordinary player Harpoon producer launches');
  const events = resolveNativeProduct(duel, shot), effect = carEffect(car, 'tether');
  equal(car.armor, armor - 6, 'ordinary Harpoon damage remains six armor');
  ok(Math.abs(Math.hypot(car.pushVelocity, carAlongPush(car)) - 6) < 1e-6,
    'the native ordinary target receives its unchanged six-metres-per-second sideways yank');
  equal(effect?.remainingSec, 3, 'the actual ordinary hit installs the unchanged three-second tether');
  equal(effect?.topSpeed, .8, 'the actual tether retains its 80-percent speed ceiling');
  equal(events.filter(e => e.arsenalCue === 'weapon.harpoon.hit').length, 1, 'one real Harpoon emits one ordinary hit');
  stepProjectiles(duel, DT); equal(car.armor, armor - 6, 'consumed ordinary Harpoon cannot hit twice');
  stepCarEffects(car, 3 - DT); ok(carEffect(car, 'tether'), 'native effect aging preserves the tether before its deadline');
  stepCarEffects(car, DT); equal(carEffect(car, 'tether'), null, 'native effect aging removes the tether at three seconds');
});

test('geometry transfer: native rig size is the prerequisite for real tanker projectile witnesses', () => {
  requireNativeTankerSpec(exposedFight());
});

test('geometry transfer: native Harpoon routes its measured impact to the nearest actual valve', () => {
  const f = exposedFight(); requireNativeTankerSpec(f); placeBesideValve(f);
  const shot = launchHarpoon(f.duel, f.duel.state, false, 0), armor = f.rig.armor;
  ok(shot && shot.targetId === f.rig.arenaId, 'the actual Harpoon acquires the real native tanker participant');
  const at = point(f.duel, f.rig), radius = f.duel._vehicleSpec(f.rig).halfWidth + COMBAT_TUNING.projectileRadiusPadding;
  const dx = shot.x - at.x, dz = shot.z - at.z, speedSquared = shot.vx ** 2 + shot.vz ** 2;
  const b = 2 * (dx * shot.vx + dz * shot.vz);
  const arrival = (-b - Math.sqrt(b * b - 4 * speedSquared * (dx * dx + dz * dz - radius ** 2))) / (2 * speedSquared);
  ok(Number.isFinite(arrival) && arrival > 0, 'the real Harpoon crosses the native stationary vehicle contact envelope');
  const expected = {x: shot.x + shot.vx * arrival, y: shot.y + shot.vy * arrival, z: shot.z + shot.vz * arrival};
  const events = resolveNativeProduct(f.duel, shot);
  const hit = events.find(e => e.arsenalCue === 'weapon.harpoon.hit' && e.projectile === shot)?.hitPosition;
  ok(hit && Math.hypot(hit.x - f.at.x, hit.z - f.at.z) > .5,
    'native Harpoon reports a measured surface impact rather than the aimed rig centre');
  ok(Math.hypot(hit.x - expected.x, hit.y - expected.y, hit.z - expected.z) < 1e-5,
    'native Harpoon retains the actual first swept contact, not an arbitrary off-centre point');
  const distances = convoyValvePoints(f.duel, f.rig).map(p => Math.hypot(p.x - hit.x, p.y - hit.y, p.z - hit.z));
  const nearest = distances.indexOf(Math.min(...distances));
  equal(f.duel.state.arena.convoy.valves, [150, 150, 150].map((hp, i) => i === nearest ? hp - 6 : hp),
    'the six native Harpoon damage reaches only the valve nearest its actual impact');
  equal(f.rig.armor, armor, 'Harpoon cannot drain the rigid tanker body');
  equal(f.rig.combatWrecking, false, 'the actual Harpoon cannot cause an ordinary tanker wreck');
});

test('geometry transfer: native Rocket Pods forwards its real blast point and radius to every reached valve', () => {
  const f = exposedFight(); requireNativeTankerSpec(f); const valve = placeBesideValve(f);
  const shot = nativeRocketAt(f.duel, valve), expected = measuredRocketBodyContact(f.duel, shot, f.rig);
  const distances = convoyValvePoints(f.duel, f.rig).map(p => Math.hypot(p.x - expected.x, p.y - expected.y, p.z - expected.z));
  ok(distances.some(d => d <= ROCKET_RULES.blastRadius), 'the real first-contact blast physically reaches an authored valve');
  const armor = f.rig.armor, events = resolveNativeProduct(f.duel, shot);
  const impact = events.find(e => e.arsenalCue === 'weapon.rockets.hit' && e.projectile === shot)?.hitPosition;
  ok(impact && Math.hypot(impact.x - expected.x, impact.y - expected.y, impact.z - expected.z) < 1e-5,
    'the actual Rocket Pods blast retains its independently measured first swept body contact');
  equal(f.duel.state.arena.convoy.valves, distances.map(d => d <= ROCKET_RULES.blastRadius ? 140 : 150),
    'the native two-metre blast damages every reached valve by ten, with no centre substitution');
  equal(f.rig.armor, armor, 'the actual rocket blast leaves rigid body armor unchanged');
});

test('a native Harpoon body yank moves and damps both rig push components on its next tick', () => {
  const f = exposedFight(); requireNativeTankerSpec(f); placeBesideValve(f); f.rig.headingError = Math.PI / 4;
  const shot = launchHarpoon(f.duel, f.duel.state, false, 0);
  ok(shot?.targetId === f.rig.arenaId, 'the real Harpoon targets the tanker');
  resolveNativeProduct(f.duel, shot);
  const {s, lateral, pushVelocity} = f.rig, along = carAlongPush(f.rig);
  ok(Math.abs(pushVelocity) > 0 && Math.abs(along) > 0, 'the actual sideways yank has both road components');
  const nextLateral = lateral + (CONVOY_RULES.loopOffset - lateral) * (1 - Math.exp(-DT)) + pushVelocity * DT;
  const expectedS = s + (CONVOY_RULES.cruiseKph / 3.6 + along) * DT /
    Math.max(.3, 1 - f.duel.course.at(s).curvature * nextLateral);
  f.duel.step(DT);
  ok(Math.abs(f.rig.s - expectedS) < 1e-9, 'the next native rig tick consumes its real forward yank');
  ok(Math.abs(f.rig.lateral - nextLateral) < 1e-9, 'the next native rig tick consumes its real lateral yank');
  ok(Math.abs(carAlongPush(f.rig)) < Math.abs(along), 'the native forward yank damps after moving');
});

test('geometry transfer: an ordinary-car Rocket blast reaches a valve with the tanker centre outside its radius', () => {
  const f = exposedFight(); requireNativeTankerSpec(f); const valve = placeBesideValve(f);
  const escort = f.duel.state.opponents[1], at = f.duel.course.groundAt(f.rig.s, f.rig.lateral);
  placeActor(f.duel, escort, f.duel.course.nearest(valve.x + Math.cos(at.heading) * .3,
    valve.z - Math.sin(at.heading) * .3, f.rig.s), 0);
  const shot = nativeRocketAt(f.duel, point(f.duel, escort));
  const impact = measuredRocketBodyContact(f.duel, shot, escort), armor = f.rig.armor, escortArmor = escort.armor;
  const centre = point(f.duel, f.rig), distances = convoyValvePoints(f.duel, f.rig)
    .map(p => Math.hypot(p.x - impact.x, p.y - impact.y, p.z - impact.z));
  ok(Math.hypot(centre.x - impact.x, centre.y - impact.y, centre.z - impact.z) > ROCKET_RULES.blastRadius,
    'the genuine primary-car blast is outside the tanker centre radius');
  ok(distances.some(d => d <= ROCKET_RULES.blastRadius), 'at least one real valve is still inside that actual blast');
  const events = resolveNativeProduct(f.duel, shot), hit = events.find(e => e.arsenalCue === 'weapon.rockets.hit')?.hitPosition;
  ok(hit && Math.hypot(hit.x - impact.x, hit.y - impact.y, hit.z - impact.z) < 1e-5,
    'the native first impact is the nearby ordinary car, not the tanker centre');
  equal(f.duel.state.arena.convoy.valves, distances.map(d => d <= ROCKET_RULES.blastRadius ? 140 : 150),
    'rig eligibility follows real valve distances even when its centre is outside the blast');
  equal(f.rig.armor, armor, 'nearby native splash cannot drain rigid tanker body armor');
  equal(escort.armor, escortArmor - 10, 'the primary ordinary escort still receives the established ten armor damage');
});

test('native Mortar landing damages only real valves in its blast radius without draining the rig body', () => {
  const f = exposedFight(); requireNativeTankerSpec(f);
  placeActor(f.duel, f.duel.state, {s:f.rig.s-30,lateral:f.rig.lateral}, 0);
  const shell = launchMortar(f.duel, f.duel.state, 0), armor = f.rig.armor;
  ok(shell && shell.targetId === f.rig.arenaId, 'the native Mortar producer targets the real tanker');
  const gaps = convoyValvePoints(f.duel, f.rig).map(p=>Math.hypot(p.x-shell.x,p.y-shell.y,p.z-shell.z));
  const amount = MORTAR_RULES.damage * (1-Math.min(...gaps)/shell.radius);
  ok(amount>0, 'the native landing genuinely reaches at least one valve');
  stepMortars(f.duel, MORTAR_RULES.flightSec-DT);
  equal(f.duel.state.arena.convoy.valves, [150,150,150], 'the warning causes no early damage');
  stepMortars(f.duel, DT);
  const expected = gaps.map(gap=>gap<=shell.radius?150-amount:150);
  equal(f.duel.state.arena.convoy.valves, expected, 'only valves inside the actual landing radius lose native blast damage');
  equal(f.rig.armor, armor, 'the Mortar cannot drain the tanker body');
  equal(f.rig.airborne, false, 'a Mortar cannot hop the fixed-loop twelve-tonne rig');
  stepMortars(f.duel, DT);
  equal(f.duel.state.arena.convoy.valves, expected, 'the consumed shell cannot hit twice');
});

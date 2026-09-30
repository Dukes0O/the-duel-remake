import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {COURSE} from '../src/config.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {arenaCarSpec} from '../src/arena/arena-pilot.js';
import {arenaFloorSpeed} from '../src/arena/venues.js';
import {arenaReward, settleArenaResult} from '../src/arena/arena-settlement.js';
import {beginWarlordEvent, startWarlordEvent} from '../src/arena/warlord-event.js';
import {arenaHud, arenaBoardMarkup, arenaYardPanel} from '../src/screen-arena.js';
import {loadPlayers} from '../src/progression.js';

// ARENA-03: SCRAPDOME 10 Fuel Run, shared 3/6, SPEC 0.12.
// All saves are fabricated in memory. Race rules run through the actual engine.
const DT = 1 / 120;
const ON = {wasteland2: true, 'hidden-road': true, scrapdome: true,
  warlords: true, 'fuel-run': true};
const FIELD = [{car: 'dusthawk_rally', brain: 'collector'},
  {car: 'aurora_gt', brain: 'rammer'}, {car: 'stuttgart_959s', brain: 'hunter'}];
const values = new Map();
let failWrites = false, writes = 0, checks = 0;
globalThis.localStorage = {
  get length() { return values.size; }, key: n => [...values.keys()][n] ?? null,
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => {
    if (failWrites) throw Error('synthetic Fuel Run save failure');
    writes++; values.set(String(key), String(value));
  },
  removeItem: key => values.delete(String(key)), clear: () => values.clear(),
};
globalThis.cancelAnimationFrame = () => {};
const equal = (a, b, message) => { checks++; assert.deepEqual(a, b, message); };
const ok = (condition, message) => { checks++; assert.ok(condition, message); };
const near = (a, b, message, tolerance = 1e-8) => ok(Math.abs(a - b) <= tolerance,
  `${message}: expected ${b}, received ${a}`);
const tick = (duel, count = 1) => { for (let n = 0; n < count; n++) duel.step(DT); };
const member = (duel, id = 'player') => duel.state.arena.participants.find(p => p.id === id);
const actor = (duel, id = 'player') => id === 'player' ? duel.state :
  duel.state.opponents.find(a => a.arenaId === id);
const fuel = duel => {
  ok(duel.state.arena?.fuelRun, 'Fuel Run exposes canisters, refill pads and depots in arena.fuelRun');
  return duel.state.arena.fuelRun;
};
function start({flags = ON, opponents = FIELD, seed = 1989, difficulty = 'medium'} = {}) {
  const duel = new Duel({seed, featureFlags: flags});
  equal(duel.startArenaEvent({mode: 'fuel-run', car: 'falcone_f42', seed,
    cpuDifficulty: difficulty, playerId: 'fuel-driver', opponents}), true,
  'the real Duel entry starts Fuel Run with its switch enabled');
  duel.state.countdown = 0; tick(duel, 2);
  equal(duel.state.status, 'racing', 'Fuel Run reaches the actual fight step');
  fuel(duel);
  return duel;
}
// Controlled poses select interactions; the real step owns collection and scoring.
function place(duel, id, pose) {
  const car = actor(duel, id);
  Object.assign(car, {s: pose.s, prevS: pose.s, lateral: pose.lateral,
    prevLateral: pose.lateral, speedMph: 0, headingError: 0, yawVelocity: 0,
    pushVelocity: 0, airborne: false, airHeight: 0, groundHeight: null});
  if (id === 'player') duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
}
function holdOthers(duel, except = 'player') {
  for (const p of duel.state.arena.participants) if (p.id !== except) {
    // Keep unrelated cars in a long wreck wait, without fabricating fuel state.
    Object.assign(actor(duel, p.id), {combatWrecking: true, combatWreckTimer: 100000});
    p.wreckCounted = true;
  }
}
function pick(duel, id = 'player', padIndex = 0) {
  const pad = fuel(duel).pads[padIndex];
  ok(pad.canisterId, 'the chosen pad has a real available canister');
  const canisterId = pad.canisterId;
  place(duel, id, pad); tick(duel);
  equal(member(duel, id).fuelCanisterId, canisterId, 'driving over fuel picks up that canister');
  equal(fuel(duel).canisters.find(c => c.id === canisterId)?.carriedBy, id,
    'the physical canister has the same owner as the scoreboard participant');
  return canisterId;
}
function deliver(duel, id = 'player') {
  const depot = fuel(duel).depots.find(d => d.participantId === id);
  ok(depot, 'every participant has a depot');
  place(duel, id, depot); tick(duel);
}
function point(duel, id = 'player', padIndex = 0) {
  if (!fuel(duel).pads[padIndex].canisterId) {
    const depot = fuel(duel).depots.find(d => d.participantId === id);
    for (let step = 0; step < 601; step++) {
      place(duel, id, depot); tick(duel);
    }
  }
  pick(duel, id, padIndex); deliver(duel, id);
}
function hit(duel, amount, id = 'player', owner = 'cpu-1') {
  const car = actor(duel, id);
  car.armor = car.maxArmor = 1000;
  duel.state.invulnerableSec = 0;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  const removed = applyArmorDamage(duel, car, 'crossbow',
    {owner, damageMultiplier: amount / COMBAT_TUNING.armor.crossbow});
  near(removed, amount, 'the real armor hit removes the controlled amount');
}
function yard({rank = 6, discovered = true, flags = ON, enter = true} = {}) {
  values.clear(); failWrites = false; writes = 0;
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: flags});
  app.audio.unlock = () => {};
  app.cpuDifficulty = 'medium';
  app.profile.wasteland.discoveredGate = discovered;
  // Rank 6 starts at 3500 XP; rank 5 at 2500 XP. Normalization derives rank.
  app.profile.wasteland.xp = rank === 6 ? 3500 : 2500;
  app.profile.wasteland.rank = rank;
  app.profile.wasteland.unknownFuelField = {kept: true};
  equal(app._saveProfile(), true, 'the fabricated profile saves to memory');
  if (enter && discovered) {
    equal(app.visitWasteland(), true, 'the discovered player can visit the yard');
    app.advance(8);
    equal(app.isYardHomeActive(), true, 'the visit reaches the active yard');
  }
  return app;
}
function appFight(options = {}) {
  const app = yard(options);
  equal(app.startArenaEvent({mode: 'fuel-run', opponents: 3}), true,
    'the yard action starts Fuel Run');
  equal(app.duel.state.arena.mode, 'fuel-run', 'App passes the selected mode to the simulation');
  app.duel.state.countdown = 0; tick(app.duel, 2);
  fuel(app.duel); holdOthers(app.duel);
  return app;
}
function finishApp(app) {
  for (let n = 0; n < 5; n++) point(app.duel);
  equal(app.duel.state.status, 'arena_result', 'five actual deliveries produce a settled result event');
  return app.duel.state.arena.result;
}

let modePromise;
test('Fuel Run has its own headless mode module', async () => {
  const mode = await (modePromise ??= import('../src/arena/modes/fuel-run.js').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url?.endsWith('/modes/fuel-run.js')) return null;
    throw error;
  }));
  ok(mode, 'ARENA-03 must supply the Fuel Run mode module');
});
test('the new Fuel switch starts in dev and is hidden from the released player', () => {
  equal(FEATURE_STATES['fuel-run'], 'dev', 'Fuel Run starts in dev under SPEC 0.12');
  equal(createFeatureFlags({storage: null, qa: false}).enabled('fuel-run'), false,
    'the released player does not run unfinished Fuel rules');
});

test('four distinct fuel pads in the middle and one coloured depot per starting team', () => {
  const duel = start(), state = fuel(duel);
  equal(state.pads.length, 4, 'there are exactly four fuel pads');
  equal(new Set(state.pads.map(p => p.id)).size, 4, 'pad identifiers are distinct');
  equal(state.canisters.filter(c => !c.carriedBy).length, 4, 'one canister starts on every pad');
  equal(state.depots.length, 4, 'each of the four cars has its own depot');
  equal(new Set(state.depots.map(d => d.color)).size, 4, 'depot colours distinguish the teams');
  for (const pad of state.pads) {
    ok([pad.s, pad.lateral].every(Number.isFinite), 'pad pose is on the actual arena floor');
    ok(pad.lateral <= 0 && Math.abs(pad.lateral) < duel.course.def.scrapdome.floorHalfWidth,
      'fuel is in the inner floor by the middle, rather than outside the wall');
    equal(state.canisters.filter(c => c.id === pad.canisterId).length, 1,
      'each pad points to exactly one available canister');
  }
  for (const p of duel.state.arena.participants) {
    const depot = state.depots.find(d => d.participantId === p.id);
    ok(depot, `${p.id} has a depot`);
    equal(depot.team, p.team, 'depot ownership follows the actual combat team');
    ok(typeof depot.color === 'string' && depot.color.length > 0, 'a depot has renderer-readable colour metadata');
    const spawn = duel.state.arena.spawnSlots[p.spawnSlot];
    const a = duel.course.worldAt(spawn.s, spawn.lateral), b = duel.course.worldAt(depot.s, depot.lateral);
    ok(Math.hypot(a.x - b.x, a.z - b.z) <= 20, 'the depot is near its own spawn');
    equal(p.fuelDelivered, 0, 'delivery score starts at zero');
    equal(p.fuelCanisterId, null, 'nobody starts carrying fuel');
  }
  equal(duel.state.arena.timeLimitSec, 180, 'Fuel Run lasts three minutes');
});

test('a car carries only one canister and the taken pad refills after exactly five seconds', () => {
  const duel = start(); holdOthers(duel);
  const first = pick(duel), pad = fuel(duel).pads[0];
  equal(pad.canisterId, null, 'a taken pad is empty');
  place(duel, 'player', fuel(duel).pads[1]); tick(duel);
  equal(member(duel).fuelCanisterId, first, 'a second drive-over cannot replace the carried canister');
  ok(fuel(duel).pads[1].canisterId, 'the second canister stays available');
  place(duel, 'player', fuel(duel).depots[0]); tick(duel, 597);
  equal(pad.canisterId, null, 'the taken pad is still empty just before five seconds');
  tick(duel, 2);
  ok(pad.canisterId, 'the taken pad refills at five seconds');
  equal(fuel(duel).canisters.filter(c => c.id === pad.canisterId).length, 1,
    'refill creates one available canister, without duplicates');
});

test('only your own depot scores and staying on it never duplicates a delivery', () => {
  const duel = start(); holdOthers(duel);
  pick(duel);
  place(duel, 'player', fuel(duel).depots.find(d => d.participantId === 'cpu-1')); tick(duel);
  equal(member(duel).fuelDelivered, 0, 'an enemy depot gives no point');
  ok(member(duel).fuelCanisterId, 'an enemy depot does not consume your canister');
  deliver(duel);
  equal(member(duel).fuelDelivered, 1, 'your own depot awards exactly one point');
  equal(member(duel).fuelCanisterId, null, 'delivery consumes the carried fuel');
  tick(duel, 120);
  equal(member(duel).fuelDelivered, 1, 'remaining inside the depot cannot score again');
});

for (const id of ['player', 'cpu-1']) test(`${id} wins on five deliveries, never on five wrecks`, () => {
  const duel = start(); holdOthers(duel, id);
  member(duel, id).wrecks = 99;
  tick(duel);
  equal(duel.state.status, 'racing', 'wreck count cannot end Fuel Run');
  for (let n = 1; n <= 5; n++) {
    point(duel, id);
    equal(member(duel, id).fuelDelivered, n, 'actual deliveries own the score');
    equal(duel.state.status, n < 5 ? 'racing' : 'arena_result', 'only delivery five ends before the whistle');
  }
  equal(duel.state.arena.result.winnerId, id, 'the first driver to deliver five wins');
  const result = structuredClone(duel.state.arena.result);
  tick(duel, 120);
  equal(duel.state.arena.result, result, 'later steps preserve the one result');
});

test('most deliveries at three minutes wins even when another car caused more wrecks', () => {
  const duel = start(); holdOthers(duel);
  point(duel); point(duel, 'player', 1);
  member(duel, 'cpu-1').wrecks = 99; member(duel, 'cpu-1').damageDealt = 9999;
  duel.state.arena.clockSec = 180 - DT / 2; tick(duel);
  equal(duel.state.status, 'arena_result', 'a delivery leader ends the event at the whistle');
  equal(duel.state.arena.result.winnerId, 'player', 'deliveries outrank wrecks and damage');
});

test('a delivery tie enters sudden death and the next delivery wins; a wreck does not', () => {
  const duel = start(); holdOthers(duel);
  pick(duel);
  member(duel, 'cpu-1').wrecks = 99; member(duel, 'cpu-1').damageDealt = 9999;
  duel.state.arena.clockSec = 180 - DT / 2; tick(duel);
  equal(duel.state.arena.phase, 'sudden-death', 'tied deliveries trigger sudden death despite unequal wrecks');
  member(duel, 'cpu-1').wrecks++; tick(duel);
  equal(duel.state.status, 'racing', 'a wreck in sudden death does not win a delivery contest');
  deliver(duel);
  equal(duel.state.arena.result?.winnerId, 'player', 'the next delivery resolves sudden death');
});

for (const amount of [25, 26]) test(`one ${amount}-armor hit ${amount > 25 ? 'drops' : 'retains'} carried fuel`, () => {
  const duel = start(); holdOthers(duel);
  const id = pick(duel), pose = {s: duel.state.s, lateral: duel.state.lateral};
  hit(duel, amount);
  if (amount === 25) equal(member(duel).fuelCanisterId, id, 'exactly 25 lost armor retains fuel');
  else {
    equal(member(duel).fuelCanisterId, null, 'more than 25 lost armor in one hit drops fuel');
    const dropped = fuel(duel).canisters.find(c => c.id === id);
    equal(dropped.carriedBy, null, 'dropped fuel is unowned');
    near(dropped.s, pose.s, 'fuel drops at the hit car along the floor');
    near(dropped.lateral, pose.lateral, 'fuel drops at the hit car sideways');
  }
});

test('separate sub-threshold hits do not add together into a fuel drop', () => {
  const duel = start(); holdOthers(duel); const id = pick(duel);
  hit(duel, 24); hit(duel, 24);
  equal(member(duel).fuelCanisterId, id, 'two 24-armor hits keep fuel despite exceeding 25 in total');
  tick(duel);
  equal(member(duel).fuelCanisterId, id, 'the event step does not infer one hit from cumulative loss');
});

test('the drop threshold uses actual armor lost, rather than nominal weapon damage', () => {
  const duel = start(); holdOthers(duel); const id = pick(duel);
  duel.state.invulnerableSec = 1;
  equal(applyArmorDamage(duel, duel.state, 'rpg-direct', {owner: 'cpu-1'}), 0,
    'the real protection rule rejects this hit');
  equal(member(duel).fuelCanisterId, id, 'a blocked large weapon does not drop fuel');
});

test('wrecking drops fuel before the respawn and an enemy can take the dropped canister', () => {
  const duel = start(); holdOthers(duel);
  const id = pick(duel), pose = {s: duel.state.s, lateral: duel.state.lateral};
  duel.state.armor = 1; duel.state.invulnerableSec = 0;
  applyArmorDamage(duel, duel.state, 'crossbow', {owner: 'cpu-1'}); tick(duel);
  equal(duel.state.combatWrecking, true, 'the carrier is waiting for the real respawn');
  equal(member(duel).fuelCanisterId, null, 'a wreck drops fuel even when the last hit removed only one armor');
  equal(fuel(duel).canisters.find(c => c.id === id)?.carriedBy, null, 'dropped fuel remains in the arena');
  const enemy = actor(duel, 'cpu-1');
  Object.assign(enemy, {combatWrecking: false, combatWreckTimer: 0, armor: enemy.maxArmor});
  member(duel, 'cpu-1').wreckCounted = false;
  place(duel, 'cpu-1', pose); tick(duel);
  equal(member(duel, 'cpu-1').fuelCanisterId, id, 'an enemy drive-over takes the same dropped canister');
  equal(member(duel).fuelDelivered, 0, 'a wreck is not a delivery point');
});

function leave(duel) {
  duel.setInput({interact: true}); tick(duel, 48);
  equal(duel.state.onFoot, true, 'holding actual F exits the car inside Fuel Run');
  duel.setInput({interact: false}); tick(duel);
}
function placeFighter(duel, pose) {
  const at = duel.course.groundAt(pose.s, pose.lateral);
  Object.assign(duel.state.fighter, {s: pose.s, lateral: pose.lateral,
    x: at.x, y: at.y, z: at.z, groundY: at.y, yaw: at.heading, airHeight: 0});
}
test('the real fighter picks up and delivers fuel from their own pose while the car stays parked', () => {
  const duel = start(); holdOthers(duel); leave(duel);
  const carPose = {s: duel.state.s, lateral: duel.state.lateral}, pad = fuel(duel).pads[0];
  const id = pad.canisterId;
  placeFighter(duel, pad); tick(duel);
  equal(member(duel).fuelCanisterId, id, 'the fighter has the same participant carry ownership as their car');
  equal(fuel(duel).canisters.find(c => c.id === id)?.carriedBy, 'player', 'the carried item belongs to the player');
  const depot = fuel(duel).depots.find(d => d.participantId === 'player');
  placeFighter(duel, depot); tick(duel);
  equal(member(duel).fuelDelivered, 1, 'a fighter delivers at the actual foot pose');
  near(duel.state.s, carPose.s, 'walking leaves the parked car position unchanged');
  near(duel.state.lateral, carPose.lateral, 'walking leaves the parked car sideways unchanged');
});

test('carried fuel reduces actual walking speed to 70 percent and F re-entry preserves the canister', () => {
  const duel = start(); holdOthers(duel);
  place(duel, 'player', {s: duel.state.s + 20, lateral: duel.state.lateral});
  leave(duel);
  // Use one clear starting strip for both measurements, with the same yaw/input.
  const origin = {s: duel.state.s, lateral: duel.state.lateral - 3};
  placeFighter(duel, origin);
  const walk = () => {
    const f = duel.state.fighter, from = {x: f.x, z: f.z};
    duel.setFighterInput({forward: true, sprint: false}); tick(duel, 24);
    duel.setFighterInput({forward: false});
    return {distance: Math.hypot(f.x - from.x, f.z - from.z), dx: f.x - from.x, dz: f.z - from.z};
  };
  const empty = walk(); ok(empty.distance > .5, 'the empty fighter walks in unobstructed floor space');
  const pad = fuel(duel).pads[0], id = pad.canisterId;
  placeFighter(duel, pad); tick(duel);
  equal(member(duel).fuelCanisterId, id, 'the actual foot pickup starts the carrying measurement');
  placeFighter(duel, origin); const loaded = walk();
  near(loaded.distance / empty.distance, .7, 'fuel walking is exactly 70 percent of empty walking', 1e-6);
  near(loaded.dx / loaded.distance, empty.dx / empty.distance, 'carrying keeps the same input direction', 1e-6);
  near(loaded.dz / loaded.distance, empty.dz / empty.distance, 'carrying keeps the same forward direction', 1e-6);
  placeFighter(duel, {s: duel.state.s, lateral: duel.state.lateral + 2.5});
  duel.setInput({interact: true}); tick(duel, 72);
  equal(duel.state.onFoot, false, 'a fresh actual F hold returns to the parked car');
  equal(member(duel).fuelCanisterId, id, 'returning to the car preserves the single carried canister');
});

test('collectors pursue available canisters then their own depot without selecting a combat target', () => {
  const duel = start(), p = member(duel, 'cpu-1'), car = actor(duel, 'cpu-1');
  tick(duel, 90);
  equal(p.targetId, null, 'a collector avoids combat targeting');
  ok(p.goal && fuel(duel).canisters.filter(c => !c.carriedBy).some(c => {
    const at = duel.course.worldAt(c.s, c.lateral);
    return Math.hypot(p.goal.x - at.x, p.goal.z - at.z) < 3;
  }), 'the actual collector brain sends its pilot to available fuel');
  holdOthers(duel, 'cpu-1'); pick(duel, 'cpu-1');
  place(duel, 'cpu-1', {s: car.s + 20, lateral: 0}); tick(duel, 90);
  const depot = fuel(duel).depots.find(d => d.participantId === 'cpu-1');
  const at = duel.course.worldAt(depot.s, depot.lateral);
  ok(p.goal && Math.hypot(p.goal.x - at.x, p.goal.z - at.z) < 3,
    'a loaded collector sends the same pilot to its own depot');
  equal(p.targetId, null, 'a loaded collector still avoids fights');
});

for (const brain of ['rammer', 'hunter']) test(`${brain} pursues a carrier through the existing pilot limits`, () => {
  const duel = start();
  member(duel, 'cpu-1').brain = brain;
  pick(duel, 'cpu-2');
  // A much closer empty player must not distract the aggressive fuel brain.
  const attacker = actor(duel, 'cpu-1');
  place(duel, 'player', {s: attacker.s + 8, lateral: attacker.lateral});
  tick(duel, 90);
  const p = member(duel, 'cpu-1');
  equal(p.targetId, 'cpu-2', `${brain} chases the loaded car, rather than the closer empty player`);
  ok(p.goal && [p.goal.x, p.goal.z, p.goal.speedMph].every(Number.isFinite), 'the brain creates a real pilot goal');
  const limit = arenaFloorSpeed(duel.course.def.scrapdome, arenaCarSpec(duel, attacker).topSpeed);
  ok(p.goal.speedMph <= limit + 1e-8, 'fuel targeting stays inside the existing arena car speed limit');
  ok(Number.isFinite(attacker.yawVelocity) && Math.abs(attacker.lateral) <= duel.course.def.scrapdome.wallOffset,
    'the actual pilot keeps the attacker finite and inside the arena wall');
});

test('rank 6 and the new dev switch govern the yard choice; locked choices stay hidden', () => {
  const below = arenaYardPanel({profile: {wasteland: {discoveredGate: true, rank: 5}},
    featureFlags: createFeatureFlags({storage: null, overrides: ON})});
  equal(/FUEL RUN/i.test(below), false, 'rank 5 cannot see an unfinished locked mode');
  const unlocked = arenaYardPanel({profile: {wasteland: {discoveredGate: true, rank: 6}},
    featureFlags: createFeatureFlags({storage: null, overrides: ON})});
  ok(/FUEL RUN/i.test(unlocked), 'rank 6 sees Fuel Run in the enabled yard panel');
  const released = arenaYardPanel({profile: {wasteland: {discoveredGate: true, rank: 6}},
    featureFlags: createFeatureFlags({storage: null, qa: false})});
  equal(/FUEL RUN/i.test(released), false, 'the default released player does not see a dev mode');
  equal(FEATURE_STATES['fuel-run'], 'dev', 'the mode remains behind its new dev switch');
});

for (const blocked of ['rank', 'fuel-run', 'scrapdome', 'discovery', 'menu']) test(`${blocked} gate blocks a Fuel Run start atomically`, () => {
  const options = blocked === 'rank' ? {rank: 5} : blocked === 'discovery' ? {discovered: false} :
    blocked === 'menu' ? {enter: false} : {flags: {...ON, [blocked]: false}};
  const app = yard(options), previous = [...values.entries()], state = app.duel.state;
  equal(app.startArenaEvent({mode: 'fuel-run', opponents: 3}), false, `${blocked} gate refuses the launch`);
  equal(app.duel.state, state, 'a refused launch leaves the current race state object alone');
  equal([...values.entries()], previous, 'a refused launch does not write or mutate a player save');
  app.dispose?.();
});

test('Fuel HUD and scoreboard name deliveries and delivery sudden death without changing race state', () => {
  const duel = start(); holdOthers(duel); point(duel);
  const before = JSON.stringify(duel.state.arena), hud = arenaHud(duel.state);
  ok(/FUEL/.test(hud.modeLabel), 'the HUD identifies Fuel Run');
  ok(/1/.test(hud.scoreText) && /FUEL|DELIVER/i.test(hud.scoreText), 'the HUD reports delivered fuel');
  const markup = arenaBoardMarkup(hud, value => String(value));
  ok(/DELIVER|FUEL/i.test(markup), 'the scoreboard labels delivery counts');
  equal(JSON.stringify(duel.state.arena), before, 'HUD and scoreboard rendering leave arena rules untouched');
  duel.state.arena.phase = 'sudden-death';
  ok(/DELIVER|FUEL/i.test(arenaHud(duel.state).timeLabel), 'sudden death asks for the next delivery');
});

function finishedRoster({place = 1, opponents = 3, wrecks = 2} = {}) {
  const participants = [{id: 'player', kind: 'player', team: 'player', fuelDelivered: place === 1 ? 5 : 1,
    fuelCanisterId: null, wrecks, wrecked: 0, damageDealt: 100},
  ...Array.from({length: opponents}, (_, n) => ({id: `cpu-${n + 1}`, kind: 'cpu', team: `cpu-${n + 1}`,
    fuelDelivered: n < place - 1 ? 5 - n : 0, fuelCanisterId: null, wrecks: 0, wrecked: 0, damageDealt: 0}))];
  const others = participants.slice(1).map(p => p.id);
  const placings = [...others.slice(0, place - 1), 'player', ...others.slice(place - 1)];
  return {version: 1, venueId: 'scrapdome', mode: 'fuel-run', phase: 'over', participants,
    result: {placings, winnerId: placings[0], reason: 'fuel'}};
}
const profile = () => ({version: 2, credits: 765, unknownRoot: {kept: true}, wasteland: {
  version: 1, discoveredGate: true, rank: 6, xp: 3500, scrap: 10, settledResults: ['old-result'],
  territories: {kettle: {hold: 0, claimed: false, unknownHold: 'kept'}}, unknownCareer: {kept: true}}});
const payload = arena => ({runId: 'fuel-run-1', ownerPlayerId: 'driver-a', activePlayerId: 'driver-a',
  cpuDifficulty: 'medium', arena});

test('Fuel Run uses the unchanged CAR-01 place/wreck pay and Kettle hold once per complete event', () => {
  const arena = finishedRoster(), before = profile(), result = settleArenaResult(before, payload(arena));
  equal(arenaReward(arena, 'medium'), {base: 80, placing: 120, wrecks: 120, factor: 1.2, total: 384},
    'four-car win with two wrecks pays (80 + 120 + 120) times 1.2');
  equal(result.awarded, true, 'Fuel Run completion is a supported settlement');
  equal(result.scrapEarned, 384, 'Fuel Run adds exactly the CAR-01 scrap amount');
  equal(result.profile.wasteland.scrap, 394, 'the saved Wasteland bank receives the scrap');
  equal(result.holdAdded, 25, 'winning against at least two computers adds 25 Kettle hold');
  equal(result.profile.credits, 765, 'ordinary racing credits are preserved');
  equal(result.profile.unknownRoot, before.unknownRoot, 'unknown root fields survive');
  equal(result.profile.wasteland.unknownCareer, before.wasteland.unknownCareer, 'unknown Wasteland fields survive');
  equal(result.profile.wasteland.territories.kettle.unknownHold, 'kept', 'unknown territory fields survive');
  const duplicate = settleArenaResult(result.profile, payload(arena));
  equal(duplicate.awarded, false, 'duplicate settlement cannot pay');
  equal(duplicate.profile, result.profile, 'duplicate settlement returns the unchanged profile');
  equal(settleArenaResult(before, payload(finishedRoster({opponents: 1}))).holdAdded, 0,
    'a one-computer win earns no hold');
  equal(settleArenaResult(before, payload(finishedRoster({place: 2}))).holdAdded, 0,
    'a loss earns no hold');
});

test('settlement rejects malformed Fuel rosters, results, identity and incomplete events without consuming the marker', () => {
  const original = profile();
  const mutations = [
    a => ({...a, phase: 'fight'}), a => ({...a, result: null}),
    a => ({...a, participants: a.participants.slice(0, 1)}),
    a => ({...a, participants: [...a.participants, a.participants[1]]}),
    a => ({...a, result: {...a.result, placings: ['player', 'cpu-1']}}),
    a => ({...a, result: {...a.result, placings: ['player', 'cpu-1', 'cpu-1', 'cpu-3']}}),
    a => ({...a, result: {...a.result, winnerId: 'cpu-1'}}),
    a => ({...a, result: {...a.result, placings: ['player', 'cpu-1', 'cpu-2', 'fake']}}),
    a => ({...a, participants: a.participants.map((p, n) => n ? p : {...p, fuelDelivered: -1})}),
  ];
  for (const change of mutations) {
    const result = settleArenaResult(original, payload(change(finishedRoster())));
    equal(result.awarded, false, 'a malformed Fuel Run result cannot settle');
    equal(result.profile, original, 'invalid completion keeps the exact profile and its marker history');
  }
  for (const change of [{ownerPlayerId: 'other'}, {activePlayerId: 'other'}, {runId: ''}]) {
    const result = settleArenaResult(original, {...payload(finishedRoster()), ...change});
    equal(result.awarded, false, 'Fuel Run must settle for the exact starting named owner');
    equal(result.profile, original, 'invalid ownership cannot bank or consume a marker');
  }
});

test('real App result pays once, writes one registry, preserves the other named player and ordinary bank', () => {
  const app = yard();
  app.returnToMenu();
  ok(app.addPlayer('Fuel spectator').ok, 'the second synthetic named player exists');
  const spectator = app.player.id, spectatorBefore = structuredClone(app.profile);
  const owner = app.players.players.find(p => p.id !== spectator).id;
  equal(app.selectPlayer(owner), true, 'the Fuel owner is selected');
  app.cpuDifficulty = 'medium'; equal(app.visitWasteland(), true, 'the owner re-enters their yard'); app.advance(8);
  equal(app.startArenaEvent({mode: 'fuel-run', opponents: 3}), true, 'the real yard action starts Fuel Run');
  equal(app.duel.state.arena.mode, 'fuel-run', 'App starts the selected rules');
  app.duel.state.countdown = 0; tick(app.duel, 2); holdOthers(app.duel);
  const runId = app.runId, credits = app.profile.credits, scrap = app.profile.wasteland.scrap;
  const writesBefore = writes, result = finishApp(app);
  equal(result.scrapEarned, 240, 'Medium four-car win without credited wrecks pays exactly 240');
  equal(app.profile.wasteland.scrap, scrap + 240, 'the real App banks the award');
  equal(app.profile.credits, credits, 'the real App leaves the ordinary bank alone');
  equal(result.holdAdded, 25, 'the real App stores one hold award');
  equal(writes - writesBefore, 1, 'one completed Fuel Run makes one atomic registry write');
  equal(app.profile.wasteland.settledResults.filter(k => k === `arena:${runId}`).length, 1,
    'one settlement marker identifies the event');
  equal(app._settleArenaResult({result}, app.duel.state), false, 'a repeated result event cannot pay again');
  const reloaded = loadPlayers(globalThis.localStorage);
  equal(reloaded.players.find(p => p.id === spectator).profile, spectatorBefore, 'the other named player is preserved');
  equal(app.profile.wasteland.unknownFuelField, {kept: true}, 'unknown owner fields survive the actual save path');
  app.dispose?.();
});

test('a failed Fuel App save restores the owner and a retry banks once', () => {
  const app = appFight(), before = structuredClone(app.profile), storageBefore = [...values.entries()];
  const runId = app.runId;
  failWrites = true; const result = finishApp(app); failWrites = false;
  equal(app.profile, before, 'failed persistence restores all prior owner fields');
  equal([...values.entries()], storageBefore, 'failed persistence leaves the memory registry unchanged');
  equal(result.scrapEarned, 0, 'unpaid results display zero scrap');
  equal(result.holdAdded, 0, 'unpaid results display zero hold');
  equal(result.settlementSaved, false, 'the result records the failed save');
  equal(app.profile.wasteland.settledResults.includes(`arena:${runId}`), false, 'failure does not burn the settlement marker');
  equal(app._settleArenaResult({result}, app.duel.state), true, 'retry performs the existing atomic settlement');
  equal(result.scrapEarned, 240, 'retry pays the original selected Medium award once');
  equal(app._settleArenaResult({result}, app.duel.state), false, 'another retry pays nothing');
  app.dispose?.();
});

test('Fuel abandonment and changed owner cannot bank scrap or hold', () => {
  const app = appFight(), runId = app.runId, before = structuredClone(app.profile);
  pick(app.duel); deliver(app.duel);
  equal(app.returnToYard(), true, 'the player can abandon Fuel Run to the yard');
  equal(app.profile, before, 'abandonment leaves all earned banks and holds unchanged');
  equal(app.profile.wasteland.settledResults.includes(`arena:${runId}`), false, 'an abandoned Fuel event has no settlement marker');
  app.dispose?.();
  const wrong = appFight(), wrongBefore = structuredClone(wrong.profile);
  wrong._runPlayerId = 'another-owner'; const result = finishApp(wrong);
  equal(wrong.profile, wrongBefore, 'a changed run owner preserves the current named profile');
  equal(result.scrapEarned, 0, 'a changed owner gets no reward');
  wrong.dispose?.();
});

function controls(spec) {
  const duel = new Duel({seed: spec.seed, featureFlags: {...ON, 'fuel-run': spec.fuelEnabled}});
  if (spec.kind === 'road') duel.startCampaign({seed: spec.seed, mode: spec.mode, car: 'falcone_f42',
    startStage: COURSE.findIndex(c => c.id === spec.course), difficulty: 'casual', cpuDifficulty: 'medium'});
  else if (spec.kind === 'sal') {
    startWarlordEvent(duel, {warlordId: 'sal', seed: spec.seed, car: 'falcone_f42', cpuDifficulty: 'medium'});
    beginWarlordEvent(duel);
  } else duel.startArenaEvent({seed: spec.seed, mode: 'last-car-rolling', car: 'falcone_f42',
    cpuDifficulty: 'medium', opponents: FIELD.map(({car}) => ({car}))});
  const samples = [];
  for (let n = 0; n < 1200; n++) {
    duel.setInput({throttle: 1, brake: n > 800 ? .2 : 0, steer: n < 500 ? .08 : -.04, boost: false});
    duel.step(DT);
    if (n % 120 === 119) samples.push({status: duel.state.status, s: duel.state.s,
      lateral: duel.state.lateral, speed: duel.state.speedMph, time: duel.state.stageTimeSec,
      rivals: duel.state.opponents.map(a => [a.s, a.lateral, a.speedMph, a.armor]),
      arena: structuredClone(duel.state.arena), results: structuredClone(duel.state.results)});
  }
  return createHash('sha256').update(JSON.stringify(samples)).digest('hex');
}
test('Fuel switch on and off preserve ordinary roads, Last Car Rolling and Sal engine fingerprints', () => {
  const fixture = JSON.parse(readFileSync(new URL('./replays/arena-fuel-run-controls.json', import.meta.url), 'utf8'));
  for (const spec of fixture.cases) {
    equal(controls({...spec, fuelEnabled: false}), spec.fingerprint, `${spec.kind}: Fuel disabled keeps the pre-card engine trace`);
    equal(controls({...spec, fuelEnabled: true}), spec.fingerprint, `${spec.kind}: Fuel enabled leaves other modes unchanged`);
  }
});

function framedFuel(fps) {
  const app = appFight(), duel = app.duel, events = [];
  duel.onChange((_s, event) => { if (event.arenaPhase || event.arenaResult || event.fuelPickup ||
    event.fuelDrop || event.fuelDelivery) events.push(structuredClone(event)); });
  const samples = [];
  for (let n = 0; n < 5; n++) {
    if (!fuel(duel).pads[0].canisterId) {
      place(duel, 'player', fuel(duel).depots[0]); app.advance(5.1, 1 / fps);
    }
    place(duel, 'player', fuel(duel).pads[0]); app.advance(.1, 1 / fps);
    place(duel, 'player', fuel(duel).depots.find(d => d.participantId === 'player'));
    app.advance(.1, 1 / fps);
    samples.push({fuel: structuredClone(fuel(duel)), participants: structuredClone(duel.state.arena.participants),
      s: duel.state.s, lateral: duel.state.lateral, time: duel.state.stageTimeSec, status: duel.state.status});
  }
  equal(duel.state.arena.result?.winnerId, 'player', 'scripted deliveries end the actual engine event');
  const result = structuredClone(duel.state.arena.result);
  app.dispose?.();
  return {samples, events, result};
}
test('same Fuel inputs produce identical carry, refill, delivery, timing and result at 30, 60 and 144 FPS', () => {
  const baseline = framedFuel(30);
  for (const fps of [30, 60, 144]) equal(framedFuel(fps), baseline, `${fps} FPS has the same Fuel Run result and event trace`);
});

test.after(() => console.log(`Fuel Run: ${checks} acceptance checks executed.`));

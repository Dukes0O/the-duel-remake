import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {Duel} from '../src/game.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {point as carPoint} from '../src/combat-weapons.js';
import {stepFuelRun} from '../src/arena/modes/fuel-run.js';
import {COMBAT_TUNING as T} from '../src/wasteland-tuning.js';

// CREW.md: settled car weapons against current fighters, not future CREW-04 state.
// Native Duel, real F hold, generated raiders and actual projectile sweeps.
const DT = 1 / 120;
const FLAGS = {wasteland2: true, 'hidden-road': true, scrapdome: true,
  warlords: true, 'fuel-run': true, raiders: true};
let checks = 0;
const eq = (a, b, message) => { checks++; assert.deepEqual(a, b, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
const near = (a, b, message, tolerance = 1e-6) => ok(Math.abs(a - b) < tolerance,
  message + ': expected ' + b + ', received ' + a);
const ticks = (duel, n = 1) => { for (let i = 0; i < n; i++) duel.step(DT); };
function place(car, s, lateral = 0) {
  Object.assign(car, {s, prevS: s, lateral, prevLateral: lateral,
    speedMph: 0, headingError: 0, pushVelocity: 0, yawVelocity: 0,
    airHeight: 0, prevAirHeight: 0, impactTimer: 0, bombImpactCooldown: 0});
}
function moveFighter(duel, pose) {
  const at = duel.course.groundAt(pose.s, pose.lateral);
  Object.assign(duel.state.fighter, {s: pose.s, lateral: pose.lateral,
    x: at.x, y: at.y, z: at.z, groundY: at.y, yaw: at.heading,
    airHeight: 0, verticalSpeed: 0});
}
function start(mode = 'fuel-run', crewId = 'nell') {
  const duel = new Duel({seed: 1989, featureFlags: FLAGS});
  if (mode === 'fuel-run') {
    eq(duel.startArenaEvent({mode, car: 'falcone_f42', seed: 1989,
      crewId, cpuDifficulty: 'hard', opponents: [
        {car: 'dusthawk_rally', brain: 'hunter'},
        {car: 'aurora_gt', brain: 'rammer'},
        {car: 'stuttgart_959s', brain: 'collector'}]}), true,
    'native Fuel entry accepts the controlled field');
  } else {
    duel.startCampaign({mode: 'wasteland', car: 'falcone_f42',
      crewId, seed: 1989, startStage: 0, opponentCount: 3, cpuDifficulty: 'hard',
      discoveredGate: true});
  }
  const state = duel.state;
  eq(state.wastelandGateDiscovered, true, 'the actual entry records the discovered Wasteland gate');
  state.status = 'racing'; state.countdown = 0; state.invulnerableSec = 0;
  state.traffic = [];
  state.combat.aiTimer = Infinity; state.combat.pickupTimer = Infinity;
  state.combat.shield = state.combat.rivalShield = 0;
  if (mode !== 'fuel-run') place(state, 500, 0);
  state.opponents.forEach((car, i) => {
    place(car, 100 + i * 100, 0); car.combatShield = 0;
    // Retain native owner/participant records while isolating unrelated driving.
    car.combatWrecking = true; car.combatWreckTimer = 100000;
  });
  for (const p of state.arena?.participants || []) p.protectedSec = 0;
  duel.setInput({interact: true, throttle: 0, brake: 0, steer: 0});
  ticks(duel, 48); duel.setInput({interact: false});
  eq(state.onFoot, true, 'the real 0.4-second F hold creates the current player fighter');
  // A clear pose separates the fighter body from the parked car hitbox.
  moveFighter(duel, mode === 'fuel-run'
    ? state.arena.fuelRun.pads[0] : {s: 540, lateral: 0});
  eq(state.fighter.maxHealth, crewId === 'rook' ? 110 : 100,
    'native crew health and Rook perk remain unchanged');
  return duel;
}
function projectile(duel, kind, at, extra = {}) {
  const shot = {id: ++duel.state.combat.serial, kind, enemy: true,
    sourceIndex: 0, ownerId: 'cpu-1', level: 0, age: kind === 'bomb' ? 2 : 0,
    x: at.x, y: at.y, z: at.z, vx: 0, vy: 0, vz: 0, ...extra};
  duel.state.combat.projectiles.push(shot);
  return shot;
}
function bolt(duel, body, {height = .85, offset = 0, ownerId = 'cpu-1', ...extra} = {}) {
  // Cross the body in one step; neither endpoint overlaps. Sweeps must hit.
  return projectile(duel, 'crossbow', {x: body.x - 2, y: body.y + height,
    z: body.z + offset}, {vx: 480, ownerId, ...extra});
}
// Existing player/raider centres span .85-1 m. A .005 health tolerance
// covers only that small geometric difference, not weapon or radius changes.
function bomb(duel, body, fraction = 0, {level = 0, ...extra} = {}) {
  const radius = T.bomb.radius + T.bomb.radiusPerLevel * level;
  // Expiry is a genuine native airborne detonation. Matching body centre
  // isolates radial falloff from terrain elevation and car grounding.
  return projectile(duel, 'bomb', {x: body.x + radius * fraction,
    y: body.y + .9, z: body.z}, {level, ...extra});
}
function resolve(duel) { stepProjectiles(duel, DT); }
function pickup(duel) {
  const p = duel.state.arena.participants.find(p => p.id === 'player');
  const pad = duel.state.arena.fuelRun.pads[0];
  moveFighter(duel, pad); const id = pad.canisterId;
  stepFuelRun(duel, DT);
  eq(p.fuelCanisterId, id, 'actual foot collection owns the physical canister');
  return {p, id};
}

for (const mode of ['fuel-run', 'wasteland']) {
  test(mode + ': swept incoming car bolt removes 35 health from the fighter, not parked armor', () => {
    const duel = start(mode), f = duel.state.fighter, armor = duel.state.armor;
    bolt(duel, f); resolve(duel);
    eq(f.health, 65, 'a real car bolt removes exactly 35 fighter health');
    eq(f.knockedDown, false, 'one car bolt never causes a surviving fighter knockdown');
    eq(duel.state.armor, armor, 'a body hit away from the parked car leaves armor intact');
    eq(duel.state.combat.projectiles.length, 0, 'body contact consumes the actual bolt once');
    resolve(duel); eq(f.health, 65, 'a consumed bolt cannot damage the fighter twice');
  });
  test(mode + ': three bolts knock a base-health fighter down, without an early knock', () => {
    const duel = start(mode), f = duel.state.fighter;
    for (const health of [65, 30, 0]) {
      bolt(duel, f); resolve(duel);
      eq(f.health, health, 'successive real bolts use the settled 35-health damage');
      eq(f.knockedDown, health === 0, 'only exhausted health knocks the base fighter down');
    }
    near(f.knockdownRemaining, 3, 'existing fighter knockdown timer remains three seconds');
  });
  for (const control of [{name: 'beside body', offset: .8},
    {name: 'above head', height: 2.3}, {name: 'below feet', height: -.5}]) {
    test(mode + ': a bolt ' + control.name + ' does not use the parked car box', () => {
      const duel = start(mode), f = duel.state.fighter;
      bolt(duel, f, control); resolve(duel);
      eq(f.health, 100, 'a swept miss outside the fighter body leaves health unchanged');
      eq(f.knockedDown, false, 'a physical body miss never knocks the fighter down');
    });
  }
  test(mode + ': a physical parked-car hit still removes armor while its fighter is elsewhere', () => {
    const duel = start(mode), f = duel.state.fighter, armor = duel.state.armor;
    const at = carPoint(duel, duel.state);
    projectile(duel, 'crossbow', at); resolve(duel);
    near(duel.state.armor, armor - 12, 'the existing physical car bolt retains 12 armor damage');
    eq(f.health, 100, 'a parked-car hit cannot substitute the distant fighter pose');
    eq(duel.state.combat.projectiles.length, 0, 'the existing car contact still consumes the bolt');
  });
  for (const level of [0, 3]) {
    for (const fraction of [.5, .75, .999]) {
      test(mode + ': bomb level ' + level + ' at radius share ' + fraction + ' uses car falloff on fighter health', () => {
        const duel = start(mode), f = duel.state.fighter;
        bomb(duel, f, fraction, {level}); resolve(duel);
        near(f.health, 100 - 60 * (1 - fraction),
          'car splash removes up to 60 health using the existing linear radial falloff', .005);
        if (fraction <= .75) near((100 - f.health) / (1 - fraction), 60,
          'actual outer splash independently retains the 60-health centre maximum', .02);
        eq(f.knockedDown, false, 'at or beyond half radius a surviving fighter stays standing');
        eq(duel.state.combat.projectiles.length, 0, 'actual bomb expiry resolves and removes the bomb');
      });
    }
    for (const fraction of [0, .499]) {
      test(mode + ': bomb level ' + level + ' inside half radius ' + fraction + ' knocks down', () => {
        const duel = start(mode), f = duel.state.fighter;
        bomb(duel, f, fraction, {level}); resolve(duel);
        eq(f.knockedDown, true, 'a fighter strictly inside half the upgraded blast radius is knocked down');
        eq(f.health, 0, 'knockdown retains the current fighter zero-health contract');
        near(f.knockdownRemaining, 3, 'splash uses the existing three-second recovery');
      });
    }
  }
  for (const fraction of [1, 1.001]) test(mode + ': bomb at/outside radius ' + fraction + ' does not damage fighter', () => {
    const duel = start(mode), f = duel.state.fighter;
    bomb(duel, f, fraction); resolve(duel);
    eq(f.health, 100, 'splash at the radius edge has zero damage');
    eq(f.knockedDown, false, 'zero splash never causes knockdown');
  });
}

test('Rook keeps 110 health: three 35-health car bolts leave five health, fourth knocks down', () => {
  const duel = start('wasteland', 'rook'), f = duel.state.fighter;
  for (const health of [75, 40, 5, 0]) {
    bolt(duel, f); resolve(duel);
    eq(f.health, health, 'car contact does not erase the existing Rook health perk');
    eq(f.knockedDown, health === 0, 'Rook is knocked down only when his real health is exhausted');
  }
});

for (const guard of ['friendly', 'victim-respawn', 'owner-respawn']) {
  for (const kind of ['crossbow', 'bomb']) test('Fuel fighter: ' + guard + ' blocks incoming ' + kind, () => {
    const duel = start(), f = duel.state.fighter;
    const player = duel.state.arena.participants.find(p => p.id === 'player');
    const owner = duel.state.arena.participants.find(p => p.id === 'cpu-1');
    if (guard === 'friendly') owner.team = player.team;
    if (guard === 'victim-respawn') player.protectedSec = 1;
    if (guard === 'owner-respawn') owner.protectedSec = 1;
    if (kind === 'crossbow') bolt(duel, f); else bomb(duel, f);
    resolve(duel);
    eq(f.health, 100, 'existing team and respawn damage guards also protect the fighter body');
    eq(f.knockedDown, false, 'protected/friendly splash cannot force knockdown');
  });
}

test('Fuel carrier: a surviving 35-health body bolt keeps cargo with the real fighter', () => {
  const duel = start(), f = duel.state.fighter, {p, id} = pickup(duel);
  bolt(duel, f); resolve(duel); stepFuelRun(duel, DT);
  eq(f.health, 65, 'the actual carrier is no longer immune to car bolts');
  eq(p.fuelCanisterId, id, 'a surviving fighter hit above 25 health does not apply the car armor-drop rule');
  eq(duel.state.arena.fuelRun.canisters.find(c => c.id === id).carriedBy,
    'player', 'cargo ownership survives a non-knockdown fighter hit');
});
test('Fuel carrier: surviving outer splash keeps cargo', () => {
  const duel = start(), f = duel.state.fighter, {p, id} = pickup(duel);
  bomb(duel, f, .5); resolve(duel); stepFuelRun(duel, DT);
  near(f.health, 70, 'half-radius splash removes 30 health without knockdown', .005);
  eq(p.fuelCanisterId, id, 'a standing fighter keeps cargo after surviving splash');
});
for (const cause of ['third-bolt', 'inner-bomb']) test('Fuel carrier: ' + cause + ' drops cargo once at the fighter pose', () => {
  const duel = start(), f = duel.state.fighter, {p, id} = pickup(duel);
  const events = []; duel.onChange((_state, event) => { if (event.fuelDrop) events.push(event.fuelDrop); });
  if (cause === 'third-bolt') for (let i = 0; i < 3; i++) { bolt(duel, f); resolve(duel); }
  else { bomb(duel, f, .499); resolve(duel); }
  stepFuelRun(duel, DT);
  eq(f.knockedDown, true, 'actual projectile contacts knock the carrier down');
  eq(p.fuelCanisterId, null, 'knockdown clears participant cargo');
  const canister = duel.state.arena.fuelRun.canisters.find(c => c.id === id);
  eq(canister.carriedBy, null, 'the same actual physical canister becomes available');
  near(canister.s, f.s, 'drop uses the fighter longitudinal pose');
  near(canister.lateral, f.lateral, 'drop uses the fighter lateral pose');
  stepFuelRun(duel, DT); eq(events.length, 1, 'one knockdown emits one actual cargo-drop event');
  eq(events[0].reason, 'knockdown', 'cargo reports the actual knockdown reason');
});
test('Fuel carrier: more than 25 armor lost by its distant parked car does not drop fighter cargo', () => {
  const duel = start(), f = duel.state.fighter, {p, id} = pickup(duel);
  const events = []; duel.onChange((_state, event) => { if (event.fuelDrop) events.push(event.fuelDrop); });
  const at = carPoint(duel, duel.state), armor = duel.state.armor;
  projectile(duel, 'bomb', at, {level: 3}); resolve(duel);
  eq(events.length, 0, 'a parked-car hit never emits a drop for a standing on-foot carrier');
  eq(p.fuelCanisterId, id, 'car damage keeps fighter cargo before any possible recollection');
  ok(armor - duel.state.armor > 25, 'native upgraded bomb gives the parked car a qualifying armor hit');
  eq(f.health, 100, 'distant parked-car splash stays outside the real carrier body');
  stepFuelRun(duel, DT);
  eq(p.fuelCanisterId, id, 'only fighter knockdown drops cargo while its driver is on foot');
});

test('ordinary Wasteland: car crossbow strikes a real generated raider body for 35 health', () => {
  const duel = start('wasteland'), r = duel.state.raids.zones[0].raiders[0];
  const initial = r.health; eq(initial, 70, 'native raider health remains 70');
  bolt(duel, r, {enemy: false, ownerId: 'player', sourceIndex: undefined}); resolve(duel);
  eq(r.health, initial - 35, 'actual car bolt applies the same 35-health rule to a generated raider');
  eq(r.knockedDown, false, 'surviving raider bolt contact does not force a knockdown');
  eq(duel.state.combat.projectiles.length, 0, 'raider contact consumes the actual car bolt');
});
for (const fraction of [.5, .75]) test('ordinary Wasteland: car bomb splash reaches real raider at ' + fraction + ' radius', () => {
  const duel = start('wasteland'), r = duel.state.raids.zones[0].raiders[0];
  bomb(duel, r, fraction, {enemy: false, ownerId: 'player', sourceIndex: undefined}); resolve(duel);
  near(r.health, 70 - 60 * (1 - fraction), 'raiders take the same native car-splash health falloff', .005);
  near((70 - r.health) / (1 - fraction), 60,
    'native outer raider splash independently retains the 60-health centre maximum', .02);
  eq(r.knockedDown, false, 'outer splash leaves a surviving generated raider standing');
});
test('ordinary Wasteland: inner car bomb knocks a generated raider down with its existing recovery', () => {
  const duel = start('wasteland'), r = duel.state.raids.zones[0].raiders[0];
  bomb(duel, r, .499, {enemy: false, ownerId: 'player', sourceIndex: undefined}); resolve(duel);
  eq(r.knockedDown, true, 'inside half radius car splash also knocks raiders down');
  near(r.knockdownRemaining, 3, 'generated raider recovery stays three seconds');
});
test('a second car bolt cannot damage or restart recovery of an already knocked fighter', () => {
  const duel = start(), f = duel.state.fighter;
  f.health = 30; bolt(duel, f); resolve(duel);
  eq(f.knockedDown, true, 'real first incoming bolt knocks a low-health fighter down');
  f.knockdownRemaining = 1.25; bolt(duel, f); resolve(duel);
  near(f.knockdownRemaining, 1.25, 'body contact does not restart an existing recovery');
  eq(f.health, 0, 'downed fighters never take repeated negative damage');
});

for (const mode of ['fuel-run', 'wasteland']) test(mode + ': the actual Duel step resolves incoming fighter contact', () => {
  const duel = start(mode), f = duel.state.fighter;
  bolt(duel, f); ticks(duel);
  eq(f.health, 65, 'native fight integration applies the settled car bolt to the real fighter');
  eq(f.knockedDown, false, 'native step leaves a surviving bolt victim standing');
});
test('Fuel: the existing physical bolt still damages a later computer car', () => {
  const duel = start(), car = duel.state.opponents[2];
  car.combatWrecking = false; car.combatWreckTimer = 0;
  const armor = car.armor, at = carPoint(duel, car);
  projectile(duel, 'crossbow', at, {enemy: false, sourceIndex: undefined, ownerId: 'player'});
  resolve(duel);
  near(car.armor, armor - 12, 'a real later CPU car retains the existing 12 armor bolt hit');
  eq(duel.state.fighter.health, 100, 'physical CPU contact does not redirect damage to a distant fighter');
  eq(duel.state.combat.projectiles.length, 0, 'actual CPU contact still consumes its projectile');
});
test('ordinary Wasteland: two car bolts knock the native 70-health raider down', () => {
  const duel = start('wasteland'), r = duel.state.raids.zones[0].raiders[0];
  for (const health of [35, 0]) {
    bolt(duel, r, {enemy: false, ownerId: 'player', sourceIndex: undefined}); resolve(duel);
    eq(r.health, health, 'the real raider retains native health and the same 35-health car bolt');
    eq(r.knockedDown, health === 0, 'raider knockdown follows its actual exhausted health');
  }
  near(r.knockdownRemaining, 3, 'car bolts retain the existing raider three-second recovery');
});

// Existing Fuel and ordinary/combat replay suites remain the unchanged-rule
// fingerprints; this acceptance adds no alternate pin or regeneration path.
after(() => console.log('On-foot car contacts: ' + checks + ' acceptance checks reached.'));

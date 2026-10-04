import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {fireWeapon} from '../src/combat-weapons.js';
import {stepCombat, clearArsenalState, WEAPONS as WEAPON_RULES} from '../src/combat.js';
import {createCombatHud} from '../src/combat-hud.js';
import {carEffect, carTopSpeed} from '../src/arsenal/car-effects.js';
import {targetFor, targetIdentity} from '../src/arsenal/targeting.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {vehicleContactModifiers} from '../src/vehicle-contact-modifiers.js';
import {createProfile, loadPlayers, savePlayers, PLAYERS_KEY} from '../src/progression.js';
import {App} from '../src/app.js';
import {createArmoryScreen} from '../src/screen-armory.js';
import {startWarlordEvent} from '../src/arena/warlord-event.js';
import {settleWarlordResult} from '../src/arena/warlord-settlement.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {getProfileWeapons, purchaseArsenalWeapon, purchaseWeaponUpgrade,
  rewardArsenalWeapon, normalizeWeapons, offeredArsenalWeapons, cpuArsenalLoadout,
  WEAPON_IDS, ARSENAL_WEAPONS} from '../src/weapon-upgrades.js';
import {availableCarWeapons, getCarLoadout, equipCarWeapon} from '../src/car-loadout.js';
import {makeRng} from '../src/rng.js';
import {createFighter} from '../src/onfoot.js';
import {stepFootWeapons} from '../src/onfoot-weapons.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {combatTeam} from '../src/combat-teams.js';

// ARS-03: production weapon dispatch, damage, counter and effect lifetimes.
// A flat course isolates combat from road scenery; profiles remain in memory.
const DT = 1 / 120, EPS = 1e-7;
const WEAPONS = [['mortar', 14, 14], ['tesla', 17, 18], ['decoy', 19, 16], ['nitro', 21, 20]];
let checks = 0;
const equal = (actual, expected, message) => { checks++; assert.deepEqual(actual, expected, message); };
const ok = (actual, message) => { checks++; assert.ok(actual, message); };
const near = (actual, expected, message) => ok(Math.abs(actual - expected) < EPS,
  `${message}: expected ${expected}, got ${actual}`);
test.after(() => console.log(`Arsenal wave 3: ${checks} acceptance checks executed.`));

function race({enabled = true, waveThree = true, gap = 50, difficulty = 'easy', flat = true,
  levels = {}, loadout} = {}) {
  const duel = new Duel({seed: 3003, featureFlags: createFeatureFlags({storage: null,
    qa: true, overrides: {arsenal: enabled, 'arsenal-wave3': waveThree}})});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', driverId: 'club',
    discoveredGate: true, arsenalRank: 30, opponentCount: 1,
    seed: 3003, cpuDifficulty: difficulty, weaponLevels: levels, weaponLoadout: loadout});
  const state = duel.state, rival = state.opponents[0], events = [];
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0,
    s: 500, prevS: 500, lateral: 0, prevLateral: 0, speedMph: 0, traffic: []});
  Object.assign(rival, {s: 500 + gap, prevS: 500 + gap, lateral: 0, prevLateral: 0,
    speedMph: 0, headingError: 0, armor: 100, maxArmor: 100, combatShield: 0});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  if (flat) duel.course = {...duel.course, def: duel.course.def, length: 10000, closed: false,
    at: point, groundAt: point, worldAt: point,
    nearest: (x, z) => ({s: z, lateral: x, distance: Math.abs(x)}),
    obstaclesNear: () => [], roadHalfWidthAt: () => 20};
  duel._obstacles = () => [];
  duel.onChange((_s, event) => events.push(event));
  return {duel, state, rival, events};
}
function tick(f, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    f.state.stageTimeSec += DT; stepCombat(f.duel, DT);
  }
}
function fire(f, id) {equal(fireWeapon(f.duel, id), true, `native trigger must fire ${id}`);}

for (const [id, , cooldown] of WEAPONS) {
  test(`native ${id} trigger sets recharge and rejects immediate repeat`, () => {
    const f = race(); fire(f, id);
    equal(f.state.combat.cooldowns[id], cooldown, `${id} uses its settled level-zero recharge`);
    equal(fireWeapon(f.duel, id), false, `${id} cannot bypass its recharge`);
  });
  test(`${id} stays behind arsenal and discovery`, () => {
    const off = race({enabled: false});
    equal(fireWeapon(off.duel, id), false, `${id} rejects the disabled arsenal`);
    const hidden = race(); hidden.state.wastelandGateDiscovered = false;
    equal(fireWeapon(hidden.duel, id), false, `${id} rejects an undiscovered career`);
  });
}

test('Mortar commits the nearest ahead target and marker before its 1.6-second landing', () => {
  const f = race(); f.rival.speedMph = 10;
  f.state.opponents.push({...f.rival, s: 490, prevS: 490}, {...f.rival, s: 590, prevS: 590});
  fire(f, 'mortar');
  const shell = f.state.combat.mortarShells[0];
  equal(shell.targetId, targetIdentity(f.duel, f.rival), 'the closer car behind is not the lob target');
  equal(shell.radius, 3, 'the landing marker is six metres across');
  const committed = {x: shell.x, y: shell.y, z: shell.z};
  ok(shell.z > f.rival.s, 'the marker leads the moving enemy');
  f.rival.s = shell.z; f.rival.lateral = shell.x;
  tick(f, 1.6 - DT);
  equal(f.rival.armor, 100, 'the visible marker precedes any landing damage');
  equal({x: shell.x, y: shell.y, z: shell.z}, committed, 'the marked landing position stays fixed');
  tick(f, DT);
  near(f.rival.armor, 75, 'the shell deals 25 armor at the centre');
  ok(f.rival.airborne || f.rival.airHeight > 0 || f.rival._verticalSpeed > 0,
    'the centre hit gives the car a small hop');
});

test('Mortar falls off toward the edge and changing lanes escapes the marked ring', () => {
  function hit(lateral) {
    const f = race(); fire(f, 'mortar'); const shell = f.state.combat.mortarShells[0];
    f.rival.s = shell.z; f.rival.lateral = shell.x + lateral; tick(f, 1.6);
    return 100 - f.rival.armor;
  }
  const centre = hit(0), edge = hit(2.8);
  ok(edge > 0 && edge < centre, 'damage falls off within the six-metre ring');
  equal(hit(10), 0, 'a lane change outside the ring prevents damage');
});

test('Tesla has a full 0.4-second tell, then disables only cars within fifteen metres for three seconds', () => {
  const f = race({gap: 14}); f.state.opponents.push({...f.rival, s: 516, prevS: 516});
  fire(f, 'tesla'); tick(f, .4 - DT);
  equal(carEffect(f.rival, 'disabled'), null, 'no disabled state before the tell completes');
  tick(f, DT);
  ok(carEffect(f.rival, 'disabled'), 'the car inside fifteen metres is disabled');
  equal(carEffect(f.state.opponents[1], 'disabled'), null, 'the car outside fifteen metres is unaffected');
  equal(fireWeapon(f.duel, 'crossbow', true, f.rival), false, 'the pulse blocks native car weapons');
  tick(f, 3);
  equal(carEffect(f.rival, 'disabled'), null, 'the pulse ends after three seconds');
});

test('a star shield is consumed instead of taking Tesla disable', () => {
  const f = race({gap: 10}); f.state.combat.rivalShield = 5;
  fire(f, 'tesla'); tick(f, .4);
  equal(f.state.combat.rivalShield, 0, 'Tesla consumes the victim star shield');
  equal(carEffect(f.rival, 'disabled'), null, 'shielded victim keeps weapons and boost');
});

test('Tesla ends the victim Scrap Magnet and destroys its decoy', () => {
  const f = race({gap: 5}); f.rival.weaponLoadout = ['magnet', 'decoy'];
  equal(fireWeapon(f.duel, 'magnet', true, f.rival), true, 'the victim starts a native magnet');
  equal(fireWeapon(f.duel, 'decoy', true, f.rival), true, 'the victim starts a native decoy');
  const drone = f.state.opponents.find(actor => actor.drone);
  ok(drone?.active, 'the native decoy exists before the pulse');
  fire(f, 'tesla'); tick(f, .4);
  equal(f.state.combat.magnets.length, 0, 'the pulse ends the hostile magnet');
  ok(!f.state.opponents.includes(drone) || !drone.active, 'the pulse destroys the hostile decoy');
});

test('Decoy is an owner copy ten metres aside for five seconds, redirects aim and bursts on first hit', () => {
  const f = race(); fire(f, 'decoy');
  const drone = f.state.opponents.find(actor => actor.drone);
  ok(drone?.decoy && drone.active, 'Drone uses the generic Mirage transient-car contract');
  equal(drone.ownerId, 'player', 'the copy belongs to the actual player');
  equal(drone.car, f.state.car, 'the copy looks like the owner car');
  near(Math.abs(drone.lateral - f.state.lateral), 10, 'the copy drives ten metres to one side');
  equal(targetFor(f.duel, f.rival, {range: 100}), drone, 'native computer targeting is redirected to the in-range copy');
  tick(f, 5 - DT); ok(drone.active, 'the decoy survives until the five-second boundary');
  tick(f, DT); ok(!f.state.opponents.includes(drone) || !drone.active, 'the decoy expires after five seconds');
  const g = race(); fire(g, 'decoy'); const copy = g.state.opponents.find(actor => actor.drone);
  applyArmorDamage(g.duel, copy, 'crossbow', {owner: 'cpu:0'});
  ok(!g.state.opponents.includes(copy) || !copy.active, 'a native damaging hit bursts the copy immediately');
});

test('Nitro raises speed and acceleration for three seconds and triples crash ram damage', () => {
  const f = race();
  const normal = vehicleContactModifiers(f.duel, f.state, f.rival, 'front', 'rear').multiplier;
  fire(f, 'nitro');
  near(carTopSpeed(f.state), 1.35, 'native driving reads thirty-five percent more top speed');
  near(carEffect(f.state, 'nitro').acceleration, 1.35, 'the native Nitro effect raises acceleration by thirty-five percent');
  near(vehicleContactModifiers(f.duel, f.state, f.rival, 'front', 'rear').multiplier,
    normal * 3, 'native crash contact modifiers triple ram damage');
  tick(f, 3); equal(carEffect(f.state, 'nitro'), null, 'Nitro ends after three seconds');
});

test('Oil cancels Nitro early', () => {
  const f = race(); fire(f, 'nitro');
  // Use the native Oil producer, so its touch effect owns cancellation.
  f.rival.s = f.state.s + 4;
  equal(fireWeapon(f.duel, 'oil', true, Object.assign(f.rival, {weaponLoadout: ['oil']})), true,
    'the enemy drops a native Oil Slick beneath the player');
  tick(f, DT);
  equal(carEffect(f.state, 'nitro'), null, 'touching an enemy Oil Slick ends Nitro');
});

test('Nitro increases actual player and computer acceleration', () => {
  function speed(nitro, cpu) {
    const f = race({flat: false});
    if (cpu) {
      f.rival.weaponLoadout = ['nitro'];
      if (nitro) equal(fireWeapon(f.duel, 'nitro', true, f.rival), true, 'native CPU Nitro trigger works');
      f.duel._rival(DT, f.rival); return f.rival.speedMph;
    }
    if (nitro) fire(f, 'nitro');
    f.duel.setInput({throttle: 1, steer: 0, brake: 0, boost: false});
    f.duel._drive(DT); return f.state.speedMph;
  }
  for (const cpu of [false, true]) ok(speed(true, cpu) > speed(false, cpu) * 1.2,
    `${cpu ? 'computer' : 'player'} motion gains the Nitro acceleration`);
});

test('Tesla blocks actual computer boost while ordinary steering and driving continue', () => {
  const f = race({gap: 10, flat: false});
  const course = f.duel.course;
  let straight = null;
  for (let s = 100; s < course.length - 200; s += 20)
    if ([0, 40, 80, 120].every(ds => Math.abs(course.at(s + ds).curvature) < .0012)) {straight = s; break;}
  ok(straight !== null, 'the real course has a straight for the native CPU boost check');
  f.state.s = straight - 10; f.rival.s = straight; f.rival.speedMph = 50;
  f.state.rivalSettings = {}; f.rival.boost = 1;
  f.duel._rival(DT, f.rival);
  equal(f.rival.boosting, true, 'the eligible native computer boosts before the pulse');
  fire(f, 'tesla'); tick(f, .4);
  const before = f.rival.s; f.duel._rival(DT, f.rival);
  equal(f.rival.boosting, false, 'the native computer cannot boost while disabled');
  ok(f.rival.s > before && Number.isFinite(f.rival.headingError), 'Tesla leaves computer driving and steering active');
});

for (const [id, rank] of WEAPONS) test(`${id} purchase and upgrades are per-player, preserve future data and never normalize ownership`, () => {
  const p = createProfile();
  let xp = 0; for (let n = 1; n < rank; n++) xp += 400 + 150 * (n - 1);
  p.wasteland = normalizeWasteland({...p.wasteland, discoveredGate: true, xp,
    scrap: 4000, weapons: {unlocked: ['future-id'], levels: {'future-id': 7}, extra: {keep: 9}}});
  const before = structuredClone(p), other = createProfile();
  const options = {arsenalEnabled: true, arsenalWave3Enabled: true, wastelandEnabled: true};
  const bought = purchaseArsenalWeapon(p, id, options);
  equal(bought.ok, true, `${id} is offered at the settled rank`);
  equal(bought.profile.wasteland.scrap, 3600, 'purchase costs 400 scrap');
  equal(p, before, 'purchase does not mutate its original named profile');
  equal(getProfileWeapons(other).unlocked.includes(id), false, 'another player gains nothing');
  let upgraded = bought.profile;
  for (const cost of [150, 300, 600]) {
    const old = upgraded.wasteland.scrap, result = purchaseWeaponUpgrade(upgraded, id, options);
    equal(result.ok, true, 'owned weapon can upgrade'); equal(result.profile.wasteland.scrap, old - cost, 'upgrade uses settled scrap cost');
    upgraded = result.profile;
  }
  equal(getProfileWeapons(upgraded).levels['future-id'], 7, 'future levels survive');
  equal(upgraded.wasteland.weapons.extra.keep, 9, 'unknown save fields survive');
  equal(normalizeWeapons({levels: {[id]: 3}}).unlocked.includes(id), false, 'a level alone never grants the weapon');
});

test('Mirage early reward delivers Decoy Drone without rank or payment and cannot grant an unearned win', () => {
  const p = createProfile(); p.wasteland.discoveredGate = true;
  equal(rewardArsenalWeapon(p, 'decoy', {warlordId: 'mirage'}).ok, false, 'an unearned Mirage reward is refused');
  p.wasteland.warlords.mirage.defeated = true;
  const won = rewardArsenalWeapon(p, 'decoy', {warlordId: 'mirage'});
  equal(won.ok, true, 'a genuine saved Mirage defeat grants Drone early');
  equal(getProfileWeapons(won.profile).unlocked.includes('decoy'), true, 'Drone becomes owned at rank one');
  equal(won.profile.wasteland.scrap, p.wasteland.scrap, 'the reward costs no scrap');
});

test('wave-three combat state clears on the actual arsenal stage boundary', () => {
  const f = race(); for (const [id] of WEAPONS) fire(f, id);
  clearArsenalState(f.duel);
  equal(f.state.combat.mortarShells.length, 0, 'no shell survives stage cleanup');
  equal(f.state.combat.teslaCharges.length, 0, 'no pulse survives stage cleanup');
  equal(f.state.opponents.some(actor => actor.drone), false, 'no drone survives stage cleanup');
  equal(carEffect(f.state, 'nitro'), null, 'no Nitro survives stage cleanup');
});

test('same wave-three inputs give identical fixed-step results at 30, 60 and 144 FPS', () => {
  function run(fps, id) {
    const f = race({gap: id === 'tesla' ? 10 : 50}); fire(f, id);
    let remainder = 0;
    for (let frame = 0; frame < fps * 6; frame++) {
      remainder += 1 / fps;
      while (remainder + 1e-10 >= DT) {remainder = Math.max(0, remainder - DT); tick(f, DT);}
    }
    return {armor: f.rival.armor, cooldown: f.state.combat.cooldowns[id],
      projectiles: structuredClone(f.state.combat.projectiles),
      drones: f.state.opponents.filter(a => a.drone).map(a => [a.id, a.s, a.lateral, a.active]),
      nitro: carEffect(f.state, 'nitro'), disabled: carEffect(f.rival, 'disabled')};
  }
  for (const [id] of WEAPONS) {const base = run(30, id); for (const fps of [60, 144]) equal(run(fps, id), base, `${id} is repeatable at ${fps} FPS`);}
});

function payoff(f) {
  return {scoring: structuredClone(f.state.combat.scoring), hits: f.state.combat.hits,
    notorietyEvents: structuredClone(f.state.combat.notorietyEvents || []),
    score: f.state.score, style: f.state.stageStyleScore};
}

test('a real enemy Crossbow flight redirects to the player Drone, bursts it and leaves its owner unharmed', () => {
  const f = race({difficulty: 'hard'}); fire(f, 'decoy');
  const drone = f.state.opponents.find(actor => actor.drone), armor = f.state.armor;
  f.rival.headingError = Math.PI; f.rival.weaponLoadout = ['crossbow'];
  const before = payoff(f);
  equal(fireWeapon(f.duel, 'crossbow', true, f.rival), true, 'the native enemy Crossbow producer fires');
  const shot = f.state.combat.projectiles.find(p => p.kind === 'crossbow');
  ok(shot?.enemy, 'an actual enemy projectile exists before its flight');
  equal(shot.targetId, targetIdentity(f.duel, drone), 'the launched enemy bolt locks onto the player copy');
  tick(f, 2);
  ok(!f.state.opponents.includes(drone) || !drone.active, 'native projectile flight bursts the copy on its first collision');
  equal(f.state.armor, armor, 'the player body behind the copy takes no armor damage');
  equal(payoff(f), before, 'a copy hit awards no hit, style, wreck or notoriety pay');
});

test('a real RPG lock and flight strike a CPU Drone without damaging its owner or paying for the copy', () => {
  const f = race(); f.rival.weaponLoadout = ['decoy'];
  equal(fireWeapon(f.duel, 'decoy', true, f.rival), true, 'the computer deploys an actual owner copy');
  const drone = f.state.opponents.find(actor => actor.drone), armor = f.rival.armor;
  f.state.onFoot = true;
  f.state.fighter = createFighter(f.duel.course, f.state, {s: f.state.s, lateral: 0});
  const fighter = f.state.fighter;
  fighter.yaw = Math.atan2(drone.lateral - fighter.x, drone.s - fighter.z);
  fighter.pitch = Math.atan2(1 - (fighter.y + 1.48), Math.hypot(drone.lateral - fighter.x, drone.s - fighter.z));
  f.state.fighterInput = {aim: true, fire: false};
  for (let n = 0; n < 120; n++) {
    f.state.stageTimeSec += DT; stepFootWeapons(f.duel, DT);
  }
  equal(f.state.footWeapons.lockTargetId, targetIdentity(f.duel, drone), 'native on-foot lock selects the CPU-owned Drone');
  const before = payoff(f);
  f.state.fighterInput.fire = true; stepFootWeapons(f.duel, DT);
  const shot = f.state.combat.projectiles.find(p => p.kind === 'rpg');
  ok(shot, 'the native on-foot trigger creates a real RPG');
  equal(shot.targetId, targetIdentity(f.duel, drone), 'the launched RPG retains the redirected lock');
  tick(f, 2);
  ok(!f.state.opponents.includes(drone) || !drone.active, 'the native RPG flight bursts its target copy');
  equal(f.rival.armor, armor, 'the real CPU owner is outside the copy impact and remains unharmed');
  equal(payoff(f), before, 'shooting a copy cannot earn a hit, combo, style or notoriety reward');
});

test('native arena player Drone keeps its owner team and never changes the real scoreboard', () => {
  const duel = new Duel({seed: 3303, featureFlags: createFeatureFlags({storage: null, qa: true,
    overrides: {arsenal: true, 'arsenal-wave3': true}})});
  duel.state.wastelandGateDiscovered = true;
  equal(duel.startArenaEvent({venueId: 'pit', mode: 'last-car-rolling', car: 'falcone_f42',
    arsenalRank: 30, cpuDifficulty: 'hard', opponents: [{car: 'dusthawk_rally'}]}), true,
    'the native arena entry succeeds before Drone combat');
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  duel.state.invulnerableSec = 0;
  for (const p of duel.state.arena.participants) p.protectedSec = 0;
  equal(fireWeapon(duel, 'decoy'), true, 'the native arena player deploys Drone');
  const drone = duel.state.opponents.find(actor => actor.drone);
  equal(combatTeam(duel, drone), combatTeam(duel, duel.state), 'the copy shares the actual owner arena team');
  const before = duel.state.arena.participants.filter(p => !p.decoy)
    .map(p => [p.id, p.wrecks, p.wrecked, p.damageDealt]);
  applyArmorDamage(duel, drone, 'crossbow', {owner: 'cpu-1'}); duel.step(DT);
  equal(duel.state.arena.participants.filter(p => !p.decoy).map(p => [p.id, p.wrecks, p.wrecked, p.damageDealt]),
    before, 'a Drone burst cannot alter any real participant score');
  equal(duel.state.status, 'racing', 'a copy burst never settles or finishes the arena');
});

function cpuDecision(id, {distance = 50, lateral = 0, difficulty = 'hard', prepare} = {}) {
  const f = race({gap: -distance, difficulty});
  f.state.lateral = f.state.prevLateral = lateral;
  f.rival.weaponLoadout = [id];
  prepare?.(f); f.state.combat.aiTimer = 0;
  stepCombatAI(f.duel, DT);
  return {f, used: f.events.some(e => e.actor === f.rival && e.arsenalCue ===
    {mortar: 'weapon.mortar.fire', tesla: 'weapon.tesla.charge', decoy: 'weapon.decoy.deploy', nitro: 'weapon.nitro.start'}[id])};
}

test('native CPU Mortar decisions admit the leader at 40 and 200 metres ahead but not outside or behind', () => {
  for (const [distance, expected] of [[39, false], [40, true], [200, true], [201, false], [-50, false]])
    equal(cpuDecision('mortar', {distance}).used, expected, `native Mortar decision at ${distance} m`);
});

test('native arena Mortar fires at the score leader instead of a closer nonleader', () => {
  const duel = new Duel({seed: 3314, featureFlags: createFeatureFlags({storage: null, qa: true,
    overrides: {arsenal: true, 'arsenal-wave3': true}})});
  duel.state.wastelandGateDiscovered = true;
  equal(duel.startArenaEvent({venueId: 'pit', mode: 'last-car-rolling', car: 'falcone_f42',
    arsenalRank: 30, cpuDifficulty: 'hard', opponents: [{car: 'dusthawk_rally'}, {car: 'aurora_gt'}]}), true,
    'the actual three-car arena admits the Mortar leader fixture');
  duel.state.countdown = 0; duel.step(DT); duel.step(DT);
  const state = duel.state, owner = state.opponents[0], leader = state.opponents[1];
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  duel.course = {...duel.course, at: point, groundAt: point, worldAt: point};
  Object.assign(owner, {s: 500, lateral: 0, headingError: 0, speedMph: 0, weaponLoadout: ['mortar']});
  Object.assign(state, {s: 550, lateral: 0}); Object.assign(leader, {s: 650, lateral: 0});
  for (const p of state.arena.participants) p.protectedSec = 0;
  state.arena.participants.find(p => p.id === leader.arenaId).wrecks = 2;
  state.combat.aiTimer = 0; stepCombatAI(duel, DT);
  equal(state.combat.mortarShells[0]?.targetId, leader.arenaId,
    'the real CPU launch commits the score leader rather than the nearer player');
});

test('native CPU Tesla decisions use twelve metres, not the fifteen-metre blast radius', () => {
  equal(cpuDecision('tesla', {distance: 12}).used, true, 'an enemy at twelve metres starts the native tell');
  equal(cpuDecision('tesla', {distance: 12.1}).used, false, 'an enemy beyond twelve metres cannot trigger Tesla');
});

test('native CPU Drone decisions require two positive hostile hits inside six seconds', () => {
  const hit = f => applyArmorDamage(f.duel, f.rival, 'crossbow', {owner: 'player'});
  equal(cpuDecision('decoy', {prepare: hit}).used, false, 'one positive hit cannot deploy Drone');
  equal(cpuDecision('decoy', {prepare: f => {hit(f); f.state.stageTimeSec += 5.9; hit(f);}}).used,
    true, 'two positive hostile native hits inside six seconds deploy Drone');
  equal(cpuDecision('decoy', {prepare: f => {hit(f); f.state.stageTimeSec += 6.1; hit(f);}}).used,
    false, 'a stale first hit cannot qualify a new hit');
  equal(cpuDecision('decoy', {prepare: f => {
    f.state.combat.rivalShield = 3; hit(f); hit(f); f.state.combat.rivalShield = 0;
  }}).used, false, 'fully shield-blocked hits cannot qualify Drone');
});

test('native CPU Nitro decisions require Hard, an enemy ahead within forty metres and the same lane', () => {
  for (const [options, expected] of [[{distance: 40}, true], [{distance: 40.1}, false],
    [{distance: -20}, false], [{distance: 20, lateral: 10}, false],
    [{distance: 20, difficulty: 'medium'}, false], [{distance: 20, difficulty: 'easy'}, false]])
    equal(cpuDecision('nitro', options).used, expected, `native Nitro decision ${JSON.stringify(options)}`);
});

test('wave three is separately dev-gated without changing the existing arsenal switch', () => {
  equal(FEATURE_STATES['arsenal-wave3'], 'dev', 'the four new weapons have their own dev switch');
  equal(FEATURE_STATES.arsenal, 'on', 'the existing released arsenal switch remains unchanged');
  const released = createFeatureFlags({qa: false, storage: {getItem: () => 'true'},
    search: '?flags=arsenal-wave3'});
  equal(released.enabled('arsenal-wave3'), false, 'the new wave is unavailable outside QA');
});

for (const [id] of WEAPONS) for (const cpu of [false, true]) {
  test(`${id}: native ${cpu ? 'CPU' : 'player'} trigger requires both Arsenal switches`, () => {
    for (const options of [{waveThree: false}, {enabled: false}]) {
      const f = race({...options, gap: cpu ? (id === 'tesla' ? -10 : -50) : 50, difficulty: 'hard'});
      if (cpu) f.rival.weaponLoadout = [id];
      equal(fireWeapon(f.duel, id, cpu, f.rival), false,
        `${id}: an explicitly equipped ${cpu ? 'CPU' : 'player'} cannot bypass either disabled switch`);
    }
  });
}

test('wave-three offers, purchases and saved loadout reads require their separate gate', () => {
  const p = createProfile(); p.wasteland = normalizeWasteland({...p.wasteland,
    discoveredGate: true, xp: 1_000_000, scrap: 5000});
  const on = {arsenalEnabled: true, arsenalWave3Enabled: true, wastelandEnabled: true};
  for (const [id] of WEAPONS) ok(offeredArsenalWeapons(p, on).includes(id), `${id}: the enabled offer exists`);
  for (const gate of [false, undefined]) {
    const options = {...on, arsenalWave3Enabled: gate};
    equal(offeredArsenalWeapons(p, options).filter(id => WEAPONS.some(row => row[0] === id)), [],
      'false or omitted wave-three admission hides all four offers');
    ok(offeredArsenalWeapons(p, options).includes('oil'), 'the earlier Arsenal offers remain available');
    for (const [id] of WEAPONS) equal(purchaseArsenalWeapon(p, id, options).ok, false,
      `${id}: buying cannot bypass the unavailable wave`);
  }
  const owned = {...p, wasteland: {...p.wasteland, weapons: {
    unlocked: WEAPONS.map(row => row[0]), levels: {}}, loadout: WEAPONS.map(row => row[0])}};
  const before = structuredClone(owned), off = {...on, arsenalWave3Enabled: false};
  equal(availableCarWeapons(owned, off).filter(id => WEAPONS.some(row => row[0] === id)), [],
    'gated saved weapons are not equip choices');
  equal(getCarLoadout(owned, off).some(id => WEAPONS.some(row => row[0] === id)), false,
    'a saved wave-three slot cannot enter the active loadout while gated');
  equal(owned, before, 'reading the gated loadout preserves all saved ownership and slot identities');
});

test('native game loadouts and seeded computer loadouts cannot admit gated wave-three weapons', () => {
  const ids = WEAPONS.map(row => row[0]);
  const enabled = race({difficulty: 'hard', loadout: ids});
  equal(enabled.state.weaponLoadout, ids, 'both enabled switches admit the saved player loadout');
  const selected = new Set();
  for (let seed = 0; seed < 12; seed++)
    for (const id of cpuArsenalLoadout(30, 'hard', {rng: makeRng(seed), arsenalWave3Enabled: true})) selected.add(id);
  for (const id of ids) ok(selected.has(id), `${id}: the enabled seeded CPU pool can select the built weapon`);
  const f = race({waveThree: false, difficulty: 'hard', loadout: ids});
  equal(f.state.weaponLoadout.some(id => ids.includes(id)), false,
    'actual campaign entry filters saved wave-three player slots');
  equal(f.state.opponents.some(actor => actor.weaponLoadout.some(id => ids.includes(id))), false,
    'actual campaign initialization excludes wave three from computer slots');
  for (let seed = 0; seed < 12; seed++)
    equal(cpuArsenalLoadout(30, 'hard', {rng: makeRng(seed), arsenalWave3Enabled: false})
      .some(id => ids.includes(id)), false, 'seeded CPU selection never draws gated wave-three weapons');
});

test('an earned Mirage Drone remains owned while gated and returns without a new purchase', () => {
  const p = createProfile(); p.wasteland.discoveredGate = true; p.wasteland.warlords.mirage.defeated = true;
  const earned = rewardArsenalWeapon(p, 'decoy', {warlordId: 'mirage'});
  equal(earned.ok, true, 'pure first-win ownership is saved independently of the runtime switch');
  const before = structuredClone(earned.profile);
  const options = {arsenalEnabled: true, arsenalWave3Enabled: false, wastelandEnabled: true};
  equal(availableCarWeapons(earned.profile, options).includes('decoy'), false,
    'the unavailable wave hides the earned Drone from active equipment');
  equal(getProfileWeapons(earned.profile).unlocked.includes('decoy'), true, 'gating never revokes the earned identity');
  equal(availableCarWeapons(earned.profile, {...options, arsenalWave3Enabled: true}).includes('decoy'), true,
    're-enabling the wave restores the earned rank-one Drone without buying it');
  equal(earned.profile, before, 'gate reads do not rewrite the saved earned reward');
});

const earnedOptions = {wastelandEnabled: true, arsenalEnabled: true, arsenalWave3Enabled: true};
const warlordWeapons = Object.entries(ARSENAL_WEAPONS).filter(([, item]) => item.warlordId);
function priorWinner(id, shape = 'record') {
  const p = createProfile(), warlordId = ARSENAL_WEAPONS[id].warlordId;
  p.wasteland.discoveredGate = true; p.wasteland.scrap = 1234;
  p.wasteland.warlords = shape === 'legacy' ? {defeated: [warlordId]} :
    {...p.wasteland.warlords, [warlordId]: {defeated: true, wins: 1, losses: 0}};
  p.wasteland.territories[warlordId] = {hold: 100, claimed: true};
  return p;
}
function earnedArmory(p, options = earnedOptions) {
  return createArmoryScreen({profile: () => p, credits: String, escapeHTML: String,
    getGarageMessage: () => '', kitsEnabled: () => options.wastelandEnabled,
    loadoutsEnabled: () => true, arsenalEnabled: () => options.arsenalEnabled,
    arsenalWave3Enabled: () => options.arsenalWave3Enabled, action: label => label})();
}
function withEarnedMemory(p, action) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousCancel = globalThis.cancelAnimationFrame;
  const values = new Map(), writes = [];
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: key => values.get(String(key)) ?? null,
    setItem(key, value) {values.set(String(key), String(value)); writes.push(String(key));},
    removeItem: key => values.delete(String(key)),
  }});
  globalThis.cancelAnimationFrame = () => {};
  let app;
  try {
    app = new App(); app.audio.unlock = () => {};
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: true,
      overrides: {arsenal: true, 'arsenal-wave3': true}});
    const ownerId = app.player.id, other = createProfile();
    other.wasteland.discoveredGate = true; other.wasteland.scrap = 777;
    const registry = {...app.players, players: [
      {...app.player, profile: {...p, raceSettings: app.profile.raceSettings}},
      {id: 'other-driver', name: 'Other Driver', profile: {...other, raceSettings: app.profile.raceSettings}},
    ]};
    assert.equal(savePlayers(registry), true, 'synthetic registry must save in memory');
    app.dispose(); app = new App(); app.audio.unlock = () => {};
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: true,
      overrides: {arsenal: true, 'arsenal-wave3': true}});
    writes.length = 0;
    return action({app, ownerId, values, writes});
  } finally {
    app?.dispose();
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
    if (previousCancel === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = previousCancel;
  }
}

for (const [id, {warlordId}] of warlordWeapons) for (const shape of ['record', 'legacy']) {
  const prefix = `${id}/${shape}`;
  test(`${prefix}: saved defeat is read as earned without an unlocked entry`, () => {
    const p = priorWinner(id, shape);
    equal(getProfileWeapons(p).unlocked.includes(id), true,
      `${prefix}: the ${warlordId} winner owns its reward at rank one`);
  });
  test(`${prefix}: prior winner can equip and use its reward at rank one`, () => {
    const p = priorWinner(id, shape), before = JSON.stringify(p);
    const equipped = equipCarWeapon(p, 0, id, earnedOptions);
    equal(equipped.ok, true, `${prefix}: saved defeat admits the earned weapon to a car slot`);
    equal(getCarLoadout(equipped.profile, earnedOptions)[0], id,
      `${prefix}: the actual loadout reads the equipped earned weapon`);
    equal(equipped.profile.wasteland.scrap, 1234, `${prefix}: equipping costs no scrap`);
    equal(JSON.stringify(p), before, `${prefix}: equipping leaves its input unchanged`);
    equal(equipped.profile.wasteland.weapons.unlocked.includes(id), false,
      `${prefix}: a slot action does not create a second saved reward grant`);
  });
  test(`${prefix}: Armory displays the earned weapon as an available choice and upgrade`, () => {
    const html = earnedArmory(priorWinner(id, shape));
    ok(html.includes(`value="${id}"`), `${prefix}: native Armory offers the earned reward in its slots`);
    ok(html.includes(`data-weapon-upgrade="${id}"`), `${prefix}: native Armory includes its earned upgrade`);
    equal(html.includes(`data-arsenal-purchase="${id}"`), false,
      `${prefix}: Armory never asks the winner to buy the earned reward`);
  });
  test(`${prefix}: an earned reward is never offered or charged again at the shop rank`, () => {
    const p = priorWinner(id, shape); p.wasteland.xp = 1_000_000;
    const before = JSON.stringify(p), bought = purchaseArsenalWeapon(p, id, earnedOptions);
    equal(offeredArsenalWeapons(p, earnedOptions).includes(id), false,
      `${prefix}: saved defeat suppresses a second purchase offer`);
    equal([bought.ok, bought.changed, bought.cost], [true, false, 0],
      `${prefix}: a repeated purchase request is a free unchanged result`);
    equal(bought.profile, p, `${prefix}: the shop does not rewrite a prior winner`);
    equal(JSON.stringify(p), before, `${prefix}: the prior winner keeps every saved field`);
  });
  test(`${prefix}: the earned rank-one reward upgrades without buying its identity`, () => {
    const p = priorWinner(id, shape), before = JSON.stringify(p);
    const upgraded = purchaseWeaponUpgrade(p, id, earnedOptions);
    equal(upgraded.ok, true, `${prefix}: an early earned weapon can buy its first upgrade`);
    equal(upgraded.profile.wasteland.scrap, 1084, `${prefix}: only the 150 scrap upgrade is charged`);
    equal(getProfileWeapons(upgraded.profile).levels[id], 1, `${prefix}: the earned upgrade becomes level one`);
    equal(upgraded.profile.wasteland.weapons.unlocked.includes(id), false,
      `${prefix}: upgrading does not persist a second saved ownership grant`);
    equal(JSON.stringify(p), before, `${prefix}: the upgrade preserves the original winner profile`);
  });
  test(`${prefix}: Armory and loadout reads preserve byte-exact memory saves and player isolation`, () => {
    withEarnedMemory(priorWinner(id, shape), ({app, values, writes}) => {
      const before = values.get(PLAYERS_KEY), profileBefore = JSON.stringify(app.profile);
      const loaded = loadPlayers(), other = loaded.players.find(p => p.id === 'other-driver').profile;
      earnedArmory(app.profile); getProfileWeapons(app.profile);
      availableCarWeapons(app.profile, earnedOptions); getCarLoadout(app.profile, earnedOptions);
      equal(values.get(PLAYERS_KEY), before, `${prefix}: read paths leave saved bytes exact`);
      equal(writes, [], `${prefix}: read paths perform no memory storage writes`);
      equal(JSON.stringify(app.profile), profileBefore, `${prefix}: read paths leave the native App profile exact`);
      equal(getProfileWeapons(other).unlocked.includes(id), false, `${prefix}: another named player earns nothing`);
      equal(normalizeWasteland(app.profile.wasteland).weapons.unlocked.includes(id), false,
        `${prefix}: normalization does not persist the derived reward`);
      const off = {...earnedOptions, arsenalEnabled: false};
      equal(availableCarWeapons(app.profile, off).includes(id), false, `${prefix}: Arsenal off hides earned equipment`);
      equal(getCarLoadout(app.profile, off).includes(id), false, `${prefix}: Arsenal off excludes earned slots`);
      if (ARSENAL_WEAPONS[id].wave === 3) {
        const waveOff = {...earnedOptions, arsenalWave3Enabled: false};
        equal(availableCarWeapons(app.profile, waveOff).includes(id), false,
          `${prefix}: wave three off hides the saved Mirage entitlement`);
        equal(earnedArmory(app.profile, waveOff).includes(`value="${id}"`), false,
          `${prefix}: wave three off hides the native Armory slot choice`);
      }
    });
  });
  test(`${prefix}: native App saves the equipped slot and launches the earned rank-one reward`, () => {
    withEarnedMemory(priorWinner(id, shape), ({app, values}) => {
      equal(app.visitWasteland(), true, `${prefix}: the native App enters the discovered yard`);
      app.advance(8);
      equal(app.equipCarWeapon(0, id).ok, true, `${prefix}: native App equips the saved defeat reward`);
      const saved = JSON.parse(values.get(PLAYERS_KEY));
      const owner = saved.players.find(p => p.id === app.player.id).profile;
      equal(owner.wasteland.loadout[0], id, `${prefix}: the durable saved slot retains the earned identity`);
      equal(owner.wasteland.weapons.unlocked.includes(id), false,
        `${prefix}: native slot save does not write a new ownership grant`);
      equal(owner.wasteland.scrap, 1234, `${prefix}: native App does not charge scrap for equipping`);
      equal(app.startArenaEvent({opponents: 1}), true, `${prefix}: native App starts a real arena`);
      equal(app.duel.state.weaponLoadout[0], id, `${prefix}: arena launch carries the durable earned slot`);
      equal(saved.players.find(p => p.id === 'other-driver').profile.wasteland.scrap, 777,
        `${prefix}: native slot save preserves the other named player's balance`);
    });
  });
}

test('saved weapon ownership alone still admits rewards without a warlord defeat', () => {
  for (const [id] of warlordWeapons) {
    const p = createProfile(); p.wasteland.discoveredGate = true;
    p.wasteland.weapons.unlocked.push(id);
    equal(availableCarWeapons(p, earnedOptions).includes(id), true,
      `${id}: existing purchased or saved earned ownership remains enough`);
  }
});

test('native Mirage first-win settlement still stores its reward once and rematches do not backfill it', () => {
  const f = race(), p = createProfile(); p.wasteland.discoveredGate = true;
  equal(startWarlordEvent(f.duel, {warlordId: 'mirage', car: 'falcone_f42'}), true,
    'the real Mirage fight provides its native settlement format');
  const arena = structuredClone(f.duel.state.arena); arena.phase = 'over';
  arena.participants.find(p => p.id === 'player').wrecks = 3;
  arena.participants.find(p => p.id === 'cpu-1').wrecked = 3;
  arena.result = {winnerId: 'player', reason: 'three-wrecks', placings: ['player', 'cpu-1']};
  const payload = {runId: 'ars-earned-first', ownerPlayerId: 'driver', activePlayerId: 'driver',
    arena, car: 'falcone_f42', cpuDifficulty: 'medium'};
  const first = settleWarlordResult(p, payload);
  equal([first.awarded, first.firstWin, first.weaponEarned], [true, true, 'decoy'],
    'first-win settlement still reports the saved Drone grant');
  equal(first.profile.wasteland.weapons.unlocked.includes('decoy'), true,
    'first-win settlement still stores the explicit earned Drone');
  equal(settleWarlordResult(first.profile, payload).awarded, false, 'exact repeat remains unpaid');
  const prior = priorWinner('decoy'), rematch = settleWarlordResult(prior, {...payload, runId: 'ars-earned-rematch'});
  equal([rematch.awarded, rematch.firstWin, rematch.weaponEarned], [true, false, null],
    'an old winner rematch remains a repeat win without a second saved grant');
  equal(rematch.profile.wasteland.weapons.unlocked.includes('decoy'), false,
    'a rematch does not backfill the old winner ownership list');
  equal(getProfileWeapons(rematch.profile).unlocked.includes('decoy'), true,
    'the actual settled rank-one rematch winner retains derived Drone ownership');
});

for (const level of [1, 2, 3]) {
  test(`Mortar level ${level} scales native damage and recharge without extending its warning`, () => {
    const f = race({levels: {mortar: level}}); fire(f, 'mortar');
    near(f.state.combat.cooldowns.mortar, 14 / 1.15 ** level, 'native Mortar recharge follows the shared upgrade rule');
    const shell = f.state.combat.mortarShells[0];
    f.rival.s = shell.z; f.rival.lateral = shell.x;
    tick(f, 1.6 - DT); equal(f.rival.armor, 100, 'upgrades do not shorten the full landing warning');
    tick(f, DT);
    near(100 - f.rival.armor, 25 * (1 + .15 * level), 'the actual landed shell gains fifteen percent damage per level');
  });
  test(`Nitro level ${level} scales actual crash damage and recharge without extending its effect`, () => {
    function ram(rank) {
      const f = race({gap: 4, levels: {nitro: rank}});
      f.state.prevS = 490; f.state.speedMph = 20;
      f.rival.prevS = f.rival.s; f.rival.speedMph = 0;
      fire(f, 'nitro');
      near(f.state.combat.cooldowns.nitro, 20 / 1.15 ** rank, 'native Nitro recharge follows the shared upgrade rule');
      equal(f.duel._vehicleContact(f.state, f.rival, 'RIVAL'), true, 'the actual crash solver accepts the scripted rear impact');
      const hit = f.events.find(e => e.combatRamHit && e.attackerIndex === -1 && e.victimIndex === 0);
      ok(hit?.armorRemoved > 0 && hit.armorRemoved < 70, 'the native change-in-velocity hit is positive and not capped');
      return {f, removed: hit.armorRemoved};
    }
    const base = ram(0), upgraded = ram(level);
    near(upgraded.removed, base.removed * (1 + .15 * level), 'upgraded Nitro scales real crash armor loss');
    tick(upgraded.f, 3 - DT); ok(carEffect(upgraded.f.state, 'nitro'), 'Nitro remains active until its unchanged boundary');
    tick(upgraded.f, DT); equal(carEffect(upgraded.f.state, 'nitro'), null, 'upgrades never extend the three-second Nitro duration');
  });
}

// Small semantic DOM surface, as in the presentation suites. The production
// HUD still reads real Duel state and owns every slot label and ready angle.
function withNativeHud(f, action) {
  function element() {
    const children = new Map(), attributes = new Map(), styles = new Map(), classes = new Set();
    return {dataset: {}, hidden: false, disabled: false, textContent: '', style: {
      getPropertyValue: name => styles.get(name) || '',
      setProperty: (name, value) => styles.set(name, String(value)),
    }, classList: {toggle(name, force) {if (force) classes.add(name); else classes.delete(name);}},
    append() {}, remove() {}, addEventListener() {},
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: name => attributes.get(name) ?? null,
    querySelector(selector) {
      if (!children.has(selector)) children.set(selector, element());
      return children.get(selector);
    }, querySelectorAll(selector) {
      if (selector === '[data-combat-weapon]') {
        if (!children.has(selector)) children.set(selector, WEAPON_IDS.map((id, slot) =>
          Object.assign(element(), {dataset: {combatWeapon: id, combatSlot: String(slot)}})));
        return children.get(selector);
      }
      if (selector === '.combat-edge-cue') {
        if (!children.has(selector)) children.set(selector, ['left', 'right'].map(side =>
          Object.assign(element(), {dataset: {side}})));
        return children.get(selector);
      }
      return [];
    }};
  }
  const previous = globalThis.document, root = element(), created = [];
  globalThis.document = {createElement() {const node = element(); created.push(node); return node;}};
  let hud;
  try {
    hud = createCombatHud({root, app: {duel: f.duel}});
    return action(hud, created[0].querySelectorAll('[data-combat-weapon]'));
  } finally {
    hud?.dispose();
    if (previous === undefined) delete globalThis.document; else globalThis.document = previous;
  }
}

test('Tesla consumes a native enemy Star and also ends its active Scrap Magnet', () => {
  const f = race({gap: 10}); f.rival.weaponLoadout = ['magnet', 'star'];
  equal(fireWeapon(f.duel, 'magnet', true, f.rival), true, 'the real enemy Magnet starts');
  equal(fireWeapon(f.duel, 'star', true, f.rival), true, 'the real enemy Star starts');
  equal(f.state.combat.magnets.length, 1, 'the shielded victim has one active Magnet before Tesla');
  ok(f.state.combat.rivalShield > 0, 'the victim shield was genuinely raised');
  fire(f, 'tesla'); tick(f, .4);
  equal(f.state.combat.rivalShield, 0, 'Tesla consumes the actual enemy shield');
  equal(carEffect(f.rival, 'disabled'), null, 'Star still prevents the weapon and boost lockout');
  equal(f.state.combat.magnets.length, 0, 'Star does not protect its Scrap Magnet from Tesla');
  equal(f.events.filter(event => event.arsenalMagnetEnded && event.ownerId === targetIdentity(f.duel, f.rival)).length,
    1, 'the native pulse ends the victim Magnet once');
});

test('native CPU Tesla locks HUD slots for three seconds and restores readiness at expiry', () => {
  const f = race({gap: 10, flat: false, loadout: ['crossbow', 'tesla', 'decoy', 'nitro']});
  f.rival.weaponLoadout = ['tesla'];
  Object.assign(f.state, {speedMph: 50, gear: 3, boost: 1});
  f.duel.setInput({throttle: 1, steer: 0, brake: 0, boost: true});
  f.duel._drive(DT);
  equal(f.state.boosting, true, 'the native player can boost before being pulsed');
  withNativeHud(f, (hud, slots) => {
    hud.update(f.state);
    equal(slots[0].disabled, false, 'the native ready Crossbow slot starts enabled');
    equal(fireWeapon(f.duel, 'tesla', true, f.rival), true, 'the real CPU Tesla charges');
    tick(f, .4);
    // The pulse's fixed step also ages its newly created effect by one tick.
    near(carEffect(f.state, 'disabled')?.remainingSec, 3 - DT,
      'the actual three-second pulse has consumed only its first native tick');
    equal(fireWeapon(f.duel, 'crossbow'), false, 'the real Crossbow cannot fire while disabled');
    f.duel._drive(DT); equal(f.state.boosting, false, 'the real driving path denies boost while disabled');
    const blocked = [];
    for (const seconds of [0, 3 - 2 * DT]) {
      tick(f, seconds); hud.update(f.state);
      ok(carEffect(f.state, 'disabled'), 'the native effect remains live until the full expiry');
      blocked.push(slots.map(button => ({disabled: button.disabled,
        label: button.querySelector('.combat-slot-state').textContent})));
    }
    tick(f, DT); hud.update(f.state);
    equal(carEffect(f.state, 'disabled'), null, 'the real disable expires at three seconds');
    equal(slots.map(button => button.disabled), [false, false, false, false],
      'expiry restores the native ready slot controls');
    equal(slots.map(button => button.querySelector('.combat-slot-state').textContent),
      ['READY', 'READY', 'READY', 'READY'], 'expiry restores their visible ready state');
    equal(fireWeapon(f.duel, 'crossbow'), true, 'the actual player can fire after expiry');
    f.duel._drive(DT); equal(f.state.boosting, true, 'the actual player can boost after expiry');
    equal(blocked.map(snapshot => snapshot.map(slot => slot.disabled)),
      [[true, true, true, true], [true, true, true, true]], 'every live Tesla slot is disabled in the native HUD');
    ok(blocked.every(snapshot => snapshot.every(slot => slot.label !== 'READY')),
      'a live Tesla lockout never advertises a weapon as READY');
  });
});

test('HUD recharge rings follow actual upgraded cooldowns without changing ordinary weapon timing', () => {
  const ordinary = race({enabled: false, waveThree: false, levels: {crossbow: 3}});
  fire(ordinary, 'crossbow');
  const legacyFull = ordinary.state.combat.cooldowns.crossbow;
  near(legacyFull, WEAPON_RULES.crossbow.cooldown * (1 - .15 * 3),
    'ordinary starter recharge retains its existing rule');
  withNativeHud(ordinary, (hud, slots) => {
    tick(ordinary, 2); hud.update(ordinary.state);
    equal(slots.find(button => button.dataset.combatWeapon === 'crossbow').style.getPropertyValue('--ready-angle'),
      `${Math.round(360 * 2 / legacyFull)}deg`, 'ordinary HUD progress follows that unchanged recharge');
  });
  const f = race({levels: {tesla: 3}, loadout: ['tesla', 'crossbow', 'decoy', 'nitro']});
  fire(f, 'tesla');
  const full = 18 / 1.15 ** 3;
  near(f.state.combat.cooldowns.tesla, full, 'native upgraded Tesla uses the divided recharge');
  withNativeHud(f, (hud, slots) => {
    const button = slots[0]; hud.update(f.state);
    equal(button.style.getPropertyValue('--ready-angle'), '0deg', 'the newly fired ring starts empty');
    tick(f, 2); hud.update(f.state);
    equal(button.querySelector('.combat-slot-state').textContent,
      `${Math.ceil(f.state.combat.cooldowns.tesla)}s`, 'the slot countdown uses its actual remaining cooldown');
    equal(button.style.getPropertyValue('--ready-angle'), `${Math.round(360 * 2 / full)}deg`,
      'the native level-three Tesla ring shows two seconds of its actual recharge');
  });
});

test('player Mortar selects the nearest enemy ahead by ground distance, not forward gap alone', () => {
  const f = race({gap: 1}); f.rival.lateral = f.rival.prevLateral = 10;
  const nearer = {...f.rival, s: 507, prevS: 507, lateral: 0, prevLateral: 0};
  f.state.opponents.push(nearer);
  equal(f.duel.course.roadHalfWidthAt(500), 20, 'both candidates are inside the legal twenty-metre half-width');
  ok(Math.hypot(1, 10) > 7, 'the one-metre-forward enemy is farther away across the ground');
  fire(f, 'mortar');
  equal(f.state.combat.mortarShells[0]?.targetId, targetIdentity(f.duel, nearer),
    'the actual player Mortar commits the nearest ahead enemy across the ground');
});

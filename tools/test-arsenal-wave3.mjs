import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {fireWeapon} from '../src/combat-weapons.js';
import {stepCombat, clearArsenalState} from '../src/combat.js';
import {carEffect, carTopSpeed} from '../src/arsenal/car-effects.js';
import {targetFor, targetIdentity} from '../src/arsenal/targeting.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {vehicleContactModifiers} from '../src/vehicle-contact-modifiers.js';
import {createProfile} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {getProfileWeapons, purchaseArsenalWeapon, purchaseWeaponUpgrade,
  rewardArsenalWeapon, normalizeWeapons} from '../src/weapon-upgrades.js';

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

function race({enabled = true, gap = 50, difficulty = 'easy', flat = true} = {}) {
  const duel = new Duel({seed: 3003, featureFlags: createFeatureFlags({storage: null,
    qa: true, overrides: {arsenal: enabled}})});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', driverId: 'club',
    discoveredGate: true, arsenalRank: 30, opponentCount: 1,
    seed: 3003, cpuDifficulty: difficulty});
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
  const options = {arsenalEnabled: true, wastelandEnabled: true};
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

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {CARS, DRIVE} from '../src/config.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {point, velocity, predictedPoint, fireWeapon} from '../src/combat-weapons.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {hazardsFor, addHazard, stepHazards} from '../src/arsenal/hazards.js';
import {carEffect, carGrip} from '../src/arsenal/car-effects.js';
import {targetFor, targetIdentity} from '../src/arsenal/targeting.js';
import {createCombatScene} from '../src/combat-scene.js';
import {pilotStep, arenaCarSpec} from '../src/arena/arena-pilot.js';
import {arenaFloorSpeed} from '../src/arena/venues.js';
import {createProfile, createPlayerRegistry, createPlayer, savePlayers, loadPlayers, PLAYERS_KEY} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {WEAPON_IDS, ARSENAL_WEAPONS, getProfileWeapons, normalizeWeapons, implementedArsenalWeapons} from '../src/weapon-upgrades.js';
import {normalizeCarLoadout} from '../src/car-loadout.js';

// ARS-01 tests first. Existing native entry points expose the unknown-weapon
// failure without importing future modules. Memory storage belongs to this process.
// Claude settled owner grace at 1 s and hard-away input at abs(steer) >= .6.
// Away steering accumulates .5 s even across pauses. Native launch preconditions
// keep downstream results honest until Source lands. Browser/audio remain separate.
const DT = 1 / 120, EPS = 1e-7, SEED = 1989;
const failures = [];
let checks = 0;
function check(name, run) {checks++; try {run();} catch (error) {failures.push(name + ': ' + error.message);}}
const near = (a, b, label) => assert.ok(Math.abs(a - b) < EPS, label + ': ' + a + ' versus ' + b);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const flags = enabled => createFeatureFlags({storage: null, qa: true,
  overrides: {wasteland2: true, scrapdome: true, arsenal: enabled !== false}});
function place(actor, s, lateral = 0, headingError = 0, speedMph = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral, headingError,
    speedMph, yawVelocity: 0, pushVelocity: 0, slipAngle: 0, impactTimer: 0,
    airHeight: 0, prevAirHeight: 0, airborne: false, combatShield: 0, contactCooldown: 0});
}
function atRelative(duel, actor, owner, metres, degrees = 0) {
  const from = point(duel, owner), heading = from.heading + (owner.headingError || 0) + degrees * Math.PI / 180;
  const at = duel.course.nearest(from.x + Math.sin(heading) * metres,
    from.z + Math.cos(heading) * metres, owner.s);
  place(actor, at.s, at.lateral, from.heading - duel.course.at(at.s).heading);
}
function race({arena = false, enabled = true, discovered = true, difficulty = 'hard', levels = {}} = {}) {
  const duel = new Duel({seed: SEED, featureFlags: flags(enabled)});
  const options = {car: 'falcone_f42', driverId: 'club', seed: SEED, difficulty: 'casual',
    cpuDifficulty: difficulty, arsenalRank: 6, weaponLevels: levels,
    weaponLoadout: ['harpoon', 'caltrops', 'oil', 'smoke']};
  if (arena) assert.equal(duel.startArenaEvent({...options,
    opponents: [{car: 'dusthawk_rally', driverId: 'club', brain: 'gunner'}]}), true);
  else duel.startCampaign({...options, mode: 'wasteland', discoveredGate: discovered, opponentCount: 1});
  const state = duel.state;
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  place(state, arena ? 96 : 500);
  atRelative(duel, state.rival, state, 35);
  if (arena) {
    state.arena.phase = 'fight';
    for (const p of state.arena.participants) {
      p.protectedSec = 0; p.reactionSec = Infinity; p.targetHeldSec = -100; p.targetId = null;
      const actor = p.id === 'player' ? state : state.rival, at = point(duel, actor);
      p.goal = {x: at.x + Math.sin(at.heading) * 20, z: at.z + Math.cos(at.heading) * 20, speedMph: 0, boost: false};
    }
  }
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  return duel;
}
function equipCpu(cpu, weapon) {
  cpu.weaponLoadout = normalizeCarLoadout([weapon, 'crossbow', 'bomb', 'star'],
    [...WEAPON_IDS, ...implementedArsenalWeapons()]);
}
function tick(duel, n, observe = () => {}) {for (let i = 0; i < n; i++) {duel.step(DT); observe(i);}}
function freezePositions(duel, n) {
  const poses = [duel.state, ...duel.state.opponents].map(actor =>
    ({actor, s: actor.s, lateral: actor.lateral, headingError: actor.headingError}));
  for (let i = 0; i < n; i++) {
    duel.step(DT);
    // A stationary range fixture isolates timers/counters from road steering.
    // Armor, effects, cooldowns, steering requests and event clocks stay native.
    for (const p of poses) Object.assign(p.actor, {s: p.s, prevS: p.s, lateral: p.lateral,
      prevLateral: p.lateral, headingError: p.headingError, speedMph: 0, airHeight: 0, airborne: false});
  }
}
function hitHarpoon({playerVictim = false, arena = false, level = 0} = {}) {
  const duel = race({arena, levels: {harpoon: level}}), state = duel.state;
  const shooter = playerVictim ? state.rival : state, target = playerVictim ? state : state.rival;
  if (playerVictim) {
    place(shooter, arena ? 96 : 500, 2);
    atRelative(duel, target, shooter, 35, -3);
    equipCpu(shooter, 'harpoon');
  }
  const beforeArmor = target.armor, beforePush = target.pushVelocity;
  let hitPush = null, hitMotion = null, beforeHitVelocity = null, beforeHitPush = 0;
  duel.onChange((_state, event) => {
    if (event.arsenalCue === 'weapon.harpoon.hit' && event.actor === target) {
      hitPush = target.pushVelocity;
      const at = point(duel, target), from = point(duel, shooter);
      const heading = at.heading + (target.headingError || 0);
      hitMotion = {before: beforeHitVelocity, after: velocity(target, at), beforePush: beforeHitPush,
        heading, headingError: target.headingError || 0,
        side: Math.sign((from.x - at.x) * Math.cos(heading) - (from.z - at.z) * Math.sin(heading)) || 1};
    }
  });
  assert.equal(playerVictim ? fireWeapon(duel, 'harpoon', true, shooter) : duel.fireWeapon('harpoon'), true,
    'native discovered Harpoon fire must succeed');
  let hitTick = -1;
  for (let i = 0; i < 180; i++) {
    beforeHitVelocity = velocity(target, point(duel, target)); beforeHitPush = target.pushVelocity;
    duel.step(DT); if (carEffect(target, 'tether')) {hitTick = i; break;}
  }
  assert.ok(hitTick >= 0, 'real swept Harpoon flight must hit and tether its live target');
  return {duel, shooter, target, beforeArmor, beforePush, hitPush, hitMotion, effect: carEffect(target, 'tether')};
}
function dropCaltrops({playerVictim = false, arena = false, level = 0} = {}) {
  const duel = race({arena, levels: {caltrops: level}}), owner = playerVictim ? duel.state.rival : duel.state;
  const target = playerVictim ? duel.state : duel.state.rival;
  if (playerVictim) {place(owner, arena ? 96 : 500); equipCpu(owner, 'caltrops');}
  atRelative(duel, target, owner, -3);
  const armor = target.armor;
  assert.equal(playerVictim ? fireWeapon(duel, 'caltrops', true, owner) : duel.fireWeapon('caltrops'), true,
    'native discovered Caltrops fire must succeed');
  const hazard = hazardsFor(duel).find(h => h.kind === 'caltrops');
  assert.ok(hazard, 'native Caltrops creates a real registered strip');
  place(owner, owner.s + 100, 0); // Remove the deployer body, never manufacture hazard motion.
  stepHazards(duel, DT);
  return {duel, owner, target, hazard, armor};
}

for (const weapon of ['harpoon', 'caltrops']) {
  check('native discovered launch and gates: ' + weapon, () => {
    const duel = race(); assert.equal(duel.fireWeapon(weapon), true, 'native new weapon launch succeeds');
    assert.ok(duel.state.weaponLoadout.includes(weapon), 'actual campaign normalization retains the implemented equipped weapon');
    assert.equal(duel.fireWeapon(weapon), false, 'native recharge prevents an immediate repeated use');
    for (const options of [{enabled: false}, {discovered: false}])
      assert.equal(race(options).fireWeapon(weapon), false, 'real discovery/switch gate blocks the new weapon');
  });
}
check('Harpoon launch inherits the full thrower velocity and leads a moving car at 70 m/s', () => {
  const duel = race(), owner = duel.state, target = owner.rival;
  owner.speedMph = 30; owner.pushVelocity = 3;
  target.speedMph = 20; target.headingError = Math.PI / 2;
  const at = point(duel, owner), carry = velocity(owner, at), actual = point(duel, target);
  assert.equal(duel.fireWeapon('harpoon'), true, 'native leading Harpoon launches');
  const shot = owner.combat.projectiles.find(p => p.kind === 'harpoon'); assert.ok(shot, 'native launch creates its flight product');
  const launch = {x: shot.vx - carry.x, z: shot.vz - carry.z};
  near(Math.hypot(launch.x, launch.z), 70, 'relative launch speed is the literal 70 m/s');
  const gap = Math.hypot(actual.x - at.x, actual.z - at.z), lead = predictedPoint(duel, target, gap / 70);
  const bearing = Math.atan2(launch.x, launch.z), error = to => Math.abs(Math.atan2(
    Math.sin(Math.atan2(to.x - at.x, to.z - at.z) - bearing), Math.cos(Math.atan2(to.x - at.x, to.z - at.z) - bearing)));
  assert.ok(error(lead) < error(actual), 'launch aims toward native predicted motion rather than the old position');
});
check('Harpoon literal 50 m range stays50 m even with thrower velocity', () => {
  const duel = race(), owner = duel.state, target = owner.rival;
  owner.speedMph = 100; atRelative(duel, target, owner, 70);
  const armor = target.armor, origin = point(duel, owner);
  assert.equal(duel.fireWeapon('harpoon'), true, 'player can launch its real Harpoon');
  const shot = owner.combat.projectiles.find(p => p.kind === 'harpoon'); assert.ok(shot, 'native flight product exists');
  let farthest = 0;
  for (let i = 0; i < 180 && owner.combat.projectiles.includes(shot); i++) {
    stepProjectiles(duel, DT); farthest = Math.max(farthest, Math.hypot(shot.x - origin.x, shot.z - origin.z));
  }
  assert.ok(farthest <= 50 + Math.hypot(shot.vx, shot.vz) * DT + 3,
    'native flight terminates at literal 50 m, allowing one swept tick and the existing muzzle offset');
  assert.equal(target.armor, armor, 'inherited car speed never extends Harpoon damage to the 70 m victim');
  assert.equal(owner.combat.projectiles.includes(shot), false, 'out-of-range native projectile is retired');
});
check('Harpoon guidance never steers outside its 4 degree launch cone', () => {
  const duel = race(); assert.equal(duel.fireWeapon('harpoon'), true, 'native guided Harpoon launches');
  const shot = duel.state.combat.projectiles.find(p => p.kind === 'harpoon'); assert.ok(shot, 'native projectile exists');
  const initial = Math.atan2(shot.vx, shot.vz); place(duel.state.rival, duel.state.rival.s, 12);
  let largest = 0;
  for (let i = 0; i < 40 && duel.state.combat.projectiles.includes(shot); i++) {
    stepProjectiles(duel, DT); const angle = Math.atan2(shot.vx, shot.vz);
    largest = Math.max(largest, Math.abs(Math.atan2(Math.sin(angle - initial), Math.cos(angle - initial))));
  }
  assert.ok(largest > 0, 'genuine guidance turns toward a moving target');
  assert.ok(largest <= 4 * Math.PI / 180 + EPS, 'guidance respects the settled 4 degree cone');
});
for (const level of [0, 3]) check('Harpoon native armor, sideways yank and fixed tether duration at level ' + level, () => {
  const r = hitHarpoon({level});
  near(r.beforeArmor - r.target.armor, 6 * (1 + .15 * level), 'named Harpoon armor source scales damage by existing 15% levels');
  assert.notEqual(r.hitPush, null, 'actual hit event samples the native impulse before driving');
  const impulse = {x: r.hitMotion.after.x - r.hitMotion.before.x,
    z: r.hitMotion.after.z - r.hitMotion.before.z};
  near(Math.hypot(impulse.x, impulse.z), 6, 'actual native world impulse has the literal 6 m/s magnitude');
  near(impulse.x * Math.cos(r.hitMotion.heading) - impulse.z * Math.sin(r.hitMotion.heading),
    r.hitMotion.side * 6, 'all six metres per second act sideways toward the actual shooter body side');
  near(impulse.x * Math.sin(r.hitMotion.heading) + impulse.z * Math.cos(r.hitMotion.heading),
    0, 'the native yank adds no velocity along the victim nose');
  near(r.hitPush - r.hitMotion.beforePush, r.hitMotion.side * 6 * Math.cos(r.hitMotion.headingError),
    'the ordinary road scalar is the exact projection of the body-sideways impulse');
  near(r.target.pushVelocity, r.hitPush * Math.exp(-1.5 * DT),
    'the full road tick retains ordinary physical damping after the exact hit');
  assert.ok(r.effect.remainingSec <= 3 && r.effect.remainingSec >= 3 - DT - EPS, 'actual hit installs exactly 3 s of tether');
  near(r.duel.state.combat.cooldowns.harpoon + (r.duel.state.stageTimeSec), 12 / 1.15 ** level,
    'native upgraded recharge divides by 1.15 per level');
});
check('Harpoon lasts 3 s without a counter, then naturally expires', () => {
  const r = hitHarpoon({playerVictim: true}), left = carEffect(r.target, 'tether').remainingSec;
  freezePositions(r.duel, Math.floor((left - .05) / DT));
  assert.ok(carEffect(r.target, 'tether'), 'native tether persists before its fixed deadline');
  freezePositions(r.duel, 8); assert.equal(carEffect(r.target, 'tether'), null, 'native timed tether expires at 3 s');
});
for (const reason of ['shield', 'target-wreck', 'shooter-wreck', 'separation']) check('Harpoon real early-break counter: ' + reason, () => {
  const r = hitHarpoon();
  if (reason === 'shield') {
    equipCpu(r.target, 'star'); assert.equal(fireWeapon(r.duel, 'star', true, r.target), true, 'actual Star Shield rises');
  } else if (reason === 'separation') {
    place(r.shooter, r.target.s - 100);
    assert.ok(Math.hypot(point(r.duel, r.shooter).x - point(r.duel, r.target).x,
      point(r.duel, r.shooter).z - point(r.duel, r.target).z) > 60, 'native current poses exceed 60 m');
  } else {
    const victim = reason === 'target-wreck' ? r.target : r.shooter; victim.armor = 1;
    assert.equal(applyArmorDamage(r.duel, victim, 'crossbow', {owner: victim === r.shooter ? 'cpu' : 'player'}), 1,
      'actual owned armor hit creates the relevant wreck');
    assert.equal(victim.combatWrecking, true);
  }
  r.duel.step(DT); assert.equal(carEffect(r.target, 'tether'), null, 'real ' + reason + ' immediately breaks the tether');
});
check('Harpoon full steering away breaks after half a second accumulated', () => {
  const r = hitHarpoon({playerVictim: true}), target = r.target;
  const shooterAt = point(r.duel, r.shooter), at = point(r.duel, target);
  const side = Math.sign((shooterAt.x - at.x) * Math.cos(at.heading) - (shooterAt.z - at.z) * Math.sin(at.heading));
  assert.notEqual(side, 0, 'real shooter has a definite side');
  target.steerVisual = side; r.duel.setInput({throttle: 0, brake: 0, steer: side, boost: false});
  freezePositions(r.duel, 59); assert.ok(carEffect(target, 'tether'), '59 native 120 Hz ticks are less than half a second');
  freezePositions(r.duel, 1); assert.equal(carEffect(target, 'tether'), null, '60 full-away native ticks break the tether');
});
for (const boundary of ['inclusive', 'below', 'toward', 'noncontinuous']) {
  check('Harpoon native hard-away steering boundary: ' + boundary, () => {
    const r = hitHarpoon({playerVictim: true}), target = r.target;
    const shooterAt = point(r.duel, r.shooter), at = point(r.duel, target);
    const heading = at.heading + (target.headingError || 0);
    const awayInputSign = Math.sign((shooterAt.x - at.x) * Math.cos(heading) -
      (shooterAt.z - at.z) * Math.sin(heading));
    assert.notEqual(awayInputSign, 0, 'native shooter occupies a definite side of the target');
    // Native driving maps positive steering to negative yaw: this sign turns
    // away from the shooter. Send actual inputs, never inject a tether counter.
    const steer = value => r.duel.setInput({throttle: 0, brake: 0,
      steer: awayInputSign * value, boost: false});
    if (boundary === 'below' || boundary === 'toward') {
      steer(boundary === 'below' ? .5999 : -.6);
      freezePositions(r.duel, 60);
      assert.ok(carEffect(target, 'tether'),
        'below-threshold or toward-shooter input does not satisfy the half-second break');
    } else if (boundary === 'inclusive') {
      steer(.6); freezePositions(r.duel, 59);
      assert.ok(carEffect(target, 'tether'), 'inclusive .6 input stays tethered before .5 s');
      freezePositions(r.duel, 1);
      assert.equal(carEffect(target, 'tether'), null, 'inclusive .6 input breaks at .5 s');
    } else {
      steer(.6); freezePositions(r.duel, 30);
      steer(0); freezePositions(r.duel, 20);
      assert.ok(carEffect(target, 'tether'), 'neutral interval does not complete the counter');
      steer(.6); freezePositions(r.duel, 29);
      assert.ok(carEffect(target, 'tether'), '59 total away ticks remain below .5 s');
      freezePositions(r.duel, 1);
      assert.equal(carEffect(target, 'tether'), null, 'separated away intervals accumulate to .5 s');
    }
  });
}
for (const arena of [false, true]) {
  check('Caltrops native owner grace is the first second: ' + (arena ? 'arena' : 'road'), () => {
    const duel = race({arena}), owner = duel.state, armor = owner.armor;
    assert.equal(duel.fireWeapon('caltrops'), true, 'native owner drops its actual Caltrops');
    const hazard = hazardsFor(duel).find(h => h.kind === 'caltrops');
    assert.ok(hazard, 'native drop registers a real strip');
    near(hazard.ownerGraceSec, 1, 'settled owner grace is exactly 1 s');
    const at = duel.course.nearest(hazard.x, hazard.z, owner.s);
    place(owner, at.s, at.lateral);
    place(owner.rival, owner.s + 100);
    stepHazards(duel, .99);
    assert.equal(owner.armor, armor, 'overlapping owner loses no armor during its first second');
    assert.equal(carEffect(owner, 'grip'), null, 'grace also prevents owner grip loss');
    stepHazards(duel, .01);
    near(armor - owner.armor, 4, 'owner contact at exactly 1 s applies ordinary Caltrops damage');
    near(carGrip(owner), .75, 'owner receives ordinary Caltrops control after grace');
    const hitArmor = owner.armor;
    stepHazards(duel, DT);
    assert.equal(owner.armor, hitArmor, 'grace never consumes or repeats the once-per-body contact');
  });
}
check('Harpoon shield counter prevents both real armor loss and tether', () => {
  const duel = race(), target = duel.state.rival, armor = target.armor;
  equipCpu(target, 'star'); assert.equal(fireWeapon(duel, 'star', true, target), true, 'native target raises its actual shield');
  assert.equal(duel.fireWeapon('harpoon'), true, 'native player launches toward the shield'); tick(duel, 150);
  assert.equal(target.armor, armor, 'shield preserves target armor'); assert.equal(carEffect(target, 'tether'), null, 'shield blocks the tether');
});
check('real Smoke blocks Harpoon CPU acquisition and in-flight homing', () => {
  const duel = race(), owner = duel.state, cpu = owner.rival; equipCpu(cpu, 'harpoon');
  const a = point(duel, owner), b = point(duel, cpu);
  assert.equal(duel.fireWeapon('harpoon'), true, 'native player launches before the cloud');
  const shot = owner.combat.projectiles.find(p => p.kind === 'harpoon'); assert.ok(shot);
  addHazard(duel, {kind: 'smoke', shape: 'circle', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2,
    radius: 6, lifetime: 5, owner});
  place(cpu, cpu.s, 4); const initial = {vx: shot.vx, vz: shot.vz}; stepProjectiles(duel, DT);
  near(shot.vx, initial.vx, 'smoke stops actual guided lateral velocity'); near(shot.vz, initial.vz, 'smoke stops actual guided forward velocity');
  assert.equal(targetFor(duel, cpu, {range: 50}), null, 'native shared targeting sees the actual cloud');
  assert.equal(fireWeapon(duel, 'harpoon', true, cpu), false, 'CPU never fires an aimed Harpoon blind');
});
check('native Harpoon guidance retains real identity and redirects only to live decoy DATA', () => {
  const duel = race(), original = duel.state.rival;
  assert.equal(duel.fireWeapon('harpoon'), true, 'real lock-on launch succeeds');
  const shot = duel.state.combat.projectiles.find(p => p.kind === 'harpoon'); assert.ok(shot);
  const lockedId = targetIdentity(duel, original);
  const nearer = {...original, id: 'wave-one-nearer', decoy: false, s: duel.state.s + 15};
  duel.state.opponents.push(nearer); stepProjectiles(duel, DT);
  assert.equal(shot.targetId, lockedId, 'a launched shot never switches to a nearer real car');
  // Shared transient DATA contract from ARS-CORE, not a playable Drone stub.
  const decoy = {...original, id: 'wave-one-decoy-data', ownerId: lockedId, active: true,
    decoy: true, expiresAt: duel.state.stageTimeSec + 5, s: duel.state.s + 25, lateral: 2};
  duel.state.opponents.push(decoy); stepProjectiles(duel, DT);
  assert.equal(shot.targetId, decoy.id, 'native flight uses the existing range-limited hostile decoy selector');
});
for (const level of [0, 3]) check('Caltrops real strip, once-per-body damage and fixed control at level ' + level, () => {
  const r = dropCaltrops({level});
  assert.equal(r.hazard.shape, 'strip'); near(r.hazard.length, 8, 'literal 8 m strip length'); near(r.hazard.width, 5, 'literal 5 m width'); near(r.hazard.lifetime, 8, 'literal 8 s lifetime');
  near(r.armor - r.target.armor, 4 * (1 + .15 * level), 'named Caltrops armor source scales damage');
  const effect = carEffect(r.target, 'grip'); assert.ok(effect, 'native strip contacts the full car body');
  near(effect.remainingSec, 4, 'Caltrops control lasts exactly 4 s'); near(carGrip(r.target), .75, 'Caltrops multiplies grip by 0.75');
  const armor = r.target.armor; stepHazards(r.duel, DT); assert.equal(r.target.armor, armor, 'remaining overlap never repeats damage');
  place(r.target, r.target.s + 30); stepHazards(r.duel, DT); const at = r.duel.course.nearest(r.hazard.x, r.hazard.z, r.target.s);
  place(r.target, at.s, at.lateral); stepHazards(r.duel, DT); assert.equal(r.target.armor, armor, 'exit and re-entry never repeats this strip');
  near(r.duel.state.combat.cooldowns.caltrops, 9 / 1.15 ** level, 'actual recharge divides by 1.15 per level');
});
check('Caltrops drops 3 m behind its actual rotated owner', () => {
  const duel = race(); duel.state.headingError = Math.PI / 3; const at = point(duel, duel.state), heading = at.heading + duel.state.headingError;
  assert.equal(duel.fireWeapon('caltrops'), true, 'native rotated drop succeeds');
  const strip = hazardsFor(duel).find(h => h.kind === 'caltrops'); assert.ok(strip);
  near(strip.x, at.x - Math.sin(heading) * 3, 'rear 3 m x'); near(strip.z, at.z - Math.cos(heading) * 3, 'rear 3 m z'); near(strip.heading, heading, 'native strip follows owner heading');
});
check('Caltrops steering-around counter avoids actual body contact', () => {
  const duel = race(), target = duel.state.rival; atRelative(duel, target, duel.state, -3);
  target.lateral += 8; const armor = target.armor;
  assert.equal(duel.fireWeapon('caltrops'), true, 'native strip drops next to the separate lane');
  tick(duel, 3); assert.equal(target.armor, armor, 'going around the 5 m strip preserves armor'); assert.equal(carEffect(target, 'grip'), null, 'going around avoids grip loss');
});
check('a second genuine Caltrops strip refreshes 4 s rather than stacking control', () => {
  const r = dropCaltrops(); freezePositions(r.duel, 120); assert.ok(carEffect(r.target, 'grip').remainingSec < 4);
  const targetAt = point(r.duel, r.target), at = r.duel.course.nearest(targetAt.x + Math.sin(targetAt.heading) * 3,
    targetAt.z + Math.cos(targetAt.heading) * 3, r.target.s);
  place(r.duel.state, at.s, at.lateral); r.duel.state.combat.cooldowns.caltrops = 0; // Distinct-deployment fixture; recharge is tested separately.
  assert.equal(r.duel.fireWeapon('caltrops'), true, 'second native launch creates a distinct strip');
  const before = r.target.armor; stepHazards(r.duel, DT);
  near(before - r.target.armor, 4, 'new strip gets its own single damage entitlement');
  near(carEffect(r.target, 'grip').remainingSec, 4, 'new contact refreshes the authored 4 s'); near(carGrip(r.target), .75, 'two strips never multiply grip into a stacked penalty');
});
check('native Caltrops expires at 8 s and its grip recovers at 4 s', () => {
  const r = dropCaltrops(); freezePositions(r.duel, 481);
  assert.equal(carEffect(r.target, 'grip'), null, 'native car effect recovers after 4 s'); assert.equal(carGrip(r.target), 1);
  freezePositions(r.duel, 480); assert.equal(hazardsFor(r.duel).includes(r.hazard), false, 'native strip expires after 8 s');
});

for (const weapon of ['harpoon', 'caltrops']) for (const role of ['player', 'road-cpu', 'arena-cpu']) check(weapon + ' top-speed cap is read by real ' + role + ' driving', () => {
  const arena = role === 'arena-cpu', playerVictim = role === 'player';
  const r = weapon === 'harpoon' ? hitHarpoon({playerVictim, arena}) : dropCaltrops({playerVictim, arena});
  const actor = r.target, duel = r.duel, control = race({arena}), other = playerVictim ? control.state : control.state.rival;
  const spec = arenaCarSpec(duel, actor), scale = weapon === 'harpoon' ? .8 : .9;
  const baseCap = arena ? arenaFloorSpeed(duel.course.def.scrapdome, spec.topSpeed) : spec.topSpeed;
  // Independent review: .05 above the cap saturated both road brake branches.
  // Five mph exposes the native literal ceiling after one ordinary brake tick.
  const initial = baseCap * scale + (role === 'road-cpu' ? 5 : .05);
  for (const [d, target] of [[duel, actor], [control, other]]) {
    place(target, arena ? 96 : 500, 0, 0, initial);
    target.gear = CARS[target.car].gears.length - 1;
    if (role === 'player') {d.setInput({throttle: 1, brake: 0, steer: 0, boost: false}); d._drive(DT);}
    else if (arena) {const at = point(d, target); pilotStep(d, target,
      {x: at.x + Math.sin(at.heading) * 20, z: at.z + Math.cos(at.heading) * 20, speedMph: baseCap, boost: false}, DT);}
    else d._rival(DT, target);
  }
  assert.ok(actor.speedMph < other.speedMph - 1e-6, 'live effect lowers the native speed ceiling response versus the identical unhit consumer');
  if (role === 'road-cpu') near(actor.speedMph, baseCap * scale,
    'road CPU respects the literal effect ceiling while the control remains above it');
  if (arena) assert.ok(actor.speedMph <= baseCap * scale + EPS, 'arena pilot clamps at the literal scaled floor ceiling');
});

for (const [weapon, cases] of [
  ['oil', [[-29, 0, true], [-31, 0, false], [20, 0, false], [-20, 30, false]]],
  ['smoke', [[-49, 0, true], [-51, 0, false], [20, 0, false]]],
  ['harpoon', [[15.5, 0, true], [49.5, 0, true], [14.5, 0, false], [50.5, 0, false], [30, 4.5, true], [30, 5.5, false], [30, -4.5, true], [30, -5.5, false]]],
  ['caltrops', [[-39, 0, true], [-41, 0, false], [20, 0, false], [-20, 45, true]]],
]) check('native CPU uses ' + weapon + ' only at its settled positional conditions', () => {
  for (const [metres, angle, expected] of cases) {
    const duel = race(), cpu = duel.state.rival; equipCpu(cpu, weapon);
    place(cpu, 500); atRelative(duel, duel.state, cpu, metres, angle);
    if (weapon === 'smoke') assert.ok(applyArmorDamage(duel, cpu, 'crossbow', {owner: 'player'}) > 0, 'real damage makes the recent-hit condition');
    const events = []; duel.onChange((_, event) => events.push(event));
    duel.state.combat.aiTimer = 0; duel.state.combat.aiTurn = 0; stepCombatAI(duel, DT);
    const used = weapon === 'harpoon' ? duel.state.combat.projectiles.some(p => p.kind === weapon && p.enemy) :
      hazardsFor(duel).some(h => h.kind === weapon && h.owner === cpu);
    assert.equal(used, expected, weapon + ' native scheduled use at ' + metres + ' m/' + angle + ' degrees');
    if (used) assert.ok(events.some(e => e.weaponFired === weapon || e.arsenalCue === 'weapon.' + weapon + '.deploy'), 'real use supplies an attributable event');
  }
});
check('native Smoke computer condition requires a real hit in the last 5 s', () => {
  for (const recent of [false, true]) {
    const duel = race(), cpu = duel.state.rival; place(cpu, 500); atRelative(duel, duel.state, cpu, -30); equipCpu(cpu, 'smoke');
    if (recent) {applyArmorDamage(duel, cpu, 'crossbow', {owner: 'player'}); duel.state.stageTimeSec += 5 + DT;}
    duel.state.combat.aiTimer = 0; stepCombatAI(duel, DT);
    assert.equal(hazardsFor(duel).some(h => h.kind === 'smoke'), false, 'missing or expired native damage never qualifies defensive smoke');
  }
});
check('real seeded CPU loadouts admit both new wave-one weapons without extra control slots', () => {
  const found = new Set();
  for (const difficulty of ['easy', 'medium', 'hard']) for (let seed = SEED; seed < SEED + 8; seed++) {
    const duel = race({difficulty}); duel.startCampaign({mode: 'wasteland', discoveredGate: true,
      arsenalRank: 6, seed, cpuDifficulty: difficulty, opponentCount: 3});
    for (const cpu of duel.state.opponents) {
      const ids = cpu.weaponLoadout; assert.equal(ids.length, 4); assert.equal(new Set(ids).size, 4);
      assert.ok(ids.some(id => id === 'crossbow' || ARSENAL_WEAPONS[id]?.cpuRole === 'front'), 'every real CPU retains front damage');
      assert.ok(ids.filter(id => ['ufo', 'star', 'oil', 'smoke'].includes(id)).length <= 2, 'at most two settled defensive/control weapons');
      ids.forEach(id => found.add(id));
    }
  }
  assert.ok(found.has('harpoon') && found.has('caltrops'), 'bounded real rank-six fields actually assign both implemented wave-one weapons');
});

function withApp(options, run) {
  const names = ['localStorage', 'cancelAnimationFrame'], previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const rows = new Map();
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: key => rows.get(String(key)) ?? null, setItem: (key, value) => rows.set(String(key), String(value)), removeItem: key => rows.delete(String(key))}});
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {configurable: true, value: () => {}});
  const profile = createProfile(); profile.credits = 9000;
  let xp = 0; for (let rank = 1; rank < (options.rank || 6); rank++) xp += 400 + 150 * (rank - 1);
  profile.wasteland = normalizeWasteland({...profile.wasteland, discoveredGate: options.discovered !== false, xp, scrap: 4000,
    weapons: {unlocked: [...WEAPON_IDS, ...(options.owned || []), 'future-wave'], levels: {'future-wave': 9}, extra: {keep: 7}},
    loadout: ['future-wave', 'crossbow', 'bomb', 'star'], futureNote: {keep: true}});
  let registry = createPlayerRegistry(profile); registry.players[0].id = 'wave-one'; registry.players[0].name = 'Wave One';
  registry = createPlayer(registry, 'Wave Two').registry; registry.players[1].id = 'wave-two'; registry.activePlayerId = 'wave-one';
  assert.equal(savePlayers(registry, globalThis.localStorage), true);
  let app;
  try {app = new App(); app.duel.featureFlags = flags(options.enabled); app.audio.unlock = () => {}; return run(app, rows);}
  finally {app?.dispose(); names.forEach((name, i) => {if (previous[i]) Object.defineProperty(globalThis, name, previous[i]); else delete globalThis[name];});}
}
for (const [weapon, rank] of [['harpoon', 3], ['caltrops', 5]]) {
  check('actual memory-only App purchase/equip/upgrade preserves ownership: ' + weapon, () => withApp({rank}, (app, rows) => {
    const other = structuredClone(loadPlayers().players[1]), input = app.profile, before = structuredClone(input);
    assert.equal(app.purchaseArsenalWeapon(weapon).ok, true, 'native Armory buys the implemented weapon at its settled rank');
    assert.deepEqual(input, before, 'purchase leaves its raw input immutable'); assert.equal(app.profile.wasteland.scrap, 3600);
    assert.equal(app.equipCarWeapon(1, weapon).ok, true); assert.equal(app.profile.wasteland.loadout[0], 'future-wave');
    for (const [level, cost] of [[1, 150], [2, 300], [3, 600]]) {
      const scrap = app.profile.wasteland.scrap; assert.equal(app.purchaseWeapon(weapon).ok, true);
      assert.equal(getProfileWeapons(app.profile).levels[weapon], level); assert.equal(app.profile.wasteland.scrap, scrap - cost);
    }
    const saved = rows.get(PLAYERS_KEY); assert.equal(app.purchaseWeapon(weapon).ok, false); assert.equal(rows.get(PLAYERS_KEY), saved);
    assert.deepEqual(loadPlayers().players[1], other); assert.equal(getProfileWeapons(app.profile).levels['future-wave'], 9);
    assert.equal(app.profile.wasteland.weapons.extra.keep, 7); assert.equal(app.selectPlayer('wave-two'), true);
    assert.equal(getProfileWeapons(app.profile).unlocked.includes(weapon), false); assert.equal(app.equipCarWeapon(1, weapon).ok, false);
  }));
  check('unearned/gated App purchase stays unavailable: ' + weapon, () => {
    for (const options of [{rank: rank - 1}, {rank, discovered: false}, {rank, enabled: false}]) withApp(options, (app, rows) => {
      const before = rows.get(PLAYERS_KEY); assert.equal(app.purchaseArsenalWeapon(weapon).ok, false); assert.equal(rows.get(PLAYERS_KEY), before);
    });
    assert.equal(normalizeWeapons({levels: {[weapon]: 3}}).unlocked.includes(weapon), false, 'normalization never grants a weapon from its level alone');
  });
}
for (const weapon of ['harpoon', 'caltrops']) for (const fps of [30, 60, 144]) check('production App ' + weapon + ' replay repeats at ' + fps + ' frame cadence', () => {
  const replay = cadence => withApp({owned: ['harpoon', 'caltrops']}, app => {
    assert.equal(app.equipCarWeapon(1, weapon).ok, true, 'real owned loadout can equip the implemented weapon');
    app.startCampaign({mode: 'wasteland', car: 'falcone_f42', seed: SEED, difficulty: 'casual', cpuDifficulty: 'hard', opponentCount: 1});
    const duel = app.duel; Object.assign(duel.state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
    duel.state.combat.aiTimer = duel.state.combat.pickupTimer = Infinity;
    place(duel.state, 500); atRelative(duel, duel.state.rival, duel.state, weapon === 'harpoon' ? 35 : -3);
    assert.equal(duel.fireWeapon(weapon), true, 'native implemented weapon starts the replay'); app.runId = 'wave-one-cadence';
    app.advance(2, 1 / cadence); return digest({state: duel.state, hazards: hazardsFor(duel).map(({owner, onTouch, ...h}) => h),
      effects: [duel.state, ...duel.state.opponents].map(actor => ['tether', 'grip'].map(id => carEffect(actor, id)))});
  });
  assert.equal(replay(fps), replay(60), 'actual App input/accumulator yields identical seeded simulation, hazards and effects');
});
for (const weapon of ['harpoon', 'caltrops']) for (const transition of ['stage', 'menu'])
  check('real lifecycle clears active ' + weapon + ' transients: ' + transition, () => {
    const r = weapon === 'harpoon' ? hitHarpoon() : dropCaltrops(), old = r.target;
    const kind = weapon === 'harpoon' ? 'tether' : 'grip'; assert.ok(carEffect(old, kind));
    if (transition === 'stage') r.duel.startCampaign({mode: 'wasteland', discoveredGate: true}); else r.duel.emit({menu: true});
    assert.deepEqual(hazardsFor(r.duel), []); assert.equal(carEffect(old, kind), null, 'real stage/menu boundary retires the previous car effect');
  });
check('genuine repeated Caltrops launches retain at most 24 native hazards', () => {
  const duel = race();
  for (let i = 0; i < 27; i++) {
    duel.state.combat.cooldowns.caltrops = 0; // Deployment fixture; native recharge has separate acceptance.
    assert.equal(duel.fireWeapon('caltrops'), true, 'actual native launch creates each bounded hazard');
  }
  assert.equal(hazardsFor(duel).length, 24, 'native registry evicts old products at its settled 24 cap');
});
check('native scene draws the cable between current cars and disposes its pooled resources', () => {
  const r = hitHarpoon(), scene = createCombatScene(), resources = new Set(), pooled = [];
  let disposed = 0;
  try {
    scene.update(r.duel); const ends = [];
    scene.group.traverse(node => {
      if (!node.isMesh || !node.userData.arsenalTether) return;
      const geometry = node.geometry, positions = geometry?.attributes.position;
      const {radialSegments: radial, tubularSegments: tubular, closed} = geometry?.parameters || {};
      assert.equal(geometry?.type, 'TubeGeometry', 'the actual drawn cable has tube geometry');
      assert.ok(Number.isInteger(radial) && radial >= 3 && Number.isInteger(tubular) && tubular > 0);
      assert.equal(closed, false, 'the cable has two real attachment ends');
      assert.equal(positions.count, (tubular + 1) * (radial + 1));
      pooled.push({node, geometry, positions, array: positions.array});
      resources.add(geometry); resources.add(node.material);
      if (!node.visible) return;
      for (let parent = node.parent; parent; parent = parent.parent) if (!parent.visible) return;
      node.updateWorldMatrix(true, false);
      const terminal = ring => {
        let x = 0, y = 0, z = 0;
        for (let vertex = 0; vertex < radial; vertex++) {
          const index = ring * (radial + 1) + vertex;
          x += positions.getX(index); y += positions.getY(index); z += positions.getZ(index);
        }
        x /= radial; y /= radial; z /= radial;
        const m = node.matrixWorld.elements;
        return {x: m[0]*x+m[4]*y+m[8]*z+m[12], y: m[1]*x+m[5]*y+m[9]*z+m[13],
          z: m[2]*x+m[6]*y+m[10]*z+m[14]};
      };
      ends.push([terminal(0), terminal(tubular)]);
    });
    const a = point(r.duel, r.shooter), b = point(r.duel, r.target);
    const close = (p, car) => Math.hypot(p.x-car.x, p.y-car.y, p.z-car.z) < .05;
    assert.ok(ends.some(([p, q]) => close(p, a) && close(q, b) || close(q, a) && close(p, b)),
      'visible native cable centers connect the actual shooter and victim in world space');
    assert.equal(pooled.length, 4, 'the actual four-car cable pool stays bounded');
    assert.ok(ends.length <= 4, 'visible cables never exceed that pool');
    for (let update = 0; update < 10; update++) scene.update(r.duel);
    for (const row of pooled) {
      assert.equal(row.node.geometry, row.geometry, 'drawing reuses the actual geometry');
      assert.equal(row.geometry.attributes.position, row.positions, 'drawing reuses the position buffer');
      assert.equal(row.positions.array, row.array, 'drawing reuses the actual vertex storage');
    }
    for (const resource of resources) resource.addEventListener('dispose', () => disposed++);
  } finally {scene.dispose();}
  assert.ok(resources.size > 0 && disposed === resources.size, 'native scene disposes all pooled cable resources');
});
check('native rendering reuses bounded pools, draws both products and leaves simulation untouched', () => {
  const duel = race(); assert.equal(duel.fireWeapon('harpoon'), true); assert.equal(duel.fireWeapon('caltrops'), true);
  const scene = createCombatScene();
  try {
    const before = digest({state: duel.state, hazards: hazardsFor(duel).map(({owner, onTouch, ...h}) => h)});
    const counts = () => {const geometries = new Set(), materials = new Set(); scene.group.traverse(node => {
      if (node.geometry) geometries.add(node.geometry); for (const m of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) materials.add(m);}); return [geometries.size, materials.size, scene.group.children.length];};
    scene.update(duel); const initial = counts(); for (let i = 0; i < 25; i++) scene.update(duel);
    assert.deepEqual(counts(), initial, 'repeated native updates allocate no additional geometry/material/pool nodes');
    assert.equal(digest({state: duel.state, hazards: hazardsFor(duel).map(({owner, onTouch, ...h}) => h)}), before, 'renderer never mutates simulation or hazards');
    let visibleProjectile = false, visibleStrip = false;
    scene.group.traverse(node => {if (!node.isMesh || !node.visible) return; let shown = true;
      for (let p = node.parent; p; p = p.parent) shown &&= p.visible;
      if (!shown) return; const p = duel.state.combat.projectiles.find(p => p.kind === 'harpoon'), h = hazardsFor(duel).find(h => h.kind === 'caltrops');
      node.updateWorldMatrix(true, false); const position = node.matrixWorld.elements;
      visibleProjectile ||= Math.hypot(position[12] - p.x, position[14] - p.z) < 4;
      visibleStrip ||= Math.hypot(position[12] - h.x, position[14] - h.z) < 5;
    });
    assert.ok(visibleProjectile, 'native scene draws the real Harpoon flight product'); assert.ok(visibleStrip, 'native scene draws the real Caltrops strip');
  } finally {scene.dispose();}
});
// Source review: check the actual displacement in the rotated victim's frame,
// not only the existing ring-relative scalar impulse at the hit event.
for (const turn of [Math.PI / 2, -Math.PI / 2])
  check('Harpoon native world yank is sideways for victim heading ' + turn, () => {
    const duel = race({arena: true}), target = duel.state.rival;
    place(target, 131, 2, turn);
    const armor = target.armor;
    assert.equal(duel.fireWeapon('harpoon'), true, 'genuine arena launch succeeds');
    for (let i = 0; i < 180 && !carEffect(target, 'tether'); i++) stepProjectiles(duel, DT);
    assert.ok(carEffect(target, 'tether'), 'native swept projectile hits the rotated live body');
    near(armor - target.armor, 6, 'real hit removes the authored armor');
    const before = point(duel, target), shooter = point(duel, duel.state);
    const heading = before.heading + target.headingError;
    const expectedSide = Math.sign((shooter.x - before.x) * Math.cos(heading) -
      (shooter.z - before.z) * Math.sin(heading)) * 6;
    assert.equal(Math.abs(expectedSide), 6, 'shooter has a definite side in the victim frame');
    pilotStep(duel, target, {x: before.x + Math.sin(heading) * 20,
      z: before.z + Math.cos(heading) * 20, speedMph: 0, boost: false}, DT);
    const after = point(duel, target), vx = (after.x - before.x) / DT, vz = (after.z - before.z) / DT;
    const sideways = vx * Math.cos(heading) - vz * Math.sin(heading);
    const forward = vx * Math.sin(heading) + vz * Math.cos(heading);
    assert.ok(Math.abs(sideways - expectedSide) < .02 && Math.abs(forward) < .02,
      'actual first-step yank: sideways ' + sideways + ' m/s versus ' + expectedSide +
      ', forward ' + forward + ' m/s versus zero');
  });
function airborneCaltrops() {
  const duel = race(), owner = duel.state, target = duel.state.rival;
  Object.assign(owner, {airHeight: 10, prevAirHeight: 10, airborne: true});
  assert.equal(duel.fireWeapon('caltrops'), true, 'genuine airborne deployment succeeds');
  const strip = hazardsFor(duel).find(h => h.kind === 'caltrops'); assert.ok(strip);
  const at = duel.course.nearest(strip.x, strip.z, owner.s);
  const ground = duel.course.groundAt(at.s, at.lateral);
  place(target, at.s, at.lateral); const armor = target.armor;
  stepHazards(duel, DT);
  near(armor - target.armor, 4, 'ground car receives the actual strip contact');
  near(carGrip(target), .75, 'ground contact applies the settled grip loss');
  return {duel, strip, at, ground};
}
check('airborne Caltrops native anchor follows terrain at its rear deployment position', () => {
  const {duel, strip, at} = airborneCaltrops();
  near(strip.y, point(duel, {s: at.s, lateral: at.lateral, airHeight: 0}).y,
    'native strip anchor excludes the deployer flight height and samples the rear terrain');
});
check('airborne Caltrops visible spikes sit on the same terrain as their contact', () => {
  const {duel, strip, ground} = airborneCaltrops(), scene = createCombatScene();
  try {
    scene.update(duel); const bases = [];
    scene.group.traverse(node => {
      if (!node.isInstancedMesh || !node.visible) return;
      for (let parent = node.parent; parent; parent = parent.parent) if (!parent.visible) return;
      node.updateWorldMatrix(true, false); const m = node.matrixWorld.elements;
      if (Math.hypot(m[12] - strip.x, m[14] - strip.z) < .1) bases.push(m[13]);
    });
    assert.equal(bases.length, 1, 'the native scene presents one actual spike strip');
    assert.ok(Math.abs(bases[0] - ground.y) < .05,
      'visible spike base is ' + (bases[0] - ground.y) + ' m above its contacted terrain');
  } finally {scene.dispose();}
});
// Reviewed regressions use native hits and contact consumers, with no injected impulse.
import {startKnock, actorBody} from '../src/vehicle-knock.js';
import {carAlongPush} from '../src/arsenal/car-effects.js';
import {vehicleContactEnvelope} from '../src/npc-yielding.js';
import {sweepBox, sweepObstacle} from '../src/collision.js';
import {combatCrashThresholdMph} from '../src/vehicle-impact.js';
import {COMBAT_TUNING} from '../src/wasteland-tuning.js';
check('Harpoon hit immediately yanks an active native knock without a deferred duplicate', () => {
  const duel = race(), shooter = duel.state, target = shooter.rival;
  place(shooter, 500); place(target, 535, 2, Math.PI / 2);
  startKnock(target, {vx: 0, vz: 0, spin: 8, severity: 'smashed',
    heading: point(duel, target).heading + target.headingError});
  const armor = target.armor; let before, hit;
  duel.onChange((_, event) => {
    if (event.arsenalCue !== 'weapon.harpoon.hit' || event.actor !== target) return;
    const body = actorBody(duel, target), at = point(duel, target), from = point(duel, shooter);
    const heading = at.heading + target.headingError;
    hit = {active: !!target.knock, dx: body.vx - before.vx, dz: body.vz - before.vz, heading,
      side: Math.sign((from.x - at.x) * Math.cos(heading) - (from.z - at.z) * Math.sin(heading)) || 1,
      roadPush: target.pushVelocity, alongPush: carAlongPush(target)};
  });
  assert.equal(duel.fireWeapon('harpoon'), true);
  for (let i = 0; i < 180 && !carEffect(target, 'tether'); i++) {
    before = actorBody(duel, target); duel.step(DT);
  }
  assert.ok(hit?.active && carEffect(target, 'tether'), 'real hit occurs while the free body is active');
  near(armor - target.armor, 6, 'genuine active-knock hit retains armor damage');
  near(Math.hypot(hit.dx, hit.dz), 6, 'active knock receives the immediate native 6 m/s yank');
  near(hit.dx * Math.cos(hit.heading) - hit.dz * Math.sin(hit.heading), hit.side * 6, 'knock yanks sideways toward shooter');
  near(hit.dx * Math.sin(hit.heading) + hit.dz * Math.cos(hit.heading), 0, 'knock gets no body-forward yank');
  near(hit.roadPush, 0, 'native free-body yank leaves no deferred road-side duplicate');
  near(hit.alongPush, 0, 'native free-body yank leaves no deferred road-forward duplicate');
});
check('Harpoon motion contributes to native solid-face armor damage and contact damping', () => {
  const duel = race(), target = duel.state, cpu = target.rival;
  place(target, 500, 0, 55 * Math.PI / 180); place(cpu, 535, 2, Math.PI); equipCpu(cpu, 'harpoon');
  assert.equal(fireWeapon(duel, 'harpoon', true, cpu), true);
  for (let i = 0; i < 180 && !carEffect(target, 'tether'); i++) stepProjectiles(duel, DT);
  assert.ok(carEffect(target, 'tether'), 'genuine CPU projectile supplies the victim impulse');
  target.speedMph = 170;
  const at = point(duel, target), motion = velocity(target, at), phi = at.heading, spec = duel._vehicleSpec(target);
  const reach = spec.halfLength * Math.cos(target.headingError) + spec.halfWidth * Math.sin(target.headingError);
  const obstacle = {id: 'arsenal-solid-face', kind: 'barrier', barrier: true, s: target.s, off: target.lateral,
    x: at.x + Math.sin(phi) * (reach + .24), z: at.z + Math.cos(phi) * (reach + .24),
    heading: phi, halfX: 50, halfZ: .2};
  // A bounded solid-face fixture supplies geometry; the native sweep and response remain real.
  duel._obstacles = () => [obstacle];
  const moved = duel._roadPosition({x: at.x + motion.x * DT, z: at.z + motion.z * DT}, target.s);
  target.s = moved.s; target.lateral = moved.lateral;
  const hit = sweepObstacle({...at, y: undefined}, {...point(duel, target), y: undefined},
    obstacle, at.heading + target.headingError, spec);
  assert.ok(hit, 'actual physical displacement reaches the solid face');
  const normalMph = -(motion.x * hit.nx + motion.z * hit.nz) / DRIVE.mphToWorld;
  assert.ok(normalMph > combatCrashThresholdMph(duel.car), 'actual normal velocity exceeds the unchanged armor threshold');
  const armor = target.armor, along = carAlongPush(target), side = target.pushVelocity;
  duel._staticContacts(target, true);
  assert.ok(target.armor < armor, 'actual ' + normalMph + ' mph solid-face hit must cost armor');
  near(carAlongPush(target), along * .25, 'road-forward impulse receives existing contact damping');
  near(target.pushVelocity, side * .25, 'existing road-side contact damping stays exact');
});
check('Harpoon motion contributes to native arena participant closing speed and ram damage', () => {
  const duel = new Duel({seed: SEED, featureFlags: flags(true)});
  assert.equal(duel.startArenaEvent({seed: SEED, car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'hard',
    arsenalRank: 6, weaponLoadout: ['harpoon', 'caltrops', 'oil', 'smoke'], opponents: [
      {car: 'dusthawk_rally', driverId: 'club', brain: 'gunner'}, {car: 'aurora_gt', driverId: 'club', brain: 'gunner'}]}), true);
  const state = duel.state, target = state.rival, other = state.opponents[1];
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: 0, traffic: []});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity; state.arena.phase = 'fight';
  for (const participant of state.arena.participants) participant.protectedSec = 0;
  place(state, 96); place(target, 131, 2, Math.PI / 2); place(other, 300);
  assert.equal(duel.fireWeapon('harpoon'), true);
  for (let i = 0; i < 180 && !carEffect(target, 'tether'); i++) stepProjectiles(duel, DT);
  assert.ok(carEffect(target, 'tether'), 'native projectile hits the registered Dusthawk');
  const shape = vehicleContactEnvelope(target, other, duel._vehicleSpec(target), duel._vehicleSpec(other));
  place(other, target.s - shape.length - .02, target.lateral, 0, 15);
  for (const [actor, speed] of [[target, 0], [other, 15]]) {
    const at = point(duel, actor), heading = at.heading + actor.headingError;
    pilotStep(duel, actor, {x: at.x + Math.sin(heading) * 20, z: at.z + Math.cos(heading) * 20,
      speedMph: speed, boost: false}, DT);
  }
  const a = actorBody(duel, target), b = actorBody(duel, other), frame = duel.course.at(target.s).heading;
  const phase = duel.relativeS(other.s, target.s) - other.s;
  const hit = sweepBox({x: target.prevLateral - other.prevLateral, z: target.prevS - other.prevS - phase},
    {x: target.lateral - other.lateral, z: target.s - other.s - phase}, shape.width, shape.length);
  assert.ok(hit, 'genuine pilot motion sweeps into the other registered participant');
  const nx = Math.cos(frame) * hit.nx + Math.sin(frame) * hit.nz, nz = -Math.sin(frame) * hit.nx + Math.cos(frame) * hit.nz;
  const closingKph = -((a.vx - b.vx) * nx + (a.vz - b.vz) * nz) / DRIVE.mphToWorld * COMBAT_TUNING.armor.kphPerMph;
  assert.ok(closingKph > COMBAT_TUNING.armor.ramThresholdKph, 'actual contact normal exceeds the unchanged ram threshold');
  const armorA = target.armor, armorB = other.armor, events = [];
  duel.onChange((_, event) => {if (event.combatRamHit) events.push(event);});
  assert.equal(duel._vehicleContact(target, other, 'rival'), true, 'native rigid-body contact really occurs');
  assert.ok(events.length > 0, 'actual ' + closingKph + ' km/h closing motion must emit armor hits');
  assert.ok(target.armor < armorA && other.armor < armorB, 'both participants take the settled native ram damage');
});
import {GLANCING_WALL_NORMAL_FRACTION} from '../src/sim-common.js';
check('opposing native Harpoon yank keeps a below-threshold solid-face contact harmless', () => {
  const duel = race(), shooter = duel.state, target = shooter.rival;
  place(shooter, 500); place(target, 535, 2, Math.PI / 6);
  assert.equal(duel.fireWeapon('harpoon'), true, 'real player projectile launches toward the stationary CPU');
  for (let i = 0; i < 180 && !carEffect(target, 'tether'); i++) stepProjectiles(duel, DT);
  assert.ok(carEffect(target, 'tether'), 'genuine hit supplies the opposing impulse');
  assert.ok(carAlongPush(target) < 0, 'native yank opposes the victim course-forward travel');
  target.speedMph = 120;
  const at = point(duel, target), motion = velocity(target, at), phi = at.heading, spec = duel._vehicleSpec(target);
  const reach = spec.halfLength * Math.cos(target.headingError) + spec.halfWidth * Math.sin(target.headingError);
  const obstacle = {id: 'arsenal-opposing-solid-face', kind: 'barrier', barrier: true, s: target.s, off: target.lateral,
    x: at.x + Math.sin(phi) * (reach + .22), z: at.z + Math.cos(phi) * (reach + .22),
    heading: phi, halfX: 50, halfZ: .2};
  duel._obstacles = () => [obstacle]; // Solid geometry fixture; production sweep and response remain real.
  const moved = duel._roadPosition({x: at.x + motion.x * DT, z: at.z + motion.z * DT}, target.s);
  target.s = moved.s; target.lateral = moved.lateral;
  const hit = sweepObstacle({...at, y: undefined}, {...point(duel, target), y: undefined},
    obstacle, at.heading + target.headingError, spec);
  assert.ok(hit, 'actual victim displacement reaches the solid face');
  const normalSpeed = -(motion.x * hit.nx + motion.z * hit.nz), normalMph = normalSpeed / DRIVE.mphToWorld;
  const threshold = combatCrashThresholdMph(CARS[target.car] || duel.car);
  assert.ok(normalMph > 0 && normalMph < threshold, 'signed actual ' + normalMph + ' mph impact stays below ' + threshold);
  assert.ok(normalSpeed / Math.hypot(motion.x, motion.z) > GLANCING_WALL_NORMAL_FRACTION,
    'actual incidence is nonglancing, so unchanged armor is explained by the physical speed threshold');
  const armor = target.armor, along = carAlongPush(target), side = target.pushVelocity;
  duel._staticContacts(target, false);
  assert.equal(target.armor, armor, 'nonglancing actual ' + normalMph + ' mph below-threshold contact preserves armor');
  near(carAlongPush(target), along * .25, 'opposing road-forward push receives ordinary wall damping');
  near(target.pushVelocity, side * .25, 'existing road-side wall damping stays exact');
});
// Claude's 06:30 answer changes Medium's native Arsenal decisions only.
// Stationary range fixtures run the real combat update, recharge, shot creation,
// turn rotation and projectile motion; no forced decision or cooldown reset.
import {stepCombat} from '../src/combat.js';
function timedCpuField({difficulty = 'medium', enabled = true, discovered = true,
  count = 1, retired = -1} = {}) {
  const duel = new Duel({seed: SEED, featureFlags: flags(enabled)});
  duel.startCampaign({mode: 'wasteland', discoveredGate: discovered, arsenalRank: 6,
    seed: SEED, cpuDifficulty: difficulty, car: 'falcone_f42', opponentCount: count});
  const state = duel.state, shots = [];
  Object.assign(state, {status: 'racing', countdown: 0, invulnerableSec: Infinity, traffic: []});
  place(state, 500);
  state.opponents.forEach((actor, index) => {
    place(actor, 400 + index * 5);
    actor.weaponLoadout = normalizeCarLoadout(['crossbow', 'bomb', 'star', 'ufo'], WEAPON_IDS);
    if (index === retired) actor.finished = true;
  });
  state.combat.aiTimer = null;
  state.combat.pickupTimer = Infinity;
  let ticks = 0;
  duel.onChange((_, event) => {
    if (event.weaponFired !== 'crossbow') return;
    const shot = state.combat.projectiles.filter(projectile => projectile.enemy && projectile.kind === 'crossbow').at(-1);
    assert.ok(shot, 'scheduled launch creates an actual native enemy projectile');
    shots.push({time: ticks * DT, source: shot.sourceIndex ?? 0});
  });
  return {duel, shots, advanceTo(seconds) {
    const last = Math.ceil(seconds / DT);
    while (ticks < last) {ticks++; stepCombat(duel, DT);}
  }};
}
function assertNativeInterval(options, interval) {
  const field = timedCpuField(options);
  field.advanceTo(interval - 2 * DT);
  assert.equal(field.shots.length, 0, 'native schedule never launches before its first interval');
  field.advanceTo(2 * interval + 4 * DT);
  assert.equal(field.shots.length, 2,
    'expected two native launches at ' + interval + ' and ' + 2 * interval +
    ' s; actual launch times: ' + field.shots.map(shot => shot.time).join(', '));
  field.shots.forEach((shot, index) => assert.ok(Math.abs(shot.time - (index + 1) * interval) <= 2 * DT,
    'actual native launch at ' + shot.time + ' s must follow the ' + interval + ' s decision interval'));
  assert.deepEqual(field.shots.map(shot => shot.source), [0, 0], 'the actual rival fires both launches');
}
check('Medium discovered Arsenal launches natively every 4.5 s', () => assertNativeInterval({}, 4.5));
for (const [label, options] of [
  ['switch off', {enabled: false}], ['gate unfound', {discovered: false}],
]) check('Medium ' + label + ' keeps released native 7 s launches', () => assertNativeInterval(options, 7));
for (const [difficulty, interval] of [['easy', 10], ['hard', 6]])
  for (const [label, options] of [['Arsenal on', {}], ['switch off', {enabled: false}], ['gate unfound', {discovered: false}]])
    check(difficulty + ' ' + label + ' keeps native ' + interval + ' s launches', () =>
      assertNativeInterval({difficulty, ...options}, interval));
for (const count of [2, 3]) check('Medium Arsenal ' + count + '-car field shares the native 4.5 s schedule without volleys', () => {
  const field = timedCpuField({count}), interval = 4.5 / count;
  field.advanceTo(interval - 2 * DT);
  assert.equal(field.shots.length, 0, 'multi-car scheduling waits its real divided interval');
  field.advanceTo(9 + 8 * DT);
  assert.equal(field.shots.length, count * 2,
    'two native 4.5 s cycles must yield one attack per live car per cycle; actual times: ' +
    field.shots.map(shot => shot.time).join(', '));
  assert.deepEqual(field.shots.map(shot => shot.source),
    Array.from({length: count * 2}, (_, index) => index % count), 'genuine projectiles rotate through each live actor');
  field.shots.forEach((shot, index) => {
    const expectedTime = (index + 1) * interval;
    const roundoff = Number.EPSILON * Math.max(1, Math.abs(shot.time), Math.abs(expectedTime));
    assert.ok(Math.abs(shot.time - expectedTime) <= (index + 1) * DT + roundoff,
      'one actual launch per divided interval, with no synchronized volley: ' + shot.time);
  });
  field.shots.slice(count).forEach((shot, index) => {
    const expectedTime = field.shots[index].time + 4.5;
    const roundoff = Number.EPSILON * Math.max(1, Math.abs(shot.time), Math.abs(expectedTime));
    assert.ok(Math.abs(shot.time - field.shots[index].time - 4.5) <= count * DT + roundoff,
      'each actual actor retains the 4.5 s interval across its turns');
  });
});
check('Medium Arsenal finished car loses its scheduled turn and two live cars share 4.5 s', () => {
  const field = timedCpuField({count: 3, retired: 0});
  field.advanceTo(4.5 + 4 * DT);
  assert.equal(field.shots.length, 2, 'both live cars launch during the native 4.5 s cycle');
  assert.deepEqual(field.shots.map(shot => shot.source), [1, 2], 'finished actor neither fires nor consumes a turn');
  field.shots.forEach((shot, index) => assert.ok(Math.abs(shot.time - (index + 1) * 2.25) <= 2 * DT,
    'actual live-car launch follows the 4.5 / 2 schedule: ' + shot.time));
});
console.log('Arsenal wave one: ' + checks + ' checks, ' + failures.length + ' failures; settled owner-grace and hard-away boundaries included.');
if (failures.length) {console.error(failures.join('\n')); process.exitCode = 1;}

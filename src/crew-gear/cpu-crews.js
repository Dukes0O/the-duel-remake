import {makeRng} from '../rng.js';
import {CREW, crewPerks} from '../crew.js';
import {DRIVE} from '../config.js';
import {createFighter, damageFighter} from '../onfoot.js';
import {COMBAT_TUNING} from '../wasteland-tuning.js';
import {wastelandRulesActive} from '../wasteland-access.js';
import {point, predictedPoint} from '../combat-weapons.js';
import {targetFor, targetIdentity} from '../arsenal/targeting.js';
import {combatOwnerId, hostile, outOfPlay} from '../combat-teams.js';
import {carBodyPoint} from '../arsenal/hazards.js';
import {gearContact, damageGearCar, damageGearFighter} from './contacts.js';
import {signatureFor, GEAR_EPSILON} from './gear.js';

const SALT = 0xc4e704;
const MEMBERS = Object.keys(CREW);
const FOOT = COMBAT_TUNING.foot;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function admitted(duel, enabled) {
  const s = duel.state;
  return enabled === true && s.mode === 'wasteland' && !!s.combat &&
    wastelandRulesActive(s) && !s.arena && !duel.course.def.arena;
}

function crewState(duel, actor) {
  if (actor.cpuCrew) return actor.cpuCrew;
  const index = duel.state.opponents.indexOf(actor);
  const rng = makeRng((duel.seed ^ SALT ^ Math.imul(index + 1, 0x9e3779b9) ^
    Math.imul(duel.state.stageIndex + 1, 0x51ed)) >>> 0);
  return actor.cpuCrew = {crewId: MEMBERS[rng.int(0, MEMBERS.length - 1)],
    phase: 'driving', fighter: null, repairLap: -1, ambushLap: -1,
    shots: 0, serial: 0, turret: null};
}

export function cpuCrewActor(duel, fighter) {
  if (!fighter) return null;
  return duel.state.opponents.find(actor => actor.cpuCrew?.fighter === fighter) || null;
}

export function cpuCrewFighters(duel) {
  return duel.state.opponents.flatMap(actor => actor.cpuCrew?.fighter
    ? [{actor, fighter: actor.cpuCrew.fighter}] : []);
}

function finishStop(duel, actor, {repairCompleted = false} = {}) {
  const crew = actor.cpuCrew;
  if (crew.fighter?.repairing) duel.emit({
    [repairCompleted ? 'footRepairCompleted' : 'footRepairInterrupted']: true,
    ...(repairCompleted ? {armorRestored: crew.repairAmount} : {}), actor, enemy: true,
    actorId: targetIdentity(duel, actor), hitPosition: crew.fighter});
  if (crew.fighter?.flaming) duel.emit({crewGearCue: 'crew.flamer.stop', actor,
    enemy: true, hitPosition: crew.fighter});
  crew.phase = 'driving'; crew.fighter = null;
  duel.emit({cpuCrewEntered: true, actor, enemy: true, actorId: targetIdentity(duel, actor),
    crewId: crew.crewId, hitPosition: point(duel, actor)});
}

function besideCar(duel, actor, crew) {
  const fighter = createFighter(duel.course, actor);
  const health = fighter.maxHealth * (crewPerks(crew.crewId).healthMultiplier || 1);
  return Object.assign(fighter, {id: `crew-${targetIdentity(duel, actor)}`,
    crewId: crew.crewId, health, maxHealth: health, locomotion: 'idle',
    weapon: crew.stopKind === 'repair' ? 'wrench' : 'rpg'});
}

export function damageCpuCrewFighter(duel, fighter, amount,
    {owner = 'player', source = 'onFoot'} = {}) {
  const actor = cpuCrewActor(duel, fighter);
  if (!actor || !damageFighter(fighter, amount)) return false;
  const crew = actor.cpuCrew;
  duel.emit({fighterHit: true, cpuCrew: true, actorId: targetIdentity(duel, actor),
    owner, source, hitPosition: {x: fighter.x, y: fighter.y + 1, z: fighter.z}});
  if (fighter.knockedDown) {
    if (fighter.repairing) duel.emit({footRepairInterrupted: true,
      actor, enemy: true, actorId: targetIdentity(duel, actor), hitPosition: fighter});
    fighter.repairing = false;
    crew.resumePhase = crew.phase; crew.phase = 'recovering';
    crew.respawnAt = duel.state.stageTimeSec + 3;
    fighter.knockdownRemaining = 3;
    if (fighter.flaming) duel.emit({crewGearCue: 'crew.flamer.stop', actor,
      enemy: true, hitPosition: fighter});
    fighter.flaming = false;
    duel.emit({fighterKnockdown: true, cpuCrew: true,
      actorId: targetIdentity(duel, actor), owner, source,
      hitPosition: {x: fighter.x, y: fighter.y + 1, z: fighter.z}});
  }
  return true;
}

function eligibleStop(duel, actor, crew) {
  const s = duel.state, lap = actor.completedLaps || 0;
  const remaining = duel.course.raceLength - actor.s;
  if (s.cpuDifficulty === 'easy' || actor.airborne || actor.knock ||
      actor.combatWrecking || actor.crushed || actor.finished) return null;
  const lead = actor.s - s.s;
  if (s.cpuDifficulty === 'hard' && remaining > 500 &&
      crew.ambushLap !== lap && lead >= 150 && lead <= 400) {
    const zone = s.raids?.zones.find(zone =>
      Math.abs(duel.relativeS(zone.s, actor.s) - actor.s) <= 12);
    if (zone) return {kind: 'ambush', side: zone.side};
  }
  if (remaining <= 400 || crew.repairLap === lap ||
      !(actor.maxArmor > 0 && actor.armor / actor.maxArmor < .3)) return null;
  const origin = point(duel, actor);
  if ([s, ...s.opponents].some(enemy => hostile(duel, actor, enemy) &&
      !outOfPlay(duel, enemy) && Math.hypot(point(duel, enemy).x - origin.x,
        point(duel, enemy).z - origin.z) <= 80)) return null;
  return {kind: 'repair', side: actor.lateral < 0 ? -1 : 1};
}

function startStop(duel, actor, crew, stop) {
  const lap = actor.completedLaps || 0;
  crew[`${stop.kind}Lap`] = lap;
  Object.assign(crew, {phase: 'pulling-over', stopKind: stop.kind,
    stopLateral: stop.side * (duel.course.roadHalfWidthAt(actor.s) +
      duel._vehicleSpec(actor).halfWidth + 1),
    stopSeconds: 0, repairSeconds: 0, repairAmount: 0,
    shots: 0, signatureUsed: false, lockSeconds: 0, lockTargetId: null, nextFireAt: 0});
}

function pullOver(duel, actor, crew, dt) {
  const delta = crew.stopLateral - actor.lateral;
  const pace = Math.abs(delta) > .25 ? 12 : 0;
  actor.braking = actor.speedMph > pace; actor.boosting = false;
  actor.speedMph += clamp(pace - actor.speedMph, -DRIVE.brakeAccel * dt, 12 * dt);
  const desired = clamp(delta * .16, -.55, .55);
  actor.headingError = (actor.headingError || 0) +
    clamp(desired - (actor.headingError || 0), -.95 * dt, .95 * dt);
  const speed = actor.speedMph * DRIVE.mphToWorld;
  actor.lateral += Math.sin(actor.headingError) * speed * dt;
  actor.s += Math.cos(actor.headingError) * speed * dt /
    Math.max(.25, 1 - duel.course.at(actor.s).curvature * actor.lateral);
  crew.stopSeconds += dt;
  if (Math.abs(delta) <= .25 && actor.speedMph <= 1) {
    actor.speedMph = 0; crew.phase = crew.stopKind;
    crew.fighter = besideCar(duel, actor, crew);
    crew.stopSeconds = 0;
    duel.emit({cpuCrewExited: true, actor, enemy: true, actorId: targetIdentity(duel, actor),
      crewId: crew.crewId, reason: crew.stopKind, hitPosition: crew.fighter});
  } else if (crew.stopSeconds >= 8) finishStop(duel, actor);
}

function aimAt(duel, actor, crew, target, speed) {
  const fighter = crew.fighter, at = point(duel, target);
  const distance = Math.hypot(at.x - fighter.x, at.z - fighter.z);
  const future = predictedPoint(duel, target, Math.min(1, distance / speed));
  const identity = `${duel.seed}:${duel.state.stageIndex}:${targetIdentity(duel, actor)}:${actor.completedLaps || 0}:${crew.shots}`;
  let seed = SALT;
  for (let n = 0; n < identity.length; n++) seed = Math.imul(seed ^ identity.charCodeAt(n), 16777619);
  const spread = COMBAT_TUNING.raider.aimError.hard;
  fighter.yaw = Math.atan2(future.x - fighter.x, future.z - fighter.z) +
    makeRng(seed >>> 0).range(-spread, spread);
  fighter.pitch = Math.atan2(future.y + COMBAT_TUNING.pointHeight -
    fighter.y - FOOT.rpgEyeHeight, Math.max(1, distance));
}

function launch(duel, actor, crew, kind, target) {
  const combat = duel.state.combat;
  if (combat.projectiles.length >= COMBAT_TUNING.projectileLimit) return false;
  const fighter = crew.fighter, gear = signatureFor(crew.crewId);
  const thrown = kind === 'sticky-bomb', speed = kind === 'marksman' ? gear.speed : FOOT.rpgSpeed;
  aimAt(duel, actor, crew, target, speed);
  const x = fighter.x, y = fighter.y + FOOT.rpgEyeHeight, z = fighter.z;
  const direction = {x: Math.sin(fighter.yaw) * Math.cos(fighter.pitch),
    y: Math.sin(fighter.pitch), z: Math.cos(fighter.yaw) * Math.cos(fighter.pitch)};
  let vx = direction.x * speed, vy = direction.y * speed, vz = direction.z * speed;
  if (thrown) {
    const at = point(duel, target), distance = Math.min(gear.range, Math.hypot(at.x - x, at.z - z));
    vx = Math.sin(fighter.yaw) * distance; vz = Math.cos(fighter.yaw) * distance;
    const near = duel.course.nearest(x + vx, z + vz, fighter.s);
    vy = Math.max(.5, duel.course.groundAt(near.s, near.lateral).y - y + COMBAT_TUNING.bomb.gravity / 2);
  }
  const id = targetIdentity(duel, actor);
  const shot = {kind, owner: combatOwnerId(duel, actor), attackerId: id,
    enemy: true, sourceIndex: duel.state.opponents.indexOf(actor),
    id: `cpu-crew-${duel.state.stageIndex}-${id}-${++crew.serial}`,
    x, y, z, launchX: x, launchY: y, launchZ: z, vx, vy, vz,
    age: 0, travelled: 0, level: 0, crewId: crew.crewId,
    targetIndex: target === duel.state ? -1 : duel.state.opponents.indexOf(target),
    targetId: targetIdentity(duel, target)};
  if (kind === 'rpg') Object.assign(shot, {splashRadius: FOOT.rpgSplashRadius,
    lockRangeMultiplier: crewPerks(crew.crewId).lockRangeMultiplier || 1,
    lifetimeSeconds: FOOT.rpgLifetimeSeconds});
  else Object.assign(shot, {crewGearShot: true, thrown});
  combat.projectiles.push(shot);
  fighter.weapon = kind;
  duel.emit({weaponFired: kind, footWeaponFired: kind, actor, enemy: true,
    actorId: id, hitPosition: {x, y, z},
    ...(kind === 'sticky-bomb' ? {crewGearCue: 'crew.sticky.throw'} :
      kind === 'marksman' ? {crewGearCue: 'crew.marksman.fire'} : {})});
  return true;
}

function deployTurret(duel, actor, crew) {
  const gear = signatureFor(crew.crewId), f = crew.fighter;
  crew.turret = {id: `cpu-turret-${targetIdentity(duel, actor)}-${++crew.serial}`,
    x: f.x, y: f.y, z: f.z, health: gear.health, maxHealth: gear.health,
    age: 0, shotSeconds: 0, ownerId: targetIdentity(duel, actor)};
  duel.emit({crewGearCue: 'crew.turret.deploy', actor, enemy: true,
    turret: crew.turret, hitPosition: f});
  return true;
}

function stepTurret(duel, actor, crew, dt) {
  const turret = crew.turret;
  if (!turret) return;
  const gear = signatureFor('odessa');
  turret.shotSeconds += Math.min(dt, Math.max(0, gear.lifetime - turret.age));
  turret.age += dt;
  while (turret.shotSeconds + GEAR_EPSILON >= gear.cadence) {
    turret.shotSeconds = Math.max(0, turret.shotSeconds - gear.cadence);
    const target = targetFor(duel, actor, {origin: turret, range: gear.range});
    if (!target) continue;
    const f = target === duel.state && duel.state.onFoot && duel.state.fighter;
    const at = f ? {x: f.x, y: f.y + .85, z: f.z} : carBodyPoint(duel, target);
    const contact = gearContact(duel, {x: turret.x, y: turret.y + .85, z: turret.z}, at, actor);
    if (f && contact?.target?.fighter === f)
      damageGearFighter(duel, contact.target, gear.fighterDamage, actor);
    else if (contact?.actor === target) damageGearCar(duel, target, gear.carDamage, actor);
    else continue;
    duel.emit({crewGearCue: 'crew.turret.fire', actor, enemy: true, turret, hitPosition: turret});
  }
  if (turret.health <= 0 || turret.age + GEAR_EPSILON >= gear.lifetime) {
    crew.turret = null;
    duel.emit({crewGearCue: 'crew.turret.retire', actor, enemy: true, hitPosition: turret});
  }
}

export function damageCpuCrewTurret(duel, turret, amount, attacker) {
  const actor = duel.state.opponents.find(actor => actor.cpuCrew?.turret === turret);
  if (!actor || !(Number.isFinite(amount) && amount > 0) ||
      !hostile(duel, attacker, actor) || !(turret.health > 0)) return 0;
  const removed = Math.min(turret.health, amount);
  turret.health -= removed;
  return removed;
}

function burnFlamer(duel, actor, crew, target, dt) {
  const fighter = crew.fighter, gear = signatureFor('cinder');
  const f = target === duel.state && duel.state.onFoot && duel.state.fighter;
  if (f && crewPerks(f.crewId).fireImmune) return false;
  const at = f ? {x: f.x, y: f.y + .85, z: f.z} : carBodyPoint(duel, target);
  const dx = at.x - fighter.x, dz = at.z - fighter.z, distance = Math.hypot(dx, dz);
  if (!(distance > 0 && distance <= gear.range) || Math.abs(at.y - fighter.y - .85) >= 2 ||
      (dx * Math.sin(fighter.yaw) + dz * Math.cos(fighter.yaw)) / distance < Math.cos(gear.cone / 2)) return false;
  const hit = gearContact(duel, {x: fighter.x, y: fighter.y + .85, z: fighter.z}, at, actor);
  if (hit?.actor) damageGearCar(duel, hit.actor, gear.carDamage * dt, actor);
  else if (hit?.target) damageGearFighter(duel, hit.target, gear.fighterDamage * dt, actor);
  else return false;
  return true;
}

function signatureAttack(duel, actor, crew, target, dt) {
  if (crew.signatureUsed || ['rook', 'jax', 'wren'].includes(crew.crewId)) return false;
  const gear = signatureFor(crew.crewId), fighter = crew.fighter;
  const at = target === duel.state && duel.state.onFoot && duel.state.fighter || point(duel, target);
  const distance = Math.hypot(at.x - fighter.x, at.z - fighter.z);
  const range = gear.range || FOOT.rpgSpeed * FOOT.rpgLifetimeSeconds;
  if (distance > range) return false;
  if (gear.id === 'scrap-turret') return deployTurret(duel, actor, crew);
  if (gear.id !== 'hand-flamer') return launch(duel, actor, crew, gear.id, target);
  aimAt(duel, actor, crew, target, FOOT.rpgSpeed);
  if (!burnFlamer(duel, actor, crew, target, dt)) return false;
  crew.flamerSeconds = gear.capacity - dt; fighter.flaming = true;
  fighter.weapon = gear.id;
  duel.emit({crewGearCue: 'crew.flamer.start', actor, enemy: true, hitPosition: fighter});
  return true;
}

function ambush(duel, actor, crew, dt) {
  crew.stopSeconds += dt;
  const fighter = crew.fighter, gear = signatureFor(crew.crewId);
  const target = targetFor(duel, actor, {origin: fighter,
    range: Math.max(gear.range || 0, FOOT.rpgLockRange)});
  if (fighter.flaming) {
    const burn = Math.min(dt, crew.flamerSeconds);
    if (target) aimAt(duel, actor, crew, target, FOOT.rpgSpeed);
    const burning = target && burnFlamer(duel, actor, crew, target, burn);
    crew.flamerSeconds = Math.max(0, crew.flamerSeconds - dt);
    if (!burning || crew.flamerSeconds <= GEAR_EPSILON) {
      fighter.flaming = false;
      duel.emit({crewGearCue: 'crew.flamer.stop', actor, enemy: true, hitPosition: fighter});
    } else return;
  }
  const passed = actor.s - duel.state.s < -80;
  if (crew.shots >= 3 || passed || crew.stopSeconds >= 12) {finishStop(duel, actor); return;}
  if (!target) {crew.lockSeconds = 0; crew.lockTargetId = null; return;}
  const targetId = targetIdentity(duel, target);
  if (crew.lockTargetId !== targetId) {crew.lockTargetId = targetId; crew.lockSeconds = 0;}
  crew.lockSeconds += dt;
  if (duel.state.stageTimeSec + GEAR_EPSILON < crew.nextFireAt) return;
  const signature = signatureAttack(duel, actor, crew, target, dt);
  if (signature) {crew.signatureUsed = true; crew.shots++;}
  else {
    const dune = crew.crewId === 'dune';
    if (dune && Math.hypot(point(duel, target).x - fighter.x,
      point(duel, target).z - fighter.z) > gear.range) return;
    if (crew.lockSeconds + GEAR_EPSILON < (crew.crewId === 'rook' ? .6 : FOOT.rpgLockSeconds)) return;
    if (!launch(duel, actor, crew, dune ? 'marksman' : 'rpg', target)) return;
    crew.shots++;
  }
  crew.nextFireAt = duel.state.stageTimeSec + (crew.crewId === 'rook'
    ? 1.8 : crew.crewId === 'dune' ? gear.reload : FOOT.rpgReloadSeconds);
}

// The native rival caller opts in and retains collision/boundary/lap handling.
// False means ordinary driving owns this step; true means this stop owns it.
export function stepCpuCrew(duel, actor, dt, {enabled = false} = {}) {
  if (!admitted(duel, enabled) || !duel.state.opponents.includes(actor)) return false;
  const crew = crewState(duel, actor), s = duel.state;
  if (!(dt > 0) || s.status !== 'racing' || s.paused) return false;
  stepTurret(duel, actor, crew, dt);
  if (actor.combatWrecking || actor.crushed || actor.finished) {
    if (crew.phase !== 'driving') finishStop(duel, actor);
    return false;
  }
  if (crew.phase === 'driving') {
    const stop = eligibleStop(duel, actor, crew);
    if (!stop) return false;
    startStop(duel, actor, crew, stop);
  }
  // Native vehicle sweeps may knock a fighter down without dealing health damage.
  if (crew.fighter?.knockedDown && crew.phase !== 'recovering') {
    crew.resumePhase = crew.phase; crew.phase = 'recovering';
    crew.respawnAt = s.stageTimeSec + crew.fighter.knockdownRemaining;
    if (crew.fighter.repairing) duel.emit({footRepairInterrupted: true,
      actor, enemy: true, actorId: targetIdentity(duel, actor), hitPosition: crew.fighter});
    if (crew.fighter.flaming) duel.emit({crewGearCue: 'crew.flamer.stop', actor,
      enemy: true, hitPosition: crew.fighter});
    crew.fighter.repairing = crew.fighter.flaming = false;
  }
  actor.prevS = actor.s; actor.prevLateral = actor.lateral;
  actor.boosting = false;
  if (crew.phase === 'pulling-over') {pullOver(duel, actor, crew, dt); return true;}
  actor.speedMph = 0; actor.braking = true;
  if (crew.phase === 'recovering') {
    crew.fighter.knockdownRemaining = Math.max(0, crew.respawnAt - s.stageTimeSec);
    if (s.stageTimeSec + GEAR_EPSILON >= crew.respawnAt) {
      const replacement = besideCar(duel, actor, crew);
      Object.assign(crew.fighter, replacement, {respawns: crew.fighter.respawns + 1});
      crew.phase = crew.resumePhase;
      duel.emit({cpuCrewRespawned: true, actor, enemy: true, crewId: crew.crewId,
        actorId: targetIdentity(duel, actor), hitPosition: crew.fighter});
    }
    return true;
  }
  if (crew.phase === 'repair') {
    const seconds = FOOT.wrenchRepairSeconds / (crewPerks(crew.crewId).repairRateMultiplier || 1);
    if (!crew.fighter.repairing) duel.emit({footRepairStarted: true, actor, enemy: true,
      actorId: targetIdentity(duel, actor), hitPosition: crew.fighter});
    crew.fighter.repairing = true;
    const live = Math.min(dt, Math.max(0, seconds - crew.repairSeconds));
    const amount = FOOT.wrenchRepairAmount * live / seconds;
    actor.armor = Math.min(actor.maxArmor, actor.armor + amount);
    crew.repairSeconds += live; crew.repairAmount += amount;
    if (crew.repairSeconds + GEAR_EPSILON >= seconds) finishStop(duel, actor, {repairCompleted: true});
  } else if (crew.phase === 'ambush') ambush(duel, actor, crew, dt);
  return true;
}

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
import {signatureFor, crewGearEnabled, GEAR_EPSILON} from './gear.js';
import {sweepObstacle} from '../collision.js';
import {carAlongPush} from '../arsenal/car-effects.js';
import {raiderShotScheduled} from '../raiders.js';
import {strikeCpuCrewFighterFromVehicles} from '../onfoot-race.js';

const SALT = 0xc4e704;
const MEMBERS = Object.keys(CREW);
const FOOT = COMBAT_TUNING.foot;
const STOP_PACING = Object.freeze({overhead: 2.5, pullAway: .6,
  maneuverMph: 55, acceleration: 300, braking: 300, turnRate: 6});
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function admitted(duel, enabled) {
  const s = duel.state;
  return enabled === true && crewGearEnabled(duel) && s.mode === 'wasteland' && !!s.combat &&
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

export function cpuCrewStopped(actor) {
  return !!actor.cpuCrew && actor.cpuCrew.phase !== 'driving';
}

export function cpuCrewPullAwayAcceleration(duel, actor) {
  return admitted(duel, duel.featureFlags?.enabled('cpu-crews')) &&
    actor.cpuCrew?.phase === 'driving' &&
    duel.state.stageTimeSec < actor.cpuCrew.pullAwayUntil &&
    actor.s - actor.cpuCrew.pullAwayFrom < duel._vehicleSpec(actor).halfLength * 2
    ? STOP_PACING.acceleration : 0;
}

function finishStop(duel, actor, {repairCompleted = false} = {}) {
  const crew = actor.cpuCrew;
  if (crew.fighter?.repairing) duel.emit({
    [repairCompleted ? 'footRepairCompleted' : 'footRepairInterrupted']: true,
    ...(repairCompleted ? {armorRestored: crew.repairAmount} : {}), actor, enemy: true,
    actorId: targetIdentity(duel, actor), hitPosition: crew.fighter});
  if (crew.fighter?.flaming) duel.emit({crewGearCue: 'crew.flamer.stop', actor,
    enemy: true, hitPosition: crew.fighter});
  if (crew.fighter) crew.departed = {fighter: crew.fighter,
    presentation: {clip: 'enter', startedAt: duel.state.stageTimeSec, duration: .65}};
  crew.phase = 'driving'; crew.fighter = null;
  crew.pullAwayUntil = duel.state.stageTimeSec + STOP_PACING.pullAway;
  crew.pullAwayFrom = actor.s;
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

function enemyCarNear(duel, actor) {
  const origin = point(duel, actor);
  return [duel.state, ...duel.state.opponents].some(enemy =>
    hostile(duel, actor, enemy) && !outOfPlay(duel, enemy) &&
    Math.hypot(point(duel, enemy).x - origin.x,
      point(duel, enemy).z - origin.z) <= 80 + GEAR_EPSILON);
}

function eligibleStop(duel, actor, crew) {
  const s = duel.state, lap = actor.completedLaps || 0;
  const remaining = duel.course.raceLength - actor.s;
  if (!duel._surface(actor.s, actor.lateral).road ||
      s.cpuDifficulty === 'easy' || actor.airborne || actor.knock ||
      actor.combatWrecking || actor.crushed || actor.finished) return null;
  const lead = actor.s - s.s;
  if (s.cpuDifficulty === 'hard' && remaining > 500 &&
      crew.ambushLap !== lap && lead >= 150 && lead <= 400) {
    const zone = s.raids?.zones.find(zone =>
      Math.abs(duel.relativeS(zone.s, actor.s) - actor.s) <= 12);
    if (zone) return {kind: 'ambush', side: zone.side};
  }
  if (remaining <= 400 || crew.repairLap === lap ||
      (s.cpuDifficulty === 'hard' && crew.repairLap >= 0) ||
      !(actor.maxArmor > 0 && actor.armor / actor.maxArmor < .3)) return null;
  if (enemyCarNear(duel, actor)) return null;
  return {kind: 'repair', side: actor.lateral < 0 ? -1 : 1};
}

function startStop(duel, actor, crew, stop) {
  const lap = actor.completedLaps || 0;
  const width = duel.course.roadHalfWidthAt(actor.s), spec = duel._vehicleSpec(actor);
  const preferred = stop.side * (width + spec.halfWidth + 1);
  const safe = lateral => {
    for (let along = 0; along <= 40; along += 4) {
      const at = duel.course.groundAt(actor.s + along, lateral);
      if ([...duel._obstacles(actor.s + along - spec.halfLength,
        actor.s + along + spec.halfLength)].some(obstacle =>
        sweepObstacle(at, at, obstacle, at.heading, {...spec,
          halfWidth: spec.halfWidth + .35}))) return false;
    }
    return true;
  };
  const shoulders = [preferred, -preferred].filter(safe);
  // Preserve the old inner-edge fallback only for blocked exterior corridors.
  const candidates = shoulders.length ? shoulders
    : [stop.side * (width - .5), -stop.side * (width - .5)].filter(safe);
  candidates.sort((a, b) => Math.abs(a - actor.lateral) - Math.abs(b - actor.lateral));
  const stopLateral = candidates.find(lateral => canFinishPullOver(duel, actor, lateral));
  if (stopLateral === undefined) return false;
  crew[`${stop.kind}Lap`] = lap;
  Object.assign(crew, {phase: 'pulling-over', stopKind: stop.kind,
    stopLateral,
    stopSeconds: 0, overheadSeconds: 0, repairSeconds: 0, repairAmount: 0,
    shots: 0, signatureUsed: false, lockSeconds: 0, lockTargetId: null, nextFireAt: 0});
  return true;
}

function pullOverMotion(duel, actor, stopLateral, dt) {
  const delta = stopLateral - actor.lateral;
  const stoppingPace = Math.sqrt(2 * STOP_PACING.braking *
    Math.max(0, Math.abs(delta) - .2) / DRIVE.mphToWorld);
  const pace = Math.abs(delta) > .25 ? Math.min(STOP_PACING.maneuverMph, stoppingPace) : 0;
  actor.braking = actor.speedMph > pace; actor.boosting = false;
  actor.speedMph += clamp(pace - actor.speedMph, -STOP_PACING.braking * dt,
    STOP_PACING.acceleration * dt);
  const desired = clamp(delta * 1.2, -1.1, 1.1);
  actor.headingError = (actor.headingError || 0) +
    clamp(desired - (actor.headingError || 0),
      -STOP_PACING.turnRate * dt, STOP_PACING.turnRate * dt);
  const speed = actor.speedMph * DRIVE.mphToWorld;
  actor.lateral += Math.sin(actor.headingError) * speed * dt;
  actor.s += Math.cos(actor.headingError) * speed * dt /
    Math.max(.25, 1 - duel.course.at(actor.s).curvature * actor.lateral);
  return Math.abs(delta) <= .25 && actor.speedMph <= 1;
}

function canFinishPullOver(duel, actor, lateral) {
  // Preview only this unchanged maneuver on private state. The existing .6 s
  // native acceleration window reserves the return and one-car pull-away.
  const preview = {s: actor.s, lateral: actor.lateral, speedMph: actor.speedMph,
    headingError: actor.headingError, pushVelocity: actor.pushVelocity || 0};
  let alongPush = carAlongPush(actor);
  const dt = 1 / 120, budget = STOP_PACING.overhead - STOP_PACING.pullAway;
  const spec = duel._vehicleSpec(actor);
  for (let elapsed = dt; elapsed <= budget + GEAR_EPSILON; elapsed += dt) {
    if (raiderShotScheduled(duel, actor, elapsed, preview)) return false;
    const from = duel.course.groundAt(preview.s, preview.lateral), previousS = preview.s;
    const settled = pullOverMotion(duel, preview, lateral, dt);
    preview.lateral += preview.pushVelocity * dt;
    preview.s += alongPush * dt /
      Math.max(.25, 1 - duel.course.at(preview.s).curvature * preview.lateral);
    const damping = Math.exp(-1.5 * dt);
    preview.pushVelocity *= damping; alongPush *= damping;
    const to = duel.course.groundAt(preview.s, preview.lateral);
    if (duel._obstacles(previousS, preview.s).some(obstacle =>
      sweepObstacle(from, to, obstacle, to.heading + preview.headingError, spec))) return false;
    if (settled) return true;
  }
  return false;
}

function pullOver(duel, actor, crew, dt) {
  const settled = pullOverMotion(duel, actor, crew.stopLateral, dt);
  crew.stopSeconds += dt;
  if (settled) {
    actor.speedMph = 0;
    // Contact correction can also rotate the shell. Finish settling before
    // placing its fighter so the next stationary step cannot move it away.
    for (let attempt = 0; attempt < 4; attempt++) {
      const s = actor.s, lateral = actor.lateral, heading = actor.headingError;
      actor.prevS = actor.s; actor.prevLateral = actor.lateral;
      duel._staticContacts(actor, false); duel._boundary(actor);
      if (actor.s === s && actor.lateral === lateral && actor.headingError === heading) break;
    }
    actor.prevS = actor.s; actor.prevLateral = actor.lateral;
    crew.phase = crew.stopKind;
    crew.fighter = besideCar(duel, actor, crew);
    crew.fighter.presentation = {clip: 'exit', startedAt: duel.state.stageTimeSec, duration: .65};
    crew.stopSeconds = 0;
    duel.emit({cpuCrewExited: true, actor, enemy: true, actorId: targetIdentity(duel, actor),
      crewId: crew.crewId, reason: crew.stopKind, hitPosition: crew.fighter});
  }
}

export function cpuCrewAimPoint(duel, target, seconds = 0) {
  if (target === duel.state && duel.state.onFoot && duel.state.fighter)
    return duel.state.fighter;
  return seconds > 0 ? predictedPoint(duel, target, seconds) : point(duel, target);
}

function aimAt(duel, actor, crew, target, speed) {
  const fighter = crew.fighter, at = cpuCrewAimPoint(duel, target);
  const distance = Math.hypot(at.x - fighter.x, at.z - fighter.z);
  const future = cpuCrewAimPoint(duel, target, Math.min(1, distance / speed));
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
    const at = cpuCrewAimPoint(duel, target), distance = Math.min(gear.range, Math.hypot(at.x - x, at.z - z));
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
  crew.lastFireAt = duel.state.stageTimeSec;
  duel.emit({...(kind === 'rpg' ? {weaponFired: kind} : {}), footWeaponFired: kind, actor, enemy: true,
    actorId: id, hitPosition: {x, y, z},
    ...(kind === 'sticky-bomb' ? {crewGearCue: 'crew.sticky.throw'} :
      kind === 'marksman' ? {crewGearCue: 'crew.marksman.fire'} :
        kind === 'scrap-cannon' ? {crewGearCue: 'crew.scrap-cannon.fire'} : {})});
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
    turret.targetId = targetIdentity(duel, target);
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
  let work = crew.shots < 3 ? Math.min(dt, Math.max(0,
    crew.nextFireAt - (duel.state.stageTimeSec - dt))) : 0;
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
    } else return Math.max(work, burn);
  }
  const passed = actor.s - duel.state.s < -80;
  if (crew.shots >= 3 || passed || crew.stopSeconds >= 12) {finishStop(duel, actor); return work;}
  if (!target) {crew.lockSeconds = 0; crew.lockTargetId = null; return work;}
  const targetId = targetIdentity(duel, target);
  if (crew.lockTargetId !== targetId) {crew.lockTargetId = targetId; crew.lockSeconds = 0;}
  const lockBefore = crew.lockSeconds;
  crew.lockSeconds += dt;
  if (duel.state.stageTimeSec + GEAR_EPSILON < crew.nextFireAt) return work;
  const signature = signatureAttack(duel, actor, crew, target, dt);
  if (signature) {
    crew.signatureUsed = true; crew.shots++;
    if (fighter.flaming) work = Math.max(work, dt);
  }
  else {
    const dune = crew.crewId === 'dune';
    if (dune && Math.hypot(cpuCrewAimPoint(duel, target).x - fighter.x,
      cpuCrewAimPoint(duel, target).z - fighter.z) > gear.range) return work;
    const lock = crew.crewId === 'rook' ? .6 : FOOT.rpgLockSeconds;
    work = Math.max(work, Math.min(dt, Math.max(0, lock - lockBefore)));
    if (crew.lockSeconds + GEAR_EPSILON < lock) return work;
    if (!launch(duel, actor, crew, dune ? 'marksman' : 'rpg', target)) return work;
    crew.shots++;
  }
  crew.nextFireAt = duel.state.stageTimeSec + (crew.crewId === 'rook'
    ? 1.8 : crew.crewId === 'dune' ? gear.reload : FOOT.rpgReloadSeconds);
  return work;
}

// The native rival caller opts in and retains collision/boundary/lap handling.
// False means ordinary driving owns this step; true means this stop owns it.
export function stepCpuCrew(duel, actor, dt, {enabled = false} = {}) {
  if (!admitted(duel, enabled) || !duel.state.opponents.includes(actor)) return false;
  const crew = crewState(duel, actor), s = duel.state;
  if (!(dt > 0) || s.status !== 'racing' || s.paused) return false;
  if (crew.departed && s.stageTimeSec >= crew.departed.presentation.startedAt +
      crew.departed.presentation.duration) crew.departed = null;
  stepTurret(duel, actor, crew, dt);
  if (actor.combatWrecking || actor.crushed || actor.finished) {
    if (crew.phase !== 'driving') finishStop(duel, actor);
    return false;
  }
  if (crew.phase === 'driving') {
    const stop = eligibleStop(duel, actor, crew);
    const same = stop && crew.pendingStop?.kind === stop.kind &&
      s.stageTimeSec - crew.lastEligibleAt <= dt + GEAR_EPSILON;
    crew.eligibleSeconds = stop ? (same ? crew.eligibleSeconds : 0) + dt : 0;
    crew.pendingStop = stop; crew.lastEligibleAt = s.stageTimeSec;
    if (!stop || crew.eligibleSeconds + GEAR_EPSILON < 1) return false;
    if (!startStop(duel, actor, crew, stop)) return false;
    crew.pendingStop = null; crew.eligibleSeconds = 0;
  }
  strikeCpuCrewFighterFromVehicles(duel, actor);
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
  if (crew.phase === 'pulling-over') {
    crew.overheadSeconds += dt;
    pullOver(duel, actor, crew, dt); return true;
  }
  actor.speedMph = 0; actor.braking = true;
  if (crew.phase === 'recovering') {
    crew.fighter.knockdownRemaining = Math.max(0, crew.respawnAt - s.stageTimeSec);
    if (s.stageTimeSec + GEAR_EPSILON >= crew.respawnAt) {
      const replacement = besideCar(duel, actor, crew);
      Object.assign(crew.fighter, replacement, {respawns: crew.fighter.respawns + 1});
      crew.fighter.presentation = {clip: 'get-up', startedAt: s.stageTimeSec, duration: .8};
      crew.phase = crew.resumePhase;
      duel.emit({cpuCrewRespawned: true, actor, enemy: true, crewId: crew.crewId,
        actorId: targetIdentity(duel, actor), hitPosition: crew.fighter});
    }
    return true;
  }
  if (crew.phase === 'repair') {
    if (enemyCarNear(duel, actor)) {finishStop(duel, actor); return true;}
    const seconds = FOOT.wrenchRepairSeconds / (crewPerks(crew.crewId).repairRateMultiplier || 1);
    if (!crew.fighter.repairing) duel.emit({footRepairStarted: true, actor, enemy: true,
      actorId: targetIdentity(duel, actor), hitPosition: crew.fighter});
    crew.fighter.repairing = true;
    const live = Math.min(dt, Math.max(0, seconds - crew.repairSeconds));
    const amount = FOOT.wrenchRepairAmount * live / seconds;
    actor.armor = Math.min(actor.maxArmor, actor.armor + amount);
    crew.repairSeconds += live; crew.repairAmount += amount;
    if (crew.repairSeconds + GEAR_EPSILON >= seconds) finishStop(duel, actor, {repairCompleted: true});
  } else if (crew.phase === 'ambush') {
    // Only native lock, reload and active flame are weapon work. Range waiting
    // spends the overhead cap; the player's forced recovery stays three seconds.
    crew.overheadSeconds += dt - ambush(duel, actor, crew, dt);
    if (crew.phase === 'ambush' && crew.overheadSeconds + GEAR_EPSILON >=
        STOP_PACING.overhead - STOP_PACING.pullAway) finishStop(duel, actor);
  }
  return true;
}

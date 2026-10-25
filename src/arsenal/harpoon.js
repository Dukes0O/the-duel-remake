import {point, predictedPoint, velocity} from '../combat-actors.js';
import {COMBAT_TUNING} from '../wasteland-tuning.js';
import {applyArmorDamage, combatShielded} from '../combat-armor.js';
import {combatOwnerId, outOfPlay} from '../combat-teams.js';
import {carEffect, setCarEffect, carSteering, addCarSidewaysPush} from './car-effects.js';
import {targetFor, targetIdentity, actorForTarget} from './targeting.js';
import {isConvoyRig} from '../arena/modes/convoy-raid.js';

const RANGE = 50, SPEED = 70, CONE = 4 * Math.PI / 180;
const angleDifference = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function shouldUseHarpoon(duel, owner) {
  const at = point(duel, owner), target = targetFor(duel, owner, {range: RANGE, origin: at});
  if (!target) return false;
  const to = point(duel, target), dx = to.x - at.x, dz = to.z - at.z;
  const distance = Math.hypot(dx, dz), heading = at.heading + (owner.headingError || 0);
  return distance >= 15 && distance <= RANGE &&
    Math.abs(angleDifference(heading, Math.atan2(dx, dz))) <= 5 * Math.PI / 180;
}

export function launchHarpoon(duel, owner, enemy, level) {
  const combat = duel.state.combat, at = point(duel, owner);
  if (combat.projectiles.length >= COMBAT_TUNING.projectileLimit) return null;
  const target = targetFor(duel, owner, {range: RANGE, origin: at});
  if (enemy && !target) return null;
  const now = target && point(duel, target);
  const lead = target && predictedPoint(duel, target, Math.hypot(now.x - at.x, now.z - at.z) / SPEED);
  const bearing = lead ? Math.atan2(lead.x - at.x, lead.z - at.z) : at.heading + (owner.headingError || 0);
  const dx = Math.sin(bearing), dz = Math.cos(bearing), carry = velocity(owner, at);
  const projectile = {id: ++combat.serial, kind: 'harpoon', enemy, level,
    x: at.x + dx * COMBAT_TUNING.projectileSpawnOffset,
    y: at.y + COMBAT_TUNING.projectileSpawnHeight,
    z: at.z + dz * COMBAT_TUNING.projectileSpawnOffset,
    vx: dx * SPEED + carry.x, vz: dz * SPEED + carry.z, vy: 0, age: 0,
    travelled: 0, attackerId: targetIdentity(duel, owner),
    ownerId: combatOwnerId(duel, owner), targetId: target ? targetIdentity(duel, target) : null};
  projectile.launchBearing = Math.atan2(projectile.vx, projectile.vz);
  combat.projectiles.push(projectile);
  duel.emit({arsenalCue: 'weapon.harpoon.fire', actor: owner, projectile,
    hitPosition: {x: at.x, y: at.y, z: at.z}});
  // Flight is a travelling cue whose product id permits the audio owner to
  // stop it when the native product retires, without reading mutable physics.
  duel.emit({arsenalCue: 'weapon.harpoon.flight', actor: owner, projectile,
    hitPosition: {x: projectile.x, y: projectile.y, z: projectile.z}});
  return projectile;
}

export function steerHarpoon(duel, projectile, dt) {
  if (!projectile.targetId) return;
  const attacker = actorForTarget(duel, projectile.attackerId);
  const target = targetFor(duel, attacker, {origin: projectile,
    range: Math.max(0, RANGE - projectile.travelled), lockedTargetId: projectile.targetId});
  if (!target) {projectile.targetId = null; return;}
  projectile.targetId = targetIdentity(duel, target);
  const speed = Math.hypot(projectile.vx, projectile.vz), at = point(duel, target);
  const future = predictedPoint(duel, target, Math.hypot(at.x - projectile.x, at.z - projectile.z) / speed);
  const desired = Math.atan2(future.x - projectile.x, future.z - projectile.z);
  const goal = projectile.launchBearing + clamp(angleDifference(projectile.launchBearing, desired), -CONE, CONE);
  const current = Math.atan2(projectile.vx, projectile.vz);
  const turn = COMBAT_TUNING.crossbow.homingTurnRadiansPerSecond * dt;
  const next = current + clamp(angleDifference(current, goal), -turn, turn);
  projectile.vx = Math.sin(next) * speed; projectile.vz = Math.cos(next) * speed;
}

export function harpoonTravelStep(projectile, dt) {
  const speed = Math.hypot(projectile.vx, projectile.vz);
  const step = Math.min(dt, Math.max(0, RANGE - projectile.travelled) / Math.max(speed, 1e-9));
  projectile.travelled = Math.min(RANGE, projectile.travelled + speed * step);
  return step;
}

export function hitHarpoon(duel, target, projectile, hitPosition = point(duel, target)) {
  const shooter = actorForTarget(duel, projectile.attackerId);
  if (!shooter || outOfPlay(duel, target) || combatShielded(duel, target)) return;
  const removed = applyArmorDamage(duel, target, 'harpoon',
    {level: projectile.level, owner: projectile.ownerId, hitPosition});
  if (!(removed > 0)) return;
  const at = point(duel, target), from = point(duel, shooter);
  if (!isConvoyRig(duel, target)) hitPosition = {x: at.x, y: at.y, z: at.z};
  const headingError = target.headingError || 0, heading = at.heading + headingError;
  const side = (from.x - at.x) * Math.cos(heading) - (from.z - at.z) * Math.sin(heading);
  if (!target.combatWrecking) {
    const yank = (Math.sign(side) || 1) * 6;
    if (target.knock) {
      target.knock.vx += Math.cos(heading) * yank;
      target.knock.vz -= Math.sin(heading) * yank;
    } else addCarSidewaysPush(target, yank, headingError);
    setCarEffect(target, 'tether', {duration: 3, topSpeed: .8,
      shooterId: projectile.attackerId, awaySec: 0});
  }
  duel.emit({combatHit: true, strength: removed / 60, enemy: shooter !== duel.state,
    victim: target === duel.state ? 'player' : 'rival',
    hitPosition});
  duel.emit({arsenalCue: 'weapon.harpoon.hit', actor: target, projectile,
    hitPosition});
}

export function stepTether(duel, target, dt) {
  const effect = carEffect(target, 'tether');
  if (!effect) return;
  const shooter = actorForTarget(duel, effect.shooterId), at = point(duel, target);
  const from = shooter && point(duel, shooter);
  let breaks = effect.remainingSec <= dt + 1e-10 || !shooter || outOfPlay(duel, shooter) || outOfPlay(duel, target) ||
    combatShielded(duel, target) || Math.hypot(from.x - at.x, from.z - at.z) > 60;
  if (!breaks) {
    const heading = at.heading + (target.headingError || 0);
    const side = Math.sign((from.x - at.x) * Math.cos(heading) - (from.z - at.z) * Math.sin(heading));
    const steer = target === duel.state ? target.input.steer : carSteering(target);
    if (Math.abs(steer) >= .6 && Math.sign(steer) === side) effect.awaySec += dt;
    breaks = effect.awaySec + 1e-10 >= .5;
  }
  if (breaks) {
    setCarEffect(target, 'tether', {duration: 0});
    duel.emit({arsenalCue: 'weapon.harpoon.break', actor: target,
      hitPosition: {x: at.x, y: at.y, z: at.z}});
  }
}

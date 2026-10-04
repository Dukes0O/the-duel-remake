import {sweepObstacle, contactZone} from '../collision.js';
import {carBodyPoint} from '../arsenal/hazards.js';
import {hostile, outOfPlay, combatOwnerId, arenaDamageBlocked} from '../combat-teams.js';
import {applyArmorDamage, armorDamageFor} from '../combat-armor.js';
import {damageRaider} from '../raiders.js';
import {damageFighter, knockdownFighter, FIGHTER_RULES} from '../onfoot.js';
import {actorBody, startKnock, bodyHeading} from '../vehicle-knock.js';
import {solveVehicleImpact, yawInertia, CRASH_TUNING, impactSeverity} from '../vehicle-collision.js';

const SHOT_BODY = {halfWidth: .04, halfLength: .04, height: .08};
export function gearDirection(fighter) {
  const yaw = fighter.yaw || 0, pitch = fighter.pitch || 0;
  return {x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch)};
}
export function enemyCars(duel, owner = duel.state) {
  return [duel.state, ...duel.state.opponents].filter(actor =>
    hostile(duel, owner, actor) && !outOfPlay(duel, actor));
}
export function fighterTargets(duel, owner = duel.state, includeOwner = false) {
  const targets = [];
  if (duel.state.onFoot && duel.state.fighter &&
      (includeOwner || hostile(duel, owner, duel.state)) &&
      !arenaDamageBlocked(duel, duel.state, combatOwnerId(duel, owner)))
    targets.push({fighter: duel.state.fighter, raider: false});
  for (const zone of duel.state.raids?.zones || [])
    for (const fighter of zone.raiders)
      if (owner === duel.state || includeOwner) targets.push({fighter, raider: true});
  return targets.filter(target => !target.fighter.knockedDown);
}
export function damageGearCar(duel, actor, amount, owner, normal = null,
  {hitPosition, contactPoint, blastRadius} = {}) {
  if (!(amount > 0)) return 0;
  // Reuse native shield/team protection, armor, wrecking, score and attribution.
  // The multiplier supplies the settled gear amount without a second damage path.
  const face = normal ? contactZone(normal.x, normal.z, carBodyPoint(duel, actor).heading) : null;
  const removed = applyArmorDamage(duel, actor, 'crossbow', {
    owner: combatOwnerId(duel, owner), level: 0, self: actor === owner,
    damageMultiplier: amount / armorDamageFor('crossbow'),
    ...(face ? {contactFace: face} : {}),
    ...(hitPosition ? {hitPosition} : {}),
    ...(contactPoint ? {contactPoint} : {}),
    ...(Number.isFinite(blastRadius) && blastRadius > 0 ? {blastRadius} : {}),
  });
  if (removed > 0) duel.emit({combatHit: true, footGearHit: true,
    strength: removed / 60, victim: actor === duel.state ? 'player' : 'rival',
    owner: combatOwnerId(duel, owner), hitPosition: carBodyPoint(duel, actor)});
  return removed;
}
export function damageGearFighter(duel, target, amount, owner, knockdown = false) {
  const {fighter, raider} = target;
  if (fighter.knockedDown || !(amount > 0)) return false;
  if (raider) damageRaider(duel, fighter, knockdown ? fighter.health : amount,
    {source: 'onFoot', owner: combatOwnerId(duel, owner)});
  else {
    damageFighter(fighter, amount);
    if (knockdown) knockdownFighter(fighter);
  }
  duel.emit({combatHit: true, fighter: true, footGearHit: true,
    victim: raider ? 'raider' : 'player', strength: amount / 60,
    hitPosition: {x: fighter.x, y: fighter.y + 1, z: fighter.z}});
  if (!raider && fighter.knockedDown) duel.emit({fighterKnockdown: true,
    owner: combatOwnerId(duel, owner), source: 'crew-gear'});
  return true;
}
export function gearContact(duel, start, end, owner, {fighters = true} = {}) {
  let first = null;
  function consider(obstacle, target, previous = start) {
    const hit = sweepObstacle(previous, end, obstacle, 0, SHOT_BODY);
    if (hit && (!first || hit.t < first.t)) first = {...hit, ...target,
      point: {x: start.x + (end.x - start.x) * hit.t,
        y: start.y + (end.y - start.y) * hit.t,
        z: start.z + (end.z - start.z) * hit.t}};
  }
  for (const actor of enemyCars(duel, owner)) {
    const at = carBodyPoint(duel, actor), spec = duel._vehicleSpec(actor);
    const ground = duel.course.groundAt(actor.s, actor.lateral);
    const previousGround = duel.course.groundAt(actor.prevS ?? actor.s, actor.prevLateral ?? actor.lateral);
    const previous = {x: start.x + ground.x - previousGround.x,
      y: start.y + ground.y - previousGround.y + (actor.airHeight || 0) - (actor.prevAirHeight || 0),
      z: start.z + ground.z - previousGround.z};
    consider({...at, y: ground.y + (actor.airHeight || 0), halfX: spec.halfWidth,
      halfZ: spec.halfLength, height: spec.height, shape: 'box'}, {actor}, previous);
  }
  if (fighters) for (const target of fighterTargets(duel, owner)) {
    const f = target.fighter;
    consider({x: f.x, y: f.y, z: f.z, halfX: FIGHTER_RULES.radius,
      halfZ: FIGHTER_RULES.radius, height: FIGHTER_RULES.height, shape: 'box'}, {target});
  }
  const from = duel.course.nearest(start.x, start.z), to = duel.course.nearest(end.x, end.z, from.s);
  for (const obstacle of duel._obstacles(Math.min(from.s, to.s) - 4, Math.max(from.s, to.s) + 4))
    consider(obstacle, {scenery: true});
  return first;
}
export function cannonShove(duel, actor, origin, spec) {
  const before = actorBody(duel, actor), dimensions = duel._vehicleSpec(duel.state);
  const heading = Math.atan2(before.x - origin.x, before.z - origin.z);
  const incoming = {x: before.x - Math.sin(heading) * (dimensions.halfLength + before.halfLength),
    z: before.z - Math.cos(heading) * (dimensions.halfLength + before.halfLength), heading,
    vx: Math.sin(heading) * spec.shoveMph * CRASH_TUNING.mphToMps,
    vz: Math.cos(heading) * spec.shoveMph * CRASH_TUNING.mphToMps,
    spin: 0, mass: spec.shoveMass, halfLength: dimensions.halfLength,
    halfWidth: dimensions.halfWidth,
    inertia: yawInertia(spec.shoveMass, dimensions.halfLength, dimensions.halfWidth)};
  const after = solveVehicleImpact(incoming, before).b;
  startKnock(actor, {...after, heading: bodyHeading(duel, actor),
    player: actor === duel.state, arenaShove: !!duel.state.arena,
    severity: impactSeverity(after.dvMph, {attackerMass: spec.shoveMass, mass: before.mass})});
}

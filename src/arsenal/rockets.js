import {point, velocity} from '../combat-weapons.js';
import {sweepObstacle} from '../collision.js';
import {COMBAT_TUNING} from '../wasteland-tuning.js';
import {applyArmorDamage, armorDamageFor, combatShielded} from '../combat-armor.js';
import {combatOwnerId, outOfPlay, hostile} from '../combat-teams.js';
import {targetFor, targetIdentity, actorForTarget} from './targeting.js';
import {carFighterTargets, fighterObstacle, splashCarFighter} from '../crew-gear/contacts.js';

export const ROCKET_RULES = Object.freeze({
  count: 4, spacing: .12, bearings: [-1.5, -.5, .5, 1.5],
  speed: 80, range: 120, damage: 10, blastRadius: 2,
  cpuMinimum: 20, cpuMaximum: 100, cpuAngleDegrees: 3,
});
const EPS = 1e-9;
const SHOT_BODY = {halfWidth: .08, halfLength: .08, height: .16};

function plannedShots(combat) {
  return (combat.rocketVolleys || []).reduce((total, volley) =>
    total + ROCKET_RULES.count - volley.fired, 0);
}
function spawnRocket(duel, volley, slot) {
  const owner = actorForTarget(duel, volley.ownerId);
  if (!owner || outOfPlay(duel, owner)) return null;
  const at = point(duel, owner), carry = velocity(owner, at);
  const bearing = at.heading + (owner.headingError || 0) +
    ROCKET_RULES.bearings[slot] * Math.PI / 180;
  const dx = Math.sin(bearing), dz = Math.cos(bearing);
  const combat = duel.state.combat;
  const shot = {id: ++combat.serial, kind: 'rocket-pod',
    ownerId: combatOwnerId(duel, owner), attackerId: targetIdentity(duel, owner),
    enemy: owner !== duel.state, level: volley.level, volleyId: volley.id,
    x: at.x + dx * COMBAT_TUNING.projectileSpawnOffset,
    y: at.y,
    z: at.z + dz * COMBAT_TUNING.projectileSpawnOffset,
    vx: dx * ROCKET_RULES.speed + carry.x,
    vy: 0, vz: dz * ROCKET_RULES.speed + carry.z,
    travelled: 0, age: 0, launchedAt: volley.startedAt + slot * ROCKET_RULES.spacing};
  combat.projectiles.push(shot);
  volley.shotIds.push(shot.id);
  volley.fired++;
  duel.emit({arsenalCue: 'weapon.rockets.fire', actor: owner, projectile: shot,
    hitPosition: {x: shot.x, y: shot.y, z: shot.z}});
  duel.emit({arsenalCue: 'weapon.rockets.flight', actor: owner, projectile: shot,
    hitPosition: {x: shot.x, y: shot.y, z: shot.z}});
  return shot;
}
export function startRocketVolley(duel, owner, level = 0) {
  const combat = duel.state.combat;
  if (!combat || !owner || outOfPlay(duel, owner) ||
      combat.projectiles.length + plannedShots(combat) + ROCKET_RULES.count >
        COMBAT_TUNING.projectileLimit) return null;
  combat.rocketVolleys ||= [];
  const volley = {id: ++combat.serial, ownerId: targetIdentity(duel, owner), level, startedAt: duel.state.stageTimeSec || 0,
    elapsed: 0, fired: 0, shotIds: []};
  combat.rocketVolleys.push(volley);
  spawnRocket(duel, volley, 0);
  return volley;
}
export function stepRocketVolleys(duel, dt) {
  const combat = duel.state.combat;
  if (!combat?.rocketVolleys?.length || !(dt > 0)) return;
  for (const volley of combat.rocketVolleys) {
    volley.elapsed += dt;
    while (volley.fired < ROCKET_RULES.count &&
      volley.elapsed + EPS >= volley.fired * ROCKET_RULES.spacing) {
      if (!spawnRocket(duel, volley, volley.fired)) break;
    }
  }
  combat.rocketVolleys = combat.rocketVolleys.filter(volley =>
    volley.fired < ROCKET_RULES.count &&
    !outOfPlay(duel, actorForTarget(duel, volley.ownerId)));
}
function defaultDamage(duel, actor, amount, shot) {
  return applyArmorDamage(duel, actor, 'crossbow', {
    owner: shot.ownerId, level: shot.level,
    damageMultiplier: amount / armorDamageFor('crossbow'),
  });
}
function body(duel, actor) {
  const ground = duel.course.groundAt(actor.s, actor.lateral);
  const spec = duel._vehicleSpec(actor);
  return {...ground, y: ground.y + (actor.airHeight || 0),
    halfX: spec.halfWidth, halfZ: spec.halfLength,
    height: spec.height, shape: 'box'};
}
function blast(duel, shot, at, damageCar, shielded) {
  const owner = [duel.state, ...duel.state.opponents].find(actor =>
    targetIdentity(duel, actor) === shot.attackerId);
  for (const actor of [duel.state, ...duel.state.opponents]) {
    if (actor === owner || outOfPlay(duel, actor) ||
        !hostile(duel, owner, actor) || shielded(duel, actor)) continue;
    const target = body(duel, actor);
    const reach = Math.hypot(target.halfX, target.halfZ);
    if (Math.hypot(target.x - at.x, target.z - at.z) >
        ROCKET_RULES.blastRadius + reach + EPS) continue;
    const removed = damageCar(duel, actor, ROCKET_RULES.damage, shot);
    if (removed > 0) duel.emit({combatHit: true, strength: removed / 60,
      enemy: shot.enemy, victim: actor === duel.state ? 'player' : 'rival',
      hitPosition: at});
  }
  for (const target of carFighterTargets(duel, shot))
    splashCarFighter(duel, target.fighter, {...shot, ...at}, ROCKET_RULES.blastRadius, target.raider);
  duel.emit({arsenalCue: 'weapon.rockets.hit', projectile: shot, hitPosition: at});
}
export function stepRocketPod(duel, shot, dt, {damageCar = defaultDamage,
  shielded = combatShielded} = {}) {
  if (!shot || shot.kind !== 'rocket-pod' || shot.dead || !(dt > 0)) return false;
  const speed = Math.hypot(shot.vx, shot.vz);
  if (!(speed > 0)) {shot.dead = true; return false;}
  const travel = Math.min(speed * dt, ROCKET_RULES.range - shot.travelled);
  const from = {x: shot.x, y: shot.y, z: shot.z};
  const fraction = travel / speed;
  const to = {x: from.x + shot.vx * fraction,
    y: from.y + shot.vy * fraction, z: from.z + shot.vz * fraction};
  const owner = [duel.state, ...duel.state.opponents].find(actor =>
    targetIdentity(duel, actor) === shot.attackerId);
  let first = null;
  const consider = obstacle => {
    const hit = sweepObstacle(from, to, obstacle, 0, SHOT_BODY);
    if (hit && (!first || hit.t < first.t)) first = hit;
  };
  for (const actor of [duel.state, ...duel.state.opponents])
    if (actor !== owner && !outOfPlay(duel, actor) && hostile(duel, owner, actor))
      consider(body(duel, actor));
  for (const target of carFighterTargets(duel, shot)) consider(fighterObstacle(target));
  if (duel._obstacles) {
    const a = duel.course.nearest(from.x, from.z), b = duel.course.nearest(to.x, to.z, a.s);
    for (const obstacle of duel._obstacles(Math.min(a.s, b.s) - 3,
      Math.max(a.s, b.s) + 3)) consider(obstacle);
  }
  shot.x = first ? from.x + (to.x - from.x) * first.t : to.x;
  shot.y = first ? from.y + (to.y - from.y) * first.t : to.y;
  shot.z = first ? from.z + (to.z - from.z) * first.t : to.z;
  shot.travelled = Math.min(ROCKET_RULES.range,
    shot.travelled + travel * (first ? first.t : 1));
  shot.age += dt;
  if (first) {
    blast(duel, shot, {x: shot.x, y: shot.y, z: shot.z}, damageCar, shielded);
    shot.dead = true; return false;
  }
  if (shot.travelled + EPS >= ROCKET_RULES.range) {
    shot.dead = true; return false;
  }
  return true;
}
export function rocketCpuAim(distance, angleRadians) {
  return Number.isFinite(distance) && Number.isFinite(angleRadians) &&
    distance >= ROCKET_RULES.cpuMinimum && distance <= ROCKET_RULES.cpuMaximum &&
    Math.abs(angleRadians) <= ROCKET_RULES.cpuAngleDegrees * Math.PI / 180 + EPS;
}
export function shouldUseRocketPods(duel, owner) {
  const at = point(duel, owner);
  const target = targetFor(duel, owner, {range: ROCKET_RULES.cpuMaximum, origin: at});
  if (!target) return false;
  const to = point(duel, target), dx = to.x - at.x, dz = to.z - at.z;
  const heading = at.heading + (owner.headingError || 0);
  const angle = Math.atan2(Math.sin(Math.atan2(dx, dz) - heading),
    Math.cos(Math.atan2(dx, dz) - heading));
  return rocketCpuAim(Math.hypot(dx, dz), angle);
}

import {point, velocity} from '../combat-actors.js';
import {sweepObstacle} from '../collision.js';
import {COMBAT_TUNING} from '../wasteland-tuning.js';
import {applyArmorDamage, armorDamageFor, combatShielded} from '../combat-armor.js';
import {combatOwnerId, outOfPlay, hostile} from '../combat-teams.js';
import {targetFor, targetIdentity, actorForTarget} from './targeting.js';
import {carFighterTargets, fighterObstacle, splashCarFighter} from '../crew-gear/contacts.js';

export const ROCKET_RULES = Object.freeze({
  count: 4, spacing: .12, bearings: [-1.5, -.5, .5, 1.5],
  speed: 80, range: 120, damage: 10, seekerDamage: 8, blastRadius: 2,
  seekerAngleDegrees: 20, seekerTurnDegrees: 35, decoyPullRadius: 25,
  cpuMinimum: 20, cpuMaximum: 100, cpuAngleDegrees: 3,
});
const EPS = 1e-9;
const SHOT_BODY = {halfWidth: .08, halfLength: .08, height: .16};

export const seekerRocketsEnabled = duel => duel.featureFlags?.enabled('seeker-rockets') === true;

function clearSceneryLine(duel, from, to) {
  if (!duel._obstacles) return true;
  const a = duel.course.nearest(from.x, from.z), b = duel.course.nearest(to.x, to.z, a.s);
  return !duel._obstacles(Math.min(a.s, b.s) - 3, Math.max(a.s, b.s) + 3)
    .some(obstacle => sweepObstacle(from, to, obstacle, 0, SHOT_BODY));
}
// Consider each eligible car through the common smoke/hostility filter. The
// nearest car outside the nose cone must not hide another car inside it.
export function seekerTarget(duel, owner, {minimum = 0, maximum = ROCKET_RULES.range} = {}) {
  const at = point(duel, owner), heading = at.heading + (owner.headingError || 0);
  let best = null, nearest = Infinity;
  for (const candidate of [duel.state, ...duel.state.opponents]) {
    if (candidate === owner || candidate.decoy || outOfPlay(duel, candidate)) continue;
    const there = point(duel, candidate), dx = there.x - at.x, dz = there.z - at.z;
    const distance = Math.hypot(dx, dz);
    const angle = Math.atan2(Math.sin(Math.atan2(dx, dz) - heading),
      Math.cos(Math.atan2(dx, dz) - heading));
    if (distance < minimum || distance > maximum || distance >= nearest ||
        Math.abs(angle) > ROCKET_RULES.seekerAngleDegrees * Math.PI / 180 + EPS) continue;
    const target = targetFor(duel, owner, {lockedTargetId: targetIdentity(duel, candidate),
      origin: at, range: maximum, allowDecoys: false});
    if (!target || !clearSceneryLine(duel, at, there)) continue;
    best = target; nearest = distance;
  }
  return best;
}
function steerSeeker(duel, shot, dt) {
  if (shot.seekerTargetId == null) return;
  const owner = actorForTarget(duel, shot.attackerId);
  let target = targetFor(duel, owner, {lockedTargetId: shot.seekerTargetId,
    origin: shot, allowDecoys: false, allowLockedDecoy: true});
  // A smoke break is final, even if smoke later clears or a decoy appears.
  if (!target) {shot.seekerTargetId = null; return;}
  if (!target.decoy) {
    const original = point(duel, target);
    target = targetFor(duel, owner, {lockedTargetId: shot.seekerTargetId, origin: shot,
      decoyFilter: decoy => {
        if (decoy.drone !== true) return false;
        const at = point(duel, decoy);
        return Math.hypot(at.x - original.x, at.z - original.z) <= ROCKET_RULES.decoyPullRadius;
      }});
    if (!target) {shot.seekerTargetId = null; return;}
    shot.seekerTargetId = targetIdentity(duel, target);
  }
  const at = point(duel, target), delta = [at.x - shot.x, at.y - shot.y, at.z - shot.z];
  const length = Math.hypot(...delta);
  if (!(length > EPS)) return;
  const desired = delta.map(value => value / length);
  const speed = Math.hypot(shot.vx, shot.vy, shot.vz);
  const current = [shot.vx / speed, shot.vy / speed, shot.vz / speed];
  const angle = Math.acos(Math.max(-1, Math.min(1, current.reduce((sum, value, i) => sum + value * desired[i], 0))));
  const turn = Math.min(angle, ROCKET_RULES.seekerTurnDegrees * Math.PI / 180 * dt);
  if (angle < EPS) return;
  // Rotate along the shortest arc, with one bounded angular budget in 3D.
  let perpendicular = desired.map((value, i) => value - current[i] * Math.cos(angle));
  let perpendicularLength = Math.hypot(...perpendicular);
  if (perpendicularLength < EPS) {
    perpendicular = [current[2], 0, -current[0]];
    perpendicularLength = Math.hypot(...perpendicular);
    if (perpendicularLength < EPS) {perpendicular = [1, 0, 0]; perpendicularLength = 1;}
  }
  const direction = current.map((value, i) => value * Math.cos(turn) +
    perpendicular[i] / perpendicularLength * Math.sin(turn));
  [shot.vx, shot.vy, shot.vz] = direction.map(value => value * ROCKET_RULES.speed);
}

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
  const seeking = seekerRocketsEnabled(duel);
  const shot = {id: ++combat.serial, kind: 'rocket-pod',
    ownerId: combatOwnerId(duel, owner), attackerId: targetIdentity(duel, owner),
    enemy: owner !== duel.state, level: volley.level, volleyId: volley.id,
    damage: seeking ? ROCKET_RULES.seekerDamage : ROCKET_RULES.damage,
    x: at.x + dx * COMBAT_TUNING.projectileSpawnOffset,
    y: at.y,
    z: at.z + dz * COMBAT_TUNING.projectileSpawnOffset,
    vx: dx * ROCKET_RULES.speed + carry.x,
    vy: 0, vz: dz * ROCKET_RULES.speed + carry.z,
    travelled: 0, age: 0, launchedAt: volley.startedAt + slot * ROCKET_RULES.spacing};
  if (seeking) {
    const target = seekerTarget(duel, owner);
    shot.seekerTargetId = target ? targetIdentity(duel, target) : null;
    shot.vx = dx * ROCKET_RULES.speed; shot.vz = dz * ROCKET_RULES.speed;
    if (target) duel.emit({arsenalCue: 'weapon.rockets.lock', actor: owner, projectile: shot, target});
  }
  combat.projectiles.push(shot);
  volley.shotIds.push(shot.id);
  volley.fired++;
  duel.emit({arsenalCue: 'weapon.rockets.fire', actor: owner, projectile: shot,
    hitPosition: {x: shot.x, y: shot.y, z: shot.z}});
  duel.emit({arsenalCue: 'weapon.rockets.flight', actor: owner, projectile: shot,
    hitPosition: {x: shot.x, y: shot.y, z: shot.z}});
  return shot;
}
// Boss turrets use the same native rocket body and flight, with a committed
// world aim instead of the four-shot car volley's spread.
export function rocketArrivalSeconds(dx, dz, vx = 0, vz = 0) {
  const a = vx * vx + vz * vz - ROCKET_RULES.speed ** 2;
  const b = 2 * (dx * vx + dz * vz), c = dx * dx + dz * dz;
  const disc = b * b - 4 * a * c;
  const roots = Math.abs(a) < EPS ? [-c / b] : disc >= 0
    ? [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)] : [];
  const arrival = Math.min(...roots.filter(time => Number.isFinite(time) && time > 0));
  return Number.isFinite(arrival) ? arrival : Math.sqrt(c) / ROCKET_RULES.speed;
}
export function launchAimedRocket(duel, owner, aim, {launchedAt = duel.state.stageTimeSec,
  level = 0, origin = null} = {}) {
  const combat = duel.state.combat;
  if (!combat || !owner || outOfPlay(duel, owner) ||
      !Number.isFinite(aim?.x) || !Number.isFinite(aim?.z) ||
      origin && ![origin.x, origin.y, origin.z].every(Number.isFinite) ||
      combat.projectiles.length + plannedShots(combat) >= COMBAT_TUNING.projectileLimit) return null;
  const carPoint = point(duel, owner), at = origin || carPoint, carry = velocity(owner, carPoint);
  const arrival = rocketArrivalSeconds(aim.x - at.x, aim.z - at.z, -carry.x, -carry.z);
  const ax = aim.x - at.x - carry.x * arrival, az = aim.z - at.z - carry.z * arrival;
  const distance = Math.hypot(ax, az);
  if (!(distance > EPS)) return null;
  const dx = ax / distance, dz = az / distance;
  const shot = {id: ++combat.serial, kind: 'rocket-pod',
    ownerId: combatOwnerId(duel, owner), attackerId: targetIdentity(duel, owner),
    enemy: owner !== duel.state, level, damage: ROCKET_RULES.damage,
    x: at.x + (origin ? 0 : dx * COMBAT_TUNING.projectileSpawnOffset), y: at.y,
    z: at.z + (origin ? 0 : dz * COMBAT_TUNING.projectileSpawnOffset),
    vx: dx * ROCKET_RULES.speed + carry.x,
    vy: Number.isFinite(aim.y) && arrival > EPS ? (aim.y - at.y) / arrival : 0,
    vz: dz * ROCKET_RULES.speed + carry.z,
    travelled: 0, age: 0, launchedAt};
  combat.projectiles.push(shot);
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
function defaultDamage(duel, actor, amount, shot, hitPosition) {
  return applyArmorDamage(duel, actor, 'crossbow', {
    owner: shot.ownerId, level: shot.level,
    damageMultiplier: amount / armorDamageFor('crossbow'),
    hitPosition, blastRadius: ROCKET_RULES.blastRadius,
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
    const removed = damageCar(duel, actor, shot.damage ?? ROCKET_RULES.damage, shot, at);
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
  steerSeeker(duel, shot, dt);
  const speed = shot.seekerTargetId !== undefined ? Math.hypot(shot.vx, shot.vy, shot.vz) : Math.hypot(shot.vx, shot.vz);
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
  if (seekerRocketsEnabled(duel)) return !!seekerTarget(duel, owner, {
    minimum: ROCKET_RULES.cpuMinimum, maximum: ROCKET_RULES.cpuMaximum});
  const at = point(duel, owner);
  const target = targetFor(duel, owner, {range: ROCKET_RULES.cpuMaximum, origin: at});
  if (!target) return false;
  const to = point(duel, target), dx = to.x - at.x, dz = to.z - at.z;
  const heading = at.heading + (owner.headingError || 0);
  const angle = Math.atan2(Math.sin(Math.atan2(dx, dz) - heading),
    Math.cos(Math.atan2(dx, dz) - heading));
  return rocketCpuAim(Math.hypot(dx, dz), angle);
}

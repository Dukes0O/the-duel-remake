import {addHazard, carBodyPoint} from '../arsenal/hazards.js';
import {actorForTarget, targetIdentity} from '../arsenal/targeting.js';
import {burst} from '../combat-weapons.js';
import {COMBAT_TUNING} from '../wasteland-tuning.js';
import {crewPerks} from '../crew.js';
import {gearContact, gearDirection, enemyCars, fighterTargets,
  damageGearCar, damageGearFighter, cannonShove} from './contacts.js';
import {signatureFor, GEAR_EPSILON} from './gear.js';

const GRAVITY = COMBAT_TUNING.bomb.gravity;
export function launchGearProjectile(duel, fighter, gear, serial, motion = {x: 0, z: 0}) {
  const combat = duel.state.combat;
  if (combat.projectiles.length >= COMBAT_TUNING.projectileLimit) return null;
  const direction = gearDirection(fighter), origin = {
    x: fighter.x, y: fighter.y + COMBAT_TUNING.foot.rpgEyeHeight, z: fighter.z};
  const thrown = gear.id === 'sticky-bomb' || gear.id === 'smoke-grenade';
  let vx, vy, vz;
  if (thrown) {
    // The throw reaches the aimed surface, capped by the item's own range.
    // A one-second ballistic arc gives a visible rise and real first contact.
    const reach = {x: origin.x + direction.x * gear.range,
      y: origin.y + direction.y * gear.range, z: origin.z + direction.z * gear.range};
    const hit = gearContact(duel, origin, reach, duel.state, {fighters: false});
    const distance = hit ? Math.max(1, gear.range * hit.t) : gear.range;
    const x = fighter.x + Math.sin(fighter.yaw) * distance;
    const z = fighter.z + Math.cos(fighter.yaw) * distance;
    const near = duel.course.nearest(x, z, fighter.s), ground = duel.course.groundAt(near.s, near.lateral);
    vx = Math.sin(fighter.yaw) * distance; vz = Math.cos(fighter.yaw) * distance;
    vy = Math.max(.5, ground.y - origin.y + GRAVITY / 2);
  } else {
    const speed = gear.speed || COMBAT_TUNING.foot.rpgSpeed;
    vx = direction.x * speed; vy = direction.y * speed; vz = direction.z * speed;
  }
  // Inherit measured native movement after contacts, as the released RPG does.
  vx += motion.x; vz += motion.z;
  const shot = {kind: gear.id, crewGearShot: true, crewId: fighter.crewId,
    owner: 'player', attackerId: 'player', id: `crew-${duel.state.stageIndex}-${serial}`,
    ...origin, launchX: origin.x, launchY: origin.y, launchZ: origin.z,
    vx, vy, vz, age: 0, travelled: 0, thrown};
  combat.projectiles.push(shot);
  if (gear.id === 'sticky-bomb') duel.emit({crewGearCue: 'crew.sticky.throw', hitPosition: origin});
  return shot;
}
function landGrenade(duel, shot, hit) {
  const gear = signatureFor(shot.crewId);
  shot.vx = shot.vy = shot.vz = 0;
  shot.stuck = true; shot.fuseSeconds = 0;
  if (hit?.actor) {
    const at = carBodyPoint(duel, hit.actor);
    shot.attachedId = targetIdentity(duel, hit.actor);
    const dx = shot.x - at.x, dz = shot.z - at.z;
    shot.attachAcross = dx * Math.cos(at.heading) - dz * Math.sin(at.heading);
    shot.attachAlong = dx * Math.sin(at.heading) + dz * Math.cos(at.heading);
    shot.attachHeight = shot.y - at.y;
  }
  if (gear.id === 'smoke-grenade') {
    const smoke = addHazard(duel, {kind: 'smoke', shape: 'circle',
      x: shot.x, y: shot.y, z: shot.z, radius: gear.radius,
      lifetime: gear.lifetime, owner: duel.state});
    if (smoke) duel.emit({arsenalCue: 'weapon.smoke.deploy', actor: duel.state,
      hazard: smoke, hitPosition: {x: shot.x, y: shot.y, z: shot.z}});
    return false;
  }
  duel.emit({crewGearCue: 'crew.sticky.arm', hitPosition: {x: shot.x, y: shot.y, z: shot.z}});
  return true;
}
function explodeSticky(duel, shot) {
  const gear = signatureFor(shot.crewId), owner = actorForTarget(duel, shot.attackerId);
  if (!owner) return;
  const radius = gear.radius * (crewPerks(shot.crewId).blastRadiusMultiplier || 1);
  for (const actor of [duel.state, ...duel.state.opponents]) {
    const at = carBodyPoint(duel, actor);
    if (shot.attachedId === targetIdentity(duel, actor) ||
        Math.hypot(at.x - shot.x, at.z - shot.z) < radius)
      damageGearCar(duel, actor, gear.carDamage, owner, null,
        {hitPosition: {x: shot.x, y: shot.y, z: shot.z}, blastRadius: radius});
  }
  for (const target of fighterTargets(duel, owner, true)) {
    const f = target.fighter;
    if (Math.hypot(f.x - shot.x, f.z - shot.z) < radius &&
        Math.abs(f.y + .85 - shot.y) < radius)
      damageGearFighter(duel, target, gear.fighterDamage, owner);
  }
  burst(duel.state.combat, shot, 'blast');
  duel.emit({combatExplosion: true, crewGearCue: 'crew.sticky.explode',
    hitPosition: {x: shot.x, y: shot.y, z: shot.z}});
}

// Compare native terrain along this direct flight segment with the earliest
// body/scenery sweep. Sampling brackets the first crossing; bisection keeps
// the impact on the course surface rather than at an underground endpoint.
function directTerrainContact(duel, start, end, limit) {
  const clearance = fraction => {
    const x = start.x + (end.x - start.x) * fraction;
    const z = start.z + (end.z - start.z) * fraction;
    const near = duel.course.nearest(x, z);
    return start.y + (end.y - start.y) * fraction -
      duel.course.groundAt(near.s, near.lateral).y - .05;
  };
  if (clearance(0) <= 0) return {terrain: true, t: 0};
  const length = Math.hypot(end.x - start.x, end.z - start.z) * limit;
  const samples = Math.max(1, Math.min(32, Math.ceil(length / .5)));
  let previous = 0;
  for (let sample = 1; sample <= samples; sample++) {
    const fraction = limit * sample / samples;
    if (clearance(fraction) <= 0) {
      let low = previous, high = fraction;
      for (let iteration = 0; iteration < 20; iteration++) {
        const middle = (low + high) / 2;
        if (clearance(middle) <= 0) high = middle;
        else low = middle;
      }
      return {terrain: true, t: high};
    }
    previous = fraction;
  }
  return null;
}

// Called from the native projectile loop only for crewGearShot records. Its
// boolean result means retain this projectile; other shots use their old path.
export function stepGearProjectile(duel, shot, dt) {
  if (!shot.crewGearShot || !(dt > 0)) return false;
  const gear = signatureFor(shot.crewId), owner = actorForTarget(duel, shot.attackerId);
  if (!owner) return false;
  shot.age += dt;
  if (shot.stuck) {
    const actor = actorForTarget(duel, shot.attachedId);
    if (actor) {
      const at = carBodyPoint(duel, actor);
      shot.x = at.x + Math.cos(at.heading) * shot.attachAcross + Math.sin(at.heading) * shot.attachAlong;
      shot.z = at.z - Math.sin(at.heading) * shot.attachAcross + Math.cos(at.heading) * shot.attachAlong;
      shot.y = at.y + shot.attachHeight;
    }
    const previous = shot.fuseSeconds;
    shot.fuseSeconds += dt;
    if (Math.floor(previous) !== Math.floor(shot.fuseSeconds) && shot.fuseSeconds < gear.fuse)
      duel.emit({crewGearCue: 'crew.sticky.beep', hitPosition: {x: shot.x, y: shot.y, z: shot.z}});
    if (shot.fuseSeconds + GEAR_EPSILON < gear.fuse) return true;
    explodeSticky(duel, shot); return false;
  }
  const old = {x: shot.x, y: shot.y, z: shot.z};
  const range = gear.range || COMBAT_TUNING.foot.rpgSpeed * COMBAT_TUNING.foot.rpgLifetimeSeconds;
  const distance = Math.hypot(shot.vx, shot.vy, shot.vz) * dt;
  const fraction = shot.thrown ? 1 : Math.min(1, Math.max(0, range - shot.travelled) / distance);
  const time = dt * fraction;
  const end = {x: old.x + shot.vx * time, y: old.y + shot.vy * time - (shot.thrown ? GRAVITY * time * time / 2 : 0),
    z: old.z + shot.vz * time};
  let hit = gearContact(duel, old, end, owner, {fighters: !shot.thrown});
  if (!shot.thrown) {
    const terrain = directTerrainContact(duel, old, end, hit?.t ?? 1);
    if (terrain && (!hit || terrain.t < hit.t)) hit = terrain;
  }
  const travelFraction = hit?.t ?? 1;
  shot.x = old.x + (end.x - old.x) * travelFraction;
  shot.y = old.y + (end.y - old.y) * travelFraction;
  shot.z = old.z + (end.z - old.z) * travelFraction;
  shot.travelled += distance * fraction * travelFraction;
  if (shot.thrown) shot.vy -= GRAVITY * time;
  const near = duel.course.nearest(shot.x, shot.z);
  const ground = duel.course.groundAt(near.s, near.lateral).y;
  if (hit || shot.thrown && shot.y <= ground + .05) {
    if (shot.thrown) {
      shot.y = Math.max(ground + .05, shot.y);
      return landGrenade(duel, shot, hit);
    }
    if (hit.actor) {
      const removed = damageGearCar(duel, hit.actor, gear.carDamage, owner,
        {x: hit.nx, z: hit.nz}, {hitPosition: hit.point});
      if (gear.id === 'scrap-cannon' && removed > 0 && !hit.actor.combatWrecking)
        cannonShove(duel, hit.actor, {x: shot.launchX, z: shot.launchZ}, gear);
    } else if (hit.target) damageGearFighter(duel, hit.target,
      hit.target.fighter.health, owner, true);
    burst(duel.state.combat, shot, 'spark');
    return false;
  }
  if (!shot.thrown && shot.travelled + GEAR_EPSILON >= range) return false;
  if (shot.thrown && Math.hypot(shot.x - shot.launchX, shot.z - shot.launchZ) >= gear.range) {
    // Stop horizontal travel at the throw limit and let it fall onto real ground.
    const ratio = gear.range / Math.hypot(shot.x - shot.launchX, shot.z - shot.launchZ);
    shot.x = shot.launchX + (shot.x - shot.launchX) * ratio;
    shot.z = shot.launchZ + (shot.z - shot.launchZ) * ratio;
    shot.vx = shot.vz = 0;
  }
  return shot.age < COMBAT_TUNING.foot.rpgLifetimeSeconds + 3;
}

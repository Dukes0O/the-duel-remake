import {contactZone} from './collision.js';
import {point, predictedPoint, burst} from './combat-weapons.js';
import {applyArmorDamage, combatArmorEnabled} from './combat-armor.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

const T = COMBAT_TUNING;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const angleDifference = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

function steerBolt(duel, projectile, dt) {
  if (projectile.kind !== 'crossbow' || !Number.isInteger(projectile.targetIndex) ||
      !Number.isFinite(projectile.launchBearing) || !(dt > 0)) return;
  const state = duel.state;
  const target = projectile.targetIndex < 0 ? state : state.opponents[projectile.targetIndex];
  if (!target || target.finished || target.crushed || target.combatWrecking) return;
  const speed = Math.hypot(projectile.vx, projectile.vz);
  if (!(speed > 0)) return;
  const at = point(duel, target);
  const travel = Math.min(T.crossbow.leadTime,
    Math.hypot(at.x - projectile.x, at.z - projectile.z) / speed);
  const future = predictedPoint(duel, target, travel);
  const desired = Math.atan2(future.x - projectile.x, future.z - projectile.z);
  const launch = projectile.launchBearing;
  const goal = launch + clamp(angleDifference(launch, desired),
    -T.crossbow.homingConeRadians, T.crossbow.homingConeRadians);
  const current = Math.atan2(projectile.vx, projectile.vz);
  const step = T.crossbow.homingTurnRadiansPerSecond * dt;
  const next = current + clamp(angleDifference(current, goal), -step, step);
  projectile.vx = Math.sin(next) * speed;
  projectile.vz = Math.cos(next) * speed;
}

function hit(duel, actor, projectile, power, enemy, armorOptions = {}) {
  const state = duel.state;
  const combat = state.combat;
  if (!actor) return;
  const shielded = actor === state
    ? combat.shield > 0 || state.invulnerableSec > 0
    : state.opponents.length <= 1 || actor === state.rival
      ? combat.rivalShield > 0
      : state.opponents.includes(actor) && (actor.combatShield || 0) > 0;
  if (actor.finished || actor.crushed || actor.combatWrecking || shielded ||
      (projectile.kind === 'bomb' && actor.bombImpactCooldown > 0)) return;

  const where = point(duel, actor);
  const normal = Math.sign((where.x - projectile.x) * Math.cos(where.heading) -
    (where.z - projectile.z) * Math.sin(where.heading)) || 1;
  const renderedTurn = actor === state
    ? (actor.slipAngle || 0) + (actor.crashSpin || 0)
    : actor !== state.rival && actor.dir < 0 ? Math.PI : 0;
  const heading = where.heading + (actor.headingError || 0) + renderedTurn;
  let nx = where.x - projectile.x;
  let nz = where.z - projectile.z;
  // An exact overlap has no visible side; use travel, then the rear default.
  if (nx * nx + nz * nz < T.hit.overlapEpsilon) {
    nx = projectile.vx || 0;
    nz = projectile.vz || 0;
  }
  if (nx * nx + nz * nz < T.hit.overlapEpsilon) {
    nx = Math.sin(heading);
    nz = Math.cos(heading);
  }
  const zone = contactZone(nx, nz, heading);
  actor.speedMph *= 1 - power * T.hit.speedLoss;
  actor.pushVelocity = Math.max(-T.hit.pushLimit, Math.min(T.hit.pushLimit,
    (actor.pushVelocity || 0) + normal * power * T.hit.pushImpulse));
  actor.headingError = Math.max(-T.hit.turnLimit, Math.min(T.hit.turnLimit,
    (actor.headingError || 0) + normal * power * T.hit.turnImpulse));
  actor.damageZones ??= {front: 0, rear: 0, left: 0, right: 0};
  actor.damageZones[zone] = Math.min(T.hit.damageLimit, actor.damageZones[zone] + power);

  // One bomb ring makes one shove, even if several explosions overlap.
  if (projectile.kind === 'bomb') actor.bombImpactCooldown = T.bomb.impactCooldown;
  if (actor === state) {
    state.crashFlash = T.hit.flashSeconds;
    state.impactStrength = power;
    duel._callout('INCOMING / ARMOR HIT', T.hit.calloutSeconds);
  } else if (state.opponents.includes(actor) && !enemy) {
    combat.hits++;
    duel._callout('DIRECT HIT / RIVAL SHOVED', T.hit.calloutSeconds);
  }
  // Preserve the audio-facing hit position and the first-rival event fields.
  duel.emit({
    combatHit: true,
    strength: power,
    enemy,
    victim: actor === state ? 'player' : state.opponents.includes(actor) ? 'rival' : 'traffic',
    hitPosition: {x: where.x, y: where.y, z: where.z},
  });
  applyArmorDamage(duel, actor, projectile.kind === 'bomb' ? 'bomb' : 'crossbow',
    {level: projectile.level, ...armorOptions});
}

function sweptApproach(projectile, old, target, radius) {
  const dx = projectile.x - old.x;
  const dz = projectile.z - old.z;
  const distanceSquared = dx * dx + dz * dz;
  const toX = target.x - old.x;
  const toZ = target.z - old.z;
  const centerFraction = distanceSquared
    ? (toX * dx + toZ * dz) / distanceSquared
    : 0;
  const closestFraction = Math.max(0, Math.min(1, centerFraction));
  const distance = Math.hypot(old.x + closestFraction * dx - target.x,
    old.z + closestFraction * dz - target.z);
  // Compare the first point where the sweep enters each vehicle's radius.
  // A center projection can put a wider, nearer car behind a narrower one.
  const perpendicularSquared = Math.max(0,
    toX * toX + toZ * toZ - centerFraction * centerFraction * distanceSquared);
  const entryFraction = distanceSquared
    ? Math.max(0, centerFraction -
      Math.sqrt(Math.max(0, radius * radius - perpendicularSquared) / distanceSquared))
    : 0;
  return {
    fraction: entryFraction,
    distance,
  };
}

function sweptVehicleContact(projectile, old, from, to, radius, height) {
  // Move both bodies through the frame. Their relative X/Z path must enter
  // the vehicle's radius while their relative Y enters its hit band.
  const startX = old.x - from.x, startZ = old.z - from.z;
  const endX = projectile.x - to.x, endZ = projectile.z - to.z;
  const dx = endX - startX, dz = endZ - startZ;
  const a = dx * dx + dz * dz;
  const c = startX * startX + startZ * startZ - radius * radius;
  let horizontalStart = 0, horizontalEnd = 1;
  if (a < 1e-12) {
    if (c >= 0) return null;
  } else {
    const b = 2 * (startX * dx + startZ * dz);
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const root = Math.sqrt(discriminant);
    horizontalStart = Math.max(0, (-b - root) / (2 * a));
    horizontalEnd = Math.min(1, (-b + root) / (2 * a));
    if (horizontalStart > horizontalEnd) return null;
  }

  const startY = old.y - from.y;
  const dy = projectile.y - to.y - startY;
  let verticalStart = 0, verticalEnd = 1;
  if (Math.abs(dy) < 1e-12) {
    if (Math.abs(startY) >= height) return null;
  } else {
    const low = (-height - startY) / dy;
    const high = (height - startY) / dy;
    verticalStart = Math.max(0, Math.min(low, high));
    verticalEnd = Math.min(1, Math.max(low, high));
    if (verticalStart > verticalEnd) return null;
  }
  const fraction = Math.max(horizontalStart, verticalStart);
  return fraction <= Math.min(horizontalEnd, verticalEnd) ? {fraction} : null;
}

export function tickImpactCooldowns(duel, dt) {
  const state = duel.state;
  state.bombImpactCooldown = Math.max(0, (state.bombImpactCooldown || 0) - dt);
  for (const opponent of state.opponents) {
    opponent.bombImpactCooldown = Math.max(0, (opponent.bombImpactCooldown || 0) - dt);
  }
  for (const actor of state.traffic) {
    if (actor) actor.bombImpactCooldown = Math.max(0, (actor.bombImpactCooldown || 0) - dt);
  }
}

export function stepProjectiles(duel, dt) {
  const state = duel.state;
  const combat = state.combat;
  const live = [];
  const modernProjectiles = state.mode === 'wasteland' &&
    duel.featureFlags?.enabled('wasteland2') === true;
  for (const projectile of combat.projectiles) {
    const old = {x: projectile.x, y: projectile.y, z: projectile.z};
    if (modernProjectiles) steerBolt(duel, projectile, dt);
    projectile.age += dt;
    projectile.x += projectile.vx * dt;
    projectile.z += projectile.vz * dt;
    projectile.y += projectile.vy * dt;
    if (projectile.kind === 'bomb') projectile.vy -= T.bomb.gravity * dt;

    const nearest = duel.course.nearest(projectile.x, projectile.z);
    const floor = duel.course.groundAt(nearest.s, nearest.lateral).y;
    let target = null;
    let firstContact = Infinity;
    for (const actor of projectile.enemy ? [state] : state.opponents) {
      const at = point(duel, actor);
      const radius = duel._vehicleSpec(actor).halfWidth + T.projectileRadiusPadding;
      let approach;
      if (modernProjectiles) {
        const from = duel.course.groundAt(actor.prevS ?? actor.s,
          actor.prevLateral ?? actor.lateral);
        from.y += T.pointHeight + (actor.prevAirHeight ?? actor.airHeight ?? 0);
        approach = sweptVehicleContact(projectile, old, from, at, radius,
          T.projectileHitHeight);
      } else if (Math.abs(projectile.y - at.y) < T.projectileHitHeight) {
        const legacy = sweptApproach(projectile, old, at, radius);
        if (legacy.distance < radius) approach = legacy;
      }
      if (approach && approach.fraction < firstContact) {
        firstContact = approach.fraction;
        target = actor;
      }
    }
    const contact = !!target;
    const expired = projectile.age >
      (projectile.kind === 'bomb' ? T.bomb.lifetime : T.crossbow.lifetime);
    if (!contact && projectile.y > floor + T.projectileFloorClearance && !expired) {
      live.push(projectile);
      continue;
    }

    const bombRadius = T.bomb.radius + T.bomb.radiusPerLevel * projectile.level;
    if (combatArmorEnabled(duel) && projectile.kind === 'bomb' &&
        projectile.age < T.armor.bombArmingSeconds) {
      const thrower = projectile.enemy
        ? state.opponents[projectile.sourceIndex] || state.rival
        : state;
      if (thrower) {
        const at = point(duel, thrower);
        if (Math.hypot(at.x - projectile.x, at.z - projectile.z) < bombRadius) {
          projectile.y = Math.max(projectile.y, floor + T.projectileFloorClearance);
          live.push(projectile);
          continue;
        }
      }
    }

    burst(combat, {
      x: projectile.x,
      y: Math.max(floor + T.projectileBurstFloorClearance, projectile.y),
      z: projectile.z,
    }, projectile.kind === 'bomb' ? 'blast' : 'spark');
    if (projectile.kind === 'bomb' && !combat.blastSound) {
      duel.emit({combatExplosion: true});
      combat.blastSound = T.bomb.soundCooldown;
    }
    if (projectile.kind === 'bomb') {
      const thrower = projectile.enemy
        ? state.opponents[projectile.sourceIndex] || state.rival
        : state;
      for (const actor of [state, ...state.opponents, ...state.traffic]) {
        if (!actor || actor.alive === false) continue;
        const at = point(duel, actor);
        const distance = Math.hypot(at.x - projectile.x, at.z - projectile.z,
          at.y - projectile.y);
        const radius = bombRadius;
        const selfDamage = actor === thrower ? T.bomb.selfDamage : 1;
        if (distance < radius) {
          hit(duel, actor, projectile,
            (1 - distance / radius) * T.bomb.blastPower *
            (1 + projectile.level * T.bomb.powerPerLevel) * selfDamage,
            projectile.enemy, {distanceFraction: distance / radius,
              self: actor === thrower});
        }
      }
    } else if (contact) {
      hit(duel, target, projectile,
        T.crossbow.power * (1 + projectile.level * T.crossbow.powerPerLevel),
        projectile.enemy);
    }
  }
  combat.projectiles = live;
}

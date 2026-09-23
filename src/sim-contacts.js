// RFX-02: extracted from Duel without changing fixed-step race rules.
import { CARS, DRIVE, TRAFFIC, SCORING, BOOST } from './config.js';
import { sweepBox, sweepObstacle, contactZone, CAR_HALF_WIDTH, CAR_HALF_LENGTH } from './collision.js';
import { vehicleContactEnvelope, npcYieldContactNormal } from './npc-yielding.js';
import { offroadCapability, rockHeight, rockSupportHeight, canCrushVehicle, crushedVehicleSupport } from './offroad-physics.js';
import { sampleMountainSupport } from './mountain-support.js';
import { combatCrashThresholdMph, rearRamResponse } from './vehicle-impact.js';
import { breakableScenery, sceneryIdentity, trafficDestruction, startTrafficWreck } from './destructibles.js';
import { GLANCING_WALL_NORMAL_FRACTION, clamp, freshDamageZones } from './sim-common.js';
import {applyRamArmorDamage, applySceneryArmorDamage, combatArmorEnabled} from './combat-armor.js';

function combatShieldForActor(state, actor) {
  if (actor === state) return state.combat?.shield;
  // The original one-rival rule applied rivalShield to all non-player actors,
  // including traffic. Preserve that race behavior until a separate fix.
  if (state.opponents.length <= 1 || actor === state.rival) return state.combat?.rivalShield;
  return state.opponents.includes(actor) ? actor.combatShield : 0;
}

export function _vehicleSpec(actor) {
  // Upgrades change handling and power, never the collision shell or mass.
  const car = CARS[actor === this.state ? this.state.car : actor.car || (actor === this.state.rival ? this.state.car : null)] || {};
  return { halfWidth: car.collision?.halfWidth ?? CAR_HALF_WIDTH, halfLength: car.collision?.halfLength ?? CAR_HALF_LENGTH, mass: car.mass || 1450, height: car.height || 1.35 };
}

export function _collisions() {
  const s = this.state;
  this._staticContacts(s, true);
  for (const opponent of s.opponents) this._vehicleContact(s, opponent, 'rival');
  for (let i = 0; i < s.opponents.length; i++) {
    for (let j = i + 1; j < s.opponents.length; j++) this._vehicleContact(s.opponents[i], s.opponents[j], 'rival');
  }
  for (const c of s.traffic) {
    if (!c.alive || c.crushed) continue;
    // swept longitudinal test: a head-on closing speed can cross the whole
    // hit window in one clamped frame, so a relative sign flip counts too
    const phase = this.relativeS(c.s, s.s) - c.s;
    const now = c.s + phase - s.s;
    const prev = (c.prevS ?? c.s) + phase - (s.prevS ?? s.s);
    const clearance = Math.abs(c.lateral - s.lateral);
    this._vehicleContact(s, c, c.dir < 0 ? 'head_on' : 'traffic');
    if (!c.alive || c.wrecked) continue;
    for (const opponent of s.opponents) this._vehicleContact(opponent, c, 'traffic');
    // Reward a completed pass once, rather than every frame spent near a car.
    if (c.passedLap !== s.completedLaps && prev > 0 && now <= 0) {
      c.passed = true; c.passedLap = s.completedLaps;
      if (!this.course.def.practice && !c.crushed && s.invulnerableSec <= 0 && clearance >= TRAFFIC.collideLatU && clearance < TRAFFIC.nearMissLatU && s.speedMph >= TRAFFIC.nearMissMinMph) {
        s.combo = Math.min(SCORING.comboMax, s.combo + 1);
        s.comboTimer = SCORING.comboWindowSec;
        s.nearMisses++;
        const points = SCORING.nearMissPoints * s.combo * this.scoreMultiplier;
        s.stageStyleScore += points; s.score += points;
        s.boost = Math.min(1, s.boost + BOOST.nearMissRefill);
        this._callout(`NEAR MISS  +${points}${s.combo > 1 ? `  /  ${s.combo}× COMBO` : ''}`);
        this.emit({ nearMiss: { points, combo: s.combo } });
      }
    }
  }
  // A vehicle pushed sideways may now touch scenery. Resolve that contact
  // again, including when damage is temporarily disabled after a crash.
  this._staticContacts(s, true);
  for (const opponent of s.opponents) this._staticContacts(opponent, false);
}

export function _obstacles(fromS, toS) {
  if (this.course.obstaclesNear) {
    if (this._obstacleArray !== this.course.features.obstacles) { this._obstacleArray = this.course.features.obstacles; this._obstacleQueryCache.clear(); }
    const first = Math.floor((Math.min(fromS, toS) - 10) / 64), last = Math.floor((Math.max(fromS, toS) + 10) / 64), key = `${first}:${last}`;
    if (!this._obstacleQueryCache.has(key)) this._obstacleQueryCache.set(key, this.course.obstaclesNear(fromS, toS)
      .filter(obstacle => !this._brokenSceneryIds?.has(sceneryIdentity(obstacle))));
    return this._obstacleQueryCache.get(key);
  }
  // Keeps older exported courses usable while they acquire world colliders.
  return (this.course.rocksNear?.(fromS, toS) || []).map(rock => ({
    ...this.course.worldAt(rock.s, rock.off), id: rock.id, kind: 'rock', s: rock.s, off: rock.off,
    halfX: rock.radiusX, halfZ: rock.radiusZ,
  }));
}

export function _roadPosition(world, hintS) {
  if (this.course.nearest) return this.course.nearest(world.x, world.z, hintS);
  // Local projection fallback for older saved course objects.
  const f = this.course.at(hintS), dx = world.x - f.x, dz = world.z - f.z;
  return { s: hintS + dx * Math.sin(f.heading) + dz * Math.cos(f.heading),
    lateral: dx * Math.cos(f.heading) - dz * Math.sin(f.heading) };
}

export function _supportAt(distance, lateral, actor = this.state) {
  const ground = this.course.groundAt(distance, lateral);
  const capability = actor === this.state ? offroadCapability(this.car) : null;
  if (!capability) return ground;
  if (this.course.features.mountains?.length) {
    const mountain = sampleMountainSupport(this.course, ground.x, ground.z);
    if (mountain != null) ground.y = Math.max(ground.y, mountain);
  }
  for (const obstacle of this._obstacles(distance - 5, distance + 5)) {
    const height = rockSupportHeight(obstacle, ground.x, ground.z, capability);
    if (height != null) ground.y = Math.max(ground.y, height);
  }
  for (const wreck of this._crushedVehicles || []) {
    const height = crushedVehicleSupport(wreck, ground.x, ground.z, this._vehicleSpec(actor).halfLength);
    if (height != null) ground.y = Math.max(ground.y, height);
  }
  return ground;
}

export function _staticContacts(car, player) {
  if (car.crushed || car.combatWrecking || car.tumble) return;
  const oldS = car.prevS ?? car.s, oldLateral = car.prevLateral ?? car.lateral;
  let start = this.course.worldAt(oldS, oldLateral), end = this.course.worldAt(car.s, car.lateral);
  if (![start.x, start.z, end.x, end.z].every(Number.isFinite)) return;
  if (car.airborne || car.airHeight > 0 || car.prevAirHeight > 0 || car.groundHeight != null) {
    start.y = (car.prevGroundHeight ?? this.course.groundAt(oldS, oldLateral).y) + (car.prevAirHeight ?? car.airHeight ?? 0);
    end.y = (car.groundHeight ?? this.course.groundAt(car.s, car.lateral).y) + (car.airHeight || 0);
  } else {
    // Grounded cars keep the established horizontal contact rules; only
    // airborne vehicles need extra terrain samples and vertical clearance.
    start.y = end.y = undefined;
  }
  const travelHeading = this.course.at(car.s).heading + (car.headingError || 0) + (car.dir < 0 ? Math.PI : 0);
  const heading = travelHeading + (car.slipAngle || 0);
  const obstacles = this._obstacles(oldS, car.s);
  const dimensions = this._vehicleSpec(car);
  const capability = player ? offroadCapability(this.car) : null;
  for (let attempt = 0; attempt < 4; attempt++) {
    let first = null;
    for (const obstacle of obstacles) {
      if (this._brokenSceneryIds?.has(sceneryIdentity(obstacle))) continue;
      if (capability && (obstacle.kind === 'rock' && rockHeight(obstacle) <= capability.rockHeight
        || obstacle.kind === 'mountain' && !obstacle.tunnelCover && this.course.features.mountains?.includes(obstacle))) continue;
      const cactus = obstacle.kind === 'tree' && obstacle.theme === 'desert';
      if (cactus && this._fallenCactusIds?.has(obstacle.id)) continue;
      // Unlike a solid tree, a cactus can be cleared by a jump and gives way
      // on contact. Keep the course's reusable scenery data immutable.
      const collider = cactus && Number.isFinite(start.y)
        ? { ...obstacle, height: 3.1 * (obstacle.scale || 1) } : obstacle;
      const hit = sweepObstacle(start, end, collider, heading, dimensions);
      if (hit && (!first || hit.t < first.t)) first = hit;
    }
    if (!first) break;
    if (player) this._breakDrift('hit');
    const { nx, nz, t, penetration, obstacle } = first;
    const dx = end.x - start.x, dz = end.z - start.z;
    const incoming = Math.max(0, -(Math.sin(travelHeading) * nx + Math.cos(travelHeading) * nz) * (car.speedMph < 0 ? -1 : 1));
    const roadHeading = this.course.at(car.s).heading;
    const pushNormal = Math.cos(roadHeading) * nx - Math.sin(roadHeading) * nz;
    const impactMph = Math.abs(car.speedMph) * incoming + Math.max(0, -(car.pushVelocity || 0) * pushNormal) / DRIVE.mphToWorld;
    // A shallow hit on a continuous rail/lining is a sliding scrape, not a
    // crash. Measure incidence against the actual contacted face: striking
    // a rail end remains head-on. Signed reverse travel and sideways pushes
    // count too; body yaw alone cannot turn a sharp impact into a safe one.
    const velocityX = Math.sin(travelHeading) * car.speedMph * DRIVE.mphToWorld + Math.cos(roadHeading) * (car.pushVelocity || 0);
    const velocityZ = Math.cos(travelHeading) * car.speedMph * DRIVE.mphToWorld - Math.sin(roadHeading) * (car.pushVelocity || 0);
    const normalFraction = Math.max(0, -(velocityX * nx + velocityZ * nz)) / Math.max(.000001, Math.hypot(velocityX, velocityZ));
    const glancingWall = !obstacle.arenaWall && (obstacle.tunnelWall || obstacle.barrier) && normalFraction < GLANCING_WALL_NORMAL_FRACTION - 1e-10;
    const zone = contactZone(nx, nz, heading);
    if (capability && obstacle.kind === 'rock' && rockHeight(obstacle) > capability.rockHeight && impactMph >= capability.tipSpeed) {
      car.s = oldS; car.lateral = oldLateral;
      this._terrainPose(); this._startTumble('oversized_rock'); return;
    }
    if (obstacle.kind === 'tree' && obstacle.theme === 'desert') {
      const distance = Math.hypot(dx, dz);
      const fallen = { id: obstacle.id, atTime: this.state.stageTimeSec,
        directionX: distance > .0001 ? dx / distance : -nx,
        directionZ: distance > .0001 ? dz / distance : -nz };
      (this._fallenCactusIds ??= new Set()).add(obstacle.id);
      this.state.fallenCacti.push(fallen);
      car.speedMph *= .92;
      if (player && this.state.invulnerableSec <= 0 && impactMph > 1) this._scrape(zone, Math.min(impactMph, 12));
      this.emit({ cactusHit: fallen });
      // Search the same sweep again: a wall behind the cactus remains solid.
      // Each pass removes one cactus, so this cannot loop on the same plant.
      attempt--;
      continue;
    }
    const broken = breakableScenery(obstacle, impactMph, {
      mode: this.state.mode, enabled: this.destructionEnabled(),
    });
    if (broken) {
      const distance = Math.hypot(dx, dz);
      const event = { id: broken.id, kind: broken.kind, atTime: this.state.stageTimeSec,
        directionX: distance > .0001 ? dx / distance : -nx,
        directionZ: distance > .0001 ? dz / distance : -nz };
      (this._brokenSceneryIds ??= new Set()).add(broken.id);
      this._obstacleQueryCache.clear();
      this.state.brokenScenery.push(event);
      car.speedMph = Math.sign(car.speedMph) * Math.max(0, Math.abs(car.speedMph) - broken.speedLossMph);
      if (player && this.state.invulnerableSec <= 0 && impactMph > 1) this._scrape(zone, Math.min(impactMph, 18));
      this.emit({ sceneryBroken: event });
      attempt--;
      continue;
    }
    // Stop the normal component at the first contact; allow the unused
    // tangential movement to slide along the wall instead of sticking.
    const stop = { x: start.x + dx * t + nx * (penetration + .04), z: start.z + dz * t + nz * (penetration + .04),
      y: Number.isFinite(start.y) ? start.y + (end.y - start.y) * t : undefined };
    const remainingX = dx * (1 - t), remainingZ = dz * (1 - t);
    const inward = Math.min(0, remainingX * nx + remainingZ * nz);
    end = { x: stop.x + remainingX - nx * inward, z: stop.z + remainingZ - nz * inward, y: end.y };
    if (first.inside) end = stop;
    start = stop;
    const road = this._roadPosition(end, car.s);
    if (Number.isFinite(road.s) && Number.isFinite(road.lateral)) { car.s = road.s; car.lateral = road.lateral; }
    car.pushVelocity = (car.pushVelocity || 0) * .25;
    const armorContact = combatArmorEnabled(this) &&
      (player || this.state.opponents.includes(car));
    let crashThreshold = 0;
    if (player || armorContact) {
      const thresholdCar = player ? this.car : CARS[car.car] || this.car;
      crashThreshold = this.state.mode === 'wasteland' ?
        combatCrashThresholdMph(thresholdCar) : 28;
    }
    if (armorContact && impactMph >= crashThreshold && !glancingWall) {
      applySceneryArmorDamage(this, car, impactMph);
      if (player && !car.combatWrecking) this._scrape(zone, impactMph);
    } else if (player && this.state.invulnerableSec <= 0 && this.state.impactTimer <= 0) {
      if (impactMph >= crashThreshold && !glancingWall)
        this._crash(obstacle.kind || 'rock', Math.sign(nx), impactMph, zone);
      else if (impactMph > 4) this._scrape(zone, impactMph);
    }
    car.speedMph *= Math.max(.08, 1 - incoming * .94);
    if (!player) { car.contactCooldown = 1.2; car.headingError = clamp((car.headingError || 0) - Math.sign(car.lateral) * .25, -.65, .65); }
  }
  car.offRoad = !this._surface(car.s, car.lateral).mainRoad;
}

export function _vehicleContact(a, b, reason) {
  if (a.crushed || b.crushed || a.wrecked || b.wrecked ||
      a.combatWrecking || b.combatWrecking || a.tumble || b.tumble) return false;
  if (b === this.state && a !== this.state) return this._vehicleContact(b, a, reason);
  const phase = this.relativeS(b.s, a.s) - b.s;
  const start = { x: (a.prevLateral ?? a.lateral) - (b.prevLateral ?? b.lateral), z: (a.prevS ?? a.s) - (b.prevS ?? b.s) - phase };
  const end = { x: a.lateral - b.lateral, z: a.s - b.s - phase };
  // A road-aligned envelope is intentionally a little generous to avoid
  // the visible cars interpenetrating while their bodies drift.
  const angleA = (a.headingError || 0) + (a.slipAngle || 0), angleB = (b.headingError || 0) + (b.slipAngle || 0);
  const specA = this._vehicleSpec(a), specB = this._vehicleSpec(b);
  if (a.airborne || b.airborne || a.groundHeight != null || b.groundHeight != null) {
    const heightA = (a.groundHeight ?? this.course.groundAt(a.s, a.lateral).y) + (a.airHeight || 0), heightB = (b.groundHeight ?? this.course.groundAt(b.s, b.lateral).y) + (b.airHeight || 0);
    if (heightA > heightB + specB.height || heightB > heightA + specA.height) return false;
  }
  const { width, length } = vehicleContactEnvelope(a, b, specA, specB);
  const hit = sweepBox(start, end, width, length);
  if (!hit) return false;
  const descendingCrush = a === this.state && a.airborne && a._verticalSpeed < -1 && (a.prevAirHeight || 0) > (a.airHeight || 0)
    && canCrushVehicle(this.car, specB, { descending: true });
  const yieldNormal = a === this.state && !descendingCrush ? npcYieldContactNormal(a, b, hit, start.z) : null;
  if (yieldNormal) {
    // A late cut-in or numerical overlap is not permission for an NPC to
    // damage/shove the player. Rewind only that NPC to the contact side.
    const { nx, nz } = yieldNormal;
    const correction = Math.max(0, nx ? width + .08 - end.x * nx : length + .08 - end.z * nz);
    const proposed = { s: b.s - nz * correction, lateral: b.lateral - nx * correction };
    const previous = { s: b.prevS ?? b.s, lateral: b.prevLateral ?? b.lateral };
    const previousPoint = this.course.worldAt(previous.s, previous.lateral);
    const clear = pose => {
      if (Math.abs(a.lateral - pose.lateral) < width + .04 && Math.abs(this.relativeS(pose.s, a.s) - a.s) < length + .04) return false;
      const point = this.course.worldAt(pose.s, pose.lateral), heading = this.course.at(pose.s).heading + angleB + (b.dir < 0 ? Math.PI : 0);
      return !this._obstacles(Math.min(previous.s, pose.s) - specB.halfLength, Math.max(previous.s, pose.s) + specB.halfLength).some(obstacle =>
        !(obstacle.kind === 'tree' && obstacle.theme === 'desert' && this._fallenCactusIds?.has(obstacle.id))
        && sweepObstacle(previousPoint, point, obstacle, heading, specB));
    };
    let safe = clear(proposed) ? proposed : null;
    if (!safe) {
      if (clear(previous)) safe = previous;
      else for (const back of [length + .8, 12, 24, 40]) {
        const retreat = { s: this.relativeS(a.s, b.s) - (b.dir || 1) * back, lateral: previous.lateral };
        if (clear(retreat)) { safe = retreat; break; }
      }
    }
    // If a pathological cut-in leaves no clear local retreat, hold the last
    // pre-movement pose. Do not teleport across scenery or reset near player.
    b.s = (safe || previous).s; b.lateral = (safe || previous).lateral;
    const playerAlong = a.speedMph * Math.cos(a.headingError || 0) * (b.dir || 1);
    b.speedMph = nx || !safe ? 0 : Math.min(b.speedMph, Math.max(0, playerAlong) * .9);
    b.pushVelocity = 0; b.braking = true; b.yieldingToPlayer = true;
    b.contactCooldown = Math.max(b.contactCooldown || 0, .45);
    b.prevS = b.s; b.prevLateral = b.lateral;
    b.offRoad = !this._surface(b.s, b.lateral).mainRoad;
    return true;
  }
  if (a === this.state || b === this.state) this._breakDrift('hit');
  const { nx, nz } = hit;
  const vaX = Math.sin(a.headingError || 0) * a.speedMph * (a.dir || 1) * DRIVE.mphToWorld + (a.pushVelocity || 0);
  const vbX = Math.sin(b.headingError || 0) * b.speedMph * (b.dir || 1) * DRIVE.mphToWorld + (b.pushVelocity || 0);
  const vaZ = a.speedMph * Math.cos(a.headingError || 0) * (a.dir || 1), vbZ = b.speedMph * Math.cos(b.headingError || 0) * (b.dir || 1);
  const impactMph = Math.max(0, -(vaX - vbX) / DRIVE.mphToWorld * nx - (vaZ - vbZ) * nz);
  const armorContact = combatArmorEnabled(this);
  if ((!armorContact || !this.state.opponents.includes(b)) && a === this.state &&
      canCrushVehicle(this.car, specB, { speedMph: a.speedMph,
        impactMph, descending: descendingCrush })) {
    this._crushVehicle(b, reason, impactMph); return true;
  }
  const armoredPlayer = a === this.state && this.state.mode === 'wasteland';
  const crashThreshold = armoredPlayer ? combatCrashThresholdMph(this.car, { targetMass: specB.mass }) : 28;
  const rearRam = armoredPlayer && this.state.opponents.includes(b) && nz < 0 && (b.dir || 1) > 0 && a.speedMph >= 0;
  const zone = contactZone(nx, nz, angleA + (a.dir < 0 ? Math.PI : 0));
  const zoneB = contactZone(-nx, -nz, angleB + (b.dir < 0 ? Math.PI : 0));
  if (armoredPlayer && this.state.traffic.includes(b)) {
    const wreck = trafficDestruction({ enabled: this.destructionEnabled(), mode: this.state.mode,
      impactMph, playerTopSpeedMph: this.car.topSpeed, playerMass: specA.mass, targetMass: specB.mass });
    if (wreck.wreck && startTrafficWreck(b, { atTime: this.state.stageTimeSec,
      impulse: wreck.impulse, side: Math.sign(b.lateral - a.lateral) || Math.sign(nx) || 1 })) {
      // Wrecking the lighter car does not make an extreme head-on hit safe
      // for the attacker. Both outcomes use the same closing-speed measure.
      const crashesBefore = a.stageCrashes, penaltyBefore = a.racePenaltySec;
      if (armorContact) {
        applyRamArmorDamage(this, a, impactMph);
        if (!a.combatWrecking) {
          a.speedMph = Math.sign(a.speedMph) * Math.max(0,
            Math.abs(a.speedMph) - clamp(impactMph * .07, 4, 20));
          if (this.state.invulnerableSec <= 0)
            this._scrape(zone, Math.min(impactMph, 22));
        }
      } else if (this.state.invulnerableSec <= 0 && impactMph >= crashThreshold)
        this._crash(reason, Math.sign(a.lateral - b.lateral), impactMph, zone);
      else {
        a.speedMph = Math.sign(a.speedMph) * Math.max(0, Math.abs(a.speedMph) - clamp(impactMph * .07, 4, 20));
        if (this.state.invulnerableSec <= 0) this._scrape(zone, Math.min(impactMph, 22));
      }
      const playerCrashed = a.stageCrashes > crashesBefore;
      if (!armorContact || !a.combatWrecking) this._callout(playerCrashed
        ? `TRAFFIC WRECKED / IMPACT +${a.racePenaltySec - penaltyBefore} SECONDS`
        : 'TRAFFIC WRECKED', playerCrashed ? 2.8 : 1.5);
      this.emit({ trafficWrecked: { actor: b, impactMph, thresholdMph: wreck.thresholdMph } });
      return true;
    }
  }
  if (a !== this.state) this._dentVehicle(a, zone, impactMph);
  if (b !== this.state) this._dentVehicle(b, zoneB, impactMph);
  // Share the positional correction. Even a protected car remains solid.
  const required = nx ? width + .04 - (a.lateral - b.lateral) * nx : length + .04 - end.z * nz;
  const correction = Math.max(0, required);
  const shareA = specB.mass / (specA.mass + specB.mass), shareB = 1 - shareA;
  a.lateral += nx * correction * shareA; b.lateral -= nx * correction * shareB;
  a.s += nz * correction * shareA; b.s -= nz * correction * shareB;
  if (nx) {
    const shove = clamp(2.5 + impactMph * DRIVE.mphToWorld * .62, 2.5, armoredPlayer ? 28 : 13);
    const pushLimit = armoredPlayer ? 32 : 16;
    a.pushVelocity = clamp((a.pushVelocity || 0) + nx * shove * .6 * shareA, -pushLimit, pushLimit);
    b.pushVelocity = clamp((b.pushVelocity || 0) - nx * shove * 2 * shareB, -pushLimit, pushLimit);
    b.headingError = clamp((b.headingError || 0) - nx * (armoredPlayer ? .07 + Math.min(.16, impactMph / 500) : .07), -.8, .8);
    if (armoredPlayer && this.state.opponents.includes(b)) b.ramRecoverySec = Math.max(b.ramRecoverySec || 0, clamp(.35 + impactMph / 250, .35, 1.1));
    a.speedMph *= .992; b.speedMph *= .985;
    if (a === this.state && this.state.invulnerableSec <= 0) {
      if (!armorContact && armoredPlayer && impactMph >= crashThreshold)
        this._crash(reason, Math.sign(a.lateral - b.lateral), impactMph, zone);
      else if (impactMph > 1) this._scrape(zone, impactMph);
    }
  } else if (impactMph > 0 || rearRam && Math.abs(a.input?.steer || 0) > .1) {
    const backingPlayer = a === this.state && a.speedMph < 0;
    if (rearRam) {
      const ram = rearRamResponse({ closingMph: impactMph, attackerMph: a.speedMph,
        attackerMass: specA.mass, targetMass: specB.mass, steer: a.input?.steer || 0, offset: b.lateral - a.lateral });
      a.speedMph = Math.max(0, a.speedMph - ram.attackerLossMph);
      b.speedMph = Math.max(0, b.speedMph + ram.targetGainMph);
      b.pushVelocity = clamp((b.pushVelocity || 0) + ram.lateralKick, -32, 32);
      b.headingError = clamp((b.headingError || 0) + Math.sign(ram.lateralKick) * Math.min(.3, Math.abs(ram.lateralKick) * .014), -.8, .8);
      b.ramRecoverySec = Math.max(b.ramRecoverySec || 0, clamp(.4 + impactMph / 230, .4, 1.2));
      if (ram.launchMps > 0) {
        b._ramVerticalSpeed = Math.max(b._ramVerticalSpeed || 0, ram.launchMps);
        b.airborne = true; b.airHeight = Math.max(b.airHeight || 0, .03);
      }
      this.emit({ vehicleRam: true, victim: 'rival', impactMph, lateralKick: ram.lateralKick, launched: ram.launchMps > 0 });
    } else {
      const momentum = (vaZ * specA.mass + vbZ * specB.mass) / (specA.mass + specB.mass);
      const combined = backingPlayer ? momentum : Math.max(0, momentum);
      a.speedMph = (a.dir || 1) > 0 ? combined : Math.abs(combined);
      b.speedMph = backingPlayer ? Math.max(0, combined * (b.dir || 1)) : (b.dir || 1) > 0 ? combined : Math.abs(combined);
    }
    if (!armorContact && a === this.state && this.state.invulnerableSec <= 0 && impactMph >= crashThreshold)
      this._crash(reason, Math.sign(a.lateral - b.lateral), impactMph, zone);
    else if (a === this.state && this.state.invulnerableSec <= 0 && impactMph > 1) this._scrape(zone, impactMph);
  }
  a.offRoad = !this._surface(a.s, a.lateral).mainRoad;
  b.offRoad = !this._surface(b.s, b.lateral).mainRoad;
  b.contactCooldown = Math.max(b.contactCooldown || 0, .8);
  if (armorContact) {
    applyRamArmorDamage(this, a, impactMph);
    applyRamArmorDamage(this, b, impactMph);
  }
  return true;
}

export function _scrape(zone, impactMph) {
  const s = this.state;
  if (s.damageCooldown > 0 || s.impactTimer > 0 || s.combat?.shield>0) return;
  s.damageZones[zone] = Math.min(5, s.damageZones[zone] + clamp(impactMph / 100, .08, .3));
  s.damageCooldown = .65;
  this.emit({ scrape: true, zone, strength: clamp(impactMph / 80, .1, .5) });
}

export function _crushVehicle(actor, reason, impactMph) {
  if (actor.crushed || combatShieldForActor(this.state, actor)>0) return;
  const s = this.state, point = this.course.groundAt(actor.s, actor.lateral);
  actor.crushed = true; actor.crushDamage = clamp(.65 + impactMph / 160, .65, 1);
  actor.speedMph = 0; actor.pushVelocity = 0; actor.braking = true;
  actor.airborne = false; actor.airHeight = 0; actor._jumpY = null; actor._verticalSpeed = 0; actor._jumpOrigin = null;
  actor.damageZones = { front: 5, rear: 5, left: 5, right: 5 };
  const spec = this._vehicleSpec(actor);
  (this._crushedVehicles ??= []).push({ x: point.x, y: point.y, z: point.z, heading: point.heading + (actor.headingError || 0),
    halfWidth: spec.halfWidth, halfLength: spec.halfLength, height: 1.55 - .76 * actor.crushDamage });
  s.speedMph *= .84;
  const burst = { id: `vehicle-${reason}-${s.stageTimeSec}`, byPlayer: true, x: point.x, y: point.y, z: point.z,
    s: actor.s, off: actor.lateral, strength: actor.crushDamage, serial: (s.crushBurst?.serial || 0) + 1 };
  s.crushBurst = burst;
  // Wrecking an opponent is not a respawning score/credit source or an
  // authored stunt objective. Keep the wreck visible for this whole stage.
  this._callout('VEHICLE CRUSHED', 1.8);
  this.emit({ vehicleCrushed: { ...burst, actor, reason } });
}

export function _dentVehicle(actor, zone, impactMph) {
  if (impactMph <= 1 || actor.damageCooldown > 0 || combatShieldForActor(this.state, actor)>0) return;
  actor.damageZones ??= freshDamageZones();
  const combatImpact = this.state.mode === 'wasteland';
  actor.damageZones[zone] = Math.min(5, actor.damageZones[zone] +
    clamp(impactMph / (combatImpact ? 80 : 100), .18, combatImpact ? 2.4 : 1));
  actor.damageCooldown = .65;
}

export function _crushProps(actor) {
  if (actor.tumble || this.course.def.kind !== 'arena') return;
  const state = this.state, spec = this._vehicleSpec(actor);
  const start = this.course.groundAt(actor.prevS ?? actor.s, actor.prevLateral ?? actor.lateral);
  const end = this.course.groundAt(actor.s, actor.lateral);
  const heading = end.heading + (actor.headingError || 0) + (actor.slipAngle || 0);
  const previousBottom = start.y + (actor.prevAirHeight ?? actor.airHeight ?? 0), bottom = end.y + (actor.airHeight || 0);
  for (const prop of this.course.features.crushables || []) {
    if (state.crushedProps.includes(prop.id)) continue;
    const hit = sweepObstacle(start, end, prop, heading, spec);
    if (!hit) continue;
    const top = prop.y + prop.height;
    let contactTime = hit.t;
    if (previousBottom + (bottom - previousBottom) * contactTime > top) {
      // An overflight counts only if descent reaches the roof while the
      // truck still overlaps it. Crossing high above a row gives no reward.
      if (bottom > top || previousBottom <= bottom) continue;
      contactTime = (previousBottom - top) / (previousBottom - bottom);
      const landing = { x: start.x + (end.x - start.x) * contactTime, z: start.z + (end.z - start.z) * contactTime };
      if (!sweepObstacle(landing, landing, prop, heading, spec)) continue;
    }
    if (spec.mass < (prop.crushMass || 3500)) {
      const stop = { x: start.x + (end.x - start.x) * hit.t + hit.nx * (hit.penetration + .04),
        z: start.z + (end.z - start.z) * hit.t + hit.nz * (hit.penetration + .04) };
      const road = this._roadPosition(stop, actor.s); actor.s = road.s; actor.lateral = road.lateral;
      actor.speedMph *= .35;
      break;
    }
    state.crushedProps.push(prop.id);
    const byPlayer = actor === state, strength = clamp(.35 + actor.speedMph * .006 + Math.max(0, -(actor._verticalSpeed || 0)) * .04, .35, 1);
    actor.speedMph *= 1 - clamp(650 / spec.mass, .06, .18);
    if (!(actor.impactTimer > 0)) {
      if (!actor.airborne) { actor._airOrigin = { x: start.x, z: start.z, time: state.stageTimeSec }; actor.airDistance = 0; actor.airTime = 0; }
      actor.airHeight = Math.max(.08, actor.airHeight || 0); actor.airborne = true;
      actor._jumpY = end.y + actor.airHeight; actor._verticalSpeed = Math.max(actor._verticalSpeed || 0, 1.1 + strength * 1.4);
    }
    const burst = { id: prop.id, byPlayer, x: prop.x, y: prop.y, z: prop.z, s: prop.s, off: prop.off, strength,
      serial: (state.crushBurst?.serial || 0) + 1 };
    state.crushBurst = burst;
    if (byPlayer) {
      const points = this.course.def.practice ? 0 : 150 * this.scoreMultiplier;
      state.crushCount++; state.crushScore += points; state.stageStyleScore += points; state.score += points;
      this._callout(`CAR CRUSH  /  +${points}`, 1.8);
    }
    this.emit({ propCrushed: burst });
  }
}

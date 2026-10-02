// RFX-02: extracted from Duel without changing fixed-step race rules.
import { CARS, DRIVE, TRAFFIC, SCORING, BOOST } from './config.js';
import { sweepBox, sweepObstacle, contactZone, CAR_HALF_WIDTH, CAR_HALF_LENGTH } from './collision.js';
import { vehicleContactEnvelope, npcYieldContactNormal } from './npc-yielding.js';
import { offroadCapability, rockHeight, rockSupportHeight, canCrushVehicle, crushedVehicleSupport } from './offroad-physics.js';
import { sampleMountainSupport } from './mountain-support.js';
import {combatContactCleared, combatCrashThresholdMph, combatFrontSpikes,
  combatRamResponse} from './vehicle-impact.js';
import { breakableScenery, roadsideScenery, roadsideTrafficDecision, sceneryIdentity,
  trafficDestruction } from './destructibles.js';
import { GLANCING_WALL_NORMAL_FRACTION, clamp, freshDamageZones } from './sim-common.js';
import {applyRamArmorDamage, applySceneryArmorDamage, combatArmorEnabled} from './combat-armor.js';
import {combatOwnerId} from './combat-teams.js';
import {vehicleContactModifiers} from './vehicle-contact-modifiers.js';
import {burst} from './combat-weapons.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {KNOCK, resolveCarCrash} from './vehicle-knock.js';
import {CRASH_TUNING} from './vehicle-collision.js';
import {upgradedCar} from './progression.js';
import {armorKitMass} from './armor-kits.js';
import {applyDriverModifiers} from './drivers.js';
import {arenaJunkSpec, contactArenaJunk} from './arena/arena-junk.js';

function roadsideTopSpeedMph(duel, actor) {
  if (actor === duel.state) return duel.car.topSpeed;
  const carKey = actor.car || duel.state.car;
  const base = CARS[carKey] || CARS[duel.state.car];
  return applyDriverModifiers(upgradedCar(base, actor.upgrades || {}),
    actor.driverId, carKey).topSpeed;
}

// A hulk thrown by a hit over 250 km/h blows up where it has got to
// (CRASH-05). It stays as a burnt-out wreck for the rest of the race.
export function explodeTrafficWreck(duel, car) {
  const wreck = car.wrecked;
  if (!wreck || wreck.exploded) return false;
  wreck.exploded = true;
  wreck.verticalVelocity = Math.max(wreck.verticalVelocity || 0, 3.2) + 4.9 * (wreck.age || 0);
  const point = duel.course.groundAt(car.s, car.lateral);
  emitRoadsideImpact(duel, {id: `traffic-${duel.state.traffic.indexOf(car)}`,
    kind: 'traffic', outcome: 'obliterate', impactMph: 0, thresholdMph: 0,
    hitPosition: {x: point.x, y: point.y, z: point.z}, actor: car});
  duel._callout('TRAFFIC EXPLODED', 1.6);
  return true;
}

function emitRoadsideImpact(duel, impact) {
  duel.emit({roadsideImpact: impact});
  if (impact.outcome !== 'obliterate') return;
  const bursts = duel.state.roadsideBursts ??= [];
  const serial = duel.state.roadsideBurstSerial =
    (duel.state.roadsideBurstSerial || 0) + 1;
  bursts.push({id: impact.id, kind: impact.kind, atTime: duel.state.stageTimeSec,
    x: impact.hitPosition.x, y: impact.hitPosition.y, z: impact.hitPosition.z,
    impactMph: impact.impactMph, serial});
  if (bursts.length > COMBAT_TUNING.roadside.burstRecordLimit) bursts.shift();
}

function emitVehicleSmash(duel, {a, b, crash, zone}) {
  if (!crash || crash.severityB === 'nudge' ||
      a !== duel.state && b !== duel.state) return false;
  duel.emit({vehicleSmash: {severity: crash.severityB,
    dvMph: crash.result.b.dvMph, point: crash.result.point,
    traffic: duel.state.traffic.includes(b), actor: b, zone}});
  return true;
}

function combatShieldForActor(duel, actor) {
  const state = duel.state;
  if (actor === state) return state.combat?.shield;
  // Only the actor wearing a shield gets protection in modern combat. Keep
  // the older one-rival traffic behavior when Wasteland 2 is off.
  if (state.mode === 'wasteland' && duel.featureFlags?.enabled('wasteland2') === true &&
      state.traffic.includes(actor)) return 0;
  if (state.opponents.length <= 1 || actor === state.rival) return state.combat?.rivalShield;
  return state.opponents.includes(actor) ? actor.combatShield : 0;
}

function armoredVehicleContact(duel, {a, b, nx, nz, end, width, length, specA, specB,
  impactMph, zoneA, zoneB, pairKey}) {
  const incidents = duel._combatRamIncidents;
  const firstImpact = !incidents.has(pairKey);
  const correction = Math.max(0, nx ? width + .04 - end.x * nx : length + .04 - end.z * nz);
  const shareA = specB.mass / (specA.mass + specB.mass), shareB = 1 - shareA;
  // Continue to separate solid bodies while the incident is latched. Only the
  // first contact transfers momentum or armor and emits a hit.
  a.lateral += nx * correction * shareA;
  b.lateral -= nx * correction * shareB;
  a.s += nz * correction * shareA;
  b.s -= nz * correction * shareB;
  a.offRoad = !duel._surface(a.s, a.lateral).mainRoad;
  b.offRoad = !duel._surface(b.s, b.lateral).mainRoad;
  if (!firstImpact) return true;
  incidents.add(pairKey);

  if (a !== duel.state) duel._dentVehicle(a, zoneA, impactMph);
  if (b !== duel.state) duel._dentVehicle(b, zoneB, impactMph);
  const response = combatRamResponse({closingMph: impactMph, massA: specA.mass,
    massB: specB.mass, speedA: a.speedMph, zoneA, offset: b.lateral - a.lateral,
    steerA: a.input?.steer || 0});
  // Motion comes from the rigid-body solver (docs/CRASH_PHYSICS.md); the
  // ram response still sets the computer's recovery timing and ram cadence.
  // Armor keeps the player in control below a big hit: a lower bar on the
  // road in Mad Max (CRASH-04) than in the Scrapdome arena.
  const crash = resolveCarCrash(duel, a, b, {arenaShoveMph: duel.state.arena ? impactMph : 0,
    playerKnockMinDvMph: duel.state.mode !== 'wasteland' ? 0 : duel.state.arena ?
      CRASH_TUNING.armoredPlayerKnockDvMph : CRASH_TUNING.madMax.playerKnockDvMph});
  for (const actor of [a, b]) if (actor !== duel.state)
    actor.ramRecoverySec = Math.max(actor.ramRecoverySec || 0, response.recoverySeconds);
  emitVehicleSmash(duel, {a, b, crash, zone: zoneB});
  b.contactCooldown = Math.max(b.contactCooldown || 0, .8);
  if (a === duel.state && duel.state.invulnerableSec <= 0 && impactMph > 1)
    duel._scrape(zoneA, impactMph);

  const closingKph = impactMph * COMBAT_TUNING.armor.kphPerMph;
  // On the road, crash physics judges ram damage by each car's own change
  // in velocity (F = ma): a heavy car deals more and takes less (CRASH-04).
  const dvDamage = !duel.state.arena;
  const dvOf = victim => victim === a ? crash.result.a.dvMph : crash.result.b.dvMph;
  if (dvDamage ? Math.max(dvOf(a), dvOf(b)) > COMBAT_TUNING.armor.ramDvThresholdMph :
    closingKph > COMBAT_TUNING.armor.ramThresholdKph) {
    const pointA = duel.course.groundAt(a.s, a.lateral);
    const pointB = duel.course.groundAt(b.s, b.lateral);
    const hitPosition = {x: (pointA.x + pointB.x) / 2, y: (pointA.y + pointB.y) / 2,
      z: (pointA.z + pointB.z) / 2};
    const report = (attacker, victim, face, victimFace) => {
      const attackerIndex = attacker === duel.state ? -1 : duel.state.opponents.indexOf(attacker);
      const victimIndex = victim === duel.state ? -1 : duel.state.opponents.indexOf(victim);
      const spiked = combatFrontSpikes(attacker, face);
      const modifiers = vehicleContactModifiers(duel, attacker, victim, face, victimFace);
      const armorRemoved = applyRamArmorDamage(duel, victim, impactMph,
        {spiked, owner: combatOwnerId(duel, attacker), contactFace: victimFace,
          damageMultiplier: modifiers.multiplier, ...(dvDamage ? {dvMph: dvOf(victim)} : {})});
      const sawHit = armorRemoved > 0 && (modifiers.sideSaws || modifiers.salSweep);
      // This existing bounded spark pool is already drawn by combat effects.
      // Ordinary contacts never add a burst or a new simulation field.
      if (sawHit) burst(duel.state.combat, hitPosition, 'spark');
      if (armorRemoved > 0 && modifiers.salSweep) {
        attacker.salSaw.hit = true;
        duel._callout('SAW SWEEP!', 1.6);
      }
      duel.emit({combatRamHit: true, attacker: attackerIndex < 0 ? 'player' : 'rival',
        victim: victimIndex < 0 ? 'player' : 'rival', attackerIndex, victimIndex,
        armorRemoved, closingKph, spiked, hitPosition, ...(sawHit ? {sideSaws: true} : {})});
    };
    report(b, a, zoneB, zoneA);
    report(a, b, zoneA, zoneB);
  }
  if (a === duel.state && duel.state.opponents.includes(b) && zoneA === 'front' && zoneB === 'rear')
    duel.emit({vehicleRam: true, victim: 'rival', impactMph,
      lateralKick: response.shovelFromA,
      launched: crash.severityB === 'launched'});
  return true;
}

export function _vehicleSpec(actor) {
  if (this.state.arena && actor.kind === 'junkCar') return arenaJunkSpec(actor);
  // Upgrades change handling and power, never the collision shell. Armor-kit
  // plating adds its weight to the mass (Mad Max only; CRASH-04).
  const car = CARS[actor === this.state ? this.state.car : actor.car || (actor === this.state.rival ? this.state.car : null)] || {};
  return { halfWidth: car.collision?.halfWidth ?? CAR_HALF_WIDTH, halfLength: car.collision?.halfLength ?? CAR_HALF_LENGTH,
    mass: (car.mass || 1450) + armorKitMass(actor.combatArmorKit), height: car.height || 1.35 };
}

export function _collisions() {
  const s = this.state;
  this._staticContacts(s, true);
  for (const opponent of s.opponents) this._vehicleContact(s, opponent, 'rival');
  for (let i = 0; i < s.opponents.length; i++) {
    for (let j = i + 1; j < s.opponents.length; j++) this._vehicleContact(s.opponents[i], s.opponents[j], 'rival');
  }
  for (const c of s.traffic) {
    // Mad Max hulks and shoved cars stay solid (CRASH-05).
    if (!c.alive && !solidTraffic(this, c) || c.crushed) continue;
    // swept longitudinal test: a head-on closing speed can cross the whole
    // hit window in one clamped frame, so a relative sign flip counts too
    const phase = this.relativeS(c.s, s.s) - c.s;
    const now = c.s + phase - s.s;
    const prev = (c.prevS ?? c.s) + phase - (s.prevS ?? s.s);
    const clearance = Math.abs(c.lateral - s.lateral);
    this._vehicleContact(s, c, c.dir < 0 ? 'head_on' : 'traffic');
    if (!c.alive && !solidTraffic(this, c) || c.crushed) continue;
    for (const opponent of s.opponents) this._vehicleContact(opponent, c, 'traffic');
    if (!c.alive || c.wrecked) continue;
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
    const hollowObstacles = this.course.muddyHollow?.obstacles;
    if (this._obstacleArray !== this.course.features.obstacles ||
        this._muddyHollowObstacleArray !== hollowObstacles) {
      this._obstacleArray = this.course.features.obstacles;
      this._muddyHollowObstacleArray = hollowObstacles;
      this._obstacleQueryCache.clear();
    }
    const first = Math.floor((Math.min(fromS, toS) - 10) / 64), last = Math.floor((Math.max(fromS, toS) + 10) / 64), key = `${first}:${last}`;
    if (!this._obstacleQueryCache.has(key)) {
      const obstacles = this.course.obstaclesNear(fromS, toS);
      if (this.course.muddyHollow?.obstaclesNear)
        obstacles.push(...this.course.muddyHollow.obstaclesNear(
          first * 64, (last + 1) * 64));
      this._obstacleQueryCache.set(key, obstacles.filter(obstacle =>
        !this._brokenSceneryIds?.has(sceneryIdentity(obstacle)) &&
        !(this.roadsideKnockAwayEnabled() && this._fallenCactusIds?.has(obstacle.id))));
    }
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
  const inMuddyHollow = this.course.muddyHollow?.contains(ground.x, ground.z);
  if (!inMuddyHollow && this.course.features.mountains?.length) {
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

export function _staticContacts(car, player, journeyColliders = null) {
  if (car.crushed || car.combatWrecking || car.tumble) return;
  const oldS = car.prevS ?? car.s, oldLateral = car.prevLateral ?? car.lateral;
  let start = this.course.worldAt(oldS, oldLateral), end = this.course.worldAt(car.s, car.lateral);
  if (![start.x, start.z, end.x, end.z].every(Number.isFinite)) return;
  if (journeyColliders || car.airborne || car.airHeight > 0 || car.prevAirHeight > 0 || car.groundHeight != null) {
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
    for (let index = 0; index < obstacles.length + (journeyColliders?.length || 0); index++) {
      const obstacle = index < obstacles.length ? obstacles[index] : journeyColliders[index - obstacles.length];
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
    if (player && !journeyColliders) this._breakDrift('hit');
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
    if (!journeyColliders && capability && obstacle.kind === 'rock' && rockHeight(obstacle) > capability.rockHeight && impactMph >= capability.tipSpeed) {
      car.s = oldS; car.lateral = oldLateral;
      this._terrainPose(); this._startTumble('oversized_rock'); return;
    }
    if (!journeyColliders && this.roadsideKnockAwayEnabled() &&
        (player || this.state.opponents.includes(car))) {
      const topSpeedMph = roadsideTopSpeedMph(this, car);
      const roadsideHit = roadsideScenery(obstacle, impactMph, topSpeedMph);
      if (roadsideHit) {
        const distance = Math.hypot(dx, dz);
        const event = {id: roadsideHit.id, kind: roadsideHit.kind,
          outcome: roadsideHit.outcome, atTime: this.state.stageTimeSec,
          directionX: distance > .0001 ? dx / distance : -nx,
          directionZ: distance > .0001 ? dz / distance : -nz};
        if (roadsideHit.kind === 'cactus') {
          (this._fallenCactusIds ??= new Set()).add(event.id);
          this.state.fallenCacti.push(event);
        } else {
          (this._brokenSceneryIds ??= new Set()).add(event.id);
          this.state.brokenScenery.push(event);
        }
        this._obstacleQueryCache.clear();
        car.speedMph = Math.sign(car.speedMph) * Math.max(0,
          Math.abs(car.speedMph) - roadsideHit.speedLossMph);
        const hitX = start.x + dx * t, hitZ = start.z + dz * t;
        const ground = this.course.groundAt(obstacle.s, obstacle.off ?? 0);
        emitRoadsideImpact(this, {id: event.id, kind: event.kind,
          outcome: event.outcome, impactMph, thresholdMph: roadsideHit.thresholdMph,
          hitPosition: {x: hitX, y: ground.y, z: hitZ}});
        attempt--;
        continue;
      }
    }
    if (!journeyColliders && obstacle.kind === 'tree' && obstacle.theme === 'desert') {
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
    const broken = !journeyColliders && breakableScenery(obstacle, impactMph, {
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
    if (journeyColliders) {
      car.speedMph *= Math.max(.08, 1 - incoming * .94);
      continue;
    }
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

// In Mad Max on the road, a smashed or shoved car and its hulk stay solid
// (CRASH-05); elsewhere they are scenery the cars pass.
function solidTraffic(duel, actor) {
  return duel.state.mode === 'wasteland' && !duel.state.arena &&
    duel.roadsideKnockAwayEnabled() &&
    duel.state.traffic.includes(actor) && !!(actor.wrecked?.physical || actor.knock);
}

export function _vehicleContact(a, b, reason) {
  const ghost = actor => (actor.wrecked || actor.roadsideMotion) && !solidTraffic(this, actor);
  if (a.crushed || b.crushed || ghost(a) || ghost(b) ||
      (!this.state.arena && (a.combatWrecking || b.combatWrecking)) || a.tumble || b.tumble) return false;
  if (b === this.state && a !== this.state) return this._vehicleContact(b, a, reason);
  const armorContact = combatArmorEnabled(this);
  const armoredPair = armorContact &&
    (a === this.state || this.state.opponents.includes(a)) &&
    (b === this.state || this.state.opponents.includes(b));
  const pairKey = armoredPair ? [a === this.state ? -1 : this.state.opponents.indexOf(a),
    b === this.state ? -1 : this.state.opponents.indexOf(b)].sort((left,right)=>left-right).join(':') : null;
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
  if (armoredPair && this._combatRamIncidents?.has(pairKey) &&
      combatContactCleared(end,width,length)) {
    this._combatRamIncidents.delete(pairKey);
    return false;
  }
  const hit = sweepBox(start, end, width, length);
  if (!hit) return false;
  const descendingCrush = a === this.state && a.airborne && a._verticalSpeed < -1 && (a.prevAirHeight || 0) > (a.airHeight || 0)
    && canCrushVehicle(this.car, specB, { descending: true });
  // Road traffic yields to the player; hostile arena participants remain solid.
  const yieldNormal = !this.state.arena && a === this.state && !this.state.onFoot && !descendingCrush &&
    !b.wrecked && !b.knock ?
    npcYieldContactNormal(a, b, hit, start.z) : null;
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
  const zone = contactZone(nx, nz, angleA + (a.dir < 0 ? Math.PI : 0));
  const zoneB = contactZone(-nx, -nz, angleB + (b.dir < 0 ? Math.PI : 0));
  if (armoredPair) return armoredVehicleContact(this,{a,b,nx,nz,end,width,length,
    specA,specB,impactMph,zoneA:zone,zoneB,pairKey});
  // A solid hulk or shoved car touched below shove speed just stays in
  // contact; the older contact rules must not restart it as a live car.
  if (solidTraffic(this, b) && impactMph < COMBAT_TUNING.roadside.minimumImpactMph) return true;
  if (this.roadsideKnockAwayEnabled() && this.state.traffic.includes(b) &&
      (a === this.state || this.state.opponents.includes(a)) &&
      impactMph >= COMBAT_TUNING.roadside.minimumImpactMph) {
    const topSpeedMph = roadsideTopSpeedMph(this, a);
    const decision = roadsideTrafficDecision({impactMph, topSpeedMph});
    // The struck car leaves by its nearest shoulder. An outside clip must
    // never shove a non-collidable car across the opposite driving lane.
    const side = Math.sign(b.lateral) || Math.sign(b.lateral - a.lateral) ||
      Math.sign(nx) || 1;
    const roadHalfWidth = this.course.roadHalfWidthAt?.(b.s) ?? 7;
    const clearLateral = roadHalfWidth + specB.halfWidth + .5;
    // Under crash physics both cars are solids (CRASH-04, CRASH-05). The
    // solver pushes each by its share of the impulse: the struck car is
    // smashed ahead and the attacker loses speed but keeps control, with no
    // armor or crash cost. A smash or launch wrecks the car, and only a hit
    // over 250 km/h closing blows it up, once it has been thrown forward. A
    // lighter hit shoves it clear; a hulk hit again is shoved along.
    const M = CRASH_TUNING.madMax, now = this.state.stageTimeSec;
    const wasWreck = !!b.wrecked;
    if ((b.lastSmashAt ?? -Infinity) > now - M.rehitGapSec) return true;
    resolveCarCrash(this, a, b, {forceKnock: true, playerKnockMinDvMph: Infinity,
      attackerKeepsControl: true});
    b.lastSmashAt = now;
    const outcome = wasWreck ? 'wreck' : b.wrecked ? 'smash' : 'knock';
    if (b.wrecked && !wasWreck &&
        impactMph * COMBAT_TUNING.armor.kphPerMph >= M.explodeClosingKph)
      b.wrecked.explodeAt = now + M.explodeDelaySec;
    if (b.knock) {
      const frame = this.course.at(b.s);
      const shoulderSpeed = Math.sqrt(2 * KNOCK.slideDecel *
        Math.max(0, clearLateral - Math.abs(b.lateral))) + 1;
      const lateralSpeed = b.knock.vx * Math.cos(frame.heading) -
        b.knock.vz * Math.sin(frame.heading);
      if (lateralSpeed * side < shoulderSpeed) {
        const delta = side * shoulderSpeed - lateralSpeed;
        b.knock.vx += Math.cos(frame.heading) * delta;
        b.knock.vz -= Math.sin(frame.heading) * delta;
      }
      b.knock.roadside = {side};
      b.roadsideMotion = {visible: true};
      b.alive = false;
    }
    const pointA = this.course.groundAt(a.s, a.lateral);
    const pointB = this.course.groundAt(b.s, b.lateral);
    emitRoadsideImpact(this, {id: `traffic-${this.state.traffic.indexOf(b)}`,
      kind: 'traffic', outcome, impactMph,
      thresholdMph: decision.thresholdMph,
      hitPosition: {x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2, z: (pointA.z + pointB.z) / 2},
      actor: b});
    const callout = {smash: 'TRAFFIC SMASHED', knock: 'TRAFFIC SHOVED CLEAR'}[outcome];
    if (a === this.state && callout) this._callout(callout, 1.8);
    return true;
  }
  if ((!armorContact || !this.state.opponents.includes(b)) && a === this.state &&
      canCrushVehicle(this.car, specB, { speedMph: a.speedMph,
        impactMph, descending: descendingCrush })) {
    this._crushVehicle(b, reason, impactMph); return true;
  }
  const armoredPlayer = a === this.state && this.state.mode === 'wasteland';
  const crashThreshold = armoredPlayer ? combatCrashThresholdMph(this.car, { targetMass: specB.mass }) : 28;
  const rearRam = armoredPlayer && this.state.opponents.includes(b) && nz < 0 && (b.dir || 1) > 0 && a.speedMph >= 0;
  if (armoredPlayer && this.state.traffic.includes(b)) {
    const wreck = trafficDestruction({ enabled: this.destructionEnabled(), mode: this.state.mode,
      impactMph, playerTopSpeedMph: this.car.topSpeed, playerMass: specA.mass, targetMass: specB.mass });
    const wreckStarted = wreck.wreck && !b.wrecked &&
      (resolveCarCrash(this, a, b, {onlyB: true,
        wreckTrafficAt: ['nudge', 'knocked', 'smashed', 'launched']}), b.wrecked);
    if (wreckStarted) {
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
  // Motion comes from the rigid-body solver (docs/CRASH_PHYSICS.md): the
  // struck car is shoved, spun or smashed aside by mass, speed and where it
  // was hit. In Rival Duel the player crashes on their own change in
  // velocity, not closing speed alone; legacy Mad Max keeps its threshold.
  const crash = resolveCarCrash(this, a, b, {playerKnockMinDvMph:
    armoredPlayer ? CRASH_TUNING.armoredPlayerKnockDvMph : 0});
  if (rearRam) {
    b.ramRecoverySec = Math.max(b.ramRecoverySec || 0,
      clamp(.4 + impactMph / 230, .4, 1.2));
    this.emit({vehicleRam: true, victim: 'rival', impactMph,
      lateralKick: b.pushVelocity || 0, launched: crash.severityB === 'launched'});
  }
  if (a === this.state && this.state.invulnerableSec <= 0) {
    const playerDv = crash.result.a.dvMph;
    const crashes = armoredPlayer ? !armorContact && impactMph >= crashThreshold :
      playerDv >= CRASH_TUNING.playerCrashDvMph;
    if (crashes) this._crash(reason, Math.sign(a.lateral - b.lateral),
      armoredPlayer ? impactMph : playerDv, zone);
    else if (impactMph > 1) this._scrape(zone, impactMph);
  }
  emitVehicleSmash(this,{a,b,crash,zone:zoneB});
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
  if (actor.crushed || combatShieldForActor(this, actor)>0) return;
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
  if (impactMph <= 1 || actor.damageCooldown > 0 || combatShieldForActor(this, actor)>0) return;
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
    const movable = !!state.arena && prop.kind === 'junkCar';
    const crushed = state.crushedProps.includes(prop.id);
    if (crushed && !movable) continue;
    const hit = sweepObstacle(start, end, prop, heading, spec);
    if (!hit) {
      if (movable) contactArenaJunk(this, actor, prop, null);
      continue;
    }
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
    if (movable) {
      contactArenaJunk(this, actor, prop, {...hit, t: contactTime}, start, end);
      if (crushed || spec.mass < (prop.crushMass || 3500)) continue;
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

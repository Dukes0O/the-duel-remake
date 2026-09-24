// RFX-02: extracted from Duel without changing fixed-step race rules.
import { CARS, CPU_DIFFICULTY, COURSE, DRIVE, TRAFFIC, BOOST, steeringYawAuthority } from './config.js';
import { makeRng } from './rng.js';
import { NpcRoutePlanner } from './npc-route.js';
import { stepRoadsideTraffic, stepTrafficWreck } from './destructibles.js';
import { vehicleContactEnvelope, planNpcYield } from './npc-yielding.js';
import { clamp, freshDamageZones } from './sim-common.js';
import {completeCombatRecovery} from './combat-armor.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

export function _npcYield(actor, targetMph, plannedHeading = actor.headingError || 0) {
  const player = this.state, playerSpec = this._vehicleSpec(player), actorSpec = this._vehicleSpec(actor);
  if (player.airborne || actor.airborne) {
    const playerY = (player.groundHeight ?? this.course.groundAt(player.s, player.lateral).y) + (player.airHeight || 0);
    const actorY = (actor.groundHeight ?? this.course.groundAt(actor.s, actor.lateral).y) + (actor.airHeight || 0);
    if (playerY > actorY + actorSpec.height || actorY > playerY + playerSpec.height) {
      actor.yieldingToPlayer = false;
      return { yielding: false, targetMph, braking: 110 };
    }
  }
  const envelope = vehicleContactEnvelope(player, actor, playerSpec, actorSpec);
  const plan = planNpcYield({ player, npc: actor, lead: this.relativeS(player.s, actor.s) - actor.s, envelope, targetMph, plannedHeading });
  actor.yieldingToPlayer = plan.yielding;
  return plan;
}

export function _spawnTraffic(idx) {
  const def = COURSE[idx];
  if (def.practice || ['arena','drift','checkpoint'].includes(def.kind)) return [];
  const rng = makeRng(this.seed ^ (idx * 0x51ed) ^ 0x7a17);
  const density = this.diff.trafficDensity
    * (this.course.theme.fogDensity > TRAFFIC.fogDensityThreshold ? TRAFFIC.fogSpawnMult : 1);
  const gap = TRAFFIC.baseGapU / Math.max(0.4, density);
  const cars = [];
  for (let s = 320; s < this.course.length - 120; s += gap * rng.range(0.7, 1.3)) {
    const oncoming = rng.chance(TRAFFIC.oncomingShare);
    cars.push({
      s, dir: oncoming ? -1 : 1,
      lateral: oncoming ? DRIVE.laneOffset : -DRIVE.laneOffset,
      speedMph: TRAFFIC.carSpeedMph * rng.range(0.8, 1.15),
      alive: true, damageZones: freshDamageZones(), damageCooldown: 0,
    });
  }
  return cars;
}

export function _traffic(dt) {
  const s = this.state;
  for (const c of s.traffic) {
    if (c.roadsideMotion) { stepRoadsideTraffic(c, dt); continue; }
    if (c.wrecked) { stepTrafficWreck(c, dt); continue; }
    if (!c.alive || c.crushed) continue;
    c.prevS = c.s;
    c.prevLateral = c.lateral;
    c.prevAirHeight = c.airHeight || 0;
    c.cruiseSpeedMph ??= Math.max(0, c.speedMph);
    const yieldPlan = this._npcYield(c, c.cruiseSpeedMph);
    c.braking = c.speedMph > yieldPlan.targetMph;
    c.speedMph += clamp(yieldPlan.targetMph - c.speedMph, -yieldPlan.braking * dt, 18 * dt);
    if (Number.isFinite(c.lateral)) {
      c.lateral += (c.pushVelocity || 0) * dt;
      c.pushVelocity = (c.pushVelocity || 0) * Math.exp(-1.5 * dt);
      const lane = c.dir < 0 ? DRIVE.laneOffset : -DRIVE.laneOffset;
      const laneStep = c.yieldingToPlayer && c.speedMph < .1 ? 0 : clamp(lane - c.lateral, -dt * .7, dt * .7);
      c.lateral += laneStep;
      // Traffic follows a road-relative lane path, unlike the free-steering
      // rival. A contact yaw must recover toward that path instead of leaving
      // a permanently diagonal collision shell travelling straight ahead.
      // Include direction for oncoming lane recovery; don't pivot a stopped
      // shell into a player while waiting for the road to clear.
      const along = (c.dir || 1) * Math.max(1, c.speedMph * DRIVE.mphToWorld);
      const headingTarget = Math.atan((dt > 0 ? laneStep / dt : 0) / along);
      const turn = .95 * Math.min(1, c.speedMph / 12) * dt;
      c.headingError = (c.headingError || 0) + clamp(headingTarget - (c.headingError || 0), -turn, turn);
      if (!this._surface(c.s, c.lateral).road) c.speedMph *= Math.exp(-DRIVE.offRoadScrub * dt);
    }
    c.s += c.dir * c.speedMph * DRIVE.mphToWorld * dt;
    c.contactCooldown = Math.max(0, (c.contactCooldown || 0) - dt);
    if (Number.isFinite(c.lateral)) { this._jump(c, dt); this._staticContacts(c, false); this._boundary(c); }
  }
}

export function _rival(dt, opponent = this.state.rival) {
  const s = this.state, r = opponent;
  if (!r) return;
  if (r.combatWrecking) {
    r.combatWreckTimer = Math.max(0, r.combatWreckTimer - dt);
    r.impactTimer = r.combatWreckTimer;
    if (r.combatWreckTimer === 0) completeCombatRecovery(this, r);
    return;
  }
  if (r.crushed) return;
  r.prevS = r.s; r.prevLateral = r.lateral;
  r.prevAirHeight = r.airHeight || 0;
  if (r.finished) {
    r.braking = r.speedMph > 0;
    const nextSpeed = Math.max(0, r.speedMph - DRIVE.brakeAccel * dt), plan = this._npcYield(r, nextSpeed);
    r.speedMph = plan.yielding ? Math.max(plan.targetMph, r.speedMph - plan.braking * dt) : nextSpeed;
    r.s += r.speedMph * DRIVE.mphToWorld * dt;
    if (!this._ramFlight(r, dt)) this._jump(r, dt);
    this._staticContacts(r, false); this._boundary(r); this._crushProps(r);
    return;
  }
  r.pushVelocity ||= 0; r.headingError ||= 0;
  r.contactCooldown = Math.max(0, (r.contactCooldown || 0) - dt);
  r.ramRecoverySec = Math.max(0, (r.ramRecoverySec || 0) - dt);
  r.braking = false; r.yieldingToPlayer = false;
  // CPU pace is independent of the player's manual/automatic gearbox.
  const skill = CPU_DIFFICULTY[s.cpuDifficulty], car = this.rivalSpec || CARS[s.car];
  // On Wasteland's long circuit, Easy needs enough road speed to stay in
  // combat range. It remains below Medium's cruise and corner pace.
  const easyWasteland = s.mode === 'wasteland' && s.cpuDifficulty === 'easy';
  const cruiseSkill = easyWasteland ? .875 : skill.skill;
  const cornerSkill = easyWasteland ? .895 : skill.cornerSkill;
  if (s.cpuDifficulty !== 'easy' && (this._npcRoutePlanner?.course !== this.course || this._npcRoutePlanner?.car !== car)) {
    this._npcRoutePlanner = new NpcRoutePlanner(this.course, { car, surfaceAt: (distance, lateral) => this._drivingSurface(distance, lateral, car) });
  }
  const route = s.cpuDifficulty === 'easy' ? null : this._npcRoutePlanner.update(r, { difficulty: s.cpuDifficulty, lapsTotal: s.lapsTotal, player: s, traffic: s.traffic, opponents: s.opponents });
  r.routeId = route?.routeId || null; r.routeLap = route?.routeLap || null;
  const rivalSurface = this._drivingSurface(r.s, r.lateral, car);
  const mediumCatchup = s.mode === 'wasteland' && s.cpuDifficulty === 'medium' ?
    20 * clamp((s.s - r.s - 120) / 180, 0, 1) : 0;
  let roadsidePace = 0;
  if (!this.stageDef.arena && this.roadsideKnockAwayEnabled()) {
    if (s.cpuDifficulty === 'easy')
      roadsidePace = COMBAT_TUNING.roadside.easyRivalPaceBonusMph;
    else if (s.cpuDifficulty === 'medium')
      roadsidePace = COMBAT_TUNING.roadside.mediumRivalPaceBonusMph;
  }
  const targetPace = car.topSpeed * cruiseSkill + mediumCatchup + roadsidePace -
    (s.mode === 'wasteland' && s.cpuDifficulty === 'hard' ? 14 : 0);
  const rubber = clamp((s.s - r.s) * .012, -8, 8);
  let target = targetPace + rubber;
  if (mediumCatchup) target = Math.min(target, car.topSpeed);
  if (s.mode === 'wasteland' && s.cpuDifficulty === 'hard') {
    // A Wasteland rival stays near enough to fight instead of driving away
    // after an impact. It slows through normal braking, then resumes pace.
    const attackLead = clamp((r.s - s.s - 90) / 90, 0, 1);
    target = Math.min(target, target * (1 - attackLead) + 140 * attackLead);
  }
  // Custom rivals spend their chosen nitro build on clear straights. The
  // legacy default rival keeps its original pace and does not gain boost.
  r.boosting=!!s.rivalSettings&&r.boost>.05&&r.speedMph>=BOOST.minSpeedMph&&rivalSurface.boostAllowed&&r.contactCooldown<=0&&[0,40,80,120].every(ahead=>Math.abs(this.course.at(r.s+ahead).curvature)<.0012);
  if(r.boosting){
    r.boost=Math.max(0,r.boost-BOOST.drainPerSec/((1+r.upgrades.nitro*.14)*car.boostCapacity)*dt);
    target*=BOOST.topSpeedMult+r.upgrades.nitro*.025+(car.nitroSpeedBonus||0);
  }else r.boost=Math.min(1,r.boost+BOOST.refillPerSec*dt);
  if (route) target = Math.min(target, route.targetSpeedMph);
  else {
    let curve = 0;
    for (let look = 0; look <= 140; look += 28) curve = Math.max(curve, Math.abs(this.course.at(r.s + look).curvature));
    if (curve > .0001) target = Math.min(target, Math.sqrt(DRIVE.maxLateralAccel * car.grip * rivalSurface.traction / curve) / DRIVE.mphToWorld * cornerSkill);
  }
  // occasional "mistake": brief slow patch keyed deterministically to distance
  if (Math.sin(r.s * 0.01) > 0.96) target *= 0.6;
  r.offRoad = !rivalSurface.mainRoad; r.preparedGravel = rivalSurface.preparedGravel;
  if (r.offRoad) target = Math.min(target * (rivalSurface.preparedGravel ? 1 : .7), rivalSurface.speedLimit);
  if (r.contactCooldown > 0) target *= .55;
  let lane = route?.targetLateral ?? -DRIVE.laneOffset + Math.sin(r.s * .007) * 1.05;
  // A committed shortcut has its own corridor. Its planner brakes for traffic
  // on that path; ordinary main-road lane changes would cut across the gap.
  const laneBlockers=s.opponents.length>1?[...s.traffic,...s.opponents.filter(opponent=>opponent!==r)]:s.traffic;
  const activeBlocker=actor=>actor.alive || s.opponents.length>1 && s.opponents.includes(actor);
  if (!route) for (const traffic of laneBlockers) {
    if (!activeBlocker(traffic)) continue;
    const ahead = this.relativeS(traffic.s, r.s) - r.s;
    if (ahead > -8 && ahead < 85 && Math.abs(traffic.lateral - lane) < 2.8) {
      const otherLane = traffic.lateral > 0 ? -DRIVE.laneOffset : DRIVE.laneOffset;
      const blocked = laneBlockers.some(other => other !== traffic && activeBlocker(other) && Math.abs(this.relativeS(other.s, r.s) - r.s) < 75 && Math.abs(other.lateral - otherLane) < 2.8);
      if (!blocked) lane = otherLane;
      else target = Math.min(target, traffic.dir < 0 ? 18 : Math.max(12, traffic.speedMph - 8));
    }
  }
  const plannedHeading = route?.headingTarget ?? clamp((lane - r.lateral) * .095, -.55, .55);
  const yieldPlan = this._npcYield(r, Math.max(0, target), plannedHeading);
  target = yieldPlan.targetMph;
  if (route?.mustYield) { r.yieldingToPlayer = route.yieldingToPlayer; r.braking = r.speedMph > target; }
  if (yieldPlan.yielding) {
    r.yieldingToPlayer = true;
    r.braking = r.speedMph > target;
  }
  target = Math.max(0, target);
  if (r.braking) r.speedMph = Math.max(target, r.speedMph - yieldPlan.braking * dt);
  else r.speedMph += clamp(target - r.speedMph, -DRIVE.brakeAccel * car.braking * dt, (car.accel * DRIVE.accelScale * .85+(r.boosting?BOOST.accelMphPerSec*(1+r.upgrades.nitro*.15)*(car.nitroAcceleration||1):0)) * dt);
  if (r.offRoad) r.speedMph *= Math.exp(-rivalSurface.scrub * dt * (rivalSurface.preparedGravel ? .25 : 1));
  if (r.ramRecoverySec > 0) {
    // Let the ram carry the car before the route planner tries to recenter it.
    r.headingError *= Math.exp(-.35 * dt);
  } else if (route) {
    // Follow the physical tangent with the same tire-limited yaw authority
    // as the player. Subtract road-frame rotation to retain relative heading.
    const speed = r.speedMph * DRIVE.mphToWorld, frame = this.course.at(r.s);
    const authority = steeringYawAuthority(r.speedMph, car.grip, rivalSurface.traction);
    const error = Math.atan2(Math.sin(route.headingTarget - r.headingError), Math.cos(route.headingTarget - r.headingError));
    const yaw = clamp(route.curvature * speed + error * 6, -authority, authority);
    const progress = Math.cos(r.headingError) * speed / Math.max(.25, 1 - frame.curvature * r.lateral);
    r.headingError += (yaw - frame.curvature * progress) * dt;
  } else {
    const desiredHeading = clamp((lane - r.lateral) * .095, -.55, .55);
    // Recovery is a steering manoeuvre with limited grip, never a lane snap.
    const rivalTurnRate = rivalSurface.preparedGravel ? .95 * rivalSurface.traction : r.offRoad ? .48 : .95;
    r.headingError += clamp(desiredHeading - r.headingError, -dt * rivalTurnRate, dt * rivalTurnRate);
  }
  r.lateral += (Math.sin(r.headingError) * r.speedMph * DRIVE.mphToWorld + r.pushVelocity) * dt;
  r.s += Math.cos(r.headingError) * r.speedMph * DRIVE.mphToWorld * dt / Math.max(.25, 1 - this.course.at(r.s).curvature * r.lateral);
  r.pushVelocity *= Math.exp(-(r.offRoad ? .9 : 1.5) * dt);
  if (!this._ramFlight(r, dt)) this._jump(r, dt);
  this._staticContacts(r, false);
  if (r.combatWrecking) return;
  this._boundary(r);
  this._crushProps(r);
  this._advanceLaps(r, dt);
  if (r.completedLaps >= s.lapsTotal) {
    r.finished = true; r.finishTime = s.stageTimeSec;
    const index = s.opponents.indexOf(r);
    this.emit(index <= 0 ? { rivalFinished: true } : { opponentFinished: index });
  }
}

export function _ramFlight(actor, dt) {
  if (actor._ramVerticalSpeed == null) return false;
  actor.airHeight = Math.max(0, (actor.airHeight || 0) + actor._ramVerticalSpeed * dt - 9 * dt * dt);
  actor._ramVerticalSpeed -= 18 * dt;
  actor.airborne = actor.airHeight > 0;
  if (!actor.airborne && actor._ramVerticalSpeed < 0) {
    actor._ramVerticalSpeed = null; actor.airHeight = 0;
    actor._jumpY = null; actor._verticalSpeed = 0;
  }
  return true;
}

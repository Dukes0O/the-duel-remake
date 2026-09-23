// RFX-02: extracted from Duel without changing fixed-step race rules.
import { COURSE, LIVES, DRIVE } from './config.js';
import { sweepObstacle } from './collision.js';
import { offroadCapability, wrapHeading, rockHeight, tumbleAttitude } from './offroad-physics.js';
import { BOUNDARY_WARNING, BOUNDARY_RESET, clamp } from './sim-common.js';

const WASTELAND_CRASH_PENALTY_SEC = 2;

export function _startTumble(reason) {
  const s = this.state;
  if (s.tumble || s.impactTimer > 0 || s.status !== 'racing' || s.combat?.shield>0) return;
  const pitch = s.terrainPitch || 0, safe = s._offroadSafe, travelSign = s.speedMph < 0 ? -1 : 1;
  this._crash('rollover', Math.sign(s.terrainRoll) || 1, Math.max(30, Math.abs(s.speedMph)), 'rear');
  s.rollovers++;
  s.tumble = { elapsed: 0, duration: 2.2, direction: s.impactSide, reason, initialPitch: pitch, safe, travelSign,
    heading: this.course.at(s.s).heading + s.headingError + (travelSign < 0 ? Math.PI : 0) };
  s.impactTimer = s.impactDuration = s.tumble.duration; s.crashSpin = 0;
  s.airborne = false; s.airHeight = 0; s._jumpY = null; s._jumpOrigin = null;
  s.airDistance = 0; s.airTime = 0; s._airOrigin = null;
  s.speedMph = 0; s.boosting = false;
  this._callout('CLIMB LIMIT  /  ROLLING BACK', 2.2);
  this.emit({ rollover: { reason } });
}

export function _rollover(dt) {
  const s = this.state, tumble = s.tumble;
  s.prevS = s.s; s.prevLateral = s.lateral;
  tumble.elapsed = Math.min(tumble.duration, tumble.elapsed + dt);
  const point = this.course.worldAt(s.s, s.lateral), retreat = 2.1 * dt;
  const pose = this._roadPosition({ x: point.x - Math.sin(tumble.heading) * retreat, z: point.z - Math.cos(tumble.heading) * retreat }, s.s);
  const next = this._supportAt(pose.s, pose.lateral), current = this._supportAt(s.s, s.lateral);
  const capability = offroadCapability(this.car), spec = this._vehicleSpec(s);
  const blocked = this._obstacles(s.s, pose.s).some(obstacle => {
    if (obstacle.kind === 'rock' && rockHeight(obstacle) <= capability.rockHeight
      || obstacle.kind === 'mountain' && !obstacle.tunnelCover && this.course.features.mountains?.includes(obstacle)
      || obstacle.kind === 'tree' && this._fallenCactusIds?.has(obstacle.id)) return false;
    const hit = sweepObstacle(current, next, obstacle, tumble.heading, spec);
    return hit && (!hit.inside || (next.x - current.x) * hit.nx + (next.z - current.z) * hit.nz < 0);
  });
  // Roll downhill, never through a steeper surface behind the truck.
  if (!blocked && next.y <= current.y + .08) { s.s = pose.s; s.lateral = pose.lateral; }
  const attitude = tumbleAttitude(tumble.elapsed, tumble.duration, tumble.direction, tumble.initialPitch, tumble.travelSign);
  s.groundHeight = this._supportAt(s.s, s.lateral).y + attitude.lift;
  s.terrainPitch = attitude.pitch; s.terrainRoll = attitude.roll; s.impactTimer = Math.max(0, tumble.duration - tumble.elapsed);
  if (s.impactTimer > 1e-9) return;
  this._safeReset(s,s.crashSite||{s:s.s,lateral:s.lateral,headingError:s.headingError});
  s.crashSite=null;
  s.tumble = null; s.impactTimer = 0; s.crashSpin = 0; s._climbGain = 0; s._climbRest = 0;
  this._terrainPose(); this._callout('RECOVERED  /  TRY A GENTLER LINE', 2); this.emit({ recovered: true });
}

export function _boundary(car) {
  if (car.crushed || car === this.state && (offroadCapability(this.car) || this.course.def.practice)) {
    if (car === this.state) car.boundaryWarning = false;
    return;
  }
  const player = car === this.state, surface = this._surface(car.s, car.lateral);
  const phase = this.course.phase?.(car.s) ?? car.s;
  const mainEdgeDistance = Math.max(0, Math.abs(car.lateral) - surface.roadHalfWidth);
  let branchEdgeDistance = Infinity, wideBranch = false;
  for (const cut of this.course.features.shortcuts || []) {
    if (phase < cut.start || phase > cut.end) continue;
    const offset = this.course.shortcutOffset(cut, phase);
    branchEdgeDistance = Math.min(branchEdgeDistance, Math.max(0, Math.abs(car.lateral - offset) - cut.halfWidth));
    if (Math.abs(offset) > BOUNDARY_RESET) wideBranch = true;
  }
  // A distant branch gets its own shoulder, not one giant permissive field
  // between both routes. On ordinary sections retain the established bounds.
  const warningEdge = wideBranch ? 20 : BOUNDARY_WARNING - surface.roadHalfWidth;
  const resetEdge = wideBranch ? 32 : BOUNDARY_RESET - surface.roadHalfWidth;
  const seaward = (this.course.themeAt?.(car.s) || this.course.def.theme) === 'coast' && car.lateral > 28;
  const coastHeight = seaward ? this.course.groundAt(car.s, car.lateral).y : Infinity;
  if (player) {
    const warning = (mainEdgeDistance > warningEdge && branchEdgeDistance > 20) || coastHeight < -10;
    if (warning && !car.boundaryWarning) this._callout(coastHeight < -10 ? 'RETURN TO THE ROAD  /  WATER AHEAD' : 'RETURN TO THE ROAD  /  COURSE BOUNDARY', 3);
    car.boundaryWarning = warning;
  }
  if ((mainEdgeDistance <= resetEdge || branchEdgeDistance <= 32) && coastHeight >= -14) return;
  this._safeReset(car);
  if (player) {
    car.boundaryWarning = false; car.boundaryResets++;
    car.invulnerableSec = Math.max(car.invulnerableSec, 2.2);
    this._callout('BACK ON COURSE  /  NO DAMAGE', 2.8);
    this.emit({ boundaryReset: true });
  }
}

export function _practiceRecoveryPose(car, others, crashSite = null) {
  const actor=car;
  car=crashSite?{...car,...crashSite}:car;
  const origin = this.course.worldAt(car.s, car.lateral), heading = origin.heading + (car.headingError || 0);
  const spec = this._vehicleSpec(actor), capability = actor === this.state ? offroadCapability(this.car) : null;
  // Freestyle has no validated lap interval. Search a bounded physical area
  // around the impact instead of wrapping/clamping to a distant road gate.
  for (const radius of crashSite ? [0, 2, 4, 8, 12] : [0, 4, 8, 12, 20, 32, 48]) for (let spoke = 0; spoke < (radius ? 16 : 1); spoke++) {
    const angle = heading + Math.PI + spoke * Math.PI / 8;
    const pose = radius ? this._roadPosition({ x: origin.x + Math.sin(angle) * radius, z: origin.z + Math.cos(angle) * radius }, car.s)
      : { s: car.s, lateral: car.lateral };
    const point = this._supportAt(pose.s, pose.lateral, actor);
    if (![pose.s, pose.lateral, point.x, point.y, point.z].every(Number.isFinite)
      || Math.hypot(point.x - origin.x, point.z - origin.z) > (crashSite?12.1:48.1)) continue;
    if (others.some(other => {
      if (other.crushed) return false;
      const otherPoint = this.course.worldAt(other.s, other.lateral), otherSpec = this._vehicleSpec(other);
      return sweepObstacle(point, point, { ...otherPoint, halfX: otherSpec.halfWidth + .5, halfZ: otherSpec.halfLength + .5,
        heading: otherPoint.heading + (other.headingError || 0) }, heading, spec);
    })) continue;
    if (this._obstacles(pose.s - 5, pose.s + 5).some(obstacle => {
      if (capability && (obstacle.kind === 'rock' && rockHeight(obstacle) <= capability.rockHeight
        || obstacle.kind === 'mountain' && !obstacle.tunnelCover && this.course.features.mountains?.includes(obstacle))) return false;
      if (obstacle.kind === 'tree' && this._fallenCactusIds?.has(obstacle.id)) return false;
      return sweepObstacle(point, point, obstacle, heading, spec);
    })) continue;
    return { ...pose, headingError: wrapHeading(heading - this.course.at(pose.s).heading) };
  }
  // A fully enclosed area is not permission for a long-distance teleport.
  // Retain the impact position; normal solid resolution still applies.
  return { s: car.s, lateral: car.lateral, headingError: car.headingError || 0 };
}

export function _safeReset(car, crashSite = null) {
  if (car === this.state) this._breakDrift('reset');
  const others = [...this.state.traffic.filter(other => other.alive), this.state.rival, this.state.police.pursuit?.active ? this.state.police.pursuit : null, this.state].filter(other => other && other !== car);
  const racer = Number.isFinite(car.completedLaps);
  const lowerBound = this.course.closed ? racer ? car.completedLaps * this.course.length : -Infinity : 0;
  // Recovery replaces prevS, so it must not place a racer beyond a gate whose
  // crossing was interrupted by the crash/boundary. Leave room to cross it
  // normally on the next drive step, including the first lap's finish line.
  const nextGate = racer && car.completedLaps < this.state.lapsTotal ?
    car.completedLaps * this.course.length + (this._lapGates?.[car.nextLapGate] ?? this.course.length) - 1 : Infinity;
  const upperBound = this.course.closed && !racer ? Infinity : Math.min(this.raceLength - 8, nextGate);
  const practice = this.course.def.practice === true;
  const local = practice || !!crashSite;
  let chosen = local ? this._practiceRecoveryPose(car, others, crashSite) : { s: clamp(car.s, lowerBound, upperBound), lateral: 0 };
  // Check the nearest road gaps first. Coarse preset distances could skip a
  // clear space nearby and send a missed-gate retry over 100 metres back.
  // Dense traffic is rare, but keep looking a little farther before using
  // the emergency fallback at the original position.
  const recoveryBacks = local ? [] : Array.from({ length: 101 }, (_, index) => index * 2);
  search: for (const back of recoveryBacks) {
    for (const lateral of [-DRIVE.laneOffset, DRIVE.laneOffset, 0]) {
      const distance = clamp(car.s - back, lowerBound, upperBound);
      if (others.some(other => Math.abs(this.relativeS(other.s, distance) - distance) < 13 && Math.abs(other.lateral - lateral) < 2.7)) continue;
      const point = this.course.worldAt(distance, lateral);
      if (this._obstacles(distance - 4, distance + 4).some(obstacle => sweepObstacle(point, point, obstacle, point.heading, this._vehicleSpec(car)))) continue;
      chosen = { s: distance, lateral }; break search;
    }
  }
  car.s = car.prevS = chosen.s; car.lateral = car.prevLateral = chosen.lateral;
  car.speedMph = Math.max(0, Math.min(28, car.speedMph * .4));
  car.headingError = local ? chosen.headingError : 0; car.yawVelocity = 0; car.pushVelocity = 0; car.slipAngle = 0; car.drifting = false;
  car.offRoad = false; car.offRoadTime = 0; car.roughness = 0; car.boosting = false;
  car.steerVisual = 0;
  car.routeId = null; car.routeLap = null; this._npcRoutePlanner?.reset(car);
  car.airborne = false; car.airHeight = 0; car.prevAirHeight = 0; car._jumpY = null; car._verticalSpeed = 0; car._jumpOrigin = null;
  car.airDistance = 0; car.airTime = 0; car._airOrigin = null;
  car.groundHeight = null; car.prevGroundHeight = null; car.terrainPitch = null; car.terrainRoll = null; car.tumble = null;
  car._climbGain = 0; car._climbRest = 0; car._offroadSafe = null;
  if (car === this.state) { car.gear = 0; car.revs = car.speedMph / this.car.gears[0]; car.overrevSec = 0; car.reverseHoldSec = 0; }
  if (local) {car.offRoad=!this._surface(car.s,car.lateral).road;this._terrainPose(car);}
}

export function _crash(reason, side = 0, impactMph = Math.abs(this.state.speedMph), zone = 'front') {
  const s = this.state;
  if (s.impactTimer > 0 || s.status !== 'racing' || s.combat?.shield>0) return;
  // Record a real crossing interrupted by impact before prevS is replaced.
  this._advanceLaps(s,.05,true);
  s.crashSite={s:s.s,lateral:s.lateral,headingError:this.course.def.practice?s.headingError:0};
  this._breakDrift('hit');
  s.stageCrashes++;
  s.boosting = false;
  s.combo = 0; s.comboTimer = 0;
  const practice = this.course.def.practice === true;
  const recoverable = practice || s.mode==='wasteland' || this.stageDef.persistentVehicle || this.stageDef.kind === 'chase';
  const penalty = practice ? 0 : s.mode === 'wasteland' ? WASTELAND_CRASH_PENALTY_SEC :
    this.stageDef.crashPenaltySec ?? (this.stageDef.kind === 'chase' ? this.stageDef.chaseCrashPenaltySec : LIVES.crashPenaltySec);
  if (!recoverable) s.lives -= LIVES.crashLifeCost;
  s.penaltySec += penalty;
  s.racePenaltySec += penalty;
  if (s.timeLimitSec) s.timeRemaining = Math.max(0, s.timeLimitSec - s.stageTimeSec - s.racePenaltySec);
  s.totalTimeSec += penalty;
  s.lastCrashReason = reason;
  s.crashFlash = 1.2;
  s.impactStrength = Math.max(.35, Math.min(1, impactMph / 145));
  if (['head_on', 'rock', 'mountain', 'building', 'tree', 'prop'].includes(reason) && impactMph >= DRIVE.majorImpactMph) s.majorCrashes++;
  if (reason !== 'engine_blew') s.damageZones[zone] = Math.min(5, s.damageZones[zone] + s.impactStrength);
  s.damageCooldown = 1.2;
  s.catastrophic = !recoverable && s.majorCrashes >= DRIVE.majorCrashLimit;
  s.impactSide = side || Math.sign(s.lateral) || Math.sign(s.headingError) || 1;
  s.impactDuration = DRIVE.impactDuration + s.impactStrength * .25;
  if (s.catastrophic) { s.impactDuration = DRIVE.catastrophicDuration; s.impactStrength = 1; }
  s.impactTimer = s.impactDuration;
  s.crashSpin = 0;
  s.slipAngle = 0; s.drifting = false;
  s.invulnerableSec = s.impactDuration + DRIVE.recoverySec;
  s.speedMph = clamp(s.speedMph * .3, -DRIVE.crashSpeedCapMph, DRIVE.crashSpeedCapMph);
  s.gear = s.speedMph < 0 ? -1 : Math.max(0, s.gear); s.reverseHoldSec = 0;
  this._callout(reason === 'engine_blew' ? 'ENGINE FAILURE. SHIFT EARLIER.' : `IMPACT  /  +${penalty} SECONDS`, 2.8);
  this.emit({ crash: reason, livesLeft: s.lives, strength: s.impactStrength, side: s.impactSide, zone, explosion: s.catastrophic });
  if (!recoverable && (s.lives <= 0 || s.catastrophic)) {
    s.status = 'gameover';
    s.results = { gameover: true, completed: false, won: false, seed: s.seed, catastrophic: s.catastrophic, majorCrashes: s.majorCrashes,
      stageIndex: s.stageIndex, timeSec: +(s.stageTimeSec + s.racePenaltySec).toFixed(2), totalTimeSec: Math.round(s.totalTimeSec), lapTimes: [...s.lapTimes], assistedLaps: [...s.assistedLaps],
      jumps: s.jumps, jumpScore: s.jumpScore, crushCount: s.crushCount, crushScore: s.crushScore, ...this._objectiveResult() };
    this.emit({ gameover: true });
    return;
  }
  // Hold the impact location. Recovery happens after the visible skid.
  s.steerVisual = 0; s.yawVelocity = 0; s.overrevSec = 0;
  s.status = 'racing';
}

export function _impact(dt) {
  if (this.state.tumble) { this._rollover(dt); return; }
  const s = this.state, remaining = s.impactTimer / s.impactDuration;
  s.prevS = s.s;
  s.prevLateral = s.lateral;
  s.impactTimer = Math.max(0, s.impactTimer - dt);
  s.speedMph *= Math.exp(-3.2 * dt);
  s.crashSpin += s.impactSide * s.impactStrength * 5 * remaining * dt;
  s.lateral += s.impactSide * s.speedMph * DRIVE.mphToWorld * .15 * remaining * dt;
  const skidDistance = s.s + s.speedMph * DRIVE.mphToWorld * .3 * dt;
  s.s = this.course.def.practice ? skidDistance : Math.min(this.raceLength - 1, skidDistance);
  s.revs = Math.abs(s.speedMph) / (s.gear < 0 ? DRIVE.reverseMaxMph : this.car.gears[s.gear]);
  s.roughness = Math.max(s.roughness, remaining * s.impactStrength);
  this._staticContacts(s, true);
  if (s.impactTimer === 0 && s.status === 'racing') {
    this._safeReset(s,s.crashSite||{s:s.s,lateral:s.lateral,headingError:0}); s.crashSite=null; s.crashSpin = 0;
    s.speedMph = 12; s.gear = 0; s.revs = s.speedMph / this.car.gears[0];
    s.offRoad = !this._surface(s.s,s.lateral).road; s.offRoadTime = 0; s.roughness = 0;
    s.input.shiftUp = false; s.input.shiftDown = false;
    this._callout('RECOVERED AT CRASH SITE / KEEP DRIVING', 2);
    this.emit({ recovered: true });
  }
}

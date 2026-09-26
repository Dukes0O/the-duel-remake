// RFX-02: extracted from Duel without changing fixed-step race rules.
import { DRIVE, BOOST, steeringYawAuthority } from './config.js';
import { stepDrift, breakDrift } from './drift-scoring.js';
import { offroadCapability, wrapHeading, limitClimb, slopeSpeedDelta, terrainAttitude } from './offroad-physics.js';
import { clamp } from './sim-common.js';
import { onHiddenRoad } from './hidden-road.js';
import { arenaFloorSpeed } from './arena/venues.js';
import { stepKnock } from './vehicle-knock.js';

export function _surface(distance, lateral) {
  const halfWidth = this.course.roadHalfWidthAt?.(distance) ?? DRIVE.roadHalfWidth;
  const surface = this.course.surfaceAt?.(distance, lateral) || { road: Math.abs(lateral) <= halfWidth, shortcutId: null, roadHalfWidth: halfWidth };
  return { ...surface, mainRoad: surface.mainRoad ?? surface.road };
}

export function _drivingSurface(distance, lateral, car = this.car, hasContact = true) {
  const floor = this.state.arena && this.course.def.scrapdome;
  if (floor) return { ...this._surface(distance, lateral), road: true, mainRoad: false, preparedGravel: true,
    boostAllowed: true, traction: floor.floorTraction, speedLimit: arenaFloorSpeed(floor, car.topSpeed),
    scrub: floor.floorScrub, roughness: floor.floorRoughness };
  const hidden = car === this.car && onHiddenRoad(this.course, { s: distance, lateral });
  const surface = hidden ? { ...this._surface(distance, lateral), road: true, mainRoad: false } : this._surface(distance, lateral);
  const preparedGravel = hidden || surface.road && !surface.mainRoad && (this.course.def.offroad || !!surface.shortcutId);
  const rally = car.kind === 'rally', roughnessScale = car.roughnessScale ?? 1;
  const mud = hasContact ? clamp(Number(surface.mud) || 0, 0, 1) : 0;
  const waterDepth = hasContact ? clamp(Number(surface.waterDepth) || 0, 0, 1) : 0;
  const traction = surface.mainRoad ? 1 : preparedGravel ? clamp(.6 + .4 * (car.offRoadGrip ?? DRIVE.offRoadGrip), .82, .995) : car.offRoadGrip ?? DRIVE.offRoadGrip;
  const speedLimit = surface.mainRoad ? car.topSpeed : preparedGravel ? car.topSpeed * (rally ? .98 : .95) : car.offRoadSpeed ?? 68;
  const scrub = surface.mainRoad ? 0 : (preparedGravel ? rally ? .014 : .035 : car.offRoadScrub ?? DRIVE.offRoadScrub) * roughnessScale;
  return { ...surface, preparedGravel, boostAllowed: surface.road || this.course.def.practice,
    mud, waterDepth,
    traction: traction * (1 - mud * .45),
    speedLimit: mud > 0 ? Math.min(speedLimit, 42 + (1 - mud) * 32) : speedLimit,
    scrub: scrub + mud * .42,
    roughness: preparedGravel ? (rally ? .14 : .2) * roughnessScale : null };
}

export function _commitDrift(next) {
  const s = this.state;
  const gained = Math.max(0, Math.round(next.bankedScore) - Math.round(s.drift.bankedScore));
  // Challenge targets retain raw drift points; the general race score earns Pro 2x.
  s.drift = next; s.score += gained * this.scoreMultiplier; s.stageStyleScore += gained * this.scoreMultiplier;
  if (next.lastEvent?.type === 'banked') this.emit({ driftBanked: { points: Math.round(next.lastEvent.points), total: Math.round(next.bankedScore) } });
  else if (next.lastEvent?.type === 'lost') this.emit({ driftChainLost: { reason: next.lastEvent.reason, points: Math.round(next.lastEvent.points) } });
}

export function _breakDrift(reason = 'hit') {
  if (!this.state.drift) return;
  if (reason === 'reset') this._driftReset = true; else this._driftHit = true;
  this._commitDrift(breakDrift(this.state.drift, reason));
}

export function _tickDrift(dt) {
  const s = this.state, start = this._driftStepStart;
  if (!s.drift || !start) return;
  const surface = this._drivingSurface(s.s, s.lateral);
  this._commitDrift(stepDrift(s.drift, { prevS: start.s, s: s.s, from: start.world, to: this.course.worldAt(s.s, s.lateral),
    speedMph: s.speedMph, slipAngle: s.slipAngle, headingError: s.headingError, yawVelocity: s.yawVelocity,
    mainRoad: surface.mainRoad, preparedRoute: surface.road && surface.preparedGravel,
    status: s.status, impactTimer: s.impactTimer, airborne: s.airborne, airHeight: s.airHeight,
    hit: this._driftHit, reset: this._driftReset }, dt));
}

export function _drive(dt) {
  const s = this.state, car = this.car, d = this.diff;
  // A crash that knocked the car loose: it slides and spins until the tyres
  // bite, and the driver has no control meanwhile (docs/CRASH_PHYSICS.md).
  if (this.featureFlags?.enabled('crash-physics') === true && s.knock) {
    stepKnock(this, s, dt);
    s.revs = Math.abs(s.speedMph) / (s.gear < 0 ? DRIVE.reverseMaxMph : car.gears[Math.max(0, s.gear)]);
    s.boosting = false; s.steerVisual = 0; s.yawVelocity = 0;
    this._boundary(s);
    return;
  }
  // recorded up front (not at the integration line) so the swept collision
  // test stays valid on frames where a crash bails out of _drive early
  s.prevS = s.s;
  s.prevLateral = s.lateral;
  s.prevAirHeight = s.airHeight || 0;
  s.prevGroundHeight = s.groundHeight;
  const previousGear = s.gear;
  // S / Down / LT brakes first, then backs up after a deliberate hold at
  // rest. This works in both transmissions; Q/E still shift forward gears.
  // Signed speed preserves the chassis heading while travelling backwards.
  if (s.speedMph < 0) s.gear = -1;
  else if (s.speedMph > 0 && s.gear < 0) s.gear = 0;
  if (s.gear >= 0 && s.speedMph === 0 && s.input.brake > .1 && s.input.throttle === 0) {
    s.reverseHoldSec += dt;
    if (s.reverseHoldSec + 1e-9 >= DRIVE.reverseHoldSec) s.gear = -1;
  } else s.reverseHoldSec = 0;
  const reversing = s.gear < 0;
  const gmax = reversing ? DRIVE.reverseMaxMph : car.gears[s.gear];
  s.revs = gmax ? Math.abs(s.speedMph) / gmax : 0;
  if (!reversing && d.autoShift) {
    if (s.revs > 0.96 && s.gear < car.gears.length - 1) s.gear++;
    else if (s.revs < 0.55 && s.gear > 0) s.gear--;
  } else if (!reversing) {
    if (s.input.shiftUp && s.gear < car.gears.length - 1) s.gear++;
    if (s.input.shiftDown && s.gear > 0) s.gear--;
  }
  s.input.shiftUp = s.input.shiftDown = false;

  // acceleration limited by the current gear's max speed
  const gearMax = reversing ? DRIVE.reverseMaxMph : car.gears[s.gear];
  const accelFactor = Math.max(0.15, 1 - Math.max(0, s.revs - 0.5)); // falls off near redline
  if (reversing) {
    if (s.input.throttle > 0) {
      s.speedMph = Math.min(0, s.speedMph + DRIVE.brakeAccel * car.braking * s.input.throttle * dt);
      if (s.speedMph === 0) { s.gear = 0; s.reverseHoldSec = 0; }
    } else if (s.input.brake > 0) s.speedMph -= DRIVE.reverseAccel * s.input.brake * dt;
    s.speedMph = Math.min(0, s.speedMph + DRIVE.dragCoeff * dt * (s.input.brake > 0 && s.input.throttle === 0 ? .2 : 1));
  } else {
    if (s.input.throttle > 0) {
      const ceil = Math.min(car.topSpeed, gearMax * DRIVE.gearCeilFrac);
      if (s.speedMph < ceil) s.speedMph += car.accel * accelFactor * s.input.throttle * dt * DRIVE.accelScale;
    }
    if (s.input.brake > 0) s.speedMph -= DRIVE.brakeAccel * car.braking * s.input.brake * dt;
    s.speedMph = Math.max(0, s.speedMph - DRIVE.dragCoeff * dt * (s.input.throttle > 0 ? 0.2 : 1));
  }
  if (s.gear !== previousGear) this.emit({ shift: s.gear });

  const wasBoosting = s.boosting;
  // Terrain can be below an airborne vehicle without touching it. Delay mud,
  // water and their entry latch until the tyres have ground contact.
  const surface = this._drivingSurface(s.s, s.lateral, car, !s.airborne);
  const mud = surface.mud || 0, waterDepth = surface.waterDepth || 0;
  const surfaceEntrySpeed = Math.abs(s.speedMph);
  const wasInWater = (s.waterDepth || 0) >= .05;
  s.surfaceMud = mud;
  s.waterDepth = waterDepth;
  s.mudWheelSpin = mud * clamp(s.input.throttle || 0, 0, 1) *
    clamp(1 - Math.abs(s.speedMph) / (car.offRoadSpeed ?? 68), 0, 1);
  if(waterDepth >= .05 && !wasInWater){
    const position = this.course.groundAt(s.s, s.lateral);
    this.emit({muddyHollowSplash:{depth:waterDepth,speedMph:s.speedMph,
      position:{x:position.x,y:position.y,z:position.z},cue:'world.muddy-hollow-splash'}});
  }
  const nitro = s.upgrades.nitro, boostDrain = BOOST.drainPerSec / ((1 + nitro * .14) * car.boostCapacity);
  const boostTopSpeed = BOOST.topSpeedMult + nitro * .025 + (car.nitroSpeedBonus ?? 0);
  if(s.practice)s.boost=1;
  s.boosting = !!s.input.boost && s.boost > 0 && s.gear>=0 && s.speedMph >= (s.practice?0:BOOST.minSpeedMph) && surface.boostAllowed && s.input.brake === 0;
  if (s.boosting) {
    const available = Math.min(1, s.boost / (boostDrain * dt));
    s.boost = s.practice?1:Math.max(0, s.boost - boostDrain * dt);
    const boostCeiling = d.autoShift ? car.topSpeed * boostTopSpeed : Math.min(car.topSpeed * boostTopSpeed, gearMax * DRIVE.gearCeilFrac);
    s.speedMph += Math.max(0, Math.min(boostCeiling - s.speedMph, BOOST.accelMphPerSec * (1 + nitro * .15) * (car.nitroAcceleration ?? 1) * dt * available));
  } else if (!s.input.boost) {
    s.boost = Math.min(1, s.boost + BOOST.refillPerSec * dt);
  }
  if (s.boosting && !wasBoosting) this.emit({ boostStarted: true });

  // engine blow if you ride the limiter on a Pro manual — the threshold sits
  // below the gear ceiling so holding throttle without upshifting gets there
  if (s.status === 'exploring' &&
      (s.hiddenRoadJourney?.departed || s.muddyHollowDeparture?.departed)) {
    s.overrevSec = 0;
  } else if (!reversing && !d.autoShift && d.engineBlow && s.revs > DRIVE.overRevFrac && s.input.throttle > 0) {
    s.overrevSec += dt;
    if (s.overrevSec > DRIVE.overRevBlowSec) { this._crash('engine_blew'); return; }
  } else {
    s.overrevSec = Math.max(0, s.overrevSec - dt);
  }

  // A released steering wheel keeps a physical world heading. The road can
  // bend away underneath the car; it never supplies free steering.
  const frame = this.course.at(s.s);
  s.offRoad = !surface.mainRoad;
  s.preparedGravel = surface.preparedGravel;
  s.shortcutId = surface.shortcutId || null;
  s.offRoadTime = s.offRoad ? s.offRoadTime + dt : Math.max(0, s.offRoadTime - dt * 3);
  const shoulderDepth = Math.max(0, Math.abs(s.lateral) - surface.roadHalfWidth);
  const roughTarget = surface.preparedGravel ? surface.roughness : s.offRoad ? Math.min(1, .32 + shoulderDepth * .12 + s.offRoadTime * .2) * car.roughnessScale : 0;
  s.roughness += (roughTarget - s.roughness) * (1 - Math.exp(-8 * dt));
  const traction = surface.traction;
  s.steerVisual += (s.input.steer - s.steerVisual) * (1 - Math.exp(-DRIVE.steerResponse * dt));
  const targetYaw = -s.steerVisual * steeringYawAuthority(Math.abs(s.speedMph), car.grip, traction) * (s.speedMph < 0 ? -1 : 1);
  s.yawVelocity += (targetYaw - s.yawVelocity) * (1 - Math.exp(-DRIVE.yawResponse * dt));
  // The nose turns first while momentum carries the rear outward. A short
  // release or counter-steer settles the slide without steering toward the road.
  const driftSpeed=Math.max(0,Math.min(1,(s.speedMph-38)/85));
  const slipTarget=-s.steerVisual*driftSpeed*(surface.preparedGravel?.25:s.offRoad?.31:.21)*(1+s.input.brake*.6);
  s.slipAngle+=(slipTarget-s.slipAngle)*(1-Math.exp(-(s.input.steer*s.slipAngle>0?13:7)*dt));
  s.drifting=Math.abs(s.slipAngle)>.075&&s.speedMph>40;
  if (s.offRoad) {
    const offRoadLimit = surface.speedLimit * (s.boosting ? boostTopSpeed : 1);
    const scrub = surface.scrub;
    s.speedMph *= Math.exp(-scrub * dt * (s.speedMph > offRoadLimit ? 1 : .25));
    if (s.speedMph > offRoadLimit) s.speedMph -= (s.speedMph - offRoadLimit) * (1 - Math.exp(-1.4 * dt));
    if (!surface.boostAllowed) s.boosting = false;
  }
  if(mud>0)s.speedMph*=Math.exp(-mud*.36*dt);

  const speedCap = s.boosting ? car.topSpeed * boostTopSpeed : car.topSpeed;
  if (!s.boosting && s.speedMph > speedCap) s.speedMph -= 22 * dt;
  s.speedMph = Math.max(-DRIVE.reverseMaxMph, Math.min(car.topSpeed * boostTopSpeed, s.speedMph));
  if(waterDepth>0){
    const waterDrag=waterDepth*(.18+surfaceEntrySpeed*.008);
    const waterLoss=surfaceEntrySpeed*(1-Math.exp(-waterDrag*dt));
    s.speedMph=Math.sign(s.speedMph)*Math.max(0,Math.abs(s.speedMph)-waterLoss);
  }
  s.revs = Math.abs(s.speedMph) / (s.gear < 0 ? DRIVE.reverseMaxMph : car.gears[s.gear]);
  const metresPerSec = s.speedMph * DRIVE.mphToWorld;
  if (onHiddenRoad(this.course, s)) s.hiddenRoadDriving = true;
  else if (s.hiddenRoadDriving && surface.mainRoad && Math.abs(s.headingError) < 1.3) s.hiddenRoadDriving = false;
  // A returning road car may join the asphalt facing back along the circuit.
  // Keep its physical heading until the driver has steered into the race lane.
  const freeHeading = !!s.arena || this.course.hiddenRoad && s.hiddenRoadDriving || this.course.def.practice || offroadCapability(car) && (!surface.road || Math.abs(s.headingError) > 1.45);
  if (freeHeading) {
    const heading = frame.heading + s.headingError + s.yawVelocity * dt;
    const old = this.course.worldAt(s.s, s.lateral);
    const pose = this._roadPosition({ x: old.x + Math.sin(heading) * metresPerSec * dt + Math.cos(frame.heading) * s.pushVelocity * dt,
      z: old.z + Math.cos(heading) * metresPerSec * dt - Math.sin(frame.heading) * s.pushVelocity * dt }, s.s);
    s.s = pose.s; s.lateral = pose.lateral;
    s.headingError = wrapHeading(heading - this.course.at(s.s).heading);
  } else {
    const forward = Math.max(0, Math.cos(s.headingError)) * metresPerSec * dt;
    // Inside a bend, a metre of physical travel covers more centreline progress.
    // This makes a real dirt shortcut quicker without a scripted progress jump.
    const progress = forward / Math.max(.25, 1 - frame.curvature * s.lateral);
    s.headingError += s.yawVelocity * dt - frame.curvature * progress;
    s.headingError = Math.max(-1.45, Math.min(1.45, s.headingError));
    s.lateral += (Math.sin(s.headingError) * metresPerSec + s.pushVelocity) * dt;
    s.s += progress;
  }
  s.pushVelocity *= Math.exp(-2.4 * dt);
  this._offroadStep(dt, !surface.road);
  s.offRoad = !this._surface(s.s, s.lateral).mainRoad;
  // Dirt alone never consumes a life or structural hit. Only contact does.
  this._boundary(s);
}

export function _terrainPose(actor = this.state) {
  if (actor !== this.state || !offroadCapability(this.car)) return;
  const point = this._supportAt(actor.s, actor.lateral), spec = this._vehicleSpec(actor);
  const heading = this.course.at(actor.s).heading + actor.headingError;
  const sample = (forward, side) => {
    const pose = this._roadPosition({ x: point.x + Math.sin(heading) * forward + Math.cos(heading) * side,
      z: point.z + Math.cos(heading) * forward - Math.sin(heading) * side }, actor.s);
    return this._supportAt(pose.s, pose.lateral).y;
  };
  const attitude = terrainAttitude(sample(spec.halfLength, 0), sample(-spec.halfLength, 0), sample(0, spec.halfWidth), sample(0, -spec.halfWidth), spec.halfLength, spec.halfWidth);
  actor.groundHeight = point.y;
  actor.terrainPitch = attitude.pitch; actor.terrainRoll = attitude.roll;
}

export function _offroadStep(dt, offPreparedRoute) {
  const s = this.state, capability = offroadCapability(this.car, { titanClimb: this.featureFlags?.enabled('titan-climb') === true });
  if (!capability || s.tumble) return;
  const before = this._supportAt(s.prevS, s.prevLateral), after = this._supportAt(s.s, s.lateral);
  if (![before.y, after.y, s.s, s.lateral].every(Number.isFinite)) {
    s.s = Number.isFinite(s.prevS) ? s.prevS : 0; s.lateral = Number.isFinite(s.prevLateral) ? s.prevLateral : 0;
    this._safeReset(s); this._callout('TERRAIN RESCUE  /  INVALID POSITION', 2); this.emit({ terrainRescue: true }); return;
  }
  if ((!s.airborne || after.y > (s._jumpY ?? after.y)) && offPreparedRoute) {
    const gain = after.y - before.y, distance = Math.hypot(after.x - before.x, after.z - before.z);
    const limit = limitClimb({ gain, distance, dt, capability, accumulated: s._climbGain || 0 });
    if (limit.tipped) {
      s.s = s.prevS; s.lateral = s.prevLateral;
      this._terrainPose(); this._startTumble('climb_limit'); return;
    }
    if (limit.fraction < 1) {
      // Re-sample the shortened path rather than setting a free-floating Y.
      // Bisection also bounds a nonlinear or abrupt support surface.
      let low = 0, high = 1;
      for (let i = 0; i < 12; i++) {
        const t = (low + high) * .5;
        const pose = this._roadPosition({ x: before.x + (after.x - before.x) * t, z: before.z + (after.z - before.z) * t }, s.prevS);
        if (this._supportAt(pose.s, pose.lateral).y - before.y <= capability.risePerSec * dt) low = t; else high = t;
      }
      const pose = this._roadPosition({ x: before.x + (after.x - before.x) * low, z: before.z + (after.z - before.z) * low }, s.prevS);
      s.s = pose.s; s.lateral = pose.lateral; s.speedMph *= low;
    }
    const actualAfter = this._supportAt(s.s, s.lateral);
    const actualGain = actualAfter.y - before.y;
    const actualDistance = Math.hypot(actualAfter.x - before.x, actualAfter.z - before.z);
    const slopeDelta = slopeSpeedDelta({ gain: actualGain, distance: actualDistance, dt, capability });
    if (s.speedMph && slopeDelta) {
      const travelSign = Math.sign(s.speedMph);
      s.speedMph = travelSign * Math.max(0, Math.abs(s.speedMph) + slopeDelta);
    }
    s._climbGain = (s._climbGain || 0) + Math.max(0, actualGain);
    // Traversing sideways across a steep face is not a fresh climb. Reset
    // only on genuinely gentle support, not just a zero-rise driving vector.
    const supportGrade = Math.hypot(Math.tan(s.terrainPitch || 0), Math.tan(s.terrainRoll || 0));
    s._climbRest = gain <= distance * .06 && supportGrade < .25 ? (s._climbRest || 0) + dt : 0;
    if (s._climbRest > .7) s._climbGain = 0;
    if (Math.abs(gain) <= distance * .25 && s._climbGain < 1) s._offroadSafe = { s: s.prevS, lateral: s.prevLateral };
  } else if (!s.airborne) {
    s._climbGain = 0; s._climbRest = 0; s._offroadSafe = { s: s.prevS, lateral: s.prevLateral };
  }
  this._terrainPose();
}

export function _jump(actor, dt) {
  const arena = this.course.def.kind === 'arena';
  const allTerrain = actor === this.state && offroadCapability(this.car) && (actor.airborne || !this._surface(actor.s, actor.lateral).road);
  if (actor.tumble || (!arena && this.course.def.airborne !== true && !allTerrain) || !Number.isFinite(dt) || dt <= 0) return;
  const groundPoint = this._supportAt(actor.s, actor.lateral, actor), previousPoint = this._supportAt(actor.prevS ?? actor.s, actor.prevLateral ?? actor.lateral, actor);
  const ground = groundPoint.y, previousGround = previousPoint.y;
  if (!Number.isFinite(ground) || !Number.isFinite(previousGround)) return;
  const groundVelocity = (ground - previousGround) / dt;
  if (actor._jumpY == null) { actor._jumpY = previousGround; actor._verticalSpeed = arena ? 0 : groundVelocity; }
  // Consecutive terrain velocities are interval averages. Their midpoint
  // estimates the tangent velocity at the start of this step. Extrapolating
  // only the older average would detach at half gravity and create repeated
  // tiny hops on ordinary rolling crests. Keep authored arena timing exact.
  const verticalSpeed = !arena && !actor.airborne ? (actor._verticalSpeed + groundVelocity) * .5 : actor._verticalSpeed;
  const gravity = 18, predicted = actor._jumpY + verticalSpeed * dt - gravity * dt * dt * .5;
  if (!actor.airborne) {
    // A descending convex crest can leave the road too: the car keeps its
    // signed tangent velocity while the road falls away faster. The arena
    // retains its authored upward-ramp threshold and exact existing timing.
    const fastEnough = (arena ? actor.speedMph : Math.abs(actor.speedMph)) > 28;
    if (predicted > ground + .0001 && (!arena || verticalSpeed > 1) && fastEnough) {
      actor.airborne = true;
      actor._verticalSpeed = verticalSpeed;
      actor._airOrigin = { x: previousPoint.x, z: previousPoint.z, time: this.state.stageTimeSec - dt };
      actor.airDistance = 0; actor.airTime = 0;
      // Natural crests share flight/landing physics, but only authored arena
      // ramps can create a scored jump token. Resets still clear that token.
      const phase = this.course.phase(actor.s), index = arena ? this.course.features.ramps.findIndex(ramp => phase >= ramp.start && phase <= ramp.end + 8) : -1;
      actor._jumpOrigin = index >= 0 ? { s: actor.s, world: this.course.worldAt(actor.s, actor.lateral), rampId: `ramp-${index}`, lap: Math.floor(actor.s / this.course.length) + 1 } : null;
    } else {
      actor._verticalSpeed = groundVelocity;
      actor._jumpY = ground; actor.airHeight = 0; return;
    }
  }
  actor._jumpY = predicted;
  actor._verticalSpeed -= gravity * dt;
  actor.airHeight = Math.max(0, actor._jumpY - ground);
  if (actor._airOrigin) {
    actor.airDistance = Math.hypot(groundPoint.x - actor._airOrigin.x, groundPoint.z - actor._airOrigin.z);
    actor.airTime = Math.max(0, this.state.stageTimeSec - actor._airOrigin.time);
  }
  if (actor._jumpY > ground) return;
  // Rejoin a descending road at its tangent speed. Zeroing this for natural
  // roads would manufacture a second hop on the next downhill step.
  actor._jumpY = ground; actor._verticalSpeed = arena ? 0 : groundVelocity; actor.airborne = false; actor.airHeight = 0;
  const origin = actor._jumpOrigin; actor._jumpOrigin = null;
  if (!arena || actor !== this.state || !origin || origin.lap !== actor.completedLaps + 1 || origin.s < actor.completedLaps * this.course.length) return;
  const key = `${origin.rampId}:lap-${origin.lap}`;
  if (actor.collectedJumps.includes(key)) return;
  const landing = this.course.worldAt(actor.s, actor.lateral), distance = Math.hypot(landing.x - origin.world.x, landing.z - origin.world.z);
  if (distance < 4) return;
  const points = this.course.def.practice ? 0 : Math.min(400, Math.round(distance * 4)) * this.scoreMultiplier;
  actor.collectedJumps.push(key); actor.jumpScore += points; actor.stageStyleScore += points; actor.score += points;
  actor.jumps++; actor.bestJumpMeters = Math.max(actor.bestJumpMeters, +distance.toFixed(1));
  this._callout(`BIG AIR  /  ${Math.round(distance)} m  /  +${points}`, 2.4);
  this.emit({ jumpLanded: { rampId: origin.rampId, lap: origin.lap, distance: +distance.toFixed(1), points } });
}

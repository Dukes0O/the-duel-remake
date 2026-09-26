import {CARS, DRIVE, BOOST, steeringYawAuthority} from '../config.js';
import {wrapHeading} from '../offroad-physics.js';
import {upgradedCar} from '../progression.js';
import {applyDriverModifiers} from '../drivers.js';
import {worldPose, floorLimit} from './arena-floor.js';
import {arenaFloorSpeed} from './venues.js';

// The computer car's hands and feet (docs/SCRAPDOME.md section 4). It turns a
// goal into motion within the same limits as the player's car: top speed and
// acceleration from the car and its upgrades, turning from the shared
// steering curve and grip. It never changes those limits.

export const PILOT = Object.freeze({
  steerGain: 2.2, tightTurnRadians: 1.1, tightTurnShare: .6, minimumTightMph: 22,
  probes: Object.freeze([Object.freeze([.45, 6]), Object.freeze([1, 10])]), wallMargin: 3.5,
  wallBias: .3, wallBiasPerDanger: .25, wallSlowdown: .45, uTurnRadians: 2.1, uTurnDoneRadians: .9, uTurnSwing: 1.5,
  uTurnShare: .62, uTurnWallShare: .4,
  // Junk cars stop anything lighter than the Titan: look for them and go round.
  junkClearance: 3.8, junkReachMinimum: 10, junkReachSeconds: 1.1, junkSwerve: .6, junkSwerveNear: .6, junkSlowdown: .8,
  ringRouteMetres: 55, laneCorrection: .035, laneCorrectionLimit: .5,
  stuckMetres: 1.5, stuckSeconds: 1, stuckGoalMph: 10, reverseSeconds: 1.4, reverseGraceSeconds: 1.5,
  pinnedMetres: 5.5, pinnedMph: 6,
});

export function arenaCarSpec(duel, actor) {
  const key = `${actor.car}|${actor.driverId || ''}|${JSON.stringify(actor.upgrades || {})}`;
  if (actor._arenaSpec?.key === key) return actor._arenaSpec.value;
  const base = CARS[actor.car] || CARS[duel.state.car];
  const value = applyDriverModifiers(upgradedCar(base, actor.upgrades || {}), actor.driverId, actor.car);
  actor._arenaSpec = {key, value};
  return value;
}

// Signed distance along the ring from `from` to `to`, wrapped to half a lap.
export function ringDistance(course, from, to) {
  const length = course.length;
  return ((to - from) % length + length * 1.5) % length - length / 2;
}

// Heading that follows the ring toward `goalS`, drifting toward `goalLateral`.
function ringHeading(duel, actor, goalS, goalLateral) {
  const frame = duel.course.at(actor.s), direction = ringDistance(duel.course, actor.s, goalS) >= 0 ? 1 : -1;
  const base = frame.heading + (direction > 0 ? 0 : Math.PI);
  const correction = Math.max(-PILOT.laneCorrectionLimit, Math.min(PILOT.laneCorrectionLimit,
    (goalLateral - actor.lateral) * PILOT.laneCorrection));
  return base + direction * correction;
}

// goal: {x, z, speedMph, boost}
export function pilotStep(duel, actor, goal, dt) {
  const spec = arenaCarSpec(duel, actor), course = duel.course;
  actor.prevS = actor.s; actor.prevLateral = actor.lateral;
  actor.prevAirHeight = actor.airHeight || 0;
  const pose = worldPose(duel, actor);
  const goalRing = course.nearest(goal.x, goal.z, actor.s);
  const far = Math.abs(ringDistance(course, actor.s, goalRing.s)) > PILOT.ringRouteMetres;
  let desired = far ? ringHeading(duel, actor, goalRing.s, goalRing.lateral)
    : Math.atan2(goal.x - pose.x, goal.z - pose.z);

  // Wall sense. Probe the current line at two distances; a probe near the wall
  // turns the car along the wall and away from it, and slows it to make the
  // turn. A U-turn swings toward the open floor, never into the nearer wall.
  const speed = actor.speedMph || 0, metres = Math.abs(speed) * DRIVE.mphToWorld;
  const limit = floorLimit(duel), margin = limit - PILOT.wallMargin;
  let speedScale = 1;
  const probe = (heading, seconds, minimum) => {
    const reach = Math.max(minimum, metres * seconds);
    return course.nearest(pose.x + Math.sin(heading) * reach, pose.z + Math.cos(heading) * reach, actor.s);
  };
  let turn = wrapHeading(desired - pose.heading);
  // A U-turn is a commitment: pick the side with more room once, then keep
  // turning that way, braking near walls, until the car faces its goal.
  if (actor._arenaUTurn && Math.abs(turn) < PILOT.uTurnDoneRadians) actor._arenaUTurn = 0;
  if (!actor._arenaUTurn && Math.abs(turn) > PILOT.uTurnRadians) {
    const left = probe(pose.heading + 1, .6, 10), right = probe(pose.heading - 1, .6, 10);
    actor._arenaUTurn = Math.abs(left.lateral) <= Math.abs(right.lateral) ? 1 : -1;
  }
  if (actor._arenaUTurn) {
    desired = pose.heading + actor._arenaUTurn * PILOT.uTurnSwing;
    const ahead = probe(pose.heading, .45, 6);
    speedScale = Math.abs(ahead.lateral) > margin ? PILOT.uTurnWallShare : PILOT.uTurnShare;
  }
  for (const [seconds, minimum] of actor._arenaUTurn ? [] : PILOT.probes) {
    const ahead = probe(pose.heading, seconds, minimum);
    const over = Math.abs(ahead.lateral) - margin;
    if (over <= 0) continue;
    const danger = Math.min(2, over / PILOT.wallMargin);
    const tangent = course.at(actor.s).heading;
    const along = Math.cos(wrapHeading(pose.heading - tangent)) >= 0 ? 1 : -1;
    // Heading along the ring in the current direction, angled off the wall.
    desired = tangent + (along > 0 ? 0 : Math.PI) - Math.sign(ahead.lateral) * along * (PILOT.wallBias + PILOT.wallBiasPerDanger * danger);
    speedScale = Math.min(speedScale, 1 - PILOT.wallSlowdown * Math.min(1, danger));
    break;
  }

  // Junk on the line: turn away from it, harder the closer it is.
  if (!actor._arenaUTurn) {
    const reach = Math.max(PILOT.junkReachMinimum, metres * PILOT.junkReachSeconds);
    const hx = Math.sin(pose.heading), hz = Math.cos(pose.heading);
    let nearest = null;
    for (const prop of course.features.crushables || []) {
      if (duel.state.crushedProps?.includes(prop.id)) continue;
      const dx = prop.x - pose.x, dz = prop.z - pose.z, along = dx * hx + dz * hz;
      // Positive side: the way the heading turns as it increases.
      const side = dx * hz - dz * hx;
      if (along > 0 && along < reach && Math.abs(side) < PILOT.junkClearance &&
          (!nearest || along < nearest.along)) nearest = {along, side};
    }
    if (nearest) {
      const swerve = PILOT.junkSwerve + PILOT.junkSwerveNear * (1 - nearest.along / reach);
      desired = pose.heading - (nearest.side >= 0 ? 1 : -1) * swerve;
      speedScale = Math.min(speedScale, PILOT.junkSlowdown);
      // Nose against junk and too slow to steer round it: back out now.
      if (nearest.along < PILOT.pinnedMetres && Math.abs(speed) < PILOT.pinnedMph &&
          !(actor._arenaReverseSec > 0) && !(actor._arenaGraceSec > 0)) actor._arenaReverseSec = PILOT.reverseSeconds;
    }
  }

  // Unstick: a car that wants to move but has not covered 1.5 m in a second
  // (nose against a wall or the Heap) reverses and swings round, then gets a
  // grace period so reversing itself never counts as being stuck.
  const reversing = (actor._arenaReverseSec || 0) > 0;
  if (reversing) {
    actor._arenaReverseSec = Math.max(0, actor._arenaReverseSec - dt);
    if (actor._arenaReverseSec === 0) actor._arenaGraceSec = PILOT.reverseGraceSeconds;
  } else if ((actor._arenaGraceSec || 0) > 0) {
    actor._arenaGraceSec = Math.max(0, actor._arenaGraceSec - dt);
    actor._arenaWatch = null;
  } else if (goal.speedMph > PILOT.stuckGoalMph) {
    const watch = actor._arenaWatch;
    if (!watch) actor._arenaWatch = {x: pose.x, z: pose.z, sec: 0};
    else if ((watch.sec += dt) >= PILOT.stuckSeconds) {
      if (Math.hypot(pose.x - watch.x, pose.z - watch.z) < PILOT.stuckMetres) actor._arenaReverseSec = PILOT.reverseSeconds;
      actor._arenaWatch = null;
    }
  } else actor._arenaWatch = null;

  turn = wrapHeading(desired - pose.heading);
  const steer = Math.max(-1, Math.min(1, -turn * PILOT.steerGain)) * (reversing ? -1 : 1);
  actor.steerVisual = (actor.steerVisual || 0) + (steer - (actor.steerVisual || 0)) * (1 - Math.exp(-DRIVE.steerResponse * dt));
  const authority = steeringYawAuthority(Math.abs(speed), spec.grip, 1);
  const targetYaw = -actor.steerVisual * authority * (speed < 0 ? -1 : 1);
  actor.yawVelocity = (actor.yawVelocity || 0) + (targetYaw - (actor.yawVelocity || 0)) * (1 - Math.exp(-DRIVE.yawResponse * dt));

  // Speed: brake into tight turns, then accelerate as the player's car would.
  const floorTop = arenaFloorSpeed(course.def.scrapdome, spec.topSpeed);
  // A boosting car aims for the boost ceiling; otherwise braking would cancel it.
  let target = reversing ? -DRIVE.reverseMaxMph * .6 : actor._arenaUTurn ? floorTop * speedScale :
    (goal.boost ? floorTop * BOOST.topSpeedMult : goal.speedMph) * speedScale;
  if (!reversing && Math.abs(turn) > PILOT.tightTurnRadians)
    target = Math.min(target, Math.max(PILOT.minimumTightMph, floorTop * PILOT.tightTurnShare));
  let next = speed;
  if (next < target) {
    const revs = Math.max(0, next) / Math.max(1, spec.topSpeed);
    const factor = Math.max(.15, 1 - Math.max(0, revs - .5));
    next = Math.min(target, next + (reversing ? DRIVE.reverseAccel : spec.accel * factor * DRIVE.accelScale) * dt);
  } else {
    next = Math.max(target, next - DRIVE.brakeAccel * (spec.braking || 1) * dt);
  }
  actor.boost ??= 1;
  actor.boosting = !reversing && !!goal.boost && actor.boost > 0 && next > BOOST.minSpeedMph;
  if (actor.boosting) {
    actor.boost = Math.max(0, actor.boost - BOOST.drainPerSec / Math.max(.1, spec.boostCapacity ?? 1) * dt);
    next = Math.min(floorTop * BOOST.topSpeedMult, next + BOOST.accelMphPerSec * dt);
  } else if (!goal.boost) {
    actor.boost = Math.min(1, actor.boost + BOOST.refillPerSec * dt);
  }
  const cap = actor.boosting ? floorTop * BOOST.topSpeedMult : floorTop;
  actor.speedMph = Math.max(-DRIVE.reverseMaxMph, Math.min(cap, next));
  actor.braking = actor.speedMph < speed - .01;

  // Move in world space, then describe the result relative to the ring.
  const heading = pose.heading + actor.yawVelocity * dt;
  const frameHeading = course.at(actor.s).heading, step = actor.speedMph * DRIVE.mphToWorld * dt;
  const push = actor.pushVelocity || 0;
  const moved = duel._roadPosition({x: pose.x + Math.sin(heading) * step + Math.cos(frameHeading) * push * dt,
    z: pose.z + Math.cos(heading) * step - Math.sin(frameHeading) * push * dt}, actor.s);
  actor.s = moved.s; actor.lateral = moved.lateral;
  actor.headingError = wrapHeading(heading - course.at(actor.s).heading);
  actor.pushVelocity = push * Math.exp(-2.4 * dt);
  actor.contactCooldown = Math.max(0, (actor.contactCooldown || 0) - dt);
  actor.ramRecoverySec = Math.max(0, (actor.ramRecoverySec || 0) - dt);
}

import {DRIVE} from './config.js';
import {wrapHeading} from './offroad-physics.js';
import {yawInertia, solveVehicleImpact, impactSeverity} from './vehicle-collision.js';

// A struck computer car becomes a free body until its tyres bite again
// (docs/CRASH_PHYSICS.md section 2). It keeps the road-relative fields every
// other system reads (s, lateral, headingError), recomputed from world motion.
export const KNOCK = Object.freeze({
  slideDecel: 7.8,      // m/s², sideways tyre scrub (about 0.8 g)
  rollDecel: 4.5,       // m/s², forward: a computer driver brakes
  playerRollDecel: 1,   // m/s², forward: the player's car keeps rolling
  spinDamping: 2.6,     // per second
  spinFriction: .8,     // rad/s², constant part of spin decay
  gravity: 18,          // the game's jump gravity
  endSpeed: 1.5, endSpin: .35, minSec: .3, maxSec: 3.5,
});

export function bodyHeading(duel, actor) {
  return duel.course.at(actor.s).heading + (actor.headingError || 0) + ((actor.dir || 1) < 0 ? Math.PI : 0);
}

// The rigid body for the crash solver, from the actor's current state.
export function actorBody(duel, actor, spinRate = 0) {
  const spec = duel._vehicleSpec(actor), frame = duel.course.at(actor.s);
  const at = duel.course.worldAt(actor.s, actor.lateral), heading = bodyHeading(duel, actor);
  let vx, vz, spin = spinRate;
  if (actor.knock) { vx = actor.knock.vx; vz = actor.knock.vz; spin = actor.knock.spin; }
  else {
    const speed = (actor.speedMph || 0) * DRIVE.mphToWorld, push = actor.pushVelocity || 0;
    vx = Math.sin(heading) * speed + Math.cos(frame.heading) * push;
    vz = Math.cos(heading) * speed - Math.sin(frame.heading) * push;
  }
  return {x: at.x, z: at.z, heading, vx, vz, spin, mass: spec.mass,
    halfLength: spec.halfLength, halfWidth: spec.halfWidth,
    inertia: yawInertia(spec.mass, spec.halfLength, spec.halfWidth)};
}

export function startKnock(actor, {vx, vz, spin, severity, hopMps = 0, heading = 0}) {
  actor.knock = {vx, vz, spin, severity, age: 0, vy: hopMps};
  const forward = vx * Math.sin(heading) + vz * Math.cos(heading);
  actor.speedMph = forward / DRIVE.mphToWorld;
  if (hopMps > 0) { actor.airborne = true; actor.airHeight = Math.max(actor.airHeight || 0, .02); }
  actor.boosting = false;
}

// One step of free motion. Returns true while the car is still knocked.
export function stepKnock(duel, actor, dt) {
  const k = actor.knock;
  if (!k || !(dt > 0)) return false;
  const T = KNOCK;
  k.age += dt;
  actor.prevS = actor.s; actor.prevLateral = actor.lateral;
  actor.prevAirHeight = actor.airHeight || 0;
  const heading = bodyHeading(duel, actor);
  const f = {x: Math.sin(heading), z: Math.cos(heading)}, side = {x: Math.cos(heading), z: -Math.sin(heading)};
  let forward = k.vx * f.x + k.vz * f.z, across = k.vx * side.x + k.vz * side.z;
  const rollDecel = actor === duel.state ? T.playerRollDecel : T.rollDecel;
  forward = Math.sign(forward) * Math.max(0, Math.abs(forward) - rollDecel * dt);
  across = Math.sign(across) * Math.max(0, Math.abs(across) - T.slideDecel * dt);
  k.vx = f.x * forward + side.x * across; k.vz = f.z * forward + side.z * across;
  k.spin = Math.sign(k.spin) * Math.max(0, Math.abs(k.spin) - T.spinFriction * dt) * Math.exp(-T.spinDamping * dt);
  if (k.vy || (actor.airHeight || 0) > 0) {
    actor.airHeight = Math.max(0, (actor.airHeight || 0) + k.vy * dt);
    k.vy -= T.gravity * dt;
    if (actor.airHeight === 0) { k.vy = 0; actor.airborne = false; }
  }
  const at = duel.course.worldAt(actor.s, actor.lateral);
  const moved = duel._roadPosition({x: at.x + k.vx * dt, z: at.z + k.vz * dt}, actor.s);
  actor.s = moved.s; actor.lateral = moved.lateral;
  const newHeading = heading + k.spin * dt;
  actor.headingError = wrapHeading(newHeading - duel.course.at(actor.s).heading - ((actor.dir || 1) < 0 ? Math.PI : 0));
  actor.speedMph = (actor === duel.state ? forward : Math.max(0, forward)) / DRIVE.mphToWorld;
  actor.pushVelocity = 0;
  // Control returns once the car stops sliding sideways and spinning; rolling
  // forward is fine to hand back to the driver.
  const endSpeed = k.roadside ? 2 : T.endSpeed;
  const settled = k.age >= T.minSec && Math.abs(across) < endSpeed && Math.abs(k.spin) < T.endSpin &&
    !(actor.airHeight > 0);
  if (settled || k.age >= T.maxSec) {
    if (k.roadside) {
      actor.alive = false;
      actor.roadsideMotion = null;
      actor.wrecked = {atTime: duel.state.stageTimeSec, age: 0,
        side: k.roadside.side, lateralVelocity: 0, forwardVelocity: 0,
        verticalVelocity: 0, spinVelocity: 0, physical: true, rollLimit: 0};
      actor.speedMph = 0; actor.pushVelocity = 0; actor.airHeight = 0;
      actor.airborne = false;
    }
    actor.knock = null;
    return false;
  }
  return true;
}

// Hop speeds for hard hits: a smashed car jolts, a launched one leaves the ground.
function hopFor(severity, dvMph) {
  if (severity === 'launched') return Math.min(8, 3 + (dvMph - 45) * .12);
  return severity === 'smashed' ? 1.2 : 0;
}

// Speed along the heading, sideways push in the road frame, and spin, for a
// car that keeps driving (the player, or a nudged computer car).
function applyDriving(duel, actor, before, after, {player}) {
  const f = {x: Math.sin(before.heading), z: Math.cos(before.heading)};
  const forward = after.vx * f.x + after.vz * f.z;
  const frame = duel.course.at(actor.s);
  const residual = {x: after.vx - f.x * forward, z: after.vz - f.z * forward};
  const lateral = residual.x * Math.cos(frame.heading) - residual.z * Math.sin(frame.heading);
  const speed = forward / DRIVE.mphToWorld;
  actor.speedMph = player ? Math.max(-DRIVE.reverseMaxMph, speed) : Math.max(0, Math.abs(speed));
  actor.pushVelocity = Math.max(-32, Math.min(32, lateral));
}

// Smashed or launched traffic becomes a roadside wreck, moving as the solver
// says and rolling with its spin (the existing traffic-wreck motion).
function wreckTraffic(duel, actor, after, severity, dvMph) {
  const frame = duel.course.at(actor.s);
  const lateral = after.vx * Math.cos(frame.heading) - after.vz * Math.sin(frame.heading);
  const along = after.vx * Math.sin(frame.heading) + after.vz * Math.cos(frame.heading);
  actor.alive = false;
  actor.wrecked = {atTime: duel.state.stageTimeSec, age: 0, side: Math.sign(lateral) || 1,
    lateralVelocity: lateral, forwardVelocity: along, verticalVelocity: hopFor(severity, dvMph) || 1.1,
    spinVelocity: after.spin, physical: true,
    // Smashed cars stay upright; launched ones roll, the harder the further.
    rollLimit: severity === 'launched' ? Math.min(Math.PI, 1.05 + (dvMph - 45) * .05) : .2};
  actor.airHeight = 0; actor.speedMph = 0; actor.pushVelocity = 0;
  actor.damageZones = {front: 3.5, rear: 3.5, left: 3.5, right: 3.5};
}

// Solve one car-to-car hit and apply it to both cars. Returns the solver
// result and each car's severity, for crash rules and effects.
export function resolveCarCrash(duel, a, b, {
  wreckTrafficAt = ['smashed', 'launched'], onlyB = false, forceKnock = false,
} = {}) {
  const s = duel.state;
  const spinOf = actor => actor === s ? s.yawVelocity || 0 : 0;
  const bodyA = actorBody(duel, a, spinOf(a)), bodyB = actorBody(duel, b, spinOf(b));
  const result = solveVehicleImpact(bodyA, bodyB);
  const severityA = impactSeverity(result.a.dvMph, {attackerMass: bodyB.mass, mass: bodyA.mass});
  const severityB = impactSeverity(result.b.dvMph, {attackerMass: bodyA.mass, mass: bodyB.mass});
  for (const [actor, before, after, severity] of onlyB ? [[b, bodyB, result.b, severityB]]
    : [[a, bodyA, result.a, severityA], [b, bodyB, result.b, severityB]]) {
    if (!forceKnock && actor === s && severity === 'nudge' && !actor.knock) applyDriving(duel, actor, before, after, {player: true});
    else if (s.traffic.includes(actor) && wreckTrafficAt.includes(severity)) wreckTraffic(duel, actor, after, severity, after.dvMph);
    else if (!forceKnock && severity === 'nudge' && !actor.knock) applyDriving(duel, actor, before, after, {player: false});
    else startKnock(actor, {vx: after.vx, vz: after.vz, spin: after.spin,
      severity, hopMps: hopFor(severity, after.dvMph), heading: before.heading});
  }
  return {result, severityA, severityB};
}

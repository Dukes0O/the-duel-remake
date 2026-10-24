// The autopilot (docs/HELICOPTER.md section 3). Off unless switched on (P).
// Switched on it holds height and heading, or flies to a destination's
// approach point at 30 m/s with at most 10 degrees of bank (so a car on the
// cable barely swings) and stops in a hover 20 m above the landing zone.
// Landing and setting down stay with the pilot in H1. Any control beyond
// 30% hands control straight back. Pure: it only turns state into targets.
import {GRAVITY, HELI_STEP, HORIZONTAL_DRAG, KESTREL, heliMass} from './heli-flight.js';

const DEG = Math.PI / 180;

export const AUTOPILOT = Object.freeze({
  takeover: 0.3,
  cruiseSpeed: 30,
  maxBank: 10 * DEG,
  hoverAbove: 20,
  brake: 0.8,
  clearance: 30,
  maxClimb: 4,
  maxSink: 3,
  turnRate: 30 * DEG,
  arriveDistance: 3,
  // Seconds ahead along the flight path that it checks the ground and
  // obstacles, so rising ground is climbed before it arrives.
  lookAhead: Object.freeze([0, 2, 4, 6, 8, 10]),
  // Slows down when the ground ahead is higher than it can climb to in time.
  slowSpeed: 8,
  speedUp: 0.7,
  antiSway: 0.5,
});

// Climbing a mountain (RESCUE-SUMMIT-TUNE). When the straight line to the goal
// would pass within `near` metres of a mountain (ground `rise` metres above the
// ground under the helicopter that reaches its own height), the autopilot holds at least
// `over` metres above the highest ground in the next `reach` metres of the path
// (never closer than `endMargin` to the goal, where the usual approach takes
// over), capped by the flying ceiling and by the height the thin air still lets
// the helicopter hold. Where the straight line already clears the ground
// nothing here applies, and nothing changes.
export const FOLLOW = Object.freeze({near: 60, rise: 200, over: 80, reach: 600, step: 40, endMargin: 120, every: 60, holdMargin: 1.1});
const followCache = new WeakMap();

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// The highest y the helicopter can still hold a hover at in thin air.
function thrustCeiling(state) {
  const need = FOLLOW.holdMargin * heliMass(state) * GRAVITY / (KESTREL.maxThrust * (state.upgrades?.thrustFactor ?? 1));
  return need >= 1 ? -Infinity : -(state.upgrades?.altitudeScaleM ?? KESTREL.airScaleHeight) * Math.log(need) - state.altitudeOffset;
}

// The floor the climb needs now, or -Infinity when the straight line is clear.
function followFloor(state, target, distance, hoverY, hang, ground, ceiling) {
  if (!ground || distance <= FOLLOW.endMargin + FOLLOW.step) return -Infinity;
  const ux = (target.x - state.x) / distance, uz = (target.z - state.z) / distance, last = distance - FOLLOW.endMargin;
  const highestAt = s => { const x = state.x + ux * s, z = state.z + uz * s; return ground.highest ? ground.highest(x, z, 6) : ground.height(x, z); };
  // A mountain: ground ahead that stands `rise` metres over the ground under the helicopter, reaches
  // its own height and comes within `near` of the line. The hills of the other courses are lower.
  let tight = false;
  for (let s = FOLLOW.step; s <= last && !tight; s += FOLLOW.step) {
    const top = highestAt(s);
    tight = top > state.groundY + FOLLOW.rise && top > state.y && top + FOLLOW.near > state.y + (hoverY - state.y) * s / distance;
  }
  if (!tight) return -Infinity;
  const thin = thrustCeiling(state);
  let floor = -Infinity;
  for (let s = 0; s <= Math.min(FOLLOW.reach, last); s += FOLLOW.step) {
    const top = Math.min(thin, ceiling ? ceiling(state.x + ux * s, state.z + uz * s) - 5 : Infinity);
    floor = Math.max(floor, Math.min(highestAt(s) + FOLLOW.over + hang, top));
  }
  return floor;
}

export function createAutopilot() {
  return {engaged: false, holdY: 0, holdHeading: 0, target: null, arrived: false, cruiseY: 0, speed: 0};
}

// target: {x, z, groundY} of the landing zone, or null to just hold.
export function setAutopilotTarget(autopilot, target) {
  const ok = target && [target.x, target.z, target.groundY].every(Number.isFinite);
  autopilot.target = ok ? {x: target.x, z: target.z, groundY: target.groundY} : null;
  autopilot.arrived = false;
  autopilot.speed = null;
  followCache.delete(autopilot);
}

export function toggleAutopilot(autopilot, state) {
  autopilot.engaged = !autopilot.engaged;
  if (autopilot.engaged) {
    autopilot.holdY = state.y;
    autopilot.holdHeading = state.heading;
    autopilot.cruiseY = state.y;
    autopilot.speed = null;
    autopilot.arrived = false;
  }
  return autopilot.engaged;
}

export function wantsControl(controls = {}) {
  return ['lift', 'pitch', 'roll', 'yaw'].some(key => Math.abs(controls[key] || 0) > AUTOPILOT.takeover);
}

// Returns {commands, events}. commands is null when the pilot is flying.
// hang: metres the load hangs below the skids (cable plus car), kept clear
// of the ground on the way.
// load: the hooked load {vx, vz} when one hangs; the autopilot leans the
// hook toward the load's swing, which damps it.
// ceiling: (x, z) -> the top of the flying area there, or left out for none.
export function autopilotStep(autopilot, state, controls, {ground = null, hang = 0, load = null, ceiling = null, dt = HELI_STEP} = {}) {
  const events = [];
  if (!autopilot.engaged) return {commands: null, events};
  if (wantsControl(controls) || state.crashed || state.onGround && !autopilot.target) {
    autopilot.engaged = false;
    events.push({type: 'autopilotOff', reason: state.crashed ? 'crash' : state.onGround ? 'landed' : 'pilot'});
    return {commands: null, events};
  }
  // Floor: the highest ground or obstacle along the next ten seconds of
  // the path, plus clearance and the hanging load.
  let highest = state.groundY;
  for (const seconds of AUTOPILOT.lookAhead) {
    const x = state.x + state.vx * seconds, z = state.z + state.vz * seconds;
    highest = Math.max(highest, ground ? (ground.highest ? ground.highest(x, z, 6) : ground.height(x, z)) : state.groundY);
  }
  let floor = highest + AUTOPILOT.clearance + hang;
  const target = autopilot.target;
  if (target) {
    // Looked at twice a second, not every step.
    const hoverNow = target.groundY + AUTOPILOT.hoverAbove + hang, away = Math.hypot(target.x - state.x, target.z - state.z);
    let cache = followCache.get(autopilot);
    if (!cache || ++cache.count >= FOLLOW.every) {
      cache = {count: 0, floor: followFloor(state, target, away, hoverNow, hang, ground, ceiling)};
      followCache.set(autopilot, cache);
    }
    if (away > 60) floor = Math.max(floor, cache.floor);
  }
  if (!target) {
    const climb = clamp(0.5 * (Math.max(autopilot.holdY, floor) - state.y), -AUTOPILOT.maxSink, AUTOPILOT.maxClimb);
    const yawRate = clamp(1.5 * wrap(autopilot.holdHeading - state.heading), -AUTOPILOT.turnRate, AUTOPILOT.turnRate);
    return {commands: {pitch: 0, roll: 0, yawRate, climb}, events};
  }

  const dx = target.x - state.x, dz = target.z - state.z, distance = Math.hypot(dx, dz);
  const climbShort = distance > 60 ? floor - state.y : 0;
  const hoverY = target.groundY + AUTOPILOT.hoverAbove + hang;
  autopilot.cruiseY = Math.max(autopilot.cruiseY, hoverY + 30);
  const glide = clamp((distance - 100) / 1400, 0, 1);
  const wantY = Math.max(hoverY + (autopilot.cruiseY - hoverY) * glide, distance > 60 ? floor : hoverY);

  // Wanted ground velocity: cruise speed, easing off so it can stop at the
  // approach point without passing it.
  // The wanted speed builds gently (0.7 m/s2) so a hanging car never gets a
  // sudden jerk; braking follows the stopping curve.
  let limit = Math.min(AUTOPILOT.cruiseSpeed, Math.sqrt(2 * AUTOPILOT.brake * Math.max(0, distance - 1)));
  if (climbShort > 10) limit = Math.min(limit, AUTOPILOT.slowSpeed);
  // A fresh target starts from the speed already made toward it.
  if (!Number.isFinite(autopilot.speed)) autopilot.speed = distance > 1e-6 ? Math.max(0, (state.vx * dx + state.vz * dz) / distance) : 0;
  autopilot.speed = Math.min(limit, autopilot.speed + AUTOPILOT.speedUp * dt);
  const speed = autopilot.speed;
  const wantX = distance > 1e-6 ? dx / distance * speed : 0, wantZ = distance > 1e-6 ? dz / distance * speed : 0;
  const mass = heliMass(state), groundSpeed = Math.hypot(state.vx, state.vz);
  const dragX = HORIZONTAL_DRAG * state.vx * groundSpeed / mass, dragZ = HORIZONTAL_DRAG * state.vz * groundSpeed / mass;
  const swayX = load ? AUTOPILOT.antiSway * (load.vx - state.vx) : 0, swayZ = load ? AUTOPILOT.antiSway * (load.vz - state.vz) : 0;
  const ax = 0.6 * (wantX - state.vx) + dragX + swayX, az = 0.6 * (wantZ - state.vz) + dragZ + swayZ;
  const fwdX = Math.sin(state.heading), fwdZ = Math.cos(state.heading);
  const along = ax * fwdX + az * fwdZ, across = ax * -fwdZ + az * fwdX;
  // Keep the combined tilt within 10 degrees, not each axis alone.
  let pitch = Math.atan2(along, GRAVITY), roll = Math.atan2(across, GRAVITY);
  const tilt = Math.hypot(pitch, roll);
  if (tilt > AUTOPILOT.maxBank) { pitch *= AUTOPILOT.maxBank / tilt; roll *= AUTOPILOT.maxBank / tilt; }

  // Face the way it flies until close, then keep the heading.
  if (distance > 50) autopilot.holdHeading = Math.atan2(dx, dz);
  const yawRate = clamp(1.5 * wrap(autopilot.holdHeading - state.heading), -AUTOPILOT.turnRate, AUTOPILOT.turnRate);
  const climb = clamp(0.5 * (wantY - state.y), -AUTOPILOT.maxSink, AUTOPILOT.maxClimb);

  if (!autopilot.arrived && distance < AUTOPILOT.arriveDistance && groundSpeed < 0.5 && Math.abs(state.y - hoverY) < 1.5) {
    autopilot.arrived = true;
    events.push({type: 'autopilotArrived'});
  }
  return {commands: {pitch, roll, yawRate, climb}, events};
}

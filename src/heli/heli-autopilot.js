// The autopilot (docs/HELICOPTER.md section 3). Off unless switched on (P).
// Switched on it holds height and heading, or flies to a destination's
// approach point at 30 m/s with at most 10 degrees of bank (so a car on the
// cable barely swings) and stops in a hover 20 m above the landing zone.
// Landing and setting down stay with the pilot in H1. Any control beyond
// 30% hands control straight back. Pure: it only turns state into targets.
import {GRAVITY, HORIZONTAL_DRAG, heliMass} from './heli-flight.js';

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
});

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export function createAutopilot() {
  return {engaged: false, holdY: 0, holdHeading: 0, target: null, arrived: false, cruiseY: 0};
}

// target: {x, z, groundY} of the landing zone, or null to just hold.
export function setAutopilotTarget(autopilot, target) {
  const ok = target && [target.x, target.z, target.groundY].every(Number.isFinite);
  autopilot.target = ok ? {x: target.x, z: target.z, groundY: target.groundY} : null;
  autopilot.arrived = false;
}

export function toggleAutopilot(autopilot, state) {
  autopilot.engaged = !autopilot.engaged;
  if (autopilot.engaged) {
    autopilot.holdY = state.y;
    autopilot.holdHeading = state.heading;
    autopilot.cruiseY = state.y;
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
export function autopilotStep(autopilot, state, controls, {ground = null, hang = 0} = {}) {
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
  const floor = highest + AUTOPILOT.clearance + hang;
  const target = autopilot.target;
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
  let speed = Math.min(AUTOPILOT.cruiseSpeed, Math.sqrt(2 * AUTOPILOT.brake * Math.max(0, distance - 1)));
  if (climbShort > 10) speed = Math.min(speed, AUTOPILOT.slowSpeed);
  const wantX = distance > 1e-6 ? dx / distance * speed : 0, wantZ = distance > 1e-6 ? dz / distance * speed : 0;
  const mass = heliMass(state), groundSpeed = Math.hypot(state.vx, state.vz);
  const dragX = HORIZONTAL_DRAG * state.vx * groundSpeed / mass, dragZ = HORIZONTAL_DRAG * state.vz * groundSpeed / mass;
  const ax = 0.6 * (wantX - state.vx) + dragX, az = 0.6 * (wantZ - state.vz) + dragZ;
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

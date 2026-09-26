// Small, deterministic terrain/contact rules shared by every course. Distances
// are metres and angles are radians; no renderer, clock or random source lives
// here. Limits are deliberately generous arcade limits, not a vehicle simulator.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const GRAVITY_MPH_PER_SEC = 9.80665 * 2.2369362921;
const CAPABILITIES = Object.freeze({
  monster: Object.freeze({ maxGrade: 1.65, risePerSec: 10, climbGain: 24, rockHeight: 2.25, tipSpeed: 9 }),
  rally: Object.freeze({ maxGrade: .95, risePerSec: 7, climbGain: 16, rockHeight: 1.15, tipSpeed: 15 }),
});
const TITAN_CLIMB = Object.freeze({ ...CAPABILITIES.monster, climbGain: Infinity, slopeGravityMphPerSec: GRAVITY_MPH_PER_SEC });
export const offroadCapability = (car, { titanClimb = false } = {}) =>
  car?.kind === 'monster' && titanClimb ? TITAN_CLIMB : CAPABILITIES[car?.kind] || null;
export const wrapHeading = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function rockHeight(obstacle) {
  if (obstacle.kind !== 'rock' || obstacle.source?.outcrop) return Infinity;
  const height = obstacle.height ?? obstacle.source?.scale?.[1];
  return Number.isFinite(height) && height > 0 ? height + .1 : Infinity;
}

// Rounded top plus a tire-length approach lets large wheels climb a boulder
// instead of treating its buried lower hemisphere as a vertical wall. A broad,
// very tall outcrop is never silently reclassified as a small rock.
export function rockSupportHeight(obstacle, x, z, capability, wheelReach = .6) {
  const height = rockHeight(obstacle);
  if (!capability || height > capability.rockHeight) return null;
  const c = Math.cos(obstacle.heading || 0), sn = Math.sin(obstacle.heading || 0);
  const dx = x - obstacle.x, dz = z - obstacle.z;
  // A parabola over sqrt(2) times the visible radius encloses the sphere hull
  // (1-r²/2 >= sqrt(1-r²)). It has finite approach slope, unlike a hemisphere's
  // vertical rim, and leaves room for a tire to contact before the body centre.
  const rx = Math.max(.1, obstacle.halfX) * Math.SQRT2 + wheelReach, rz = Math.max(.1, obstacle.halfZ) * Math.SQRT2 + wheelReach;
  const radius = Math.hypot((dx * c - dz * sn) / rx, (dx * sn + dz * c) / rz);
  if (radius >= 1) return null;
  return obstacle.y + height * (1 - radius * radius);
}

// Evaluate actual vertical progress, never throttle time or road-coordinate
// progress. Rise-rate limiting is done by shortening horizontal travel, so the
// body stays on the surface rather than sinking into a hill at a capped Y.
export function limitClimb({ gain, distance, dt, capability, accumulated = 0 }) {
  if (!capability || gain <= 0 || distance < 1e-8) return { fraction: 1, grade: 0, tipped: false };
  const grade = gain / distance;
  return { grade, fraction: Math.min(1, capability.risePerSec * dt / gain),
    tipped: grade > capability.maxGrade || Number.isFinite(capability.climbGain) && accumulated + gain > capability.climbGain };
}

// Gravity along the travelled slope changes speed magnitude. A positive gain
// is uphill and slows the car; a negative gain is downhill and speeds it up.
// Ordinary cars never call this off-road capability rule.
export function slopeSpeedDelta({ gain, distance, dt, capability }) {
  if (!capability || !Number.isFinite(gain) || !Number.isFinite(distance) || distance < 1e-8 || !Number.isFinite(dt) || dt <= 0) return 0;
  const sine = gain / Math.hypot(distance, gain);
  return -(capability.slopeGravityMphPerSec || 0) * sine * dt;
}

export function terrainAttitude(front, rear, left, right, halfLength, halfWidth) {
  return { pitch: Math.atan2(front - rear, 2 * halfLength), roll: Math.atan2(left - right, 2 * halfWidth) };
}

export function tumbleAttitude(elapsed, duration, direction = 1, initialPitch = 0, travelSign = 1) {
  const t = clamp(elapsed / duration, 0, 1), smooth = t * t * (3 - 2 * t);
  return { pitch: initialPitch + travelSign * Math.PI * 2 * smooth, roll: direction * Math.sin(Math.PI * t) * .42,
    lift: Math.sin(Math.PI * t) * .7 };
}

export function canCrushVehicle(playerCar, targetSpec, { speedMph, impactMph, descending = false }) {
  return playerCar?.kind === 'monster' && targetSpec.mass < (playerCar.mass || 4700) * .75
    && (descending || Math.abs(speedMph) >= 7 && impactMph >= 5);
}

export function crushedVehicleSupport(wreck, x, z, wheelReach) {
  const c = Math.cos(wreck.heading), sn = Math.sin(wreck.heading), dx = x - wreck.x, dz = z - wreck.z;
  const lateral = Math.abs(dx * c - dz * sn), along = Math.abs(dx * sn + dz * c);
  const edge = Math.max(lateral - wreck.halfWidth, along - wreck.halfLength, 0);
  if (edge >= wheelReach) return null;
  const t = 1 - edge / wheelReach, blend = t * t * (3 - 2 * t);
  return wreck.y + wreck.height * blend;
}

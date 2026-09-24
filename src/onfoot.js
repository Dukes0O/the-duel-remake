import {sweepObstacle} from './collision.js';

export const FIGHTER_STEP_SECONDS = 1 / 120;
export const FIGHTER_RULES = Object.freeze({
  walkMetersPerSecond: 4.5,
  sprintMetersPerSecond: 7.5,
  jumpMeters: 1.1,
  gravity: 9.8,
  maximumSlopeDegrees: 40,
  carRangeMeters: 150,
  maximumHealth: 100,
  knockdownSeconds: 3,
  carKnockdownKph: 30,
  radius: .34,
  height: 1.7,
  seaLevel: -15,
  arenaLateralLimit: 21.15,
});

const T = FIGHTER_RULES;
const MAX_GRADE = Math.tan(T.maximumSlopeDegrees * Math.PI / 180);
const JUMP_SPEED = Math.sqrt(2 * T.gravity * T.jumpMeters);
const BODY = {halfWidth: T.radius, halfLength: T.radius, height: T.height};
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

function carPoint(course, car) {
  if (!car || !Number.isFinite(car.s) || !Number.isFinite(car.lateral))
    throw new Error('Fighter needs a car with finite course coordinates.');
  return course.groundAt(car.s, car.lateral);
}

function nearbyObstacles(course, fromS, toS) {
  return course.obstaclesNear(fromS, toS);
}

function blockedByScenery(course, from, to, fromS, toS) {
  let earliest = null;
  for (const obstacle of nearbyObstacles(course, fromS, toS)) {
    const hit = sweepObstacle(from, to, obstacle, 0, BODY);
    if (hit && (!earliest || hit.t < earliest.t)) earliest = hit;
  }
  return earliest;
}

function allowedGround(course, point, car, {arena = course.def?.arena === true} = {}) {
  if (point.y <= T.seaLevel) return false;
  if (arena) return Math.abs(point.lateral) <= T.arenaLateralLimit;
  const anchor = carPoint(course, car);
  return Math.hypot(point.x - anchor.x, point.z - anchor.z) <=
    T.carRangeMeters + 1e-8;
}

function besideCar(course, car) {
  // Every candidate is a fixed course-relative position. The first free,
  // dry position wins, so respawn never depends on frame order or randomness.
  for (const [ds, dl] of [[0, 3], [0, -3], [-3, 0], [3, 0],
    [-2.2, 2.2], [-2.2, -2.2], [2.2, 2.2], [2.2, -2.2]]) {
    const s = car.s + ds, lateral = car.lateral + dl;
    const point = course.groundAt(s, lateral);
    const projected = {...point, s, lateral};
    if (!allowedGround(course, projected, car)) continue;
    if (!blockedByScenery(course, point, point, s, s)) return projected;
  }
  // A car can be parked in a dense obstacle field. FOOT-02 can choose a
  // broader safe-reset site; this local fallback still stays by that car.
  const point = carPoint(course, car);
  return {...point, s: car.s, lateral: car.lateral};
}

export function createFighter(course, car, options = {}) {
  const initial = Number.isFinite(options.s) && Number.isFinite(options.lateral)
    ? {...course.groundAt(options.s, options.lateral),
      s: options.s, lateral: options.lateral}
    : besideCar(course, car);
  if (!allowedGround(course, initial, car))
    throw new Error('Fighter must start on dry ground inside the car or arena boundary.');
  if (blockedByScenery(course, initial, initial, initial.s, initial.s))
    throw new Error('Fighter cannot start inside solid scenery.');
  return {
    x: initial.x, y: initial.y, z: initial.z,
    s: initial.s, lateral: initial.lateral, groundY: initial.y,
    yaw: options.yaw ?? initial.heading, pitch: 0,
    airHeight: 0, verticalSpeed: 0, jumpHeld: false,
    health: T.maximumHealth, knockedDown: false, knockdownRemaining: 0,
    respawns: 0, contacts: 0, slopeStops: 0, boundaryStops: 0,
    steps: 0,
  };
}

export function knockdownFighter(fighter) {
  if (fighter.knockedDown) return false;
  fighter.health = 0;
  fighter.knockedDown = true;
  fighter.knockdownRemaining = T.knockdownSeconds;
  fighter.verticalSpeed = 0;
  fighter.airHeight = 0;
  fighter.y = fighter.groundY;
  return true;
}

export function damageFighter(fighter, amount) {
  if (fighter.knockedDown || !Number.isFinite(amount) || amount <= 0) return false;
  fighter.health = Math.max(0, fighter.health - amount);
  if (fighter.health === 0) knockdownFighter(fighter);
  return true;
}

export function strikeFighterWithCar(fighter, speedKph) {
  return Number.isFinite(speedKph) && Math.abs(speedKph) > T.carKnockdownKph
    ? knockdownFighter(fighter) : false;
}

export function respawnFighter(course, car, fighter) {
  const point = besideCar(course, car);
  Object.assign(fighter, {x: point.x, y: point.y, z: point.z,
    s: point.s, lateral: point.lateral, groundY: point.y,
    yaw: point.heading, pitch: 0, airHeight: 0, verticalSpeed: 0,
    jumpHeld: false, health: T.maximumHealth, knockedDown: false,
    knockdownRemaining: 0});
  fighter.respawns++;
  return fighter;
}

function attemptMovement(course, car, fighter, dx, dz, feetY, airborne) {
  if (!dx && !dz) return {moved: false};
  const x = fighter.x + dx, z = fighter.z + dz;
  const nearest = course.nearest(x, z, fighter.s);
  const ground = course.groundAt(nearest.s, nearest.lateral);
  const candidate = {...ground, s: nearest.s, lateral: nearest.lateral};
  if (!allowedGround(course, candidate, car)) {
    fighter.boundaryStops++;
    return {moved: false};
  }
  const distance = Math.hypot(dx, dz);
  if ((!airborne && Math.abs(ground.y - fighter.groundY) / distance > MAX_GRADE) ||
      (airborne && ground.y > feetY + 1e-8)) {
    fighter.slopeStops++;
    return {moved: false};
  }
  const from = {x: fighter.x, y: fighter.y, z: fighter.z};
  const to = {x, y: airborne ? feetY : ground.y, z};
  const hit = blockedByScenery(course, from, to, fighter.s, nearest.s);
  if (hit) {
    fighter.contacts++;
    return {moved: false, hit};
  }
  Object.assign(fighter, {x, z, s: nearest.s, lateral: nearest.lateral,
    groundY: ground.y});
  return {moved: true};
}

export function stepFighter(course, car, fighter, input = {}, dt = FIGHTER_STEP_SECONDS) {
  if (!Number.isFinite(dt) || Math.abs(dt - FIGHTER_STEP_SECONDS) > 1e-10)
    throw new Error('Fighter movement needs the fixed 120 Hz simulation step.');
  fighter.steps++;
  if (fighter.knockedDown) {
    fighter.knockdownRemaining = fighter.knockdownRemaining <= dt + 1e-9
      ? 0 : fighter.knockdownRemaining - dt;
    if (fighter.knockdownRemaining === 0) respawnFighter(course, car, fighter);
    return fighter;
  }

  fighter.yaw += (Number(input.lookX) || 0) * .0022;
  fighter.pitch = clamp(fighter.pitch - (Number(input.lookY) || 0) * .0022,
    -1.25, 1.25);
  if (input.jump && !fighter.jumpHeld && fighter.airHeight === 0)
    fighter.verticalSpeed = JUMP_SPEED;
  fighter.jumpHeld = !!input.jump;

  let airborne = fighter.verticalSpeed !== 0 || fighter.airHeight > 0;
  let feetY = fighter.y;
  if (airborne) {
    feetY += fighter.verticalSpeed * dt;
    fighter.verticalSpeed -= T.gravity * dt;
  }

  const forward = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  const right = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const length = Math.hypot(forward, right);
  if (length) {
    const distance = (input.sprint ? T.sprintMetersPerSecond :
      T.walkMetersPerSecond) * dt / length;
    const dx = (Math.sin(fighter.yaw) * forward +
      Math.cos(fighter.yaw) * right) * distance;
    const dz = (Math.cos(fighter.yaw) * forward -
      Math.sin(fighter.yaw) * right) * distance;
    const result = attemptMovement(course, car, fighter, dx, dz, feetY, airborne);
    if (result.hit) {
      const into = dx * result.hit.nx + dz * result.hit.nz;
      if (into < 0) attemptMovement(course, car, fighter,
        dx - into * result.hit.nx, dz - into * result.hit.nz, feetY, airborne);
    }
  }

  if (airborne && feetY > fighter.groundY) {
    fighter.y = feetY;
    fighter.airHeight = feetY - fighter.groundY;
  } else {
    fighter.y = fighter.groundY;
    fighter.airHeight = 0;
    fighter.verticalSpeed = 0;
  }
  return fighter;
}

// BOWL-CAMERA: the show camera in the Bowl (docs/board/cards/BOWL-SHOW-2.md, section 5). Kyle, 20 November 2026: "the
// camera changes angle in jerks during events". The chase camera stood behind the truck along the line of the lap, so it
// jumped whenever the truck's place on the lap jumped (at the end of the Spine, or turning round).
//
// This camera stands behind the truck along the way the truck is travelling, read from where the truck has been over the
// last moments, not from the lap and not from its nose. It is a function from the truck's recent path to a camera pose,
// with no graphics in it: the renderer calls stepBowlCamera once a frame and draws from the pose. Nothing here reads or
// writes race state; the camera keeps its own memory in the object createBowlCamera returns.
//
// The rules, from the design page:
// - it turns at no more than 120 degrees a second, and every change of speed of turn is eased (a whole turn rate is
//   reached in no less than 0.4 seconds), so it never cuts;
// - it ignores a change of travel smaller than 8 degrees, and once it starts turning it follows until it is level again;
// - it holds its angle while the truck goes under 5 mph, while it circles slowly (a donut, under 15 mph), and while it
//   backs up (a turn round on the spot), so a spinning truck turns in front of a still camera;
// - in the air it draws back and up with the truck's height, and it never tips with a flip (it never reads the truck's
//   roll or pitch);
// - when a wall, the catch fence, the Spine or the stands come between it and the truck it rises over them, and it
//   follows the truck into the stands and outside;
// - when an event ends it swings a quarter of the way round the truck over two seconds;
// - a jump of the truck that no driving makes (a wall's push threw it 3.5 m in one step on 20 November) is taken up and
//   eased out, so the camera does not jump with it.
//
// Settled by Claude while building (20 November 2026): the design page's "8.7 m behind" is the car chase distance. The
// Titan's own chase camera stood 12 m behind and 5.8 m up, and Kyle's complaint was the jerks, not the distance, so the
// show camera keeps the Titan's 12 m and adds the design's 5.3 m in the air (17.3 m at 10 m up).
import {BOWL_FLOOR, BOWL_STADIUM, bowlBankHeight} from './bowl-course.js';
import {BOWL_STAND} from './bowl-stadium.js';
import {rexSolids} from './bowl-hook.js';
import {sweepObstacle} from '../collision.js';

export const BOWL_CAMERA = Object.freeze({
  // On the ground, and at the full height in the air (airFullMetres up and above).
  backMetres: 12, airBackMetres: 17.3, upMetres: 5.8, airUpMetres: 8, airFullMetres: 10,
  // The 'wide' camera mode stands this much further back and up.
  wideScale: 16 / 12,
  // What it looks at: a point this far up on the truck, and this far ahead of the truck when the camera is not lifted.
  aimUpMetres: 1.65, aheadMetres: 14,
  maxTurnDegPerSec: 120, easeSec: .4, ignoreDeg: 8, levelDeg: 1,
  holdMph: 5, circleMph: 15, reverseDeg: 100,
  // The way the truck is travelling is the line from where it was pathSec ago to where it is. It circles (a donut) when,
  // under circleMph, that way has turned by more than circleDeg in the last circleSec: the Titan's tightest circle at
  // 11 mph is 7 m across from its middle, which turns it 61 degrees in 1.5 s; round an end of the Bowl on its centre
  // line it turns 20 degrees in that time.
  pathSec: .3, circleSec: 1.5, circleDeg: 45,
  // Heights are eased (critically damped): the truck's height, the share of the air reached, the lift over a wall.
  heightSec: .12, airSec: .25, liftRiseSec: .15, liftFallSec: .4, liftMarginMetres: .8, maxLiftMetres: 30,
  // The lift never rises or falls faster than this, so a sudden wall never throws the camera up (0.4 m a frame at 60).
  maxLiftMetresPerSec: 24,
  // When the lifted camera looks down on the truck instead of ahead: fully from this lift.
  lookDownLiftMetres: 4,
  // A move further than this in one frame is a new start (an event loaded), not driving.
  teleportMetres: 6,
  // A jump of the truck under that, which no driving makes (a wall's push), is taken up and eased out over about half a
  // second, so the camera never jumps with it: any step this much longer than the truck's way of travel gives.
  jumpMetres: .5, jumpSec: .15,
  endSwingDeg: 90, endSwingSec: 2,
});

const C = BOWL_CAMERA, DEG = Math.PI / 180, MPH = .44704;
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// A critically damped ease towards `target`, as {value, rate}; it settles in about four times `seconds`.
export function easeTowards(value, rate, target, seconds, dt) {
  if (!(dt > 0)) return {value, rate};
  const omega = 2 / Math.max(1e-4, seconds), x = omega * dt, decay = 1 / (1 + x + .48 * x * x + .235 * x * x * x);
  const change = value - target, temp = (rate + omega * change) * dt;
  return {value: target + (change + temp) * decay, rate: (rate - omega * temp) * decay};
}

export function createBowlCamera() {
  return {key: null, time: 0, path: [], yaw: 0, turnRate: 0, turning: false, y: 0, yRate: 0, air: 0, airRate: 0, dropOffset: 0, dropRate: 0,
    lift: 0, liftRate: 0, end: null, rexFallYaw: null, holding: null, frame: null, raw: null,
    shiftX: 0, shiftZ: 0, shiftRateX: 0, shiftRateZ: 0};
}

// How the truck is moving, from its path: {yaw, mph, hold}. `hold` names why the camera keeps its angle, or is null.
export function bowlTravel(path, time, noseHeading) {
  const now = path.at(-1);
  const since = seconds => {
    let from = path[0];
    for (const point of path) { if (point.t <= time - seconds) from = point; else break; }
    return from;
  };
  const from = since(C.pathSec), elapsed = now.t - from.t;
  if (elapsed < C.pathSec * .5) return {yaw: null, mph: 0, hold: 'still'};
  const dx = now.x - from.x, dz = now.z - from.z, mph = Math.hypot(dx, dz) / elapsed / MPH;
  if (mph < C.holdMph) return {yaw: null, mph, hold: 'still'};
  const yaw = Math.atan2(dx, dz);
  // A donut: the way of travel has turned tightly while the truck was slow (the way now against the way circleSec ago).
  const long = since(C.circleSec + C.pathSec), then = since(C.circleSec);
  if (mph < C.circleMph && then.t - long.t >= C.pathSec * .5 && Math.hypot(then.x - long.x, then.z - long.z) > .05 &&
      Math.abs(wrap(yaw - Math.atan2(then.x - long.x, then.z - long.z))) > C.circleDeg * DEG) return {yaw, mph, hold: 'circling'};
  // Backing up, as in a turn round on the spot (the Titan backs up at up to 22 mph).
  if (Number.isFinite(noseHeading) && Math.abs(wrap(yaw - noseHeading)) > C.reverseDeg * DEG)
    return {yaw, mph, hold: 'reversing'};
  return {yaw, mph, hold: null};
}

// How far the camera must rise so that the line from it to `body` clears every solid by the margin. `solidTop(x, z)` is
// the height of the top of whatever stands at a point (the floor, a wall, the stands), or null where nothing does.
export function bowlLiftFor(camera, body, solidTop) {
  let lift = 0;
  for (let step = 0; step <= 12; step++) {
    const share = step * .075, x = camera.x + (body.x - camera.x) * share, z = camera.z + (body.z - camera.z) * share;
    const top = solidTop(x, z);
    if (!Number.isFinite(top)) continue;
    const need = top + C.liftMarginMetres - (camera.y + (body.y - camera.y) * share);
    if (need > 0) lift = Math.max(lift, need / (1 - share));
  }
  return Math.min(C.maxLiftMetres, lift);
}

const STAND = BOWL_STAND, SPINE_EDGE = -(BOWL_FLOOR.wallOffset - .5);
const TUNNEL_FRONT = STAND.face + STAND.first + STAND.cutRows * STAND.depth;
const TUNNEL_BACK = STAND.face + STAND.outer;
const CROWD = 1.2;

function nearGate(course, near, pad = 0) {
  const outside = course.features.bowl.outside, phase = course.phase(near.s);
  return outside.gates.find(gate => Math.abs(phase - gate.s) <= gate.mouthWidth / 2 + pad);
}

function guideHalfWidth(outside, gate, lateral) {
  const throatEnd = outside.back - (gate.mouthWidth - gate.width) / 2;
  const reach = gate.guideLength / Math.SQRT2;
  return gate.width / 2 + Math.max(0, Math.min(reach, lateral - throatEnd));
}

function solidTopAt(course, near, gate) {
  const {lateral} = near;
  if (lateral <= SPINE_EDGE && lateral > SPINE_EDGE - 2.5) return BOWL_STADIUM.spineHeight;
  const d = lateral - STAND.face;
  if (d >= 0 && d <= STAND.outer) {
    const throughFront = gate && lateral < TUNNEL_FRONT && Math.abs(course.phase(near.s) - gate.s) < gate.width / 2;
    if (throughFront) return course.groundAt(near.s, lateral).y;
    if (d <= 1) return BOWL_STADIUM.fenceHeight + bowlBankHeight(course.phase(near.s), STAND.face);
    if (d < STAND.first) return STAND.low;
    if (d < STAND.back) return STAND.rowY(Math.floor((d - STAND.first) / STAND.depth)) + CROWD;
    return STAND.top;
  }
  return course.groundAt(near.s, lateral).y;
}

// Highest surface for the regular chase lift. The gate chase instead tests
// the actual air under the lintel, where the surface above the camera is a roof.
export function bowlSolidTop(course, x, z, referenceS) {
  const near = course.nearest(x, z, referenceS);
  return solidTopAt(course, near, nearGate(course, near));
}

export function bowlCameraObstructed(course, point, referenceS) {
  const near = course.nearest(point.x, point.z, referenceS), {lateral} = near;
  const outside = course.features.bowl.outside;
  const gate = nearGate(course, near, 5);
  if (!gate || lateral < STAND.face - .1 || lateral > outside.back + gate.guideLength)
    return point.y < solidTopAt(course, near, gate);
  const across = Math.abs(course.phase(near.s) - gate.s), half = guideHalfWidth(outside, gate, lateral);
  const throat = gate.width / 2, mouth = gate.mouthWidth / 2;
  const floorArch = Math.abs(lateral - STAND.face - .5) <= .3;
  const parkArch = lateral >= TUNNEL_BACK && lateral <= TUNNEL_BACK + .7;
  if (floorArch && point.y <= 7.4 &&
      (Math.abs(across - throat - .3) <= .25 || point.y >= 6.7 && across <= throat + .9)) return true;
  if (parkArch && point.y <= STAND.lintel + 1.3 &&
      (Math.abs(across - mouth - .4) <= .4 || point.y >= STAND.lintel && across <= mouth + .8)) return true;
  if (lateral <= TUNNEL_BACK + .7) {
    if (across < (parkArch ? mouth : half)) {
      if (point.y < .04) return true;
      if (lateral >= TUNNEL_FRONT - .5 && point.y < STAND.lintel - .35) return false;
      if (lateral < TUNNEL_FRONT - .5 && point.y < 6.7) return false;
      if (lateral > TUNNEL_BACK) return point.y < STAND.lintel + 1.3;
    }
  } else if (lateral <= outside.back - (gate.mouthWidth - gate.width) / 2 + gate.guideLength / Math.SQRT2 &&
      point.y < 2.2 && Math.abs(across - half - .2) < .3) {
    return true;
  }
  return point.y < solidTopAt(course, near, gate);
}

function gateChaseShare(course, truck, referenceS) {
  if (!course || truck.y > 2.5) return 0;
  const near = course.nearest(truck.x, truck.z, referenceS);
  const gate = nearGate(course, near, 8);
  if (!gate) return 0;
  const outside = course.features.bowl.outside;
  const across = Math.abs(course.phase(near.s) - gate.s);
  const width = smooth((gate.mouthWidth / 2 + 8 - across) / 5);
  // Hold the low view far enough onto the floor for the Wide camera behind
  // the truck to clear the arch before it climbs away from the gate.
  const floor = smooth((near.lateral - outside.wall + 26) / 15);
  const park = smooth((outside.back + 23 - near.lateral) / 14);
  const inPassage = near.lateral >= STAND.face - .1 && near.lateral <= TUNNEL_BACK + .7 &&
    across < guideHalfWidth(outside, gate, near.lateral) + .25;
  const crossing = Math.abs(Math.sin(truck.heading - course.at(near.s).heading));
  const approach = inPassage ? 1 : smooth((crossing - .25) / .4);
  return width * floor * park * approach * (1 - smooth((truck.y - .5) / 2));
}

// Bring the chase point toward the truck if a jamb or the lintel crosses the
// ray. Moving along that ray keeps the existing eased camera angle.
function clearGateChase(course, position, body, referenceS) {
  const span = {x: position.x - body.x, y: position.y - body.y, z: position.z - body.z};
  const steps = Math.max(1, Math.ceil(Math.hypot(span.x, span.y, span.z) / .23));
  const at = share => ({x: body.x + share * span.x, y: body.y + share * span.y, z: body.z + share * span.z});
  for (let step = 1; step <= steps; step++) {
    if (bowlCameraObstructed(course, at(step / steps), referenceS)) return at((step - 1) / steps);
  }
  return position;
}

// The camera frames the falling body's actual bounds, including head and tail.
export function bowlRexFallFrame(course, fight) {
  if (fight?.phase !== 'fallen') return null;
  const parts = rexSolids(fight, course), corners = [];
  for (const part of parts) {
    const sin = Math.sin(part.heading), cos = Math.cos(part.heading);
    for (const across of [-part.halfX, part.halfX]) for (const along of [-part.halfZ, part.halfZ]) {
      const x = part.x + across * cos + along * sin;
      const z = part.z - across * sin + along * cos;
      corners.push({x, y: part.minY, z}, {x, y: part.maxY, z});
    }
  }
  const midpoint = axis => {
    const coordinates = corners.map(point => point[axis]);
    return (Math.min(...coordinates) + Math.max(...coordinates)) / 2;
  };
  const rail = course.worldAt(fight.s, fight.places.rail), inside = course.worldAt(fight.s, 0);
  const inwardView = Math.atan2(rail.x - inside.x, rail.z - inside.z);
  const wall = course.features.bowl.outside.wall;
  const inStadium = point => course.nearest(point.x, point.z, fight.s).lateral <= wall;
  return {x: midpoint('x'), y: midpoint('y'), z: midpoint('z'), parts, corners, inwardView, inStadium};
}

const REX_CAMERA_RAY = Object.freeze({halfWidth: 0, halfLength: 0, height: 0});

function rexShot(body, rex, yaw, solidTop, aspect, fov) {
  const pitch = .10, sin = Math.sin(yaw), cos = Math.cos(yaw);
  const tanY = Math.tan(fov * DEG / 2), tanX = tanY * aspect;
  const target = {x: rex.x, y: rex.y, z: rex.z};
  const points = body ? rex.corners.concat([
    {x: body.x - cos * 2.4, y: body.y - 1.4, z: body.z + sin * 2.4},
    {x: body.x + cos * 2.4, y: body.y - 1.4, z: body.z - sin * 2.4},
    {x: body.x - cos * 2.4, y: body.y + 1.5, z: body.z + sin * 2.4},
    {x: body.x + cos * 2.4, y: body.y + 1.5, z: body.z - sin * 2.4},
  ]) : rex.corners;
  const across = points.map(point => (point.x - target.x) * cos - (point.z - target.z) * sin);
  const centre = (Math.min(...across) + Math.max(...across)) / 2;
  target.x += centre * cos;
  target.z -= centre * sin;
  // Solve for the closest distance that fits the projected corners with a margin.
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  let distance = 7;
  for (const point of points) {
    const x = point.x - target.x, y = point.y - target.y, z = point.z - target.z;
    const along = x * sin + z * cos, depth = along * cp - y * sp;
    const required = Math.max(.2, Math.abs(x * cos - z * sin) / (.93 * tanX),
      Math.abs(y * cp + along * sp) / (.90 * tanY));
    distance = Math.max(distance, required - depth);
  }
  const position = {x: target.x - sin * cp * distance, y: target.y + sp * distance,
    z: target.z - cos * cp * distance};
  const lift = solidTop ? Math.max(bowlLiftFor(position, rex, solidTop), body ? bowlLiftFor(position, body, solidTop) : 0) : 0;
  position.y += lift;
  // Check the actual projected bounds after clearance changes the pitch.
  const run = Math.hypot(target.x - position.x, target.z - position.z);
  const angle = Math.atan2(position.y - target.y, run);
  const viewCos = Math.cos(angle), viewSin = Math.sin(angle);
  let minY = Infinity, maxY = -Infinity, fits = true;
  for (const [index, point] of points.entries()) {
    const x = point.x - position.x, y = point.y - position.y, z = point.z - position.z;
    const along = x * sin + z * cos, depth = along * viewCos - y * viewSin;
    const px = (x * cos - z * sin) / (depth * tanX);
    const py = (y * viewCos + along * viewSin) / (depth * tanY);
    fits &&= depth > 0 && Math.abs(px) < .99 && Math.abs(py) < .99;
    if (index < rex.corners.length) {
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  const heightShare = (maxY - minY) / 2;
  const distanceFromRex = Math.hypot(position.x - rex.x, position.y - rex.y, position.z - rex.z);
  if (fits && body && rex.parts.some(part => sweepObstacle(position, body, part, 0, REX_CAMERA_RAY))) fits = false;
  return {position, target, yaw, lift, hold: 'rexFall', fits: fits && rex.inStadium(position), heightShare, distanceFromRex};
}

function frameRexFall(cam, body, rex, solidTop, aspect, verticalFov) {
  const canUse = shot => shot.fits && shot.heightShare >= 1 / 3 && shot.distanceFromRex <= 45;
  const yaw = cam.rexFallYaw ?? rex.inwardView;
  const paired = rexShot(body, rex, yaw, solidTop, aspect, verticalFov);
  if (canUse(paired)) {
    cam.rexFallYaw = yaw;
    return paired;
  }
  const offsets = [0, .35, -.35, .7, -.7];
  // A narrow viewport needs a more oblique view to fit the head and tail up close.
  if (aspect < 1.2) offsets.push(.95, -.95, 1.15, -1.15, 1.32, -1.32, 1.48, -1.48);
  const alternatives = offsets.map(offset => wrap(rex.inwardView + offset))
    .filter(angle => Math.abs(wrap(angle - yaw)) > 1e-6)
    .sort((a, b) => Math.abs(wrap(a - yaw)) - Math.abs(wrap(b - yaw)));
  for (const angle of alternatives) {
    const both = rexShot(body, rex, angle, solidTop, aspect, verticalFov);
    if (canUse(both)) {
      cam.rexFallYaw = angle;
      return both;
    }
  }
  // A driver who leaves the shot should never pull the view outside the stadium.
  const close = rexShot(null, rex, yaw, solidTop, aspect, verticalFov);
  if (canUse(close)) return close;
  for (const angle of alternatives) {
    const alternate = rexShot(null, rex, angle, solidTop, aspect, verticalFov);
    if (canUse(alternate)) return alternate;
  }
  return close;
}

// One frame of the show camera. `truck` is {key, x, y, z, air, heading}: `key` names the go (bowlCameraKey; a new key
// starts the camera afresh), y is the truck's height with its height in the air, air that height in the air alone, and
// heading the way its nose points (used only to tell when it backs up). Options: `ended` once the event is over, `wide`
// for the wide camera mode, `solidTop(x, z)` for the walls (bowlSolidTop), and `frame`, the renderer's count of frames:
// when a frame was drawn by another camera (the hood or back view, a menu) the camera starts afresh, since its memory
// of the path is old. Returns {position, target, yaw, lift, hold}.
export function stepBowlCamera(cam, truck, dt, {ended = false, wide = false, solidTop = null, frame = null,
  gateCourse = null, referenceS = null, rexFall = null, aspect = 16 / 9, verticalFov = 55} = {}) {
  dt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, .1) : 0;
  const raw = cam.raw, skipped = frame != null && cam.frame != null && frame !== cam.frame + 1;
  const fresh = skipped || cam.key !== truck.key || !raw || Math.hypot(truck.x - raw.x, truck.z - raw.z) > C.teleportMetres;
  if (fresh) Object.assign(cam, createBowlCamera(), {key: truck.key, yaw: truck.heading, y: truck.y, air: truck.air});
  cam.frame = frame;
  if (!fresh && dt > 0 && cam.path.length > 1) {
    const now = cam.path.at(-1), from = cam.path.find(point => point.t >= now.t - C.pathSec) ?? now, span = now.t - from.t;
    const vx = span > 0 ? (now.x - from.x) / span : 0, vz = span > 0 ? (now.z - from.z) / span : 0;
    const ex = truck.x - raw.x - vx * dt, ez = truck.z - raw.z - vz * dt;
    if (Math.hypot(ex, ez) > C.jumpMetres) { cam.shiftX -= ex; cam.shiftZ -= ez; }
  }
  ({value: cam.shiftX, rate: cam.shiftRateX} = easeTowards(cam.shiftX, cam.shiftRateX, 0, C.jumpSec, dt));
  ({value: cam.shiftZ, rate: cam.shiftRateZ} = easeTowards(cam.shiftZ, cam.shiftRateZ, 0, C.jumpSec, dt));
  // At the last terrace the ground falls away in one frame. The truck stays
  // on a continuous arc, so ease that sudden extra clearance into the air view.
  const air = Math.max(0, truck.air || 0), ground = truck.y - air;
  if (!fresh && dt > 0 && air > 0 && raw.ground - ground > C.airFullMetres) cam.dropOffset = C.airFullMetres;
  if (air <= 0) { cam.dropOffset = 0; cam.dropRate = 0; }
  else if (cam.dropOffset > 0) {
    ({value: cam.dropOffset, rate: cam.dropRate} = easeTowards(cam.dropOffset, cam.dropRate, 0, C.jumpSec, dt));
  }
  cam.raw = {x: truck.x, z: truck.z, ground};
  // Where the camera follows: the truck, less any jump still being eased out.
  const spot = {x: truck.x + cam.shiftX, z: truck.z + cam.shiftZ};
  cam.time += dt;
  if (fresh || dt > 0) cam.path.push({t: cam.time, x: spot.x, z: spot.z});
  while (cam.path.length > 2 && cam.path[1].t <= cam.time - C.circleSec - C.pathSec) cam.path.shift();

  // The angle: turn towards the way of travel, never faster than the limit, easing every change of turn rate.
  const travel = bowlTravel(cam.path, cam.time, truck.heading);
  cam.holding = ended ? 'ended' : travel.hold;
  const follow = !ended && !travel.hold && travel.yaw != null;
  const error = follow ? wrap(travel.yaw - cam.yaw) : 0;
  if (!follow) cam.turning = false;
  else if (!cam.turning && Math.abs(error) > C.ignoreDeg * DEG) cam.turning = true;
  else if (cam.turning && Math.abs(error) < C.levelDeg * DEG && Math.abs(cam.turnRate) < 10 * DEG) cam.turning = false;
  const maxRate = C.maxTurnDegPerSec * DEG, accel = maxRate / C.easeSec;
  // The rate that would bring the camera level just as it stops turning, so it never swings past.
  const wanted = cam.turning ? Math.sign(error) * Math.min(maxRate, Math.sqrt(2 * accel * Math.abs(error)) * .9) : 0;
  const change = Math.max(-accel * dt, Math.min(accel * dt, wanted - cam.turnRate));
  cam.turnRate = Math.max(-maxRate, Math.min(maxRate, cam.turnRate + change));
  cam.yaw = wrap(cam.yaw + cam.turnRate * dt);

  // Height and the draw back in the air.
  ({value: cam.y, rate: cam.yRate} = easeTowards(cam.y, cam.yRate, truck.y, C.heightSec, dt));
  const airTarget = cam.dropOffset > 0 ? Math.max(0, Math.min(air, C.airFullMetres) - cam.dropOffset) : air;
  ({value: cam.air, rate: cam.airRate} = easeTowards(cam.air, cam.airRate, airTarget, C.airSec, dt));
  const share = clamp01(cam.air / C.airFullMetres), scale = wide ? C.wideScale : 1;
  const back = (C.backMetres + (C.airBackMetres - C.backMetres) * share) * scale;
  const up = (C.upMetres + (C.airUpMetres - C.upMetres) * share) * scale;

  // The end of an event: a quarter of the way round the truck, to the side with less in the way.
  if (ended && !cam.end) {
    let side = 1;
    if (solidTop) {
      const at = turn => { const yaw = cam.yaw + turn * C.endSwingDeg * DEG;
        return bowlLiftFor({x: spot.x - Math.sin(yaw) * back, y: cam.y + up, z: spot.z - Math.cos(yaw) * back},
          {x: spot.x, y: truck.y + C.aimUpMetres, z: spot.z}, solidTop); };
      if (at(-1) < at(1) - .25) side = -1;
    }
    cam.end = {elapsed: 0, side};
  }
  if (!ended) cam.end = null;
  if (cam.end) cam.end.elapsed += dt;
  const yaw = cam.yaw + (cam.end ? cam.end.side * C.endSwingDeg * DEG * smooth(cam.end.elapsed / C.endSwingSec) : 0);

  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const gateShare = gateChaseShare(gateCourse, truck, referenceS);
  const distance = back * (1 - .49 * gateShare);
  let position = {x: spot.x - sin * distance, y: cam.y + up + (3.2 - up) * gateShare,
    z: spot.z - cos * distance};
  const body = {x: spot.x, y: truck.y + C.aimUpMetres, z: spot.z};
  // A truck inside the stands (they have no height for a truck yet) cannot be seen: the camera rises to see the place
  // above it instead of climbing for a sightline that no height gives.
  const over = solidTop ? solidTop(truck.x, truck.z) : null;
  const sight = Number.isFinite(over) && over > truck.y + .5 ? {...body, y: over + C.aimUpMetres} : body;
  const required = solidTop && gateShare < 1 ? (1 - gateShare) * bowlLiftFor(position, sight, solidTop) : 0;
  if (fresh) { cam.lift = required; cam.liftRate = 0; }
  else {
    const before = cam.lift;
    ({value: cam.lift, rate: cam.liftRate} = easeTowards(cam.lift, cam.liftRate, required,
      required > cam.lift ? C.liftRiseSec : C.liftFallSec, dt));
    const most = C.maxLiftMetresPerSec * dt;
    if (Math.abs(cam.lift - before) > most) {
      cam.lift = before + Math.sign(cam.lift - before) * most;
      cam.liftRate = Math.sign(cam.liftRate) * Math.min(Math.abs(cam.liftRate), C.maxLiftMetresPerSec);
    }
  }
  if (cam.lift < 1e-3 && required === 0) { cam.lift = 0; cam.liftRate = 0; }
  position.y += cam.lift * (1 - gateShare);
  if (gateShare > 0) position = clearGateChase(gateCourse, position, body, referenceS);
  const ahead = C.aheadMetres * (1 - clamp01(cam.lift / C.lookDownLiftMetres)) * (1 - .75 * gateShare);
  const target = {x: body.x + sin * ahead, y: body.y, z: body.z + cos * ahead};
  if (rexFall) return frameRexFall(cam, {x: truck.x, y: truck.y + C.aimUpMetres, z: truck.z},
    rexFall, solidTop, aspect, verticalFov);
  cam.rexFallYaw = null;
  return {position, target, yaw, lift: cam.lift, hold: cam.holding};
}

// Which go the truck is in, so that a new go starts the camera afresh: the night makes a new event object every time an
// event is loaded (a new event, a try again, a restart from the pause screen, a Turn Show go), and keeps it to the result.
export const bowlCameraKey = state => state?.bowlNight?.event ?? null;

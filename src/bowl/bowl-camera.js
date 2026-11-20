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
  return {key: null, time: 0, path: [], yaw: 0, turnRate: 0, turning: false, y: 0, yRate: 0, air: 0, airRate: 0,
    lift: 0, liftRate: 0, end: null, holding: null, frame: null, raw: null, shiftX: 0, shiftZ: 0, shiftRateX: 0, shiftRateZ: 0};
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

// The steps of the stands, from bowl-stadium.js's own sizes (the wall's face, its walkway and its rows).
const FACE = BOWL_FLOOR.outerWallOffset - .5;
const PODIUM = 6.2, MOAT = 1.2, FIRST = 1 + MOAT + 2;
const STANDS_BACK = FIRST + BOWL_STADIUM.rows * BOWL_STADIUM.rowDepth;
const STANDS_TOP = PODIUM + BOWL_STADIUM.rows * BOWL_STADIUM.rowRise + 1.1;
const SPINE_EDGE = -(BOWL_FLOOR.wallOffset - .5);

// The top of what stands at a point in the Bowl: the floor and its jumps and banks, the Spine, the stand wall with its
// catch fence, the stands' rows, and the ground outside. `course` is the Bowl course (nearest, groundAt, phase).
export function bowlSolidTop(course, x, z, referenceS) {
  const near = course.nearest(x, z, referenceS), lateral = near.lateral;
  if (lateral <= SPINE_EDGE && lateral > SPINE_EDGE - 2.5) return BOWL_STADIUM.spineHeight;
  if (lateral >= FACE) {
    const d = lateral - FACE;
    if (d <= 1) return BOWL_STADIUM.wallHeight + bowlBankHeight(course.phase(near.s), FACE) +
      BOWL_STADIUM.fenceHeight - BOWL_STADIUM.wallHeight;
    if (d < 1 + MOAT) return 0;
    if (d < FIRST) return PODIUM;
    if (d < STANDS_BACK) return PODIUM + (Math.floor((d - FIRST) / BOWL_STADIUM.rowDepth) + 1) * BOWL_STADIUM.rowRise;
    if (d <= STANDS_BACK + .4) return STANDS_TOP;
  }
  return course.groundAt(near.s, lateral).y;
}

// One frame of the show camera. `truck` is {key, x, y, z, air, heading}: `key` names the go (bowlCameraKey; a new key
// starts the camera afresh), y is the truck's height with its height in the air, air that height in the air alone, and
// heading the way its nose points (used only to tell when it backs up). Options: `ended` once the event is over, `wide`
// for the wide camera mode, `solidTop(x, z)` for the walls (bowlSolidTop), and `frame`, the renderer's count of frames:
// when a frame was drawn by another camera (the hood or back view, a menu) the camera starts afresh, since its memory
// of the path is old. Returns {position, target, yaw, lift, hold}.
export function stepBowlCamera(cam, truck, dt, {ended = false, wide = false, solidTop = null, frame = null} = {}) {
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
  cam.raw = {x: truck.x, z: truck.z};
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
  ({value: cam.air, rate: cam.airRate} = easeTowards(cam.air, cam.airRate, Math.max(0, truck.air || 0), C.airSec, dt));
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
  const position = {x: spot.x - sin * back, y: cam.y + up, z: spot.z - cos * back};
  const body = {x: spot.x, y: truck.y + C.aimUpMetres, z: spot.z};
  // A truck inside the stands (they have no height for a truck yet) cannot be seen: the camera rises to see the place
  // above it instead of climbing for a sightline that no height gives.
  const over = solidTop ? solidTop(truck.x, truck.z) : null;
  const sight = Number.isFinite(over) && over > truck.y + .5 ? {...body, y: over + C.aimUpMetres} : body;
  const required = solidTop ? bowlLiftFor(position, sight, solidTop) : 0;
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
  position.y += cam.lift;
  const ahead = C.aheadMetres * (1 - clamp01(cam.lift / C.lookDownLiftMetres));
  const target = {x: body.x + sin * ahead, y: body.y, z: body.z + cos * ahead};
  return {position, target, yaw, lift: cam.lift, hold: cam.holding};
}

// Which go the truck is in, so that a new go starts the camera afresh: the night makes a new event object every time an
// event is loaded (a new event, a try again, a restart from the pause screen, a Turn Show go), and keeps it to the result.
export const bowlCameraKey = state => state?.bowlNight?.event ?? null;

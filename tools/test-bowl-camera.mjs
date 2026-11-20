// BOWL-CAMERA: the Bowl's show camera, headless (docs/board/cards/BOWL-CAMERA.md). Each drive is driven in the real game
// (src/game.js, a Show Night with the titan-bowl switch on, memory only) and the camera is stepped at 60 frames a second
// from where the truck is, as the renderer steps it. Over every drive the camera never turns faster than 120 degrees a
// second, never moves more than 1.5 m between two frames, and always has the truck within the middle half of the picture.
// Run: node tools/test-bowl-camera.mjs
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {bowlCentre} from '../src/bowl/bowl-course.js';
import {BOWL_CAMERA, bowlCameraKey, bowlSolidTop, createBowlCamera, stepBowlCamera} from '../src/bowl/bowl-camera.js';

const SIM_DT = 1 / 120, FRAME = 1 / 60, DEG = Math.PI / 180;
// The narrowest picture the renderer draws in the Bowl (a 55 degree view, as wide as a 16:9 screen).
const FOV = 55 * DEG, ASPECT = 16 / 9;
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

// Night 1, event `eventIndex` (0 Car Crush, 1 Freestyle).
function showDuel(eventIndex) {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  duel.startBowlNight({night: 1});
  if (eventIndex) {
    Object.assign(duel.state.bowlNight, {show: {night: 1, eventIndex, complete: false}, phase: 'result'});
    duel.continueBowlNight();
  }
  return duel;
}

const truckOf = duel => {
  const s = duel.state, p = duel.course.groundAt(s.s, s.lateral), air = s.airHeight || 0;
  return {key: bowlCameraKey(s), x: p.x, y: (Number.isFinite(s.groundHeight) ? s.groundHeight : p.y) + air, z: p.z, air,
    heading: p.heading + (s.headingError || 0), s: s.s, lateral: s.lateral, mph: s.speedMph};
};

// Where a point falls in the picture of a camera at `position` looking at `target`, as -1..1 across and up.
function project(position, target, point) {
  const f = {x: target.x - position.x, y: target.y - position.y, z: target.z - position.z};
  const fl = Math.hypot(f.x, f.y, f.z); f.x /= fl; f.y /= fl; f.z /= fl;
  // Right is forward x up, up is right x forward (world up is +y).
  let r = {x: -f.z, y: 0, z: f.x}; const rl = Math.hypot(r.x, r.z); r = {x: r.x / rl, y: 0, z: r.z / rl};
  const u = {x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x};
  const d = {x: point.x - position.x, y: point.y - position.y, z: point.z - position.z};
  const depth = d.x * f.x + d.y * f.y + d.z * f.z, tan = Math.tan(FOV / 2);
  return {x: (d.x * r.x + d.y * r.y + d.z * r.z) / depth / (tan * ASPECT), y: (d.x * u.x + d.y * u.y + d.z * u.z) / depth / tan, depth};
}

// A sightline from the camera to the truck's middle is blocked when a solid stands above it, short of the truck itself.
function blocked(duel, pose, body) {
  for (let step = 1; step <= 11; step++) {
    const share = step / 13, x = pose.position.x + (body.x - pose.position.x) * share, z = pose.position.z + (body.z - pose.position.z) * share;
    if (bowlSolidTop(duel.course, x, z, duel.state.s) > pose.position.y + (body.y - pose.position.y) * share) return true;
  }
  return false;
}

// Drives a script: `input(duel, time, truck)` gives the controls for each step after the countdown, until `seconds` have
// passed or the event ends and `afterEnd` seconds more have been drawn. Returns the frames the camera drew.
function record(name, duel, seconds, input, {afterEnd = 0} = {}) {
  const camera = createBowlCamera(), frames = [];
  let time = 0, endedFor = 0;
  while (duel.state.status === 'countdown') duel.step(SIM_DT);
  for (let frame = 0; frame < seconds / FRAME; frame++) {
    for (let sub = 0; sub < 2; sub++) {
      if (duel.state.status === 'racing') duel.setInput(input(duel, time, truckOf(duel)));
      duel.step(SIM_DT); time += SIM_DT;
    }
    const truck = truckOf(duel), ended = duel.state.status === 'bowl_break';
    const pose = stepBowlCamera(camera, truck, FRAME, {ended, solidTop: (x, z) => bowlSolidTop(duel.course, x, z, duel.state.s)});
    const body = {x: truck.x, y: truck.y + BOWL_CAMERA.aimUpMetres, z: truck.z};
    frames.push({time, truck, ended, pose: structuredClone(pose), seen: project(pose.position, pose.target, body),
      blocked: blocked(duel, pose, body), inside: bowlSolidTop(duel.course, truck.x, truck.z, duel.state.s) > truck.y + .5});
    if (ended && (endedFor += FRAME) >= afterEnd) break;
  }
  ok(frames.length > 30, `${name}: the drive was recorded`);
  return frames;
}

const viewYaw = pose => Math.atan2(pose.target.x - pose.position.x, pose.target.z - pose.position.z);

// The three rules of the card, on every frame of a drive.
function steady(name, frames) {
  let fastest = 0, furthest = 0, widest = 0, blockedRun = 0, longestBlocked = 0;
  for (let index = 1; index < frames.length; index++) {
    const a = frames[index - 1].pose, b = frames[index].pose;
    fastest = Math.max(fastest, Math.abs(wrap(viewYaw(b) - viewYaw(a))) / FRAME / DEG);
    furthest = Math.max(furthest, Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y, b.position.z - a.position.z));
    const seen = frames[index].seen;
    widest = Math.max(widest, seen.depth > 0 ? Math.max(Math.abs(seen.x), Math.abs(seen.y)) : Infinity);
    // A truck inside the stands (they have no height for a truck yet, BOWL-OUT-SIM) is hidden from every camera.
    blockedRun = frames[index].blocked && !frames[index].inside ? blockedRun + FRAME : 0;
    longestBlocked = Math.max(longestBlocked, blockedRun);
  }
  ok(fastest <= BOWL_CAMERA.maxTurnDegPerSec + .5, `${name}: the camera turns at no more than 120 degrees a second (fastest ${fastest.toFixed(1)})`);
  ok(furthest <= 1.5, `${name}: the camera moves no more than 1.5 m between two frames (furthest ${furthest.toFixed(2)} m)`);
  ok(widest <= .5, `${name}: the truck stays within the middle half of the picture (furthest out ${widest.toFixed(2)})`);
  ok(longestBlocked <= .5, `${name}: a wall, the fence or the stands never hide the truck for more than half a second (longest ${longestBlocked.toFixed(2)} s)`);
  console.log(`  ${name}: ${frames.length} frames, fastest turn ${fastest.toFixed(1)} deg/s, furthest move ${furthest.toFixed(2)} m, ` +
    `truck at most ${widest.toFixed(2)} from the middle, longest hidden ${longestBlocked.toFixed(2)} s`);
}

// Steers towards a world bearing (the game turns the nose left, towards -x from +z, for a positive steer).
const steerTo = (truck, yaw, gain = 2.2) => Math.max(-1, Math.min(1, -gain * wrap(yaw - truck.heading)));
const pace = (truck, mph) => ({throttle: truck.mph < mph ? 1 : 0, brake: truck.mph > mph + 5 ? .5 : 0});
// Keeps to a line on the lap (the young driver of tools/bowl-freestyle-balance.mjs).
const keepLine = (duel, truck, line) => Math.max(-1, Math.min(1, (truck.lateral - line) * .22 + (duel.state.headingError || 0) * 1.4));

// 1. Round the end of the Spine: tight against it at 25 mph from the Jump Straight onto the Crush Straight. The lap
//    number of the old camera turned through the whole end; the show camera follows the truck's way round it.
{
  const duel = showDuel(1);
  const frames = record('round the end of the Spine', duel, 12, (d, t, truck) =>
    ({...pace(truck, 25), steer: keepLine(d, truck, -16), boost: false}));
  ok(frames.at(-1).truck.s > 150, 'round the end of the Spine: the truck came round onto the Crush Straight');
  steady('round the end of the Spine', frames);
}

// 2. Over the Spine: full throttle, then full lock off the jump, so the truck flies over the Spine and its place on the
//    lap jumps by half a lap while it goes on the same way through the air.
{
  const duel = showDuel(1);
  const frames = record('over the Spine', duel, 8, (d, t) => ({throttle: 1, brake: 0, steer: t > 1.5 ? 1 : 0, boost: false}));
  const jump = frames.findIndex((frame, index) => index && Math.abs(frame.truck.s - frames[index - 1].truck.s) > 40);
  ok(jump > 0, 'over the Spine: the truck\'s place on the lap jumped (the case that jerked the old camera)');
  steady('over the Spine', frames);
}

// 3. A turn round on the spot: slow down, back up on full lock, then drive away the other way on the opposite lock.
//    The camera holds still while the truck backs up, then swings round behind it.
{
  const duel = showDuel(1);
  let held = null;
  const frames = record('a turn round on the spot', duel, 11, (d, t, truck) => {
    if (t < 3) return {...pace(truck, 20), steer: keepLine(d, truck, 0), boost: false};
    if (t < 4.5) return {throttle: 0, brake: 1, steer: 0, boost: false};
    if (t < 6.5) return {throttle: 0, brake: 1, steer: 1, boost: false};
    return {...pace(truck, 15), steer: t < 8.5 ? -1 : 0, boost: false};
  });
  const backing = frames.filter(frame => frame.pose.hold === 'reversing');
  ok(backing.length > 20, 'a turn round on the spot: the truck backed up');
  held = Math.max(...backing.map(frame => Math.abs(wrap(viewYaw(frame.pose) - viewYaw(backing[0].pose))))) / DEG;
  ok(held < 12, `a turn round on the spot: the camera keeps its angle while the truck backs up (moved ${held.toFixed(1)} degrees)`);
  steady('a turn round on the spot', frames);
}

// 4. A donut: round and round on full lock under 15 mph. The truck turns in front of a still camera.
{
  const duel = showDuel(1);
  const frames = record('a donut', duel, 16, (d, t, truck) =>
    t < 2 ? {...pace(truck, 12), steer: 0, boost: false} : {...pace(truck, 10), steer: 1, boost: false});
  const circling = frames.filter(frame => frame.time > 5);
  const swing = Math.max(...circling.map(frame => Math.abs(wrap(viewYaw(frame.pose) - viewYaw(circling[0].pose))))) / DEG;
  const truckTurn = circling.reduce((sum, frame, index) => index ? sum + Math.abs(wrap(frame.truck.heading - circling[index - 1].truck.heading)) : 0, 0) / DEG;
  ok(truckTurn > 360, `a donut: the truck turned more than a full circle (${truckTurn.toFixed(0)} degrees)`);
  ok(swing < 30, `a donut: the camera stays still while the truck circles (moved ${swing.toFixed(1)} degrees)`);
  steady('a donut', frames);
}

// 5. A double flip off the Big Jump: nitro up the jump (13 m towards the Spine), S held in the air to turn the truck over.
//    The camera draws back with height and never reads the truck's pitch.
{
  const duel = showDuel(1);
  const frames = record('a double flip off the Big Jump', duel, 7, (d, t, truck) =>
    ({throttle: d.state.airborne ? 0 : 1, brake: d.state.airborne ? 1 : 0, steer: keepLine(d, truck, -13), boost: !d.state.airborne}));
  const high = frames.filter(frame => frame.truck.air > 8);
  ok(high.length > 10, 'a double flip off the Big Jump: the truck flew more than 8 m up');
  const reach = Math.max(...high.map(frame => Math.hypot(frame.pose.position.x - frame.truck.x, frame.pose.position.z - frame.truck.z)));
  ok(reach > BOWL_CAMERA.backMetres + 2, `a double flip off the Big Jump: the camera draws back in the air (${reach.toFixed(1)} m behind)`);
  ok(Math.abs(duel.state.bowlAirPitch ?? 0) > 0 || frames.some(frame => frame.truck.air > 0), 'a double flip off the Big Jump: the truck was turned over in the air');
  steady('a double flip off the Big Jump', frames);
}

// 6. Over the wall and back: off the kicker with nitro, aimed at the stands, over the wall and out of the arena, round,
//    and back to the wall from outside. (The stands have no height for a truck yet and there is no gate to come back in
//    by: both are BOWL-OUT-SIM's. The truck goes through the stands at floor level and stops against the wall's back.)
//    The camera rises over the wall, the fence and the stands, and follows the truck outside.
{
  const duel = showDuel(1);
  const frames = record('over the wall and back', duel, 14, (d, t, truck) => {
    if (truck.lateral > 60) d._turned = true;
    if (t < 1.2) return {throttle: 1, brake: 0, steer: keepLine(d, truck, 0), boost: true};
    if (!d._turned) return {throttle: 1, brake: 0, steer: keepLine(d, truck, 80), boost: true};
    // Back to the middle of the stadium, steering by the world (the lap's frame means little out here).
    const middle = bowlCentre(d.course);
    return {...pace(truck, 30), steer: steerTo(truck, Math.atan2(middle.x - truck.x, middle.z - truck.z)), boost: false};
  });
  ok(frames.some(frame => frame.truck.lateral > 30), 'over the wall and back: the truck went out past the stand wall');
  ok(frames.some(frame => frame.pose.lift > 2), 'over the wall and back: the camera rose over what stood between it and the truck');
  const out = frames.findIndex(frame => frame.truck.lateral > 45);
  ok(out > 0 && frames.slice(out).some(frame => frame.truck.lateral < 28), 'over the wall and back: the truck came back to the stand wall');
  steady('over the wall and back', frames);
}

// 7. The end of an event: the Car Crush ends when the truck stops. The camera swings a quarter of the way round it over
//    two seconds, and holds there.
{
  const duel = showDuel(0);
  const frames = record('the end of the Car Crush', duel, 30, (d, t, truck) =>
    t < 3 ? {...pace(truck, 20), steer: 0, boost: false} : {throttle: 0, brake: 1, steer: 0, boost: false}, {afterEnd: 3});
  const end = frames.findIndex(frame => frame.ended);
  ok(end > 0, 'the end of the Car Crush: the event ended');
  const before = viewYaw(frames[end - 1].pose), at = seconds => viewYaw(frames[Math.min(frames.length - 1, end + Math.round(seconds / FRAME))].pose);
  const swing = Math.abs(wrap(at(2.1) - before)) / DEG;
  ok(Math.abs(swing - BOWL_CAMERA.endSwingDeg) < 3, `the end of the Car Crush: the camera swings a quarter of the way round (${swing.toFixed(1)} degrees)`);
  ok(Math.abs(wrap(at(1) - before)) / DEG > 20 && Math.abs(wrap(at(1) - before)) / DEG < 70, 'the end of the Car Crush: the swing takes the two seconds');
  ok(Math.abs(wrap(at(2.9) - at(2.1))) / DEG < 1, 'the end of the Car Crush: the camera holds once round');
  steady('the end of the Car Crush', frames);
}

// The camera is a drawing: stepping it changes nothing in the race.
{
  const a = showDuel(1), b = showDuel(1), camera = createBowlCamera();
  for (let i = 0; i < 600; i++) {
    for (const duel of [a, b]) { duel.setInput({throttle: 1, brake: 0, steer: i > 300 ? .6 : 0, boost: false}); duel.step(SIM_DT); }
    stepBowlCamera(camera, truckOf(a), SIM_DT, {solidTop: (x, z) => bowlSolidTop(a.course, x, z, a.state.s)});
  }
  ok(JSON.stringify(a.state) === JSON.stringify(b.state), 'stepping the camera changes nothing in the race');
}

console.log(`test-bowl-camera: ${checks} checks passed`);

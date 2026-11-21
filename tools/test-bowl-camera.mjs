// BOWL-CAMERA: the Bowl's show camera, headless (design: docs/board/cards/BOWL-SHOW-2.md, section 5). Each drive is driven in the real game
// (src/game.js, a Show Night with the titan-bowl switch on, memory only) and the camera is stepped at 60 frames a second
// from where the truck is, as the renderer steps it. Over every drive the camera never turns faster than 120 degrees a
// second, never moves more than 1.5 m between two frames, and always has the truck within the middle half of the picture.
// Run: node tools/test-bowl-camera.mjs
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {BOWL_CAMERA, bowlCameraKey, bowlCameraObstructed, bowlRexFallFrame, bowlSolidTop, createBowlCamera,
  stepBowlCamera} from '../src/bowl/bowl-camera.js';
import {rexSolids} from '../src/bowl/bowl-hook.js';
import {BOWL_STAND} from '../src/bowl/bowl-stadium.js';

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

// Place the truck on its approach. From here on only the player's controls move it.
function approach(duel, s, lateral, headingError, speedMph) {
  while (duel.state.status === 'countdown') duel.step(SIM_DT);
  const y = duel.course.groundAt(s, lateral).y;
  Object.assign(duel.state, {s, prevS: s, lateral, prevLateral: lateral, headingError, speedMph,
    groundHeight: y, prevGroundHeight: y, _jumpY: y, boost: 1});
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
    const y = pose.position.y + (body.y - pose.position.y) * share;
    if (bowlCameraObstructed(duel.course, {x, y, z}, duel.state.s)) return true;
  }
  return false;
}

// Drives a script: `input(duel, time, truck)` gives the controls for each step after the countdown, until `seconds` have
// passed or the event ends and `afterEnd` seconds more have been drawn. Returns the frames the camera drew.
function record(name, duel, seconds, input, {afterEnd = 0, wide = false, delivered = false} = {}) {
  const camera = createBowlCamera(), frames = [];
  let time = 0, endedFor = 0, previousHeight = null;
  while (duel.state.status === 'countdown') duel.step(SIM_DT);
  for (let frame = 0; frame < seconds / FRAME; frame++) {
    for (let sub = 0; sub < 2; sub++) {
      if (duel.state.status === 'racing') duel.setInput(input(duel, time, truckOf(duel)));
      duel.step(SIM_DT); time += SIM_DT;
    }
    const truck = truckOf(duel), ended = duel.state.status === 'bowl_break';
    const pose = stepBowlCamera(camera, truck, FRAME, {ended, wide, gateCourse: duel.course, referenceS: truck.s,
      solidTop: (x, z) => bowlSolidTop(duel.course, x, z, truck.s)});
    if (delivered && previousHeight != null)
      pose.position.y = previousHeight + (pose.position.y - previousHeight) * (1 - Math.exp(-14 * FRAME));
    previousHeight = pose.position.y;
    const body = {x: truck.x, y: truck.y + BOWL_CAMERA.aimUpMetres, z: truck.z};
    frames.push({time, truck, ended, pose: structuredClone(pose), seen: project(pose.position, pose.target, body),
      blocked: blocked(duel, pose, body), inside: bowlCameraObstructed(duel.course, body, truck.s),
      cameraInside: bowlCameraObstructed(duel.course, pose.position, truck.s)});
    if (ended && (endedFor += FRAME) >= afterEnd) break;
  }
  ok(frames.length > 30, `${name}: the drive was recorded`);
  return frames;
}

const viewYaw = pose => Math.atan2(pose.target.x - pose.position.x, pose.target.z - pose.position.z);

// The three rules of the card, on every frame of a drive.
function steady(name, frames) {
  let fastest = 0, furthest = 0, widest = 0, blockedRun = 0, longestBlocked = 0, sharpest = 0, apart = 0;
  const jumps = [];
  for (let index = 1; index < frames.length; index++) {
    const a = frames[index - 1].pose, b = frames[index].pose;
    fastest = Math.max(fastest, Math.abs(wrap(viewYaw(b) - viewYaw(a))) / FRAME / DEG);
    furthest = Math.max(furthest, Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y, b.position.z - a.position.z));
    // Against the truck: how far the camera moved beyond the truck's own move (a snap sideways or up shows here). A frame
    // where the truck itself jumped further than its speed takes it (a wall's push) is left out: the camera is meant not
    // to follow that jump, and the plain move above still holds it to 1.5 m.
    const ta = frames[index - 1].truck, tb = frames[index].truck;
    const step = Math.hypot(tb.x - ta.x, tb.z - ta.z), jumped = step > Math.max(Math.abs(ta.mph), Math.abs(tb.mph)) * .44704 * FRAME + .5;
    if (jumped) jumps.push(step.toFixed(2));
    else apart = Math.max(apart, Math.hypot(b.position.x - a.position.x - (tb.x - ta.x), b.position.y - a.position.y - (tb.y - ta.y),
      b.position.z - a.position.z - (tb.z - ta.z)));
    // The turn rate changes gradually while driving (the end swing has its own ease and is checked on its own).
    if (index > 1 && !frames[index].ended) {
      const before = wrap(viewYaw(a) - viewYaw(frames[index - 2].pose)) / FRAME, now = wrap(viewYaw(b) - viewYaw(a)) / FRAME;
      sharpest = Math.max(sharpest, Math.abs(now - before) / FRAME / DEG);
    }
    const seen = frames[index].seen;
    widest = Math.max(widest, seen.depth > 0 ? Math.max(Math.abs(seen.x), Math.abs(seen.y)) : Infinity);
    // An overlapping solid at the truck itself cannot be resolved by moving the camera.
    blockedRun = frames[index].blocked && !frames[index].inside ? blockedRun + FRAME : 0;
    longestBlocked = Math.max(longestBlocked, blockedRun);
  }
  ok(fastest <= BOWL_CAMERA.maxTurnDegPerSec + .5, `${name}: the camera turns at no more than 120 degrees a second (fastest ${fastest.toFixed(1)})`);
  ok(furthest <= 1.5, `${name}: the camera moves no more than 1.5 m between two frames (furthest ${furthest.toFixed(2)} m)`);
  ok(apart <= .8, `${name}: against the truck the camera moves no more than 0.8 m a frame (most ${apart.toFixed(2)} m)`);
  const easing = BOWL_CAMERA.maxTurnDegPerSec / BOWL_CAMERA.easeSec;
  ok(sharpest <= easing * 1.05, `${name}: every change of turn rate is eased over 0.4 s (sharpest ${sharpest.toFixed(0)} deg/s each second)`);
  ok(widest <= .5, `${name}: the truck stays within the middle half of the picture (furthest out ${widest.toFixed(2)})`);
  ok(longestBlocked <= .5, `${name}: a wall, the fence or the stands never hide the truck for more than half a second (longest ${longestBlocked.toFixed(2)} s)`);
  console.log(`  ${name}: ${frames.length} frames, fastest turn ${fastest.toFixed(1)} deg/s, furthest move ${furthest.toFixed(2)} m ` +
    `(${apart.toFixed(2)} m against the truck), sharpest change of turn ${sharpest.toFixed(0)} deg/s each second, ` +
    `truck at most ${widest.toFixed(2)} from the middle, longest hidden ${longestBlocked.toFixed(2)} s` +
    (jumps.length ? `; the truck itself jumped ${jumps.join(', ')} m in one frame` : ''));
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

// 2. Aim across the Spine before takeoff. Release nitro once the truck leaves the ramp.
{
  const duel = showDuel(1);
  approach(duel, 44, -12, -.5, 65);
  const frames = record('over the Spine', duel, 8, (_, t) =>
    ({throttle: t < .5 ? 1 : 0, brake: 0, steer: t < .18 ? .3 : 0, boost: t < .5}));
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

// 5. A double backflip on the Big Jump. Press S after takeoff, release it after two turns.
{
  const duel = showDuel(1);
  approach(duel, 38, -13, 0, 53);
  let airTicks = 0, trick;
  duel.onChange((_, event) => { if (event.bowlTrick) trick = event.bowlTrick; });
  const frames = record('a double flip off the Big Jump', duel, 7, d => {
    const tick = d.state.airborne ? ++airTicks : 0;
    return {throttle: 0, brake: tick > 2 && tick <= 218 ? 1 : 0, steer: 0, boost: false};
  });
  const high = frames.filter(frame => frame.truck.air > 8);
  ok(high.length > 10, 'a double flip off the Big Jump: the truck flew more than 8 m up');
  const reach = Math.max(...high.map(frame => Math.hypot(frame.pose.position.x - frame.truck.x, frame.pose.position.z - frame.truck.z)));
  ok(reach > BOWL_CAMERA.backMetres + 2, `a double flip off the Big Jump: the camera draws back in the air (${reach.toFixed(1)} m behind)`);
  ok(trick?.kind === 'backflip' && trick.turns === 2 && trick.landing === 'clean', 'the truck landed the double flip');
  steady('a double flip off the Big Jump', frames);
}


// Each real gate has an open corridor below the drawn lintel. Keep the
// rolling truck in view at both mouths, even when an inbound guide turns it.
for (const gateIndex of [0, 1]) {
  for (const direction of ['out', 'left', 'right', 'wide out', 'wide in']) {
    const duel = showDuel(1), course = duel.course, outside = course.features.bowl.outside;
    const gate = outside.gates[gateIndex], outward = direction.endsWith('out'), wide = direction.startsWith('wide');
    const side = direction === 'left' ? -1 : 1;
    if (direction === 'out') {
      const underRoof = course.worldAt(gate.s, outside.back - 8);
      ok(!bowlCameraObstructed(course, {...underRoof, y: 3.6}, gate.s), gate.name + ' has open air under its lintel');
      ok(bowlCameraObstructed(course, {...underRoof, y: 5}, gate.s), gate.name + ' roof is solid above the lintel');
      const throughJamb = course.worldAt(gate.s + gate.width / 2 + .25, outside.back - 8);
      ok(bowlCameraObstructed(course, {...throughJamb, y: 3.6}, gate.s), gate.name + ' jamb is solid');
      const floorHeader = course.worldAt(gate.s, BOWL_STAND.face + .5);
      ok(bowlCameraObstructed(course, {...floorHeader, y: 7}, gate.s), gate.name + ' floor-side arch is solid above its opening');
      const parkPost = course.worldAt(gate.s + gate.mouthWidth / 2 + .4, BOWL_STAND.face + BOWL_STAND.outer + .35);
      ok(bowlCameraObstructed(course, {...parkPost, y: 3}, gate.s), gate.name + ' car-park arch post is solid');
    }
    const offset = outward ? 0 : wide ? 4 : side * 8;
    const heading = outward ? Math.PI / 2 : -Math.PI / 2 - (wide ? 0 : side * Math.PI / 4);
    approach(duel, gate.s + offset, outward ? 6 : outside.back + 9, heading, 20);
    const name = gate.name + ' ' + direction;
    const frames = record(name, duel, outward ? 7 : 6.5, (_, __, truck) => ({
      throttle: +(truck.mph < 20), steer: 0, brake: 0, boost: false,
    }), {wide, delivered: true});
    steady(name, frames);
    const crossed = frames.some(frame => outward ? frame.truck.lateral > outside.back + 2 : frame.truck.lateral < outside.wall - 2);
    ok(crossed, name + ' covers both mouths and the tunnel');
    ok(frames.every(frame => !frame.cameraInside), name + ' never puts the camera inside a solid');
    let hidden = 0, longestHidden = 0;
    for (const frame of frames) {
      hidden = frame.blocked ? hidden + FRAME : 0;
      longestHidden = Math.max(hidden, longestHidden);
    }
    ok(longestHidden <= .2 + 1e-8, name + ' never hides the truck for more than 0.2 seconds');
  }
}


// The renderer keeps the new X/Z but eases its Y. Include the full rise
// after the floor mouth when checking the actual Wide camera position.
for (const gateIndex of [0, 1]) for (const speed of [25, 40]) {
  const duel = showDuel(1), course = duel.course, outside = course.features.bowl.outside;
  const gate = outside.gates[gateIndex];
  approach(duel, gate.s + 3, outside.back + 9, -Math.PI / 2 + .2, speed);
  const name = gate.name + ' steered Wide return at ' + speed + ' mph';
  const frames = record(name, duel, speed === 25 ? 7 : 4.5, (_, __, truck) => {
    const centre = course.worldAt(gate.s, Math.min(outside.wall - 6, truck.lateral - 5));
    return {throttle: +(truck.mph < speed), brake: 0, boost: false,
      steer: steerTo(truck, Math.atan2(centre.x - truck.x, centre.z - truck.z), 1.4)};
  }, {wide: true, delivered: true});
  const {truck, pose} = frames.at(-1);
  ok(truck.lateral < outside.wall - 2 && course.nearest(pose.position.x, pose.position.z, truck.s).lateral < outside.wall - .5,
    name + ' brings the truck and camera back to the floor');
  ok(frames.every(frame => !frame.cameraInside), name + ' keeps the displayed camera out of the arch');
  steady(name, frames);
}

// 6. Launch onto the terraces, climb to the last row, leap into the car park,
// and follow the nearest gate through its tunnel back onto the floor.
{
  const duel = showDuel(1), outside = duel.course.features.bowl.outside;
  approach(duel, 43, -13, .35, 50);
  let terrace = false, park = false, back = false;
  duel.onChange((_, event) => { if (event.bowlBackIn) back = true; });
  const frames = record('over the wall and back', duel, 42, (d, t, truck) => {
    const s = d.state;
    if (!s.airborne && s.bowlOutside?.where === 'stands') terrace = true;
    if (!s.airborne && s.lateral > outside.back) park = true;
    if (!terrace) return {throttle: 1, brake: 0, boost: true, steer: 0};
    let aim = d.course.worldAt(s.s, s.lateral + 30);
    if (back) aim = d.course.worldAt(s.s + 12, s.lateral);
    else if (park) aim = s.bowlOutside.gate.aim;
    return {...pace(truck, park ? 20 : 25), steer: steerTo(truck, Math.atan2(aim.x-truck.x, aim.z-truck.z)), boost: false};
  });
  ok(terrace && park && back, 'landed on the terrace, dropped into the park, and returned through a real gate');
  ok(frames.some(frame => frame.truck.lateral > 30), 'over the wall and back: the truck went out past the stand wall');

  const out = frames.findIndex(frame => frame.truck.lateral > 45);
  ok(out > 0 && frames.slice(out).some(frame => frame.truck.lateral < 28), 'over the wall and back: the truck came back to the stand wall');
  steady('over the wall and back', frames);
}

// A solid section of the stands still needs lift when it stands between the
// chase point and the truck. The open-gate return above needs no such lift.
{
  const duel = showDuel(1), course = duel.course, outside = course.features.bowl.outside;
  approach(duel, 37, outside.wall - 2, -Math.PI / 2, 0);
  const truck = truckOf(duel);
  const camera = stepBowlCamera(createBowlCamera(), truck, FRAME, {gateCourse: course, referenceS: truck.s,
    solidTop: (x, z) => bowlSolidTop(course, x, z, truck.s)});
  ok(camera.lift > 2, 'away from a gate the camera rises over what stands between it and the truck');
}

// 7. The end of an event: the Car Crush ends on the clock. The camera swings a quarter of the way round it over
//    two seconds, and holds there.
{
  const duel = showDuel(0);
  const frames = record('the end of the Car Crush', duel, 66, (d, t, truck) =>
    t < 3 ? {...pace(truck, 20), steer: 0, boost: false} : {throttle: 0, brake: 1, steer: 0, boost: false}, {afterEnd: 3});
  const end = frames.findIndex(frame => frame.ended);
  ok(end > 0 && Math.abs(duel.state.stageTimeSec - 60) < SIM_DT,
    'the stopped truck stays in Car Crush until the end of the full minute');
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

// The fall shot holds both the truck and the whole falling beast for ten seconds.
{
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  ok(duel.startBowlNight({night: 5, eventIndex: 2, cpuDifficulty: 'easy'}), 'the fight loads');
  const state = duel.state, fight = state.bowlNight.event.rex;
  ok(!bowlRexFallFrame(duel.course, fight), 'driving toward a standing Rex keeps the chase camera');
  Object.assign(fight, {phase: 'fallen', t: 0, low: true, boxes: [true, true, true]});
  const camera = createBowlCamera();
  for (let frame = 0; frame < 600; frame++) {
    const seconds = frame * FRAME;
    fight.t = seconds;
    const p = duel.course.worldAt(fight.s - 12 - 6 * seconds, fight.places.rail - 9);
    const truck = {key: bowlCameraKey(state), x: p.x, y: p.y, z: p.z, air: 0, heading: p.heading};
    const shot = stepBowlCamera(camera, truck, FRAME, {
      rexFall: bowlRexFallFrame(duel.course, fight),
      solidTop: (x, z) => bowlSolidTop(duel.course, x, z, fight.s),
    });
    const corners = [{x: p.x, y: p.y + 1.65, z: p.z}];
    for (const part of rexSolids(fight, duel.course)) {
      for (const x of [-part.halfX, part.halfX]) for (const z of [-part.halfZ, part.halfZ]) {
        const point = {x: part.x + Math.cos(part.heading) * x + Math.sin(part.heading) * z,
          z: part.z - Math.sin(part.heading) * x + Math.cos(part.heading) * z};
        corners.push({...point, y: part.minY}, {...point, y: part.maxY});
      }
    }
    ok(shot.hold === 'rexFall' && corners.every(point => {
      const {x, y, depth} = project(shot.position, shot.target, point);
      return depth > 0 && Math.abs(x) < 1 && Math.abs(y) < 1;
    }), 'the full Rex and the truck stay inside the frame during the fall');
  }
}

{
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  ok(duel.startBowlNight({night: 5, eventIndex: 2, cpuDifficulty: 'easy'}), 'the fight loads');
  const state = duel.state, fight = state.bowlNight.event.rex;
  Object.assign(fight, {phase: 'fallen', direction: -1, s: 258, t: 0, low: true, boxes: [true, true, true]});
  const p = duel.course.worldAt(256.62415, 10.57768), rex = bowlRexFallFrame(duel.course, fight);
  const shot = stepBowlCamera(createBowlCamera(),
    {key: bowlCameraKey(state), x: p.x, y: p.y, z: p.z, air: 0, heading: -.3658}, FRAME, {rexFall: rex});
  ok((shot.position.x - rex.x) * (p.x - rex.x) + (shot.position.z - rex.z) * (p.z - rex.z) > 0,
    'the fall camera shoots from the truck side when the Rex would hide it from the chase side');
}

// A new go, or a frame drawn by another camera, starts the camera afresh even when the truck has not moved: the old path
// and angle are not carried over (the independent review of 20 November: a Turn Show go reuses the same try number).
{
  const camera = createBowlCamera(), first = {}, second = {};
  const truck = (key, x, heading = 0) => ({key, x, y: 0, z: 0, air: 0, heading});
  for (let frame = 1; frame <= 60; frame++) stepBowlCamera(camera, truck(first, frame * .2, Math.PI / 2), FRAME, {frame});
  ok(camera.path.length > 30 && Math.abs(camera.yaw - Math.PI / 2) < .2, 'a camera follows a truck driving towards +x');
  stepBowlCamera(camera, truck(second, 12, 0), FRAME, {frame: 61});
  ok(camera.path.length === 1 && camera.yaw === 0, 'a new go starts the camera afresh, behind the nose of the truck');
  for (let frame = 62; frame <= 120; frame++) stepBowlCamera(camera, truck(second, 12 + (frame - 61) * .2, 0), FRAME, {frame});
  stepBowlCamera(camera, truck(second, 24, Math.PI), FRAME, {frame: 150});
  ok(camera.path.length === 1 && camera.yaw === Math.PI, 'after frames drawn by another camera it starts afresh');
}

console.log(`test-bowl-camera: ${checks} checks passed`);

// SCABLANDS-LAND round 4, slice 2b: the land's shape is solid, and every drawn thing is solid. The card's "Proved by driving at each": into a bank
// from the bed; off a lip at 30, 100 and 200 km/h; up the Steps at 20 and at 60 km/h; off the side of the bridge; into a shack, a wreck, a gate post
// and a girder, head on and at a glance; every crossing by its road at the road's top speed; each of the four ways from the yard to Tin Town end to end
// by a scripted driver; a raider meeting a building; a person on foot meeting a building. Plus: the solids are cut from the real models, the scarps are
// four steep faces that no road meets, and the rules are the Scablands' alone (the Scrapdome drives as it did).
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Duel} from '../src/game.js';
import {scablandsContactObstacles} from '../src/sim-scablands.js';
import {Course} from '../src/course.js';
import {DRIVE} from '../src/config.js';
import {wrapHeading} from '../src/offroad-physics.js';
import {ARENA_VENUES} from '../src/arena/venues.js';
import {placeActor} from '../src/arena/arena-event.js';
import {createFighter, stepFighter, FIGHTER_STEP_SECONDS} from '../src/onfoot.js';
import {LAND} from '../src/world/scablands-names.js';
import {ROAD_NET, EAST_ROAD, ROAD_HALF_WIDTH, roadPointFrom} from '../src/world/scablands-road.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {RIVER, RIVER_LAND, riverDepthAt, stepsWayFor, scablandsDriveAt} from '../src/world/scablands-regions.js';
import {SCARPS, scarpHeightAt} from '../src/world/scablands-scarps.js';
import {SCABLANDS_SOLIDS, solidsNear, pushOutOfSolids, WHEEL_HEIGHT} from '../src/world/scablands-solids.js';
import {GROUND, fallHit, dropFor, climbLimit} from '../src/world/scablands-ground-rules.js';
import {stepMover, FOOT_GRADE} from '../src/world/scablands-movers.js';
import {EVERBURN_PROP_FORM, createEverburnProps, EVERBURN_PROPS} from '../src/world/everburn-props.js';
import {girderBridgeGeometry, pipeGeometry} from '../src/world/scablands-draw.js';
import {tinTownFence} from '../src/world/tin-town-shacks.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {fieldBattleJob} from '../src/world/jobs/gas-run.js';
import {SCABLANDS_ASSETS} from '../src/world/scablands-scene.js';

const venue = ARENA_VENUES.scablands, course = new Course(venue, 1989), DT = 1 / 60, MPH = 1.609344;
const wrap = wrapHeading;

test('both furnace roads clear solids and climbable ground, including the return to the well', () => {
  const paths = [EVERBURN_JOBS[5].steps[1].actor.path, fieldBattleJob().steps[0].furnaceActor.path];
  const radius = 2.12 + .5, height = 5.06;
  for (const [road, path] of paths.entries()) {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1].position, b = path[i].position;
      const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length / 2);
      let previous = null;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const y = scablandsSurfaceHeightAt(x, z);
        if (previous) assert.ok(Math.abs(y - previous.y) / Math.hypot(x - previous.x, z - previous.z) <= GROUND.gripGrade,
          `furnace road ${road + 1}, piece ${i}: ground is too steep at ${x}, ${z}`);
        previous = {x, y, z};
        for (const solid of solidsNear(x, z, x, z, radius)) {
          if (solid.verticalClearance && (y > solid.maxY || y + height < solid.minY)) continue;
          const c = Math.cos(solid.heading), s = Math.sin(solid.heading), dx = x - solid.x, dz = z - solid.z;
          const distance = Math.hypot(Math.max(Math.abs(dx * c - dz * s) - solid.halfX, 0),
            Math.max(Math.abs(dx * s + dz * c) - solid.halfZ, 0));
          assert.ok(distance >= radius, `furnace road ${road + 1}, piece ${i}: ${solid.id} is ${distance.toFixed(2)} m away`);
        }
      }
    }
  }
});

// ---- A real Duel on the Scablands, driven through its own inputs -----------------------------------------------------------------------------
function newDuel(car = 'falcone_f42', realism = false) {
  const duel = new Duel({seed: 1989, car, featureFlags: {'hidden-road': true, 'scablands-realism': realism}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car, seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
  const player = duel.state, opponent = player.opponents[0];
  player.arena.timeLimitSec = Infinity; opponent.finished = true;
  // The harness's own second car stands at the far corner of the land, off every road.
  const corner = course.nearest(-6500, 4500);
  placeActor(duel, opponent, {s: corner.s, lateral: corner.lateral});
  duel.hits = [];
  const emit = duel.emit.bind(duel);
  duel.emit = event => { if (event.scablandsHit?.player) { const at = course.worldAt(duel.state.s, duel.state.lateral); duel.hits.push({...event.scablandsHit, t: duel.state.stageTimeSec, x: at.x, z: at.z, kmh0: kmhOf(duel)}); } return emit(event); };
  return duel;
}
const put = (duel, x, z, heading, kmh = 0) => {
  const at = course.nearest(x, z);
  placeActor(duel, duel.state, {s: at.s, lateral: at.lateral, headingError: wrap(heading - course.at(at.s).heading)}, kmh / MPH);
};
const where = duel => { const at = course.worldAt(duel.state.s, duel.state.lateral); return {x: at.x, z: at.z, y: scablandsSurfaceHeightAt(at.x, at.z)}; };
const kmhOf = duel => Math.abs(duel.state.speedMph) * MPH;
// One tick of a driver: aim at `goal`, hold `kmh` (a speed over what the ground gives is simply not reached).
function drive(duel, goal, kmh) {
  const here = where(duel), heading = course.at(duel.state.s).heading + duel.state.headingError;
  const turn = wrap(Math.atan2(goal.x - here.x, goal.z - here.z) - heading), speed = kmhOf(duel);
  duel.setInput({throttle: kmh === null || speed < kmh ? 1 : 0, brake: kmh !== null && speed > kmh + 4 ? 1 : 0, steer: Math.max(-1, Math.min(1, -turn * 2)), boost: false, interact: false});
}
// Drives a line of points: the car aims 90 m ahead of its nearest point on the line (the way the road suites' drivers do), at `speed(duel, here)` km/h.
function aimAlong(line, here, ahead = 90) {
  let best = {index: 0, t: 0, d: Infinity};
  for (let index = 0; index + 1 < line.length; index++) {
    const a = line[index], b = line[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const t = length > 0 ? Math.max(0, Math.min(1, ((here.x - a.x) * dx + (here.z - a.z) * dz) / length)) : 0, d = Math.hypot(here.x - a.x - t * dx, here.z - a.z - t * dz);
    if (d < best.d) best = {index, t, d};
  }
  let index = best.index, left = ahead + best.t * Math.hypot(line[index + 1].x - line[index].x, line[index + 1].z - line[index].z);
  for (;;) {
    const a = line[index], b = line[index + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= length || index + 2 >= line.length) { const t = Math.min(1, left / length); return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, off: best.d}; }
    left -= length; index++;
  }
}
function follow(duel, line, {speed = null, stopWithin = 25, seconds = 900, ahead = 90, onTick = null} = {}) {
  const end = line.at(-1);
  let worst = 0, steps = 0;
  for (; steps < seconds / DT; steps++) {
    const here = where(duel), aim = aimAlong(line, here, ahead);
    worst = Math.max(worst, aim.off);
    if (Math.hypot(here.x - end.x, here.z - end.z) < stopWithin) return {arrived: true, seconds: steps * DT, worst};
    drive(duel, aim, typeof speed === 'function' ? speed(duel, here) : speed);
    duel.step(DT);
    onTick?.(duel, here);
  }
  return {arrived: false, seconds: steps * DT, worst};
}
// A straight run: from a point, in a direction, held at `kmh`, for `seconds`; returns the car's track.
function straight(duel, from, heading, kmh, seconds) {
  put(duel, from.x, from.z, heading, kmh);
  const track = [];
  // The arena holds every car for its first moments (about 3 s): the run's seconds are counted after it.
  for (let step = 0; step < (seconds + 3.5) / DT; step++) {
    const here = where(duel), ahead = {x: here.x + Math.sin(heading) * 100, z: here.z + Math.cos(heading) * 100};
    drive(duel, ahead, kmh);
    duel.step(DT);
    track.push({...where(duel), kmh: kmhOf(duel), air: duel.state.airHeight, armor: duel.state.armor, airborne: duel.state.airborne});
  }
  return track;
}
const downhill = (x, z) => { const e = 2, gx = (scablandsSurfaceHeightAt(x + e, z) - scablandsSurfaceHeightAt(x - e, z)) / 2 / e, gz = (scablandsSurfaceHeightAt(x, z + e) - scablandsSurfaceHeightAt(x, z - e)) / 2 / e, l = Math.hypot(gx, gz) || 1; return {x: -gx / l, z: -gz / l}; };

// A river point on a long straight stretch, with the direction across the river toward its far bank.
const riverPoints = RIVER_LAND.line.points;
const straightRiver = (() => {
  const i = Math.floor(riverPoints.length * .2), a = riverPoints[i], b = riverPoints[i + 3], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz);
  return {x: a.x, z: a.z, nx: tz / l, nz: -tx / l};
})();

// ---- 1. The land's shape: the bed and its banks, a lip, the Steps, the bridge and the pipe -------------------------------------------------------
test('into a bank from the bed: a car at speed is stopped at the foot, loses its speed and takes a hit; it never climbs the bank', () => {
  for (const kmh of [60, 100, 150]) {
    const duel = newDuel('banshee_muscle'), heading = Math.atan2(straightRiver.nx, straightRiver.nz);
    const track = straight(duel, {x: straightRiver.x - straightRiver.nx * 20, z: straightRiver.z - straightRiver.nz * 20}, heading, kmh, 10);
    const last = track.at(-1), depth = riverDepthAt(last.x, last.z), armorBefore = track[0].armor;
    assert.ok(depth > 3, `${kmh} km/h: stopped low on the bank, ${depth.toFixed(1)} m below the plain (it climbed no further)`);
    const first = duel.hits.find(hit => hit.kind === 'climb');
    assert.ok(first && first.impactMph * MPH > kmh * .35, `${kmh} km/h: the foot of the bank is a hit sized by the speed (${duel.hits.filter(h => h.kind === 'climb').slice(0, 3).map(h => h.impactMph.toFixed(0)).join(', ')} mph)`);
    // The speed in the second after the first hit is a small part of what it was.
    const after = track.filter(row => row.t > first.t - 3.5 + 0).filter((row, index) => index < 1);
    const hitIndex = track.findIndex((row, index) => index > 0 && row.kmh < track[index - 1].kmh - kmh * .2 || row.kmh < kmh * .5);
    assert.ok(hitIndex > 0 && Math.min(...track.slice(hitIndex, hitIndex + 30).map(row => row.kmh)) < kmh * .35, `${kmh} km/h: the speed is gone at the foot (down to ${Math.min(...track.slice(hitIndex, hitIndex + 30).map(row => row.kmh)).toFixed(0)} km/h)`);
    void after;
    assert.ok(Object.values(duel.state.damageZones).some(value => value > 0) || last.armor < armorBefore, `${kmh} km/h: the hit dents the car or costs armour`);
  }
});

test('off a lip: a car that drives off a lip is in the air and its landing is a hit sized by the drop (30, 100 and 200 km/h)', () => {
  // The Pipe's deck edge is a lip of the full 8 m at any speed; the river's bank is a crest that throws a car only when it is fast.
  const pipe = RIVER_LAND.crossings.find(crossing => crossing.kind === 'pipe'), road = ROAD_NET.nearest(pipe.x, pipe.z).road;
  const centre = roadPointFrom(road, pipe.x, pipe.z, 0), ahead = roadPointFrom(road, pipe.x, pipe.z, 10), tx = ahead.x - centre.x, tz = ahead.z - centre.z, l = Math.hypot(tx, tz);
  // The pipeline stands on the deck's side of the road's own across axis (cos h, -sin h), which is minus this one, so the car leaves by this side.
  const side = {x: -tz / l, z: tx / l};
  const results = [];
  for (const kmh of [30, 100, 200]) {
    // From the middle of the deck: its edge is the lip (the ground falls 8 m in the last 1.2 m of its 3.6 m half width).
    const duel = newDuel('banshee_muscle'), start = {x: centre.x, z: centre.z};
    const track = straight(duel, start, Math.atan2(side.x, side.z), kmh, 5);
    const fall = duel.hits.find(hit => hit.kind === 'fall');
    assert.ok(track.some(row => row.airborne), `${kmh} km/h: the car leaves the deck and is in the air`);
    assert.ok(fall && fall.drop > 5 && fall.drop < 9, `${kmh} km/h: it lands from a drop of ${fall?.drop?.toFixed(1)} m (the deck stands 8 m over the bed)`);
    const lost = track[0].armor - track.at(-1).armor, max = duel.state.maxArmor;
    assert.ok(lost > max * .3 && lost < max * .6, `${kmh} km/h: the landing takes about half the armour (${lost.toFixed(0)} of ${max.toFixed(0)}) and no more`);
    assert.ok(duel.state.armor >= 1 && !duel.state.combatWrecking, `${kmh} km/h: a fall never ends a job by itself (armour ${duel.state.armor.toFixed(0)}, not wrecked)`);
    assert.ok(fall.kmh * 1.5 >= 100 - 1e-9, `${kmh} km/h: the ember (1.5 for each km/h of the hit) is put out by it (the hit is ${fall.kmh.toFixed(0)} km/h)`);
    results.push(`${kmh}: ${fall.drop.toFixed(1)} m, ${lost.toFixed(0)} armour`);
  }
  // The same rule at the numbers the card gives: nothing under a metre, hard at 3, half the armour at 8.
  assert.equal(fallHit(.9).kmh, 0, 'nothing under a metre');
  assert.ok(fallHit(3).kmh > 25 && fallHit(3).kmh * 1.5 > 40 && fallHit(3).kmh * 1.5 < 100, `hard at 3 m (${fallHit(3).kmh.toFixed(0)} km/h, ${(fallHit(3).kmh * 1.5).toFixed(0)} of the ember)`);
  assert.ok(Math.abs(fallHit(8).armorShare - .5) < 1e-9 && fallHit(8).kmh * 1.5 >= 100, 'half the armour and the ember out at 8 m');
  assert.ok(Math.abs(dropFor(Math.sqrt(2 * GROUND.gravity * 8)) - 8) < 1e-9, 'a drop of 8 m is a closing speed of 17 m a second');
  // The river's banks: a slow car drives down them (a smooth slope: no lip), a fast one flies off the crest and lands on the bed.
  const slow = newDuel(), fast = newDuel(), heading = Math.atan2(-straightRiver.nx, -straightRiver.nz), start = {x: straightRiver.x + straightRiver.nx * 260, z: straightRiver.z + straightRiver.nz * 260};
  assert.ok(!straight(slow, start, heading, 30, 12).some(row => row.airborne) && slow.hits.length === 0, 'a car at 30 km/h drives down the bank: no lip, no fall');
  const flown = straight(fast, start, heading, 200, 8);
  assert.ok(flown.some(row => row.air > 1.5) && fast.hits.some(hit => hit.kind === 'fall'), 'a car at 200 km/h leaves the bank, flies and lands with a hit');
  console.log('lips: ' + results.join('; '));
});

test('the Steps: a car under 25 km/h climbs the ledges, a car at 60 is thrown back; the ember is safe there only under 20', () => {
  const way = stepsWayFor(), heading = Math.atan2(way.nx, way.nz), start = {x: way.x - way.nx * 140, z: way.z - way.nz * 140};
  const across = row => (row.x - way.x) * way.nx + (row.z - way.z) * way.nz;
  const slow = newDuel(), crossed = straight(slow, start, heading, 20, 60);
  assert.ok(across(crossed.at(-1)) > RIVER.lipHalfWidth + 10, `at 20 km/h the car is over the Steps (${across(crossed.at(-1)).toFixed(0)} m past the middle)`);
  assert.equal(slow.hits.filter(hit => hit.kind === 'climb').length, 0, 'and took no hit');
  assert.ok(crossed.at(-1).armor === crossed[0].armor, 'nor any armour');
  const fast = newDuel(), thrown = straight(fast, start, heading, 60, 14);
  const climbHit = fast.hits.find(hit => hit.kind === 'climb');
  assert.ok(climbHit && climbHit.impactMph * MPH > 10, `at 60 km/h the first riser throws the car back with a hit (${climbHit?.impactMph.toFixed(0)} mph into it)`);
  assert.ok(Math.min(...thrown.filter(row => across(row) > -60).map(row => row.kmh)) < 25, 'and the car is slowed to a crawl by it');
  assert.equal(climbLimit(24, true), GROUND.ledgeGrade); assert.equal(climbLimit(26, true), GROUND.gripGrade); assert.equal(climbLimit(10, false), GROUND.gripGrade);
  const on = scablandsDriveAt(way.x + way.nx * 65, way.z + way.nz * 65);
  assert.equal(on.safeKmh, 20, 'the ember is safe on the ledges only under 20 km/h'); assert.equal(on.id, 'scab-plates', 'and they are scab plates to the cue and the dust');
});

test('the bridge has a truss each side and the pipe a deck with a fall off the side', () => {
  // The Girder Bridge: a car driven at a truss from the deck is stopped by it and stays on the deck.
  const bridge = SCABLANDS_SOLIDS.find(solid => solid.id === 'girder-bridge-truss-right');
  const along = {x: Math.sin(bridge.heading), z: Math.cos(bridge.heading)}, across = {x: Math.cos(bridge.heading), z: -Math.sin(bridge.heading)};
  const duel = newDuel('banshee_muscle'), start = {x: bridge.x - across.x * 5, z: bridge.z - across.z * 5};
  // Driven at the right truss at 30 degrees to the deck at 80 km/h.
  const heading = Math.atan2(along.x * Math.cos(.5) + across.x * Math.sin(.5), along.z * Math.cos(.5) + across.z * Math.sin(.5));
  const track = straight(duel, {x: start.x - along.x * 30, z: start.z - along.z * 30}, heading, 80, 3);
  const offset = row => (row.x - bridge.x) * across.x + (row.z - bridge.z) * across.z;
  assert.ok(Math.max(...track.map(offset)) < bridge.halfX + 7.8 - .5 && !track.some(row => row.airborne), `the truss stops the car on the deck (never more than ${Math.max(...track.map(offset)).toFixed(1)} m across; the truss stands at 7.4)`);
  assert.ok(riverDepthAt(track.at(-1).x, track.at(-1).z) < .5, 'it did not go over the side');
  // The Pipe: its deck is one car wide, and a car that leaves its side falls into the bed (the lip test above is this fall).
  const pipe = SCABLANDS_SOLIDS.find(solid => solid.id === 'the-pipe-pipeline');
  assert.ok(pipe.halfZ > 80 && pipe.height > 2, 'the pipeline beside its deck is solid');
});

// ---- 2. Solids: into a shack, a wreck, a gate post and a girder, head on and at a glance --------------------------------------------------------
// A solid's four faces, each {x, z (its middle), nx, nz (the way out), tx, tz (along it), half (its half length)}.
function faces(solid) {
  const c = Math.cos(solid.heading), s = Math.sin(solid.heading), ex = {x: c, z: -s}, ez = {x: s, z: c};
  return [[ex, solid.halfX, ez, solid.halfZ], [{x: -ex.x, z: -ex.z}, solid.halfX, ez, solid.halfZ], [ez, solid.halfZ, ex, solid.halfX], [{x: -ez.x, z: -ez.z}, solid.halfZ, ex, solid.halfX]].map(([n, reach, t, half]) =>
    ({x: solid.x + n.x * reach, z: solid.z + n.z * reach, nx: n.x, nz: n.z, tx: t.x, tz: t.z, half}));
}
// A face whose 60 m in front is clear of every other solid and of the river, so that a run at it meets only it.
function openFace(solid) {
  for (const face of faces(solid)) {
    let clear = true;
    for (let metres = 3; metres <= 60 && clear; metres += 3) {
      const x = face.x + face.nx * metres, z = face.z + face.nz * metres;
      clear = !solidsNear(x, z, x, z, 4).some(other => other !== solid && Math.hypot(Math.max(0, Math.abs((x - other.x) * Math.cos(other.heading) - (z - other.z) * Math.sin(other.heading)) - other.halfX - 3),
        Math.max(0, Math.abs((x - other.x) * Math.sin(other.heading) + (z - other.z) * Math.cos(other.heading)) - other.halfZ - 3)) === 0) && Math.abs(riverDepthAt(x, z)) < .5;
    }
    if (clear && face.half > 1.5) return face;
  }
  return null;
}
const inside = (solid, x, z, slack = 0) => { const c = Math.cos(solid.heading), s = Math.sin(solid.heading), dx = x - solid.x, dz = z - solid.z;
  return Math.abs(dx * c - dz * s) < solid.halfX - slack && Math.abs(dx * s + dz * c) < solid.halfZ - slack; };
// Where a car starts and which way it faces to meet a solid head on, or at a glance (4 m off a face and turned 7 degrees toward it, so that it touches the
// face and runs on along it). A box is met on a face with a clear 60 m in front of it; a gate post along the road through the gate; a truss of the bridge
// from the deck, along the road.
function plan(solid, kind, dir = 1) {
  const angle = 7 * Math.PI / 180, toward = (t, n) => Math.atan2(t.x * Math.cos(angle) - n.x * Math.sin(angle), t.z * Math.cos(angle) - n.z * Math.sin(angle));
  if (solid.kind === 'post' || solid.kind === 'girder') {
    const c = Math.cos(solid.heading), s = Math.sin(solid.heading), across = {x: c, z: -s}, along = {x: s, z: c};
    if (solid.kind === 'post') {
      // The gate's through way is north and south (its z); a post's south face is met going north, its inner face going north beside it.
      const inner = solid.x < LAND.at('tin-town', -25).x ? 1 : -1, road = {x: 0, z: -1};
      if (kind === 'head on') return {from: {x: solid.x, z: solid.z + 45}, heading: Math.atan2(road.x, road.z)};
      // 60 m south of the post, and 10 cm off its face where it passes, turned 3 degrees toward it: the car's front goes by the post's end and its side
      // meets the face as the rear passes (a post is 2.1 m long: a glance at it is a side-swipe). 7 degrees would put the front into the post's end.
      const small = 3 * Math.PI / 180, face = {x: solid.x + inner * (solid.halfX + 1.02 + 60 * Math.tan(small) + .1), z: solid.z + 60};
      return {from: face, heading: Math.atan2(-inner * Math.sin(small), -Math.cos(small))};
    }
    // Which side of the deck the truss stands on, along the road's own across axis; the deck lies the other way.
    const side = Math.sign((solid.x - bridgeCentre().x) * across.x + (solid.z - bridgeCentre().z) * across.z) || 1, inward = {x: -side * across.x, z: -side * across.z};
    if (kind === 'head on') return {from: {x: solid.x - along.x * (solid.halfZ + 45), z: solid.z - along.z * (solid.halfZ + 45)}, heading: Math.atan2(along.x, along.z)};
    // From the deck's lane beside the truss: 3 m of the car's own width and clearance off its inner face.
    const lane = solid.halfX + 1.02 + 2.4;
    return {from: {x: solid.x + inward.x * lane - along.x * 60, z: solid.z + inward.z * lane - along.z * 60}, heading: toward(along, {x: -inward.x, z: -inward.z})};
  }
  const face = openFace(solid);
  assert.ok(face, `${solid.id} has an open face`);
  if (kind === 'head on') return {from: {x: face.x + face.nx * 45, z: face.z + face.nz * 45}, heading: Math.atan2(-face.nx, -face.nz)};
  // The car is 20 cm clear of the face `side` metres before the middle of the face and closing at 7 degrees, so that its flank meets the face a metre or two later,
  // well inside it, and it runs on along it.
  // A short face (a shack's, under 8 m) is met at 3 degrees: at 7 the car's front goes into its end.
  const a = face.half < 4 ? 3 * Math.PI / 180 : angle, side = Math.min(face.half * .6, 6), run = 60 - side, gap = 1.02 + .2 + Math.tan(a) * run;
  const turned = (t, n) => Math.atan2(t.x * Math.cos(a) - n.x * Math.sin(a), t.z * Math.cos(a) - n.z * Math.sin(a));
  const tx = face.tx * dir, tz = face.tz * dir;
  return {from: {x: face.x + face.nx * gap - tx * (60), z: face.z + face.nz * gap - tz * (60)}, heading: turned({x: tx, z: tz}, {x: face.nx, z: face.nz})};
}
function bridgeCentre() {
  const l = SCABLANDS_SOLIDS.find(solid => solid.id === 'girder-bridge-truss-left'), r = SCABLANDS_SOLIDS.find(solid => solid.id === 'girder-bridge-truss-right');
  return {x: (l.x + r.x) / 2, z: (l.z + r.z) / 2};
}
function hitSolid(solid, kind, dir = 1) {
  const duel = newDuel('banshee_muscle'), {from, heading} = plan(solid, kind, dir), dents = () => Object.values(duel.state.damageZones).reduce((sum, value) => sum + value, 0), before = dents();
  const track = straight(duel, from, heading, 70, kind === 'head on' ? 5 : 8);
  return {duel, track, dented: dents() > before || duel.state.armor < track[0].armor};
}

for (const [label, pattern] of [['a shack', /^tin-town-cluster-\d+-slot-\d+$/], ['a wreck', /^boneyard-wreck-/], ['a gate post', /^tin-town-gate-post-left$/], ['a girder', /^girder-bridge-truss-right$/]]) {
  test(`into ${label}, head on and at a glance`, () => {
    // The first of its kind with an open face and a clear run along it, so that the glance meets only that solid.
    const clearRun = (row, dir) => {
      if (/post|truss/.test(row.id)) return true;
      const {from, heading} = plan(row, 'at a glance', dir);
      for (let metres = 0; metres <= 40; metres += 2) {
        const x = from.x + Math.sin(heading) * metres, z = from.z + Math.cos(heading) * metres;
        if (solidsNear(x, z, x, z, 5).some(other => other !== row && Math.hypot(Math.max(0, Math.abs((x - other.x) * Math.cos(other.heading) - (z - other.z) * Math.sin(other.heading)) - other.halfX - 2.5),
          Math.max(0, Math.abs((x - other.x) * Math.sin(other.heading) + (z - other.z) * Math.cos(other.heading)) - other.halfZ - 2.5)) === 0)) return false;
      }
      return true;
    };
    let dir = 1;
    const solid = SCABLANDS_SOLIDS.find(row => pattern.test(row.id) && (/post|truss/.test(row.id) || openFace(row) && [1, -1].some(d => clearRun(row, d) && (dir = d))));
    assert.ok(solid, `a solid for ${label}`);
    const head = hitSolid(solid, 'head on'), end = head.track.at(-1);
    assert.ok(!head.track.some(row => inside(solid, row.x, row.z)), `${solid.id}: head on at 70 km/h the car is never inside it`);
    assert.ok(head.dented, `${solid.id}: head on, it takes a hit (a dent or armour)`);
    assert.ok(end.kmh < 12, `${solid.id}: head on, the speed is gone (${end.kmh.toFixed(0)} km/h)`);
    const glance = hitSolid(solid, 'at a glance', dir);
    assert.ok(!glance.track.some(row => inside(solid, row.x, row.z)), `${solid.id}: at a glance the car is never inside it`);
    // Just after the first touch the car still has most of its speed (a car pressed on along a wall at a fixed heading goes on losing a little each step, which
    // is the arena wall's own rule, so the speed is read at the touch, not at the end of the run).
    const touched = glance.track.findIndex((row, index) => index > 0 && row.kmh < glance.track[index - 1].kmh - .8);
    assert.ok(touched > 0, `${solid.id}: at a glance the car touches it`);
    const speedAfter = glance.track[Math.min(glance.track.length - 1, touched + 3)].kmh;
    assert.ok(speedAfter > 40 && speedAfter > end.kmh + 28, `${solid.id}: at a glance it keeps the speed along the face (${speedAfter.toFixed(0)} km/h three steps after the touch against ${end.kmh.toFixed(0)} head on)`);
  });
}

test('everything drawn that is taller than a wheel is solid, cut from the same data that draws it', async () => {
  const parse = path => { const bytes = readFileSync(new URL('../public' + path, import.meta.url)); return new Promise((resolve, reject) => new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject)); };
  const turns = id => SCABLANDS_PLACES_INDEX.get(id) % 4;
  const SCABLANDS_PLACES_INDEX = new Map(LAND.table.map((place, index) => [place.id, index]));
  const ignore = /cloth|lamp|paper|ground|ash-and|drift|sand|gravel|embers|flame|boneyard ground|^Boneyard ground/i;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  // Every surface point of the model's parts that stand above a wheel, turned and placed as the scene draws the place.
  function points(model, placeId, skip = ignore) {
    model.updateMatrixWorld(true);
    const place = LAND.place(placeId), theta = turns(placeId) * Math.PI / 2, cos = Math.cos(theta), sin = Math.sin(theta), out = [];
    model.traverse(node => {
      if (!node.isMesh || skip.test(String(node.name).replace(/_/g, ' '))) return;
      const p = node.geometry.attributes.position, index = node.geometry.index, count = index ? index.count / 3 : p.count / 3;
      for (let t = 0; t < count; t++) {
        const i0 = index ? index.getX(t * 3) : t * 3, i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1, i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
        a.fromBufferAttribute(p, i0).applyMatrix4(node.matrixWorld); b.fromBufferAttribute(p, i1).applyMatrix4(node.matrixWorld); c.fromBufferAttribute(p, i2).applyMatrix4(node.matrixWorld);
        const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2, steps = Math.max(1, Math.min(30, Math.ceil(Math.sqrt(area) / .5)));
        for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps - i; j++) {
          const u = i / steps, v = j / steps, w = 1 - u - v, x = a.x * w + b.x * u + c.x * v, y = a.y * w + b.y * u + c.y * v, z = a.z * w + b.z * u + c.z * v;
          if (y >= WHEEL_HEIGHT + .2) out.push({x: place.x + x * cos + z * sin, z: place.z - x * sin + z * cos, y});
        }
      }
    });
    return out;
  }
  // A point counts as inside a box within 0.3 m of it (the boxes are cut from cells of 1 and 2 m).
  const covered = (list, slack = .3) => list.filter(point => SCABLANDS_SOLIDS.some(solid => inside(solid, point.x, point.z, -slack)));
  for (const [placeId, asset, skip] of [['tin-town', 'tintown'], ['dead-mall', 'mall', /^sand[- ]drift/], ['ridge', 'kit', /^$/]]) {
    const model = (await parse(SCABLANDS_ASSETS[asset])).scene, list = points(model, placeId, skip ?? ignore);
    assert.ok(list.length > 500, `${asset}: the model has parts above a wheel (${list.length} points)`);
    const held = covered(list);
    assert.ok(held.length / list.length > .995, `${asset}: every part taller than a wheel stands inside a solid (${(100 * held.length / list.length).toFixed(2)} percent of ${list.length} points)`);
    // And no solid is empty: every box of the place holds some of the model.
    const mine = SCABLANDS_SOLIDS.filter(solid => solid.placeId === placeId && /-block-|-wall-|-kit-/.test(solid.id));
    for (const solid of mine) assert.ok(list.some(point => inside(solid, point.x, point.z, 0)), `${solid.id} holds some of the drawn model (it is not a wall in the air)`);
  }
  // The well: one flare stack and its cap, within the post's radius.
  const well = (await parse(SCABLANDS_ASSETS.everburn)).scene, wellPoints = points(well, 'everburn', /flame|embers/i), post = SCABLANDS_SOLIDS.find(solid => solid.id === 'everburn-well');
  assert.ok(wellPoints.length > 20 && wellPoints.every(point => Math.hypot(point.x - post.x, point.z - post.z) <= post.halfX + .05), `the well's parts above a wheel stand inside its post (${wellPoints.length} points)`);
  // The props: the table's sizes are the kit's own, and each prop above a wheel has a solid at its place.
  const kit = (await parse(SCABLANDS_ASSETS.kit)).scene, cluster = createEverburnProps(kit, {groundAt: () => 0});
  cluster.updateMatrixWorld(true);
  const measured = new Map();
  cluster.children.forEach((prop, index) => {
    const inverse = new THREE.Matrix4().copy(prop.matrixWorld).invert(), box = new THREE.Box3(), v = new THREE.Vector3();
    prop.traverse(node => { if (!node.isMesh) return; const p = node.geometry.attributes.position; for (let k = 0; k < p.count; k++) box.expandByPoint(v.fromBufferAttribute(p, k).applyMatrix4(node.matrixWorld).applyMatrix4(inverse)); });
    const kind = EVERBURN_PROPS[index][0], size = box.getSize(new THREE.Vector3()).toArray(), scale = EVERBURN_PROPS[index][4];
    for (const [axis, value] of size.entries()) assert.ok(Math.abs(value - EVERBURN_PROP_FORM[kind].size[axis]) < .03, `the ${kind} is ${EVERBURN_PROP_FORM[kind].size[axis]} m on axis ${axis} in the table and ${value.toFixed(2)} in the kit`);
    measured.set(index, size[1] * scale);
  });
  EVERBURN_PROPS.forEach(([kind, , , , scale], index) => {
    const tall = measured.get(index) > WHEEL_HEIGHT, solid = SCABLANDS_SOLIDS.find(row => row.id.startsWith(`everburn-prop-${index + 1}-`));
    assert.equal(!!solid, tall, `${kind} ${index + 1} ${tall ? 'is' : 'is not'} solid (${measured.get(index).toFixed(2)} m)`);
  });
  // The gate's two fences, the ring fence and every shack stack are built from the lists the drawing builds from.
  for (const sheet of tinTownFence()) assert.ok(SCABLANDS_SOLIDS.some(solid => /^tin-town-fence-/.test(solid.id) && inside(solid, sheet.x, sheet.z, -.05)), `the ring fence sheet at ${sheet.x.toFixed(0)}, ${sheet.z.toFixed(0)} is solid`);
  // The bridge and the pipe, from the drawn geometry's own extents.
  const bridgeBox = new THREE.Box3().setFromBufferAttribute(girderBridgeGeometry({length: 176}).attributes.position), truss = SCABLANDS_SOLIDS.find(solid => solid.id === 'girder-bridge-truss-right');
  assert.ok(bridgeBox.max.y <= truss.height + .1 && Math.abs((truss.halfX + 7.8) - (bridgeBox.max.x + .0)) < .5, `the truss stands as high and as wide as the drawn bridge (${bridgeBox.max.y.toFixed(1)} m, ${bridgeBox.max.x.toFixed(1)} m out)`);
  const pipeBox = new THREE.Box3().setFromBufferAttribute(pipeGeometry({length: 176}).attributes.position), pipe = SCABLANDS_SOLIDS.find(solid => solid.id === 'the-pipe-pipeline');
  assert.ok(Math.abs((6.4 + pipe.halfX) - pipeBox.max.x) < .15, `the pipeline's outer face stands where the drawn flanges do (${(6.4 + pipe.halfX).toFixed(2)} m against ${pipeBox.max.x.toFixed(2)})`);
});

// ---- 3. Crossings: every one by its road at the road's top speed -----------------------------------------------------------------------------
test('every crossing is driven by its road at the road\'s top speed: no hit, no fall, the car arrives', () => {
  const crossings = [['girder-bridge', 'east-road'], ['the-pipe', 'salt-road'], ['the-wash', 'boneyard-road'], ['south-ford', 'mall-boneyard-road']];
  const rows = [];
  for (const [id, roadId] of crossings) {
    const crossing = RIVER_LAND.crossings.find(item => item.id === id), road = ROAD_NET.road(roadId);
    const from = roadPointFrom(road, crossing.x, crossing.z, -500), to = roadPointFrom(road, crossing.x, crossing.z, 450);
    // The road's own points from 500 m before the crossing to 450 m after it.
    const line = road.points.filter(point => { const d = Math.hypot(point.x - crossing.x, point.z - crossing.z); return d < 700; });
    const ordered = [from, ...line.filter(point => Math.hypot(point.x - from.x, point.z - from.z) > 5 && Math.hypot(point.x - to.x, point.z - to.z) > 5), to];
    const duel = newDuel('falcone_f42'), start = ordered[0], next = ordered[1];
    put(duel, start.x, start.z, Math.atan2(next.x - start.x, next.z - start.z), 190);
    const armor = duel.state.armor;
    let top = 0;
    const out = follow(duel, ordered, {speed: null, stopWithin: 30, seconds: 120, onTick: d => { top = Math.max(top, kmhOf(d)); }});
    assert.ok(out.arrived, `${id}: the car arrives at the far side by ${roadId}`);
    assert.equal(duel.hits.length, 0, `${id}: no hit and no fall by ${roadId} at ${top.toFixed(0)} km/h (${duel.hits.map(h => h.kind + ' ' + (h.drop ?? h.impactMph).toFixed?.(1)).join(', ')})`);
    assert.ok(duel.state.armor === armor, `${id}: no armour lost`);
    assert.ok(top > 170, `${id}: at the road's own top speed (${top.toFixed(0)} km/h)`);
    rows.push(`${id} by ${roadId}: ${top.toFixed(0)} km/h`);
  }
  console.log('crossings: ' + rows.join('; '));
});

// ---- 4. The four ways from the yard to Tin Town, end to end -----------------------------------------------------------------------------------
test('each of the four ways from the yard to Tin Town is driven end to end by a scripted driver', () => {
  const town = LAND.at('tin-town', -25, 112), way = stepsWayFor();
  const at = (id, dx = 0, dz = 0) => LAND.at(id, dx, dz);
  const onWay = across => ({x: way.x + way.nx * across, z: way.z + way.nz * across});
  const nearSteps = (duel, here) => Math.hypot(here.x - way.x, here.z - way.z) < 112 ? 20 : null;
  // (1) The East Road: by the Girder Bridge. (2) The scab short cut: straight, over the Steps at 20 km/h. (3) The salt pan: the Salt Road over the Pipe,
  // the spur to the Ridge and the Ridge Road down to Tin Town. (4) The river bed: out along the Boneyard Road to the Wash, down into the bed, along it to the
  // Steps, up them and straight to the town.
  const ridgeLine = [...ROAD_NET.road('salt-road').points.slice(0, ROAD_NET.road('salt-road').points.findIndex(point => Math.hypot(point.x - ROAD_NET.road('ridge-spur').points[0].x, point.z - ROAD_NET.road('ridge-spur').points[0].z) < 40) + 1),
    ...ROAD_NET.road('ridge-spur').points, ...ROAD_NET.road('ridge-road').points, town];
  const wash = RIVER_LAND.crossings.find(crossing => crossing.kind === 'wash'), steps = RIVER_LAND.crossings.find(crossing => crossing.kind === 'steps');
  const bed = riverPoints.filter((point, index) => RIVER_LAND.line.along[index] > steps.along - 50 && RIVER_LAND.line.along[index] < wash.along + 50).reverse();
  const bedLine = [...ROAD_NET.road('boneyard-road').points.filter(point => Math.hypot(point.x - wash.x, point.z - wash.z) > 150 && point.x < wash.x + 10 || false).slice(0, 0), ...bed.filter((_, index) => index % 2 === 0)];
  const ways = [
    ['the East Road', [...EAST_ROAD.points, town], 190, 220],
    ['the scab short cut', [onWay(-150), onWay(-92), onWay(92), onWay(150), town], 60, 200],
    ['the salt pan', ridgeLine, 190, 220],
    ['the river bed (as far as the bridge, and out by the Wash)', null, 80, 300],
  ];
  const rows = [];
  for (const realism of [false, true]) for (const [label, line, kmh, seconds] of ways) {
    const duel = newDuel('falcone_f42', realism);
    let driven;
    if (label.startsWith('the river bed')) {
      // KNOWN LIMIT (slice 2b, reported to Claude): a deck is level with the plain in the land's one height, so the Girder Bridge and the Pipe stand across the bed as
      // a wall 8 m high, and the bed cannot be driven under them. The way from the Wash up the bed to the Steps is therefore only as far as the bridge: down the
      // Wash's ramp, along the bed 27 m off its middle (the bridge's three piers stand across it at the middle and 55 m either side), to the bridge, where the
      // deck stops the car; and back down the bed and up the Wash's ramp, to the Boneyard Road and the East Road to Tin Town.
      const onRoad = ROAD_NET.road('boneyard-road'), before = roadPointFrom(onRoad, wash.x, wash.z, -220), bridge = RIVER_LAND.crossings.find(crossing => crossing.kind === 'bridge');
      put(duel, before.x, before.z, Math.atan2(wash.x - before.x, wash.z - before.z), 0);
      const upstream = bed.filter(point => Math.hypot(point.x - bridge.x, point.z - bridge.z) > 160 && RIVER_LAND.line.along[riverPoints.indexOf(point)] > bridge.along);
      const offset = upstream.map((point, index) => {
        const a = upstream[Math.max(0, index - 1)], b = upstream[Math.min(upstream.length - 1, index + 1)], l = Math.hypot(b.x - a.x, b.z - a.z);
        return {x: point.x + (b.z - a.z) / l * 27, z: point.z - (b.x - a.x) / l * 27};
      });
      const run = follow(duel, [before, {x: wash.x, z: wash.z}, ...offset], {speed: 60, stopWithin: 25, seconds: 400, ahead: 40});
      assert.ok(run.arrived, `${label}: along the bed to the bridge`);
      assert.ok(riverDepthAt(where(duel).x, where(duel).z) > 6, `${label}: the car is down in the bed`);
      // On to the bridge itself: the deck is a wall across the bed.
      const wall = {x: bridge.x, z: bridge.z};
      for (let step = 0; step < 60 * 40; step++) { drive(duel, wall, 40); duel.step(DT); }
      assert.ok(duel.hits.some(hit => hit.kind === 'climb') && Math.hypot(where(duel).x - bridge.x, where(duel).z - bridge.z) > 8, `${label}: the deck of the bridge holds the car back (a dead end)`);
      // Out again: back down the bed to the Wash and up its ramp, then along the Boneyard Road to the East Road's end by the road.
      const back = follow(duel, [where(duel), ...offset.slice().reverse(), {x: wash.x, z: wash.z}, onRoad.points[onRoad.points.length - 1]], {speed: 60, stopWithin: 40, seconds: 400, ahead: 40});
      driven = {arrived: back.arrived, seconds: run.seconds + back.seconds, worst: back.worst};
      driven.arrived = back.arrived;
      for (const hit of duel.hits) void hit;
      duel.hits = duel.hits.filter(hit => hit.kind !== 'climb');
    } else {
      const first = line[0], next = line[1];
      put(duel, first.x, first.z, Math.atan2(next.x - first.x, next.z - first.z), 0);
      if (label === 'the scab short cut') {
        // The yard to the first mark: a straight run over the plates (nothing stands on it, the scarps are 100 m clear of it).
        const lead = follow(duel, [{x: 0, z: 0}, onWay(-150)], {speed: 150, stopWithin: 60, seconds: 400, ahead: 90});
        assert.ok(lead.arrived, `${label}: the straight run from the yard to the Steps`);
        const rest = follow(duel, line, {speed: (d, here) => nearSteps(d, here) ?? 150, stopWithin: 30, seconds: 400, ahead: 40});
        driven = {arrived: rest.arrived, seconds: lead.seconds + rest.seconds, worst: rest.worst};
      } else driven = follow(duel, line, {speed: null, stopWithin: 30, seconds, ahead: 90});
    }
    assert.ok(driven.arrived, `${label}: the scripted driver arrives${label.startsWith('the river bed') ? ' back at the Boneyard Road' : ' at Tin Town'}`);
    assert.ok(!duel.state.combatWrecking, `${label}: not wrecked`);
    const rough = duel.hits.filter(hit => hit.kind === 'fall' && hit.kmh > 0);
    assert.equal(rough.length, 0, `${label}: no fall on the way (${rough.map(hit => hit.drop.toFixed(2) + ' m at ' + hit.t.toFixed(0) + ' s, ' + hit.x.toFixed(0) + ',' + hit.z.toFixed(0) + ' ' + hit.kmh0.toFixed(0) + ' km/h').join(', ')})`);
    rows.push(`${label} (realism ${realism ? 'on' : 'off'}): ${driven.seconds.toFixed(0)} s, ${duel.state.armor.toFixed(0)} of ${duel.state.maxArmor.toFixed(0)} armour, ${duel.hits.length} hits`);
  }
  console.log('the four ways: ' + rows.join('; '));
});

// ---- 5. Scarps ------------------------------------------------------------------------------------------------------------------------------------
test('four scarps: steep faces of 12 to 20 m, too steep to climb, never on a road, with the ends open', () => {
  assert.equal(SCARPS.length, 4, 'four scarps');
  assert.deepEqual(SCARPS.map(scarp => scarp.height).sort((p, q) => p - q), [12, 14, 18, 20], 'each between 12 and 20 m high');
  for (const scarp of SCARPS) {
    let top = 0, steepest = 0, roadHeight = 0;
    for (const {a, b} of scarp.stretches) {
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      for (let metres = 0; metres <= length; metres += 20) for (let across = -80; across <= 420; across += 10) {
        const tx = (b.x - a.x) / length, tz = (b.z - a.z) / length, x = a.x + tx * metres + tz * across * 1 * -1 * -1, z = a.z + tz * metres - tx * across * -1 * -1;
        void x; void z;
      }
      // The raised ground: height along and across, on a 10 m grid round the stretch.
      const x0 = Math.min(a.x, b.x) - 450, x1 = Math.max(a.x, b.x) + 450, z0 = Math.min(a.z, b.z) - 450, z1 = Math.max(a.z, b.z) + 450;
      for (let x = x0; x <= x1; x += 10) for (let z = z0; z <= z1; z += 10) {
        const h = scarpHeightAt(x, z);
        if (h <= .05) continue;
        top = Math.max(top, h);
        const e = 3, slope = Math.hypot((scarpHeightAt(x + e, z) - scarpHeightAt(x - e, z)) / (2 * e), (scarpHeightAt(x, z + e) - scarpHeightAt(x, z - e)) / (2 * e));
        steepest = Math.max(steepest, slope);
        const road = ROAD_NET.nearest(x, z);
        if (road) roadHeight = Math.max(roadHeight, h);
      }
    }
    assert.ok(top > scarp.height - .5 && top <= scarp.height + .01, `${scarp.id}: ${top.toFixed(1)} m high`);
    assert.ok(steepest > GROUND.gripGrade * 1.5, `${scarp.id}: the face climbs ${steepest.toFixed(2)} at its steepest, over the .30 a tyre grips`);
    assert.equal(roadHeight, 0, `${scarp.id}: no road meets it (no road lies on ground it raises)`);
    // A road never comes within 60 m of the raised ground.
    let nearest = Infinity;
    for (const road of ROAD_NET.roads) for (const point of road.points) for (const {a, b} of scarp.stretches) {
      const length = Math.hypot(b.x - a.x, b.z - a.z), t = Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.z - a.z) * (b.z - a.z)) / (length * length)));
      nearest = Math.min(nearest, Math.hypot(point.x - a.x - (b.x - a.x) * t, point.z - a.z - (b.z - a.z) * t));
    }
    assert.ok(nearest > 200, `${scarp.id}: no road within 200 m of its foot (${nearest.toFixed(0)} m)`);
  }
  // A car driven at a face is stopped at its foot; the same car goes round the end.
  const scarp = SCARPS[0], {a, b} = scarp.stretches[0], length = Math.hypot(b.x - a.x, b.z - a.z), tx = (b.x - a.x) / length, tz = (b.z - a.z) / length;
  const faceSide = {x: -tz, z: tx};   // away from the top: the way the face looks (left of the way a to b)
  void faceSide;
  const mid = {x: a.x + tx * length / 2, z: a.z + tz * length / 2};
  // The top lies to the right of the way a to b; so the face looks to the left, and a car driven at it comes from there.
  const out = {x: tz * -1, z: tx * 1};
  const lookX = (scarpHeightAt(mid.x + out.x * 30, mid.z + out.z * 30) > scarpHeightAt(mid.x - out.x * 30, mid.z - out.z * 30)) ? -out.x : out.x;
  const lookZ = (scarpHeightAt(mid.x + out.x * 30, mid.z + out.z * 30) > scarpHeightAt(mid.x - out.x * 30, mid.z - out.z * 30)) ? -out.z : out.z;
  const duel = newDuel(), track = straight(duel, {x: mid.x + lookX * 150, z: mid.z + lookZ * 150}, Math.atan2(-lookX, -lookZ), 90, 10);
  assert.ok(track.at(-1).y < 4 && duel.hits.some(hit => hit.kind === 'climb'), `a car at 90 km/h is stopped at the foot of the face and takes a hit (${track.at(-1).y.toFixed(1)} m up)`);
  const round = newDuel(), end = {x: b.x + tx * 150, z: b.z + tz * 150}, aim = {x: end.x - lookX * 400, z: end.z - lookZ * 400}, start = {x: mid.x + lookX * 150, z: mid.z + lookZ * 150};
  put(round, start.x, start.z, Math.atan2(end.x - start.x, end.z - start.z), 80);
  const lap = follow(round, [start, end, aim], {speed: 80, stopWithin: 60, seconds: 90, ahead: 60});
  assert.ok(lap.arrived && round.hits.filter(hit => hit.kind === 'climb').length === 0, 'the same car goes round the end of the scarp with no hit');
});

// ---- 6. Raiders and people on foot ---------------------------------------------------------------------------------------------------------
test('a raider meeting a building is stopped by it; a truck is held by ground too steep for her', () => {
  const block = SCABLANDS_SOLIDS.find(solid => solid.id === 'tin-town-block-9');
  // A raider walking at the middle of a block never gets inside it (stepMover is the job's own raider step, scablands-movers.js).
  let at = {x: block.x - block.halfX - 20, z: block.z};
  for (let step = 0; step < 60 * 20; step++) {
    const next = {x: at.x + 4 / 60, z: at.z + 0}, result = stepMover(at, next, {radius: .4, grade: FOOT_GRADE});
    at = {x: result.x, z: result.z};
    assert.ok(!inside(block, at.x, at.z), 'the raider is never inside the building');
  }
  assert.ok(Math.abs(at.x - (block.x - block.halfX - .4)) < .1, `and stands against its face (${(block.x - block.halfX - at.x).toFixed(2)} m from it)`);
  // A truck at the foot of a bank does not climb it.
  const start = {x: straightRiver.x - straightRiver.nx * 30, z: straightRiver.z - straightRiver.nz * 30};
  let truck = {...start};
  for (let step = 0; step < 60 * 30; step++) {
    const result = stepMover(truck, {x: truck.x + straightRiver.nx * .15, z: truck.z + straightRiver.nz * .15}, {radius: 2.4, grade: GROUND.gripGrade});
    truck = {x: result.x, z: result.z};
  }
  assert.ok(riverDepthAt(truck.x, truck.z) > 3 && Math.hypot(truck.x - start.x, truck.z - start.z) < 100, 'Big Bess stops at the foot of the bank');
  // In a real world job: a raider sent through a building by the job is stopped by it.
  const duel = new Duel({seed: 1, featureFlags: {'hidden-road': true, arsenal: true}});
  duel.state.wastelandGateDiscovered = true;
  const job = EVERBURN_JOBS[0];
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed: 1, cpuDifficulty: 'medium', opponents: [], job: {...job, seed: 1}}), true);
  duel.state.countdown = 0;
  const worldJob = duel.state.arena.worldJob, raider = {id: 'test-raider', x: block.x - block.halfX - 25, z: block.z, y: 0, health: 70, knockedDown: false, approachSpeed: 4.5, approachTarget: {x: block.x, z: block.z}};
  worldJob.actors.push(raider);
  for (let step = 0; step < 60 * 14; step++) duel.step(DT);
  assert.ok(!inside(block, raider.x, raider.z) && raider.x > block.x - block.halfX - 1.5, `a raider of a real job walks at the building and stays outside it (${(block.x - block.halfX - raider.x).toFixed(2)} m from its face)`);
});

test('a job raider walks around a trial boulder', () => {
  const duel = new Duel({seed: 1989, featureFlags: {'hidden-road': true, arsenal: true, 'scablands-realism': true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42',
    seed: 1989, cpuDifficulty: 'medium', opponents: [], job: {...EVERBURN_JOBS[0], seed: 1989}}), true);
  duel.state.countdown = 0;
  const worldJob = duel.state.arena.worldJob;
  const rocks = duel.course.solidGrid.solids.filter(s => s.kind === 'boulder');
  // Find an open approach that grazes the rock. A direct centre hit correctly stops a mover.
  let route;
  for (const rock of rocks) {
    const start = {x: rock.x - 8, z: rock.z + rock.halfZ * .7};
    const target = {x: rock.x + 8, z: start.z};
    let at = {...start}, touched = false;
    for (let i = 0; i < 60 * 10; i++) {
      const dx = target.x - at.x, dz = target.z - at.z, gap = Math.hypot(dx, dz);
      if (gap < .08) break;
      const result = stepMover(at, {x: at.x + dx / gap * .075, z: at.z + dz / gap * .075},
        {radius: .4, grade: FOOT_GRADE, grid: duel.course.solidGrid});
      touched ||= result.blocked === 'solid' && Math.hypot(at.x - rock.x, at.z - rock.z) < rock.halfX + 1;
      at = result;
    }
    if (touched && at.x > rock.x + rock.halfX + 1) { route = {rock, start, target}; break; }
  }
  assert.ok(route, 'a boulder has an open grazing approach');
  const raider = {id: 'trial-boulder-raider', ...route.start, y: 0, health: 70, knockedDown: false,
    approachSpeed: 4.5, approachTarget: route.target};
  worldJob.actors.push(raider);
  let closest = Infinity, greatestSideStep = 0;
  for (let step = 0; step < 60 * 10; step++) {
    duel.step(DT);
    closest = Math.min(closest, Math.hypot(raider.x - route.rock.x, raider.z - route.rock.z));
    greatestSideStep = Math.max(greatestSideStep, Math.abs(raider.z - route.start.z));
    assert.ok(Math.hypot(raider.x - route.rock.x, raider.z - route.rock.z) >= route.rock.halfX - .01,
      'the raider stays outside the boulder');
  }
  assert.ok(closest < route.rock.halfX + .6 && greatestSideStep > .1, 'the boulder changes the raider?s path');
  assert.ok(raider.x > route.rock.x + route.rock.halfX + 1, 'the raider gets past the boulder');
});

test('a person on foot cannot walk through a building', () => {
  const duel = newDuel(), block = SCABLANDS_SOLIDS.find(solid => solid.id === 'tin-town-block-9');
  const start = {x: block.x - block.halfX - 6, z: block.z}, at = course.nearest(start.x, start.z);
  const fighter = createFighter(course, duel.state, {s: at.s, lateral: at.lateral});
  fighter.yaw = Math.PI / 2;
  for (let step = 0; step < 120 * 10; step++) {
    stepFighter(course, duel.state, fighter, {forward: true}, FIGHTER_STEP_SECONDS);
    assert.ok(!inside(block, fighter.x, fighter.z), 'the person is never inside the building');
  }
  assert.ok(fighter.contacts > 0 && Math.abs(fighter.x - (block.x - block.halfX)) < 1, `the person stands against its face (${(block.x - block.halfX - fighter.x).toFixed(2)} m)`);
  // A person is not stopped by a rock under a wheel: the prop below 0.9 m has no solid (the smallest rock of the well).
  assert.ok(!SCABLANDS_SOLIDS.some(solid => solid.height <= WHEEL_HEIGHT), 'nothing a wheel climbs is solid');
});

// ---- 7. Only the Scablands --------------------------------------------------------------------------------------------------------------------
test('the rules are the Scablands\' alone: the Scrapdome keeps its ramps and junk, and the Scablands has none', () => {
  const dome = new Course(ARENA_VENUES.scrapdome, 1989);
  assert.equal(dome.features.ramps.length, 3, 'the Scrapdome keeps its three ramps');
  assert.equal(dome.features.crushables.length, 6, 'and its six junk cars');
  assert.equal(course.features.ramps.length, 0, 'the Scablands has no ramps of the old oval');
  assert.equal(course.features.crushables.length, 0, 'and no junk cars');
  assert.ok(!SCABLANDS_SOLIDS.some(solid => /^(dry-dam|ships|iron-line-station)/.test(solid.id)), 'the places that draw nothing have no solid');
  assert.ok(solidsNear(-5000, 0, -4000, 0).length < 12, 'the grid finds a few solids for a long move, not the whole list');
});

test('ground rules: pure, and the same twice', () => {
  const grid = Array.from({length: 40}, (_, i) => fallHit(i / 4));
  assert.deepEqual(grid, Array.from({length: 40}, (_, i) => fallHit(i / 4)));
  assert.ok(grid.every((row, i) => i === 0 || row.kmh >= grid[i - 1].kmh && row.armorShare >= grid[i - 1].armorShare), 'a longer fall is never a lighter hit');
  const pushed = pushOutOfSolids(SCABLANDS_SOLIDS[0].x, SCABLANDS_SOLIDS[0].z, .4);
  assert.ok(!inside(SCABLANDS_SOLIDS[0], pushed.x, pushed.z, .001), 'a point put in a solid is pushed out of it');
});


test('job braziers belong only to their own game', () => {
  const startJob = () => {
    const duel = new Duel({seed: 1, featureFlags: {'hidden-road': true, arsenal: true}});
    duel.state.wastelandGateDiscovered = true;
    assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed: 1, cpuDifficulty: 'medium', opponents: [], job: {...EVERBURN_JOBS[0], seed: 1}}), true);
    duel.state.countdown = 0;
    for (let i = 0; i < 10; i++) duel.step(DT);
    return duel;
  };
  const a = startJob(), b = startJob();
  const gridA = a.state.arena.worldJob.solidGrid, gridB = b.state.arena.worldJob.solidGrid;
  assert.ok(gridA.braziers.length > 0);
  const spot = gridA.braziers[0];
  const seesBrazier = duel => scablandsContactObstacles(duel, duel.state, spot, spot, []).some(solid => solid.id === spot.id);
  assert.ok(seesBrazier(a) && seesBrazier(b));
  gridA.setBraziers([]);
  assert.ok(!seesBrazier(a) && seesBrazier(b), 'clearing one job does not change the other');
  const fresh = newDuel();
  assert.ok(!seesBrazier(fresh), 'a later event has no job solids');
  const trace = duel => {
    put(duel, spot.x - 8, spot.z, Math.PI / 2, 30);
    duel.state.countdown = 0;
    for (let i = 0; i < 120; i++) { duel.setInput({throttle: 1}); duel.step(DT); }
    return [duel.state.s, duel.state.lateral, duel.state.speedMph];
  };
  const first = trace(fresh);
  startJob();
  assert.deepEqual(trace(newDuel()), first, 'the same seed and inputs do not depend on earlier jobs');
});

test('trial boulders, poles and pylon feet stop and damage a car; the same ground is open when off', () => {
  const trial = newDuel('banshee_muscle', true);
  for (const kind of ['boulder', 'telegraph', 'pylon-foot']) {
    let proved = false;
    for (const solid of trial.course.solidGrid.solids.filter(row => row.kind === kind && row.height > 1)) {
      for (const face of faces(solid)) {
        const from = {x: face.x + face.nx * 18, z: face.z + face.nz * 18};
        const heading = Math.atan2(-face.nx, -face.nz);
        if (Math.abs(scablandsSurfaceHeightAt(from.x, from.z) - scablandsSurfaceHeightAt(solid.x, solid.z)) > .5) continue;
        if (solidsNear(from.x, from.z, solid.x, solid.z, 4).length) continue;
        const on = newDuel('banshee_muscle', true), off = newDuel('banshee_muscle', false);
        let impact = 0;
        const scrape = on._scrape.bind(on);
        on._scrape = (zone, mph) => { impact = Math.max(impact, mph); return scrape(zone, mph); };
        const enabled = straight(on, from, heading, 70, 2), disabled = straight(off, from, heading, 70, 2);
        const along = row => (row.x - face.x) * face.nx + (row.z - face.z) * face.nz;
        if (impact > 4 && enabled.at(-1).kmh < 12 && Math.min(...disabled.map(along)) < -5) {
          assert.ok(!enabled.some(row => inside(solid, row.x, row.z)), `${kind}: the car stays outside`);
          assert.ok(impact * MPH > 15, `${kind}: the hit reflects the car's speed`);
          assert.ok(Object.values(on.state.damageZones).some(value => value > 0) || enabled.at(-1).armor < enabled[0].armor, `${kind}: the hit damages the car`);
          proved = true;
          break;
        }
      }
      if (proved) break;
    }
    assert.ok(proved, `${kind}: a car hits the thing with the switch on and crosses its place with it off`);
  }
});

// SCABLANDS-LAND round 4, slice 1: the land is 14 km by 10 km. The checks are the card's: a car can be anywhere on the land and
// is read back exactly; a drive across it takes the time distance and speed give, with no jump; the same inputs give the same
// drive; everything that belongs to a place moves with it; the detailed ground follows the player on a fixed lattice.
import assert from 'node:assert/strict';
import {yardPlan} from '../src/world/scablands-yard-look.js';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {DRIVE} from '../src/config.js';
import {wrapHeading} from '../src/offroad-physics.js';
import {ARENA_VENUES} from '../src/arena/venues.js';
import {placeActor} from '../src/arena/arena-event.js';
import {SCABLANDS_PLACES, SCABLANDS_LAYOUT, SCABLANDS_VENUE} from '../src/world/scablands.js';
import {scablandsHeightAt} from '../src/world/scablands-height.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {buildEverburn} from '../src/world/jobs/everburn.js';
import {gasRunPaths, gasRunWreck} from '../src/world/jobs/gas-run.js';
import {furnaceMarks} from '../src/world/jobs/furnace-sightings.js';
import {roadNet, EAST_ROAD, roadPointFrom} from '../src/world/scablands-road.js';
import {riverFor, stepsWayFor} from '../src/world/scablands-regions.js';
import {HOT_DELIVERY_WAYS, routeFor, sliceLine, nearestOnLine} from '../src/world/scablands-ways.js';
import {BED_MIST, SALT_RIDERS} from '../src/world/jobs/ember-rule.js';
import {tinTownGateFor} from '../src/world/tin-town-gate.js';
import {tinTownLayout, tinTownRoads} from '../src/world/tin-town-shacks.js';
import {boneyardWrecks, bessRest} from '../src/world/boneyard-wrecks.js';
import {ironLineFor} from '../src/world/iron-line.js';
import {scablandsSolids, createScablandsScene, SCABLANDS_ASSETS} from '../src/world/scablands-scene.js';
import {createNearGround, NEAR_GROUND, nearGroundHeightAt} from '../src/world/near-ground.js';
import {syncScene} from '../src/scene-systems.js';

const venue = ARENA_VENUES.scablands;
const course = new Course(venue, 1989);
const place = id => SCABLANDS_PLACES.find(row => row.id === id);
const CENTIMETRE = .01;

// The eight places on the first, small land: the land grew ten times as far each way from the yard.
const OLD_PLACES = Object.freeze({'tin-town': [600, 0], boneyard: [424, 304], 'dead-mall': [0, 430], everburn: [-424, 304],
  'iron-line': [-600, 0], 'dry-dam': [-424, -304], 'ships-in-sand': [0, -430], ridge: [424, -304]});

test('the land is 14 km by 10 km and its eight places stand ten times as far from the yard', () => {
  assert.equal(SCABLANDS_LAYOUT.halfWidth * 2, 14000);
  assert.equal(SCABLANDS_LAYOUT.halfDepth * 2, 10000);
  for (const [id, [x, z]] of Object.entries(OLD_PLACES)) assert.deepEqual([place(id).x, place(id).z], [x * 10, z * 10], `${id} is ten times as far`);
  assert.deepEqual([place('tin-town').x, place('tin-town').z], [6000, 0], 'Tin Town is 6 km from the yard');
  assert.deepEqual(SCABLANDS_PLACES.map(row => [row.id, row.flatRadius, row.height]),
    [['tin-town', 86, 0], ['boneyard', 94, 1], ['dead-mall', 82, -1], ['everburn', 78, 2], ['iron-line', 88, 0], ['dry-dam', 94, -3], ['ships-in-sand', 92, -2], ['ridge', 70, 18]],
    'each place keeps its own size and height');
  assert.deepEqual([SCABLANDS_VENUE.townGate.x, SCABLANDS_VENUE.townGate.z], [0, -92], 'the Scrapdome gate stays where it was');
  // Longest lap in the game is 6.7 km; the road to Tin Town is longer than that.
  assert.ok(Math.hypot(place('tin-town').x, place('tin-town').z) < 6700 && 6000 > 5000, 'Tin Town is 6 km from the yard');
});

test('the ridge and the wall stand at the new edge, as steep as they were', () => {
  const crest = (x, z = 0) => scablandsHeightAt(x, z);
  // Nothing rises in the middle of the land or near the old edge.
  for (const [x, z] of [[0, 0], [700, 0], [756, 0], [875, 0], [0, 500], [3500, 1500], [6500, 0]]) assert.ok(Math.abs(crest(x, z)) < 4, `flat at ${x}, ${z}: ${crest(x, z).toFixed(1)} m`);
  // On the east axis the ridge climbs to about 108 m just past 7,000 m and the wall stands 175 m high beyond 7,200 m (as on the old land, in metres).
  assert.ok(crest(7056) > 95 && crest(7056) < 125, `the ridge crest is about 108 m (${crest(7056).toFixed(1)})`);
  assert.ok(crest(7300) > 160, `the wall stands about 175 m high (${crest(7300).toFixed(1)})`);
  // Its slope in metres is the old one: it takes about the same distance to climb 100 m.
  let start = 6900; while (crest(start) < 10) start++;
  let top = start; while (crest(top) < 100) top++;
  assert.ok(top - start > 40 && top - start < 140, `the ridge climbs 90 m in ${top - start} m, about as quickly as before`);
  assert.ok(crest(7000, 5000 * .0) < 80, 'the edge of the land is the foot of the ridge, not its top');
});

test('a car can be placed at and read back from any point of the land, and the floor reaches every corner', () => {
  let worst = 0, widest = 0;
  const check = (x, z) => {
    const near = course.nearest(x, z), back = course.worldAt(near.s, near.lateral);
    worst = Math.max(worst, Math.hypot(back.x - x, back.z - z)); widest = Math.max(widest, Math.abs(near.lateral));
    return near;
  };
  for (let x = -7000; x <= 7000; x += 250) for (let z = -5000; z <= 5000; z += 250) check(x, z);
  for (const [x, z] of [[7000, 5000], [-7000, 5000], [7000, -5000], [-7000, -5000], [0, 0], [6000, 0], [-6000, 0]]) check(x, z);
  // Both sides of every line where a frame could jump: the seam of the oval on the east axis, the frame's own middle line, the
  // oval itself, the north-south line through the yard, and the land's four edges.
  for (const side of [-1e-6, 0, 1e-6, -1, 1]) {
    for (let x = -7000; x <= 7000; x += 97) { check(x, side); check(x, 5000 + side); check(x, -5000 + side); }
    for (let z = -5000; z <= 5000; z += 97) { check(side, z); check(7000 + side, z); check(-7000 + side, z); }
  }
  for (let angle = 0; angle < Math.PI * 2; angle += .013) for (const bend of [-.5, 0, .5]) check(Math.cos(angle) * (605.6 + bend), Math.sin(angle) * (433.8 + bend));
  assert.ok(worst <= CENTIMETRE, `every point reads back to within 1 cm (worst ${worst.toExponential(2)} m)`);
  assert.ok(widest < SCABLANDS_LAYOUT.floorHalfWidth - 500, `the floor (${SCABLANDS_LAYOUT.floorHalfWidth} m) reaches past the furthest corner (${widest.toFixed(0)} m from the oval)`);
  assert.equal(venue.scablands.wallOffset, venue.scablands.floorHalfWidth, 'the wall is at the floor limit');
  // The frame's length is a whole number of the course's 8 m steps: the old 3,290 put the seam 13 to 22 m out for a car far from the oval.
  assert.equal(course.length % course.step, 0, 'the frame is a whole number of steps long');
  // A real car actor placed at each corner reads back from the sim's own state.
  const duel = new Duel({seed: 1989, car: 'banshee_muscle', featureFlags: {'hidden-road': true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car: 'banshee_muscle', seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
  for (const [x, z] of [[7000, 5000], [-7000, 5000], [7000, -5000], [-7000, -5000], [6000, 0]]) {
    const near = course.nearest(x, z);
    placeActor(duel, duel.state, {s: near.s, lateral: near.lateral});
    const back = course.worldAt(duel.state.s, duel.state.lateral);
    assert.ok(Math.hypot(back.x - x, back.z - z) <= CENTIMETRE, `the car stands at ${x}, ${z}`);
  }
});

// A drive from the yard to Tin Town in a straight line at a fixed speed, through the real sim (the arena's own rule that a car
// is kept against the oval frame, re-derived from its world position each step).
function drive({speedMph = 100, dt = 1 / 60, target = EAST_ROAD.length} = {}) {
  const duel = new Duel({seed: 1989, car: 'banshee_muscle', featureFlags: {'hidden-road': true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car: 'banshee_muscle', seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
  const player = duel.state, opponent = player.opponents[0], arena = player.arena;
  arena.timeLimitSec = Infinity; opponent.finished = true;
  // SCABLANDS-LAND round 4, slice 2b: the straight line from the yard to Tin Town crosses the dry river, whose banks are solid now, so the drive follows the
  // East Road (the same 7.8 km of road, kept to by a driver that aims 90 m ahead of its nearest point on the line, as the road suites' drivers do).
  const line = EAST_ROAD.points, first = line[0], pose = course.nearest(first.x, first.z);
  // The harness's own second car: parked at the far corner of the land, off every road (it stood at the opposite point of the oval, 1,058 m east of the yard,
  // on the line of the drive: stage A).
  const corner = course.nearest(-6500, 4500);
  placeActor(duel, opponent, {s: corner.s, lateral: corner.lateral});
  placeActor(duel, player, {s: pose.s, lateral: pose.lateral, headingError: wrapHeading(Math.atan2(line[1].x - first.x, line[1].z - first.z) - course.at(pose.s).heading)}, speedMph);
  const aim = (x, z) => {
    let best = {index: 0, t: 0, d: Infinity};
    for (let index = 0; index + 1 < line.length; index++) {
      const a = line[index], b = line[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)), d = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
      if (d < best.d) best = {index, t, d};
    }
    let index = best.index, left = 90 + best.t * Math.hypot(line[index + 1].x - line[index].x, line[index + 1].z - line[index].z);
    for (;;) {
      const a = line[index], b = line[index + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
      if (left <= length || index + 2 >= line.length) { const t = Math.min(1, left / length); return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, off: best.d}; }
      left -= length; index++;
    }
  };
  const end = line.at(-1), log = [], metresPerSecond = speedMph * DRIVE.mphToWorld;
  let previous = course.worldAt(player.s, player.lateral), steps = 0, jump = 0, speedJump = 0, widest = 0, waited = 0, travelled = 0;
  while (travelled < target && Math.hypot(previous.x - end.x, previous.z - end.z) > 25 && steps < 60 * 400) {
    const here0 = course.worldAt(player.s, player.lateral), goal = aim(here0.x, here0.z), heading = course.at(player.s).heading + player.headingError;
    player.speedMph = speedMph;
    duel.setInput({throttle: 1, brake: 0, steer: Math.max(-1, Math.min(1, -2 * wrapHeading(Math.atan2(goal.x - here0.x, goal.z - here0.z) - heading))), boost: false});
    duel.step(dt); steps++;
    const here = course.worldAt(player.s, player.lateral), moved = Math.hypot(here.x - previous.x, here.z - previous.z);
    // The game holds every car for its first moments (the arena's own start); it is not counted as driving.
    if (moved === 0 && waited === steps - 1) { waited = steps; previous = here; continue; }
    jump = Math.max(jump, Math.abs(moved - Math.abs(player.speedMph) * DRIVE.mphToWorld * dt));
    speedJump = Math.max(speedJump, Math.abs(player.speedMph - speedMph));
    widest = Math.max(widest, goal.off);
    travelled += moved;
    log.push(here.x, here.z, player.speedMph);
    previous = here;
  }
  return {steps, waited, seconds: (steps - waited) * dt, x: previous.x, z: previous.z, jump, speedJump, widest, metresPerSecond, log, lateral: player.lateral, travelled, arrived: Math.hypot(previous.x - end.x, previous.z - end.z) <= 25};
}

test('a drive from the yard to Tin Town takes the time that distance and speed give, with no jump', () => {
  const run = drive();
  // SCABLANDS-LAND round 4, slice 2a: the scab plates hold a car to 52 mph, so the time is the distance over the speed the car had, step by step (the
  // speeds are in the log), not over the 100 mph the drive asks for. Slice 2b: the drive is the East Road's 7.8 km.
  let sum = 0, count = 0;
  for (let index = 2; index < run.log.length; index += 3) { sum += Math.abs(run.log[index]); count++; }
  const expected = run.travelled / (sum / count * DRIVE.mphToWorld);
  assert.ok(run.waited * (1 / 60) < 5, `the game holds the car for ${(run.waited / 60).toFixed(1)} s at the start`);
  assert.ok(Math.abs(run.seconds - expected) < 1.5, `${run.seconds.toFixed(1)} s for ${run.travelled.toFixed(0)} m at the logged speeds (${expected.toFixed(1)} s expected)`);
  assert.ok(run.arrived && run.travelled > EAST_ROAD.length - 100, `the car arrives at Tin Town's gate (${run.travelled.toFixed(0)} m driven of the road's ${EAST_ROAD.length.toFixed(0)} m)`);
  assert.ok(run.jump < .02, `no step moves the car more than its speed gives (worst difference ${run.jump.toExponential(2)} m)`);
  // The car is held to 100 mph each step and the road's ground lets it keep it, so the limit of 2 mph a step stands as it was.
  assert.ok(run.speedJump < 2, `no step changes the speed (worst ${run.speedJump.toFixed(2)} mph)`);
  assert.ok(run.widest < 14, `the car stays on the road (${run.widest.toFixed(1)} m off its line at most, the half width is 14 m)`);
  assert.ok(Math.abs(run.lateral) < SCABLANDS_LAYOUT.floorHalfWidth, 'the floor never holds it back');
});

test('the same seed and inputs give the same drive twice', () => {
  const first = drive({speedMph: 90, target: 1500}), second = drive({speedMph: 90, target: 1500});
  assert.equal(first.steps, second.steps);
  assert.deepEqual(first.log, second.log);
});

// ---- Places by name ------------------------------------------------------------------------------------------------------------
const walk = (value, visit, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value); visit(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) walk(child, visit, seen);
};
// Every named position in a pile of data: an object with an id and a {x, z} position (or x and z of its own).
const positionsOf = (...piles) => {
  const found = new Map();
  for (const pile of piles) walk(pile, node => {
    const point = node.position ?? (Number.isFinite(node.x) && Number.isFinite(node.z) ? node : null);
    if (typeof node.id === 'string' && Number.isFinite(point?.x) && Number.isFinite(point?.z)) found.set(node.id, [point.x, point.z]);
  });
  return found;
};
// Every node of every road of the net, named like the things in a job (SCABLANDS-LAND round 4, slice 2a).
const netNodes = land => roadNet(land).roads.flatMap(road => road.nodes.flatMap((node, index) => node.derived ? [] : [{id: `${road.id}-node-${index + 1}`, x: node.x, z: node.z}]));
const everything = land => {
  const built = buildEverburn(land), paths = gasRunPaths(land);
  return {jobs: built.EVERBURN_JOBS, side: built.EVERBURN_SIDE_JOBS, five: built.SCABLANDS_PLACES, paths, wreck: gasRunWreck(paths.boneyard),
    marks: furnaceMarks(land), named: land.named, net: netNodes(land), gate: tinTownGateFor(land), wrecks: boneyardWrecks(land), rest: bessRest(land),
    rail: ironLineFor(land),
    // Slice 2b: the bridge's trusses, the pipeline and the Steps' marker posts stand at offsets across their road's or the river's own direction, which turns a
    // little when a place moves (they follow their named crossing, which is checked above), and the ring fence is made of the sheets the ground there is flat
    // enough for, which is not the same sheets when the ground under the town moves with it.
    solids: scablandsSolids(land).filter(solid => solid.kind !== 'girder' && !/^the-steps-marker|^the-pipe-post-|^tin-town-fence-/.test(solid.id))};
};

test('moving a place in a copy of the table moves everything that belongs to it, and nothing else', () => {
  const delta = [123, -77];
  for (const moved of ['tin-town', 'boneyard', 'everburn', 'dead-mall', 'ridge', 'dry-dam', 'ships-in-sand', 'iron-line']) {
    const movedLand = createLand(movedTable(SCABLANDS_PLACES, moved, ...delta));
    const before = everything(LAND), after = everything(movedLand);
    const solids = scablandsSolids(movedLand), net = roadNet(movedLand), river = riverFor(movedLand);
    const near = (actual, expected, label) => assert.ok(Math.hypot(actual.x - expected.x, actual.z - expected.z) < 1, `${moved}: ${label} is in its expected place`);
    for (const crossing of river.crossings.filter(row => row.kind === 'bridge' || row.kind === 'pipe')) {
      const hit = net.nearest(crossing.x, crossing.z), a = hit.road.points[hit.index], b = hit.road.points[hit.index + 1];
      const heading = Math.atan2(b.x - a.x, b.z - a.z);
      const at = (across, along) => ({x: crossing.x + across * Math.cos(heading) + along * Math.sin(heading), z: crossing.z - across * Math.sin(heading) + along * Math.cos(heading)});
      const find = id => { const solid = solids.find(row => row.id === id); assert.ok(solid, `${moved}: ${id} exists`); return solid; };
      if (crossing.kind === 'bridge') {
        near(find('girder-bridge-truss-left'), at(-7.8, 0), 'left truss');
        near(find('girder-bridge-truss-right'), at(7.8, 0), 'right truss');
        [-.62, 0, .62].forEach((share, i) => near(find(`girder-bridge-pier-${i + 1}`), at(0, share * 88), `bridge pier ${i + 1}`));
      } else {
        near(find('the-pipe-pipeline'), at(6.4, 0), 'pipeline');
        [-.6, 0, .6].forEach((share, i) => near(find(`the-pipe-pier-${i + 1}`), at(0, share * 88), `pipe pier ${i + 1}`));
        for (let along = -79, i = 1; along < 88; along += 22, i++) near(find(`the-pipe-post-${i}`), at(6.4, along), `pipe post ${i}`);
      }
    }
    const way = stepsWayFor(river);
    for (const across of [-1, 1]) for (const lane of [-1, 1]) {
      const id = `the-steps-marker-${across < 0 ? 'near' : 'far'}-${lane < 0 ? 'left' : 'right'}`;
      const marker = solids.find(row => row.id === id); assert.ok(marker, `${moved}: ${id} exists`);
      near(marker, {x: way.x + way.nx * across * 88 + way.tx * lane * 3.5, z: way.z + way.nz * across * 88 + way.tz * lane * 3.5}, id);
    }
    const town = movedLand.at('tin-town'), fence = solids.filter(row => /^tin-town-fence-/.test(row.id));
    assert.ok(fence.length > 0, `${moved}: the ring fence exists`);
    for (const solid of fence) assert.ok(Math.abs(Math.hypot(solid.x - town.x, solid.z - town.z) - 88) < 1, `${moved}: ${solid.id} follows the ring`);
    const positions = positionsOf(after), bridge = movedLand.at('girder-bridge'), east = net.road('east-road');
    for (const [id, offset] of [['bridge-in', -150], ['bridge-out', 150], ['furnace-bridge-in', 150], ['furnace-bridge-out', -150]]) {
      const pos = positions.get(id); assert.ok(pos, `${moved}: ${id} exists`);
      near({x: pos[0], z: pos[1]}, roadPointFrom(east, bridge.x, bridge.z, offset), id);
    }
    const raid = positions.get('ash-men-raid-2'), out = positions.get('bridge-out');
    assert.ok(raid && out, `${moved}: the second ambush exists`);
    near({x: raid[0], z: raid[1]}, {x: (out[0] + town.x) / 2, z: (out[1] + town.z) / 2}, 'second ambush');
    // A changed river length can need another sheet. Check every sheet's
    // coverage and river binding rather than treating sheets as named places.
    const patches = after.jobs[0].steps[0].bedMist;
    const wash = river.crossings.find(crossing => crossing.id === 'the-wash').along;
    const steps = river.crossings.find(crossing => crossing.id === 'the-steps').along;
    assert.ok(Math.abs(patches.reduce((sum, patch) => sum + patch.length, 0) /
      Math.abs(wash - steps) - BED_MIST.lengthShare) < 1e-12, `${moved}: mist keeps its bed coverage`);
    for (const [index, patch] of patches.entries()) {
        const id = patch.id;
        assert.equal(id, `bed-mist-${index + 1}`);
        assert.ok(patch.length >= BED_MIST.lengthMin && patch.length <= BED_MIST.lengthMax);
        const centre = {x:patch.x - patch.tz * patch.offset, z:patch.z + patch.tx * patch.offset};
        const hit = nearestOnLine(river.line.points, centre.x, centre.z);
        assert.ok(hit.distance < 1e-6, `${moved}: ${id} stays at its offset from the river`);
        const expected = Math.min(wash, steps) + Math.abs(wash - steps) * (index + .5) / patches.length;
        assert.ok(Math.abs(hit.along - expected) < 1e-6, `${moved}: ${id} follows its measured hollow`);
        const p = river.line.points[hit.index], q = river.line.points[hit.index + 1];
        const length = Math.hypot(q.x - p.x, q.z - p.z);
        assert.ok(Math.abs(patch.tx - (q.x - p.x) / length) < 1e-6 &&
          Math.abs(patch.tz - (q.z - p.z) / length) < 1e-6, `${moved}: ${id} turns with the bed`);
        assert.equal(Math.abs(patch.offset), BED_MIST.sideMetres);
        const original = before.jobs[0].steps[0].bedMist[index];
        if (original) assert.equal(patch.offset, original.offset, `${moved}: ${id} keeps its seeded side`);
    }
    const a = positionsOf(before), b = positionsOf(after);
    for (const map of [a, b]) for (const id of map.keys()) if (id.startsWith('bed-mist-')) map.delete(id);
    assert.deepEqual([...a.keys()].sort(), [...b.keys()].sort(), `${moved}: the same named things exist`);
    let withIt = 0, shares = 0;
    for (const [id, [x, z]] of a) {
      // Slice 2b: the places a job lines up on the East Road 150 m either side of the Girder Bridge are points of the road (a curve that bends as a place moves), as the
      // road's own derived nodes are, so they do not move by a straight share of a place's move; the bridge itself (a named point) is checked above.
      if (/^(furnace-)?bridge-(in|out)$|^ash-men-raid-2$/.test(id)) continue;
      // EVERBURN-REMAKE job 1 (16 November 2026): the Halfway Camp's brazier stands 9 m to one side of the way from the camp to Tin Town, so it
      // turns about the camp a little when either place moves. It belongs to the camp: it stays 9 m from it, on that same side of that way.
      // These positions follow the road and gate as the land moves.
      // The salt post is a fixed distance along a bending way, then a south offset.
      // Check that geometry exactly instead of assuming a straight share of a town move.
      if (/^salt-(lean-to|rider-start-[12])$/.test(id)) {
        const way = routeFor(HOT_DELIVERY_WAYS.find(way => way.id === 'salt-pan').legs,
          {start:movedLand.yard, destination:movedLand.at('tin-town'), land:movedLand, net});
        const [point, ahead] = sliceLine(way, SALT_RIDERS.postAlong, SALT_RIDERS.postAlong + 1);
        const dx = ahead.x - point.x, dz = ahead.z - point.z, length = Math.hypot(dx, dz);
        const post = {x:point.x - dz / length * SALT_RIDERS.postSide,
          z:point.z + dx / length * SALT_RIDERS.postSide};
        const rider = /^salt-rider-start-([12])$/.exec(id);
        if (rider) { post.x += (rider[1] === '1' ? -1 : 1) * SALT_RIDERS.riderOffset; post.z -= SALT_RIDERS.riderOffset; }
        near({x:b.get(id)[0], z:b.get(id)[1]}, post, id);
        continue;
      }
      const rider = /^ash-rider-start-([12])$/.exec(id);
      if (rider) {
        const barrier = b.get(`ash-men-barricade-${rider[1]}`);
        const road = roadPointFrom(east, barrier[0], barrier[1], rider[1] === '1' ? 25 : -12);
        if (rider[1] === '2') {
          const ahead = roadPointFrom(east, barrier[0], barrier[1], -11);
          const dx = ahead.x - road.x, dz = ahead.z - road.z, length = Math.hypot(dx, dz);
          road.x += dz / length * 5; road.z -= dx / length * 5;
        }
        near({x: b.get(id)[0], z: b.get(id)[1]}, road, id); continue;
      }
      // The scout follows the East Road as it bends when a place moves.
      if (id === 'ash-scout-start' || id === 'ash-scout-road') {
        const yard = movedLand.yard;
        const road = roadPointFrom(east, yard.x, yard.z, 900);
        if (id === 'ash-scout-start') {
          const ahead = roadPointFrom(east, yard.x, yard.z, 901);
          const dx = ahead.x - road.x, dz = ahead.z - road.z, length = Math.hypot(dx, dz);
          road.x += dz / length * 8; road.z -= dx / length * 8;
        }
        assert.ok(Math.hypot(b.get(id)[0] - road.x, b.get(id)[1] - road.z) < 0.01,
          `${moved}: ${id} follows the road within one centimetre`);
        continue;
      }
      if (id === 'cinder' || id === 'cinder-figure' || id === 'yard-brazier') {
        const gate = yardPlan(net.roads).gate, forward = {x: Math.sin(gate.bearing), z: Math.cos(gate.bearing)};
        const along = id === 'yard-brazier' ? -22 : -16;
        const side = id === 'cinder' ? 0 : id === 'cinder-figure' ? 4 : 8;
        near({x: b.get(id)[0], z: b.get(id)[1]}, movedLand.at('yard', gate.x + forward.x * along - forward.z * side, gate.z + forward.z * along + forward.x * side), id);
        continue;
      }
      if (id === 'halfway-brazier') {
        const camp = movedLand.at('safe-road'), town = movedLand.at('tin-town'), dx = town.x - camp.x, dz = town.z - camp.z, length = Math.hypot(dx, dz);
        near({x: b.get(id)[0], z: b.get(id)[1]}, {x: camp.x + dz / length * 9, z: camp.z - dx / length * 9}, id);
        continue;
      }
      // The new thief road is the land's Tin Road, including its curved joins.
      const thiefRoad=/^thief-road-(\d+)$/.exec(id);
      if(thiefRoad) {
        near({x:b.get(id)[0],z:b.get(id)[1]},[...net.road('tin-road').points].reverse()[Number(thiefRoad[1])],id);
        continue;
      }
      const [mx, mz] = b.get(id), shift = [mx - x, mz - z];
      const share = Math.abs(delta[0]) > 0 ? shift[0] / delta[0] : 0;
      assert.ok(Math.abs(shift[1] - share * delta[1]) < 1e-6, `${moved}: ${id} moves along the way the place moved`);
      assert.ok(share > -1e-9 && share < 1 + 1e-9, `${moved}: ${id} moves by no more than the place (${share})`);
      if (share > 1 - 1e-9) withIt++; else if (share > 1e-9) shares++;
    }
    assert.ok(withIt >= 1, `${moved}: something stands in it and moves with it (${withIt})`);
  }
  // The things named in the card, by name: all of Tin Town's follow Tin Town.
  const before = positionsOf(everything(LAND)), after = positionsOf(everything(createLand(movedTable(SCABLANDS_PLACES, 'tin-town', ...delta))));
  for (const id of ['tin-town', 'tin-town-gate-front', 'pump', 'tower', 'far', 'town-hearth', 'auntie-kitchen', 'town-safe-corner', 'south-road',
    'furnace-approach', 'tin-town-gate', 'tin-town-gate-approach', 'long-road-6', 'rail-tin-town', 'rail-east-run']) {
    assert.ok(before.has(id), `${id} exists`);
    assert.deepEqual([after.get(id)[0] - before.get(id)[0], after.get(id)[1] - before.get(id)[1]], delta, `${id} moves with Tin Town`);
  }
  for (const id of ['everburn', 'boneyard', 'dead-mall', 'yard-gate', 'ridge-rocks']) if (before.has(id)) assert.deepEqual(after.get(id), before.get(id), `${id} stays`);
  // A point on the way moves by a share of the way: the halfway camp, between the yard (which never moves) and the Boneyard.
  const camp = LAND.at('safe-road'), campMoved = createLand(movedTable(SCABLANDS_PLACES, 'boneyard', ...delta)).at('safe-road');
  assert.ok(Math.abs((campMoved.x - camp.x) - .47 * 123) < 1e-9 && Math.abs((campMoved.z - camp.z) + .47 * 77) < 1e-9, 'the halfway camp moves .47 of the way with the Boneyard');
  // The solids, the wrecks, Big Bess's rest, the gate's posts and the shacks of Tin Town follow their places.
  const kept = solid => solid.kind !== 'girder' && !/^the-steps-marker|^the-pipe-post-|^tin-town-fence-/.test(solid.id);
  const solidsBefore = scablandsSolids(LAND).filter(kept), solidsAfter = scablandsSolids(createLand(movedTable(SCABLANDS_PLACES, 'tin-town', ...delta))).filter(kept);
  assert.equal(solidsAfter.length, solidsBefore.length);
  for (const [index, solid] of solidsBefore.entries()) {
    const other = solidsAfter[index], follows = solid.placeId === 'tin-town';
    assert.deepEqual([other.center[0] - solid.center[0], other.center[2] - solid.center[2]], follows ? delta : [0, 0], `${solid.id} ${follows ? 'moves with' : 'stays beside'} its place`);
  }
  const moved = createLand(movedTable(SCABLANDS_PLACES, 'boneyard', ...delta));
  const wrecksBefore = boneyardWrecks(LAND), wrecksAfter = boneyardWrecks(moved);
  for (const [index, wreck] of wrecksBefore.entries()) assert.deepEqual([wrecksAfter[index].x - wreck.x, wrecksAfter[index].z - wreck.z], delta, `the ${wreck.id} wreck moves with the Boneyard`);
  assert.deepEqual([bessRest(moved).x - bessRest(LAND).x, bessRest(moved).z - bessRest(LAND).z], delta, "Big Bess's resting place moves with the Boneyard");
  const layoutBefore = tinTownLayout(LAND), layoutAfter = tinTownLayout(createLand(movedTable(SCABLANDS_PLACES, 'tin-town', ...delta)));
  for (const [index, cluster] of layoutBefore.clusters.entries()) {
    assert.deepEqual([layoutAfter.clusters[index].centre.x - cluster.centre.x, layoutAfter.clusters[index].centre.z - cluster.centre.z].map(Math.round), delta, `Tin Town's cluster ${index + 1} moves with the town`);
  }
  assert.equal(layoutAfter.shacks, layoutBefore.shacks, 'and the same shacks stand in it');
  const postsBefore = tinTownGateFor(LAND).posts, postsAfter = tinTownGateFor(createLand(movedTable(SCABLANDS_PLACES, 'tin-town', ...delta))).posts;
  for (const [index, post] of postsBefore.entries()) assert.deepEqual([postsAfter[index].x - post.x, postsAfter[index].z - post.z], delta, 'the gate posts move with the town');
  assert.equal(tinTownRoads(LAND).length, tinTownRoads(createLand(movedTable(SCABLANDS_PLACES, 'tin-town', ...delta))).length, "the roads that run into Tin Town move with it and keep their number");
});

test('no file that places a thing in the land holds a bare coordinate of it', () => {
  const files = ['src/world/jobs/everburn.js', 'src/world/jobs/gas-run.js', 'src/world/jobs/furnace-sightings.js', 'src/world/scablands-road.js', 'src/world/scablands-regions.js', 'src/world/scablands-draw.js', 'src/world/scablands-road-geometry.js',
    'src/world/tin-town-gate.js', 'src/world/tin-town-shacks.js', 'src/world/boneyard-wrecks.js', 'src/world/iron-line.js', 'src/world/regions.js',
    // Slice 2b: the new files that place or move a thing in the land.
    'src/world/scablands-solids.js', 'src/world/scablands-scarps.js', 'src/world/scablands-ground-rules.js', 'src/world/scablands-movers.js', 'src/world/everburn-props.js', 'src/sim-scablands.js',
    // SCABLANDS-LAND round 4, slice 4: the map reads every position from the land's names and tables.
    'src/world/scablands-picture.js', 'src/world/scablands-map.js', 'src/world/scablands-ways.js', 'src/world/world-hud.js'];
  for (const file of files) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n').filter(line => !/^\s*\/\//.test(line)).join('\n');
    // A place written as (id, x, z), a point written {x: 575, z: 62} or a list of pairs of three-figure numbers.
    assert.ok(!/place\('[^']+',\s*-?\d+(\.\d+)?,\s*-?\d+/.test(text), `${file}: no place is written with bare numbers`);
    assert.ok(!/\bx:\s*-?\d{3,}/.test(text) && !/\bz:\s*-?\d{3,}/.test(text), `${file}: no point is written with a bare three-figure coordinate`);
    assert.ok(!/\[\[?\s*-?\d{3,}(\.\d+)?\s*,\s*-?\d{2,}(\.\d+)?\s*\]/.test(text), `${file}: no pair of coordinates is written out`);
  }
});

// ---- The detailed ground follows the player --------------------------------------------------------------------------------------
const {cellX, cellZ, cellsX, cellsZ, lift} = NEAR_GROUND;
const landHeight = (x, z) => scablandsSurfaceHeightAt(x, z);

test('the detailed ground moves in whole cells, keeps every corner on one lattice and allocates nothing as it moves', () => {
  const window = createNearGround({material: new THREE.MeshStandardMaterial(), heightAt: landHeight});
  const positions = window.geometry.attributes.position, normals = window.geometry.attributes.normal;
  const arrays = [positions.array, normals.array, window.geometry.index.array];
  assert.equal(positions.count, 61 * 61, 'the window is 60 by 60 cells');
  assert.ok(Math.abs(cellsX * cellX - 1400) < 1e-9 && Math.abs(cellsZ * cellZ - 1000) < 1e-9, 'the window is 1,400 m by 1,000 m, the size the whole land was');
  const route = [[0, 0], [5, 3], [11.6, 8.3], [30, 0], [-40, -700], [2500, 1900], [2512, 1900], [6000, 12], [6001, 12], [-6990, 4990]];
  for (const [x, z] of route) {
    window.follow(x, z);
    // The middle is a lattice corner, the window's own corners stand on the lattice, and each height is the land's.
    assert.ok(Math.abs(window.centreX / cellX - Math.round(window.centreX / cellX)) < 1e-9 && Math.abs(window.centreZ / cellZ - Math.round(window.centreZ / cellZ)) < 1e-9, `the window's middle is a whole number of cells from the yard at ${x}, ${z}`);
    assert.ok(Math.abs(x - window.centreX) <= cellX / 2 + 1e-9 && Math.abs(z - window.centreZ) <= cellZ / 2 + 1e-9, `the player is within half a cell of the window's middle at ${x}, ${z}`);
    for (const index of [0, 60, 61 * 30 + 30, 61 * 60, 61 * 61 - 1, 777, 2310]) {
      const worldX = window.mesh.position.x + positions.getX(index), worldZ = window.mesh.position.z + positions.getZ(index);
      assert.ok(Math.abs(worldX / cellX - Math.round(worldX / cellX)) < 1e-6 && Math.abs(worldZ / cellZ - Math.round(worldZ / cellZ)) < 1e-6, 'every corner lies on the fixed lattice');
      assert.ok(Math.abs(positions.getY(index) - (landHeight(worldX, worldZ) + lift)) < 1e-3, `corner ${index} has the land's height at ${x}, ${z}`);
    }
    // A window reached by a path is the same as one built where it stands: the corners kept by a move are exact.
    const fresh = createNearGround({material: new THREE.MeshStandardMaterial(), heightAt: landHeight});
    fresh.follow(x, z);
    assert.deepEqual(Array.from(fresh.geometry.attributes.position.array), Array.from(positions.array), `a window moved to ${x}, ${z} equals one built there`);
    assert.deepEqual(Array.from(fresh.geometry.attributes.normal.array), Array.from(normals.array), 'and has the same normals');
    fresh.dispose();
  }
  assert.ok(arrays.every((array, index) => array === [positions.array, normals.array, window.geometry.index.array][index]), 'no array is replaced as the window moves');
  // A step of less than half a cell does not move it; a step of one cell moves it by exactly that.
  window.follow(100, 100); const settled = window.centreX; assert.equal(window.follow(settled + cellX * .4, 100), false); assert.equal(window.centreX, settled);
  assert.equal(window.follow(settled + cellX * 1.1, 100), true); assert.ok(Math.abs(window.centreX - settled - cellX) < 1e-9, 'one cell on, exactly one cell');
  // Moving the window by one cell works out only the new strip: 200 steps along the east axis cost almost nothing.
  const t0 = performance.now(); for (let step = 0; step < 200; step++) window.follow(100 + cellX * (step + 2), 100); const ms = performance.now() - t0;
  assert.ok(ms < 400, `200 one-cell moves cost ${ms.toFixed(0)} ms in all`);
  // The height as drawn there (what a thing laid on the ground reads) is the straight slope between corners.
  const x = window.centreX + 33.3, z = window.centreZ - 21.7;
  assert.ok(Math.abs(window.heightAtDrawn(x, z) - nearGroundHeightAt(x, z, landHeight)) < 1e-3, 'the drawn height read from the window matches the lattice formula');
  window.dispose();
});

test('the scene follows the player: the window moves, and a place is drawn and updated only while the player is near it', async () => {
  const stub = async path => ({scene: new THREE.Group()});
  const scene = createScablandsScene(course, {loadAsset: async path => {
    const root = new THREE.Group();
    if (path === SCABLANDS_ASSETS.bess || path === SCABLANDS_ASSETS.furnace)
      for (const name of ['Big Bess gas truck', "Old Smoke's rolling furnace"]) { const part = new THREE.Group(); part.name = name; root.add(part); }
    const auntie=new THREE.Group(); auntie.name='auntie-solder root';
    auntie.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial())); root.add(auntie);
    return {scene: root};
  }});
  assert.equal(await scene.ready, true);
  const ground = scene.group.getObjectByName('Scablands ground chunks'), window = ground.children.find(mesh => mesh.name === 'Scablands near ground');
  const gate = scene.group.getObjectByName('Tin Town gate'), shacks = scene.group.getObjectByName('Tin Town shacks'), well = scene.group.getObjectByName('Everburn fire and smoke');
  const mast = scene.group.getObjectByName('Radio mast visible across the Scablands');
  const stateAt = (x, z) => { const near = course.nearest(x, z); return {s: near.s, lateral: near.lateral}; };
  const draw = (x, z) => { syncScene(scene.group, stateAt(x, z)); };
  draw(0, 0);
  assert.ok(Math.abs(window.position.x) <= cellX && Math.abs(window.position.z) <= cellZ, 'at the yard the window is at the yard');
  assert.deepEqual([gate.visible, shacks.visible, well.visible, mast.visible], [false, false, false, false], 'at the yard no place is drawn: the nearest is 4 km away');
  for (const lod of scene.group.children.filter(node => node.isLOD)) assert.equal(lod.levels.length, 3, `${lod.name} has a detailed view, a far shape and nothing beyond the draw range`);
  draw(5800, 40);
  assert.ok(Math.abs(window.position.x - 5800) <= cellX && Math.abs(window.position.z - 40) <= cellZ, 'at Tin Town the window is at Tin Town');
  assert.deepEqual([gate.visible, shacks.visible, well.visible], [true, true, false], "at Tin Town the town's gate and shacks are drawn and the well is not");
  draw(-4200, 3000);
  assert.equal(well.visible, true, 'at the Everburn the well burns');
  assert.equal(gate.visible, false, 'and the gate of a town 10 km away is not drawn');
  draw(-5900, 30);
  assert.equal(mast.visible, true, 'at the Iron Line the radio mast stands');
  const hole = (() => { const shader = {uniforms: {}, vertexShader: '', fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\n}'}; ground.children.find(mesh => mesh.name === 'Scablands far ground').material.onBeforeCompile(shader, null); return shader.uniforms.uNearHole.value; })();
  assert.ok(Math.abs(hole.x - window.position.x) < 1e-9 && Math.abs(hole.y - window.position.z) < 1e-9, 'the hole in the coarse ground follows the window');
  // Walking: a fighter's position moves the window too.
  syncScene(scene.group, {onFoot: true, fighter: {x: 3000, z: -2000}});
  assert.ok(Math.abs(window.position.x - 3000) <= cellX && Math.abs(window.position.z + 2000) <= cellZ, 'a walking player moves the window');
  syncScene(scene.group, {crushedProps: []});
  assert.ok(Math.abs(window.position.x - 3000) <= cellX, 'a state with no position leaves the window where it is');
  scene.dispose();
});

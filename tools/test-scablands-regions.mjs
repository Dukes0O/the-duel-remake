// SCABLANDS-LAND round 4, slice 2a: the road net, the regions, the dry river and the rises, and how the ground drives. Each check is the
// card's ("Slice 2 design"): every road holds at the road's top speed; every point of the land has exactly one region; each region drives
// as the card's table says; the old dirt ring and the delivery road are gone; a place is not seen from the last one; the river can be
// crossed only at its five crossings. The ember's three drives are in tools/test-ember-pot.mjs.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {Course} from '../src/course.js';
import {CARS} from '../src/config.js';
import {ARENA_VENUES, arenaFloorSpeed} from '../src/arena/venues.js';
import {placeActor} from '../src/arena/arena-event.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {SCABLANDS_PLACES, SCABLANDS_LAYOUT} from '../src/world/scablands.js';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {ROAD_NET, EAST_ROAD, ROAD_HALF_WIDTH, roadNet, distanceToNet, distanceToRoad} from '../src/world/scablands-road.js';
import {resampleRoad, pointAlong} from '../src/world/scablands-road-geometry.js';
import {DRIVE, REGION_ORDER, RISES, RISE, RIVER, RIVER_LAND, CROSSINGS, scablandsDriveAt, scablandsRegionAt, riseHeightAt, riverDepthAt,
  riverGorgeDepthAt, riverDistanceAt, edgeWarp, polygonMargin, GROUND_AREAS} from '../src/world/scablands-regions.js';
import {scablandsHeightAt, scablandsPlainHeightAt} from '../src/world/scablands-height.js';
import {scablandsSurfaceAt} from '../src/world/scablands-ground.js';
import {onScablandsRoad} from '../src/world/scablands-road.js';

const MPH_TO_KMH = 1.609344, DT = 1 / 120;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const placeOf = id => SCABLANDS_PLACES.find(place => place.id === id);

// ---- Roads ----------------------------------------------------------------------------------------------------------------------------
test('the road net has twelve named roads, each a curve with corners no tighter than 450 m, meeting the places the jobs name', () => {
  assert.equal(ROAD_NET.roads.length, 12);
  for (const road of ROAD_NET.roads) {
    assert.ok(road.name && road.length > 1000, `${road.id} has a name and a length`);
    assert.ok(road.minRadius >= 450 - 1e-6, `${road.id}'s tightest corner is ${Math.round(road.minRadius)} m`);
    assert.equal(road.halfWidth, ROAD_HALF_WIDTH);
  }
  assert.ok(EAST_ROAD.length > 7000 && EAST_ROAD.length < 8500, `the East Road is ${Math.round(EAST_ROAD.length)} m (the card says about 7 km)`);
  // Job 1's named points stand on the East Road: the halfway camp, the Girder Bridge and both barricades.
  for (const id of ['safe-road', 'girder-bridge', 'ash-barricade-1', 'ash-barricade-2']) {
    const point = LAND.at(id), distance = distanceToRoad(point.x, point.z, EAST_ROAD.points);
    assert.ok(distance < 1.5, `${id} stands on the East Road (${distance.toFixed(2)} m from its line)`);
  }
  // The yard itself is not road; every road starts 30 m from it.
  assert.equal(onScablandsRoad(0, 0), false);
  for (const road of ROAD_NET.roads.filter(road => Math.hypot(road.points[0].x, road.points[0].z) < 100)) assert.ok(Math.abs(Math.hypot(road.points[0].x, road.points[0].z) - 30) < .01, `${road.id} starts 30 m from the yard`);
  // Every other end is a place's own approach: within 160 m of one of the eight places, or at a junction on another road.
  for (const road of ROAD_NET.roads) for (const end of [road.points[0], road.points.at(-1)]) {
    const yard = Math.hypot(end.x, end.z) < 100, place = SCABLANDS_PLACES.some(row => Math.hypot(end.x - row.x, end.z - row.z) < 160);
    const junction = ROAD_NET.roads.some(other => other !== road && distanceToRoad(end.x, end.z, other.points) < .5), camp = Math.hypot(end.x - LAND.at('safe-road').x, end.z - LAND.at('safe-road').z) < 1;
    assert.ok(yard || place || junction || camp, `${road.id} ends at a place, the yard, the camp or another road (${Math.round(end.x)}, ${Math.round(end.z)})`);
  }
});

test('the old dirt ring round the yard and the delivery road are gone', () => {
  // The old ring was an ellipse 600 m by 430 m round the yard: a point on it is road only where a road of the net passes it.
  for (let step = 0; step < 36; step++) {
    const x = Math.cos(step / 36 * Math.PI * 2) * 600, z = Math.sin(step / 36 * Math.PI * 2) * 430;
    assert.equal(scablandsSurfaceAt(x, z).road, distanceToNet(x, z) <= ROAD_HALF_WIDTH, `the ring no longer passes ${Math.round(x)}, ${Math.round(z)}`);
  }
  for (const file of ['src/world/scablands-road.js', 'src/world/scablands-scene.js', 'src/world/scablands-ground.js', 'src/world/jobs/everburn.js', 'src/world/jobs/ember-rule.js', 'src/world/jobs/steps/carry.js']) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.ok(!/DELIVERY_ROAD|deliveryRoad|ellipseClosest|roadRibbon|roughFreeKmh|onRoad: view/.test(text), `${file} no longer holds the ring or the delivery road`);
  }
});

test('moving a place moves the roads that stand by it, and keeps each road a curve', () => {
  for (const id of ['tin-town', 'boneyard', 'dead-mall', 'everburn']) {
    const before = roadNet(LAND), moved = roadNet(createLand(movedTable(SCABLANDS_PLACES, id, 150, -90)));
    const shifted = moved.roads.filter((road, index) => Math.hypot(road.nodes.at(-1).x - before.roads[index].nodes.at(-1).x, road.nodes.at(-1).z - before.roads[index].nodes.at(-1).z) > 100 ||
      Math.hypot(road.nodes[0].x - before.roads[index].nodes[0].x, road.nodes[0].z - before.roads[index].nodes[0].z) > 100);
    assert.ok(shifted.length >= 1, `${id}: a road follows it`);
    for (const road of moved.roads) assert.ok(road.minRadius >= 300, `${id}: ${road.id} is still a curve (${Math.round(road.minRadius)} m)`);
  }
});

// The way a car holds a road: a driver aims 90 m ahead of its nearest point on the line, as the ember test's does. The car is the quickest
// in the game (a Koenigsegg Jesko, 213 km/h on this ground) at full throttle, and then Hot Delivery's own car, the Falcone F42 (185 km/h).
function driveRoad(road, carId) {
  const line = road.points, duel = new Duel({seed: 1989, featureFlags: {'hidden-road': true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car: carId, seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
  const state = duel.state, course = duel.course;
  state.opponents[0].finished = true;
  const start = line[0], pose = course.nearest(start.x, start.z);
  placeActor(duel, state, {s: pose.s, lateral: pose.lateral});
  state.headingError = wrap(Math.atan2(line[1].x - start.x, line[1].z - start.z) - course.at(pose.s).heading);
  const aim = (x, z) => {
    let best = {index: 0, t: 0}, nearest = Infinity;
    for (let index = 0; index + 1 < line.length; index++) {
      const a = line[index], b = line[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)), d = (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2;
      if (d < nearest) { nearest = d; best = {index, t}; }
    }
    let index = best.index, left = 90 + best.t * Math.hypot(line[index + 1].x - line[index].x, line[index + 1].z - line[index].z);
    for (;;) {
      const a = line[index], b = line[index + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
      if (left <= length || index + 2 >= line.length) { const t = Math.min(1, left / length); return {x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, off: Math.sqrt(nearest)}; }
      left -= length; index++;
    }
  };
  const end = line.at(-1);
  let worst = 0, fastest = 0, steps = 0, reached = false;
  const limit = Math.ceil(road.length / 12 * 120);
  for (; steps < limit; steps++) {
    const here = course.worldAt(state.s, state.lateral), target = aim(here.x, here.z);
    worst = Math.max(worst, target.off); fastest = Math.max(fastest, Math.abs(state.speedMph) * MPH_TO_KMH);
    const heading = course.at(state.s).heading + state.headingError, turn = wrap(Math.atan2(target.x - here.x, target.z - here.z) - heading);
    duel.setInput({throttle: 1, brake: 0, steer: Math.max(-1, Math.min(1, -turn * 2)), boost: false, interact: false});
    duel.step(DT);
    if (Math.hypot(here.x - end.x, here.z - end.z) < 25) { reached = true; break; }
  }
  return {worst, fastest, reached, seconds: steps * DT};
}

test('every road holds at the top speed of the quickest car and of Hot Delivery\'s: the car stays inside the 14 m half width', {timeout: 600000}, () => {
  const rows = [];
  for (const carId of ['koenigsegg_jesko', 'falcone_f42']) for (const road of ROAD_NET.roads) {
    const out = driveRoad(road, carId);
    rows.push(`${carId} ${road.id}: ${out.fastest.toFixed(0)} km/h, ${out.worst.toFixed(1)} m off the line, ${out.seconds.toFixed(0)} s`);
    assert.ok(out.reached, `${carId} reaches the end of ${road.id}`);
    assert.ok(out.fastest > (carId === 'falcone_f42' ? 150 : 180), `${carId} is at the road's speed on ${road.id} (${out.fastest.toFixed(0)} km/h)`);
    assert.ok(out.worst <= ROAD_HALF_WIDTH * .75, `${carId} holds ${road.id} inside the road (${out.worst.toFixed(1)} m off its line, the half width is ${ROAD_HALF_WIDTH} m)`);
  }
  console.log(rows.join('\n'));
});

// ---- Regions --------------------------------------------------------------------------------------------------------------------------
// The card's table: top speed share, grip, the ember's safe speed (km/h).
const CARD = Object.freeze({road: [1, .95, Infinity], 'salt-pan': [1.25, .80, Infinity], flats: [.75, .90, 90], 'scab-plates': [.45, .85, 50],
  'river-bed': [.80, .75, 80], 'river-bed-soft': [.30, .75, 70], sand: [.35, .60, Infinity], burn: [.75, .90, 90], 'wreck-fields': [.75, .90, 90],
  // Slice 2b: the Steps' ledges, on the scab plates (their own id, cue and dust), where the ember is safe only under 20 km/h.
  steps: [.35, .85, 20]});

test('each region drives as the card\'s table says, and a change of ground names a sound cue', () => {
  assert.deepEqual(Object.keys(DRIVE).sort(), Object.keys(CARD).sort());
  for (const [key, [top, grip, safe]] of Object.entries(CARD)) {
    assert.equal(DRIVE[key].top, top, `${key}: top speed share`);
    assert.equal(DRIVE[key].grip, grip, `${key}: grip`);
    assert.equal(DRIVE[key].safeKmh, safe, `${key}: the ember is safe up to`);
    assert.ok(Number.isInteger(DRIVE[key].dust) && DRIVE[key].roughness >= 0 && DRIVE[key].scrub > 0, `${key}: dust colour, shake and drag`);
  }
  assert.ok(DRIVE['scab-plates'].roughness >= 4 * DRIVE.road.roughness && DRIVE['scab-plates'].shake > DRIVE.flats.shake, 'scab rock shakes the car and the camera most');
  assert.deepEqual(REGION_ORDER, ['road', 'river-bed', 'wreck-fields', 'sand', 'burn', 'salt-pan', 'scab-plates', 'flats'], 'the regions are read in the card\'s order');
  const cues = Object.values(DRIVE).map(row => row.cue);
  assert.equal(new Set(cues).size, 9, 'each ground has its own cue (the Steps share the scab plates cue)');
  assert.equal(DRIVE.steps.id, 'scab-plates', 'the Steps are scab plates to the cue and the dust');
  for (const cue of cues) assert.ok(SOUND_BANK[cue], `${cue} is in the sound bank`);
});

test('every point of the land has exactly one region, and every region is found where the card puts it', () => {
  const found = new Map();
  for (let x = -6900; x <= 6900; x += 150) for (let z = -4900; z <= 4900; z += 150) {
    const ground = scablandsDriveAt(x, z);
    assert.ok(Object.values(DRIVE).includes(ground), `a region at ${x}, ${z}`);
    assert.equal(scablandsRegionAt(x, z), ground.id);
    assert.equal(scablandsDriveAt(x, z), ground, 'the same point gives the same answer');
    found.set(ground.id, (found.get(ground.id) ?? 0) + 1);
  }
  for (const id of ['road', 'river-bed', 'wreck-fields', 'sand', 'burn', 'salt-pan', 'scab-plates', 'flats']) assert.ok(found.get(id) > 0, `${id} is found on the land`);
  const at = (id, dx = 0, dz = 0) => LAND.at(id, dx, dz), idAt = point => scablandsRegionAt(point.x, point.z);
  assert.equal(idAt(at('boneyard', 0, 500)), 'wreck-fields', 'round the Boneyard');
  assert.equal(idAt(at('ships-in-sand', 300, 100)), 'sand', 'round the Ships');
  assert.equal(idAt(at('everburn', -400, 300)), 'burn', 'round the Everburn');
  assert.equal(idAt(LAND.at('ash-barricade-1')), 'road', 'on the East Road');
  assert.equal(idAt(at('yard', 300, 0)), 'flats', 'east of the yard, before the plates');
  assert.equal(idAt(at('yard', 2000, 0)), 'scab-plates', 'across the plates between the yard and Tin Town');
  assert.equal(idAt(at('yard', 3500, -3000)), 'salt-pan', 'on the pan');
  // The river's bed is its own region, between the roads; a crossing's deck is a road.
  const mid = RIVER_LAND.line.points[RIVER_LAND.line.points.length >> 1];
  assert.equal(idAt(mid), 'river-bed', 'the middle of the river is the bed');
  assert.equal(idAt(LAND.at('girder-bridge')), 'road', 'the Girder Bridge is road');
});

test('the edges between regions are uneven, and the whole land can be asked about cheaply', () => {
  let widest = 0;
  for (let x = -7000; x <= 7000; x += 37) for (let z = -5000; z <= 5000; z += 331) widest = Math.max(widest, Math.abs(edgeWarp(x, z, 1.1)));
  assert.ok(widest > 60 && widest < 125, `region edges move by up to ${widest.toFixed(0)} m`);
  const pan = GROUND_AREAS.polygons.find(area => area.id === 'salt-pan').points;
  // Walking a straight line across the pan's edge, the edge is not at one place: the margin and the warped margin differ by tens of metres.
  let apart = 0;
  for (let x = 1000; x <= 5000; x += 20) apart = Math.max(apart, Math.abs(polygonMargin(pan, x, -1500) - (polygonMargin(pan, x, -1500) + edgeWarp(x, -1500, 1.1))));
  assert.ok(apart > 30, `the pan's edge is moved by up to ${apart.toFixed(0)} m from its straight outline`);
  const started = performance.now();
  let sink = 0;
  for (let i = 0; i < 20000; i++) sink += scablandsDriveAt((i * 7919) % 14000 - 7000, (i * 104729) % 10000 - 5000).top;
  const micros = (performance.now() - started) / 20000 * 1000;
  assert.ok(sink > 0 && micros < 12, `a point is classified in ${micros.toFixed(2)} microseconds`);
});

// ---- How the ground drives, in a real Duel ---------------------------------------------------------------------------------------------
// A car at full throttle in a straight line from `from` toward `toward` for `seconds`: the speed it settles at (km/h) and the ground it ended on.
function settle(from, toward, seconds, initialKmh = 120, carId = 'falcone_f42') {
  const duel = new Duel({seed: 1989, featureFlags: {'hidden-road': true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car: carId, seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
  const state = duel.state, course = duel.course;
  state.opponents[0].finished = true;
  const pose = course.nearest(from.x, from.z);
  placeActor(duel, state, {s: pose.s, lateral: pose.lateral});
  state.headingError = wrap(Math.atan2(toward.x - from.x, toward.z - from.z) - course.at(pose.s).heading);
  state.speedMph = initialKmh / MPH_TO_KMH;
  let ground = null;
  for (let step = 0; step < seconds * 120; step++) {
    const here = course.worldAt(state.s, state.lateral), heading = course.at(state.s).heading + state.headingError;
    const turn = wrap(Math.atan2(toward.x - here.x, toward.z - here.z) - heading);
    duel.setInput({throttle: 1, brake: 0, steer: Math.max(-1, Math.min(1, -turn * 2)), boost: false, interact: false});
    duel.step(DT);
    ground = scablandsDriveAt(here.x, here.z);
  }
  return {kmh: Math.abs(state.speedMph) * MPH_TO_KMH, ground, state, duel};
}

test('the ground drives by region: the top speed a car settles at follows the card\'s share of the road\'s', {timeout: 300000}, () => {
  const car = CARS.falcone_f42, roadKmh = arenaFloorSpeed(SCABLANDS_LAYOUT, car.topSpeed) * MPH_TO_KMH;
  // A straight stretch of each ground, found on the land (the whole run must stay on one ground).
  const straight = (id, from, heading, metres = 3500) => ({from, toward: {x: from.x + Math.sin(heading) * metres, z: from.z + Math.cos(heading) * metres}, id});
  // Each is a stretch found on the land that lies wholly in one ground and 60 m or more from every road.
  const tries = [
    straight('flats', LAND.at('yard', -1400, -1100), Math.PI * .5, 1800),
    straight('scab-plates', LAND.at('yard', 600, 0), Math.PI * .5, 1500),
    straight('salt-pan', LAND.at('yard', 1300, -1700), Math.PI * .5, 2800),
    straight('sand', LAND.at('yard', -400, -4400), Math.PI * .5, 1800),
    straight('wreck-fields', LAND.at('yard', 3400, 2000), Math.PI * .5, 800),
  ];
  const speeds = {road: settle(EAST_ROAD.points[0], EAST_ROAD.points[1], 20, 170).kmh};
  assert.ok(speeds.road > roadKmh * .95 && speeds.road < roadKmh * 1.25, `on the road the car settles at the floor's speed or a little over it (${speeds.road.toFixed(0)} km/h, the floor gives ${roadKmh.toFixed(0)})`);
  for (const row of tries) {
    const out = settle(row.from, row.toward, row.id === 'salt-pan' ? 30 : 16, row.id === 'salt-pan' ? 170 : 120);
    speeds[row.id] = out.kmh;
    assert.equal(out.ground.id, row.id, `${row.id}: the car ends on that ground (${out.ground.id})`);
    // The floor's speed is a soft limit (a car at full throttle settles a little above it), so each ground is read against the road's own settled speed.
    const wanted = speeds.road * DRIVE[row.id].top;
    assert.ok(Math.abs(out.kmh - wanted) / wanted < .16, `${row.id}: the car settles at ${out.kmh.toFixed(0)} km/h (the card's share of the road's ${speeds.road.toFixed(0)} is ${wanted.toFixed(0)})`);
  }
  assert.ok(speeds['salt-pan'] > speeds.road * 1.05 && speeds['scab-plates'] < speeds.road * .55 && speeds.sand < speeds.road * .45 && speeds.flats < speeds.road, 'the pan is the fastest ground; the plates and the sand are slow');
  console.log(Object.entries(speeds).map(([id, kmh]) => `${id} ${kmh.toFixed(0)} km/h`).join(', '), `(road limit ${roadKmh.toFixed(0)})`);
});

test('the same drive twice gives the same speed, and no other venue drives by region', () => {
  const first = settle(LAND.at('yard', -2000, 800), LAND.at('yard', -500, 800), 10), second = settle(LAND.at('yard', -2000, 800), LAND.at('yard', -500, 800), 10);
  assert.equal(first.kmh, second.kmh);
  const duel = new Duel({seed: 7, featureFlags: {'hidden-road': true}});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scrapdome', mode: 'last-car-rolling', car: 'falcone_f42', seed: 7, opponents: [{car: 'dusthawk_rally'}]}), true);
  const surface = duel._drivingSurface(100, 0), floor = duel.course.def.scrapdome;
  assert.equal(surface.region, undefined, 'the Scrapdome floor has no region');
  assert.equal(surface.traction, floor.floorTraction);
  assert.equal(surface.scrub, floor.floorScrub);
  assert.equal(surface.roughness, floor.floorRoughness);
  assert.equal(surface.speedLimit, arenaFloorSpeed(floor, duel.car.topSpeed));
});

// ---- The dry river and its crossings --------------------------------------------------------------------------------------------------
test('the dry river is sunk 8 m with banks, its bed is its own region, and there are five named crossings', () => {
  assert.equal(RIVER_LAND.crossings.length, 5);
  assert.deepEqual(CROSSINGS.map(row => row.id).sort(), ['girder-bridge', 'south-ford', 'the-pipe', 'the-steps', 'the-wash']);
  const points = RIVER_LAND.line.points, spot = points[8];
  const heading = Math.atan2(points[9].x - points[7].x, points[9].z - points[7].z), across = distance => ({x: spot.x + Math.cos(heading) * distance, z: spot.z - Math.sin(heading) * distance});
  // Far from a crossing the gorge is the full 8 m in the middle, none beyond 78 m, and the banks run between.
  const depth = distance => riverDepthAt(across(distance).x, across(distance).z);
  assert.ok(Math.abs(depth(0) - 8) < .05 && Math.abs(depth(30) - 8) < .05 && Math.abs(depth(52) - 8) < .05, 'the bed is 8 m below the plain across its floor');
  assert.ok(depth(65) > 0 && depth(65) < 8 && depth(70) < depth(60) && depth(78) < .01 && depth(90) === 0, 'the banks climb from the bed\'s foot to the plain');
  assert.equal(scablandsRegionAt(across(10).x, across(10).z) === 'river-bed' || scablandsRegionAt(across(10).x, across(10).z) === 'road', true, 'the bed is a region of its own');
  // The land the car drives on is the plain less the river's cut, so that a car can still cross it anywhere (2b makes the banks solid).
  const mid = across(0), plain = scablandsPlainHeightAt(mid.x, mid.z);
  assert.ok(Math.abs(scablandsHeightAt(mid.x, mid.z) - (plain - 8)) < .06, 'the drivable height in the bed is 8 m under the plain');
  assert.ok(Math.abs(riverGorgeDepthAt(mid.x, mid.z) - 8) < .05 && riverDistanceAt(mid.x, mid.z) < .5, 'the gorge is drawn from the same line');
  // Every named crossing is on the river, and a road crosses the river only at one of them.
  for (const crossing of RIVER_LAND.crossings) assert.ok(riverDistanceAt(crossing.x, crossing.z) < 1, `${crossing.id} stands on the river's line`);
  for (const road of ROAD_NET.roads) for (const sample of resampleRoad(road.points, 10)) {
    if (riverDistanceAt(sample.x, sample.z) > RIVER.footHalfWidth) continue;
    const near = RIVER_LAND.crossings.some(crossing => Math.hypot(crossing.x - sample.x, crossing.z - sample.z) < crossing.reach + 80);
    assert.ok(near, `${road.id} crosses the river at a named crossing (${Math.round(sample.x)}, ${Math.round(sample.z)})`);
  }
  // The Girder Bridge and the Pipe are decks at the plain's level over the gorge; the Wash and the South Ford are filled; the Steps are ledges.
  const bridge = RIVER_LAND.crossings.find(row => row.id === 'girder-bridge'), pipe = RIVER_LAND.crossings.find(row => row.id === 'the-pipe');
  for (const deck of [bridge, pipe]) {
    assert.ok(riverDepthAt(deck.x, deck.z) < .01, `${deck.id}: the road across is level with the plain`);
    assert.ok(riverGorgeDepthAt(deck.x, deck.z) > 6, `${deck.id}: the gorge runs on beneath it`);
  }
  for (const id of ['the-wash', 'south-ford']) {
    const crossing = RIVER_LAND.crossings.find(row => row.id === id);
    assert.ok(riverDepthAt(crossing.x, crossing.z) < 8 * (1 - crossing.fill + .1), `${id}: the gorge is filled where the road crosses`);
  }
});

// ---- The rises ------------------------------------------------------------------------------------------------------------------------
test('rises of 20 to 40 m stand between the places; the places\' own ground stays flat; a car can drive over every rise', () => {
  assert.ok(RISES.length >= 20, `${RISES.length} rises`);
  for (const rise of RISES) {
    assert.ok(rise.height >= 20 && rise.height <= 40, `${rise.road} end ${rise.end}: ${rise.height} m high`);
    assert.ok(Math.abs(riseHeightAt(rise.x, rise.z) - rise.height) < 1, 'a rise reaches its height in the middle');
    for (const place of SCABLANDS_PLACES) assert.ok(Math.hypot(rise.x - place.x, rise.z - place.z) > 600, `${rise.road} end ${rise.end}: its middle is over 600 m from ${place.name}`);
    assert.ok(Math.hypot(rise.x, rise.z) > 1000, 'and over 1,000 m from the yard');
  }
  // 600 to 1,000 m across: the rise is lifted by at least half its height over 600 m and not at all beyond 1,000 m... along the road.
  const middle = RISES[0], along = {x: Math.sin(middle.heading), z: Math.cos(middle.heading)};
  assert.ok(riseHeightAt(middle.x + along.x * 300, middle.z + along.z * 300) > 1 && riseHeightAt(middle.x + along.x * 470, middle.z + along.z * 470) === 0, 'a rise is 920 m long along the road');
  // Gentle: the steepest slope of the drawn land across any rise is under 12 percent; along every road, the grade is gentle too.
  let steepest = 0;
  for (let x = -6000; x <= 6000; x += 20) for (let z = -4000; z <= 4000; z += 40) steepest = Math.max(steepest, Math.hypot((riseHeightAt(x + 10, z) - riseHeightAt(x - 10, z)) / 20, (riseHeightAt(x, z + 10) - riseHeightAt(x, z - 10)) / 20));
  assert.ok(steepest < .12, `the steepest slope of any rise is ${(steepest * 100).toFixed(1)} percent`);
  let steepRoad = 0;
  for (const road of ROAD_NET.roads) {
    const samples = resampleRoad(road.points, 20);
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      // (Not where the road is in the river's gorge, or on a place's own ramp from the plain to its flat ground.)
      if (riverDistanceAt(a.x, a.z) < 100 || riverDistanceAt(b.x, b.z) < 100 || SCABLANDS_PLACES.some(place => Math.hypot(a.x - place.x, a.z - place.z) < place.flatRadius + 40)) continue;
      steepRoad = Math.max(steepRoad, Math.abs(scablandsHeightAt(b.x, b.z) - scablandsHeightAt(a.x, a.z)) / 20);
    }
  }
  assert.ok(steepRoad < .12, `the steepest grade along any road is ${(steepRoad * 100).toFixed(1)} percent`);
  // Each place stays flat. The Ridge's new summit is 45 m above the plain.
  for (const place of SCABLANDS_PLACES) for (const [dx, dz] of [[0, 0], [place.flatRadius * .8, 0], [0, -place.flatRadius * .8]])
    assert.ok(Math.abs(scablandsHeightAt(place.x + dx, place.z + dz) - (place.id === 'ridge' ? 45 : place.height)) < .01, `${place.name}'s ground is flat at ${dx}, ${dz}`);
});

// A place is not seen from the last one. A car on a road, coming to a place from beyond the rise that stands across the road before it, cannot see
// the place: the ground between rises above the line from the car's camera (3 m above the ground) to the top of the place's buildings (6 m
// above its ground). The camera is 520 m on from the rise's middle (measured in a straight line from the place), beyond the rise's far foot and
// inside the 2.4 km the game draws. (The Everburn's column of smoke and the Iron Line's mast are landmarks and are meant to be seen from far off;
// they are not buildings.)
test('a place is not seen from the last one: the ground rises between a road and the place it comes to, at the height of a car\'s camera', () => {
  const ground = point => scablandsHeightAt(point.x, point.z);
  const seen = [], open = [];
  for (const rise of RISES) {
    const road = ROAD_NET.road(rise.road), samples = resampleRoad(road.points, 20), ordered = rise.end === 0 ? samples : [...samples].reverse(), start = ordered[0];
    const place = Math.hypot(start.x, start.z) < 100 ? LAND.yard : SCABLANDS_PLACES.find(row => Math.hypot(start.x - row.x, start.z - row.z) < 160);
    if (!place) continue;
    const riseDistance = Math.hypot(rise.x - start.x, rise.z - start.z), car = ordered.find(sample => Math.hypot(sample.x - start.x, sample.z - start.z) >= riseDistance + 520);
    // A short road's two rises stand close together and a camera 600 m on from one may stand on the other: that view is not asked about.
    if (!car || riseHeightAt(car.x, car.z) > 3) continue;
    const eye = ground(car) + 3, target = (place.height ?? ground(place)) + 6, length = Math.hypot(place.x - car.x, place.z - car.z);
    let highest = -Infinity;
    for (let metres = 20; metres < length - 20; metres += 10) {
      const t = metres / length, x = car.x + (place.x - car.x) * t, z = car.z + (place.z - car.z) * t;
      highest = Math.max(highest, scablandsPlainHeightAt(x, z) - (eye + (target - eye) * t));
    }
    const name = `${road.id} ${rise.end === 0 ? 'start' : 'end'}`;
    seen.push(`${name} ${Math.round(length)} m out, hidden by ${highest.toFixed(1)} m`);
    if (!(highest > 0)) open.push(`${name} (${highest.toFixed(1)} m)`);
    assert.ok(length < 2400, `${name}: the camera is inside the game's draw range (${Math.round(length)} m)`);
  }
  console.log(seen.join('; '));
  assert.ok(seen.length >= 14, `${seen.length} road ends at places were checked`);
  assert.deepEqual(open, [], 'every place is hidden from the road before it by the rise between');
});

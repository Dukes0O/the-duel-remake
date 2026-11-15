import test from 'node:test';
import assert from 'node:assert/strict';
import {HILLS, hillsFor, hillHeightAt, scablandsTerrainHeightAt, scablandsHeightAt} from '../src/world/scablands-height.js';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {ROAD_NET, distanceToRoad} from '../src/world/scablands-road.js';
import {GROUND_AREAS, groundAreas, polygonMargin, riseHeightAt} from '../src/world/scablands-regions.js';
import {scarpHeightAt, SCARPS, preparedScarps} from '../src/world/scablands-scarps.js';
import {makeCoarseGround} from '../src/world/scablands-scene.js';
import {createNearGround, NEAR_GROUND} from '../src/world/near-ground.js';
import {SCABLANDS_LAYOUT} from '../src/world/scablands.js';
import {HOT_DELIVERY_WAYS, routeFor, sampleLine, sees} from '../src/world/scablands-ways.js';
import {scablandsSurfaceHeightAt, scablandsActorHeightAt} from '../src/world/scablands-ground.js';
import {createGroundTunnels} from '../src/world/ground-tunnels.js';
import {westScarpTrial} from '../src/world/scablands-tunnel-trial.js';
import {createRiverDraw} from '../src/world/scablands-draw.js';
import {RIVER_LAND, riverGorgeDepthAt} from '../src/world/scablands-regions.js';
import {raiderHasClearShot, targetFor, stepRaiderSearch, stepRaiderAim, campSightChange, stepRaiders} from '../src/raiders.js';
import {stepSkylineSight, stepRidgeSight, skylineWarningDue, FURNACE_SKYLINE} from '../src/world/jobs/furnace-sightings.js';

test('the plates way has a long stretch hidden from the furnace within range', () => {
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'scab-plates');
  const points = routeFor(way.legs, {start: LAND.yard, destination: LAND.at('tin-town')});
  const samples = sampleLine(points, 5).filter(point => Math.hypot(point.x - FURNACE_SKYLINE.x, point.z - FURNACE_SKYLINE.z) <= 1400);
  let start = null, longest = 0, open = false;
  for (const point of samples) {
    const visible = sees(FURNACE_SKYLINE, point, {heightAt: scablandsSurfaceHeightAt, eye: 5, range: 1400, step: 5});
    if (!visible) {
      start ??= point.along;
      longest = Math.max(longest, point.along - start);
    } else {
      start = null;
      open = true;
    }
  }
  assert.ok(longest >= 150, `longest hidden stretch is ${longest} m`);
  assert.ok(open, 'the way also has open ground within range');
});

test('the Ridge lookout sees only within range and over clear ground', () => {
  const ridge = LAND.at('ridge'), car = {x: ridge.x + 100, z: ridge.z};
  const flat = () => 0;
  const wall = x => x > ridge.x + 40 && x < ridge.x + 60 ? 30 : 0;
  let sight = stepRidgeSight({}, car, flat);
  assert.deepEqual(sight, {visible: true, change: 'seen'});
  sight = stepRidgeSight(sight, car, wall);
  assert.deepEqual(sight, {visible: false, change: 'lost'});
  sight = stepRidgeSight(sight, car, flat);
  assert.deepEqual(sight, {visible: true, change: 'seen'});
  assert.equal(stepRidgeSight(sight, {x: ridge.x + 3001, z: ridge.z}, flat).visible, false);
});

test('camp sight notices follow the combined view of active raiders', () => {
  const first = {search: {phase: 'seen'}}, second = {search: {phase: 'post'}};
  const zones = [{raiders: [first]}, {raiders: [second]}];
  assert.deepEqual(campSightChange(false, zones), {seen: true, change: 'seen'});
  first.search.phase = 'going'; second.search.phase = 'seen';
  assert.deepEqual(campSightChange(true, zones), {seen: true, change: null});
  second.knockedDown = true;
  assert.deepEqual(campSightChange(true, zones), {seen: false, change: 'lost'});
  second.knockedDown = false; second.ambushKey = 'escort';
  assert.deepEqual(campSightChange(false, zones), {seen: false, change: null});
  delete second.ambushKey;
  assert.deepEqual(campSightChange(false, zones), {seen: true, change: 'seen'});
});

test('the skyline furnace counts only clear time in range', () => {
  const car = {x: FURNACE_SKYLINE.x + 100, z: FURNACE_SKYLINE.z};
  const flat = () => 0;
  const wall = (x) => x > FURNACE_SKYLINE.x + 40 && x < FURNACE_SKYLINE.x + 60 ? 20 : 0;
  let sight = stepSkylineSight({}, car, 3, flat);
  assert.equal(sight.change, 'seen');
  assert.equal(sight.seconds, 3);
  sight = stepSkylineSight(sight, car, 3, wall);
  assert.equal(sight.change, 'lost');
  assert.equal(sight.seconds, 0);
  sight = stepSkylineSight(sight, car, 1, flat);
  assert.equal(sight.change, 'seen');
  assert.equal(sight.seconds, 1);
  assert.equal(stepSkylineSight(sight, {x: car.x + 2000, z: car.z}, 1, flat).visible, false);
});

test('the furnace warning needs more than six continuous seconds and sounds once', () => {
  const car = {x: FURNACE_SKYLINE.x + 100, z: FURNACE_SKYLINE.z};
  const flat = () => 0;
  const wall = x => x > FURNACE_SKYLINE.x + 40 && x < FURNACE_SKYLINE.x + 60 ? 20 : 0;
  let sight = stepSkylineSight({}, car, 6, flat);
  assert.equal(skylineWarningDue(sight, false), false);
  sight = stepSkylineSight(sight, car, 1, wall);
  sight = stepSkylineSight(sight, car, 5, flat);
  assert.equal(skylineWarningDue(sight, false), false);
  sight = stepSkylineSight(sight, car, 1.1, flat);
  assert.equal(skylineWarningDue(sight, false), true);
  assert.equal(skylineWarningDue(sight, true), false);
});

test('long sight checks keep their last answer between scheduled traces', () => {
  let samples = 0;
  const flat = () => { samples++; return 0; };
  const car = {x: FURNACE_SKYLINE.x + 100, z: FURNACE_SKYLINE.z};
  let sight = stepSkylineSight({}, car, 1 / 120, flat);
  const traced = samples;
  for (let i = 0; i < 29; i++) sight = stepSkylineSight(sight, car, 1 / 120, flat, null, false);
  assert.equal(samples, traced);
  assert.equal(sight.visible, true);
  assert.ok(Math.abs(sight.seconds - .25) < 1e-9);
  sight = stepSkylineSight(sight, null, 1 / 120, flat, null, true);
  assert.equal(sight.change, 'lost');
});

test('the Ridge lookout also keeps its answer between scheduled traces', () => {
  let samples = 0;
  const flat = () => { samples++; return 0; };
  const ridge = LAND.at('ridge'), car = {x: ridge.x + 3000, z: ridge.z};
  let sight = stepRidgeSight({}, car, flat);
  const traced = samples;
  assert.equal(sight.visible, true);
  assert.equal(traced, 601, 'a full-range trace samples the ground at 5 metre intervals');
  for (let i = 0; i < 29; i++) sight = stepRidgeSight(sight, car, flat, null, false);
  assert.equal(samples, traced, 'cached steps do not sample the ground');
  assert.equal(sight.visible, true);
});

test('a raider follows a car it can see and keeps room to fire', () => {
  const raider = {x: 0, z: 0};
  const car = {x: 30, z: 0};
  const move = (_from, to) => to;
  stepRaiderSearch(raider, car, 1, move);
  assert.equal(raider.search.phase, 'seen');
  assert.equal(raider.x, 3);
  for (let i = 0; i < 20; i++) stepRaiderSearch(raider, car, 1, move);
  assert.equal(raider.x, 18);
});

test('a raider searches the last visible place and returns to its post', () => {
  const mesa = HILLS.find(hill => hill.kind === 'mesa');
  const raider = {x: mesa.x - mesa.radius - 30, z: mesa.z};
  const home = {...raider}, visible = {x: raider.x - 30, z: raider.z};
  const hidden = {x: mesa.x + mesa.radius + 30, z: mesa.z};
  const move = (_from, to) => to;
  stepRaiderSearch(raider, visible, 0, move);
  assert.equal(raider.search.phase, 'seen');
  assert.deepEqual(raider.search.last, visible);
  stepRaiderSearch(raider, hidden, 1, move);
  assert.deepEqual(raider.search.last, visible, 'cover does not reveal the car position');
  assert.ok(raider.x < home.x, 'the raider walks toward the last visible place');
  for (let i = 0; i < 9; i++) stepRaiderSearch(raider, hidden, 1, move);
  assert.equal(raider.search.phase, 'searching');
  for (let i = 0; i < 5; i++) stepRaiderSearch(raider, hidden, 1, move);
  assert.equal(raider.search.phase, 'returning');
  for (let i = 0; i < 10; i++) stepRaiderSearch(raider, hidden, 1, move);
  assert.equal(raider.search.phase, 'post');
  assert.equal(raider.x, home.x);
  stepRaiderSearch(raider, visible, 1, move);
  assert.equal(raider.search.phase, 'seen', 'the car can be seen again');
});

test('a raider walks for a second in sight, then searches and returns', () => {
  const raider = {x: 0, z: 0}, car = {x: 30, z: 0}, move = (_from, to) => to;
  stepRaiderSearch(raider, car, 1, move);
  assert.equal(raider.x, 3);
  assert.equal(raider.search.phase, 'seen');
  for (let i = 0; i < 20 && raider.search.phase !== 'searching'; i++) stepRaiderSearch(raider, null, 1, move);
  assert.equal(raider.search.phase, 'searching');
  for (let i = 0; i < 5; i++) stepRaiderSearch(raider, null, 1, move);
  assert.equal(raider.search.phase, 'returning');
  for (let i = 0; i < 20 && raider.search.phase !== 'post'; i++) stepRaiderSearch(raider, null, 1, move);
  assert.equal(raider.search.phase, 'post');
  assert.equal(raider.x, 0);
});

test('a searching raider walks around blocked ground and returns', () => {
  const raider = {x: 0, z: 0, search: {home: {x: 0, z: 0}, last: {x: 10, z: 0}, phase: 'going', seconds: 0}};
  const move = (from, to) => {
    for (let i = 1; i <= 20; i++) {
      const x = from.x + (to.x - from.x) * i / 20, z = from.z + (to.z - from.z) * i / 20;
      if (x >= 3 && x <= 6 && Math.abs(z) <= 2) return {x: from.x, z: from.z, blocked: 'solid'};
    }
    return {...to, blocked: false};
  };
  for (let i = 0; i < 200 && raider.search.phase !== 'searching'; i++) stepRaiderSearch(raider, null, .25, move);
  assert.equal(raider.search.phase, 'searching');
  assert.ok(Math.hypot(raider.x - 10, raider.z) < .1);
  for (let i = 0; i < 220 && raider.search.phase !== 'post'; i++) stepRaiderSearch(raider, null, .25, move);
  assert.equal(raider.search.phase, 'post');
  assert.ok(Math.hypot(raider.x, raider.z) < .1);
});

test('Scablands raiders cannot shoot through a mesa', () => {
  const mesa = HILLS.find(hill => hill.kind === 'mesa');
  const raider = {x: mesa.x - mesa.radius - 100, z: mesa.z};
  const hidden = {x: mesa.x + mesa.radius + 100, z: mesa.z};
  const visible = {x: raider.x - 50, z: raider.z};
  assert.equal(raiderHasClearShot({def: {scablands: true}}, raider, hidden), false);
  assert.equal(raiderHasClearShot({def: {scablands: true}}, raider, visible), true);
  assert.equal(raiderHasClearShot({def: {}}, raider, hidden), true);
});

test('raiders select a visible car within their own range', () => {
  const mesa = HILLS.find(hill => hill.kind === 'mesa');
  const raider = {x: mesa.x - mesa.radius - 30, z: mesa.z};
  const hidden = {s: 1, lateral: 0, speedMph: 20};
  const visible = {s: 2, lateral: 0, speedMph: 20};
  const places = new Map([[1, {x: mesa.x + mesa.radius + 30, z: mesa.z, y: 0}],
    [2, {x: raider.x - 40, z: raider.z, y: 0}]]);
  const duel = {course: {def: {scablands: true}, groundAt: s => places.get(s)},
    state: {...hidden, opponents: [visible], currentLap: 1}, relativeS: () => 0};
  const zone = {s: 0, raiders: [raider]};
  assert.equal(targetFor(duel, zone)?.actor, visible);
  places.set(2, {x: raider.x - 83, z: raider.z, y: 0});
  assert.equal(targetFor(duel, zone), null);
  places.set(2, {x: raider.x - 40, z: raider.z, y: 0});
  assert.equal(targetFor(duel, zone, {actor: visible, pose: hidden}), null);
});

test('a stopped car needs continuous sight on the Scablands but is ignored in races', () => {
  const yard = LAND.at('yard');
  const car = {s: 0, lateral: 0, speedMph: 0, opponents: [], currentLap: 1};
  const raider = {x: yard.x, z: yard.z, y: scablandsSurfaceHeightAt(yard.x, yard.z)};
  let position = {x: yard.x + 10, z: yard.z, y: raider.y};
  const duel = {state: car, course: {def: {scablands: true}, groundAt: () => position}, relativeS: () => 0};
  const zone = {s: 0, raiders: [raider]};
  assert.equal(targetFor(duel, zone)?.actor, car);
  stepRaiderAim(duel, zone, 1);
  assert.equal(targetFor(duel, zone, null, 0, true), null);
  position = {...position, x: yard.x + 100};
  stepRaiderAim(duel, zone, .1);
  position = {...position, x: yard.x + 10};
  stepRaiderAim(duel, zone, 1);
  assert.equal(targetFor(duel, zone, null, 0, true), null, 'lost sight resets the clock');
  stepRaiderAim(duel, zone, .2);
  assert.equal(targetFor(duel, zone, null, 0, true)?.actor, car);
  for (const status of ['finished', 'crushed', 'combatWrecking']) {
    car[status] = true;
    assert.equal(targetFor(duel, zone), null);
    car[status] = false;
  }
  duel.course.def.scablands = false;
  assert.equal(targetFor(duel, zone), null);
  car.speedMph = 8;
  assert.equal(targetFor(duel, zone)?.actor, car);
});

test('a raider fires at a stopped car after continuous sight', () => {
  const yard = LAND.at('yard'), y = scablandsSurfaceHeightAt(yard.x, yard.z);
  const raider = {id: 'test', x: yard.x, z: yard.z, y, groundY: y};
  const zone = {id: 'test', s: 0, raiders: [raider], nextShotAt: 0, shotCount: 0};
  const state = {s: 0, lateral: 0, speedMph: 0, groundHeight: y, opponents: [], currentLap: 1,
    status: 'racing', stageTimeSec: 0, cpuDifficulty: 'medium', combat: {projectiles: [], serial: 0},
    raids: {zones: [zone], shots: 0}};
  const events = [];
  const duel = {state, course: {def: {scablands: true}, seed: 1,
    groundAt: () => ({x: yard.x + 10, z: yard.z, y, heading: 0}), at: () => ({curvature: 0})},
    relativeS: () => 0, _callout: () => {}, emit: event => events.push(event)};
  stepRaiders(duel, 1);
  assert.equal(state.combat.projectiles.length, 0);
  stepRaiders(duel, .2);
  assert.equal(state.combat.projectiles.length, 1);
  assert.equal(state.combat.projectiles[0].targetIndex, -1);
  assert.ok(events.some(event => event.raiderShot));
});

test('each distant scarp face has fine cells at the land height', () => {
  const geometry = makeCoarseGround(null).geometry;
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
  for (const face of preparedScarps(SCARPS)) {
    const x = face.a.x + face.tx * face.length / 2 - face.tz * face.width / 2;
    const z = face.a.z + face.tz * face.length / 2 + face.tx * face.width / 2;
    let closest = Infinity, found = -1;
    for (let i = 201 * 161; i < positions.count; i++) {
      const distance = Math.hypot(positions.getX(i) - x, positions.getZ(i) - z);
      if (distance < closest) { closest = distance; found = i; }
    }
    assert.ok(closest < 7, `${face.scarp.id} has a nearby fine sample`);
    const px = positions.getX(found), pz = positions.getZ(found);
    assert.ok(Math.abs(positions.getY(found) - (scablandsSurfaceHeightAt(px, pz) + riverGorgeDepthAt(px, pz) - .35)) < .01,
      `${face.scarp.id} follows the shared height`);
    assert.ok(Math.abs(Math.hypot(normals.getX(found), normals.getY(found), normals.getZ(found)) - 1) < .001);
  }
  geometry.dispose();
});

test('near scarp cells use a separate fine mesh and meet the old grid', () => {
  const heightAt = (x, z) => scablandsSurfaceHeightAt(x, z) + riverGorgeDepthAt(x, z);
  const near = createNearGround({material: null, heightAt});
  assert.equal(near.geometry.getAttribute('position').count, 61 * 61);
  for (const face of preparedScarps(SCARPS)) {
    const x = face.a.x + face.tx * face.length / 2 - face.tz * face.width / 2;
    const z = face.a.z + face.tz * face.length / 2 + face.tx * face.width / 2;
    near.follow(x, z);
    const positions = near.faceMesh.geometry.getAttribute('position');
    const normals = near.faceMesh.geometry.getAttribute('normal');
    let closest = Infinity, index = -1;
    for (let i = 0; i < positions.count; i++) {
      const distance = Math.hypot(positions.getX(i) + near.centreX - x, positions.getZ(i) + near.centreZ - z);
      if (distance < closest) { closest = distance; index = i; }
    }
    assert.ok(closest < 4, `${face.scarp.id} has a fine nearby sample`);
    assert.ok(Math.abs(Math.hypot(normals.getX(index), normals.getY(index), normals.getZ(index)) - 1) < .001);
    assert.ok(near.geometry.index.count < 60 * 60 * 6, 'face cells replace the old triangles');
  }
  near.dispose();
});

test('the drawn Steps and river banks follow the ledges with fine cells', () => {
  const steps = RIVER_LAND.crossings.find(crossing => crossing.kind === 'steps');
  const drawn = createRiverDraw({plainAt: () => 0, material: null, range: 1200});
  drawn.update(steps.x, steps.z, {all: true});
  const piece = drawn.pieces.reduce((best, item) =>
    Math.hypot(item.centre.x - steps.x, item.centre.z - steps.z) < Math.hypot(best.centre.x - steps.x, best.centre.z - steps.z) ? item : best);
  const positions = piece.mesh.geometry.getAttribute('position');
  const normals = piece.mesh.geometry.getAttribute('normal');
  const across = positions.count / (piece.last - piece.first + 1);
  assert.equal(across, 39);
  for (let i = 0; i < across; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    assert.ok(Math.abs(positions.getY(i) + riverGorgeDepthAt(x, z)) < .001);
    assert.ok(Math.abs(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) - 1) < .001);
    if (i > 0 && ((i >= 3 && i <= 16) || (i >= 23 && i <= 36))) {
      assert.ok(Math.hypot(x - positions.getX(i - 1), z - positions.getZ(i - 1)) <= 2.01);
    }
  }
  drawn.dispose();
});

test('ground and range hide a car until it breaks cover', () => {
  const hill = HILLS.find(item => item.kind === 'breaks');
  const watcher = {x: hill.x - hill.radius - 80, z: hill.z};
  const hidden = {x: hill.x + hill.radius + 80, z: hill.z};
  const visible = {x: hill.x - hill.radius - 30, z: hill.z};
  const options = {heightAt: scablandsSurfaceHeightAt, eye: 3, target: 1.5, step: 5, range: 1000};
  assert.equal(sees(watcher, hidden, options), false, 'the hill hides the car');
  assert.equal(sees(watcher, visible, options), true, 'the car is visible after leaving cover');
  assert.equal(sees(watcher, visible, {...options, range: 49}), false, 'the car is outside sight range');
  assert.equal(sees(watcher, visible, {...options, range: 50}), true, 'the edge of sight range is included');
});

test('the dunes follow the Ships, have soft crests, and leave every road clear', () => {
  const moved = hillsFor(createLand(movedTable(SCABLANDS_PLACES, 'ships-in-sand', 100, 200)));
  assert.equal(HILLS.filter(hill => hill.kind === 'dune').length, 14);
  for (const [index, hill] of HILLS.filter(hill => hill.kind === 'dune').entries()) {
    assert.equal(moved[index].x - hill.x, 100);
    assert.equal(moved[index].z - hill.z, 200);
    assert.ok(Math.hypot(hill.x - LAND.place('ships-in-sand').x, hill.z - LAND.place('ships-in-sand').z) < 1500);
    assert.ok(hill.height >= 8 && hill.height <= 15);
    assert.ok(hill.radius >= 70 && hill.radius <= 130);
    assert.ok(Math.hypot(hill.x - LAND.place('ships-in-sand').x, hill.z - LAND.place('ships-in-sand').z) > hill.radius + LAND.place('ships-in-sand').flatRadius);
    assert.equal(hillHeightAt(hill.x, hill.z), hill.height);
    assert.ok(hill.height * 1.5 / hill.radius < .12);
    for (const road of ROAD_NET.roads) for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((hill.x - a.x) * dx + (hill.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      assert.ok(Math.hypot(hill.x - a.x - t * dx, hill.z - a.z - t * dz) > hill.radius + road.halfWidth, `${road.id} clears a dune`);
    }
  }
});

test('a dune crest hides a car from the far side', () => {
  const dune = HILLS.filter(hill => hill.kind === 'dune')[1];
  const watcher = {x: dune.x - dune.radius - 10, z: dune.z};
  const car = {x: dune.x + dune.radius + 10, z: dune.z};
  assert.equal(sees(watcher, car, {heightAt: scablandsSurfaceHeightAt, eye: 3, target: 1.5, step: 5, range: 500}), false);
});

test('the Breaks have spaced hills and leave the road passes open', () => {
  const hills = HILLS.filter(hill => hill.kind === 'breaks');
  assert.ok(hills.length >= 3);
  const mall = LAND.place('dead-mall');
  for (const hill of hills) {
    assert.ok(hill.z > 0 && hill.z < mall.z);
    assert.ok(hill.height >= 40 && hill.height <= 90);
    assert.equal(hillHeightAt(hill.x, hill.z), hill.height);
    for (const road of ROAD_NET.roads) for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((hill.x - a.x) * dx + (hill.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      assert.ok(Math.hypot(hill.x - a.x - t * dx, hill.z - a.z - t * dz) > hill.radius + road.halfWidth, `${road.id} clears the Breaks`);
    }
  }
});

test('the seeded Breaks have sixteen hills with nearby neighbours', () => {
  const hills = HILLS.filter(hill => hill.kind === 'breaks');
  assert.equal(hills.filter(hill => !hill.passRoad).length, 16);
  assert.equal(hills.filter(hill => hill.passRoad).length, 6);
  for (const hill of hills) {
    const nearest = Math.min(...hills.filter(other => other !== hill)
      .map(other => Math.hypot(hill.x - other.x, hill.z - other.z)));
    assert.ok(nearest >= 400 && nearest <= 900);
    assert.ok(hill.radius >= 260 && hill.radius <= 460);
    assert.ok(hill.height >= 40 && hill.height <= 90);
  }
});

test('each Breaks road runs between two rising shoulders', () => {
  for (const id of ['burn-road', 'mall-road', 'mall-burn-road']) {
    const road = ROAD_NET.road(id), shoulders = HILLS.filter(hill => hill.passRoad === id);
    assert.equal(shoulders.length, 2, `${id} has two shoulders`);
    const centre = {x: (shoulders[0].x + shoulders[1].x) / 2, z: (shoulders[0].z + shoulders[1].z) / 2};
    assert.ok(distanceToRoad(centre.x, centre.z, road.points) < 1, `${id} runs between them`);
    for (const hill of shoulders) {
      const dx = hill.x - centre.x, dz = hill.z - centre.z, distance = Math.hypot(dx, dz);
      assert.ok(hillHeightAt(centre.x + dx * 150 / distance, centre.z + dz * 150 / distance, [hill]) > 1,
        `${id} has rising ground within 150 m on each side`);
    }
  }
});

test('the Breaks raise each pass road centre by at most half a metre', () => {
  const hills = HILLS.filter(hill => hill.kind === 'breaks');
  for (const id of ['burn-road', 'mall-road', 'mall-burn-road']) {
    for (const point of sampleLine(ROAD_NET.road(id).points, 5)) {
      assert.ok(hillHeightAt(point.x, point.z, hills) <= .5, `${id} centre stays clear`);
    }
  }
});

test('every Breaks hill stays in its country and clear of the three places', () => {
  const yard = LAND.yard, burn = LAND.place('everburn'), mall = LAND.place('dead-mall');
  const triangle = [yard, burn, mall];
  for (const hill of HILLS.filter(item => item.kind === 'breaks')) {
    const sides = triangle.map((a, i) => {
      const b = triangle[(i + 1) % triangle.length];
      return (b.x - a.x) * (hill.z - a.z) - (b.z - a.z) * (hill.x - a.x);
    });
    const inside = sides.every(side => side >= 0) || sides.every(side => side <= 0);
    const nearEdge = triangle.some((a, i) =>
      distanceToRoad(hill.x, hill.z, [a, triangle[(i + 1) % triangle.length]]) <= 600);
    assert.ok(inside || nearEdge, 'the centre is in or within 600 m of the country');
    assert.ok(Math.hypot(hill.x - yard.x, hill.z - yard.z) - hill.radius >= 500, 'the yard has 500 m clear');
    for (const place of [burn, mall]) {
      assert.ok(Math.hypot(hill.x - place.x, hill.z - place.z) - hill.radius - place.flatRadius >= 350,
        `${place.id} has 350 m clear beyond its flat ground`);
    }
  }
});

test('hill footprints leave named places and their surrounding ground clear', () => {
  for (const hill of HILLS) {
    for (const place of LAND.table) {
      // The Ridge top is itself the named place, including the fifth flag.
      if (hill.kind === 'ridge-top' && place.id === 'ridge') continue;
      const reach = hill.radius + (hill.kind === 'mesa' ? hill.ramp : 0);
      const clearance = Math.hypot(hill.x - place.x, hill.z - place.z) - reach - place.flatRadius;
      assert.ok(clearance >= 30, `${hill.kind} leaves 30 m clear around ${place.id}`);
    }
  }
});

test('hill footprints leave the trial tunnel mouths clear', () => {
  const trial = westScarpTrial(scablandsSurfaceHeightAt);
  for (const mouth of [trial.segment.start, trial.segment.end]) {
    for (const hill of HILLS) {
      const reach = hill.radius + (hill.kind === 'mesa' ? hill.ramp : 0);
      const clearance = Math.hypot(hill.x - mouth.x, hill.z - mouth.z) - reach;
      assert.ok(clearance >= 30, `${hill.kind} leaves 30 m clear around a tunnel mouth`);
    }
  }
});

test('hill footprints leave both river decks clear from end to end', () => {
  for (const crossing of RIVER_LAND.crossings.filter(item => item.kind === 'bridge' || item.kind === 'pipe')) {
    const hit = ROAD_NET.nearest(crossing.x, crossing.z);
    const a = hit.road.points[hit.index], b = hit.road.points[hit.index + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / length * 88, dz = (b.z - a.z) / length * 88;
    const deck = [{x: crossing.x - dx, z: crossing.z - dz}, {x: crossing.x + dx, z: crossing.z + dz}];
    for (const hill of HILLS) {
      const reach = hill.radius + (hill.kind === 'mesa' ? hill.ramp : 0);
      assert.ok(distanceToRoad(hill.x, hill.z, deck) >= reach + crossing.deckHalfWidth,
        `${hill.kind} leaves the ${crossing.id} deck clear`);
    }
  }
});

test('the Lookout has a level top, follows the Ridge, and leaves roads clear', () => {
  const hill = HILLS.find(item => item.kind === 'lookout');
  assert.equal(hill.height, 60);
  const moved = hillsFor(createLand(movedTable(SCABLANDS_PLACES, 'ridge', 100, 200)))
    .find(item => item.kind === 'lookout');
  assert.equal(moved.x - hill.x, 100);
  assert.equal(moved.z - hill.z, 200);
  const top = scablandsTerrainHeightAt(hill.x, hill.z);
  assert.ok(top - scablandsTerrainHeightAt(hill.x, hill.z, []) >= 40);
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
    const x = hill.x + Math.cos(angle) * hill.topRadius;
    const z = hill.z + Math.sin(angle) * hill.topRadius;
    assert.ok(Math.abs(scablandsTerrainHeightAt(x, z) - top) < 1e-9);
  }
  for (const road of ROAD_NET.roads) for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((hill.x - a.x) * dx + (hill.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    assert.ok(Math.hypot(hill.x - a.x - t * dx, hill.z - a.z - t * dz) > hill.radius + road.halfWidth, `${road.id} clears the Lookout`);
  }
  const end = LAND.between('yard', 'ridge', .3), endHeight = scablandsTerrainHeightAt(end.x, end.z);
  for (let t = .02; t < 1; t += .02) {
    const x = hill.x + (end.x - hill.x) * t, z = hill.z + (end.z - hill.z) * t;
    assert.ok(scablandsTerrainHeightAt(x, z) < top + 2 + (endHeight - top) * t, 'the view across the flats is clear');
  }
});

test('the scab plates have level mesas with steep sides and a drivable ramp', () => {
  const mesas = HILLS.filter(hill => hill.kind === 'mesa');
  assert.equal(mesas.length, 6);
  const plates = GROUND_AREAS.polygons.find(area => area.id === 'scab-plates');
  for (const mesa of mesas) {
    assert.ok(mesa.height >= 30 && mesa.height <= 55 && mesa.face === 30 && mesa.ramp === 220);
    assert.ok(polygonMargin(plates.points, mesa.x, mesa.z) > mesa.radius + mesa.ramp);
    const top = scablandsTerrainHeightAt(mesa.x, mesa.z);
    assert.equal(top - scablandsTerrainHeightAt(mesa.x, mesa.z, []), mesa.height);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const point = distance => ({x: mesa.x + Math.cos(angle) * distance, z: mesa.z + Math.sin(angle) * distance});
      const inner = point(mesa.radius - 10);
      assert.ok(Math.abs(scablandsTerrainHeightAt(inner.x, inner.z) - top) < 1e-8);
    }
    const rampPoint = distance => ({x: mesa.x + Math.cos(mesa.rampAngle) * distance, z: mesa.z + Math.sin(mesa.rampAngle) * distance});
    for (let d = mesa.radius; d < mesa.radius + mesa.ramp; d += 2) {
      const a = rampPoint(d), b = rampPoint(d + 2);
      assert.ok(Math.abs(scablandsTerrainHeightAt(a.x, a.z) - scablandsTerrainHeightAt(b.x, b.z)) / 2 <= .30, 'the ramp can be driven');
    }
    const sideAngle = mesa.rampAngle + Math.PI;
    const side = d => ({x: mesa.x + Math.cos(sideAngle) * d, z: mesa.z + Math.sin(sideAngle) * d});
    const foot = side(mesa.radius + mesa.face), crest = side(mesa.radius);
    assert.ok((scablandsTerrainHeightAt(crest.x, crest.z) - scablandsTerrainHeightAt(foot.x, foot.z)) / mesa.face > .3, 'the side is steep');
    for (const road of ROAD_NET.roads) for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((mesa.x - a.x) * dx + (mesa.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      assert.ok(Math.hypot(mesa.x - a.x - t * dx, mesa.z - a.z - t * dz) > mesa.radius + mesa.ramp + road.halfWidth, `${road.id} clears the mesa`);
    }
  }
  for (const mesa of mesas) {
    const reach = mesa.radius + mesa.ramp;
    assert.ok(mesa.height >= 30 && mesa.height <= 55 && mesa.radius >= 120 && mesa.radius <= 260);
    assert.ok(distanceToRoad(mesa.x, mesa.z, RIVER_LAND.line.points) > reach + 78 + 150);
    for (const road of ROAD_NET.roads) {
      assert.ok(distanceToRoad(mesa.x, mesa.z, road.points) > reach + road.halfWidth + 200);
    }
  }
  const moved = hillsFor(createLand(movedTable(SCABLANDS_PLACES, 'tin-town', 100, 200))).filter(hill => hill.kind === 'mesa');
  for (const [index, mesa] of mesas.entries()) {
    const share = index === 0 ? .4 : .7;
    assert.ok(Math.abs(moved[index].x - mesa.x - 100 * share) < 1e-8);
    assert.ok(Math.abs(moved[index].z - mesa.z - 200 * share) < 1e-8);
  }
});

test('the Ridge has foothills and a drivable way to the fifth flag on top', () => {
  const ridge = LAND.place('ridge');
  const top = HILLS.find(hill => hill.kind === 'ridge-top');
  const foothills = HILLS.filter(hill => hill.kind === 'foothill');
  assert.equal(foothills.length, 6);
  const moved = hillsFor(createLand(movedTable(SCABLANDS_PLACES, 'ridge', 100, 200)));
  for (const hill of [top, ...foothills]) {
    const match = moved.find(item => item.kind === hill.kind && item.x === hill.x + 100 && item.z === hill.z + 200);
    assert.ok(match, 'the Ridge hills follow the Ridge');
  }
  const flag = LAND.at('ridge', -74, 104);
  assert.equal(scablandsHeightAt(flag.x, flag.z), top.height);
  assert.equal(scablandsHeightAt(ridge.x, ridge.z), top.height);
  for (const hill of foothills) {
    assert.ok(hill.z < ridge.z, 'the foothills stand north of the Ridge');
    assert.ok(hillHeightAt(hill.x, hill.z) >= hill.height);
    assert.ok(hill.height >= 18 && hill.height <= 40);
    for (const other of foothills) {
      const distance = Math.hypot(hill.x - ridge.x, hill.z - ridge.z);
      const otherDistance = Math.hypot(other.x - ridge.x, other.z - ridge.z);
      if (distance < otherDistance) assert.ok(hill.height >= other.height, 'higher foothills are nearer the Ridge');
    }
    for (const road of ROAD_NET.roads) {
      assert.ok(distanceToRoad(hill.x, hill.z, road.points) > hill.radius + road.halfWidth, `${road.id} clears the foothill`);
    }
  }
  for (const road of ROAD_NET.roads.filter(road => road.id === 'ridge-spur' || road.id === 'ridge-road')) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i];
      const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.ceil(length / 2);
      let previous = scablandsHeightAt(a.x, a.z);
      for (let step = 1; step <= steps; step++) {
        const t = step / steps, height = scablandsHeightAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
        assert.ok(Math.abs(height - previous) / (length / steps) <= .12, `${road.id} is drivable`);
        previous = height;
      }
    }
  }
});

test('hill shoulders are seeded, uneven and gentle', () => {
  assert.deepEqual(hillsFor(LAND, 1989), HILLS);
  assert.notDeepEqual(hillsFor(LAND, 1990), HILLS);
  for (const hill of HILLS.filter(item => ['breaks', 'dune', 'foothill'].includes(item.kind))) {
    assert.ok(hill.spurs >= 3 && hill.spurs <= 5);
    const heights = [];
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 90) {
      const x = hill.x + Math.cos(angle) * hill.radius * .7;
      const z = hill.z + Math.sin(angle) * hill.radius * .7;
      const height = hillHeightAt(x, z, [hill]);
      heights.push(height);
      for (let fraction = .1; fraction <= 1; fraction += .1) {
        const px = hill.x + Math.cos(angle) * hill.radius * fraction;
        const pz = hill.z + Math.sin(angle) * hill.radius * fraction;
        const base = hillHeightAt(px, pz, [hill]);
        const dx = hillHeightAt(px + 1, pz, [hill]) - base;
        const dz = hillHeightAt(px, pz + 1, [hill]) - base;
        assert.ok(Math.hypot(dx, dz) <= Math.tan(Math.PI / 6), 'the shoulder is drivable');
      }
    }
    assert.ok(Math.max(...heights) - Math.min(...heights) > 1, 'the shoulder is not round');
  }
});

test('the hill index gives the same heights as the whole table', () => {
  const unindexed = [...HILLS];
  for (let x = -7000; x <= 7000; x += 113) for (let z = -5000; z <= 5000; z += 127) {
    assert.equal(hillHeightAt(x, z), hillHeightAt(x, z, unindexed));
    assert.equal(scablandsTerrainHeightAt(x, z), scablandsTerrainHeightAt(x, z, unindexed));
  }
});

test('an empty hill table leaves the former terrain height exact', () => {
  const smooth = value => { value = Math.max(0, Math.min(1, value)); return value * value * (3 - 2 * value); };
  for (let x = -7000; x <= 7000; x += 437) for (let z = -5000; z <= 5000; z += 419) {
    const edge = 1 + (Math.hypot(x / SCABLANDS_LAYOUT.halfWidth, z / SCABLANDS_LAYOUT.halfDepth) - 1) * SCABLANDS_LAYOUT.edgeScale;
    const rolling = 2.1 * Math.sin(x * .007 + z * .002) * Math.cos(z * .009 - x * .003);
    const ridge = smooth((edge - SCABLANDS_LAYOUT.ridgeStart) / .1) * (1 - smooth((edge - SCABLANDS_LAYOUT.ridgeCrest) / .16)) * 108;
    const wall = smooth((edge - SCABLANDS_LAYOUT.wallStart) / .035) * 175;
    assert.equal(scablandsTerrainHeightAt(x, z, []), rolling + ridge + wall + riseHeightAt(x, z) + scarpHeightAt(x, z));
  }
});

test('the salt pan and plates have uneven outlines in the shared land data', () => {
  assert.deepEqual(groundAreas(LAND), GROUND_AREAS);
  for (const area of GROUND_AREAS.polygons) {
    assert.ok(['salt-pan', 'scab-plates'].includes(area.id));
    assert.ok(area.points.length >= 8);
    for (let i = 0; i < area.points.length; i += 2) {
      const a = area.points[i], bend = area.points[i + 1], b = area.points[(i + 2) % area.points.length];
      const cross = (bend.x - a.x) * (b.z - a.z) - (bend.z - a.z) * (b.x - a.x);
      assert.ok(Math.abs(cross) > 1, `${area.id} has a bent edge`);
      assert.ok(Math.abs(polygonMargin(area.points, bend.x, bend.z)) < 1e-8);
    }
  }
});


test('sight follows the river bed beneath a deck and through open bed', () => {
  const bridge = RIVER_LAND.crossings.find(c => c.id === 'girder-bridge');
  const bed = scablandsActorHeightAt(bridge.x, bridge.z, -100);
  const deck = scablandsActorHeightAt(bridge.x, bridge.z);
  const car = {x: bridge.x, z: bridge.z, y: bed};
  const watcher = {x: bridge.x, z: bridge.z, y: deck};
  const options = {heightAt: scablandsSurfaceHeightAt, actorFloors: true, eye: 1.5, target: 1.5, step: 1};
  assert.equal(sees(watcher, car, options), false, 'deck blocks sight from above');
  const other = {x: bridge.x + 3, z: bridge.z, y: bed};
  assert.equal(sees(other, car, options), true, 'the bed is open beneath the deck');
});

test('a watcher sees a car in the open bed approaching the bridge', () => {
  const bridge = RIVER_LAND.crossings.find(c => c.id === 'girder-bridge');
  const {points, along} = RIVER_LAND.line;
  const index = along.findIndex(distance => distance > bridge.along + 80);
  const a = points[index], b = points[index + 1];
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  const car = {x: a.x, z: a.z, y: scablandsActorHeightAt(a.x, a.z, -100)};
  const x = a.x + 20 * dx / length, z = a.z + 20 * dz / length;
  const watcher = {x, z, y: scablandsActorHeightAt(x, z, -100)};
  assert.ok(riverGorgeDepthAt(car.x, car.z) > 7, 'car is in the river bed');
  assert.ok(Math.abs(scablandsActorHeightAt(car.x, car.z) - car.y) < .1, 'car is beyond the deck');
  assert.equal(sees(watcher, car, {heightAt: scablandsSurfaceHeightAt, actorFloors: true,
    eye: 1.5, target: 1.5, step: 1}), true);
});

test('the tunnel roof hides a car from a watcher above', () => {
  const trial = westScarpTrial(scablandsSurfaceHeightAt);
  const tunnels = createGroundTunnels([trial.segment], {heightAt: scablandsSurfaceHeightAt});
  const {start, end, radius} = trial.segment;
  const t = .3, x = start.x + (end.x - start.x) * t, z = start.z + (end.z - start.z) * t;
  const car = {x, z, y: start.y + (end.y - start.y) * t - radius * .55};
  const watcher = {x, z, y: scablandsSurfaceHeightAt(x, z)};
  assert.ok(watcher.y > car.y + radius * 2, 'trial has rock above the car');
  assert.equal(sees(watcher, car, {heightAt: scablandsSurfaceHeightAt, actorFloors: true, tunnels, step: .5}), false);
});

test('actors can see along the trial tunnel bore', () => {
  const trial = westScarpTrial(scablandsSurfaceHeightAt);
  const tunnels = createGroundTunnels([trial.segment], {heightAt: scablandsSurfaceHeightAt});
  const {start, end, radius} = trial.segment;
  const at = t => ({x: start.x + (end.x - start.x) * t,
    z: start.z + (end.z - start.z) * t, y: start.y + (end.y - start.y) * t - radius * .55});
  assert.equal(sees(at(.3), at(.7), {heightAt: scablandsSurfaceHeightAt, actorFloors: true,
    tunnels, eye: 1.5, target: 1.5, step: 1}), true);
});

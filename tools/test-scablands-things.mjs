import test from 'node:test';
import assert from 'node:assert/strict';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {ROAD_NET, ROAD_HALF_WIDTH, distanceToNet} from '../src/world/scablands-road.js';
import {smallThingsInCell, SMALL_DENSITY, THINGS_CELL, nearRoadForLitter, tracksForWay, pylonCandidates, telegraphCandidates, fenceCandidates, scarpBoulderCandidates, loneBoulderInCell, BOULDER_CELL, thingFootprintClear, forkSigns} from '../src/world/scablands-things.js';
import {HOT_DELIVERY_WAYS, routeFor} from '../src/world/scablands-ways.js';
import {RIVER_LAND, stepsWayFor} from '../src/world/scablands-regions.js';
import {GAS_RUN_PATHS} from '../src/world/jobs/gas-run.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {SCARPS, scarpsFor} from '../src/world/scablands-scarps.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {clearedFixedThings, clearedLoneBoulder, thingSolids, thingSolidGrid, realismThingsData, thingLandmarkLines} from '../src/world/scablands-things.js';
import {createFixedThingsView, createSmallThingsView, createThingsLinesView, createRealismThingsView, createForkSignsView} from '../src/world/scablands-things-view.js';
import * as THREE from 'three';
import {createJobSolidGrid, SOLID_GRID} from '../src/world/scablands-solids.js';

test('a job queries its supplied land grid as well as its temporary braziers', () => {
  const fixed = clearedFixedThings(1989, []);
  const things = thingSolidGrid(fixed);
  const pole = things.solids.find(solid => solid.kind === 'telegraph');
  const job = createJobSolidGrid(things);
  job.setBraziers([{x: pole.x + 10, z: pole.z}]);
  const nearby = job.near(pole.x, pole.z, pole.x, pole.z, 12);
  assert.ok(nearby.includes(pole));
  assert.ok(nearby.some(solid => solid.id === 'brazier-1'));
  const defaultJob = createJobSolidGrid();
  assert.deepEqual(defaultJob.near(pole.x, pole.z, pole.x, pole.z, 6),
    [...SOLID_GRID.near(pole.x, pole.z, pole.x, pole.z, 6)]);
});

test('every collision footprint belongs to one batch, and is drawn at its own place and size when the player is near', () => {
  const fixed = clearedFixedThings(1989, []);
  const rock = clearedLoneBoulder(1989, 0, 0, []);
  const solids = thingSolids(fixed, [rock]);
  const view = createFixedThingsView(fixed, [rock]);
  const drawn = view.group.children.flatMap(mesh => mesh.userData.solidIds);
  assert.deepEqual([...drawn].sort(), solids.map(part => part.id).sort());
  // Standing things are drawn by distance (Claude's drawing): nothing before the first update, and after it each thing
  // well inside its range stands exactly on its footprint.
  assert.ok(view.group.children.every(mesh => mesh.count === 0));
  const centre = solids.find(part => part.kind === 'telegraph');
  view.update(centre.x, centre.z);
  const checked = [];
  for (const mesh of view.group.children) {
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
    const mine = new Set(mesh.userData.solidIds);
    assert.ok(mesh.count <= mine.size);
    for (let index = 0; index < mesh.count; index++) {
      mesh.getMatrixAt(index, matrix);
      matrix.decompose(position, rotation, scale);
      const solid = solids.find(part => mine.has(part.id) && Math.hypot(part.x - position.x, part.z - position.z) < .001);
      assert.ok(solid, `${mesh.name} draws a thing where a footprint is`);
      if (Math.hypot(solid.x - centre.x, solid.z - centre.z) > 300) continue;
      assert.ok(position.distanceTo(new THREE.Vector3(...solid.center)) < .001);
      assert.ok(scale.distanceTo(new THREE.Vector3(...solid.size)) < .001);
      const expected = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), solid.heading);
      assert.ok(rotation.angleTo(expected) < .001);
      checked.push(solid.id);
    }
  }
  assert.ok(checked.length > 3, 'things near the player were checked');
  const near = solids.filter(part => Math.hypot(part.x - centre.x, part.z - centre.z) <= 300).map(part => part.id);
  assert.deepEqual(checked.sort(), near.sort(), 'every footprint within 300 m is drawn once');
  view.dispose();
  assert.equal(view.group.children.length, 0);
});

test('small things use one batch per kind and follow the player; only the kinds that stand up cast a shadow', () => {
  assert.throws(() => createSmallThingsView({seed: 1989}), TypeError);
  const view = createSmallThingsView({seed: 1989, jobStarts: []});
  const p = LAND.between('yard', 'tin-town', .4);
  view.update(p.x, p.z);
  assert.equal(view.group.children.length, 8);
  assert.ok(view.group.children.some(mesh => mesh.count > 0));
  assert.ok(view.group.children.every(mesh => mesh.isInstancedMesh));
  assert.deepEqual(view.group.children.filter(mesh => mesh.castShadow).map(mesh => mesh.name).sort(),
    ['Scablands brush', 'Scablands scrub', 'Scablands stump']);
  const first = view.group.children.map(mesh => Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16)));
  view.update(p.x, p.z);
  assert.deepEqual(view.group.children.map(mesh => Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16))), first);
  view.update(p.x + 200, p.z);
  assert.notDeepEqual(view.group.children.map(mesh => Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16))), first);
  view.dispose();
  assert.equal(view.group.children.length, 0);
});

test('cleared things produce collision records in the spatial index', () => {
  const fixed = clearedFixedThings(1989, []);
  const rock = clearedLoneBoulder(1989, 0, 0, []);
  const solids = thingSolids(fixed, [rock]);
  const grid = thingSolidGrid(fixed, [rock]);
  assert.deepEqual(grid.solids, solids);
  const things = [...fixed.pylons.filter(Boolean), ...fixed.telegraphs.flatMap(line => line.poles.filter(Boolean)),
    ...fixed.fences.flatMap(run => run.posts.filter(Boolean)), ...fixed.boulders, ...[rock].filter(Boolean)];
  for (const thing of things) {
    const parts = solids.filter(solid => solid.thingId === thing.id);
    assert.equal(parts.length, thing.id.startsWith('pylon:') ? 4 : 1);
    for (const part of parts) {
      assert.ok(grid.near(part.x, part.z, part.x, part.z, 0).includes(grid.solids.find(s => s.id === part.id)));
      assert.deepEqual(part.collision.center, part.center);
      if (part.kind === 'fence-post') assert.equal(part.canFall, true);
    }
  }
  assert.equal(new Set(solids.map(solid => solid.id)).size, solids.length);
});

test('fixed candidates retain line gaps and clear full footprints and job starts', () => {
  const original = clearedFixedThings(1989, []);
  assert.deepEqual(original, clearedFixedThings(1989, []));
  const first = original.telegraphs[0].poles.find(Boolean);
  const starts = [{x: first.x, z: first.z}];
  const cleared = clearedFixedThings(1989, starts);
  assert.equal(cleared.telegraphs[0].poles.find(p => p?.id === first.id), undefined);
  assert.equal(cleared.telegraphs[0].poles.length, telegraphCandidates(1989)[0].poles.length);
  for (const p of cleared.pylons.filter(Boolean)) assert.ok(thingFootprintClear(p.x, p.z, 6, starts));
  for (const line of cleared.telegraphs) for (const p of line.poles.filter(Boolean))
    assert.ok(thingFootprintClear(p.x, p.z, p.state === 'down' ? 7 : .5, starts));
  for (const run of cleared.fences) for (const p of run.posts.filter(Boolean)) {
    assert.ok(!p.gap && p.canFall);
    assert.ok(thingFootprintClear(p.x, p.z, .25, starts));
  }
  for (const rock of cleared.boulders) assert.ok(thingFootprintClear(rock.x, rock.z, rock.size / 2, starts));
  const yard = LAND.at('yard');
  for (let i = Math.floor(yard.x / BOULDER_CELL) - 3; i <= Math.floor(yard.x / BOULDER_CELL) + 3; i++)
    for (let j = Math.floor(yard.z / BOULDER_CELL) - 3; j <= Math.floor(yard.z / BOULDER_CELL) + 3; j++) {
      const rock = clearedLoneBoulder(1989, i, j, starts);
      if (rock) assert.ok(thingFootprintClear(rock.x, rock.z, rock.size / 2, starts));
    }
  assert.throws(() => clearedFixedThings(1989), RangeError);
  assert.throws(() => clearedLoneBoulder(1989, 0, 0), RangeError);
});

test('seeded rock falls follow the foot of each scarp', () => {
  const rocks = scarpBoulderCandidates(1989);
  assert.deepEqual(rocks, scarpBoulderCandidates(1989));
  assert.notDeepEqual(rocks, scarpBoulderCandidates(1990));
  for (const scarp of SCARPS) {
    const group = rocks.filter(rock => rock.scarp === scarp.id);
    assert.ok(group.length > 2);
    const {a, b} = scarp.stretches[0], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    for (const rock of group) {
      const foot = ((rock.x - a.x) * dz - (rock.z - a.z) * dx) / length;
      assert.ok(foot >= 3 && foot <= 27);
      assert.ok(rock.size >= 1 && rock.size < 4);
      assert.ok(Number.isFinite(rock.y));
    }
  }
  const moved = createLand(movedTable(SCABLANDS_PLACES, 'ridge', 200, 100));
  const old = rocks.find(rock => rock.scarp === 'ridge-south');
  const next = scarpBoulderCandidates(1989, scarpsFor(moved)).find(rock => rock.id === old.id);
  assert.ok(Math.abs(next.x - old.x - 200) < 1e-8);
  assert.ok(Math.abs(next.z - old.z - 100) < 1e-8);
});

const cell = point => [Math.floor(point.x / THINGS_CELL), Math.floor(point.z / THINGS_CELL)];
test('telegraph candidates follow both lines at 60 metre intervals', () => {
  const lines = telegraphCandidates(1989);
  assert.deepEqual(lines, telegraphCandidates(1989));
  assert.deepEqual(lines.map(line => line.id), ['east-road', 'iron-line']);
  assert.notDeepEqual(lines, telegraphCandidates(1990));
  for (const line of lines) {
    assert.ok(line.poles.length > 20);
    assert.ok(line.poles.some(p => p.state === 'down'));
    assert.ok(line.poles.some(p => p.state === 'leaning'));
    for (const [i, pole] of line.poles.entries()) {
      assert.equal(pole.along, i * 60);
      assert.ok(Number.isFinite(pole.x) && Number.isFinite(pole.y) && Number.isFinite(pole.z));
    }
  }
});
test('pylon candidates follow named places at a continuous 350 metre spacing', () => {
  const line = pylonCandidates(1989);
  assert.ok(line.length > 20);
  assert.deepEqual(line, pylonCandidates(1989));
  assert.notDeepEqual(line.map(p => p.cableDown), pylonCandidates(1990).map(p => p.cableDown));
  assert.deepEqual({x: line[0].x, z: line[0].z}, LAND.at('dry-dam', 100, 0));
  for (const [i, p] of line.entries()) {
    assert.equal(p.along, i * 350);
    assert.equal(p.height, 40);
    assert.ok(Number.isFinite(p.y));
  }
  const moved = createLand(movedTable(SCABLANDS_PLACES, 'dry-dam', 200, 100));
  assert.deepEqual({x: pylonCandidates(1989, moved)[0].x, z: pylonCandidates(1989, moved)[0].z}, moved.at('dry-dam', 100, 0));
});
test('small things are stable by seed and cell and avoid roads and job starts', () => {
  const [i, j] = cell(LAND.between('yard', 'tin-town', .4));
  const starts = [LAND.between('yard', 'tin-town', .4)];
  let count = 0;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const things = smallThingsInCell(1989, i + dx, j + dz, starts);
    assert.deepEqual(things, smallThingsInCell(1989, i + dx, j + dz, starts));
    for (const item of things) {
      assert.equal(ROAD_NET.nearest(item.x, item.z), null);
      assert.ok(Math.hypot(item.x - starts[0].x, item.z - starts[0].z) >= 6);
      assert.ok(Number.isFinite(item.y));
      if (item.kind === 'stone') assert.ok(item.size >= .1 && item.size <= .6 && item.shape < 3);
      count++;
    }
  }
  assert.ok(count > 0);
  assert.notDeepEqual(smallThingsInCell(1989, i, j), smallThingsInCell(1990, i, j));
});
test('ground preferences keep scrub off salt and put more stones on plates', () => {
  assert.equal(SMALL_DENSITY['salt-pan'].scrub, undefined);
  assert.ok(SMALL_DENSITY['scab-plates'].stone > SMALL_DENSITY.flats.stone);
  assert.ok(SMALL_DENSITY['wreck-fields'].scrap > 0);
  assert.ok(SMALL_DENSITY.burn.stump > 0);
});

test('single boulders are stable within their cells and follow ground height', () => {
  const origin = LAND.at('yard');
  const i = Math.floor(origin.x / BOULDER_CELL), j = Math.floor(origin.z / BOULDER_CELL);
  let count = 0, changed = false;
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) {
    const xCell = i + dx, zCell = j + dz;
    const rock = loneBoulderInCell(1989, xCell, zCell);
    assert.deepEqual(rock, loneBoulderInCell(1989, xCell, zCell));
    if (JSON.stringify(rock) !== JSON.stringify(loneBoulderInCell(1990, xCell, zCell))) changed = true;
    if (!rock) continue;
    assert.equal(Math.floor(rock.x / BOULDER_CELL), xCell);
    assert.equal(Math.floor(rock.z / BOULDER_CELL), zCell);
    assert.ok(rock.size >= 1 && rock.size < 4);
    assert.equal(rock.y, scablandsSurfaceHeightAt(rock.x, rock.z));
    count++;
  }
  assert.ok(count > 0);
  assert.ok(changed);
});

test('the local roadside search agrees with the complete road net', () => {
  for (const road of ROAD_NET.roads) {
    for (let i = 0; i + 1 < road.points.length; i += 3) {
      const a = road.points[i], b = road.points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
      const length = Math.hypot(dx, dz) || 1;
      for (const offset of [-65, -42.1, -41.9, 0, 41.9, 42.1, 65]) {
        const x = (a.x + b.x) / 2 + dz / length * offset;
        const z = (a.z + b.z) / 2 - dx / length * offset;
        assert.equal(nearRoadForLitter(x, z), distanceToNet(x, z) < ROAD_HALF_WIDTH + 28, `${road.id} at ${offset} m`);
      }
    }
  }
});

test('track data follows map routes in pairs and is stronger at crossings', () => {
  const way = HOT_DELIVERY_WAYS.find(item => item.id === 'river-bed');
  const points = routeFor(way.legs, {start: LAND.yard, destination: LAND.at('tin-town')});
  const tracks = tracksForWay(points);
  assert.ok(tracks.length > 0);
  assert.deepEqual(tracks, tracksForWay(points));
  assert.equal(tracks.length % 2, 0);
  assert.ok(tracks.some(track => track.strength === 1));
  assert.ok(tracks.some(track => track.strength === .5));
  for (let i = 0; i < tracks.length; i += 2) {
    const a = tracks[i], b = tracks[i + 1];
    assert.ok(Math.abs(Math.hypot(a.x1 - b.x1, a.z1 - b.z1) - 1.6) < 1e-7);
    assert.equal(a.strength, b.strength);
    assert.equal(ROAD_NET.nearest(a.x1, a.z1), null);
    assert.equal(ROAD_NET.nearest(b.x2, b.z2), null);
    const x = (a.x1 + a.x2 + b.x1 + b.x2) / 4, z = (a.z1 + a.z2 + b.z1 + b.z2) / 4;
    assert.equal(a.strength === 1, RIVER_LAND.crossings.some(p => Math.hypot(x - p.x, z - p.z) < p.reach));
  }
  assert.deepEqual(tracksForWay([]), []);
});


test('fence candidates follow town approaches with seeded gaps and fall markers', () => {
  const runs = fenceCandidates(1989);
  assert.ok(runs.length > 0);
  assert.deepEqual(runs, fenceCandidates(1989));
  assert.notDeepEqual(runs, fenceCandidates(1990));
  assert.ok(runs.some(run => run.posts.some(post => post.gap)));
  for (const run of runs) {
    assert.equal(run.town, 'tin-town');
    assert.ok(run.length >= 200 && run.length <= 600);
    assert.ok(run.posts.length > 20);
    for (const post of run.posts) {
      assert.equal(post.canFall, true);
      assert.ok(Number.isFinite(post.y));
      assert.ok(Math.hypot(post.x - LAND.at('tin-town').x, post.z - LAND.at('tin-town').z) < 1000);
    }
  }
});


test('whole footprints clear roads, existing solids and job starts', async () => {
  const {SCABLANDS_SOLIDS} = await import('../src/world/scablands-solids.js');
  const road = ROAD_NET.roads[0], a = road.points[0], b = road.points[1];
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
  assert.equal(thingFootprintClear(x, z, 2, []), false);
  assert.equal(thingFootprintClear(x + dz / length * (ROAD_HALF_WIDTH + 1), z - dx / length * (ROAD_HALF_WIDTH + 1), 2, []), false);
  const solid = SCABLANDS_SOLIDS[0];
  assert.equal(thingFootprintClear(solid.x, solid.z, 2, []), false);
  const start = LAND.between('yard', 'tin-town', .4);
  assert.equal(thingFootprintClear(start.x, start.z, 2, [start]), false);
  assert.throws(() => thingFootprintClear(x, z, 2), RangeError);
  assert.throws(() => thingFootprintClear(x, z, 29, []), RangeError);
});

test('a tower is drawn at each standing pylon, and spans sag without crossing missing supports', () => {
  const p = (x, y = 0) => ({x, y, z: 0, heading: 0, state: 'upright'});
  const fixed = {pylons: [p(0), p(350), null, p(1050)],
    telegraphs: [{poles: [p(0), p(60), null, p(180), {...p(240), state: 'down'}]}],
    fences: [{posts: [p(0), p(8), null, p(24)]}]};
  const view = createThingsLinesView(fixed);
  const tower = view.group.getObjectByName('Scablands pylons');
  const wire = view.group.getObjectByName('Scablands wires');
  assert.ok(tower.isInstancedMesh);
  assert.equal(tower.count, 3);
  assert.equal(wire.geometry.getAttribute('position').count, 3 * 8 * 2);
  const points = wire.geometry.getAttribute('position');
  assert.ok(points.getY(7) < points.getY(0));
  assert.ok(points.getY(7) < points.getY(15));
  view.dispose();
  assert.equal(view.group.children.length, 0);
});

test('the scene trial keeps its batches until disposal and creates nothing when off', () => {
  const options = {seed: 1989, jobStarts: [], halfWidth: 240, halfDepth: 240};
  assert.equal(createRealismThingsView({...options, enabled: false}), null);
  const view = createRealismThingsView({...options, enabled: true});
  const batches = [...view.group.children[0].children];
  view.update(0, 0);
  assert.ok(batches.some(mesh => mesh.count > 0));
  view.update(50, 50);
  assert.deepEqual(view.group.children[0].children, batches);
  assert.ok(view.group.getObjectByName('Scablands pylons'));
  assert.ok(view.group.getObjectByName('Scablands wires'));
  view.dispose();
  assert.equal(view.group.children.length, 0);
});

test('the scene and a separate solid index use the same seeded land', () => {
  const options = {seed: 1989, jobStarts: [], halfWidth: 240, halfDepth: 240};
  assert.equal(realismThingsData({...options, enabled: false}), null);
  const data = realismThingsData({...options, enabled: true});
  const view = createRealismThingsView({...options, enabled: true});
  const grid = thingSolidGrid(data.fixed, data.loneBoulders);
  assert.deepEqual(data.fixed, view.fixed);
  assert.deepEqual(data.loneBoulders, view.loneBoulders);
  const drawn = view.group.children[1].children.flatMap(mesh => mesh.userData.solidIds);
  assert.deepEqual(drawn.sort(), grid.solids.map(solid => solid.id).sort());
  view.dispose();
});

test('the course owns the trial solids used by the car and job grids', async () => {
  const {featureFlags} = await import('../src/feature-flags.js');
  const {Course} = await import('../src/course.js');
  const {SCABLANDS_VENUE} = await import('../src/world/scablands.js');
  const {scablandsContactObstacles} = await import('../src/sim-scablands.js');
  const enabled = featureFlags.enabled;
  try {
    featureFlags.enabled = name => name === 'scablands-realism';
    const course = new Course(SCABLANDS_VENUE, 1989);
    const rock = course.solidGrid.solids.find(solid => solid.kind === 'boulder');
    assert.ok(rock);
    const duel = {course, state: {}};
    assert.ok(scablandsContactObstacles(duel, null, rock, rock, []).includes(rock));
    const job = createJobSolidGrid(course.solidGrid);
    duel.state.arena = {worldJob: {solidGrid: job}};
    assert.ok(scablandsContactObstacles(duel, null, rock, rock, []).includes(rock));
    const view = createRealismThingsView({enabled: true, seed: course.seed, ...SCABLANDS_VENUE.scablands,
      jobStarts: course.realismThings.jobStarts, data: course.realismThings});
    assert.equal(view.fixed, course.realismThings.fixed);
    view.dispose();
    featureFlags.enabled = () => false;
    const plain = new Course(SCABLANDS_VENUE, 1989);
    assert.equal(plain.realismThings, undefined);
    assert.equal(plain.solidGrid, undefined);
    assert.ok(!scablandsContactObstacles({course: plain, state: {}}, null, rock, rock, []).includes(rock));
  } finally { featureFlags.enabled = enabled; }
});

test('an arena uses its own realism switch when it creates the course', async () => {
  const {Duel} = await import('../src/game.js');
  for (const enabled of [false, true]) {
    const duel = new Duel({seed: 1989, featureFlags: {'hidden-road': true, 'scablands-realism': enabled}});
    duel.state.wastelandGateDiscovered = true;
    assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car: 'falcone_f42', seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
    assert.equal(Boolean(duel.course.realismThings), enabled);
    assert.equal(Boolean(duel.course.solidGrid), enabled);
  }
});

test('the scene loads the trial only with its switch on', async () => {
  const {featureFlags} = await import('../src/feature-flags.js');
  const {Course} = await import('../src/course.js');
  const {SCABLANDS_VENUE} = await import('../src/world/scablands.js');
  const {createScablandsScene} = await import('../src/world/scablands-scene.js');
  const enabled = featureFlags.enabled;
  featureFlags.enabled = name => name === 'scablands-realism' || enabled(name);
  let scene;
  try {
    scene = createScablandsScene(new Course(SCABLANDS_VENUE, 1989), {groundPhotos: false, loadAsset: async () => {
      const root = new THREE.Group();
      for (const name of ['Big Bess gas truck', "Old Smoke's rolling furnace"]) {
        const model = new THREE.Group(); model.name = name; root.add(model);
      }
      return {scene: root};
    }});
    assert.equal(await scene.ready, true);
    assert.ok(scene.group.getObjectByName('Scablands realism things'));
  } finally {
    scene?.dispose();
    featureFlags.enabled = enabled;
  }
});


test('fork signs use road destinations and share their posts with the solid index', () => {
  const signs = forkSigns([]);
  assert.ok(signs.length > 0);
  assert.deepEqual(signs, forkSigns([]));
  const fixed = clearedFixedThings(1989, []), grid = thingSolidGrid(fixed);
  assert.deepEqual(fixed.signs, signs);
  for (const sign of signs) {
    assert.ok(thingFootprintClear(sign.x, sign.z, .25, []));
    assert.ok(sign.destinations.length > 0);
    for (const destination of sign.destinations) {
      assert.equal(LAND.place(destination.id).name, destination.name);
      assert.ok(Number.isInteger(destination.km) && destination.km > 0);
    }
    assert.ok(grid.near(sign.x, sign.z, sign.x, sign.z, 0).some(part => part.id === sign.id && part.kind === 'sign-post'));
  }
  const blocked = forkSigns([{x: signs[0].x, z: signs[0].z}]);
  assert.ok(Math.hypot(blocked[0].x - signs[0].x, blocked[0].z - signs[0].z) >= 6.25);
  const written = [];
  const original = globalThis.document;
  // A stand-in canvas: every drawing call does nothing, and the words painted are kept.
  const pen = new Proxy({}, {get: (target, name) => name === 'fillText' ? text => { written.push(text); } : name in target ? target[name] : () => {}, set: (target, name, value) => { target[name] = value; return true; }});
  globalThis.document = {createElement: () => ({getContext: () => pen})};
  let view;
  try {
    view = createForkSignsView(signs);
    assert.equal(view.group.children.length, 1);
    assert.ok(view.group.children[0].material.map.isCanvasTexture);
    assert.equal(written.length, signs.reduce((sum, sign) => sum + Math.min(sign.destinations.length, 4), 0));
    assert.ok(written.every(text => /^[A-Z' ]+  \d+ km$/.test(text)), 'each line is a place and its distance; the arrow is painted, not written');
  } finally {
    view?.dispose();
    if (original === undefined) delete globalThis.document; else globalThis.document = original;
  }
});

test('ground track hook preserves the original shader when tracks are absent', async () => {
  const {createGroundLook} = await import('../src/world/scablands-ground-look.js');
  const compile = look => {
    const material = look.apply(new THREE.MeshStandardMaterial());
    const shader = {uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>',
      fragmentShader: '#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>\n#include <normal_fragment_maps>'};
    material.onBeforeCompile(shader);
    return shader;
  };
  const original = compile(createGroundLook());
  const disabled = createGroundLook();
  disabled.setTracks(null);
  assert.deepEqual(compile(disabled), original);
  const enabled = createGroundLook();
  enabled.setTracks({texture: {value: null}, box: {value: new THREE.Vector4()}});
  assert.match(compile(enabled).fragmentShader, /texture2D\(uTracks,trackUV\)/);
});

test('track drawing uses the named ways and refreshes as the player moves', async () => {
  const {scablandsTracks, createScablandsTracks} = await import('../src/world/scablands-tracks.js');
  const segments = scablandsTracks();
  assert.ok(segments.some(item => item.strength === .5));
  assert.ok(segments.some(item => item.strength === 1));
  let clears = 0, strokes = 0;
  const context = {fillRect() { clears++; }, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { strokes++; }};
  const view = createScablandsTracks({getContext: () => context});
  const point = segments[0];
  view.update(point.x1, point.z1);
  assert.ok(strokes > 0);
  view.update(point.x1, point.z1);
  assert.equal(clears, 1);
  view.update(point.x1 + 512, point.z1);
  assert.equal(clears, 2);
  view.dispose();
});


test('map landmark lines follow the drawn supports and stop at gaps', () => {
  const a = {x: 0, z: 0}, b = {x: 1, z: 1}, c = {x: 2, z: 2};
  const lines = thingLandmarkLines({pylons: [a, b, null, c], telegraphs: [
    {id: 'east-road', poles: [a, b, {...c, state: 'down'}, a, c]},
    {id: 'iron-line', poles: [b, c]},
  ]});
  assert.deepEqual(lines.map(line => [line.kind, line.id, line.points]), [
    ['pylon', 'pylons', [a, b]], ['telegraph', 'east-road', [a, b]],
    ['telegraph', 'east-road', [a, c]], ['telegraph', 'iron-line', [b, c]],
  ]);
});


test('named ways, truck routes and crossing ramps reject new footprints', () => {
  const routes = HOT_DELIVERY_WAYS.map(way => routeFor(way.legs, {start: LAND.yard, destination: LAND.at('tin-town')}));
  routes.push(...Object.values(GAS_RUN_PATHS).map(path => path.map(place => place.position)));
  for (const job of EVERBURN_JOBS) for (const step of job.steps)
    if (step.path && (step.kind === 'escort' || step.actor?.id === 'old-smoke-furnace')) routes.push(step.path.map(place => place.position));
  const steps = stepsWayFor();
  routes.push([-1, 1].map(side => ({x: steps.x + side * steps.nx * steps.reach, z: steps.z + side * steps.nz * steps.reach})));
  for (const points of routes) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 20);
    for (let n = 0; n <= count; n++) {
      const t = n / count;
      assert.equal(thingFootprintClear(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0, []), false);
    }
  }
  for (const crossing of RIVER_LAND.crossings.filter(item => ['wash', 'ford', 'bridge', 'pipe'].includes(item.kind)))
    assert.equal(thingFootprintClear(crossing.x, crossing.z, 0, []), false, crossing.id);
});

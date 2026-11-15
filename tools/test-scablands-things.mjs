import test from 'node:test';
import assert from 'node:assert/strict';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {ROAD_NET, ROAD_HALF_WIDTH, distanceToNet} from '../src/world/scablands-road.js';
import {smallThingsInCell, SMALL_DENSITY, THINGS_CELL, nearRoadForLitter, tracksForWay, pylonCandidates, telegraphCandidates, fenceCandidates, scarpBoulderCandidates, loneBoulderInCell, BOULDER_CELL, thingFootprintClear} from '../src/world/scablands-things.js';
import {HOT_DELIVERY_WAYS, routeFor} from '../src/world/scablands-ways.js';
import {RIVER_LAND} from '../src/world/scablands-regions.js';
import {SCARPS, scarpsFor} from '../src/world/scablands-scarps.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {clearedFixedThings, clearedLoneBoulder, thingSolids, thingSolidGrid} from '../src/world/scablands-things.js';
import {createFixedThingsView, createSmallThingsView} from '../src/world/scablands-things-view.js';
import * as THREE from 'three';

test('fixed drawing uses every collision footprint once', () => {
  const fixed = clearedFixedThings(1989, []);
  const rock = clearedLoneBoulder(1989, 0, 0, []);
  const solids = thingSolids(fixed, [rock]);
  const view = createFixedThingsView(fixed, [rock]);
  const drawn = view.group.children.flatMap(mesh => mesh.userData.solidIds);
  assert.deepEqual([...drawn].sort(), solids.map(part => part.id).sort());
  for (const mesh of view.group.children) {
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
    for (const [index, id] of mesh.userData.solidIds.entries()) {
      const solid = solids.find(part => part.id === id);
      mesh.getMatrixAt(index, matrix);
      matrix.decompose(position, rotation, scale);
      assert.ok(position.distanceTo(new THREE.Vector3(...solid.center)) < .001);
      assert.ok(scale.distanceTo(new THREE.Vector3(...solid.size)) < .001);
    }
  }
  view.dispose();
  assert.equal(view.group.children.length, 0);
});

test('small things use one batch per kind and follow the player without shadows', () => {
  assert.throws(() => createSmallThingsView({seed: 1989}), TypeError);
  const view = createSmallThingsView({seed: 1989, jobStarts: []});
  const p = LAND.between('yard', 'tin-town', .4);
  view.update(p.x, p.z);
  assert.equal(view.group.children.length, 8);
  assert.ok(view.group.children.some(mesh => mesh.count > 0));
  assert.ok(view.group.children.every(mesh => !mesh.castShadow && mesh.isInstancedMesh));
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

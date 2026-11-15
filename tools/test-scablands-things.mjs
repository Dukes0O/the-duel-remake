import test from 'node:test';
import assert from 'node:assert/strict';
import {LAND} from '../src/world/scablands-names.js';
import {ROAD_NET, ROAD_HALF_WIDTH, distanceToNet} from '../src/world/scablands-road.js';
import {smallThingsInCell, SMALL_DENSITY, THINGS_CELL, nearRoadForLitter, tracksForWay} from '../src/world/scablands-things.js';
import {HOT_DELIVERY_WAYS, routeFor} from '../src/world/scablands-ways.js';
import {RIVER_LAND} from '../src/world/scablands-regions.js';

const cell = point => [Math.floor(point.x / THINGS_CELL), Math.floor(point.z / THINGS_CELL)];
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {LAND} from '../src/world/scablands-names.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {smallThingsInCell, SMALL_DENSITY, THINGS_CELL} from '../src/world/scablands-things.js';

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

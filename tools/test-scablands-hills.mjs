import test from 'node:test';
import assert from 'node:assert/strict';
import {HILLS, hillsFor, hillHeightAt, scablandsTerrainHeightAt} from '../src/world/scablands-height.js';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {riseHeightAt} from '../src/world/scablands-regions.js';
import {scarpHeightAt} from '../src/world/scablands-scarps.js';
import {SCABLANDS_LAYOUT} from '../src/world/scablands.js';

test('the dunes follow the Ships, have soft crests, and leave every road clear', () => {
  const moved = hillsFor(createLand(movedTable(SCABLANDS_PLACES, 'ships-in-sand', 100, 200)));
  for (const [index, hill] of HILLS.filter(hill => hill.kind === 'dune').entries()) {
    assert.equal(moved[index].x - hill.x, 100);
    assert.equal(moved[index].z - hill.z, 200);
    assert.ok(Math.hypot(hill.x - LAND.place('ships-in-sand').x, hill.z - LAND.place('ships-in-sand').z) < 1500);
    assert.ok(hill.height >= 8 && hill.height <= 15);
    assert.equal(hillHeightAt(hill.x, hill.z), hill.height);
    assert.ok(hill.height * 1.5 / hill.radius < .12);
    for (const road of ROAD_NET.roads) for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((hill.x - a.x) * dx + (hill.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      assert.ok(Math.hypot(hill.x - a.x - t * dx, hill.z - a.z - t * dz) > hill.radius + road.halfWidth, `${road.id} clears a dune`);
    }
  }
});

test('the Breaks have spaced hills and leave the road passes open', () => {
  const hills = HILLS.filter(hill => hill.kind === 'breaks');
  assert.ok(hills.length >= 3);
  const mall = LAND.place('dead-mall');
  for (const [index, hill] of hills.entries()) {
    assert.ok(hill.x < 0 && hill.z > 0 && hill.z < mall.z);
    assert.ok(hill.height >= 40 && hill.height <= 90);
    assert.equal(hillHeightAt(hill.x, hill.z), hill.height);
    if (index) {
      const previous = hills[index - 1];
      const spacing = Math.hypot(hill.x - previous.x, hill.z - previous.z);
      assert.ok(spacing >= 400 && spacing <= 900);
    }
    for (const road of ROAD_NET.roads) for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((hill.x - a.x) * dx + (hill.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      assert.ok(Math.hypot(hill.x - a.x - t * dx, hill.z - a.z - t * dz) > hill.radius + road.halfWidth, `${road.id} clears the Breaks`);
    }
  }
});

test('the Lookout has a level top, follows the Ridge, and leaves roads clear', () => {
  const hill = HILLS.find(item => item.kind === 'lookout');
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

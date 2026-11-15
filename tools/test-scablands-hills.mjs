import test from 'node:test';
import assert from 'node:assert/strict';
import {HILLS, hillsFor, hillHeightAt, scablandsTerrainHeightAt} from '../src/world/scablands-height.js';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {GROUND_AREAS, groundAreas, polygonMargin, riseHeightAt} from '../src/world/scablands-regions.js';
import {scarpHeightAt} from '../src/world/scablands-scarps.js';
import {SCABLANDS_LAYOUT} from '../src/world/scablands.js';
import {sees} from '../src/world/scablands-ways.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';

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

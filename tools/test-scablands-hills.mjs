import test from 'node:test';
import assert from 'node:assert/strict';
import {HILLS, hillsFor, hillHeightAt, scablandsTerrainHeightAt, scablandsHeightAt} from '../src/world/scablands-height.js';
import {LAND, createLand, movedTable} from '../src/world/scablands-names.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {GROUND_AREAS, groundAreas, polygonMargin, riseHeightAt} from '../src/world/scablands-regions.js';
import {scarpHeightAt, SCARPS, preparedScarps} from '../src/world/scablands-scarps.js';
import {makeCoarseGround} from '../src/world/scablands-scene.js';
import {SCABLANDS_LAYOUT} from '../src/world/scablands.js';
import {sees} from '../src/world/scablands-ways.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {createRiverDraw} from '../src/world/scablands-draw.js';
import {RIVER_LAND, riverGorgeDepthAt} from '../src/world/scablands-regions.js';

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

test('the scab plates have level mesas with steep sides and a drivable ramp', () => {
  const mesas = HILLS.filter(hill => hill.kind === 'mesa');
  assert.ok(mesas.length >= 2);
  const plates = GROUND_AREAS.polygons.find(area => area.id === 'scab-plates');
  for (const mesa of mesas) {
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
  assert.ok(foothills.length >= 2);
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

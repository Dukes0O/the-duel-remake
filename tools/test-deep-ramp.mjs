import assert from 'node:assert/strict';
import test from 'node:test';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { ROUTE_VARIANTS } from '../src/route-variants.js';
import { SEA_LEVEL, shoreOffset } from '../src/coastal-water.js';
import { buildPacificRockLayout, offshoreClearance } from '../src/pacific-coast.js';
import { sweepObstacle } from '../src/collision.js';
import { buildDeepRamp } from '../src/deep/deep-ramp.js';

const definition = COURSE.find(course => course.id === 'pacific-canyon');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const near = (actual, expected, label, tolerance = 1e-5) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} differs from ${expected}`);
const obstacleRecords = course => course.features.obstacles.map(obstacle => ({
  data: { ...obstacle }, modelMinY: obstacle.modelMinY, modelMaxY: obstacle.modelMaxY,
  minDescriptor: Object.getOwnPropertyDescriptor(obstacle, 'modelMinY'),
  maxDescriptor: Object.getOwnPropertyDescriptor(obstacle, 'modelMaxY'),
}));
const originalBounds = course => [...course.features.obstacles, ...buildPacificRockLayout(course)];
function clearance(course, ramp) {
  const first = ramp.points[0], last = ramp.points.at(-1);
  for (const original of originalBounds(course)) {
    const obstacle = { ...original, shape: 'box', modelMinY: original.modelMinY, modelMaxY: original.modelMaxY };
    assert.equal(sweepObstacle({ x: first.x, z: first.z }, { x: last.x, z: last.z },
      obstacle, ramp.heading, { halfWidth: 3, halfLength: 0 }), null, 'full strip avoids each original bound');
    assert.equal(sweepObstacle(ramp.cove.center, ramp.cove.center, obstacle, ramp.heading,
      { halfWidth: 3, halfLength: 6 }), null, 'whole cove avoids each original bound');
  }
  assert.equal(offshoreClearance(course, last.x, last.z, Math.hypot(3, 6)), true,
    'existing offshore reader clears a disk covering the entire cove');
  for (const point of ramp.points) for (const offset of [-3, -2, -1, 0, 1, 2, 3]) {
    const x = point.x + Math.cos(ramp.heading) * offset;
    const z = point.z - Math.sin(ramp.heading) * offset;
    const nearest = course.nearest(x, z);
    assert.equal(course.surfaceAt(nearest.s, nearest.lateral).road, false, 'whole strip leaves road/shortcuts clear');
  }
  for (const corner of ramp.cove.corners) {
    const nearest = course.nearest(corner.x, corner.z);
    assert.ok(course.groundAt(nearest.s, nearest.lateral).y < SEA_LEVEL, 'cove is genuinely submerged');
  }
}

test('actual Pacific A/B/C ramps have 120 m of sampled grounded geometry to -23 and preserve generation', () => {
  const selected = [];
  for (const route of ROUTE_VARIANTS) {
    const course = new Course(definition, route.seed), control = new Course(definition, route.seed);
    const originals = obstacleRecords(course), featureText = JSON.stringify(course.features);
    const ramp = buildDeepRamp(course);
    assert.ok(ramp, `${route.label} must have a real clear ramp, without fallback`);
    assert.equal(ramp.courseId, definition.id);
    assert.equal(ramp.width, 6);
    assert.ok(ramp.points.length > 20);
    assert.ok(ramp.points.every(point => [point.x, point.y, point.z, point.progress].every(Number.isFinite)));
    near(ramp.points.slice(1).reduce((sum, point, i) => sum + distance(ramp.points[i], point), 0), 120, 'actual 3D sum');
    near(ramp.length, 120, 'declared length');
    near(ramp.points.at(-1).progress, 120, 'end progress');
    near(ramp.points.at(-1).y, -23, 'actual sea level minus 8');
    for (const point of ramp.points) {
      const nearest = course.nearest(point.x, point.z);
      near(point.y, course.groundAt(nearest.s, nearest.lateral).y, 'centerline follows real terrain');
    }
    const shore = ramp.shoreline.center, nearest = course.nearest(shore.x, shore.z);
    near(shore.y, SEA_LEVEL, 'shoreline sea height');
    near(course.groundAt(nearest.s, nearest.lateral).y, SEA_LEVEL, 'actual descending shoreline');
    near(nearest.lateral, shoreOffset(course, nearest.s), 'existing shoreline reader', .01);
    assert.ok(shore.progress > 0 && shore.progress < 120);
    assert.equal(ramp.shoreline.edges.length, 2);
    assert.ok(ramp.shoreline.edges.every(edge => Number.isFinite(edge.progress) && edge.progress > 0 && edge.progress < 120));
    clearance(course, ramp);
    const again = buildDeepRamp(course);
    assert.deepEqual(ramp, again, 'repeat selection is deterministic');
    assert.notEqual(ramp, again);
    assert.notEqual(ramp.points, again.points);
    assert.notEqual(ramp.cove, again.cove);
    assert.ok(Object.isFrozen(ramp) && Object.isFrozen(ramp.points) && Object.isFrozen(ramp.points[0])
      && Object.isFrozen(ramp.footprint.corners) && Object.isFrozen(ramp.cove.center));
    assert.throws(() => { ramp.points[0].x = 999; }, TypeError);
    assert.equal(JSON.stringify(course.features), featureText);
    assert.deepEqual(obstacleRecords(course), originals, 'non-enumerable model bounds preserved');
    assert.deepEqual(course.features, control.features, 'untouched control features stay exact');
    assert.deepEqual(Array.from({ length: 20 }, () => course.rng.float()),
      Array.from({ length: 20 }, () => control.rng.float()), 'Course RNG progression stays exact');
    selected.push({ route: route.label, atDistance: ramp.atDistance, shoreline: shore.progress,
      points: ramp.points.length, endDepth: SEA_LEVEL - ramp.points.at(-1).y });
  }
  console.log('Actual Pacific ramp geometry: ' + JSON.stringify(selected));
});

test('a bound crossing the first full strip or cove rejects that candidate', () => {
  const course = new Course(definition, ROUTE_VARIANTS[0].seed), first = buildDeepRamp(course);
  assert.ok(first);
  for (const point of [first.points[Math.floor(first.points.length / 2)], first.cove.center]) {
    // High vertical bounds cannot hide a horizontal footprint obstruction.
    const blocker = { x: point.x, z: point.z, y: 1000, height: 1, heading: 0, halfX: 3, halfZ: 3 };
    Object.defineProperties(blocker, { modelMinY: { value: 1000 }, modelMaxY: { value: 1001 } });
    const next = buildDeepRamp(course, { obstacles: [...course.features.obstacles, blocker] });
    assert.ok(next, 'later real candidate remains available');
    assert.ok(next.atDistance > first.atDistance, 'first obstructed candidate is not reused or fitted around');
    clearance(course, next);
    assert.equal(sweepObstacle(next.points[0], next.points.at(-1), blocker, next.heading,
      { halfWidth: 3, halfLength: 0 }), null);
  }
  const stacks = buildPacificRockLayout(course);
  const blockedStack = { ...stacks[0], x: first.cove.center.x, z: first.cove.center.z, halfX: 3, halfZ: 6 };
  const next = buildDeepRamp(course, { buildPacificRockLayout: () => [...stacks, blockedStack] });
  assert.ok(next && next.atDistance > first.atDistance, 'actual stack rectangle contract blocks the first cove');
});

test('unavailable descending shores and offshore clearance return null without fabricated geometry', () => {
  const course = new Course(definition, ROUTE_VARIANTS[1].seed);
  assert.equal(buildDeepRamp(course, { shoreOffset: () => null }), null);
  assert.equal(buildDeepRamp(course, { offshoreClearance: () => false }), null);
  assert.equal(buildDeepRamp(new Course(COURSE.find(def => def.id === 'high-country'), 1989)), null);
});

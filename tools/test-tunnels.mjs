import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createGroundTunnels} from '../src/world/ground-tunnels.js';
import {_staticContacts, _supportAt} from '../src/sim-contacts.js';

const course = new Course(SCABLANDS_VENUE, 20261114);
const empty = createGroundTunnels();
for (let i = 0; i < 300; i++) {
  const s = course.length * i / 300, off = (i % 31 - 15) * 17;
  const before = course.groundAt(s, off).y;
  course.groundTunnels = empty;
  assert.equal(course.groundAt(s, off, before).y, before);
}
const p = course.groundAt(0, 0);
const tunnel = createGroundTunnels([{start: {x: p.x - 50, y: p.y - 3, z: p.z},
  end: {x: p.x + 50, y: p.y - 3, z: p.z}, radius: 4}]);
course.groundTunnels = tunnel;
assert.equal(course.groundAt(0, 0).y, p.y);
assert.equal(course.groundAt(0, 0, p.y + 2).y, p.y);
assert.equal(course.groundAt(0, 0, p.y - 3).y, p.y - 7);
assert.equal(tunnel.length, 100);
// A height hint must not slide a support sample along a sloping centre line.
const slope = createGroundTunnels([{start: {x: 0, y: 0, z: 0},
  end: {x: 100, y: 20, z: 0}, radius: 4}]);
for (const height of [8, 10, 12]) {
  assert.equal(slope.groundAt({x: 50, y: height, z: 0}, height, 30), 6);
}
assert.equal(slope.groundAt({x: 50, y: 30, z: 0}, 30, 30), 30);
// Carry the last support height forward as the car climbs in either direction.
for (const [start, end, step] of [[0, 100, 1], [100, 0, -1]]) {
  let height = start * 0.2 - 4;
  for (let x = start; step > 0 ? x <= end : x >= end; x += step) {
    height = slope.groundAt({x, y: height, z: 0}, height, 30);
    assert.ok(Math.abs(height - (x * 0.2 - 4)) < 1e-9, `floor stays under the car at ${x}`);
  }
}
assert.equal(slope.wallAt({x: 50, y: 10, z: 3}, 10).radial, 3);
assert.equal(slope.wallAt({x: 50, y: 10, z: 4}, 10), null);
const motion = slope.constrainMotion({x: 50, y: 10, z: 0}, {x: 51, y: 10, z: 5}, 1);
assert.deepEqual(motion, {position: {x: 51, y: 10, z: 3}, hit: true});
assert.equal(slope.constrainMotion({x: 99, y: 19, z: 0}, {x: 102, y: 19, z: 0}, 1).hit, false);
assert.equal(slope.constrainMotion({x: 50, y: 30, z: 0}, {x: 51, y: 30, z: 5}, 1).hit, false);
const undergroundCar = {groundHeight: 6};
let obstacleChecks = 0;
const supportDuel = {state: undergroundCar, car: {kind: 'rally'},
  course: {groundTunnels: slope, features: {}, groundAt: (s, lateral, height) =>
    ({x: s, z: lateral, y: slope.groundAt({x: s, y: height, z: lateral}, height, 30)})},
  _obstacles: () => { obstacleChecks++; return []; }};
assert.equal(_supportAt.call(supportDuel, 50, 0).y, 6);
assert.equal(obstacleChecks, 0, 'surface obstacles do not lift an underground car');
undergroundCar.groundHeight = 30;
assert.equal(_supportAt.call(supportDuel, 50, 0).y, 30);
assert.equal(obstacleChecks, 1, 'surface support still checks obstacles');
// Exercise the real contact hook with a straight course and no other obstacles.
const straight = {groundTunnels: slope, worldAt: (s, lateral) => ({x: s, z: lateral}),
  at: () => ({heading: 0}), groundAt: () => ({y: 30})};
const car = {prevS: 50, s: 51, prevLateral: 0, lateral: 5, groundHeight: 10,
  prevGroundHeight: 10, speedMph: 10};
const duel = {course: straight, _vehicleSpec: () => ({halfWidth: 1}),
  _roadPosition: p => ({s: p.x, lateral: p.z}), _obstacles: () => [],
  _surface: () => ({mainRoad: false})};
_staticContacts.call(duel, car, false);
assert.equal(car.lateral, 3, 'car contact stops at the tube wall');
car.prevLateral = 0; car.lateral = 5; car.groundHeight = car.prevGroundHeight = 30;
_staticContacts.call(duel, car, false);
assert.equal(car.lateral, 5, 'a car above the tube is unaffected');
console.log('Tunnel ground query and wall contact checks passed. Full driving and mouth tests remain.');

import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createGroundTunnels} from '../src/world/ground-tunnels.js';

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
assert.equal(slope.wallAt({x: 50, y: 10, z: 3}, 10).radial, 3);
assert.equal(slope.wallAt({x: 50, y: 10, z: 4}, 10), null);
const motion = slope.constrainMotion({x: 50, y: 10, z: 0}, {x: 51, y: 10, z: 5}, 1);
assert.deepEqual(motion, {position: {x: 51, y: 10, z: 3}, hit: true});
assert.equal(slope.constrainMotion({x: 99, y: 19, z: 0}, {x: 102, y: 19, z: 0}, 1).hit, false);
assert.equal(slope.constrainMotion({x: 50, y: 30, z: 0}, {x: 51, y: 30, z: 5}, 1).hit, false);
console.log('Tunnel ground query and wall calculation: 313 checks passed. Driving and wall enforcement are not implemented.');

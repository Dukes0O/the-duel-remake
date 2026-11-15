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
console.log('Tunnel ground query: 304 checks passed. Driving and wall checks are not implemented.');

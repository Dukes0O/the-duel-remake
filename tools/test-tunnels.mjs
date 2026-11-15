import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createGroundTunnels, trialTubeBetween} from '../src/world/ground-tunnels.js';
import {_staticContacts, _supportAt} from '../src/sim-contacts.js';
import {LAND} from '../src/world/scablands-names.js';
import {RISES} from '../src/world/scablands-regions.js';
import {scablandsHeightAt} from '../src/world/scablands-height.js';

// Measure the nearest real rise instead of inventing a hill.
{
  const ridge = LAND.at('ridge');
  const rise = [...RISES].sort((a, b) => Math.hypot(a.x - ridge.x, a.z - ridge.z) -
    Math.hypot(b.x - ridge.x, b.z - ridge.z))[0];
  const direction = {x: Math.sin(rise.heading), z: Math.cos(rise.heading)};
  const start = {x: rise.x - 50 * direction.x, z: rise.z - 50 * direction.z};
  const end = {x: rise.x + 50 * direction.x, z: rise.z + 50 * direction.z};
  const trial = trialTubeBetween(start, end, 4, scablandsHeightAt);
  const tube = createGroundTunnels([trial.segment]);
  for (const mouth of [trial.segment.start, trial.segment.end]) {
    const surface = scablandsHeightAt(mouth.x, mouth.z);
    assert.ok(Math.abs(tube.groundAt(mouth, surface, surface) - surface) < 1e-9);
  }
  assert.ok(trial.maximumCover < 0, 'this measured site has no fully buried roof');
  assert.ok(Math.abs(Math.hypot(end.x - start.x, end.z - start.z) - 100) < 1e-9);
}

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
// Outside either mouth, the surface supports the car again.
assert.equal(tunnel.groundAt({x: p.x - 51, y: p.y - 3, z: p.z}, p.y - 3, p.y), p.y);
assert.equal(tunnel.groundAt({x: p.x + 51, y: p.y - 3, z: p.z}, p.y - 3, p.y), p.y);
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


// Drive the actual simulation through a level tube with gentle ground at both mouths.
// This uses a small course so failure points to vehicle support, not road geometry.
{
  const {Duel} = await import('../src/game.js');
  const {COURSE} = await import('../src/config.js');
  const dt = 1 / 120;
  const surface = x => Math.min(10, Math.max(0, (x - 30) * .5), Math.max(0, (130 - x) * .5));
  for (const direction of [1, -1]) {
    const d = new Duel({seed: 1989});
    d.startCampaign({car: 'titan_monster', startStage: COURSE.findIndex(row => row.practice),
      difficulty: 'casual', mode: 'timetrial'});
    d.state.status = 'racing';
    const at = (s, lateral = 0) => ({x: lateral, y: surface(s), z: s, heading: 0, curvature: 0});
    const actualTubes = createGroundTunnels([{start: {x: 0, y: 4, z: 30},
      end: {x: 0, y: 4, z: 130}, radius: 4}]);
    d.course = {def: {id: 'tunnel-test', practice: true, kind: 'arena', theme: 'desert'},
      groundTunnels: actualTubes, closed: false, length: 10000, raceLength: 20000,
      features: {obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: []},
      at, worldAt: at, groundAt(s, lateral, height) {
        const p = at(s, lateral);
        if (Number.isFinite(height)) p.y = actualTubes.groundAt(p, height, p.y);
        return p;
      }, nearest: (x, z) => ({s: z, lateral: x}), phase: s => s,
      surfaceAt: () => ({mainRoad: false, road: false, roadHalfWidth: 7}),
      themeAt: () => 'desert', roadHalfWidthAt: () => 7, nearestRadar: () => null,
      obstaclesNear: () => d.course.features.obstacles};
    d._obstacleArray = d.course.features.obstacles; d._obstacleQueryCache.clear(); d._lapGates = [];
    const s = d.state;
    Object.assign(s, {s: direction > 0 ? 20 : 140, lateral: 0, prevLateral: 0,
      headingError: direction > 0 ? 0 : Math.PI, groundHeight: 0, speedMph: 20});
    s.prevS = s.s;
    d.setInput({throttle: 1});
    let furthest = 0;
    for (let i = 0; i < 2400; i++) {
      d.step(dt);
      if (s.s >= 32 && s.s <= 128) {
        furthest = Math.max(furthest, direction > 0 ? s.s - 30 : 130 - s.s);
        assert.ok(Math.abs(s.groundHeight) < .01, `car stays on floor at ${s.s}, height ${s.groundHeight}`);
      }
      if (direction > 0 ? s.s > 135 : s.s < 25) break;
    }
    assert.ok(furthest > 95, `car drives through direction ${direction}: ${furthest} metres`);
  }
}

// A chain must hand support to the next segment as the car crosses a joint.
{
  const joined = createGroundTunnels([
    {start: {x: 0, y: 4, z: 0}, end: {x: 50, y: 4, z: 0}, radius: 4},
    {start: {x: 50, y: 4, z: 0}, end: {x: 100, y: 14, z: 0}, radius: 4},
  ]);
  for (const [start, end, step] of [[0, 100, 1], [100, 0, -1]]) {
    let height = Math.max(0, start - 50) * .2;
    for (let x = start; step > 0 ? x <= end : x >= end; x += step) {
      height = joined.groundAt({x, y: height, z: 0}, height, 30);
      assert.ok(Math.abs(height - Math.max(0, x - 50) * .2) < 1e-8,
        `floor follows the joined segments at ${x}, got ${height}`);
    }
  }
}

console.log('Tunnel support, joined segments, wall contact and simulated driving checks passed.');

// Both ground materials can use the same capsule test; the empty case keeps
// the original shader and cache key, while a tube adds uniforms and a lining.
{
  const THREE = await import('three');
  const {createGroundLook, createTunnelMesh} = await import('../src/world/scablands-ground-look.js');
  const compile = tunnels => {
    const material = createGroundLook({tunnels}).apply(new THREE.MeshStandardMaterial());
    const shader = {uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>',
      fragmentShader: '#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>'};
    material.onBeforeCompile(shader);
    return {material, shader};
  };
  const ordinary = compile(null), emptyLook = compile(empty), cut = compile(tunnel);
  assert.equal(emptyLook.shader.vertexShader, ordinary.shader.vertexShader);
  assert.equal(emptyLook.shader.fragmentShader, ordinary.shader.fragmentShader);
  assert.equal(emptyLook.material.customProgramCacheKey(), ordinary.material.customProgramCacheKey());
  assert.match(cut.shader.fragmentShader, /uTunnelRadius0/);
  assert.match(cut.shader.fragmentShader, /if\(dot\(q,q\)<uTunnelRadius0\*uTunnelRadius0\)discard/);
  assert.equal(cut.shader.uniforms.uTunnelRadius0.value, 4);
  const lining = createTunnelMesh(tunnel);
  assert.equal(lining.children.length, 1);
  assert.equal(lining.children[0].material.side, THREE.BackSide);
  assert.equal(lining.children[0].geometry.parameters.height, 100);
  lining.children[0].geometry.dispose();
  lining.children[0].material.dispose();
}

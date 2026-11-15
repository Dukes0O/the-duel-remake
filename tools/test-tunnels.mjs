import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createGroundTunnels, trialTubeBetween, westScarpTrial} from '../src/world/ground-tunnels.js';
import {_staticContacts, _supportAt} from '../src/sim-contacts.js';
import {scablandsHeightAt} from '../src/world/scablands-height.js';
import {scablandsActorHeightAt, scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {RIVER_LAND, riverGorgeDepthAt, riverDepthAt} from '../src/world/scablands-regions.js';

// The same position has a bed below each deck and a surface above it.
for (const id of ['girder-bridge', 'the-pipe']) {
  const {x, z} = RIVER_LAND.crossings.find(crossing => crossing.id === id);
  const surface = scablandsSurfaceHeightAt(x, z);
  const bed = surface - (riverGorgeDepthAt(x, z) - riverDepthAt(x, z));
  assert.ok(surface - bed > 6, `${id} has room under its deck`);
  assert.equal(scablandsActorHeightAt(x, z, bed), bed);
  assert.equal(scablandsActorHeightAt(x, z, surface), surface);
  assert.equal(scablandsActorHeightAt(x, z), surface);
  assert.equal(scablandsActorHeightAt(x, z, surface - 1.2), surface);
}

// Use the real west scarp, with both ends joined to the ground.
{
  const trial = westScarpTrial(scablandsHeightAt);
  const {start, end, radius} = trial.segment;
  const tube = createGroundTunnels([trial.segment]);
  assert.ok(Math.abs(end.y - start.y) / 100 <= .15, 'the climb is no steeper than .15');
  assert.ok(Math.abs(Math.hypot(end.x - start.x, end.z - start.z) - 100) < 1e-9);
  assert.throws(() => trialTubeBetween(start, start, radius, scablandsHeightAt), RangeError);
  for (const direction of [1, -1]) {
    let height = (direction > 0 ? start.y : end.y) - radius;
    for (let i = 0; i <= 100; i++) {
      const t = direction > 0 ? i / 100 : 1 - i / 100;
      const x = start.x + (end.x - start.x) * t, z = start.z + (end.z - start.z) * t;
      const floor = start.y + (end.y - start.y) * t - radius;
      const surface = scablandsHeightAt(x, z);
      height = tube.groundAt({x, y: height, z}, height, surface);
      assert.ok(Math.abs(height - floor) < 1e-7, `floor at ${t}: ${height} rather than ${floor}`);
      if (surface > floor + 2 * radius)
        assert.equal(tube.groundAt({x, y: surface, z}, surface, surface), surface);
    }
  }
}


// Drive the actual Scablands car across the named scarp, in both directions.
{
  const {Duel} = await import('../src/game.js');
  const {placeActor} = await import('../src/arena/arena-event.js');
  const {wrapHeading} = await import('../src/offroad-physics.js');
  const {scablandsSurfaceHeightAt} = await import('../src/world/scablands-ground.js');
  const trial = westScarpTrial(scablandsSurfaceHeightAt), {start, end, radius} = trial.segment;
  const dx = (end.x - start.x) / 100, dz = (end.z - start.z) / 100;
  for (const car of ['titan_monster', 'falcone_f42']) for (const direction of [1, -1]) {
    const d = new Duel({seed: 1989, featureFlags: {'hidden-road': true, 'wasteland-town': true}});
    d.state.wastelandGateDiscovered = true;
    assert.equal(d.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car, seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
    d.state.arena.timeLimitSec = Infinity;
    d.state.opponents[0].finished = true;
    d.course.groundTunnels = createGroundTunnels([trial.segment]);
    const origin = direction > 0 ? start : end;
    const position = d.course.nearest(origin.x - direction * dx * 8, origin.z - direction * dz * 8);
    const heading = Math.atan2(dx * direction, dz * direction);
    placeActor(d, d.state, {s: position.s, lateral: position.lateral,
      headingError: wrapHeading(heading - d.course.at(position.s).heading)}, 12);
    d.state.countdown = 0;
    let furthest = -Infinity, floorSamples = 0;
    for (let i = 0; i < 60 * 30; i++) {
      const here = d.course.worldAt(d.state.s, d.state.lateral);
      const along = (here.x - start.x) * dx + (here.z - start.z) * dz;
      const side = Math.abs((here.x - start.x) * dz - (here.z - start.z) * dx);
      furthest = Math.max(furthest, direction > 0 ? along : 100 - along);
      if (along > 2 && along < 98 && side < radius - 1) {
        floorSamples++;
        const floor = start.y - radius + (end.y - start.y) * along / 100;
        assert.ok(Math.abs((d.state.groundHeight ?? d.state._jumpY) - floor) < 1, `scarp floor ${car} direction ${direction}, at ${along.toFixed(1)}: ${d.state.groundHeight ?? d.state._jumpY} vs ${floor}`);
      }
      if (furthest > 103) break;
      const target = direction > 0 ? {x: end.x + dx * 30, z: end.z + dz * 30} : {x: start.x - dx * 30, z: start.z - dz * 30};
      const turn = wrapHeading(Math.atan2(target.x - here.x, target.z - here.z) - d.course.at(d.state.s).heading - d.state.headingError);
      d.setInput({throttle: 1, steer: Math.max(-1, Math.min(1, -turn * 2))});
      d.step(1 / 60);
    }
    assert.ok(floorSamples > 10, `the car stayed in the tube in direction ${direction}`);
    assert.ok(furthest > 103, `car crosses the scarp in direction ${direction}: ${furthest.toFixed(1)} m`);
  }
}

// The steep-ground rule must see the same floor as support, not the scarp above it.
{
  const {scablandsGround} = await import('../src/sim-scablands.js');
  const trial = westScarpTrial(scablandsHeightAt), tubes = createGroundTunnels([trial.segment]);
  const {start, end} = trial.segment;
  const at = s => ({x: start.x + (end.x - start.x) * s / 100, z: start.z + (end.z - start.z) * s / 100});
  const actor = {prevS: 13, s: 14, prevLateral: 0, lateral: 0, speedMph: 20,
    groundHeight: start.y - 4 + (end.y - start.y) * .13};
  const duel = {state: actor, course: {def: {scablands: true}, groundTunnels: tubes, worldAt: at},
    _roadPosition: point => ({s: point.x, lateral: 0}), emit: () => { throw new Error('The tube floor is not a cliff.'); }};
  scablandsGround(duel, actor, 1 / 120);
  assert.equal(actor.s, 14, 'the scarp above does not stop a car inside the tube');
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
const straight = {def: {}, groundTunnels: slope, worldAt: (s, lateral) => ({x: s, z: lateral}),
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

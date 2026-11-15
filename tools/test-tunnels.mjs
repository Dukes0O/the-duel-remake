import * as THREE from 'three';
import {createRoadsDraw} from '../src/world/scablands-draw.js';
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {createFighter, stepFighter} from '../src/onfoot.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createGroundTunnels, trialTubeBetween} from '../src/world/ground-tunnels.js';
import {westScarpTrial} from '../src/world/scablands-tunnel-trial.js';
import {_staticContacts, _supportAt} from '../src/sim-contacts.js';
import {_jump} from '../src/sim-driving.js';
import {makeRng} from '../src/rng.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {scablandsHeightAt} from '../src/world/scablands-height.js';
import {scablandsActorHeightAt, scablandsFloorsAt, selectScablandsFloor, scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {RIVER_LAND, riverGorgeDepthAt, riverDepthAt} from '../src/world/scablands-regions.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {worldJobPosition} from '../src/arena/modes/world-job.js';
import {SCABLANDS_SOLIDS, pushOutOfSolids} from '../src/world/scablands-solids.js';
import {constrainScablandsCamera} from '../src/camera-clearance.js';

// The chase camera stays below each deck and leaves ordinary ground alone.
for (const id of ['girder-bridge', 'the-pipe']) {
  const {x,z} = RIVER_LAND.crossings.find(crossing => crossing.id === id);
  const floors = [];
  scablandsFloorsAt(x,z,floors);
  const camera = {x,y:floors[0]+3,z}, car = {x,y:floors[1],z};
  assert.equal(constrainScablandsCamera({def:{scablands:true}},camera,car,floors[1]),true);
  assert.ok(camera.y < floors[0]-1.2);
  const above = {x,y:floors[0]+3,z};
  assert.equal(constrainScablandsCamera({def:{scablands:true}},above,car,floors[0]),false);
}
{
  const segment = {start:{x:0,y:2.2,z:0},end:{x:100,y:2.2,z:0},radius:4};
  const tunnels = createGroundTunnels([segment]);
  const course = {def:{scablands:true},groundTunnels:tunnels};
  // This fixture lies well below the real surface and has room for a bore.
  const car = {x:50,y:0,z:0}, camera = {x:50,y:12,z:10};
  assert.equal(constrainScablandsCamera(course,camera,car,0),true);
  assert.ok(Math.abs(camera.z) < 4 * Math.sqrt(1-.55**2));
  assert.ok(camera.y < 6.2);
  const ordinary = {x:50,y:12,z:10};
  assert.equal(constrainScablandsCamera({def:{}},ordinary,car,0),false);
  assert.deepEqual(ordinary,{x:50,y:12,z:10});
}

// Replacing a bore is gated and invalid replacements leave the current bore intact.
{
  const disabled = new Course(SCABLANDS_VENUE, 1989);
  const trial = westScarpTrial(scablandsSurfaceHeightAt);
  assert.throws(() => disabled.setGroundTunnels([trial.segment]), /not enabled/);
  assert.equal(disabled.groundTunnelsRevision, 0);
  const enabled = new Course(SCABLANDS_VENUE, 1989, {tunnelsEnabled: true});
  const bore = enabled.setGroundTunnels([trial.segment]);
  assert.equal(enabled.groundTunnels, bore);
  assert.equal(enabled.groundTunnelsRevision, 1);
  assert.throws(() => enabled.setGroundTunnels([trial.segment, trial.segment]), RangeError);
  assert.equal(enabled.groundTunnels, bore);
  assert.equal(enabled.groundTunnelsRevision, 1);
  enabled.setGroundTunnels([]);
  assert.equal(enabled.groundTunnels, null);
  assert.equal(enabled.groundTunnelsRevision, 2);
}

// An open mouth cuts only as far as the crown has a metre of cover.
{
  const segment = {start: {x: 0, y: 2.2, z: 0}, end: {x: 100, y: 2.2, z: 0}, radius: 4};
  const surface = x => x < 10 || x > 90 ? 0 : 8;
  const bore = createGroundTunnels([segment], {heightAt: surface});
  assert.equal(bore.mouths.length, 2);
  assert.equal(bore.mouths[0].end.x, 10);
  assert.equal(bore.mouths[1].end.x, 90);
  const cutting = createGroundTunnels([{...segment, end: {x: 50, y: 2.2, z: 0}}], {heightAt: surface});
  assert.equal(cutting.startOpen, true);
  assert.equal(cutting.endOpen, false);
  assert.equal(cutting.mouths.length, 1);
}

// Away from the two decks, all three foot heights must take the exact old
// surface arithmetic. The seed makes this sample repeatable.
{
  const random = makeRng(1989), crossings = RIVER_LAND.crossings.filter(c =>
    c.id === 'girder-bridge' || c.id === 'the-pipe');
  let checked = 0;
  while (checked < 2000) {
    const x = random.range(-7000, 7000), z = random.range(-5000, 5000);
    if (crossings.some(c => Math.hypot(x - c.x, z - c.z) <= 200)) continue;
    const surface = scablandsSurfaceHeightAt(x, z);
    for (const feet of [surface - 5, surface, surface + 5])
      assert.equal(scablandsActorHeightAt(x, z, feet), surface, `surface at ${x}, ${z}`);
    checked++;
  }
}

// The same position has a bed below each deck and a surface above it.
for (const id of ['girder-bridge', 'the-pipe']) {
  const {x, z} = RIVER_LAND.crossings.find(crossing => crossing.id === id);
  const surface = scablandsSurfaceHeightAt(x, z);
  const bed = surface - (riverGorgeDepthAt(x, z) - riverDepthAt(x, z));
  assert.ok(surface - bed > 6, `${id} has room under its deck`);
  const floors = [], count = scablandsFloorsAt(x, z, floors);
  assert.equal(count, 2);
  assert.deepEqual(floors, [surface, bed]);
  assert.equal(selectScablandsFloor(floors, count), surface);
  assert.equal(selectScablandsFloor(floors, count, bed), bed);
  assert.equal(selectScablandsFloor(floors, count, surface - .61), bed);
  assert.equal(selectScablandsFloor(floors, count, surface - .59), surface);
  assert.equal(selectScablandsFloor(floors, count, surface + 5), surface);
  assert.equal(scablandsActorHeightAt(x, z, bed), bed);
  assert.equal(scablandsActorHeightAt(x, z, surface), surface);
  assert.equal(scablandsActorHeightAt(x, z), surface);
  assert.equal(scablandsActorHeightAt(x, z, surface - 1.2), bed);
  const course = new Course(SCABLANDS_VENUE, 1989), at = course.nearest(x, z);
  const actor = {groundHeight: bed};
  const duel = {course, state: actor, car: {}, featureFlags: {enabled: () => true}};
  assert.ok(Math.abs(_supportAt.call(duel, at.s, at.lateral, actor).y - bed) < .01, `${id}: car support uses the bed`);
  duel.featureFlags.enabled = () => false;
  assert.ok(Math.abs(_supportAt.call(duel, at.s, at.lateral, actor).y - bed) < .01, `${id}: deck floor works with the switch off`);
}

// Flight meets the underside of either deck, while a fall from above still
// lands on the upper floor. Use the real flight step with fixed world support.
for (const id of ['girder-bridge', 'the-pipe']) {
  const {x, z} = RIVER_LAND.crossings.find(crossing => crossing.id === id);
  const top = scablandsActorHeightAt(x, z), bed = scablandsActorHeightAt(x, z, -100);
  const actor = {s: 0, lateral: 0, speedMph: 0, airborne: true, _jumpY: bed,
    groundHeight: bed, airHeight: 0, _verticalSpeed: 18, stageTimeSec: 0};
  const game = {state: actor, car: {}, course: {def: {scablands: true}, phase: () => 0},
    _vehicleSpec: () => ({height: 1.5}),
    _supportAt: () => ({x, z, y: scablandsActorHeightAt(x, z, actor._jumpY)})};
  for (let step = 0; step < 60 && actor._verticalSpeed > 0; step++) _jump.call(game, actor, .02, step * .02);
  assert.ok(actor._jumpY + 1.5 <= top - 1.2 + 1e-9, `${id}: a jumping car stays below the underside`);
  assert.ok(actor._verticalSpeed < 0, `${id}: the car falls after meeting the roof`);
  actor._jumpY = top + 1; actor._verticalSpeed = -5; actor.airborne = true;
  for (let step = 0; step < 40 && actor.airborne; step++) _jump.call(game, actor, .02, step * .02);
  assert.equal(actor._jumpY, top, `${id}: a car falling from above lands on the deck`);
  // Feet already below the deck belong to the bed, even when the stored
  // support is still the bank the car just left.
  actor.groundHeight = top; actor._jumpY = top - 1.5;
  actor._verticalSpeed = -5; actor.airborne = true;
  for (let step = 0; step < 100 && actor.airborne; step++) {
    _jump.call(game, actor, .02, step * .02);
    assert.ok(actor._jumpY < top, `${id}: falling feet do not snap onto the deck`);
  }
  assert.ok(!actor.airborne && Math.abs(actor._jumpY - bed) < 1e-9,
    `${id}: a fall below the deck lands on the bed`);
}

// The car's real flight step stops at a bore's crown and falls back.
{
  const tubes = createGroundTunnels([{start: {x: 0, y: 4, z: 0},
    end: {x: 100, y: 4, z: 0}, radius: 4}]);
  const actor = {s: 50, lateral: 0, speedMph: 0, airborne: true, _jumpY: 1.8,
    groundHeight: 1.8, airHeight: 0, _verticalSpeed: 20, stageTimeSec: 0};
  const game = {state: actor, car: {}, course: {def: {scablands: true}, groundTunnels: tubes, phase: () => 0},
    _vehicleSpec: () => ({height: 2}), _supportAt: () => ({x: 50, y: 1.8, z: 0})};
  for (let step = 0; step < 100 && actor._verticalSpeed > 0; step++) _jump.call(game, actor, .02, step * .02);
  assert.ok(actor._jumpY + 2 <= 8 + 1e-9, 'the car stays below the crown');
  assert.ok(actor._verticalSpeed < 0, 'the car falls after meeting the crown');
}

// A thin cover remains the selected floor, even if feet overlap the bore.
// Its crown must not act as a roof when the car jumps from the surface.
{
  const tubes = createGroundTunnels([{start: {x: 0, y: 4, z: 0},
    end: {x: 100, y: 4, z: 0}, radius: 4}]);
  const actor = {s: 50, lateral: 0, speedMph: 0, airborne: true, _jumpY: 8,
    groundHeight: 8.5, airHeight: 0, _verticalSpeed: 10, stageTimeSec: 0};
  const game = {state: actor, car: {}, course: {def: {scablands: true}, groundTunnels: tubes, phase: () => 0},
    _vehicleSpec: () => ({height: 2}), _supportAt: () => ({x: 50, y: 8.5, z: 0})};
  _jump.call(game, actor, .1, 0);
  assert.ok(actor._verticalSpeed > 0, 'a car on covered ground can rise above the tunnel');
}

// A person placed below a deck keeps that floor when walking. An omitted
// placement height still chooses the top floor.
for (const id of ['girder-bridge', 'the-pipe']) {
  const crossing = RIVER_LAND.crossings.find(item => item.id === id);
  const {x, z} = crossing;
  const bed = scablandsActorHeightAt(x, z, -100);
  const course = {def: {scablands: {halfWidth: 10000, halfDepth: 10000}},
    groundAt: (s, lateral, height) => ({x: s, z: lateral, y: scablandsActorHeightAt(s, lateral, height), heading: 0}),
    nearest: (x, z) => ({s: x, lateral: z}), obstaclesNear: () => []};
  const car = {s: x, lateral: z, groundHeight: bed, arena: {worldJob: {solidGrid: {near: () => []}}}};
  const below = createFighter(course, car, {s: x, lateral: z, height: bed});
  const above = createFighter(course, car, {s: x, lateral: z});
  assert.ok(above.y - below.y > 6, `${id}: placement selects the requested floor`);
  for (let i = 0; i < 30; i++) stepFighter(course, car, below, {forward: true});
  assert.ok(Math.abs(below.y - bed) < .2, `${id}: walking stays on the bed`);
}

// A mover below a deck reads the bed and still meets a pier.
{
  const pier = SCABLANDS_SOLIDS.find(solid => solid.id === 'girder-bridge-pier-2');
  const bed = pier.minY, surface = scablandsSurfaceHeightAt(pier.x, pier.z);
  const at = stepMover({x: pier.x, z: pier.z}, {x: pier.x, z: pier.z}, {height: bed, solids: false});
  assert.ok(Math.abs(at.y - bed) < 1, 'a mover reads the bed');
  assert.ok(pushOutOfSolids(pier.x, pier.z, .4, undefined, bed).hit, 'the pier is solid below the deck');
  assert.notEqual(pushOutOfSolids(pier.x, pier.z, .4, undefined, surface).hit?.id, pier.id, 'the pier does not block the deck');
}

// Grounded car contacts use the same 2.5 m body as movers for deck solids.
// Other solids retain the original car envelope.
{
  const solid = {id: 'test-overhead', kind: 'girder', x: 0, z: 0, y: 2.4,
    minY: 2.4, maxY: 4, height: 1.6, halfX: .5, halfZ: 5, verticalClearance: true};
  function drive(obstacle) {
    const actor = {prevS: -4, s: 4, prevLateral: 0, lateral: 0, groundHeight: 0,
      prevGroundHeight: 0, speedMph: 0};
    const course = {def: {scablands: true}, worldAt: (s, lateral) => ({x: s, z: lateral}),
      at: () => ({heading: 0}), groundAt: () => ({y: 0})};
    const game = {course, state: {arena: {worldJob: {solidGrid: {near: () => [obstacle]}}}},
      _vehicleSpec: () => ({halfWidth: 1, halfLength: 1, height: 1}),
      _roadPosition: point => ({s: point.x, lateral: point.z}), _obstacles: () => [],
      _surface: () => ({mainRoad: false})};
    _staticContacts.call(game, actor, false, []);
    return actor.s;
  }
  assert.ok(drive(solid) < 0, 'a car meets a solid 2.4 m above its feet');
  assert.equal(drive({...solid, verticalClearance: false}), 4, 'other solids keep the old body height');
}

// Job movers carry their support height from step to step, just as a chase does.
// Check the entire crossing rather than only a stationary sample beneath a deck.
for (const id of ['girder-bridge', 'the-pipe']) {
  const crossing = RIVER_LAND.crossings.find(item => item.id === id);
  const {points, along} = RIVER_LAND.line;
  const index = along.findIndex(value => value >= crossing.along);
  const a = points[index - 1], b = points[index + 1];
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
  const centre = {x: crossing.x + dz * 27, z: crossing.z - dx * 27};
  for (const direction of [-1, 1]) {
    let position = {x: centre.x - direction * dx * 45, z: centre.z - direction * dz * 45};
    let height = scablandsActorHeightAt(position.x, position.z, -100);
    let below = false;
    for (let step = -44; step <= 45; step++) {
      const target = {x: centre.x + direction * dx * step, z: centre.z + direction * dz * step};
      const result = stepMover(position, target, {height});
      assert.equal(result.blocked, false, `${id}: mover is not stopped under the deck`);
      position = result;
      height = result.y;
      if (Math.abs(step) < 20 && scablandsSurfaceHeightAt(position.x, position.z) - height > 4) below = true;
    }
    assert.ok(below, `${id}: mover crosses below the deck in direction ${direction}`);
    assert.ok(Math.hypot(position.x - centre.x, position.z - centre.z) > 44, `${id}: mover reaches the far side`);
  }
}

// Use the real west scarp, with both ends joined to the ground.
// Exercise the job's own raider update, including its stored height, across
// each deck. The car is not placed near the raider for this crossing check.
{
  const {Duel} = await import('../src/game.js');
  const {EVERBURN_JOBS} = await import('../src/world/jobs/everburn.js');
  for (const id of ['girder-bridge', 'the-pipe']) {
    const crossing = RIVER_LAND.crossings.find(item => item.id === id);
    const {points, along} = RIVER_LAND.line;
    const index = along.findIndex(value => value >= crossing.along);
    const a = points[index - 1], b = points[index + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
    const centre = {x: crossing.x + dz * 27, z: crossing.z - dx * 27};
    const start = {x: centre.x - dx * 40, z: centre.z - dz * 40};
    const target = {x: centre.x + dx * 40, z: centre.z + dz * 40};
    const duel = new Duel({seed: 1, featureFlags: {'hidden-road': true, arsenal: true}});
    duel.state.wastelandGateDiscovered = true;
    assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42',
      seed: 1, cpuDifficulty: 'medium', opponents: [], job: {...EVERBURN_JOBS[0], seed: 1}}), true);
    duel.state.countdown = 0;
    const raider = {id: 'floor-crossing', ...start, y: scablandsActorHeightAt(start.x, start.z, -100),
      health: 70, knockedDown: false, approachSpeed: 6, approachTarget: target};
    duel.state.arena.worldJob.actors.push(raider);
    let below = 0;
    for (let tick = 0; tick < 900; tick++) {
      duel.step(1 / 60);
      const bed = scablandsActorHeightAt(raider.x, raider.z, -100);
      assert.ok(Math.abs(raider.y - bed) < 1e-6, `${id}: job raider remains on the bed`);
      assert.equal(Object.hasOwn(raider, 'groundY'), false);
      if (scablandsSurfaceHeightAt(raider.x, raider.z) - bed > 4) below++;
    }
    assert.ok(below > 60, `${id}: job raider travels below the deck`);
    assert.ok(Math.hypot(raider.x - target.x, raider.z - target.z) < 1, `${id}: job raider reaches the far side`);
  }
}

// Big Bess crosses each deck while a raider remains directly beneath it.
// Exercise the job update, not only the mover helper.
{
  const {Duel} = await import('../src/game.js');
  const {EVERBURN_JOBS} = await import('../src/world/jobs/everburn.js');
  for (const id of ['girder-bridge', 'the-pipe']) {
    const crossing = RIVER_LAND.crossings.find(item => item.id === id);
    const hit = ROAD_NET.nearest(crossing.x, crossing.z);
    const a = hit.road.points[hit.index], b = hit.road.points[hit.index + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
    const centre = {x: crossing.x + dx * 20, z: crossing.z + dz * 20};
    const start = {x: centre.x - dx * 12, z: centre.z - dz * 12};
    const end = {x: centre.x + dx * 12, z: centre.z + dz * 12};
    start.y = scablandsActorHeightAt(start.x, start.z);
    end.y = scablandsActorHeightAt(end.x, end.z);
    const duel = new Duel({seed: 1, featureFlags: {'hidden-road': true, arsenal: true}});
    duel.state.wastelandGateDiscovered = true;
    assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42',
      seed: 1, cpuDifficulty: 'medium', opponents: [], job: {...EVERBURN_JOBS[0], seed: 1}}), true);
    duel.state.countdown = 0;
    const job = duel.state.arena.worldJob;
    const step = job.job.steps[job.job.stepIndex];
    step.actor = {id: 'big-bess', escort: true, speed: 6, start, path: [start, end]};
    const raider = {id: 'under-bess', x: centre.x, z: centre.z,
      y: scablandsActorHeightAt(centre.x, centre.z, -100), health: 70};
    job.actors.push(raider);
    let passedOver = false;
    for (let tick = 0; tick < 600; tick++) {
      job.follow = {actorId: 'big-bess', speed: 6};
      duel.step(1 / 60);
      assert.equal(raider.x, centre.x, `${id}: raider stays in place`);
      assert.equal(raider.z, centre.z, `${id}: raider stays in place`);
      assert.equal(raider.y, scablandsActorHeightAt(centre.x, centre.z, -100));
      const truck = job.actors.find(actor => actor.id === 'big-bess');
      if (truck) assert.ok(Math.abs(truck.position.y - scablandsActorHeightAt(truck.position.x, truck.position.z)) < .01,
        `${id}: Big Bess stays on the upper floor`);
      if (truck && Math.hypot(truck.position.x - centre.x, truck.position.z - centre.z) < 1) {
        assert.ok(truck.position.y - raider.y > 4, `${id}: the deck separates them`);
        passedOver = true;
      }
    }
    assert.ok(passedOver, `${id}: Big Bess passes directly over the raider`);
    const bess = job.actors.find(actor => actor.id === 'big-bess');
    assert.ok(bess, `${id}: Big Bess is present`);
    assert.ok(Math.hypot(bess.position.x - end.x, bess.position.z - end.z) < 1,
      `${id}: Big Bess reaches the far side ${JSON.stringify(bess.position)} end ${JSON.stringify(end)}`);
    assert.ok(Math.abs(bess.position.y - scablandsActorHeightAt(end.x, end.z)) < .01,
      `${id}: Big Bess stays on the deck`);
  }
}

// Use the real west scarp, with both ends joined to the ground.
{
  const trial = westScarpTrial(scablandsHeightAt);
  const {start, end, radius} = trial.segment;
  const tube = createGroundTunnels([trial.segment]);
  // This measures the proposed tube data only, not a finished town save.
  const tubeBytes = Buffer.byteLength(JSON.stringify({segments: tube.segments}), 'utf8');
  assert.ok(tubeBytes < 2 * 1024 * 1024, `one 100 m tube uses ${tubeBytes} bytes of the 2 MB ground target`);
  console.log(`100 m tube data: ${tubeBytes} bytes (town save not yet implemented).`);
  assert.ok(Math.abs(end.y - start.y) / 100 <= .15, 'the climb is no steeper than .15');
  assert.ok(Math.abs(Math.hypot(end.x - start.x, end.z - start.z) - 100) < 1e-9);
  assert.throws(() => trialTubeBetween(start, start, radius, scablandsHeightAt), RangeError);
  for (const direction of [1, -1]) {
    let height = (direction > 0 ? start.y : end.y) - radius * .55;
    for (let i = 0; i <= 100; i++) {
      const t = direction > 0 ? i / 100 : 1 - i / 100;
      const x = start.x + (end.x - start.x) * t, z = start.z + (end.z - start.z) * t;
      const floor = start.y + (end.y - start.y) * t - radius * .55;
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
        const floor = start.y - radius * .55 + (end.y - start.y) * along / 100;
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

// Drive off the scarp above the low mouth and land on the open ground.
for (const speed of [40, 80]) {
  const {Duel} = await import('../src/game.js');
  const {placeActor} = await import('../src/arena/arena-event.js');
  const {wrapHeading} = await import('../src/offroad-physics.js');
  const trial = westScarpTrial(scablandsSurfaceHeightAt), {start, end} = trial.segment;
  const dx = (end.x - start.x) / 100, dz = (end.z - start.z) / 100;
  const d = new Duel({seed: 1989, featureFlags: {'hidden-road': true, 'wasteland-town': true}});
  d.state.wastelandGateDiscovered = true;
  assert.equal(d.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car: 'titan_monster', seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
  d.state.arena.timeLimitSec = Infinity;
  d.state.opponents[0].finished = true;
  d.course.groundTunnels = createGroundTunnels([trial.segment], {heightAt: scablandsSurfaceHeightAt});
  const origin = d.course.nearest(start.x + dx * 38, start.z + dz * 38);
  placeActor(d, d.state, {s: origin.s, lateral: origin.lateral,
    headingError: wrapHeading(Math.atan2(-dx, -dz) - d.course.at(origin.s).heading)}, speed);
  d.state.countdown = 0;
  d.setInput({throttle: 1});
  let flew = false, landed = false;
  for (let i = 0; i < 60 * 15; i++) {
    d.step(1 / 60);
    const state = d.state, here = d.course.worldAt(state.s, state.lateral);
    const along = (here.x - start.x) * dx + (here.z - start.z) * dz;
    if (state.airborne) flew = true;
    if (flew && !state.airborne) {
      assert.ok(along < 0, `car lands in front of the low mouth, at ${along.toFixed(1)} m`);
      assert.ok(Math.abs(state.groundHeight - scablandsSurfaceHeightAt(here.x, here.z)) < 1,
        'car lands on open ground, not the tunnel floor');
      landed = true;
      break;
    }
  }
  assert.ok(flew && landed, 'car drives off the scarp and lands');
}

// Drive the bed under each deck, away from the central pier, in both directions.
{
  const {Duel} = await import('../src/game.js');
  const {placeActor} = await import('../src/arena/arena-event.js');
  const {wrapHeading} = await import('../src/offroad-physics.js');
  for (const id of ['girder-bridge', 'the-pipe']) {
    const crossing = RIVER_LAND.crossings.find(item => item.id === id);
    const points = RIVER_LAND.line.points, along = RIVER_LAND.line.along;
    const index = along.findIndex(value => value >= crossing.along);
    const a = points[index - 1], b = points[index + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
    const centre = {x: crossing.x + dz * 27, z: crossing.z - dx * 27};
    for (const direction of [-1, 1]) {
      const duel = new Duel({seed: 1989, featureFlags: {'hidden-road': true}});
      duel.state.wastelandGateDiscovered = true;
      assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'last-car-rolling', car: 'falcone_f42', seed: 1989, opponents: [{car: 'dusthawk_rally'}]}), true);
      duel.state.countdown = 0; duel.state.arena.timeLimitSec = Infinity; duel.state.opponents[0].finished = true;
      const origin = {x: centre.x - dx * direction * 45, z: centre.z - dz * direction * 45};
      const position = duel.course.nearest(origin.x, origin.z), heading = Math.atan2(dx * direction, dz * direction);
      placeActor(duel, duel.state, {s: position.s, lateral: position.lateral, headingError: wrapHeading(heading - duel.course.at(position.s).heading)}, 15);
      let furthest = -Infinity, below = false;
      for (let i = 0; i < 60 * 20; i++) {
        const here = duel.course.worldAt(duel.state.s, duel.state.lateral);
        const progress = ((here.x - centre.x) * dx + (here.z - centre.z) * dz) * direction;
        furthest = Math.max(furthest, progress);
        if (Math.abs(progress) < 25) {
          const surface = scablandsSurfaceHeightAt(here.x, here.z);
          if (surface - (duel.state.groundHeight ?? duel.state._jumpY) > 4) below = true;
        }
        if (progress > 35) break;
        duel.setInput({throttle: 1}); duel.step(1 / 60);
      }
      assert.ok(below && furthest > 35, `${id}, direction ${direction}: crossed beneath the deck (${furthest.toFixed(1)} m)`);
    }
  }
}

// A car explicitly placed in the bed keeps that floor. An ordinary placement
// at the same coordinates chooses the top floor, even after a previous visit.
{
  const {placeActor} = await import('../src/arena/arena-event.js');
  const course = new Course(SCABLANDS_VENUE, 1989);
  for (const id of ['girder-bridge', 'the-pipe']) {
    const {x, z} = RIVER_LAND.crossings.find(crossing => crossing.id === id);
    const at = course.nearest(x, z), bed = scablandsActorHeightAt(x, z, -100);
    const top = scablandsActorHeightAt(x, z), actor = {};
    const duel = {course, state: actor, car: {}};
    placeActor(duel, actor, {...at, height: bed});
    assert.equal(actor.prevGroundHeight, bed, `${id}: placement retains the previous height`);
    assert.ok(Math.abs(_supportAt.call(duel, at.s, at.lateral, actor).y - bed) < .01,
      `${id}: explicit placement selects the bed`);
    assert.equal(worldJobPosition(duel, actor).y, bed, `${id}: the job sees the car in the bed`);
    actor.airborne = true; actor._jumpY = bed + 2;
    assert.equal(worldJobPosition(duel, actor).y, bed + 2, `${id}: the job sees the car in the air`);
    placeActor(duel, actor, at);
    assert.equal(actor.groundHeight, null, `${id}: ordinary placement clears the old height`);
    assert.ok(Math.abs(_supportAt.call(duel, at.s, at.lateral, actor).y - top) < .01,
      `${id}: ordinary placement selects the top`);
  }
}

// The steep-ground rule must see the same floor as support, not the scarp above it.
{
  const {scablandsGround} = await import('../src/sim-scablands.js');
  const trial = westScarpTrial(scablandsHeightAt), tubes = createGroundTunnels([trial.segment]);
  const {start, end} = trial.segment;
  const at = s => ({x: start.x + (end.x - start.x) * s / 100, z: start.z + (end.z - start.z) * s / 100});
  const actor = {prevS: 13, s: 14, prevLateral: 0, lateral: 0, speedMph: 20,
    groundHeight: start.y - 2.2 + (end.y - start.y) * .13};
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
assert.equal(course.groundAt(0, 0, p.y - 3).y, p.y - 5.2);
assert.equal(tunnel.length, 100);
// Outside either mouth, the surface supports the car again.
assert.equal(tunnel.groundAt({x: p.x - 51, y: p.y - 3, z: p.z}, p.y - 3, p.y), p.y);
assert.equal(tunnel.groundAt({x: p.x + 51, y: p.y - 3, z: p.z}, p.y - 3, p.y), p.y);
// A height hint must not slide a support sample along a sloping centre line.
const slope = createGroundTunnels([{start: {x: 0, y: 0, z: 0},
  end: {x: 100, y: 20, z: 0}, radius: 4}]);
for (const height of [8, 10, 12]) {
  assert.equal(slope.groundAt({x: 50, y: height, z: 0}, height, 30), 7.8);
}
assert.equal(slope.groundAt({x: 50, y: 30, z: 0}, 30, 30), 30);
// A falling actor just above a covered bore still lands on the surface when
// that surface is within its step height, even below the bore's crown.
assert.equal(slope.groundAt({x: 50, y: 13.9, z: 0}, 13.9, 14.5), 14.5);
assert.equal(slope.groundAt({x: 50, y: 13.8, z: 0}, 13.8, 14.5), 7.8);
// The same 0.6 m step rule applies when the bore floor rises.
assert.equal(slope.groundAt({x: 50, y: 7.21, z: 0}, 7.21, 30), 7.8);
// Carry the last support height forward as the car climbs in either direction.
for (const [start, end, step] of [[0, 100, 1], [100, 0, -1]]) {
  let height = start * 0.2 - 2.2;
  for (let x = start; step > 0 ? x <= end : x >= end; x += step) {
    height = slope.groundAt({x, y: height, z: 0}, height, 30);
    assert.ok(Math.abs(height - (x * 0.2 - 2.2)) < 1e-9, `floor stays under the car at ${x}`);
  }
}
assert.equal(slope.wallAt({x: 50, y: 10, z: 3}, 10).radial, 3);
assert.equal(slope.wallAt({x: 50, y: 10, z: 4}, 10), null);
const motion = slope.constrainMotion({x: 50, y: 10, z: 0}, {x: 51, y: 10, z: 5}, 1);
const wallLimit = 4 * Math.sqrt(1 - .55 ** 2) - 1;
assert.equal(motion.hit, true);
for (const dx of [-5, 0, 5]) for (const side of [-1, 1]) {
  const strike = slope.constrainMotion({x: 50, y: 10, z: 0}, {x: 50 + dx, y: 10, z: side * 5}, 1);
  assert.equal(strike.hit, true, 'the wall stops angled moves');
  assert.ok(Math.abs(strike.position.z - side * wallLimit) < 1e-9);
}
assert.ok(Math.abs(motion.position.z - wallLimit) < 1e-9);
const enteringWall = slope.constrainMotion({x: 50, y: 10, z: 4.1}, {x: 51, y: 10, z: 3.8}, 1);
assert.equal(enteringWall.hit, true, 'a move ending inside the bore is held even if it started outside');
assert.ok(Math.abs(enteringWall.position.z - wallLimit) < 1e-9);
assert.equal(slope.constrainMotion({x: 99, y: 19, z: 0}, {x: 102, y: 19, z: 0}, 1).hit, false);
assert.equal(slope.constrainMotion({x: 50, y: 30, z: 0}, {x: 51, y: 30, z: 5}, 1).hit, false);
const undergroundCar = {groundHeight: 7.8};
let obstacleChecks = 0;
const supportDuel = {state: undergroundCar, car: {kind: 'rally'},
  course: {groundTunnels: slope, features: {}, groundAt: (s, lateral, height) =>
    ({x: s, z: lateral, y: slope.groundAt({x: s, y: height, z: lateral}, height, 30)})},
  _obstacles: () => { obstacleChecks++; return []; }};
assert.equal(_supportAt.call(supportDuel, 50, 0).y, 7.8);
assert.equal(obstacleChecks, 0, 'surface obstacles do not lift an underground car');
undergroundCar.groundHeight = 30;
assert.equal(_supportAt.call(supportDuel, 50, 0).y, 30);
assert.equal(obstacleChecks, 1, 'surface support still checks obstacles');
undergroundCar.groundHeight = 13.9;
supportDuel.course.groundAt = (s, lateral, height) =>
  ({x: s, z: lateral, y: slope.groundAt({x: s, y: height, z: lateral}, height, 14.5)});
assert.equal(_supportAt.call(supportDuel, 50, 0).y, 14.5);
assert.equal(obstacleChecks, 2, 'a selected surface still checks obstacles when feet overlap the bore');
// Exercise the real contact hook with a straight course and no other obstacles.
const straight = {def: {}, groundTunnels: slope, worldAt: (s, lateral) => ({x: s, z: lateral}),
  at: () => ({heading: 0}), groundAt: (s, lateral, height) =>
    ({y: slope.groundAt({x: s, y: height, z: lateral}, height, 30)})};
const car = {prevS: 50, s: 51, prevLateral: 0, lateral: 5, groundHeight: 10,
  prevGroundHeight: 10, speedMph: 10};
const duel = {course: straight, _vehicleSpec: () => ({halfWidth: 1}),
  _roadPosition: p => ({s: p.x, lateral: p.z}), _obstacles: () => [],
  _surface: () => ({mainRoad: false})};
_staticContacts.call(duel, car, false);
assert.ok(Math.abs(car.lateral - wallLimit) < 1e-9, 'car contact stops at the flat floor edge');
car.prevLateral = 0; car.lateral = 5; car.groundHeight = car.prevGroundHeight = 30;
_staticContacts.call(duel, car, false);
assert.equal(car.lateral, 5, 'a car above the tube is unaffected');
straight.groundAt = (s, lateral, height) =>
  ({y: slope.groundAt({x: s, y: height, z: lateral}, height, 14.5)});
car.prevLateral = 0; car.lateral = 5; car.groundHeight = car.prevGroundHeight = 13.9;
_staticContacts.call(duel, car, false);
assert.equal(car.lateral, 5, 'a car on selected covered ground is not held by bore walls');


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
    const actualTubes = createGroundTunnels([{start: {x: 0, y: 2.2, z: 30},
      end: {x: 0, y: 2.2, z: 130}, radius: 4}]);
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

// Drive both cars through a chain with 10, 20 and 30 degree bends.
{
  const {Duel} = await import('../src/game.js');
  const {COURSE} = await import('../src/config.js');
  const {wrapHeading} = await import('../src/offroad-physics.js');
  const points = [{x: 0, z: 0}];
  for (const degrees of [0, 10, 30, 60]) {
    const angle = degrees * Math.PI / 180, last = points.at(-1);
    points.push({x: last.x + 40 * Math.sin(angle), z: last.z + 40 * Math.cos(angle)});
  }
  const tubes = createGroundTunnels(points.slice(1).map((end, i) => ({
    start: {...points[i], y: 2.2}, end: {...end, y: 2.2}, radius: 5})));
  for (const car of ['titan_monster', 'falcone_f42']) for (const direction of [1, -1]) {
    const d = new Duel({seed: 1989});
    d.startCampaign({car, startStage: COURSE.findIndex(row => row.practice), difficulty: 'casual', mode: 'timetrial'});
    d.state.status = 'racing';
    const at = (s, lateral = 0) => ({x: lateral, y: 20, z: s, heading: 0, curvature: 0});
    d.course = {def: {id: 'bent-tunnel-test', practice: true, kind: 'arena', theme: 'desert'},
      groundTunnels: tubes, closed: false, length: 10000, raceLength: 20000,
      features: {obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: []},
      at, worldAt: at, groundAt(s, lateral, height) {
        const p = at(s, lateral);
        if (Number.isFinite(height)) p.y = tubes.groundAt(p, height, p.y);
        return p;
      }, nearest: (x, z) => ({s: z, lateral: x}), phase: s => s,
      surfaceAt: () => ({mainRoad: false, road: false, roadHalfWidth: 7}),
      themeAt: () => 'desert', roadHalfWidthAt: () => 7, nearestRadar: () => null,
      obstaclesNear: () => d.course.features.obstacles};
    d._obstacleArray = d.course.features.obstacles; d._obstacleQueryCache.clear(); d._lapGates = [];
    const route = direction > 0 ? points : [...points].reverse();
    const start = route[0], next = route[1], state = d.state;
    const heading = Math.atan2(next.x - start.x, next.z - start.z);
    Object.assign(state, {s: start.z + (next.z - start.z) * .03,
      lateral: start.x + (next.x - start.x) * .03, headingError: heading,
      groundHeight: -.55, speedMph: 10});
    state.prevS = state.s; state.prevLateral = state.lateral;
    let target = 1;
    for (let i = 0; i < 60 * 90 && target < route.length; i++) {
      const here = {x: state.lateral, z: state.s};
      if (Math.hypot(here.x - route[target].x, here.z - route[target].z) < 5) {
        target++;
        if (target === route.length) break;
      }
      const turn = wrapHeading(Math.atan2(route[target].x - here.x, route[target].z - here.z) - state.headingError);
      d.setInput({throttle: state.speedMph < 18 ? 1 : 0, steer: Math.max(-1, Math.min(1, -turn * 2))});
      d.step(1 / 60);
      assert.ok(Math.abs(state.groundHeight + .55) < .1, `${car} stays on the bent tunnel floor, direction ${direction}`);
    }
    assert.equal(target, route.length, `${car} drives all bends, direction ${direction}`);
  }
}

// Where a bend overlaps in plan, choose the highest floor within step height.
{
  const tubes = createGroundTunnels([
    {start: {x: 0, y: 2.2, z: 0}, end: {x: 10, y: 2.2, z: 0}, radius: 4},
    {start: {x: 10, y: 2.2, z: 0}, end: {x: 10, y: 3.2, z: 10}, radius: 4},
  ]);
  const point = {x: 9, y: .1, z: 1};
  assert.ok(Math.abs(tubes.groundAt(point, point.y, 20) - .1) < 1e-9,
    'overlapping segments select the highest reachable floor');
}

// A bore cannot be made with a gap, a floor step or a zero-length segment.
{
  const first = {start: {x: 0, y: 4, z: 0}, end: {x: 10, y: 4, z: 0}, radius: 4};
  const second = {start: {x: 10, y: 4, z: 0}, end: {x: 20, y: 4, z: 0}, radius: 4};
  assert.doesNotThrow(() => createGroundTunnels([first, second]));
  assert.throws(() => createGroundTunnels([first, {...second, start: {x: 10.01, y: 4, z: 0}}]), RangeError);
  assert.throws(() => createGroundTunnels([first, {...second, start: {x: 10, y: 4.01, z: 0}}]), RangeError);
  assert.throws(() => createGroundTunnels([first, {...second, radius: 5}]), RangeError);
  assert.throws(() => createGroundTunnels([{...first, end: first.start}]), RangeError);
}

// A face opens only when its floor meets the supplied surface.
{
  const segment = {start: {x: 0, y: 2.2, z: 0}, end: {x: 20, y: 2.2, z: 0}, radius: 4};
  const cutting = createGroundTunnels([segment], {heightAt: x => x === 0 ? 0 : 10});
  const closed = cutting.constrainMotion({x: 19, y: 0, z: 0}, {x: 22, y: 0, z: 0}, 1);
  assert.equal(closed.hit, true, 'the unfinished face stops a car');
  assert.equal(closed.position.x, 20);
  const fromRock = cutting.constrainMotion({x: 22, y: 0, z: 0}, {x: 19, y: 0, z: 0}, 1);
  assert.equal(fromRock.hit, true, 'the unfinished face also stops a car from outside');
  assert.equal(fromRock.position.x, 20);
  assert.equal(cutting.constrainMotion({x: 22, y: 10, z: 0}, {x: 19, y: 10, z: 0}, 1).hit,
    false, 'the closed face does not block ground above');
  assert.equal(cutting.constrainMotion({x: 1, y: 0, z: 0}, {x: -2, y: 0, z: 0}, 1).hit,
    false, 'the mouth stays open');
  const complete = createGroundTunnels([segment], {heightAt: () => 0});
  assert.equal(complete.constrainMotion({x: 19, y: 0, z: 0}, {x: 22, y: 0, z: 0}, 1).hit,
    false, 'the face opens when it reaches the surface');
  assert.throws(() => createGroundTunnels([segment], {heightAt: () => NaN}), TypeError);
}

// Find support on every part of a long chain, including negative grid cells.
{
  const segments = Array.from({length: 100}, (_, i) => ({
    start: {x: (i - 50) * 10, y: 2.2, z: -33},
    end: {x: (i - 49) * 10, y: 2.2, z: -33}, radius: 4}));
  const chain = createGroundTunnels(segments);
  for (let x = -499; x < 500; x += 3)
    assert.equal(chain.groundAt({x, y: 0, z: -33}, 0, 20), 0, `chain support at ${x}`);
  assert.equal(chain.groundAt({x: 0, y: 20, z: -33}, 20, 20), 20);
  for (let joint = -490; joint < 500; joint += 10) for (const direction of [-1, 1]) {
    const move = chain.constrainMotion({x: joint - direction, y: 4, z: -33},
      {x: joint + direction, y: 4, z: -28}, 1);
    assert.equal(move.hit, true, `wall holds at joint ${joint}, direction ${direction}`);
    assert.ok(Math.abs(move.position.z - (-33 + wallLimit)) < 1e-9);
  }
}

// A chain must hand support to the next segment as the car crosses a joint.
{
  const joined = createGroundTunnels([
    {start: {x: 0, y: 2.2, z: 0}, end: {x: 50, y: 2.2, z: 0}, radius: 4},
    {start: {x: 50, y: 2.2, z: 0}, end: {x: 100, y: 12.2, z: 0}, radius: 4},
  ]);
  for (const [start, end, step] of [[0, 100, 1], [100, 0, -1]]) {
    let height = Math.max(0, start - 50) * .2;
    for (let x = start; step > 0 ? x <= end : x >= end; x += step) {
      height = joined.groundAt({x, y: height, z: 0}, height, 30);
      assert.ok(Math.abs(height - Math.max(0, x - 50) * .2) < 1e-8,
        `floor follows the joined segments at ${x}, got ${height}`);
    }
  }
  for (const [from, to] of [[49, 51], [51, 49]]) {
    const move = joined.constrainMotion({x: from, y: 4, z: 0}, {x: to, y: 4, z: 5}, 1);
    assert.equal(move.hit, true, 'the wall remains solid across a segment joint');
    assert.ok(Math.abs(move.position.z - wallLimit) < 1e-9);
  }
  // A jump or large step can miss the adjoining segment's height range.
  // The joint is still rock, not an extra exit from the tunnel.
  for (const [from, to] of [[49, 51], [51, 49]]) {
    const move = joined.constrainMotion({x: from, y: 4, z: 0}, {x: to, y: 30, z: 5}, 1);
    assert.equal(move.hit, true, 'an unqualified neighbour closes the seam');
    assert.equal(move.position.x, 50);
    assert.ok(Math.abs(move.position.z - wallLimit) < 1e-9);
  }
  const corner = createGroundTunnels([
    {start: {x: 0, y: 4, z: 0}, end: {x: 50, y: 4, z: 0}, radius: 4},
    {start: {x: 50, y: 4, z: 0}, end: {x: 50, y: 4, z: 50}, radius: 4},
  ]);
  const turn = corner.constrainMotion({x: 49, y: 4, z: 0}, {x: 55, y: 4, z: 1}, 1);
  assert.equal(turn.hit, true, 'the next wall also holds at a bend');
  assert.ok(Math.abs(turn.position.x - (50 + wallLimit)) < 1e-9);
}

console.log('Tunnel support, joined segments, wall contact and simulated driving checks passed.');

// The game scene follows replacements and clears, without writing to the course.
{
  const {featureFlags} = await import('../src/feature-flags.js');
  const {createScablandsScene} = await import('../src/world/scablands-scene.js');
  const {syncScene} = await import('../src/scene-systems.js');
  const enabledBefore = featureFlags.enabled;
  featureFlags.enabled = name => name === 'wasteland-town';
  const course = new Course(SCABLANDS_VENUE, 1989, {tunnelsEnabled: true});
  const scene = createScablandsScene(course, {openMarks: [], loadAsset: async () => ({scene: new THREE.Group()})});
  try {
    const trial = westScarpTrial(scablandsSurfaceHeightAt);
    assert.equal(scene.group.getObjectByName('Tunnel lining'), undefined);
    course.setGroundTunnels([trial.segment]);
    syncScene(scene.group, {});
    assert.ok(scene.group.getObjectByName('Tunnel lining'));
    const revision = course.groundTunnelsRevision;
    syncScene(scene.group, {});
    assert.equal(course.groundTunnelsRevision, revision);
    course.setGroundTunnels([]);
    syncScene(scene.group, {});
    assert.equal(scene.group.getObjectByName('Tunnel lining'), undefined);
  } finally {
    scene.dispose();
    featureFlags.enabled = enabledBefore;
  }
}

// Both ground materials can use the same capsule test; the empty case keeps
// the original shader and cache key, while a tube adds uniforms and a lining.
{
  const THREE = await import('three');
  const {createGroundLook, createTunnelMesh} = await import('../src/world/scablands-ground-look.js');
  const compile = tunnels => {
    const look = createGroundLook({tunnels});
    const material = look.apply(new THREE.MeshStandardMaterial());
    const shader = {uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>',
      fragmentShader: '#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>'};
    material.onBeforeCompile(shader);
    return {material, shader, look};
  };
  const ordinary = compile(null), emptyLook = compile(empty), cut = compile(tunnel);
  assert.equal(emptyLook.shader.vertexShader, ordinary.shader.vertexShader);
  assert.equal(emptyLook.shader.fragmentShader, ordinary.shader.fragmentShader);
  assert.equal(emptyLook.material.customProgramCacheKey(), ordinary.material.customProgramCacheKey());
  assert.match(cut.shader.fragmentShader, /uTunnelRadius\[8\]/);
  assert.match(cut.shader.fragmentShader, /i<uTunnelCount|i>=uTunnelCount/);
  const mouth = {start: {x: 1, y: 2, z: 3}, end: {x: 4, y: 5, z: 6}, radius: 4};
  const version = ordinary.material.version;
  ordinary.look.setTunnelMouths([mouth]);
  assert.equal(ordinary.material.version, version + 1, 'the first mouth enables the shader once');
  const activated = {uniforms: {}, vertexShader: '#include <common>\n#include <project_vertex>',
    fragmentShader: '#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>'};
  ordinary.material.onBeforeCompile(activated);
  assert.match(activated.fragmentShader, /uTunnelRadius\[8\]/);
  ordinary.look.setTunnelMouths([mouth, mouth]);
  assert.equal(ordinary.material.version, version + 1, 'later mouth changes do not recompile');
  assert.equal(activated.uniforms.uTunnelCount.value, 2);
  ordinary.look.setTunnelMouths([]);
  assert.equal(activated.uniforms.uTunnelCount.value, 0);
  cut.look.setTunnelMouths([mouth]);
  assert.equal(cut.shader.uniforms.uTunnelCount.value, 1);
  assert.equal(cut.shader.uniforms.uTunnelRadius.value[0], 4);
  cut.look.setTunnelMouths([mouth, mouth]);
  assert.equal(cut.shader.uniforms.uTunnelCount.value, 2);
  assert.throws(() => cut.look.setTunnelMouths(Array(9).fill(mouth)), RangeError);
  const lining = createTunnelMesh(tunnel);
  assert.equal(lining.children.length, 1);
  assert.equal(lining.children[0].material.side, THREE.DoubleSide);
  const geometry = lining.children[0].geometry;
  assert.equal(geometry.getAttribute('uv').getX(33), 100, 'lining texture coordinates use metres');
  assert.equal(geometry.getAttribute('position').getY(0), geometry.getAttribute('position').getY(32), 'lining has a flat floor');
  lining.children[0].geometry.dispose();
  lining.children[0].material.dispose();
  const cutting = createGroundTunnels([
    {start: {x: 0, y: 2.2, z: 0}, end: {x: 20, y: 2.2, z: 0}, radius: 4},
    {start: {x: 20, y: 2.2, z: 0}, end: {x: 40, y: 2.2, z: 0}, radius: 4},
  ], {heightAt: x => x === 0 ? 0 : 20});
  // Growing the bore preserves the lining object and the completed rings,
  // including the joint when the next stretch changes direction.
  const growing = createTunnelMesh(cutting);
  const firstRings = Array.from(growing.children[0].geometry.getAttribute('position').array.slice(0, 33 * 3));
  const extended = createGroundTunnels([
    ...cutting.segments,
    {start: {x: 40, y: 2.2, z: 0}, end: {x: 60, y: 2.2, z: 5}, radius: 4},
  ], {heightAt: x => x === 0 ? 0 : 20});
  assert.equal(createTunnelMesh(extended, growing), growing);
  assert.deepEqual(Array.from(growing.children[0].geometry.getAttribute('position').array.slice(0, 33 * 3)), firstRings);
  const fresh = createTunnelMesh(extended);
  for (const name of ['position', 'uv']) {
    assert.deepEqual(Array.from(growing.children[0].geometry.getAttribute(name).array),
      Array.from(fresh.children[0].geometry.getAttribute(name).array), `growing ${name} matches a fresh lining`);
  }
  for (const mesh of [growing, fresh]) {
    mesh.children[0].geometry.dispose(); mesh.children[0].material.dispose();
  }
  const cuttingMesh = createTunnelMesh(cutting);
  assert.equal(cuttingMesh.children.length, 1, 'joined segments share one lining mesh');
  assert.equal(cuttingMesh.children[0].geometry.getAttribute('position').count, 100,
    'the closed cutting face adds a centre to the three lining rings');
  cuttingMesh.children[0].geometry.dispose();
  cuttingMesh.children[0].material.dispose();
}

// The road surface must not hang down across the river bed at either deck.
const deckRoads=createRoadsDraw({plainAt:(x,z)=>scablandsSurfaceHeightAt(x,z)+riverDepthAt(x,z),
  material:new THREE.MeshBasicMaterial({side:THREE.DoubleSide})});
deckRoads.update(0,0,{all:true});
deckRoads.group.updateMatrixWorld(true);
for(const crossing of RIVER_LAND.crossings.filter(item=>item.deckHalfWidth)){
  let closest=Infinity, tangent;
  const points=RIVER_LAND.line.points;
  for(let i=0;i+1<points.length;i++){
    const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    const t=Math.max(0,Math.min(1,((crossing.x-a.x)*dx+(crossing.z-a.z)*dz)/(length*length)));
    const distance=Math.hypot(crossing.x-a.x-t*dx,crossing.z-a.z-t*dz);
    if(distance<closest){closest=distance;tangent={x:dx/length,z:dz/length};}
  }
  for(const across of [-20,0,20]){
    const x=crossing.x+tangent.z*across,z=crossing.z-tangent.x*across;
    const bed=scablandsSurfaceHeightAt(x,z)+riverDepthAt(x,z)-riverGorgeDepthAt(x,z);
    const ray=new THREE.Raycaster(new THREE.Vector3(x-tangent.x*30,bed+3,z-tangent.z*30),
      new THREE.Vector3(tangent.x,0,tangent.z),0,60);
    assert.equal(ray.intersectObject(deckRoads.group,true).length,0,`${crossing.id} has clear air above the river bed`);
  }
}
deckRoads.dispose();

// TOWN-VEHICLES: the five work vehicles drive, stop and turn inside a road, weight is felt, the bell rings on its
// key, and nothing changes for a garage car (docs/board/cards/TOWN-VEHICLES.md).
import assert from 'node:assert/strict';
import test from 'node:test';
import {CARS} from '../src/config.js';
import {Duel} from '../src/game.js';
import {ARENA_FIELD} from '../src/arena/arena-event.js';
import {createTown} from '../src/town/town-state.js';
import {createTownWorld} from '../src/town/town-world.js';
import {setScablandsTownLayout, clearScablandsTownLayout} from '../src/world/scablands-ground.js';
import {cleanupWorldJobLoan} from '../src/arena/modes/world-job.js';
import {defineMachine} from '../src/machines/content/machines.js';
import {WORK_VEHICLE_DEFINITIONS, WORK_VEHICLE_IDS, startWorkVehicle, loadWorkVehicle, unloadWorkVehicle,
  fillWorkVehicleTank, pumpWorkVehicleTank, workVehicleTurnRadiusM} from '../src/town/work-vehicles.js';

const dt = 1 / 120;
const FIVE = ['fire-truck', 'flatbed', 'supply-truck', 'water-tanker', 'tow-rig'];
const layout = createTownWorld(createTown(1405, 'Vehicle test town'));

function drive(vehicle, {town = true} = {}) {
  const duel = new Duel({seed:1989, featureFlags:{'wasteland-town':town}});
  duel.state.wastelandGateDiscovered = true;
  setScablandsTownLayout(layout);
  assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job',
    job:{id:'town-drive', kind:'town-drive', steps:[], seed:1989, layout, vehicle}}), true);
  while (duel.state.status === 'countdown') duel.step(dt);
  return duel;
}
const finish = duel => { cleanupWorldJobLoan(duel); clearScablandsTownLayout(); };
const pose = duel => {
  const state = duel.state, at = duel.course.worldAt(state.s, state.lateral);
  return {x:at.x, z:at.z, heading:duel.course.at(state.s).heading + state.headingError};
};
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));

function launch(duel, mph, limitSeconds = 40) {
  duel.setInput({throttle:1, brake:0, steer:0, boost:false});
  let seconds = 0;
  while (duel.state.speedMph < mph && seconds < limitSeconds) { duel.step(dt); seconds += dt; }
  return seconds;
}
function stop(duel) {
  const from = pose(duel);
  duel.setInput({throttle:0, brake:1, steer:0, boost:false});
  let seconds = 0;
  while (duel.state.speedMph > 0.05 && seconds < 20) { duel.step(dt); seconds += dt; }
  const to = pose(duel);
  return {seconds, metres:Math.hypot(to.x - from.x, to.z - from.z)};
}

test('the five work vehicles are machine-shaped data and never garage cars', () => {
  assert.deepEqual([...WORK_VEHICLE_IDS].sort(), [...FIVE].sort());
  for (const id of FIVE) {
    const definition = WORK_VEHICLE_DEFINITIONS[id];
    assert.doesNotThrow(() => defineMachine(definition), `${id} passes MACHINE-CORE's own rule`);
    assert.equal(definition.driveKind, 'wheels');
    assert.equal(Object.hasOwn(CARS, id), false, `${id} is not in CARS, so no menu or medal row`);
    assert.equal(ARENA_FIELD.includes(id), false, `${id} is never a computer driver's car`);
    assert.equal(definition.model.file, 'trucks-1.glb');
  }
  assert.equal(WORK_VEHICLE_DEFINITIONS['fire-truck'].tank.capacityL, 3000, 'docs/WASTELAND_TOWN.md section 14');
  assert.equal(WORK_VEHICLE_DEFINITIONS['fire-truck'].tank.pumpLpm, 1000);
  assert.deepEqual(WORK_VEHICLE_DEFINITIONS.flatbed.model.hide, ['supply-truck:load'], 'the flatbed is the supply truck without its load');
});

test('a job without a work vehicle, or with the town switched off, drives the garage car exactly as before', () => {
  for (const [vehicle, town] of [[undefined, true], ['fire-truck', false], ['no-such-truck', true]]) {
    const duel = drive(vehicle, {town});
    assert.equal(duel.state.arena.worldJob.vehicle, null);
    assert.equal(duel.car.name, CARS[duel.state.car].name);
    assert.equal(duel._vehicleSpec(duel.state).mass, CARS[duel.state.car].mass || 1450);
    finish(duel);
  }
});

test('each vehicle drives, and stops in a truck distance', () => {
  for (const id of FIVE) {
    const duel = drive(id);
    assert.equal(duel.car.workVehicle, id);
    assert.equal(duel._vehicleSpec(duel.state).mass, duel.state.arena.worldJob.vehicle.massKg);
    const seconds = launch(duel, 30);
    assert.ok(duel.state.speedMph >= 30, `${id} reaches 30 mph`);
    assert.ok(seconds > 5 && seconds < 25, `${id} pulls away like a truck: 0 to 30 mph took ${seconds.toFixed(1)} s`);
    const stopped = stop(duel);
    assert.ok(stopped.seconds < 4, `${id} stops from 30 mph in ${stopped.seconds.toFixed(1)} s`);
    assert.ok(stopped.metres > 8 && stopped.metres < 30, `${id} stops in ${stopped.metres.toFixed(1)} m`);
    assert.equal(duel.state.status, 'racing');
    finish(duel);
  }
});

test('weight is felt: a loaded flatbed and a full tanker pull away later and stop longer', () => {
  for (const [light, heavy] of [[{id:'flatbed', loadKg:0}, {id:'flatbed', loadKg:9000}],
    [{id:'water-tanker', tankL:0}, {id:'water-tanker', tankL:5600}]]) {
    const runs = [light, heavy].map(spec => {
      const duel = drive(spec), mass = duel.car.mass, pull = launch(duel, 30), halt = stop(duel);
      finish(duel);
      return {mass, pull, halt};
    });
    assert.ok(runs[1].mass > runs[0].mass);
    assert.ok(runs[1].pull > runs[0].pull * 1.5, `${heavy.id}: loaded takes ${runs[1].pull.toFixed(1)} s, empty ${runs[0].pull.toFixed(1)} s`);
    assert.ok(runs[1].halt.metres > runs[0].halt.metres, `${heavy.id}: loaded stops in a longer distance`);
  }
});

// A right-angle turn from one 8 m road into another, at a junction pace of 10 mph: every corner of the truck stays
// on the two roads, and the truck leaves along the new road. The turn starts one turning circle before the
// junction's middle, as a driver would turn.
test('each vehicle turns from one 8 m road into another without leaving the road', () => {
  const half = 4, mph = 10;
  for (const id of FIVE) {
    const duel = drive(id), definition = WORK_VEHICLE_DEFINITIONS[id];
    launch(duel, mph);
    const origin = pose(duel), forward = {x:Math.sin(origin.heading), z:Math.cos(origin.heading)};
    const frame = point => {
      const dx = point.x - origin.x, dz = point.z - origin.z;
      return {along:dx * forward.x + dz * forward.z, across:dx * forward.z - dz * forward.x};
    };
    const hold = steer => duel.setInput({throttle:duel.state.speedMph < mph ? 1 : 0, brake:0, steer, boost:false});
    const radius = workVehicleTurnRadiusM(definition);
    const junction = 20 + radius;
    let worst = 0, turned = 0, last = origin.heading, sideways = 0;
    for (let tick = 0; tick < 120 * 30; tick++) {
      const now = pose(duel), local = frame(now);
      const turning = local.along >= junction - radius && Math.abs(turned) < Math.PI / 2;
      hold(turning ? 1 : 0);
      duel.step(dt);
      const next = pose(duel);
      turned += angle(next.heading - last); last = next.heading;
      sideways = Math.sign(turned) || sideways;
      const into = frame(next);
      // Body corners in the junction frame: road A is |across| <= half, road B is |along - junction| <= half.
      const c = Math.cos(next.heading - origin.heading), s = Math.sin(next.heading - origin.heading);
      for (const [lx, lz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const bx = lx * definition.halfWidthM, bz = lz * definition.halfLengthM;
        const along = into.along + bz * c - bx * s, across = into.across + bz * s + bx * c;
        const outside = Math.min(Math.max(0, Math.abs(across) - half), Math.max(0, Math.abs(along - junction) - half));
        worst = Math.max(worst, outside);
      }
      if (Math.abs(turned) >= Math.PI / 2 && Math.abs(into.across) > junction - 5) break;
    }
    assert.ok(Math.abs(Math.abs(turned) - Math.PI / 2) < 0.2, `${id} finishes the turn: ${(turned * 180 / Math.PI).toFixed(0)} degrees`);
    assert.ok(worst < 0.05, `${id} keeps every corner on the road (worst ${worst.toFixed(2)} m off)`);
    assert.ok(sideways !== 0);
    assert.equal(duel.state.status, 'racing');
    finish(duel);
  }
});

test('a truck turns no tighter than its own turning circle, at any speed', () => {
  for (const id of FIVE) for (const mph of [6, 15, 25]) {
    const duel = drive(id);
    launch(duel, mph);
    const start = pose(duel);
    let far = 0, turned = 0, last = start.heading;
    while (Math.abs(turned) < Math.PI) {
      duel.setInput({throttle:duel.state.speedMph < mph ? 1 : 0, brake:0, steer:-1, boost:false});
      duel.step(dt);
      const now = pose(duel);
      turned += angle(now.heading - last); last = now.heading;
      far = Math.max(far, Math.hypot(now.x - start.x, now.z - start.z));
    }
    assert.ok(far / 2 >= workVehicleTurnRadiusM(WORK_VEHICLE_DEFINITIONS[id]) * 0.97,
      `${id} at ${mph} mph turns on a circle ${far.toFixed(1)} m across`);
    finish(duel);
  }
});

test('the fire truck rings its bell on the boost key, and no truck fires nitro', () => {
  const duel = drive('fire-truck'), rings = [];
  duel.onChange((state, event) => {
    if (event.townBell) rings.push(state.arena.clockSec);
    assert.equal(event.arenaTell, undefined, 'the bell sends no cue to the audio until its bank row exists');
  });
  // At junction pace the truck's own turning circle holds the steering in, which is when a press could be scaled twice.
  launch(duel, 8);
  const steady = drive('fire-truck');
  launch(steady, 8);
  // The app writes the input once a frame and a frame can run several steps: the held key must steer as one
  // press on every step, the same as a driver whose input is written before each step.
  for (let frame = 0; frame < 60; frame++) {
    duel.setInput({throttle:0.2, brake:0, steer:0.5, boost:true});
    for (let step = 0; step < 4; step++) {
      steady.setInput({throttle:0.2, brake:0, steer:0.5, boost:false});
      duel.step(dt); steady.step(dt);
    }
  }
  assert.equal(rings.length, 3, 'two seconds held rings at once and every 0.8 s');
  assert.equal(duel.state.boosting, false);
  assert.ok(Math.abs(duel.state.speedMph - steady.state.speedMph) < 1e-9, 'holding the key adds no speed');
  assert.deepEqual(pose(duel), pose(steady), 'several steps in one frame steer as one press');
  duel.setInput({boost:false}); duel.step(dt);
  duel.setInput({boost:true}); duel.step(dt);
  assert.equal(rings.length, 4, 'a new press rings at once');
  assert.equal(duel.state.arena.worldJob.vehicle.bell.rings, 4);
  const worldJob = duel.state.arena.worldJob;
  assert.equal(worldJob.controls.whistle, false, 'the bell does not also skip a line');
  // While a line waits for the player, the key moves the line on and the bell stays still.
  duel.setInput({boost:false}); duel.step(dt);
  worldJob.job = {...worldJob.job, stepState:{...worldJob.job.stepState, lineBlocking:true}};
  duel.setInput({boost:true}); duel.step(dt);
  assert.equal(rings.length, 4);
  assert.equal(worldJob.controls.whistle, true);
  finish(duel); finish(steady);
  const tanker = drive('water-tanker'), quiet = [];
  tanker.onChange((state, event) => { if (event.townBell) quiet.push(event); });
  tanker.setInput({throttle:1, boost:true});
  for (let i = 0; i < 240; i++) tanker.step(dt);
  assert.equal(quiet.length, 0, 'only the fire truck has a bell');
  assert.equal(tanker.state.boosting, false);
  finish(tanker);
});

test('loads and tanks are real sums for the jobs that use them', () => {
  const flatbed = startWorkVehicle('flatbed', {enabled:true});
  assert.equal(flatbed.massKg, 6500);
  const loaded = loadWorkVehicle(flatbed, 10_000);
  assert.equal(loaded.loadedKg, 9000);
  assert.equal(loaded.refusedKg, 1000);
  assert.equal(loaded.message, 'The flatbed is full. It carries 9,000 kg.');
  assert.equal(loaded.vehicle.car.mass, 15_500);
  assert.equal(unloadWorkVehicle(loaded.vehicle, 2000).vehicle.loadKg, 7000);
  assert.equal(loadWorkVehicle(startWorkVehicle('fire-truck', {enabled:true}), 10).message,
    'The fire truck has nowhere to carry a load.');
  const truck = startWorkVehicle('fire-truck', {enabled:true});
  assert.equal(truck.tankL, 3000);
  const pumped = pumpWorkVehicleTank(truck, 60);
  assert.equal(pumped.pumpedL, 1000, '1,000 litres a minute');
  assert.equal(pumpWorkVehicleTank(truck, 600).pumpedL, 3000, 'a full tank empties in three minutes and no more');
  assert.equal(fillWorkVehicleTank(pumped.vehicle, 5000).filledL, 1000, 'the tank stops the fill when full');
  assert.equal(startWorkVehicle('supply-truck', {enabled:true}).loadKg, 4000);
  assert.equal(startWorkVehicle({id:'water-tanker', tankL:99_999}, {enabled:true}).tankL, 5600);
  assert.equal(startWorkVehicle('fire-truck', {enabled:false}), null);
});

test('a work-vehicle drive is repeatable from seed and inputs', () => {
  const run = () => {
    const duel = drive('water-tanker');
    for (let i = 0; i < 600; i++) { duel.setInput({throttle:1, steer:i > 300 ? 0.6 : 0, boost:i % 90 < 30}); duel.step(dt); }
    const result = {pose:pose(duel), speed:duel.state.speedMph, vehicle:duel.state.arena.worldJob.vehicle.massKg};
    finish(duel);
    return result;
  };
  assert.deepEqual(run(), run());
});

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
import {cleanupWorldJobLoan, ringJobVehicleBell} from '../src/arena/modes/world-job.js';
import {keyboardAction} from '../src/input-contexts.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import * as THREE from 'three';
import {createWorkVehicleView, workVehicleToDraw, WORK_VEHICLE_LAYER} from '../src/town/view/work-vehicle-view.js';
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

test('the five town work vehicles and borrowed home machines are machine-shaped data and never garage cars', () => {
  assert.deepEqual([...WORK_VEHICLE_IDS].sort(), [...FIVE, 'drill', 'excavator'].sort());
  const drill = WORK_VEHICLE_DEFINITIONS.drill;
  assert.equal(drill.driveKind, 'tracks');
  assert.equal(drill.maxSpeedMps, 1.2);
  assert.equal(drill.model.node, 'drill-rig');
  assert.equal(Object.hasOwn(CARS, 'drill'), false);
  assert.equal(ARENA_FIELD.includes('drill'), false);
  const excavator = WORK_VEHICLE_DEFINITIONS.excavator;
  assert.doesNotThrow(() => defineMachine(excavator));
  assert.equal(excavator.driveKind, 'tracks');
  assert.equal(excavator.model.node, 'excavator');
  assert.equal(Object.hasOwn(CARS, 'excavator'), false);
  assert.equal(ARENA_FIELD.includes('excavator'), false);
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

test('B rings the fire truck\'s bell once a press, and Space fires no nitro in a truck', () => {
  const duel = drive('fire-truck'), rings = [];
  duel.onChange((state, event) => { if (event.arenaTell?.id === 'town-bell') rings.push(event.arenaTell); });
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
  assert.equal(rings.length, 0, 'Space is kept for a vehicle\'s tool and rings nothing');
  assert.equal(duel.state.boosting, false);
  assert.ok(Math.abs(duel.state.speedMph - steady.state.speedMph) < 1e-9, 'holding Space adds no speed');
  assert.deepEqual(pose(duel), pose(steady), 'several steps in one frame steer as one press');
  assert.equal(keyboardAction('car', 'KeyB'), 'town-bell');
  assert.equal(ringJobVehicleBell(duel), true);
  assert.equal(ringJobVehicleBell(duel), true);
  assert.equal(rings.length, 2, 'each press rings once');
  assert.equal(rings[0].cue, 'town.bell');
  assert.ok(Object.hasOwn(SOUND_BANK, 'town.bell') && SOUND_BANK['town.bell'].flag === 'wasteland-town', 'the cue is in the bank behind the switch');
  assert.ok(Number.isFinite(rings[0].position?.x) && Number.isFinite(rings[0].position?.z), 'the bell sounds from the truck');
  assert.equal(duel.state.arena.worldJob.vehicle.bell.rings, 2);
  duel.state.paused = true;
  assert.equal(ringJobVehicleBell(duel), false, 'a paused game rings nothing');
  finish(duel); finish(steady);
  const tanker = drive('water-tanker'), garage = drive(undefined);
  assert.equal(ringJobVehicleBell(tanker), false, 'only the fire truck has a bell');
  assert.equal(ringJobVehicleBell(garage), false, 'B does nothing in a garage car');
  finish(tanker); finish(garage);
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

// The view's rules, with a stand-in for trucks-1.glb named as GLTFLoader names it: the colons are taken out of
// node names and the model's own name is kept in userData.name. A front wheel is a steering node holding a rolling
// node, as on the model. The real model is looked at in the game.
test('the view draws the truck only for a work vehicle with the switch on, and leaves a garage car alone', async () => {
  const part = (name, parent) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mesh.name = name.replaceAll(':', ''); mesh.userData.name = name; parent.add(mesh);
    return mesh;
  };
  const stand = new THREE.Group();
  for (const id of ['fire-truck', 'supply-truck', 'water-tanker', 'tow-rig']) {
    const truck = new THREE.Group(); truck.name = id; truck.userData.name = id; truck.position.set(9, 9, 9);
    part(`${id}:body`, truck); part(`${id}:load`, truck); part(`${id}:spin-rear-left`, truck);
    part(`${id}:spin-front-left`, part(`${id}:steer-front-left`, truck));
    stand.add(truck);
  }
  const loads = [];
  const view = createWorkVehicleView({loadModel:url => { loads.push(url); return Promise.resolve(stand); }});
  const on = {enabled:name => name === 'wasteland-town'}, off = {enabled:() => false};
  const scene = new THREE.Scene(), player = new THREE.Group(), camera = new THREE.PerspectiveCamera();
  scene.add(player);
  player.position.set(4, 1, -7); player.rotation.set(0.1, 1.2, -0.05); player.visible = true;
  const jobState = vehicle => ({arena:{mode:'world-job', worldJob:{vehicle}}, speedMph:10, steerVisual:0.5, stageTimeSec:1});
  const fire = startWorkVehicle('fire-truck', {enabled:true});
  for (const [state, flags] of [[jobState(fire), off], [jobState(null), on], [{arena:null}, on], [{arena:{mode:'warlord'}}, on]]) {
    assert.equal(workVehicleToDraw(state, flags), null);
    assert.equal(view.update({scene, player, camera, state, flags}), false);
    assert.equal(player.visible, true, 'a garage car is drawn exactly as the renderer made it');
    assert.equal(scene.children.length, 1);
  }
  assert.equal(loads.length, 0, 'nothing loads until a truck is driven');
  assert.equal(camera.layers.isEnabled(WORK_VEHICLE_LAYER), false);
  // HOME-GROUND-3: with only Home Ground's switch on, Tin Town's flatbed on an open outing is drawn; nothing else is.
  const home = {enabled:name => name === 'home-ground'}, flatbed = startWorkVehicle('flatbed', {enabled:true});
  const openJob = (vehicle, id = 'open-roam') => ({arena:{mode:'world-job', worldJob:{vehicle, definition:{id}}}});
  assert.equal(workVehicleToDraw(openJob(flatbed), home), flatbed, 'the flatbed outing draws the flatbed');
  for (const [state, flags] of [[openJob(flatbed), off], [openJob(flatbed, 'night-2'), home], [openJob(fire), home]])
    assert.equal(workVehicleToDraw(state, flags), null, 'only the flatbed on an open outing with Home Ground on');
  const state = jobState(fire), before = JSON.stringify(state);
  view.update({scene, player, camera, state, flags:on});
  assert.equal(player.visible, false, 'while the truck loads, no sports car is drawn');
  await Promise.resolve(); await Promise.resolve();
  player.visible = true;
  assert.equal(view.update({scene, player, camera, state, flags:on}), true);
  assert.deepEqual(loads, ['/assets/models/wasteland/town/trucks-1.glb']);
  const drawn = scene.getObjectByName('work-vehicle:fire-truck');
  assert.ok(drawn && drawn.visible && !player.visible, 'the truck is drawn in place of the car');
  assert.ok(drawn.position.equals(player.position) && drawn.quaternion.equals(player.quaternion), 'it takes the car\'s pose');
  assert.equal(drawn.getObjectByName('fire-truck').position.length(), 0, 'the truck sits on the car\'s point');
  // The car stands on its lowest wheel point; the truck's wheels go to the same height. The stand-in's wheels are
  // unit boxes about their centres, so their lowest point is half a metre below the truck's.
  player.userData.grounding = {contactY:0.3};
  view.update({scene, player, camera, state, flags:on});
  assert.ok(Math.abs(drawn.children[0].position.y - (0.3 - (-0.5))) < 1e-9, 'the truck\'s tyres stand where the car\'s do');
  delete player.userData.grounding;
  assert.equal(drawn.getObjectByName('fire-truckbody').layers.isEnabled(WORK_VEHICLE_LAYER), true);
  assert.equal(drawn.getObjectByName('fire-truckbody').layers.isEnabled(0), false, 'the mirror\'s camera does not see the cab from inside');
  assert.equal(camera.layers.isEnabled(WORK_VEHICLE_LAYER), true, 'the main camera does');
  // Steering turns the steering node about the upright only; rolling turns the rolling nodes about the axle only.
  const steerNode = drawn.getObjectByName('fire-trucksteer-front-left'), frontSpin = drawn.getObjectByName('fire-truckspin-front-left');
  const euler = new THREE.Euler().setFromQuaternion(steerNode.quaternion, 'YXZ');
  assert.ok(Math.abs(euler.y + 0.5 * 35 * Math.PI / 180) < 1e-6 && Math.abs(euler.x) < 1e-9, 'the front wheel turns with the steering');
  state.stageTimeSec = 1.1;
  view.update({scene, player, camera, state, flags:on});
  const rolled = new THREE.Euler().setFromQuaternion(frontSpin.quaternion, 'XYZ').x;
  const expected = -10 * 0.44704 * 0.1 / 0.54;
  assert.ok(Math.abs(rolled - expected) < 1e-6, `the front wheel rolls once for the distance (${rolled})`);
  assert.ok(Math.abs(new THREE.Euler().setFromQuaternion(drawn.getObjectByName('fire-truckspin-rear-left').quaternion, 'XYZ').x - expected) < 1e-6);
  state.stageTimeSec = 1;
  assert.equal(JSON.stringify(state).replace('"stageTimeSec":1}', ''), before.replace('"stageTimeSec":1}', ''), 'the view writes no state');
  // The flatbed is the supply truck with its load hidden; the supply truck shows its load only when it has one.
  const show = vehicle => { view.update({scene, player, camera, state:jobState(vehicle), flags:on}); return scene.getObjectByName(`work-vehicle:${vehicle.id}`); };
  assert.equal(show(startWorkVehicle('flatbed', {enabled:true})).getObjectByName('supply-truckload').visible, false);
  assert.equal(show(startWorkVehicle('supply-truck', {enabled:true})).getObjectByName('supply-truckload').visible, true);
  assert.equal(show(startWorkVehicle({id:'supply-truck', loadKg:0}, {enabled:true})).getObjectByName('supply-truckload').visible, false);
  assert.equal(scene.children.length, 2, 'one truck at a time');
  player.visible = true;
  assert.equal(view.update({scene, player, camera, state:{arena:null}, flags:on}), true);
  assert.equal(scene.children.length, 1, 'the truck goes when the job ends');
  assert.equal(player.visible, true);
  // A model that cannot be loaded leaves the garage car drawn, so the player is never invisible.
  const broken = createWorkVehicleView({loadModel:() => Promise.reject(new Error('missing'))});
  broken.update({scene, player, camera, state:jobState(fire), flags:on});
  await Promise.resolve(); await Promise.resolve();
  player.visible = true;
  broken.update({scene, player, camera, state:jobState(fire), flags:on});
  assert.equal(player.visible, true);
});

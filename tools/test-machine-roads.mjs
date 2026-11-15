import assert from 'node:assert/strict';
import {createRoadMachineState, createRoadWork, roadCell, roadCondition, roadYardControls, stepRoadMachine, workRoadCell, workTownRoadCell} from '../src/machines/roads.js';
import {createTown, deserializeTown, serializeTown} from '../src/town/town-state.js';
import {stepTown} from '../src/town/index.js';
import {findHaulRoute, createHauler} from '../src/town/town-haulers.js';
import {closeDigSandbox, createDigSandbox, digSandboxMachineState, stepDigSandbox, switchDigMachine} from '../src/machines/dig-sandbox.js';

function buildRoad() {
  let work = createRoadWork();
  work.cells['0:0'] = {...roadCell(work, 0, 0), height:2};
  work.cells['0:1'] = {...roadCell(work, 0, 1), height:-1};
  work = workRoadCell(work, {kind:'dozer', x:0, z:0, bladeHeight:0}).work;
  assert.equal(work.bladeLoad, 2);
  work = workRoadCell(work, {kind:'dozer', x:0, z:1, bladeHeight:0}).work;
  assert.equal(work.bladeLoad, 1, 'Filling a ditch uses material from the blade.');
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:2, edgeOffsetM:0.5}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'soft');
  for (let i = 0; i < 3; i++) work = workRoadCell(work, {kind:'roller', x:0, z:1}).work;
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:2, edgeOffsetM:0.5}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'rough');
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:0.5, edgeOffsetM:0}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'good');
  return work;
}
assert.deepEqual(buildRoad(), buildRoad(), 'The same work produces the same road.');
assert.equal(roadCondition(roadCell(createRoadWork(), 0, 0)), 'unfinished');
const oldTown = createTown(42, 'Road test');
const oldSave = serializeTown(oldTown);
const loadedOldTown = deserializeTown(oldSave);
assert.equal(serializeTown(loadedOldTown), oldSave, 'An older town loads without adding road data.');
// Start with a cut and fill as the town ground would supply them.
loadedOldTown.machineRoadWork = createRoadWork();
loadedOldTown.machineRoadWork.cells['0:0'] = {...roadCell(loadedOldTown.machineRoadWork, 0, 0), height:1};
loadedOldTown.machineRoadWork.cells['0:1'] = {...roadCell(loadedOldTown.machineRoadWork, 0, 1), height:-1};
workTownRoadCell(loadedOldTown, {kind:'dozer', x:0, z:0, bladeHeight:0});
workTownRoadCell(loadedOldTown, {kind:'dozer', x:0, z:1, bladeHeight:0});
for (let i=0; i<3; i++) workTownRoadCell(loadedOldTown, {kind:'roller', x:0, z:1});
workTownRoadCell(loadedOldTown, {kind:'paver', x:0, z:1, speedMps:0.5, edgeOffsetM:0});
const loadedRoadTown = deserializeTown(serializeTown(loadedOldTown));
assert.equal(roadCondition(roadCell(loadedRoadTown.machineRoadWork, 0, 1)), 'good', 'A saved road remains a road.');
assert.equal(serializeTown(deserializeTown(oldSave)), oldSave, 'Road work does not alter the older save.');
// Two adjacent town cells give a truck a route. Every metre must be firm and
// smoothly paved before the whole route receives the highest grade.
const haulTown = createTown(42, 'Haul road');
haulTown.machineRoadWork = createRoadWork();
for (let x=0; x<16; x++) for (let z=0; z<8; z++) {
  haulTown.machineRoadWork.cells[`${x}:${z}`] = {...roadCell(haulTown.machineRoadWork, x, z), spread:1};
  workTownRoadCell(haulTown, {kind:'roller', x, z});
}
const from = {x:0,z:0}, to = {x:1,z:0};
const dirtHours = findHaulRoute(haulTown.machineRoads, from, to).hours;
for (let x=0; x<16; x++) for (let z=0; z<8; z++) {
  for (let pass=0; pass<2; pass++) workTownRoadCell(haulTown, {kind:'roller', x, z});
}
const firmHours = findHaulRoute(haulTown.machineRoads, from, to).hours;
assert.ok(firmHours < dirtHours, 'A firm road gives trucks a faster route.');
for (let x=0; x<16; x++) for (let z=0; z<8; z++)
  workTownRoadCell(haulTown, {kind:'paver', x, z, speedMps:0.5, edgeOffsetM:0});
const savedHaulTown = deserializeTown(serializeTown(haulTown));
assert.deepEqual(savedHaulTown.machineRoads.map(road => road.roadClass), ['paved', 'paved']);
const truck = createHauler({id:'road-truck', from, to, roads:savedHaulTown.machineRoads, vehicle:'truck', fuelLitres:1});
assert.ok(truck.ok && truck.agent.hoursToDestination < firmHours, 'A saved paved road makes a truck faster.');
// The town itself advances its own hauler on saved road grades each hour.
const slowTown = deserializeTown(serializeTown(savedHaulTown));
const fastTown = deserializeTown(serializeTown(savedHaulTown));
slowTown.machineRoads.forEach(road => {road.roadClass='dirt';});
for (const town of [slowTown, fastTown]) {
  const trip = createHauler({id:'day-truck', from, to, roads:town.machineRoads, vehicle:'truck', fuelLitres:1});
  trip.agent.speedFactor=0.000001;
  town.haulers=[trip.agent];
  for (let hour=0; hour<24; hour++) stepTown(town);
}
assert.ok(fastTown.haulers[0].progress > slowTown.haulers[0].progress,
  'A paved road moves the town truck farther through one day of town ticks.');
workTownRoadCell(haulTown, {kind:'paver', x:0, z:0, speedMps:2, edgeOffsetM:0});
assert.equal(haulTown.machineRoads[0].roadClass, 'plank', 'A rough patch lowers the road grade.');
workTownRoadCell(haulTown, {kind:'paver', x:0, z:0, speedMps:0.5, edgeOffsetM:0});
assert.equal(haulTown.machineRoads[0].roadClass, 'paved', 'Paving the patch again restores the grade.');

const slowControls = roadYardControls('paver', {forward:1, steer:0}, {Space:true, ShiftLeft:true});
assert.equal(slowControls.forward, 0.5);
assert.equal(roadYardControls('roller', {forward:1}, {ShiftLeft:true}).forward, 1);
let repairGround = createRoadWork();
repairGround.cells['0:1'] = {height:0, spread:1, compaction:1, surface:1, roughness:0.8};
let repairMachine = createRoadMachineState('paver');
for (let i=0; i<240; i++) {
  const next = stepRoadMachine(repairMachine, repairGround, slowControls, 1/60);
  repairMachine = next.state; repairGround = next.work;
}
assert.equal(roadCondition(roadCell(repairGround, 0, 1)), 'good', 'The keyboard slow pace repairs rough paving.');
for (const kind of ['dozer', 'roller', 'paver']) {
  const initial = createRoadMachineState(kind);
  const ground = createRoadWork();
  const idle = stepRoadMachine(initial, ground, {working:true}, 1);
  assert.deepEqual(idle.work, ground, 'A stopped machine does not make a road.');
  const driving = stepRoadMachine(initial, ground, {forward:1, working:true}, 4);
  assert.ok(driving.state.machine.z > 0, 'The machine drives.');
  assert.ok(driving.events.length > 0, 'Working while driving changes ground along the path.');
  assert.deepEqual(driving, stepRoadMachine(initial, ground, {forward:1, working:true}, 4));
  assert.equal(driving.events[0].cue, {dozer:'dozer-blade', roller:'roller-ground', paver:'paver-surface'}[kind]);
  const raised = stepRoadMachine(initial, ground, {forward:1}, 4);
  assert.deepEqual(raised.work, ground, 'Driving with the tool raised leaves the ground alone.');
}
// Cut ordinary flat ground, then drive back with the blade raised to spread it.
let longGround = createRoadWork();
let longDozer = createRoadMachineState('dozer');
for (let i=0; i<45; i++) {
  const next = stepRoadMachine(longDozer, longGround, {forward:1, working:true}, 1);
  longDozer = next.state; longGround = next.work;
}
for (let i=0; i<50; i++) {
  const next = stepRoadMachine(longDozer, longGround, {forward:-1}, 1);
  longDozer = next.state; longGround = next.work;
}
for (let z=2; z<=41; z++) {
  assert.ok(roadCell(longGround, 0, z).spread > 0, `The blade spreads ordinary ground at ${z} m.`);
  for (let pass=0; pass<3; pass++) longGround = workRoadCell(longGround, {kind:'roller', x:0, z}).work;
  longGround = workRoadCell(longGround, {kind:'paver', x:0, z, speedMps:0.5, edgeOffsetM:0}).work;
  assert.equal(roadCondition(roadCell(longGround, 0, z)), 'good');
}
// Drive a weaving pass, then return along the original line to repair it.
let drivenGround = createRoadWork();
for (let x=-5; x<=5; x++) for (let z=0; z<20; z++)
  drivenGround.cells[`${x}:${z}`] = {height:0, spread:1, compaction:1, surface:0, roughness:0};
let drivenPaver = createRoadMachineState('paver');
for (let i=0; i<600; i++) {
  const next = stepRoadMachine(drivenPaver, drivenGround,
    {forward:0.5, working:true, steer:i>150 && i<240 ? 0.2 : 0}, 1/60);
  drivenPaver=next.state; drivenGround=next.work;
}
assert.equal(roadCondition(roadCell(drivenGround, 0, 3)), 'rough', 'Steering away from the line leaves a ragged edge.');
drivenPaver = createRoadMachineState('paver');
for (let i=0; i<600; i++) {
  const next = stepRoadMachine(drivenPaver, drivenGround, {forward:0.5, working:true}, 1/60);
  drivenPaver=next.state; drivenGround=next.work;
}
assert.equal(roadCondition(roadCell(drivenGround, 0, 3)), 'good', 'A straight pass repairs the edge.');
// A heap between worked metres leaves a bump until the drum presses it level.
let bumpGround = createRoadWork();
for (let z=0; z<10; z++) bumpGround.cells[`0:${z}`] =
  {height:z===3 ? 1 : 0, spread:1, compaction:1, surface:0, roughness:0};
function drivePass(kind, ground) {
  let machine = createRoadMachineState(kind);
  for (let i=0; i<600; i++) {
    const next = stepRoadMachine(machine, ground, {forward:0.5, working:true}, 1/60);
    machine=next.state; ground=next.work;
  }
  return ground;
}
bumpGround = drivePass('paver', bumpGround);
assert.equal(roadCondition(roadCell(bumpGround, 0, 3)), 'rough', 'A heap creates a visible bump.');
for (let pass=0; pass<4; pass++) bumpGround = drivePass('roller', bumpGround);
bumpGround = drivePass('paver', bumpGround);
assert.equal(roadCondition(roadCell(bumpGround, 0, 3)), 'good', 'Rolling and paving again repairs the bump.');
let yard = createDigSandbox({playerId:'road-test'});
for (const expected of ['dumpTruck', 'trencher', 'drill', 'dozer', 'roller', 'paver', 'excavator']) {
  yard = switchDigMachine(yard);
  assert.equal(yard.activeMachine, expected, 'Every machine can be selected in the yard.');
}
for (const kind of ['dozer', 'roller', 'paver']) {
  yard = {...yard, activeMachine:kind};
  const before = digSandboxMachineState(yard);
  yard = stepDigSandbox(yard, {controls:{forward:1, working:true}}, 4);
  assert.ok(digSandboxMachineState(yard).z > before.z, `${kind} drives in the yard simulation.`);
}
assert.ok(Object.keys(yard.roadWork.cells).length > 0, 'Road work remains in the yard when machines change.');
const freshYard = createDigSandbox({playerId:'road-test'});
const expectedPractice = {cells:{}, bladeLoad:0};
for (let z=12; z<=19; z++) expectedPractice.cells[`40:${z}`] =
  {height:z<16 ? 1 : -1, spread:0, compaction:0, surface:0, roughness:0};
assert.deepEqual(freshYard.roadWork, expectedPractice, 'A fresh visit contains exactly the practice ground.');
assert.equal(roadCell(freshYard.roadWork, 40, 12).height, 1, 'The yard has material to cut.');
assert.equal(roadCell(freshYard.roadWork, 40, 16).height, -1, 'The yard has a low place to fill.');
let practice = {...freshYard, activeMachine:'dozer'};
practice = stepDigSandbox(practice, {controls:{forward:1, working:true}}, 12);
assert.ok(roadCell(practice.roadWork, 40, 16).spread > 0, 'Driving the blade carries yard material into the low ground.');
closeDigSandbox();
console.log('Road work rules pass.');
import * as THREE from 'three';
import {createRoadWorkView} from '../src/machines/roads-view.js';
const scene = new THREE.Group();
const roadView = createRoadWorkView(scene, () => 4);
const visibleWork = createRoadWork();
visibleWork.cells['2:3'] = {height:0, spread:1, compaction:0.2, surface:1, roughness:0.8};
roadView.update(visibleWork);
const patch = scene.getObjectByName('road-work-2:3');
assert.ok(patch, 'A worked cell is visible.');
const softColor = patch.material.color.getHex();
visibleWork.cells['2:3'] = {height:0, spread:1, compaction:1, surface:1, roughness:0};
roadView.update(visibleWork);
assert.notEqual(patch.material.color.getHex(), softColor, 'A repaired road looks different.');
assert.equal(patch.position.y, 4.05);
visibleWork.bladeLoad = 2;
roadView.update(visibleWork, {x:10, z:20, heading:0});
const heap = scene.getObjectByName('dozer-blade-heap');
assert.equal(heap.visible, true, 'The material carried by the blade is visible.');
assert.equal(heap.position.z, 22, 'The heap travels ahead of the dozer.');
visibleWork.bladeLoad = 0;
roadView.update(visibleWork, {x:10, z:20, heading:0});
assert.equal(heap.visible, false, 'The heap disappears when the blade has emptied.');
roadView.dispose();
assert.equal(scene.children.length, 0, 'The yard removes its road view on exit.');

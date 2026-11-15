import assert from 'node:assert/strict';
import {createRoadMachineState, createRoadWork, roadCell, roadCondition, roadYardControls, stepRoadMachine, workRoadCell, workTownRoadCell} from '../src/machines/roads.js';
import {createTown, deserializeTown, serializeTown} from '../src/town/town-state.js';
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
assert.notDeepEqual(freshYard.roadWork, yard.roadWork, 'Road work lasts for the visit only.');
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

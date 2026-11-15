import assert from 'node:assert/strict';
import {createRoadMachineState, createRoadWork, roadCell, roadCondition, stepRoadMachine, workRoadCell} from '../src/machines/roads.js';
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
assert.deepEqual(freshYard.roadWork, createRoadWork(), 'Road work lasts for the visit only.');
closeDigSandbox();
console.log('Road work rules pass.');

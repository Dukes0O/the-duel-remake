import assert from 'node:assert/strict';
import {createGroundEdit} from '../src/world/ground-edit.js';
import {createMachineState, machineToolPosition, stepMachine} from '../src/machines/machine.js';
import {forwardKinematics} from '../src/machines/kinematics.js';
import {MACHINE_CONTENT, defineMachine, machineDefinition} from '../src/machines/content/machines.js';
import {machineLoadVolume, operateMachineTool, transferMachineLoad} from '../src/machines/tools.js';
import {createMachineDemo, finishMachineDemo, recordMachineDemo} from '../src/machines/demo.js';

const flatGround = () => createGroundEdit({region:{editable:true}, seed:31, naturalHeight:() => 0});
const excavator = machineDefinition('excavator');
const truck = machineDefinition('dumpTruck');
const excavatorState = createMachineState(excavator);
const truckState = createMachineState(truck, {x:4});
const ground = flatGround();
const toolPosition = machineToolPosition(excavator, excavatorState, 'bucket');
assert.ok(Number.isFinite(toolPosition.x) && Number.isFinite(toolPosition.z), 'joint solver places tool in world space');
const dug = operateMachineTool(excavator, excavatorState, {ground, toolId:'bucket', action:'dig', dtSeconds:0.5,
  shape:{x:0,z:0,radius:1.1}, targetHeight:-0.1});
assert.equal(dug.groundResult.volume, 0.5, 'bucket removes the requested compacted volume');
assert.equal(dug.movedVolumeM3, dug.groundResult.looseVolume, 'loose material includes ground bulking');
const loaded = transferMachineLoad(dug.state, truckState, dug.movedVolumeM3, truck.tools.bed.capacityM3);
assert.equal(loaded.movedVolumeM3, dug.groundResult.looseVolume, 'excavated load transfers to the truck bed');
assert.equal(machineLoadVolume(loaded.sourceState), 0, 'bucket is empty after transfer');
assert.equal(machineLoadVolume(loaded.targetState), dug.groundResult.looseVolume, 'truck carries the material removed from the ground');
const emptyTruckSpeed = stepMachine(truck, truckState, {forward:1}, 1).speedMps;
const loadedTruckSpeed = stepMachine(truck, loaded.targetState, {forward:1}, 1).speedMps;
assert.ok(loadedTruckSpeed < emptyTruckSpeed, 'carried material changes vehicle handling');

const tippedGround = flatGround();
const tipped = operateMachineTool(truck, loaded.targetState, {ground:tippedGround, toolId:'bed', action:'tip', dtSeconds:1,
  shape:{x:5,z:0,radius:1}});
assert.equal(tipped.state.load.topsoil, undefined, 'tipping feeds the ground edit with the carried material');
assert.ok(tippedGround.heightAt(5,0) > 0, 'tipping raises the ground');

const custom = defineMachine({id:'crawler', driveKind:'tracks', massKg:7_500, maxSpeedMps:4, maxLoadKg:2_000,
  turnRateRadPerSecond:1, joints:[], tools:{blade:{kind:'blade',capacityM3:2,radiusM:0.8,cutRateM3s:0.5}}, controls:{drive:['forward','steer'],work:['blade']}});
assert.equal(createMachineState(custom).x, 0, 'a new data-only machine needs no renderer registration');
assert.equal(Object.hasOwn(MACHINE_CONTENT, 'excavator'), true);

const arm = [{name:'boom',parent:null,origin:[0,1,0],axis:[1,0,0],limits:[-Math.PI,Math.PI]}];
assert.deepEqual(forwardKinematics(arm, {boom:0}).boom.position, [0,1,0]);

function runAt(fps) {
  let state = createMachineState(excavator);
  for (let frame=0; frame<fps*4; frame++) state = stepMachine(excavator, state, {forward:0.65,steer:0.3,swing:0.2,boom:0.4}, 1/fps);
  return state;
}
const at30 = runAt(30), at60 = runAt(60), at144 = runAt(144);
for (const key of ['x','z','heading','speedMps','timeSeconds']) {
  assert.ok(Math.abs(at30[key] - at60[key]) < 1e-9, `${key} repeats at 30 and 60 fps`);
  assert.ok(Math.abs(at30[key] - at144[key]) < 1e-9, `${key} repeats at 30 and 144 fps`);
}
assert.ok(Math.abs(at30.jointAngles.boom - at144.jointAngles.boom) < 1e-9, 'joint motion repeats across frame rates');
assert.ok(Math.abs(at30.jointAngles.house) > 0, 'work controls map to their named machine joints');
const pivot = stepMachine(excavator, createMachineState(excavator), {leftTrack:-1,rightTrack:1}, 1);
assert.equal(pivot.speedMps, 0, 'tracks turn in place by driving at different speeds');
assert.notEqual(pivot.heading, 0, 'differential tracks change heading');

const demo = createMachineDemo({machineId:'excavator', target:{x:0,z:0}});
recordMachineDemo(demo, {state:at30, drive:{forward:0.5,steer:-0.2}, dtSeconds:4, movedVolumeM3:2, spilledVolumeM3:0.25});
const finished = finishMachineDemo(demo);
assert.ok(finished.samples.length <= 2_400, 'demonstration recordings are capped');
assert.ok(finished.metrics.averageSpeedMps > 0, 'demonstrations measure speed');
assert.ok(finished.metrics.accuracy >= 0 && finished.metrics.accuracy <= 1, 'demonstrations measure target accuracy');
assert.equal(finished.metrics.spillFraction, 0.25 / 2.25, 'demonstrations measure spill');
assert.equal(finished.samples[0].drive.forward, 0.5, 'recordings keep drive inputs with joint angles');

assert.throws(() => createMachineState(null), TypeError);
assert.throws(() => machineDefinition('missing'), RangeError);
console.log('Machine core passed: data machines, kinematics, ground digging, truck loading, tipping, demonstrations and repeatability at 30, 60 and 144 fps.');

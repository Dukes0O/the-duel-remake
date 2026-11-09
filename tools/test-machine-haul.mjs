import assert from 'node:assert/strict';
import {createFeatureFlags} from '../src/feature-flags.js';
import {keyboardAction} from '../src/input-contexts.js';
import {createGroundEdit} from '../src/world/ground-edit.js';
import {machineDefinition} from '../src/machines/content/machines.js';
import {machineToolPosition} from '../src/machines/machine.js';
import {createMachineHaul, operateMachineHaul, stepMachineHaul, switchHaulMachine} from '../src/machines/haul.js';

const ground = createGroundEdit({region:{editable:true}, seed:31, naturalHeight:() => 0});
const flags = createFeatureFlags({catalog:{'wasteland-town':'dev'}, qa:true, search:'?flags=wasteland-town', storage:null});
assert.equal(flags.enabled('wasteland-town'), true, 'the town feature can be enabled in a test build');
assert.equal(keyboardAction('machine', 'KeyQ'), 'machine-switch', 'one keyboard key switches machines');

let haul = createMachineHaul({ground, excavator:{x:0,z:0}, truck:{x:-8.6,z:0.7}});
assert.equal(machineDefinition('excavator').driveKind, 'tracks');
assert.equal(machineDefinition('dumpTruck').driveKind, 'wheels');

// Easy driver: dig one bucket, swing over the truck, load it, then drive and tip.
haul = operateMachineHaul(haul, {action:'dig', dtSeconds:0.5, targetHeight:-0.1,
  shape:{x:0,z:0,radius:1.1}});
const bucketVolume = Object.values(haul.machines.excavator.load).reduce((sum, volume) => sum + volume, 0);
assert.ok(bucketVolume > 0, 'the easy driver digs real material from editable ground');
haul = stepMachineHaul(haul, {swing:1}, 2);
const bucketAtTruck = machineToolPosition(machineDefinition('excavator'), haul.machines.excavator, 'bucket');
const bedTool = machineDefinition('dumpTruck').tools.bed;
assert.ok(Math.abs(bucketAtTruck.x - haul.machines.dumpTruck.x) <= bedTool.widthM / 2 &&
  Math.abs(bucketAtTruck.z - haul.machines.dumpTruck.z - bedTool.centerZ) <= bedTool.lengthM / 2,
  'the excavator swings its bucket over the truck bed');
haul = switchHaulMachine(haul);
assert.equal(haul.activeMachine, 'dumpTruck');
haul = switchHaulMachine(haul);
assert.equal(haul.activeMachine, 'excavator');
haul = operateMachineHaul(haul, {action:'load'});
assert.ok(Object.values(haul.machines.dumpTruck.load).reduce((sum, volume) => sum + volume, 0) > 0,
  'bucket contents transfer into the dump truck bed');
assert.equal(Object.keys(haul.machines.excavator.load).length, 0, 'the bucket is empty after loading');

const emptySpeed = stepMachineHaul({...haul, activeMachine:'dumpTruck', machines:{...haul.machines,
  dumpTruck:{...haul.machines.dumpTruck, load:{}}}}, {forward:0.5}, 8).machines.dumpTruck.speedMps;
haul = switchHaulMachine(haul);
haul = stepMachineHaul(haul, {forward:0.5}, 8);
assert.ok(haul.machines.dumpTruck.speedMps < emptySpeed, 'a loaded truck drives more slowly');
const tipAt = {x:haul.machines.dumpTruck.x, z:haul.machines.dumpTruck.z};
haul = operateMachineHaul(haul, {action:'tip', dtSeconds:5, shape:{...tipAt, radius:1}});
assert.equal(Object.keys(haul.machines.dumpTruck.load).length, 0, 'the truck empties its bed by tipping');
assert.ok(ground.heightAt(tipAt.x, tipAt.z) > 0, 'tipped loose material forms a heap in the ground layer');

const missedGround = createGroundEdit({region:{editable:true}, seed:32, naturalHeight:() => 0});
let missed = createMachineHaul({ground:missedGround, excavator:{x:0,z:0}, truck:{x:20,z:20}});
missed = operateMachineHaul(missed, {action:'dig', dtSeconds:0.5, targetHeight:-0.1,
  shape:{x:0,z:0,radius:1.1}});
const bucketTip = machineToolPosition(machineDefinition('excavator'), missed.machines.excavator, 'bucket');
missed = operateMachineHaul(missed, {action:'load'});
assert.ok(missed.spilledVolumeM3 > 0, 'a missed load is counted as a spill');
assert.ok(missedGround.heightAt(bucketTip.x, bucketTip.z) > 0, 'a missed load lands on the ground');
assert.equal(Object.keys(missed.machines.excavator.load).length, 0, 'a successful spill empties the bucket');

console.log('Machine haul passed: Easy loading, keyboard switching, loaded driving, tipping and ground spills.');

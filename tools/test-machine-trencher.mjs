import assert from 'node:assert/strict';
import {createGroundEdit} from '../src/world/ground-edit.js';
import {machineDefinition} from '../src/machines/content/machines.js';
import {createTrencherState, stepTrencher, TRENCHER_LIMITS} from '../src/machines/trencher.js';

const trenchGround = createGroundEdit({region:{id:'test-dig', editable:true}, seed:17, naturalHeight:() => 0});
assert.equal(machineDefinition('trencher').tools.chain.widthM, 1, 'the chain cuts a one metre wide path');
assert.equal(machineDefinition('trencher').tools.chain.depthM, 1.5, 'the chain cuts to 1.5 metres');
assert.equal(TRENCHER_LIMITS.maxSpeedMps, 0.8, 'the work speed stays slow and easy to control');

let state = createTrencherState();
const fps = 60;
let plumes = 0;
for (let frame = 0; state.machine.z < 100 && frame < 200 * fps; frame++) {
  const step = stepTrencher(state, {forward:1, steer:0, chainDown:true}, 1 / fps, trenchGround);
  state = step.state;
  plumes += step.events.filter(event => event.type === 'dirt-plume').length;
}

assert.ok(state.machine.z >= 100 && state.machine.z < 100 + TRENCHER_LIMITS.maxSpeedMps / fps,
  'the tracked machine reaches 100 metres within one simulation tick');
assert.ok(Math.abs(state.cutVolumeM3 - 150) < 1e-7, 'a 100 metre ditch removes 150 cubic metres');
assert.ok(Math.abs(state.ridgeLooseVolumeM3 - state.cutVolumeM3 * 1.25) < 1e-7,
  'the ridge receives all dug dirt at its loose volume');
assert.ok(state.speedFactor < 1 && state.machine.speedMps < TRENCHER_LIMITS.maxSpeedMps,
  'cutting clay lowers the machine speed');
assert.equal(plumes, 100, 'each metre of cut emits a dirt plume event');
assert.equal(trenchGround.heightAt(0, 50), -1.5, 'the ditch floor is 1.5 metres below its original grade');
assert.ok(trenchGround.heightAt(1.4, 50) > 0, 'the side chute leaves a raised ridge beside the ditch');
assert.ok(trenchGround.heightAt(4, 50) > -0.01, 'ground outside the ditch stays at its original grade');
assert.equal(trenchGround.heightAt(-1.4, 50), 0, 'the dirt goes to one side only, so none is doubled');

const reservedGround = createGroundEdit({region:{id:'reserved-ridge',editable:true}, seed:17, naturalHeight:() => 0,
  reservedShapes:[{x:1.4,z:0,radius:0.8}]});
let reservedState=createTrencherState();
const beforeVolume=Array.from({length:15},(_,z)=>Array.from({length:15},(_,x)=>reservedGround.heightAt(x-7,z-7)))
  .flat().reduce((sum,height)=>sum+height,0);
for(let frame=0;reservedState.machine.z<1.1&&frame<200;frame++){
  const result=stepTrencher(reservedState,{forward:1,chainDown:true},1/60,reservedGround);
  reservedState=result.state;
}
const afterVolume=Array.from({length:15},(_,z)=>Array.from({length:15},(_,x)=>reservedGround.heightAt(x-7,z-7)))
  .flat().reduce((sum,height)=>sum+height,0);
assert.ok(reservedState.cutVolumeM3>0,'the trench still cuts beside a reserved ridge area');
assert.ok(Math.abs(afterVolume-beforeVolume)<1e-5,'cut and deposited material conserve total ground volume beside a reserved area');

const blockedGround=createGroundEdit({region:{id:'blocked-ridges',editable:true},naturalHeight:()=>0,
  reservedShapes:[{x:1.4,z:-2,radius:0.8},{x:-1.4,z:-2,radius:0.8}]});
const blockedStep=stepTrencher(createTrencherState(),{forward:1,chainDown:true},2,blockedGround);
assert.equal(blockedStep.cutVolumeM3,0,'the trencher stops before cutting when both ridge sides are reserved');
assert.equal(blockedStep.events[0]?.reason,'Both sides are blocked, so the trencher stopped without removing soil.',
  'the stopped cut gives a plain reason');
assert.equal(blockedGround.heightAt(0,-2),0,'a refused ridge placement moves no soil at all');
assert.ok(blockedStep.state.machine.z<=1+1e-9,'the machine stops at the refused spot');
assert.equal(blockedStep.state.machine.speedMps,0,'the machine has no speed left at the refused spot');
const blockedAgain=stepTrencher(blockedStep.state,{forward:1,chainDown:true},1,blockedGround);
assert.equal(blockedAgain.state.machine.z,blockedStep.state.machine.z,'with the chain down it stays at the refused spot');
assert.equal(blockedAgain.cutVolumeM3,0,'trying again still removes nothing');
const chainRaised=stepTrencher(blockedAgain.state,{forward:1,chainDown:false},1,blockedGround);
assert.ok(chainRaised.state.machine.z>blockedAgain.state.machine.z,'raising the chain lets the driver move on');

// A car wheel over the edited path reads the lower ground height; the same
// ground query used by vehicle suspension makes the ditch a real obstacle.
const carWheelHeight = trenchGround.heightAt(0, 50);
const roadWheelHeight = trenchGround.heightAt(4, 50);
assert.equal(carWheelHeight, roadWheelHeight - 1.5, 'a car entering the ditch encounters the cut floor');

const stoppedGround = createGroundEdit({region:{id:'stopped-dig', editable:true}, naturalHeight:() => 0});
const stopped = stepTrencher(createTrencherState(), {forward:1, chainDown:false}, 1, stoppedGround);
assert.equal(stopped.cutVolumeM3, 0, 'the chain does not cut while raised');
assert.equal(stopped.events.length, 0, 'raised-chain travel creates no plume');

assert.throws(() => stepTrencher(null, {}, 1, trenchGround), TypeError);
console.log('Trencher passed: data definition, 100 metre cut volume, matching ridge, ditch height, wheel ground query, plume events and raised-chain behavior.');

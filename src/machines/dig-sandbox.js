import {createMachineHaul, operateMachineHaul, stepMachineHaul} from './haul.js';
import {machineToolPosition} from './machine.js';
import {machineLoadVolume} from './tools.js';
import {machineDefinition} from './content/machines.js';
import {createGroundEdit} from '../world/ground-edit.js';
import {resetScablandsGroundEdit, scablandsNaturalHeightAt, setScablandsGroundEdit} from '../world/scablands-ground.js';
import {SCABLANDS_PLACES} from '../world/scablands.js';
import {createTrencherState, stepTrencher} from './trencher.js';

// The bucket reaches about 8.6 m from the excavator. The truck's
// bed is that far to the player's left and the heap that far to the right, so a swing reaches each.
export const DIG_REACH_M = 8.6;
const YARD = Object.freeze({excavator:{x:0,z:18}, dumpTruck:{x:DIG_REACH_M,z:18.7}, trencher:{x:24,z:10}});
export const DIG_HEAP = Object.freeze({x:-DIG_REACH_M,z:18});
const RESERVATIONS = Object.freeze([
  {x:0,z:120,radius:78,sentence:'The Dome is built here. Dig around it.'},
  {x:-90,z:120,radius:62,sentence:'The Dome is built here. Dig around it.'},
  {x:90,z:120,radius:62,sentence:'The Dome is built here. Dig around it.'},
  {x:0,z:1120,radius:18,sentence:'The gate is protected ground. Dig around it.'},
  ...SCABLANDS_PLACES.map(place=>({x:place.x,z:place.z,radius:place.flatRadius,
    sentence:`${place.name} is a story place. Dig around it.`})),
]);
const STEP = 1 / 60;

/** Frame edges stay queued until a simulation step consumes them. */
export function createPendingDigActions(){
  const pending=new Set();
  return Object.freeze({push(action){pending.add(action);},consume(action){if(!pending.has(action))return false;pending.delete(action);return true;}});
}

function newGround(seed) {
  return createGroundEdit({region:{id:'scablands',editable:true},seed,naturalHeight:scablandsNaturalHeightAt,
    reservedShapes:RESERVATIONS});
}

/** Make the free yard simulation. This module has no DOM, renderer or career-save access. */
export function createDigSandbox({seed = 1, ground = null, playerId = 'player'} = {}) {
  const edit = ground || newGround(seed);
  const memory = globalThis.__theDigGroundMemory ??= {};
  const saved = memory[playerId];
  let loaded = false;
  if (!ground && saved?.version === 1) {
    try { edit.loadSave(saved); loaded = true; } catch { /* An old in-memory shape is ignored safely. */ }
  }
  // TOWN-STORE replaces this page-lifetime memory save; career storage is never used.
  if (!ground && !loaded) {
    for(const [radius,volume] of [[0.8,4],[1.6,7],[2.6,11]])edit.fill({x:DIG_HEAP.x,z:DIG_HEAP.z,radius},'topsoil',volume);
    memory[playerId]=edit.toSave();
  }
  setScablandsGroundEdit(edit);
  const haul = createMachineHaul({ground:edit,excavator:YARD.excavator,truck:YARD.dumpTruck});
  return {ground:edit,playerId,haul,trencher:createTrencherState(YARD.trencher),activeMachine:'excavator',
    cameraIndex:0,mode:'work',fixedCarry:0,elapsed:0,events:[],lastMessage:'',dirty:false,
    excavatedM3:0,loadedM3:0,tippedM3:0};
}

/** Leaving the yard hands the Scablands back with its own ground, so a later job is unchanged. */
export function closeDigSandbox() { resetScablandsGroundEdit(); }

export function switchDigMachine(sim) {
  const ids=['excavator','dumpTruck','trencher'];
  const activeMachine=ids[(ids.indexOf(sim.activeMachine)+1)%ids.length];
  return {...sim,activeMachine,mode:activeMachine==='excavator'?'work':'drive'};
}

export function cycleDigCamera(sim) { return {...sim,cameraIndex:(sim.cameraIndex+1)%3}; }

/** Apply one fixed simulation step. Actions and ground edits never run in rendering. */
function fixedStep(sim,input) {
  const events=[]; let next=sim;
  if(sim.activeMachine==='trencher'){
    const result=stepTrencher(sim.trencher,{...input.controls,chainDown:input.action==='trench'},STEP,sim.ground);
    next={...next,trencher:result.state}; events.push(...result.events);
  } else {
    const haul={...sim.haul,activeMachine:sim.activeMachine};
    let advanced=stepMachineHaul(haul,input.controls,STEP);
    // The bed lifts while Space is held and settles back after; the load slides once it is high enough.
    const truck=advanced.machines.dumpTruck,tipping=input.action==='tip';
    const bedAngle=Math.max(0,Math.min(.85,(truck.bedAngle??0)+(tipping?.6:-.5)*STEP));
    advanced={...advanced,machines:{...advanced.machines,dumpTruck:{...truck,bedAngle}}};
    if(input.action==='tip'&&bedAngle<.4)return {...next,haul:{...advanced,activeMachine:'excavator'},events};
    if(input.action==='dig'||input.action==='load'||input.action==='tip'){
      if(input.action==='dig'){
        const machine=haul.machines.excavator,tip=machineToolPosition(machineDefinition('excavator'),machine,'bucket');
        if(machineLoadVolume(machine)>=machineDefinition('excavator').tools.bucket.capacityM3-1e-5){
          next={...next,lastMessage:'The bucket is full. Load it into the truck.'};
          return {...next,haul:sim.haul,events};
        }
        if(tip.y>sim.ground.heightAt(tip.x,tip.z)+.05){
          next={...next,lastMessage:'Lower the boom until the bucket touches the ground.'};
          return {...next,haul:sim.haul,events};
        }
      }
      advanced=operateMachineHaul(advanced,{action:input.action,dtSeconds:STEP});
      const operation=advanced.lastOperation;
      if(input.action==='dig')next={...next,excavatedM3:next.excavatedM3+(operation?.movedVolumeM3||0)};
      if(input.action==='load')next={...next,loadedM3:next.loadedM3+(operation?.movedVolumeM3||0)};
      if(input.action==='tip')next={...next,tippedM3:next.tippedM3+(operation?.movedVolumeM3||0)};
      if(operation?.groundResult?.reason)events.push({type:'cut-refused',reason:operation.groundResult.reason});
      if(operation?.refused&&operation.groundResult?.reason)events.push({type:'cut-refused',reason:operation.groundResult.reason});
      if(input.action==='dig'&&operation?.movedVolumeM3>0){
        const position=machineToolPosition(machineDefinition('excavator'),advanced.machines.excavator,'bucket');
        events.push({type:'dirt-plume',x:position.x,y:position.y,z:position.z,volumeM3:operation.movedVolumeM3,
          material:Object.keys(advanced.machines.excavator.load).at(-1)||'topsoil'});
      }
      if(input.action==='tip'&&operation?.movedVolumeM3>0){const rear=machineToolPosition(machineDefinition('dumpTruck'),advanced.machines.dumpTruck,'bed');events.push({type:'tip',x:rear.x,y:rear.y,z:rear.z,volumeM3:operation.movedVolumeM3});}
      if(operation?.missed){const tip=machineToolPosition(machineDefinition('excavator'),advanced.machines.excavator,'bucket');events.push({type:'spill',...tip,volumeM3:operation.spilledVolumeM3});}
      if(operation?.message)next={...next,lastMessage:operation.message};
    }
    next={...next,haul:{...advanced,activeMachine:'excavator'}};
  }
  if(events.some(event=>event.type==='cut-refused'))next={...next,lastMessage:events.find(event=>event.type==='cut-refused').reason};
  if(events.some(event=>event.type==='dirt-plume'||event.type==='tip'||event.type==='spill'))next={...next,dirty:true};
  return {...next,events};
}

export function stepDigSandbox(sim,input={},dtSeconds=STEP) {
  if(!Number.isFinite(dtSeconds)||dtSeconds<0)throw new TypeError('Sandbox time must be non-negative.');
  let carry=sim.fixedCarry+dtSeconds,next={...sim,events:[]};
  while(carry+1e-10>=STEP){next=fixedStep(next,input);carry-=STEP;}
  next.fixedCarry=carry;next.elapsed=sim.elapsed+dtSeconds;
  if(next.dirty){(globalThis.__theDigGroundMemory??={})[next.playerId]=next.ground.toSave();next.dirty=false;}
  return next;
}

export function digSandboxMachineState(sim,id=sim.activeMachine) {
  return id==='trencher'?sim.trencher.machine:sim.haul.machines[id];
}

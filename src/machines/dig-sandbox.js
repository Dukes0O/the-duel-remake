import {createMachineHaul, operateMachineHaul, stepMachineHaul} from './haul.js';
import {machineToolPosition} from './machine.js';
import {machineDefinition} from './content/machines.js';
import {createGroundEdit} from '../world/ground-edit.js';
import {scablandsNaturalHeightAt, setScablandsGroundEdit} from '../world/scablands-ground.js';
import {SCABLANDS_PLACES} from '../world/scablands.js';
import {createTrencherState, stepTrencher} from './trencher.js';

const YARD = Object.freeze({excavator:{x:0,z:34}, dumpTruck:{x:0,z:39}, trencher:{x:7,z:35}});
const RESERVATIONS = Object.freeze([
  {x:0,z:0,radius:24,sentence:'The Dome is built here. Dig around it.'},
  {x:0,z:1120,radius:18,sentence:'The gate is protected ground. Dig around it.'},
  ...SCABLANDS_PLACES.map(place=>({x:place.x,z:place.z,radius:place.flatRadius,
    sentence:`${place.name} is a story place. Dig around it.`})),
]);
const STEP = 1 / 60;

function newGround(seed) {
  return createGroundEdit({region:{id:'scablands',editable:true},seed,naturalHeight:scablandsNaturalHeightAt,
    reservedShapes:RESERVATIONS});
}

/** Make the free yard simulation. This module has no DOM, renderer or career-save access. */
export function createDigSandbox({seed = 1, ground = null} = {}) {
  const edit = ground || newGround(seed);
  const saved = globalThis.__theDigGroundMemory;
  let loaded = false;
  if (!ground && saved?.version === 1) {
    try { edit.loadSave(saved); loaded = true; } catch { /* An old in-memory shape is ignored safely. */ }
  }
  // TOWN-STORE replaces this page-lifetime memory save; career storage is never used.
  if (!ground && !loaded) {
    for(const [radius,volume] of [[0.8,4],[1.6,7],[2.6,11]])edit.fill({x:10,z:39,radius},'topsoil',volume);
    globalThis.__theDigGroundMemory=edit.toSave();
  }
  setScablandsGroundEdit(edit);
  const haul = createMachineHaul({ground:edit,excavator:YARD.excavator,truck:YARD.dumpTruck});
  return {ground:edit,haul,trencher:createTrencherState(YARD.trencher),activeMachine:'excavator',
    cameraIndex:1,mode:'drive',fixedCarry:0,elapsed:0,events:[],lastMessage:'',dirty:false,
    excavatedM3:0,loadedM3:0,tippedM3:0};
}

export function switchDigMachine(sim) {
  const ids=['excavator','dumpTruck','trencher'];
  return {...sim,activeMachine:ids[(ids.indexOf(sim.activeMachine)+1)%ids.length],mode:'drive',
    cameraIndex:sim.activeMachine==='excavator'?1:0};
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
    if(input.action==='dig'||input.action==='load'||input.action==='tip'){
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
      if(input.action==='tip'&&operation?.movedVolumeM3>0)events.push({type:'tip',volumeM3:operation.movedVolumeM3});
      if(operation?.missed)events.push({type:'spill',volumeM3:operation.spilledVolumeM3});
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
  if(next.dirty){globalThis.__theDigGroundMemory=next.ground.toSave();next.dirty=false;}
  return next;
}

export function digSandboxMachineState(sim,id=sim.activeMachine) {
  return id==='trencher'?sim.trencher.machine:sim.haul.machines[id];
}

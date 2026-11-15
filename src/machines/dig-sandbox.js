import {createMachineHaul, operateMachineHaul, stepMachineHaul} from './haul.js';
import {machineToolPosition} from './machine.js';
import {machineLoadVolume} from './tools.js';
import {machineDefinition} from './content/machines.js';
import {createGroundEdit} from '../world/ground-edit.js';
import {createGroundTunnels} from '../world/ground-tunnels.js';
import {SCARPS} from '../world/scablands-scarps.js';
import {createBorerState, stepBorer} from './borer.js';
import {resetScablandsGroundEdit, scablandsNaturalHeightAt, setScablandsGroundEdit} from '../world/scablands-ground.js';
import {SCABLANDS_PLACES} from '../world/scablands.js';
import {solidsNear} from '../world/scablands-solids.js';
import {ROAD_NET} from '../world/scablands-road.js';
import {RIVER_LAND} from '../world/scablands-regions.js';
import {createTrencherState, stepTrencher} from './trencher.js';
import {createDrillRigState, stepDrillRig} from './drill.js';
import {createRoadMachineState, createRoadWork, stepRoadMachine} from './roads.js';
import {machineControlInput} from '../input-contexts.js';

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
    sentence:place.id === 'tin-town' ? "That's Tin Town. Auntie Solder would have words." :
      `${place.name} is a story place. Dig around it.`})),
]);
const STEP = 1 / 60;

/** Use the machines' drive mapping for thrust and steering; arrows set the slope. */
export function borerYardControls(keys = {}, pad = null, mapping = null, mode = 'work') {
  const keyboard = machineControlInput(keys, null, 'drive');
  const drive = machineControlInput({}, pad, 'drive', mapping);
  const keyboardSlope = Number(!!keys.ArrowUp) - Number(!!keys.ArrowDown);
  const axis = mapping?.slope;
  const value = Number.isInteger(axis) && axis >= 0 ? -(pad?.axes?.[axis] || 0) : 0;
  return {forward:keyboard.forward || drive.forward, keyboardLever:!!keyboard.forward, padLever:mode === 'work' && !!pad, steer:keyboard.steer || drive.steer,
    slope:keyboardSlope || (Math.abs(value) < .12 ? 0 : Math.max(-1, Math.min(1, value)))};
}

/** Park on the open side of the first west scarp, facing its foot. */
export function createDigBorer(ground) {
  const {a, b} = SCARPS.find(scarp => scarp.id === 'scab-west').stretches[0];
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const dx = -(b.z - a.z) / length, dz = (b.x - a.x) / length;
  const x = (a.x + b.x) / 2 - 30 * dx, z = (a.z + b.z) / 2 - 30 * dz;
  return createBorerState({x, y:ground.heightAt(x,z), z, heading:Math.atan2(dx,dz)});
}

// A raised patch followed by a shallow ditch gives the blade material to carry.
// These are yard-only cells, separate from the town and from the ground save.
function yardRoadWork(ground) {
  const work = createRoadWork();
  for (let z = 12; z <= 19; z++) {
    const height = z < 16 ? 1 : -1;
    ground.setHeight(40, z, height);
    work.cells[`40:${z}`] = {height, spread:0, compaction:0, surface:0, roughness:0};
  }
  return work;
}

/** Frame edges stay queued until a simulation step consumes them. */
export function createPendingDigActions(){
  const pending=new Set();
  return Object.freeze({push(action){pending.add(action);},consume(action){if(!pending.has(action))return false;pending.delete(action);return true;}});
}

function newGround(seed) {
  return createGroundEdit({region:{id:'scablands',editable:true},seed,naturalHeight:scablandsNaturalHeightAt,
    reservedShapes:RESERVATIONS});
}

// Test a round bore against a turned footprint in the land's own coordinates.
function touchesFootprint(shape, footprint) {
  const dx = shape.x - footprint.x, dz = shape.z - footprint.z;
  const cos = Math.cos(footprint.heading || 0), sin = Math.sin(footprint.heading || 0);
  const x = dx * cos - dz * sin, z = dx * sin + dz * cos;
  return Math.hypot(Math.max(0, Math.abs(x) - footprint.halfX),
    Math.max(0, Math.abs(z) - footprint.halfZ)) <= shape.radius;
}

/** Protect the land's own structures, decks and public roads from the bore. */
export function borerLandRefusal(shape, ground, {near = solidsNear, net = ROAD_NET, crossings = RIVER_LAND.crossings} = {}) {
  const existing = ground.refusal(shape);
  if (existing) return existing;
  for (const solid of near(shape.x, shape.z, shape.x, shape.z, shape.radius))
    if (touchesFootprint(shape, solid)) return 'She will not cut there. Something stands in the way.';
  for (const crossing of crossings) {
    if (crossing.deckHalfWidth === undefined) continue;
    const hit = net.nearest(crossing.x, crossing.z);
    if (!hit) continue;
    const a = hit.road.points[hit.index], b = hit.road.points[hit.index + 1];
    const supports = near(crossing.x, crossing.z, crossing.x, crossing.z, crossing.deckHalfWidth + 2);
    const halfLength = Math.max(0, ...supports.filter(solid => solid.kind === 'girder').map(solid => solid.halfZ));
    const deck = {...crossing, halfX:crossing.deckHalfWidth, halfZ:halfLength,
      heading:Math.atan2(b.x - a.x, b.z - a.z)};
    if (touchesFootprint(shape, deck)) return 'She will not cut there. Something stands in the way.';
  }
  // The road index accepts points. Surround the bore with a circumscribed
  // octagon so its whole footprint, including its edge, is protected.
  if (net.nearest(shape.x, shape.z)) return 'She will not cut there. Something stands in the way.';
  const reach = shape.radius / Math.cos(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    if (net.nearest(shape.x + reach * Math.cos(angle), shape.z + reach * Math.sin(angle)))
      return 'She will not cut there. Something stands in the way.';
  }
  return null;
}

function roadGround(edit) {
  return {
    refusal(x,z) { return edit.refusal({x,z,radius:0.1}); },
    height(x,z) { return edit.heightAt(x,z) - scablandsNaturalHeightAt(x,z); },
    setHeight(x,z,height) {
      const shape = {x,z,radius:0.1};
      const target = scablandsNaturalHeightAt(x,z) + height;
      const before = edit.heightAt(x,z);
      const difference = target - before;
      if (difference > 0) edit.fill(shape, 'topsoil', difference * 1.25);
      else if (difference < 0) edit.cut(shape, target);
    },
  };
}

const suppliedGroundWork = new WeakMap();

/** Make the free yard simulation. This module has no DOM, renderer or career-save access. */
export function createDigSandbox({seed = 1, ground = null, playerId = 'player', protectLand = !ground} = {}) {
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
  const roadMemory = globalThis.__theDigRoadMemory ??= {};
  const priorRoad = ground ? suppliedGroundWork.get(edit) : roadMemory[playerId];
  const roadWork = priorRoad ?? (loaded ? createRoadWork() : yardRoadWork(roadGround(edit)));
  if (ground) suppliedGroundWork.set(edit, roadWork);
  else {
    roadMemory[playerId] = roadWork;
    memory[playerId] = edit.toSave();
  }
  return {ground:edit,protectLand,tunnels:createGroundTunnels([], {heightAt:(x,z)=>edit.heightAt(x,z)}),playerId,haul,borer:createDigBorer(edit),trencher:createTrencherState(YARD.trencher),
    drill:createDrillRigState(seed,{x:YARD.trencher.x+8,z:YARD.trencher.z}),
    roadWork, roadMachines:Object.fromEntries(['dozer','roller','paver'].map((kind,index)=>
      [kind,createRoadMachineState(kind,{x:40+index*6,z:10})])),activeMachine:'excavator',
    cameraIndex:0,mode:'work',fixedCarry:0,elapsed:0,events:[],lastMessage:'',dirty:false,
    excavatedM3:0,loadedM3:0,tippedM3:0};
}

/** Copy the current visit's tunnels into plain data, without writing a store. */
export function exportDigTunnels(sim) {
  return sim.tunnels.segments;
}

/** Rebuild the current visit's tunnels from plain data, without reading a store. */
export function importDigTunnels(sim, segments = []) {
  return {...sim, tunnels:createGroundTunnels(segments, {heightAt:(x,z)=>sim.ground.heightAt(x,z)})};
}

/** Leaving the yard hands the Scablands back with its own ground, so a later job is unchanged. */
export function closeDigSandbox() { resetScablandsGroundEdit(); }

export function switchDigMachine(sim) {
  const ids=['excavator','dumpTruck','trencher','drill','dozer','roller','paver','borer'];
  const activeMachine=ids[(ids.indexOf(sim.activeMachine)+1)%ids.length];
  return {...sim,activeMachine,mode:activeMachine==='excavator'?'work':'drive'};
}

export function cycleDigCamera(sim) { return {...sim,cameraIndex:(sim.cameraIndex+1)%(sim.activeMachine==='borer'?2:3)}; }

/** Apply one fixed simulation step. Actions and ground edits never run in rendering. */
function fixedStep(sim,input) {
  const events=[]; let next=sim;
  if(sim.activeMachine==='borer'){
    const controls=input.controls ?? {};
    if(sim.mode==='drive' && !sim.borer.started){
      const forward=Math.max(-1,Math.min(1,controls.forward || 0));
      const steer=Math.max(-1,Math.min(1,controls.steer || 0));
      const heading=sim.borer.heading-steer*0.25*STEP*Math.abs(forward);
      const x=sim.borer.x+Math.sin(heading)*forward*(4/3.6)*STEP;
      const z=sim.borer.z+Math.cos(heading)*forward*(4/3.6)*STEP;
      const refusal=sim.ground.refusal({x,z,radius:3});
      if(!refusal) next={...next,borer:{...sim.borer,x,z,heading,y:sim.ground.heightAt(x,z),headSpeed:0}};
      else next={...next,lastMessage:refusal};
    } else if (sim.mode === 'drive') {
      // Once inside the bore, cutting and tunnel travel belong to work mode.
      next={...next,borer:{...sim.borer,headSpeed:0}};
    } else {
      const oldLever=sim.borer.lever || 0;
      const input=Math.max(-1,Math.min(1,controls.forward || 0));
      const leverSource=controls.keyboardLever ? 'keyboard' : controls.padLever && Math.abs(input) > .12 ? 'pad' : sim.borer.leverSource;
      const direct=controls.directLever || (controls.padLever && leverSource === 'pad' && !controls.keyboardLever);
      const lever=direct ? Math.max(0,input) : Math.max(0,Math.min(1,oldLever + input * (input > 0 ? .25 : .5) * STEP));
      const thrust=input < 0 && oldLever <= 0 && lever <= 0 ? input : lever;
      const result=stepBorer({...sim.borer,lever,leverSource},{thrust,steer:controls.steer,slope:controls.slope,
        tunnels:sim.tunnels,tunnelsIncludeCurrent:sim.borer.started},
        sim.protectLand ? {...sim.ground, refusal:shape=>borerLandRefusal(shape,sim.ground)} : sim.ground,null,STEP);
      next={...next,borer:result.state,lastMessage:result.state.message || ''};
      events.push(...result.events);
      if(result.state.distanceM!==sim.borer.distanceM){
        next.tunnels=createGroundTunnels(result.state.segments,{heightAt:(x,z)=>sim.ground.heightAt(x,z)});
        next.dirty=true;
      }
    }
  } else if(sim.roadMachines[sim.activeMachine]){
    const result=stepRoadMachine(sim.roadMachines[sim.activeMachine],sim.roadWork,input.controls,STEP,roadGround(sim.ground));
    next={...next,roadWork:result.work,roadMachines:{...sim.roadMachines,[sim.activeMachine]:result.state}};
    events.push(...result.events);
  } else if(sim.activeMachine==='drill'){
    const result=stepDrillRig(sim.drill,input.controls,STEP);
    next={...next,drill:result.state}; events.push(...result.events);
  } else if(sim.activeMachine==='trencher'){
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
  if (next.roadWork !== sim.roadWork) {
    suppliedGroundWork.set(next.ground, next.roadWork);
    (globalThis.__theDigRoadMemory??={})[next.playerId]=next.roadWork;
    next.dirty=true;
  }
  if(next.dirty){(globalThis.__theDigGroundMemory??={})[next.playerId]=next.ground.toSave();next.dirty=false;}
  return next;
}

export function digSandboxMachineState(sim,id=sim.activeMachine) {
  return sim.roadMachines[id]?.machine??(id==='borer'?sim.borer:id==='trencher'?sim.trencher.machine:id==='drill'?sim.drill.machine:sim.haul.machines[id]);
}

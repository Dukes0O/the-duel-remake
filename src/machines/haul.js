import {machineDefinition} from './content/machines.js';
import {createMachineState, machineToolPosition, stepMachine} from './machine.js';
import {machineLoadVolume, operateMachineTool, transferMachineLoad} from './tools.js';

const finite = Number.isFinite;

/** Create one shared excavator and truck job on editable ground. */
export function createMachineHaul({ground, excavator = {x:0, z:0}, truck = {x:0, z:4.5}} = {}) {
  if (!ground || typeof ground.cut !== 'function' || typeof ground.fill !== 'function')
    throw new TypeError('A machine haul needs editable ground.');
  return {ground, activeMachine:'excavator', machines:{
    excavator:createMachineState(machineDefinition('excavator'), excavator),
    dumpTruck:createMachineState(machineDefinition('dumpTruck'), truck),
  }, completedLoads:0, spilledVolumeM3:0};
}

/** Switch between the two machines with one input edge. */
export function switchHaulMachine(haul) {
  if (!haul?.machines) throw new TypeError('A machine haul is required.');
  return {...haul, activeMachine:haul.activeMachine === 'excavator' ? 'dumpTruck' : 'excavator'};
}

/** Drive the selected machine or move its named work controls. */
export function stepMachineHaul(haul, controls = {}, dtSeconds = 0) {
  if (!haul?.machines || !finite(dtSeconds) || dtSeconds < 0)
    throw new TypeError('A machine haul and non-negative time are required.');
  const id = haul.activeMachine;
  const definition = machineDefinition(id === 'dumpTruck' ? 'dumpTruck' : 'excavator');
  const machine = stepMachine(definition, haul.machines[id], controls, dtSeconds);
  return {...haul, machines:{...haul.machines, [id]:machine}};
}

/** Dig, load the truck, or tip its bed into the same ground layer. */
export function operateMachineHaul(haul, {action, dtSeconds = 0, targetHeight = null, material = null,
  volumeM3 = null, shape = null} = {}) {
  if (!haul?.machines) throw new TypeError('A machine haul is required.');
  if (haul.activeMachine === 'excavator' && action === 'dig') {
    const definition = machineDefinition('excavator');
    const result = operateMachineTool(definition, haul.machines.excavator, {ground:haul.ground,
      toolId:'bucket', action, dtSeconds, targetHeight, shape});
    return {...haul, machines:{...haul.machines, excavator:result.state}, lastOperation:result};
  }
  if (haul.activeMachine === 'excavator' && action === 'load') {
    const excavator = haul.machines.excavator;
    const truck = haul.machines.dumpTruck;
    const definition = machineDefinition('excavator');
    const tip = machineToolPosition(definition, excavator, 'bucket');
    const dx=tip.x-truck.x,dz=tip.z-truck.z,c=Math.cos(truck.heading),s=Math.sin(truck.heading);
    const localX=dx*c-dz*s,localZ=dx*s+dz*c;
    const contents = {...excavator.load};
    const bed=machineDefinition('dumpTruck').tools.bed;
    if (Math.abs(localX)<=bed.widthM/2&&Math.abs(localZ)<=bed.lengthM/2) {
      const moved = transferMachineLoad(excavator, truck, machineLoadVolume(excavator),
        machineDefinition('dumpTruck').tools.bed.capacityM3);
      const spill = moved.spilledVolumeM3 > 0
        ? spillLoad(haul.ground, moved.sourceState.load, moved.spilledVolumeM3, tip) : {volumeM3:0, remainingLoad:moved.sourceState.load};
      const sourceState = {...moved.sourceState, load:spill.remainingLoad};
      return {...haul, machines:{...haul.machines, excavator:sourceState, dumpTruck:moved.targetState},
        completedLoads:haul.completedLoads + Number(moved.movedVolumeM3 > 0),
        spilledVolumeM3:haul.spilledVolumeM3 + spill.volumeM3,
        lastOperation:{...moved, spilledVolumeM3:spill.volumeM3,message:moved.movedVolumeM3>0?'The bucket is in the truck bed. The dirt is loaded.':'The truck bed is full.'}};
    }
    const spill = spillLoad(haul.ground, contents, machineLoadVolume(excavator), tip);
    return {...haul, machines:{...haul.machines, excavator:{...excavator, load:spill.remainingLoad}},
      spilledVolumeM3:haul.spilledVolumeM3 + spill.volumeM3,
      lastOperation:{movedVolumeM3:0, spilledVolumeM3:spill.volumeM3, missed:true,message:'The bucket missed the truck. The dirt spilled on the ground.'}};
  }
  if (haul.activeMachine === 'dumpTruck' && action === 'tip') {
    const truck = haul.machines.dumpTruck;
    const result = operateMachineTool(machineDefinition('dumpTruck'), truck, {ground:haul.ground,
      toolId:'bed', action, dtSeconds, material, volumeM3, shape});
    return {...haul, machines:{...haul.machines, dumpTruck:result.state}, lastOperation:result};
  }
  throw new RangeError(`Unsupported machine haul action: ${action}`);
}

function spillLoad(ground, load, volumeM3, position) {
  const total = machineLoadVolume({load});
  if (total <= 0) return {volumeM3:0, remainingLoad:{}};
  let spilled = 0;
  const remainingLoad = {};
  for (const [kind, volume] of Object.entries(load)) {
    if (volume <= 0) continue;
    const amount = Math.min(volume, Math.max(0, volumeM3 - spilled));
    const result = amount > 0 ? ground.fill({x:position.x, z:position.z, radius:0.8}, kind, amount) : null;
    const placed = result?.ok ? result.looseVolume : 0;
    spilled += placed;
    const left = volume - placed;
    if (left > 1e-12) remainingLoad[kind] = left;
  }
  return {volumeM3:spilled, remainingLoad};
}

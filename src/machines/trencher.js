import {createMachineState, stepMachine} from './machine.js';
import {machineDefinition} from './content/machines.js';

const MACHINE = machineDefinition('trencher');
const finite = Number.isFinite;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const MATERIAL_SPEED = Object.freeze({topsoil:1, clay:0.85, gravel:0.65, rock:0.35});
const WORK_STEP_M = 1;

export const TRENCHER_LIMITS = Object.freeze({widthM:1, depthM:1.5, maxSpeedMps:0.8, workStepM:WORK_STEP_M});

export function createTrencherState({x = 0, z = 0, heading = 0} = {}) {
  return {machine:createMachineState(MACHINE, {x, z, heading}), chainDown:false, distanceCarryM:0,
    speedFactor:1, cutVolumeM3:0, ridgeLooseVolumeM3:0};
}

function digAt(ground, x, z, heading) {
  const tool = MACHINE.tools.chain;
  const shape = {x, z, radius:tool.radiusM};
  const targetHeight = ground.heightAt(x, z) - tool.depthM;
  const cut = ground.cut(shape, targetHeight);
  let ridgeLooseVolumeM3 = 0;
  for (const [material, compactedM3] of Object.entries(cut.volumes)) {
    const looseM3 = compactedM3 * 1.25;
    if (looseM3 <= 0) continue;
    const sides = [1, -1].map(side => ground.fill({
      x:x + Math.cos(heading) * tool.ridgeOffsetM * side,
      z:z - Math.sin(heading) * tool.ridgeOffsetM * side,
      radius:tool.ridgeRadiusM,
    }, material, looseM3));
    const deposited = sides.find(result => result.ok);
    if (deposited) { ridgeLooseVolumeM3 += deposited.looseVolume; continue; }
    // The cut is reversible inside the same editable area. Put material back
    // at the trench before reporting that both ridge sides are blocked.
    ground.fill(shape, material, looseM3);
    return {cut:{...cut,ok:false,reason:'Both sides are blocked, so the trencher stopped without removing soil.'},ridgeLooseVolumeM3};
  }
  return {cut, ridgeLooseVolumeM3};
}

/** Advance the free-dig mode. Ground edits are authoritative; plume events are visual only. */
export function stepTrencher(state, controls = {}, dtSeconds = 0, ground) {
  if (!state?.machine || !finite(dtSeconds) || dtSeconds < 0 || !ground || typeof ground.cut !== 'function' ||
      typeof ground.fill !== 'function' || typeof ground.heightAt !== 'function')
    throw new TypeError('Trencher steps need a machine state, elapsed time and editable ground.');
  const chainDown = controls.chainDown === true || finite(controls.chain) && controls.chain > 0.5;
  const definition = state.speedFactor === 1 ? MACHINE : {...MACHINE, maxSpeedMps:MACHINE.maxSpeedMps * state.speedFactor};
  const before = state.machine;
  const machine = stepMachine(definition, before, controls, dtSeconds);
  const distance = Math.hypot(machine.x - before.x, machine.z - before.z);
  let distanceCarryM = state.distanceCarryM ?? 0;
  let cutVolumeM3 = 0, ridgeLooseVolumeM3 = 0, hardestSpeed = 1;
  const events = [];

  if (chainDown && distance > 0) {
    const steps = Math.floor((distanceCarryM + distance) / WORK_STEP_M);
    for (let index = 0; index < steps; index++) {
      const along = (WORK_STEP_M - distanceCarryM) + index * WORK_STEP_M;
      const fraction = clamp(along / distance, 0, 1);
      const x = before.x + (machine.x - before.x) * fraction;
      const z = before.z + (machine.z - before.z) * fraction;
      const {cut, ridgeLooseVolumeM3:ridgeLoose} = digAt(ground, x, z, machine.heading);
      if (!cut.ok) {
        events.push({type:'cut-refused', x, z, reason:cut.reason});
        distanceCarryM = 0;
        break;
      }
      cutVolumeM3 += cut.volume;
      ridgeLooseVolumeM3 += ridgeLoose;
      const materialTotal = Object.values(cut.volumes).reduce((sum, volume) => sum + volume, 0);
      if (materialTotal > 0) {
        const speed = Object.entries(cut.volumes).reduce((sum, [material, volume]) =>
          sum + volume * (MATERIAL_SPEED[material] ?? 0.7), 0) / materialTotal;
        hardestSpeed = Math.min(hardestSpeed, speed);
        events.push({type:'dirt-plume', x, z, volumeM3:cut.looseVolume, materials:{...cut.volumes}});
      }
    }
    distanceCarryM = (distanceCarryM + distance) % WORK_STEP_M;
  } else if (!chainDown) {
    distanceCarryM = 0;
  }

  return {state:{...state, machine, chainDown, distanceCarryM,
    speedFactor:chainDown ? Math.min(state.speedFactor ?? 1, hardestSpeed) : 1,
    cutVolumeM3:(state.cutVolumeM3 ?? 0) + cutVolumeM3,
    ridgeLooseVolumeM3:(state.ridgeLooseVolumeM3 ?? 0) + ridgeLooseVolumeM3},
  events, cutVolumeM3, ridgeLooseVolumeM3};
}

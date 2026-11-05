import {forwardKinematics} from './kinematics.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = Number.isFinite;
const control = (controls, name) => clamp(finite(controls?.[name]) ? controls[name] : 0, -1, 1);
const loadMass = load => Object.entries(load ?? {}).reduce((sum, [material, volume]) => sum + volume * ({topsoil:1_300,clay:1_700,gravel:1_850,rock:2_400}[material] ?? 1_600), 0);

export function createMachineState(definition, {x = 0, z = 0, heading = 0} = {}) {
  if (!definition || !finite(x) || !finite(z) || !finite(heading)) throw new TypeError('A machine and finite start position are required.');
  return {x, z, heading, speedMps:0, timeSeconds:0,
    jointAngles:Object.fromEntries((definition.joints ?? []).map(joint => [joint.name, 0])),
    load:{}, toolVolumes:{}};
}

/** Advance one machine by elapsed seconds. Constant controls follow an exact arc. */
export function stepMachine(definition, state, controls = {}, dtSeconds = 0) {
  if (!definition || !state || !finite(dtSeconds) || dtSeconds < 0) throw new TypeError('A machine state and non-negative elapsed seconds are required.');
  const maxLoad = definition.maxLoadKg || 1;
  const carriedKg = loadMass(state.load);
  const loadFactor = Math.max(0.35, 1 - 0.25 * Math.min(1, carriedKg / maxLoad));
  let speed = 0, turnRate = 0;
  if (definition.driveKind === 'tracks') {
    const forward = control(controls, 'forward'), steer = control(controls, 'steer');
    const left = finite(controls.leftTrack) ? control(controls, 'leftTrack') : clamp(forward - steer, -1, 1);
    const right = finite(controls.rightTrack) ? control(controls, 'rightTrack') : clamp(forward + steer, -1, 1);
    const leftSpeed = left * definition.maxSpeedMps * loadFactor;
    const rightSpeed = right * definition.maxSpeedMps * loadFactor;
    speed = (leftSpeed + rightSpeed) / 2;
    turnRate = (rightSpeed - leftSpeed) / (definition.trackWidthM ?? 2);
  } else if (definition.driveKind === 'wheels') {
    speed = control(controls, 'forward') * definition.maxSpeedMps * loadFactor;
    turnRate = control(controls, 'steer') * (definition.turnRateRadPerSecond ?? 0.7);
  }
  const deltaHeading = turnRate * dtSeconds;
  let x = state.x, z = state.z;
  if (Math.abs(turnRate) < 1e-9) {
    x += Math.sin(state.heading) * speed * dtSeconds;
    z += Math.cos(state.heading) * speed * dtSeconds;
  } else {
    const nextHeading = state.heading + deltaHeading;
    const radius = speed / turnRate;
    x += radius * (Math.cos(state.heading) - Math.cos(nextHeading));
    z += radius * (Math.sin(nextHeading) - Math.sin(state.heading));
  }
  const jointAngles = {...state.jointAngles};
  for (const joint of definition.joints ?? []) {
    const input = control(controls, joint.control ?? joint.name);
    jointAngles[joint.name] = clamp((jointAngles[joint.name] ?? 0) + input * joint.rate * dtSeconds, joint.limits[0], joint.limits[1]);
  }
  return {...state, x, z, heading:state.heading + deltaHeading, speedMps:speed,
    timeSeconds:state.timeSeconds + dtSeconds, jointAngles};
}

export function machineToolPosition(definition, state, toolId) {
  const tool = definition.tools?.[toolId];
  if (!tool) throw new RangeError(`Unknown tool: ${toolId}`);
  const solved = forwardKinematics(definition.joints ?? [], state.jointAngles, tool);
  const [localX, y, localZ] = solved.toolPosition;
  const c = Math.cos(state.heading), s = Math.sin(state.heading);
  return {x:state.x + localX*c + localZ*s, y, z:state.z + localZ*c - localX*s};
}

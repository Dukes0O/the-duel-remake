const SAMPLE_PERIOD_SECONDS = 0.1;
const MAX_SAMPLES = 2_400;
const clamp = value => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));

export function createMachineDemo({machineId, target = null, toleranceM = 1, maxSamples = MAX_SAMPLES} = {}) {
  if (typeof machineId !== 'string' || !Number.isFinite(toleranceM) || toleranceM <= 0 ||
      !Number.isInteger(maxSamples) || maxSamples < 1) throw new TypeError('A machine id, positive tolerance and sample cap are required.');
  return {version:1, machineId, target, toleranceM, maxSamples, samples:[], elapsedSeconds:0,
    nextSampleSeconds:0, distanceM:0, workVolumeM3:0, spilledVolumeM3:0, previousPosition:null, closed:false};
}

/** Record a compact driving and joint trace at 10 Hz, independent of render rate. */
export function recordMachineDemo(demo, {state, drive = {}, dtSeconds, movedVolumeM3 = 0, spilledVolumeM3 = 0} = {}) {
  if (!demo || demo.closed || !state || !Number.isFinite(dtSeconds) || dtSeconds < 0 ||
      !Number.isFinite(movedVolumeM3) || movedVolumeM3 < 0 || !Number.isFinite(spilledVolumeM3) || spilledVolumeM3 < 0)
    throw new TypeError('An open machine demo needs state and finite elapsed and work values.');
  const previous = demo.previousPosition;
  const distance = Number.isFinite(state.speedMps) ? Math.abs(state.speedMps) * dtSeconds :
    previous ? Math.hypot(state.x - previous.x, state.z - previous.z) : 0;
  demo.distanceM += distance;
  demo.elapsedSeconds += dtSeconds;
  demo.workVolumeM3 += movedVolumeM3;
  demo.spilledVolumeM3 += spilledVolumeM3;
  demo.previousPosition = {x:state.x, z:state.z};
  if (demo.samples.length < Math.min(demo.maxSamples, MAX_SAMPLES) && demo.nextSampleSeconds <= demo.elapsedSeconds + 1e-9) {
    demo.samples.push({timeSeconds:demo.elapsedSeconds, x:state.x, z:state.z, heading:state.heading,
      jointAngles:{...state.jointAngles}, drive:{forward:clamp(drive.forward), steer:clamp(drive.steer)}});
    demo.nextSampleSeconds = demo.elapsedSeconds + SAMPLE_PERIOD_SECONDS;
  }
  return demo;
}

export function finishMachineDemo(demo, {target = demo?.target, spilledVolumeM3 = demo?.spilledVolumeM3} = {}) {
  if (!demo || demo.closed) throw new TypeError('An open machine demo is required.');
  const last = demo.samples.at(-1) ?? {x:0,z:0};
  const targetErrorM = target && Number.isFinite(target.x) && Number.isFinite(target.z)
    ? Math.hypot(target.x - last.x, target.z - last.z) : 0;
  const spill = Number.isFinite(spilledVolumeM3) && spilledVolumeM3 >= 0 ? spilledVolumeM3 : demo.spilledVolumeM3;
  const result = {version:1, machineId:demo.machineId, samples:demo.samples.map(sample => ({...sample,
    jointAngles:{...sample.jointAngles}, drive:{...sample.drive}})), metrics:{
      durationSeconds:demo.elapsedSeconds, averageSpeedMps:demo.elapsedSeconds ? demo.distanceM / demo.elapsedSeconds : 0,
      targetErrorM, accuracy:Math.max(0, 1 - targetErrorM / demo.toleranceM),
      workVolumeM3:demo.workVolumeM3, spilledVolumeM3:spill,
      spillFraction:demo.workVolumeM3 + spill ? spill / (demo.workVolumeM3 + spill) : 0,
    }};
  demo.closed = true;
  return result;
}

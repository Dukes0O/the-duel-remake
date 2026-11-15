import {wrapHeading} from '../src/offroad-physics.js';

// Drive from the job's real starting position to Cinder and wait for the pot.
// This is the shared opening for the six Medium proof drives.
export function driveToCinder(duel, cinder, maxTicks = 1800) {
  const state = duel.state, world = state.arena.worldJob;
  let distance = Infinity, ticks = 0;
  for (; ticks < maxTicks && !world.job.stepState.loaded; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    distance = Math.hypot(car.x - cinder.x, car.z - cinder.z);
    const turn = wrapHeading(Math.atan2(cinder.x - car.x, cinder.z - car.z) - (car.heading + state.headingError));
    duel.setInput({throttle:distance > 6 && Math.abs(state.speedMph) < 8 ? 0.5 : 0,
      brake:distance <= 6 || Math.abs(state.speedMph) > 10 ? 1 : 0,
      steer:Math.max(-1, Math.min(1, -turn * 2))});
    duel.step(1 / 60);
  }
  return {distance, ticks, loaded:world.job.stepState.loaded === true};
}

// Leave along the gate's centre line after picking up the pot.
export function driveThroughYardGate(duel, gate, maxTicks = 1800) {
  const state = duel.state;
  const forward = {x:Math.sin(gate.bearing), z:Math.cos(gate.bearing)};
  const target = {x:gate.x + forward.x * 45, z:gate.z + forward.z * 45};
  let along = -Infinity, gateOffset = null, ticks = 0;
  for (; ticks < maxTicks && along < 20; ticks++) {
    const car = duel.course.worldAt(state.s, state.lateral);
    along = (car.x - gate.x) * forward.x + (car.z - gate.z) * forward.z;
    if (along >= 0 && gateOffset === null) {
      gateOffset = (car.x - gate.x) * forward.z - (car.z - gate.z) * forward.x;
    }
    const turn = wrapHeading(Math.atan2(target.x - car.x, target.z - car.z) - (car.heading + state.headingError));
    duel.setInput({throttle:Math.abs(state.speedMph) < 12 ? 0.55 : 0,
      brake:Math.abs(state.speedMph) > 14 ? 1 : 0,
      steer:Math.max(-1, Math.min(1, -turn * 2))});
    duel.step(1 / 60);
  }
  return {along, gateOffset, ticks};
}

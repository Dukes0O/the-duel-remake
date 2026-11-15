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

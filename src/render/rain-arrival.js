// FAR-RAIN: the rain's own clock. It says how far the rain has come, part by part, from the single drop on the glass to
// full rain, and how wet the ground still is after it stops. View only, and runnable without graphics.
import {RAIN_LOOK} from './rain-look.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const share = (t, from, to) => clamp((t - from) / Math.max(1e-6, to - from));
const eased = value => value * value * (3 - 2 * value);

export function createRainArrival(look = RAIN_LOOK.arrival) {
  let elapsed = 0, wet = 0, puddles = 0, falling = 0, started = false;
  const levels = {elapsed: 0, raining: false, sheltered: false, drops: 0, fall: 0, grey: 0, wet: 0, puddles: 0, sound: 0};
  const ramp = (from, to) => Math.pow(share(elapsed, from, to), look.rampPower);
  return {
    levels,
    // `raining`: the place wants rain. `sheltered`: the player is under cover there (a tunnel).
    step(dt, {raining = false, sheltered = false} = {}) {
      dt = Number.isFinite(dt) && dt > 0 ? dt : 0;
      const falls = raining && !sheltered;
      if (raining) { elapsed += sheltered ? 0 : dt; started = true; }
      else elapsed = Math.max(0, elapsed - dt * look.resumeShare);
      if (!raining && elapsed === 0) started = false;
      falling = clamp(falling + (falls ? dt : -dt) / look.stopSeconds);
      // The ground follows the rain up, and dries slowly after it.
      const wetNow = eased(share(elapsed, look.wetFrom, look.wetFullAt));
      const puddlesNow = eased(share(elapsed, look.puddlesFrom, look.puddlesFullAt));
      const drying = dt / look.dryingSeconds;
      wet = raining ? Math.max(wetNow, wet - drying) : Math.max(0, wet - drying);
      puddles = raining ? Math.max(puddlesNow, puddles - drying) : Math.max(0, puddles - drying * 1.6);
      levels.elapsed = elapsed;
      levels.raining = raining;
      levels.sheltered = sheltered;
      levels.drops = falls ? ramp(look.secondDropAt, look.dropsFullAt) : 0;
      levels.fall = falling * ramp(look.fallFrom, look.fallFullAt);
      levels.grey = eased(share(elapsed, look.greyFrom, look.greyFullAt));
      levels.wet = wet;
      levels.puddles = puddles;
      levels.sound = falling * eased(share(elapsed, look.soundFrom, look.soundFullAt));
      return levels;
    },
    // The single drop is due between `before` and `after` on the rain's own clock.
    firstDropBetween(before, after) {
      return before < look.firstDropAt && after >= look.firstDropAt;
    },
    get started() { return started; },
    reset() { elapsed = wet = puddles = falling = 0; started = false; Object.assign(levels, {elapsed: 0, raining: false, drops: 0, fall: 0, grey: 0, wet: 0, puddles: 0, sound: 0}); },
  };
}

// The guide's run (docs/HELI_SKIING.md section 5): the game skiing a run's
// planned line, like the driving instructor. It sets the medal times and
// gives the ghost. Pure and repeatable, like the skier it drives.
//
// How: a pure-pursuit driver skis the line with the real skier physics as
// fast as the line allows (tucked where it is straight, standing and
// carving where it bends, never skidding, skating off the flat). That is the
// best run. The guide skis the same line at 92% of that pace, so every
// sample of the best run comes 1 / 0.92 times later and the speed is 92% of
// it. The guide's time is the best time divided by 0.92.
import {SKI_STEP, createSkier, stepSkier} from './ski-physics.js';

export const GUIDE = Object.freeze({
  pace: 0.92,
  lookAheadMin: 3,
  lookAheadMax: 8,
  lookAheadPerSpeed: 0.1,
  turnFullAt: 25 * Math.PI / 180,
  tuckBelow: 5 * Math.PI / 180,
  sampleEvery: 12,
  maxSeconds: 600,
  finishWithin: 1,
});

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

function measure(line) {
  const cumulative = [0];
  for (let i = 1; i < line.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].z - line[i - 1].z));
  return cumulative;
}

// The point `distance` along the line, clamped to its ends.
function pointAt(line, cumulative, distance) {
  const d = clamp(distance, 0, cumulative[cumulative.length - 1]);
  let i = 1;
  while (i < cumulative.length - 1 && cumulative[i] < d) i++;
  const span = cumulative[i] - cumulative[i - 1] || 1;
  const k = (d - cumulative[i - 1]) / span;
  return {x: line[i - 1].x + (line[i].x - line[i - 1].x) * k, z: line[i - 1].z + (line[i].z - line[i - 1].z) * k};
}

// How far along the line the skier is (searching forward from `from`) and
// how far to the side of it.
function project(line, cumulative, from, x, z) {
  let best = {distance: from, side: Infinity};
  for (let i = 1; i < line.length; i++) {
    if (cumulative[i] < from - 1) continue;
    if (cumulative[i - 1] > from + 80) break;
    const ax = line[i - 1].x, az = line[i - 1].z, bx = line[i].x, bz = line[i].z;
    const span = cumulative[i] - cumulative[i - 1] || 1;
    const k = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (span * span), 0, 1);
    const side = Math.hypot(x - (ax + (bx - ax) * k), z - (az + (bz - az) * k));
    if (side < best.side) best = {distance: Math.max(from, cumulative[i - 1] + k * span), side};
  }
  return best;
}

// line: the planned points [{x, z}] from the drop to the finish; world: as
// for the skier; sampleEvery is the ghost's step in fixed steps (12 is 10 a
// second); lookAhead replaces {lookAheadMin, lookAheadMax, lookAheadPerSpeed}
// for a line that needs another reach (the moguls). Returns {time, bestTime, pace, length, maxSide, ghost,
// landings, tumbles}: ghost samples {t, x, y, z, heading, speed} run at 10 per
// second; landings are the skiLand events of the best run (every jump it
// took) and tumbles how many of them were not safe.
export function guideRun({line, world, wax = null, sampleEvery = GUIDE.sampleEvery, lookAhead = GUIDE}) {
  if (!Array.isArray(line) || line.length < 2) throw new Error('A guide run needs a line of at least two points');
  const cumulative = measure(line), length = cumulative[cumulative.length - 1];
  const first = line[0], next = line[1];
  const skier = createSkier({x: first.x, z: first.z, heading: Math.atan2(next.x - first.x, next.z - first.z), world, wax});
  const best = [];
  let progress = 0, maxSide = 0, steps = 0;
  const landings = [];
  const maxSteps = GUIDE.maxSeconds / SKI_STEP;
  const sample = () => best.push({t: steps * SKI_STEP, x: skier.x, y: skier.y, z: skier.z, heading: skier.heading, speed: skier.speed});
  sample();
  while (progress < length - GUIDE.finishWithin) {
    if (steps++ > maxSteps) throw new Error('The guide did not finish the line');
    const here = project(line, cumulative, progress, skier.x, skier.z);
    progress = here.distance; maxSide = Math.max(maxSide, here.side);
    const ahead = pointAt(line, cumulative, progress + clamp(lookAhead.lookAheadMin + lookAhead.lookAheadPerSpeed * skier.speed, lookAhead.lookAheadMin, lookAhead.lookAheadMax));
    const error = wrap(Math.atan2(ahead.x - skier.x, ahead.z - skier.z) - skier.heading);
    // In the air a turn key would spin the skier, so the guide holds still there.
    const turn = skier.grounded ? clamp(-error / GUIDE.turnFullAt, -1, 1) : 0;
    for (const event of stepSkier(skier, {turn, tuck: Math.abs(error) < GUIDE.tuckBelow, skate: true}, world)) {
      if (event.type === 'skiLand') landings.push(event);
    }
    if (steps % sampleEvery === 0) sample();
  }
  sample();
  const bestTime = steps * SKI_STEP;
  const ghost = best.map(point => ({...point, t: point.t / GUIDE.pace, speed: point.speed * GUIDE.pace}));
  return {time: bestTime / GUIDE.pace, bestTime, pace: GUIDE.pace, length, maxSide, ghost, landings,
    tumbles: landings.filter(landing => !landing.safe).length};
}

// Where the guide is `t` seconds into its run (held at the end after it).
export function ghostAt(guide, t) {
  const ghost = guide.ghost;
  if (t <= ghost[0].t) return {...ghost[0]};
  const last = ghost[ghost.length - 1];
  if (t >= last.t) return {...last};
  let lo = 0, hi = ghost.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ghost[mid].t <= t) lo = mid; else hi = mid; }
  const a = ghost[lo], b = ghost[hi], k = (t - a.t) / (b.t - a.t);
  const mix = key => a[key] + (b[key] - a[key]) * k;
  return {t, x: mix('x'), y: mix('y'), z: mix('z'), heading: a.heading + wrap(b.heading - a.heading) * k, speed: mix('speed')};
}

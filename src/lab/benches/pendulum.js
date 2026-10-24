// Pendulums (docs/LAB.md 4.1): weights on strings of 5, 15 and 25 m timed with a stopwatch. A string is
// 2 pi root(L/g). The cable bench hangs the load on the game's own cable (heli-cable.js stepCable) from
// a hook that does not move, releases it a few degrees aside and times the swing the game really makes.
import {GRAVITY, HELI_STEP} from '../../heli/heli-flight.js';
import {createLoad, stepCable} from '../../heli/heli-cable.js';
import {control, choice, makeBench} from './bench-core.js';

const RELEASE_DEGREES = 5;
const controls = [
  choice('kind', 'Hanging from', ['string', 'cable'], 'string'),
  choice('lengthM', 'Length', [5, 15, 25], 5),
  // 10 kg up: the game's cable is very stiff, and a lighter load than its lightest (the 50 kg bucket) is not a case it models.
  control('weightKg', 'Weight', 'kg', 10, 1500, 10, 20),
];

export const stringPeriod = lengthM => 2 * Math.PI * Math.sqrt(lengthM / GRAVITY);

// The swing of a car on the game's cable: seconds between two upward crossings of straight down.
export function cablePeriod(lengthM, weightKg, {seconds = 120} = {}) {
  const heli = {x: 0, y: 100, z: 0, vx: 0, vy: 0, vz: 0};
  const load = createLoad({id: 'bench', massKg: weightKg});
  const start = RELEASE_DEGREES * Math.PI / 180;
  Object.assign(load, {hooked: true, onGround: false, settled: false, lineLength: lengthM,
    x: lengthM * Math.sin(start), y: heli.y - lengthM * Math.cos(start), z: 0, vx: 0, vy: 0, vz: 0});
  const crossings = [];
  let before = load.x;
  for (let t = 0; t < seconds; t += HELI_STEP) {
    stepCable(load, heli, {}, HELI_STEP);
    if (before < 0 && load.x >= 0) crossings.push(t);
    before = load.x;
    if (crossings.length === 3) break;
  }
  return crossings.length >= 2 ? crossings[1] - crossings[0] : null;
}

export const pendulumBench = makeBench({
  id: 'pendulum', controls, cues: ['lab.tick'],
  run({kind, lengthM, weightKg}) {
    // The cable is 15 m or 25 m; the 5 m string has no cable.
    const length = kind === 'cable' && lengthM === 5 ? 15 : lengthM;
    const periodS = kind === 'cable' ? cablePeriod(length, weightKg) : stringPeriod(length);
    return {kind, lengthM: length, weightKg, periodS, formulaS: stringPeriod(length)};
  },
  // The goal: the player has timed three different lengths (5, 15 and 25 m), and two weights on one length.
  goalMet(history) {
    const lengths = new Set(history.map(({result}) => result.lengthM));
    const weightsAt = new Map();
    for (const {result} of history) { const key = `${result.kind}${result.lengthM}`; weightsAt.set(key, new Set([...(weightsAt.get(key) ?? []), result.weightKg])); }
    return lengths.size >= 3 && [...weightsAt.values()].some(weights => weights.size >= 2);
  },
  facts: () => ({stringPeriodsS: [5, 15, 25].map(stringPeriod), cablePeriodsS: [15, 25].map(length => cablePeriod(length, 1250))}),
});

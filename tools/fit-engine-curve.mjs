// Fits the one scale per car for ENGINE-CURVE (src/engine-curve.js): the automatic box on flat asphalt, full throttle,
// gives today's 0 to 60 and 0 to 100 mph within 2%. Run: node tools/fit-engine-curve.mjs [--write]
// Prints the table for ENGINE_SCALE; with --write it rewrites that table in src/engine-curve.js.
import {readFileSync, writeFileSync} from 'node:fs';
import {CARS} from '../src/config.js';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {trialEngineFit, ENGINE_CURVE} from '../src/engine-curve.js';

const DT = 1 / 120;
const def = {id: 'test-engine-curve', name: 'Test only', kind: 'circuit', closed: true,
  airborne: false, theme: 'alpine', noTraffic: true, hasRival: false, hasRadar: false,
  script: [['straight', 6000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100],
    ['straight', 6000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100]]};

// A full-throttle run: the seconds to reach each speed in `marks` (mph), the box automatic, the switch on or off.
export function launchTimes(car, marks, {engineCurve = false, fit = null, difficulty = 'casual', start = 0, shiftAt = null} = {}) {
  const flags = createFeatureFlags({storage: null, overrides: {'engine-curve': engineCurve}});
  const duel = new Duel({seed: 1989, car, featureFlags: flags});
  duel.startCampaign({car, opponentCount: 0, difficulty});
  duel.course = new Course(def);
  Object.assign(duel.state, {status: 'racing', s: 300, prevS: 300, lateral: 0, countdown: 0, traffic: [], speedMph: start, gear: 0});
  if (engineCurve) duel.state.engineCurve = true; else delete duel.state.engineCurve;
  duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
  if (fit !== null) trialEngineFit(car, fit);
  const out = new Map();
  let steps = 0;
  while (out.size < marks.length && steps < 120 * 60) {
    if (shiftAt !== null && duel.state.revs >= shiftAt && duel.state.gear < duel.car.gears.length - 1) duel.setInput({shiftUp: true});
    duel._drive(DT); steps++;
    for (const mark of marks) if (!out.has(mark) && duel.state.speedMph >= mark) out.set(mark, steps * DT);
  }
  trialEngineFit(car, null);
  return marks.map(mark => out.get(mark) ?? Infinity);
}

const WITHIN = .012;   // a car keeps the shared multiplication power when one scale lands every mark this close
// The marks a car is fitted on: 0 to 60 and 0 to 100 (the card's two), then 140 and 170 mph and the top of its range, so a
// lap (corner exits to near top speed) follows too.
const marksFor = id => [60, 100, 140, 170, 190].filter(mark => mark < CARS[id].topSpeed * (CARS[id].factoryMaxed ? 1.105 : 1) * .93);
const worst = (id, marks, base, fit) => Math.max(...launchTimes(id, marks, {engineCurve: true, fit}).map((t, i) => Math.abs(t / base[i] - 1)));

// Golden-section search on [low, high] for the minimum of f.
function golden(f, low, high, iterations = 22) {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = low, b = high, c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
  for (let i = 0; i < iterations; i++) {
    if (fc < fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
  }
  return (a + b) / 2;
}

if (process.argv[1] && process.argv[1].endsWith('fit-engine-curve.mjs')) {
  const table = {};
  for (const id of Object.keys(CARS)) {
    const marks = marksFor(id), base = launchTimes(id, marks);
    let power = ENGINE_CURVE.multiplicationPower, scale = golden(k => worst(id, marks, base, {scale: k, power}), .05, 2);
    if (worst(id, marks, base, {scale, power}) > WITHIN) {
      // This car's gearbox needs its own power: the best power, the scale refitted for each.
      power = golden(p => worst(id, marks, base, {scale: golden(k => worst(id, marks, base, {scale: k, power: p}), .05, 2, 14), power: p}), .05, 1.6, 14);
      scale = golden(k => worst(id, marks, base, {scale: k, power}), .05, 2);
    }
    scale = Math.round(scale * 1000) / 1000; power = Math.round(power * 1000) / 1000;
    const errs = launchTimes(id, marks, {engineCurve: true, fit: {scale, power}}).map((t, i) => t / base[i] - 1);
    table[id] = power === ENGINE_CURVE.multiplicationPower ? {scale} : {scale, power};
    console.log(id.padEnd(18), 'scale', scale, 'power', power, marks.map((m, i) => `${m}:${(errs[i] * 100).toFixed(1)}%`).join(' '));
  }
  const text = 'export const ENGINE_FIT = Object.freeze({\n' + Object.entries(table).map(([id, fit]) =>
    `  ${id}: Object.freeze({${Object.entries(fit).map(([key, value]) => `${key}: ${value}`).join(', ')}}),`).join('\n') + '\n});';
  console.log(text);
  if (process.argv.includes('--write')) {
    const path = new URL('../src/engine-curve.js', import.meta.url);
    writeFileSync(path, readFileSync(path, 'utf8').replace(/export const ENGINE_FIT = Object\.freeze\(\{[\s\S]*?\}\);/, text));
    console.log('written to src/engine-curve.js');
  }
}

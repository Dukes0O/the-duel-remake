// Engines that pull like real ones (docs/DRIVING_LESSONS.md 12.5, ENGINE-CURVE), behind the dev switch
// `engine-curve`, latched per race like `tyre-slip`. Pure: no clock, no randomness, no race state.
//
// Today a gear only caps speed: the pull is the same in every gear and falls off above half revs. Here the pull at the
// wheels is the engine's pull at those revs times the gear's multiplication, so a gear held too high is weak and a
// gear changed up too early pulls less than the next gear would at the red line.
//
//   pull (mph a second) = min(A0, K x A0 x m x share(revs))
//
// A0 is today's launch pull for the car (accel x launch scale): the tyres, not the engine, limit a launch (FIX-LAUNCH),
// so no gear ever pulls harder than today. m is the gear's multiplication, the top gear's top speed over this gear's.
// K is one scale per car, fitted by `tools/fit-engine-curve.mjs` so that the automatic box gives today's 0 to 60 and
// 0 to 100 mph. share(revs) is the engine's pull against revs, a fraction of its best.

export const ENGINE_CURVE = Object.freeze({
  idleShare: .35,        // at no revs
  lowRevs: .30,          // under this, under lowShare of the best
  lowShare: .55,         // ... reached at lowRevs
  bestFrom: .70, bestTo: .80, // the engine pulls its best between these
  redShare: .88,         // at the red line (100% revs); the limiter cuts the throttle past it (the gear ceiling)
  multiplicationPower: 0.31, // how strongly the gear's multiplication counts (1 = the plain ratio); a car's own fit may differ
  riseBend: 2,         // >1 keeps the engine weak a little longer before it climbs to its best
  launchRevs: .75,       // first gear from a standing start: the clutch slips, so the engine never drops under this share of revs
  autoUp: .96,           // the automatic box changes up above this share of revs, as today
  autoDown: .55,         // ... and down below this
  autoDownMaxRevs: .90,  // ... but never into a gear whose revs would then pass this
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = u => u * u * (3 - 2 * u);
const between = (from, to, u) => from + (to - from) * u;

// The engine's pull against revs as a share of its best: weak at low revs, best at 70 to 80%, a little less at the red line.
export function enginePullShare(revs) {
  const r = clamp(Number.isFinite(revs) ? revs : 0, 0, 1.2), e = ENGINE_CURVE;
  if (r <= e.lowRevs) return between(e.idleShare, e.lowShare, smooth(r / e.lowRevs));
  if (r < e.bestFrom) return between(e.lowShare, 1, smooth((r - e.lowRevs) / (e.bestFrom - e.lowRevs)) ** e.riseBend);
  if (r <= e.bestTo) return 1;
  return between(1, e.redShare, smooth(clamp((r - e.bestTo) / (1 - e.bestTo), 0, 1)));
}

// The gear's multiplication: how much more a lower gear multiplies the engine's pull than the top gear.
export function gearMultiplication(gears, gear, power = ENGINE_CURVE.multiplicationPower) {
  const top = gears.at(-1), here = gears[clamp(gear, 0, gears.length - 1)];
  return top > 0 && here > 0 ? (top / here) ** power : 1;
}

// The pull in mph a second for this gear and revs, before throttle and the crash/launch scale (A0 already holds the scale).
export function enginePull({a0, scale, power, cap = 1, gears, gear, revs}) {
  // In first gear the clutch slips at a standing start, so the engine is held at launchRevs or more (the tyres limit a launch).
  const turning = gear === 0 ? Math.max(revs, ENGINE_CURVE.launchRevs) : revs;
  return Math.min(cap * a0, scale * a0 * gearMultiplication(gears, gear, power) * enginePullShare(turning));
}

// The automatic box's shift points: up above 96% of revs; down below 55%, never into a gear that would pass 90% revs.
export function autoShiftGear({gears, gear, revs}) {
  const e = ENGINE_CURVE;
  if (revs > e.autoUp && gear < gears.length - 1) return gear + 1;
  if (revs < e.autoDown && gear > 0 && revs * gears[gear] / gears[gear - 1] <= e.autoDownMaxRevs) return gear - 1;
  return gear;
}

// One scale per car (and, for the few cars whose gearbox needs it, its own multiplication power), fitted by
// tools/fit-engine-curve.mjs with the car at the engine level it races at. A car not listed (one added later)
// uses scale 1 until it is fitted; test-engine-curve fails until every car has its own.
export const ENGINE_FIT = Object.freeze({
  falcone_f42: Object.freeze({scale: 0.606}),
  stuttgart_959s: Object.freeze({scale: 0.601}),
  falcone_heritage: Object.freeze({scale: 0.606}),
  aurora_gt: Object.freeze({scale: 0.595}),
  dusthawk_rally: Object.freeze({scale: 0.6}),
  banshee_muscle: Object.freeze({scale: 0.62, power: 0.284}),
  viper_proto: Object.freeze({scale: 0.588}),
  titan_monster: Object.freeze({scale: 0.618}),
  koenigsegg_jesko: Object.freeze({scale: 0.549}),
  ferrari_enzo: Object.freeze({scale: 0.609}),
  mclaren_f1: Object.freeze({scale: 0.587}),
  bugatti_bolide: Object.freeze({scale: 0.513, power: 0.41}),
  falcone_sirena: Object.freeze({scale: 0.594}),
});
// Tooling only (the fitter tries values before they are written down); the game never calls it.
const trial = new Map();
export function trialEngineFit(id, fit) { if (fit === null) trial.delete(id); else trial.set(id, fit); }
export const engineFitFor = id => trial.get(id) ?? ENGINE_FIT[id] ?? {scale: 1};

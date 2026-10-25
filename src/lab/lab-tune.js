// Tuning rules (docs/LAB.md section 5, card LAB-TUNE): what each setting does to the player's car, the fuel
// load, and the stock lap and tuned-lap bonus. Pure: numbers in, numbers out. The driving code asks for a tuned
// car and a tuned grip; with every setting at 0 (or the `lab-tuning` switch off) it gets the car it gave, as the
// very same object, so a stock car drives exactly as before.
import {DRIVE} from '../config.js';
import {TUNE_SETTINGS, labOf, recordStockLap, payTunedBonus, TUNED_BONUS} from './lab-save.js';

// Every number of section 5.1, in one place. Steps run from -2 to +2; "per step" is per step of the setting.
export const LAB_TUNE = Object.freeze({
  // Tyre pressure: higher is sharper (less grip, less drag), lower grips more and drags more.
  pressure: Object.freeze({gripPerStep: -0.01, topSpeedPerStep: 0.005}),
  // Wing angle: grip at 100 mph +3% a step, scaled by (speed / 100 mph) squared; top speed -1% a step.
  wing: Object.freeze({gripAtReference: 0.03, referenceMph: 100, topSpeedPerStep: -0.01}),
  // Brake balance: braking +1% a step rearward; the cornering grip left while braking (80%) -2% a step rearward.
  brakes: Object.freeze({brakingPerStep: 0.01, cornerLeft: 0.8, cornerLeftPerStep: -0.02}),
  // Springs: grip +1% a step stiffer; softer steps add 2% off-road grip and make bumps 8% smaller each.
  springs: Object.freeze({gripPerStep: 0.01, offRoadGripPerStep: -0.02, bumpsPerStep: 0.08}),
  // Fuel load, a Grand Prix with a pit lane: each step above 0 takes a quarter of the tank off (+2 is half a tank) and
  // adds 1.5% to acceleration and braking. A full tank lasts 110% of the race, so a half tank lasts 55%. Empty means
  // 40% of the acceleration until the pit stop, which refills the tank and takes 5 s longer.
  fuel: Object.freeze({accelPerStep: 0.015, brakingPerStep: 0.015, loadPerStep: 0.25, fullTankRaceShare: 1.1,
    dryPower: 0.4, stopSec: 5}),
});

const STEP = 2;
const clampStep = value => Number.isSafeInteger(value) ? Math.max(-STEP, Math.min(STEP, value)) : 0;

// A tune as five whole steps. Anything else reads as 0; fuel below 0 is the same as 0 (a full tank).
export function normalizeTune(value) {
  const tune = {};
  for (const name of TUNE_SETTINGS) tune[name] = clampStep(value?.[name]);
  tune.fuel = Math.max(0, tune.fuel);
  return tune;
}
export const isStockTune = tune => TUNE_SETTINGS.every(name => !normalizeTune(tune)[name]);
export const tuneKey = tune => TUNE_SETTINGS.map(name => normalizeTune(tune)[name]).join(':');

// The car with the settings applied after upgrades. Stock gives back the same car object.
export function tunedCar(car, tune) {
  const t = normalizeTune(tune);
  if (isStockTune(t)) return car;
  const T = LAB_TUNE, fuel = t.fuel;
  const top = (1 + T.pressure.topSpeedPerStep * t.pressure) * (1 + T.wing.topSpeedPerStep * t.wing);
  const tuned = {
    ...car,
    topSpeed: car.topSpeed * top,
    gears: car.gears.map(gear => gear * top),
    accel: car.accel * (1 + T.fuel.accelPerStep * fuel),
    grip: car.grip * (1 + T.pressure.gripPerStep * t.pressure) * (1 + T.springs.gripPerStep * t.springs),
    braking: car.braking * (1 + T.brakes.brakingPerStep * t.brakes) * (1 + T.fuel.brakingPerStep * fuel),
    offRoadGrip: (car.offRoadGrip ?? DRIVE.offRoadGrip) * (1 + T.springs.offRoadGripPerStep * t.springs),
    roughnessScale: (car.roughnessScale ?? 1) * (1 + T.springs.bumpsPerStep * t.springs),
    tune: Object.freeze(t),
  };
  return tuned;
}

// The grip the steering sees at this moment: the tuned car's grip with the wing's push at this speed and the
// cornering grip given up (or kept) by the brake balance while the brake is held. An untuned car gives its own grip.
export function tunedGrip(car, speedMph, brake = 0) {
  const t = car.tune;
  if (!t) return car.grip;
  const T = LAB_TUNE;
  const ratio = Math.abs(speedMph) / T.wing.referenceMph;
  const wing = 1 + t.wing * T.wing.gripAtReference * ratio * ratio;
  const held = Math.max(0, Math.min(1, brake));
  const corner = 1 + (T.brakes.cornerLeftPerStep * t.brakes / T.brakes.cornerLeft) * held;
  return car.grip * wing * corner;
}

// The petrol tank in metres of race, or null when the settings or the race do not call for one. Only a
// Grand Prix on a course with a pit lane, and only for a car that burns petrol (the caller knows).
export function fuelPlan(tune, raceMetres, {grandPrix = false, pitLane = false, petrol = true} = {}) {
  const fuel = normalizeTune(tune).fuel;
  if (fuel <= 0 || !grandPrix || !pitLane || !petrol || !(raceMetres > 0)) return null;
  const load = 1 - LAB_TUNE.fuel.loadPerStep * fuel;
  return Object.freeze({tankM: raceMetres * LAB_TUNE.fuel.fullTankRaceShare * load});
}

// ---- Stock laps and the tuned-lap bonus (section 5.3) -------------------------------------------------------------------
// The best lap in a list of lap times, or null.
export function bestLap(lapTimes) {
  const laps = (Array.isArray(lapTimes) ? lapTimes : []).filter(seconds => Number.isFinite(seconds) && seconds > 0);
  return laps.length ? Math.min(...laps) : null;
}

// Stock laps from the player's existing Time Trial records, once: only while the saved stock laps are empty. A lap from
// before tuning existed counts as stock. entries are the leaderboard's rows.
export function seedStockLaps(profile, entries, playerId, {flags} = {}) {
  if (Object.keys(labOf(profile).stockLaps).length) return profile;
  let next = profile;
  for (const row of Array.isArray(entries) ? entries : []) {
    if (row?.playerId !== playerId || row.mode !== 'timetrial') continue;
    const lap = bestLap(row.lapTimes);
    if (lap === null) continue;
    const recorded = recordStockLap(next, row.car, row.eventId, lap, {flags});
    if (recorded.ok) next = recorded.profile;
  }
  return next;
}

// A finished Time Trial. A stock run keeps its best lap as the stock lap; a tuned run that is at least 1% faster than
// the stock lap of that car on that course pays the bonus, once for the course. Returns {profile, tuned} where tuned is
// null for a stock run and {percent, bonus} for a tuned one (bonus 0 when it did not pay).
export function settleTunedLap(profile, {carId, courseId, lapTimes, tune}, {flags} = {}) {
  if (flags?.enabled?.('lab-tuning') !== true) return {profile, tuned: null};
  const lap = bestLap(lapTimes);
  if (lap === null) return {profile, tuned: null};
  if (isStockTune(tune)) {
    const recorded = recordStockLap(profile, carId, courseId, lap, {flags});
    return {profile: recorded.ok ? recorded.profile : profile, tuned: null};
  }
  const stock = labOf(profile).stockLaps[`${carId}|${courseId}`];
  if (!(stock > 0)) return {profile, tuned: {percent: 0, bonus: 0}};
  const percent = Math.round((1 - lap / stock) * 1000) / 10;
  if (lap > stock * 0.99) return {profile, tuned: {percent: Math.max(0, percent), bonus: 0}};
  const paid = payTunedBonus(profile, courseId, {flags});
  return paid.ok ? {profile: paid.profile, tuned: {percent, bonus: paid.bonus ?? TUNED_BONUS}} : {profile, tuned: {percent, bonus: 0}};
}

// Where Kestrel One flies in H1, what the legs cost and the dispatch board's
// jobs (docs/HELICOPTER.md sections 2, 3 and 6). Board data only; the rules
// that use it live in heli-session.js and heli-save.js.
//
// mapKm places each course on a small map so departures and arrivals face
// the right way; real distances are not flown (the cruise leg skips them).
import {CARS} from '../config.js';
import {makeRng} from '../rng.js';
import {liftCheck} from './heli-cable.js';

import {carAt} from './heli-save.js';

export const HOME_COURSE = 'tremblant-woods';

export const HELI_DESTINATIONS = Object.freeze({
  'tremblant-woods': Object.freeze({id: 'tremblant-woods', name: 'Tremblant Woods', baseAltitude: 250,
    mapKm: Object.freeze({x: 0, z: 0}), home: true}),
  'tremblant-snow': Object.freeze({id: 'tremblant-snow', name: 'Tremblant Snow', baseAltitude: 250,
    mapKm: Object.freeze({x: 0.5, z: 1.9}), home: false}),
  'panorama-ridge': Object.freeze({id: 'panorama-ridge', name: 'Panorama Ridge', baseAltitude: 860,
    mapKm: Object.freeze({x: -6, z: 7}), home: false}),
});

// Fuel for each cruise leg, either way.
const LEG_FUEL = Object.freeze({
  'tremblant-snow|tremblant-woods': 25,
  'panorama-ridge|tremblant-woods': 120,
  'panorama-ridge|tremblant-snow': 110,
});

export function legKey(from, to) {
  return [from, to].sort().join('|');
}

export function legFuelKg(from, to) {
  if (from === to) return null;
  return LEG_FUEL[legKey(from, to)] ?? null;
}

// Bearing on the small map from one course toward another, as a unit
// vector in world x and z.
export function bearing(from, to) {
  const a = HELI_DESTINATIONS[from]?.mapKm, b = HELI_DESTINATIONS[to]?.mapKm;
  if (!a || !b) return null;
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  return length > 0 ? {x: dx / length, z: dz / length} : null;
}

// Special cars travel only by air (Kyle, 14 October 2026): with the
// helicopter switch on, one races only on the course where it was last set
// down, starting at the home pad. Earned cars from the medal sheets join
// this list later.
export const AIR_ONLY_CARS = Object.freeze(['koenigsegg_jesko']);

export function isAirOnlyCar(carId) {
  return AIR_ONLY_CARS.includes(carId);
}

// What the menu says when an air-only car is chosen on a course it has not
// been flown to (the same words the app uses when it refuses the race).
export function airOnlyNote({enabled = false, profile, carId, courseId, carName = 'This car'} = {}) {
  if (enabled !== true || !isAirOnlyCar(carId) || carAt(profile, carId) === courseId) return null;
  return `The ${carName} travels only by air. Fly it here from the helipad first.`;
}

export function isDestination(courseId) {
  return Object.hasOwn(HELI_DESTINATIONS, courseId);
}

// ---- the dispatch board ------------------------------------------------
// Three routes, each paying a fixed number of credits (Real pays a quarter
// more). The board offers one job on each route every play day.
export const JOB_ROUTES = Object.freeze([
  Object.freeze({from: 'tremblant-woods', to: 'tremblant-snow', pay: 300}),
  Object.freeze({from: 'tremblant-snow', to: 'panorama-ridge', pay: 450}),
  Object.freeze({from: 'tremblant-woods', to: 'panorama-ridge', pay: 600}),
]);
export const REAL_PAY_BONUS = 1.25;
export const JOBS_PER_DAY = 3;

// The customers' cars: every car Kestrel One can lift in H1, except the
// special cars that travel only by air, so a customer's car is never one.
export const JOB_CARS = Object.freeze(Object.keys(CARS).filter(id => liftCheck(id).ok && !isAirOnlyCar(id)));

const JOB_SEED = 0x4b455354;

// The day's jobs, the same every time for the same play day number. Each is
// {id: 'd<day>-<n>', carId, from, to, pay}, pay before the Real bonus. The
// routes are shuffled so the board's order changes from day to day, and no
// car is asked for twice on one board.
export function dayJobs(day) {
  const number = Number.isSafeInteger(day) && day >= 0 ? day : 0;
  const rng = makeRng((JOB_SEED ^ number) >>> 0);
  const routes = [...JOB_ROUTES];
  for (let i = routes.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [routes[i], routes[j]] = [routes[j], routes[i]];
  }
  const cars = [...JOB_CARS];
  return Object.freeze(routes.map((route, index) => {
    const carId = cars.splice(rng.int(0, cars.length - 1), 1)[0];
    return Object.freeze({id: `d${number}-${index + 1}`, carId, from: route.from, to: route.to, pay: route.pay});
  }));
}

export function jobPay(job, mode = 'assisted') {
  return mode === 'real' ? Math.round(job.pay * REAL_PAY_BONUS) : job.pay;
}

// "Fly the Falcone F42 to Tremblant Snow".
export function jobTitle(job) {
  return `Fly the ${CARS[job.carId]?.name ?? job.carId} to ${HELI_DESTINATIONS[job.to]?.name ?? job.to}`;
}

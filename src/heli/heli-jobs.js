// Where Kestrel One flies in H1 and what the legs cost (docs/HELICOPTER.md
// sections 2, 3 and 6). Board data only: HELI-DISPATCH adds the day's jobs.
//
// mapKm places each course on a small map so departures and arrivals face
// the right way; real distances are not flown (the cruise leg skips them).
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

export function isDestination(courseId) {
  return Object.hasOwn(HELI_DESTINATIONS, courseId);
}

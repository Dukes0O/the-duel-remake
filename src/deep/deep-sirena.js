// The rules of the Falcone Sirena story (docs/THE_DEEP.md 6.2, 6.3, 6.6 and 10.1):
// the sonar, the lift bags, the order of the finds and what the save pays.
// Pure and headless: it reads the car's plain picture {x, z, speed (mph), heading?},
// never touches race state, and uses no clock or randomness, so the same inputs
// always give the same events. Events are plain objects in the duel.emit style
// ({deepSonar: {...}}); the view and sound read them and never write back.
import {normalizeDeep} from './deep-discovery.js';

const KMH_PER_MPH = 1.609344;
const CREDIT_CAP = 1_000_000_000;

export const SIRENA = Object.freeze({
  pingCooldown: 1.5,       // seconds between pings
  range: 150,              // metres, inclusive
  soundSpeed: 1500,        // metres a second through sea water; the echo takes 2 x distance / this
  liftRange: 4,            // metres (horizontal) from a find to start and keep a lift
  liftSpeedKmh: 3,         // under this, in km/h, to start and keep a lift
  liftSeconds: 3,          // one bag
  carLiftSeconds: 12,      // four bags for the car itself
  badgeSeconds: 1,         // the badge needs no bag: stop beside it for this long
});
export const SIRENA_FINDS = Object.freeze(['sirena-badge', 'sirena-steering-wheel', 'sirena-wheel',
  'sirena-bonnet', 'sirena-door', 'sirena-car']);
export const SIRENA_PAY = Object.freeze({part: 100, car: 500, coastCup: 1000});

const BADGE = 'sirena-badge', CAR = 'sirena-car';
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const finite = value => Number.isFinite(value);
const validCar = car => car && finite(car.x) && finite(car.z) && finite(car.speed);
const distance = (find, car) => Math.hypot(find.x - car.x, find.z - car.z);
const still = car => Math.abs(car.speed) * KMH_PER_MPH < SIRENA.liftSpeedKmh;

// Where a find lies in world metres: its trail point plus `offset` sideways,
// positive to the left (heading +z, left +x: the left normal of a direction
// (tx, tz) is (tz, -tx)), as for pearls and spots (10.1).
function place(zone, find) {
  const trail = zone.trail, n = trail.length, i = find.trailIndex;
  const a = trail[(i + n - 1) % n], b = trail[(i + 1) % n], point = trail[i];
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const tx = (b.x - a.x) / length, tz = (b.z - a.z) / length;
  return {id: find.id, x: point.x + tz * find.offset, z: point.z - tx * find.offset, below: find.below ?? 0};
}

// The state of one dive. deepSave is profile.deep (any shape, normalised here).
// A zone without finds, or with the switch off, gives an inert state: nothing
// pings, lifts, records or pays.
export function createSirena(zone, deepSave, {enabled = false} = {}) {
  const finds = (zone?.finds ?? []).map(find => place(zone, find));
  const known = new Set(finds.map(find => find.id));
  const saved = normalizeDeep(deepSave);
  const raised = (saved.raised ?? []).filter(id => known.has(id));
  return {zoneId: zone?.id ?? null, active: enabled === true && SIRENA_FINDS.every(id => known.has(id)), finds,
    // The sonar is given with the badge; an old save that has the badge raised has the sonar too.
    sonar: saved.sonar === true || raised.includes(BADGE), raised,
    lastPing: -Infinity, lift: null, hold: null};
}

const isRaised = (state, id) => state.raised.includes(id);
// What may be raised now: the badge first, then the four parts in any order, the car last.
function available(state, find) {
  if (isRaised(state, find.id)) return false;
  if (find.id === BADGE) return true;
  if (!state.sonar) return false;
  return find.id !== CAR || SIRENA_FINDS.filter(id => id !== CAR).every(id => isRaised(state, id));
}

// R: one ping. `seconds` is the dive clock (a steady count of seconds). Returns
// the events: nothing before the badge is raised or inside the cooldown, otherwise
// deepSonar {blip, echoSeconds}; blip is {find, distance, bearing, relative} or
// null for "No echo". bearing is the world angle to the find (0 = +z, positive to
// the left, +x); relative is that minus the car's heading when it has one.
export function pingSonar(state, car, seconds) {
  if (!state.active || !state.sonar || !validCar(car) || !finite(seconds)) return [];
  if (seconds - state.lastPing < SIRENA.pingCooldown - 1e-9) return [];
  state.lastPing = seconds;
  let best = null;
  for (const find of state.finds) {
    if (!available(state, find)) continue;
    const away = distance(find, car);
    if (away <= SIRENA.range && (!best || away < best.away)) best = {find, away};
  }
  if (!best) return [{deepSonar: {blip: null, echoSeconds: null}}];
  const bearing = Math.atan2(best.find.x - car.x, best.find.z - car.z);
  const relative = finite(car.heading) ? wrap(bearing - car.heading) : null;
  return [{deepSonar: {blip: {find: best.find.id, distance: best.away, bearing, relative},
    echoSeconds: 2 * best.away / SIRENA.soundSpeed}}];
}

// F and the clock. input.lift is true while F is pressed. A lift starts when the
// car is within 4 m of an available find, under 3 km/h, and F is pressed; it takes 3 s
// (12 s for the car) and driving off (past 4 m, or over 3 km/h) cancels it. The badge
// is raised by stopping beside it for a second, with no F and no bag. Events:
// deepLift {find, seconds}, deepLiftCancel {find}, deepRaised {find}.
export function stepLift(state, car, input, dt) {
  if (!state.active || !finite(dt) || dt < 0) return [];
  const events = [], near = find => validCar(car) && distance(find, car) <= SIRENA.liftRange + 1e-9 && still(car);
  const claim = find => {
    state.raised.push(find.id);
    if (find.id === BADGE) state.sonar = true;
    state.lift = state.hold = null;
    events.push({deepRaised: {find: find.id}});
  };
  const active = state.lift ?? state.hold;
  if (active) {
    const find = state.finds.find(row => row.id === active.find);
    if (!near(find) || !available(state, find)) {
      if (state.lift) events.push({deepLiftCancel: {find: find.id}});
      state.lift = state.hold = null;
      return events;
    }
    active.elapsed += dt;
    if (active.elapsed >= active.seconds - 1e-9) claim(find);
    return events;
  }
  let target = null;
  for (const find of state.finds) {
    if (available(state, find) && near(find) && (!target || distance(find, car) < distance(target, car))) target = find;
  }
  if (!target) return events;
  if (target.id === BADGE) {
    state.hold = {find: BADGE, elapsed: Math.max(0, dt), seconds: SIRENA.badgeSeconds};
    if (state.hold.elapsed >= state.hold.seconds - 1e-9) claim(target);
  } else if (input?.lift === true) {
    const seconds = target.id === CAR ? SIRENA.carLiftSeconds : SIRENA.liftSeconds;
    state.lift = {find: target.id, elapsed: 0, seconds};
    events.push({deepLift: {find: target.id, seconds}});
  }
  return events;
}

// ---- the save: what is recorded, and what it pays, exactly once ---------------------

// Credits stop at the save's cap; a wallet already past it is left alone.
function payTo(profile, amount) {
  const base = Math.max(0, Number.isSafeInteger(profile?.credits) ? profile.credits : 0);
  const credits = Math.max(base, Math.min(CREDIT_CAP, base + amount));
  return {credits, paid: credits - base};
}

// Records a raised find in profile.deep.raised and pays for it the first time only
// (100 a part, the badge included; 500 for the car). The badge also records the
// sonar. Refused (profile returned unchanged, ok false) with the switch off, an
// unknown find, a find out of order (the badge comes first, the car last) or a
// find already raised (ok true, paid 0).
export function raiseFind(profile, id, {enabled = false} = {}) {
  const same = ok => ({profile, ok, paid: 0});
  if (enabled !== true || !SIRENA_FINDS.includes(id)) return same(false);
  const deep = normalizeDeep(profile?.deep), raised = deep.raised ?? [];
  if (raised.includes(id)) return same(true);
  if (id !== BADGE && !raised.includes(BADGE)) return same(false);
  if (id === CAR && !SIRENA_FINDS.filter(other => other !== CAR).every(other => raised.includes(other))) return same(false);
  const {credits, paid} = payTo(profile, id === CAR ? SIRENA_PAY.car : SIRENA_PAY.part);
  return {profile: {...profile, credits, deep: {...deep, raised: [...raised, id], ...(id === BADGE ? {sonar: true} : {})}}, ok: true, paid};
}

// The Coast Cup finished in the restored Sirena (SIRENA-CAR calls this): 1,000
// credits and deep.coastCup, once, and only once the car has been raised.
export function recordCoastCup(profile, {enabled = false} = {}) {
  const deep = normalizeDeep(profile?.deep), same = ok => ({profile, ok, paid: 0, events: []});
  if (enabled !== true || !(deep.raised ?? []).includes(CAR)) return same(false);
  if (deep.coastCup === true) return same(true);
  const {credits, paid} = payTo(profile, SIRENA_PAY.coastCup);
  return {profile: {...profile, credits, deep: {...deep, coastCup: true}}, ok: true, paid, events: [{deepCoastCup: {}}]};
}

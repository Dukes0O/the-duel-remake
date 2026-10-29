// Where Kestrel One flies in H1, what the legs cost and the dispatch board's
// jobs (docs/HELICOPTER.md sections 2, 3 and 6). Board data only; the rules
// that use it live in heli-session.js and heli-save.js.
//
// mapKm places each course on a small map so departures and arrivals face
// the right way; real distances are not flown (the cruise leg skips them).
import {CARS} from '../config.js';
import {makeRng} from '../rng.js';
import {liftCheck} from './heli-cable.js';
import {MEDAL_CARS} from '../medals.js';
// pilot-map-data.js imports legFuelKg from this file too; each only calls the other's
// functions after both have loaded, so the pair is safe in either order.
import {PLACES, DEV_PLACES, PLACE_ALTITUDES, LEFT_OFF, legFuelKgMap, placeOfCourse, placeById, fuelPadAt} from './pilot-map-data.js';

import {carAt, heliOf, missionsOf, setMissions, WRECK_DAYS, HELI_MONEY} from './heli-save.js';
import {surveyJob, surveyName, reportSurvey, isSurveyRun, SURVEY_NOT_A_RUN} from './heli-survey.js';
import {HELI_PAYS, payForMinutes, cleanBonusFor, deliveryMinutes} from './heli-pay.js';

export const HOME_COURSE = 'tremblant-woods';

export const HELI_DESTINATIONS = Object.freeze({
  'tremblant-woods': Object.freeze({id: 'tremblant-woods', name: 'Tremblant Woods', baseAltitude: 250,
    mapKm: Object.freeze({x: 0, z: 0}), home: true}),
  'tremblant-snow': Object.freeze({id: 'tremblant-snow', name: 'Tremblant Snow', baseAltitude: 250,
    mapKm: Object.freeze({x: 0.5, z: 1.9}), home: false}),
  'panorama-ridge': Object.freeze({id: 'panorama-ridge', name: 'Panorama Ridge', baseAltitude: 860,
    mapKm: Object.freeze({x: -6, z: 7}), home: false}),
});

// Summit Run (docs/HELI_RESCUE.md section 5.5), a fourth destination while
// the `summit-run` switch is on (its course is in dev today). Base altitude
// is the real start of the Pikes Peak road; on the small map it lies north-
// west of Panorama Ridge (north is +z, as Tremblant Snow is north of the
// Woods). It joins only through the `summitRun` option below, so with the
// switch off every table, leg and answer is what H1 gave.
export const SUMMIT_RUN = Object.freeze({id: 'summit-run', name: 'Summit Run', baseAltitude: 2860,
  mapKm: Object.freeze({x: -10, z: 12}), home: false});
export const HELI_DESTINATIONS_WITH_SUMMIT = Object.freeze({...HELI_DESTINATIONS, [SUMMIT_RUN.id]: SUMMIT_RUN});

// The pilot's map (docs/PILOT_MAP.md): with the `pilot-map` switch on, every place
// on the map is a destination (the Table, which is air only, joins once the pilot has seen it:
// the `table` option, MAP-SECRETS) except those the landing-zone search finds no circle for (LEFT_OFF in
// pilot-map-data.js). A place faces its neighbours by where it is drawn (the Neon districts share
// one table point). The four original destinations keep their records, so their
// answers are the same objects as before; Summit Run still needs its own switch.
// Built when first asked for, since pilot-map-data.js loads this file too.
let pilotTables = null;
function pilotDestinations(summitRun, withTable = false, koganePass = false) {
  pilotTables ??= {};
  const key = `${summitRun ? 'withSummit' : 'without'}${withTable ? '+table' : ''}${koganePass ? '+kogane' : ''}`;
  if (pilotTables[key]) return pilotTables[key];
  const known = summitRun ? HELI_DESTINATIONS_WITH_SUMMIT : HELI_DESTINATIONS;
  const table = {};
  // A destination is named by its course id, which the game loads (the Titan stadium is its Monster Arena).
  // Kogane Pass (KOGANE-PASS-C5) joins only through its own option, like Summit Run.
  for (const place of koganePass ? [...PLACES, ...DEV_PLACES] : PLACES) {
    if (place.air || LEFT_OFF.includes(place.id)) continue;
    const id = place.courses[0];
    if (id === SUMMIT_RUN.id && !summitRun) continue;
    table[id] = known[id] ?? Object.freeze({id, name: place.name, baseAltitude: PLACE_ALTITUDES[place.id], mapKm: place.drawAt, home: false});
  }
  if (withTable) {
    const mesa = placeById('the-table');
    table['the-table'] = Object.freeze({id: 'the-table', name: mesa.name, baseAltitude: PLACE_ALTITUDES['the-table'], mapKm: mesa.drawAt, home: false});
  }
  return (pilotTables[key] = Object.freeze(table));
}
// Every name the game can show for a destination, whatever is switched on (titles of jobs already taken).
const nameOf = id => HELI_DESTINATIONS_WITH_SUMMIT[id]?.name ?? placeOfCourse(id)?.name ?? placeById(id)?.name ?? id;
// The map's place for a destination (its course id), for the map's distances and legs.
const placeKey = courseId => placeOfCourse(courseId)?.id ?? courseId;

// The destinations to use: pass the summit-run switch as {summitRun}, the
// pilot-map switch as {pilotMap} and the kogane-pass switch as {koganePass}
// (Kogane Pass is a map place only, so it needs the pilot map too).
export const destinationsFor = ({summitRun = false, pilotMap = false, table = false, koganePass = false} = {}) =>
  pilotMap === true ? pilotDestinations(summitRun === true, table === true, koganePass === true) : summitRun === true ? HELI_DESTINATIONS_WITH_SUMMIT : HELI_DESTINATIONS;

// Fuel for each cruise leg, either way.
const LEG_FUEL = Object.freeze({
  'tremblant-snow|tremblant-woods': 25,
  'panorama-ridge|tremblant-woods': 120,
  'panorama-ridge|tremblant-snow': 110,
});
// Summit Run's legs (section 5.5): 160 kg from the Woods, 150 from Tremblant
// Snow, 90 from Panorama Ridge.
const SUMMIT_LEG_FUEL = Object.freeze({
  'summit-run|tremblant-woods': 160,
  'summit-run|tremblant-snow': 150,
  'panorama-ridge|summit-run': 90,
});

export function legKey(from, to) {
  return [from, to].sort().join('|');
}

export function legFuelKg(from, to, {summitRun = false, pilotMap = false, table = false, koganePass = false} = {}) {
  if (from === to) return null;
  // With the pilot's map on, a leg between two destinations is the map's: the old table
  // legs keep their numbers and every other pair is 12 kg a km plus 5 (pilot-map-data.js).
  if (pilotMap === true && Object.hasOwn(pilotDestinations(summitRun === true, table === true, koganePass === true), from) && Object.hasOwn(pilotDestinations(summitRun === true, table === true, koganePass === true), to)) return legFuelKgMap(placeKey(from), placeKey(to));
  const key = legKey(from, to);
  return LEG_FUEL[key] ?? (summitRun === true ? SUMMIT_LEG_FUEL[key] : undefined) ?? null;
}

// Bearing on the small map from one course toward another, as a unit
// vector in world x and z.
export function bearing(from, to, options = {}) {
  const table = destinationsFor(options);
  const a = table[from]?.mapKm, b = table[to]?.mapKm;
  if (!a || !b) return null;
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  return length > 0 ? {x: dx / length, z: dz / length} : null;
}

// Medal cars, the Lab-built Speirling and the restored Sirena travel only by air: with the
// helicopter on, they race only where last set down. Medal cars start at the
// home pad; the Sirena starts at Pacific Canyon (heli-save FIRST_PLACE).
// Kyle, 25 October 2026: the Jesko races anywhere again, regardless of carsAt.
export const AIR_ONLY_CARS = Object.freeze([...MEDAL_CARS, 'falcone_sirena', 'mcmurtry_speirling']);

export function isAirOnlyCar(carId) {
  return AIR_ONLY_CARS.includes(carId);
}

// What the menu says when an air-only car is chosen on a course it has not
// been flown to (the same words the app uses when it refuses the race).
export function airOnlyNote({enabled = false, profile, carId, courseId, carName = 'This car'} = {}) {
  if (enabled !== true || !isAirOnlyCar(carId) || carAt(profile, carId) === courseId) return null;
  return `The ${carName} travels only by air. Fly it here from the helipad first.`;
}

export function isDestination(courseId, options = {}) {
  return Object.hasOwn(destinationsFor(options), courseId);
}

// ---- the dispatch board ------------------------------------------------
// Three routes, each paying a fixed number of credits (Real pays a quarter
// more). The board offers one job on each route every play day. Pay is the minutes
// the delivery takes at the race rate (heli-pay.js): leave, fly to the pick-up when it is
// not the home pad, hook, carry out, cruise, arrive and set the car down. A cruise leg counts one minute
// whatever its length, because it plays as a short fade. `fuel(a, b)` is the fuel of a leg (null: no such leg).
function carJobPayFrom(fuel, from, to) {
  const leg = fuel(from, to);
  if (leg === null || leg === undefined) return null;
  return payForMinutes(deliveryMinutes(from !== HOME_COURSE));
}
const tableFuel = (a, b) => LEG_FUEL[legKey(a, b)] ?? null;
export const JOB_ROUTES = Object.freeze([
  Object.freeze({from: 'tremblant-woods', to: 'tremblant-snow', pay: carJobPayFrom(tableFuel, 'tremblant-woods', 'tremblant-snow')}),
  Object.freeze({from: 'tremblant-snow', to: 'panorama-ridge', pay: carJobPayFrom(tableFuel, 'tremblant-snow', 'panorama-ridge')}),
  Object.freeze({from: 'tremblant-woods', to: 'panorama-ridge', pay: carJobPayFrom(tableFuel, 'tremblant-woods', 'panorama-ridge')}),
]);
export const REAL_PAY_BONUS = 1.25;
export const JOBS_PER_DAY = 3;

// The customers' cars: every car Kestrel One can lift in H1, except the
// medal cars, Sirena and garage-completion reward. The Jesko's racing freedom
// does not change the existing customer pool or seeded dispatch jobs.
export const JOB_CARS = Object.freeze(Object.keys(CARS).filter(id => liftCheck(id).ok && !isAirOnlyCar(id) && id !== 'koenigsegg_jesko'));

const JOB_SEED = 0x4b455354;

// The day's jobs, the same every time for the same play day number. Each is
// {id: 'd<day>-<n>', carId, from, to, pay}, pay before the Real bonus. The
// routes are shuffled so the board's order changes from day to day, and no
// car is asked for twice on one board.
export function dayJobs(day, {pilotMap = false, owned = []} = {}) {
  const number = Number.isSafeInteger(day) && day >= 0 ? day : 0;
  const rng = makeRng((JOB_SEED ^ number) >>> 0);
  const routes = pilotMap === true ? mapRoutes(owned) : [...JOB_ROUTES];
  for (let i = routes.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [routes[i], routes[j]] = [routes[j], routes[i]];
  }
  const cars = [...JOB_CARS];
  return Object.freeze(routes.slice(0, JOBS_PER_DAY).map((route, index) => {
    const carId = cars.splice(rng.int(0, cars.length - 1), 1)[0];
    return Object.freeze({id: `d${number}-${index + 1}`, carId, from: route.from, to: route.to, pay: route.pay});
  }));
}

// ---- jobs on the pilot's map (docs/PILOT_MAP.md section 4) -----------------------
// With the map on, a job may name any destination the player owns. The routes are
// the three original ones (their pays stay) followed by every other ordered pair of
// owned destinations whose legs each fit a full tank; pay by straight-line map
// legs: the same minutes-at-the-race-rate pay as the three routes, from the map's leg fuel.
const mapFuel = (a, b) => legFuelKgMap(placeKey(a), placeKey(b));
export const mapJobPay = (from, to) => carJobPayFrom(mapFuel, from, to);
function mapRoutes(owned) {
  const routes = [...JOB_ROUTES];
  const seen = new Set(routes.map(route => `${route.from}>${route.to}`));
  const ids = [...new Set(owned)].filter(id => Object.hasOwn(pilotDestinations(true), id));
  for (const from of ids) for (const to of ids) {
    if (from === to || seen.has(`${from}>${to}`)) continue;
    // Both legs (to the pick-up, then to the drop-off) must be flyable on one full tank.
    if (legFuelKgMap(placeKey(from), placeKey(to)) > 400) continue;
    seen.add(`${from}>${to}`);
    routes.push(Object.freeze({from, to, pay: mapJobPay(from, to)}));
  }
  return routes;
}

export function jobPay(job, mode = 'assisted') {
  return mode === 'real' ? Math.round(job.pay * REAL_PAY_BONUS) : job.pay;
}

// A clean delivery (no hard landing, crash, dropped load or cargo knock while the job was in hand) adds a
// quarter of the job's pay (Real pays its quarter more on that too).
export function jobCleanBonus(job, mode = 'assisted') {
  return jobPay({pay: cleanBonusFor(job.pay)}, mode);
}

// "Fly the Falcone F42 to Tremblant Snow".
export function jobTitle(job) {
  return `Fly the ${CARS[job.carId]?.name ?? job.carId} to ${nameOf(job.to)}`;
}

const RETURN_SENDERS = Object.freeze({
  'tremblant-snow': 'The lodge sends empty gas bottles.',
  'panorama-ridge': 'The ranger post sends sample boxes.',
  'summit-run': 'The hut sends laundry.',
  'pacific-canyon': "Ana's field station sends sample crates for the lab in town.",
});

// HELI-PAY-CONTINUE: the minutes the crate takes at the race rate (heli-pay.js), never less than
// premium fuel at either end with a 25% margin, rounded up to 10.
export function returnLoadPay(from, to, options = {}) {
  const fuel = legFuelKg(from, to, options);
  if (fuel === null || fuel > HELI_MONEY.tankKg) return null;
  const price = Math.max(HELI_MONEY.creditsPerKg, fuelPadAt(placeKey(from))?.pricePerKg ?? 0,
    fuelPadAt(placeKey(to))?.pricePerKg ?? 0);
  return Math.ceil(Math.max(payForMinutes(deliveryMinutes()), 1.25 * fuel * price) / 10) * 10;
}

// No ownership or wallet enters the seed: the same place has the same load
// all play day. Legs beyond a full tank never go on this small board.
export function returnLoadJob(day, from, options = {}) {
  const places = destinationsFor(options);
  if (from === HOME_COURSE || !Object.hasOwn(places, from)) return null;
  const number = Number.isSafeInteger(day) && day >= 0 ? day : 0;
  let seed = (0x43524154 ^ number) >>> 0;
  for (const letter of from) seed = (Math.imul(seed, 31) ^ letter.charCodeAt(0)) >>> 0;
  const rng = makeRng(seed);
  // Discovering the hidden Table in flight must not redraw an advertised
  // job. It offers outbound crates once known, but is never a drop-off.
  const routes = Object.keys(places).filter(to => to !== from && to !== 'the-table').map(to => {
    return {to, pay: returnLoadPay(from, to, options)};
  }).filter(route => route.pay !== null);
  if (!routes.length) return null;
  const route = routes[rng.int(0, routes.length - 1)];
  return Object.freeze({id: `return-${number}-${from}`, kind: 'returnLoad', day: number, from, to: route.to,
    pay: route.pay, massKg: rng.int(300, 600), sender: RETURN_SENDERS[from] ?? `The ${nameOf(from)} pad sends supplies.`});
}

export const returnLoadTitle = job => `Crate from ${nameOf(job.from)} to ${nameOf(job.to)}`;

export function finishReturnLoad(profile, job, mode = 'assisted', options = {}, clean = false) {
  const heli = heliOf(profile);
  const expected = returnLoadJob(heli.playDay.count, job?.from, options);
  if (!expected || expected.id !== job?.id || heli.returnLoads?.[expected.from] === expected.day)
    return {ok: false, profile};
  const wallet = Number.isFinite(profile?.credits) ? Math.max(0, Math.floor(profile.credits)) : 0;
  const total = Math.min(1_000_000_000, wallet + jobPay(expected, mode) + (clean ? jobCleanBonus(expected, mode) : 0));
  return {ok: true, paid: total - wallet, profile: {...profile, credits: total,
    heli: {...heli, returnLoads: {...heli.returnLoads, [expected.from]: expected.day}}}};
}

// ---- the car recovery job (docs/HELI_RESCUE.md section 5.3) --------------
// After a hoist rescue the driver's car lies on the slope. The next play day
// the board offers "Recover the <car> from Panorama Ridge" for 2,300 credits:
// hook it and set it down in the landing zone. It stays 3 play days (the save
// removes the wreck then, heli-save.js). It is an everyday job that sits on
// the board beside the day's three, so dayJobs and its fingerprints are
// untouched, and it pays as a dispatch job does (Real pays a quarter more).
export const RECOVERY = Object.freeze({pay: HELI_PAYS.recovery, days: WRECK_DAYS});
const WRECK_SEED = 0x57524b43;

// The car left on the slope: a seeded pick from the customer cars Kestrel
// One can lift, so the same rescue always leaves the same car.
export function wreckFor({seed, courseId, x, z, day}) {
  const rng = makeRng(((Number(seed) >>> 0) ^ WRECK_SEED) >>> 0);
  return Object.freeze({courseId, carId: JOB_CARS[rng.int(0, JOB_CARS.length - 1)], x, z, day});
}

// The job for a wreck on a play day: on the board from the day after the
// rescue, for 3 play days; none before or after.
export function recoveryJob(wreck, playDay) {
  if (!wreck || !Number.isSafeInteger(playDay) || !Number.isSafeInteger(wreck.day)) return null;
  const age = playDay - wreck.day;
  if (age < 1 || age > RECOVERY.days) return null;
  return Object.freeze({id: `w${wreck.day}-${wreck.carId}`, kind: 'recovery', carId: wreck.carId, from: wreck.courseId,
    to: wreck.courseId, pay: RECOVERY.pay, x: wreck.x, z: wreck.z});
}

// "Recover the Falcone F42 from Panorama Ridge".
export function recoveryTitle(job) {
  return `Recover the ${CARS[job.carId]?.name ?? job.carId} from ${HELI_DESTINATIONS[job.from]?.name ?? job.from}`;
}

// Today's recovery job from a profile, or null (also while the rescue switch is off).
export function recoveryJobOf(profile, {enabled} = {}) {
  if (enabled !== true) return null;
  const heli = heliOf(profile);
  return recoveryJob(heli.missions?.wreck, heli.playDay.count);
}

// The car is set down in the landing zone: pay the job (capped like every
// credit change) and take the wreck out of the save. The job must be on the
// board today, so it can never pay twice.
export function finishRecovery(profile, {enabled, mode = 'assisted', clean = false} = {}) {
  if (enabled !== true) return {ok: false, reason: 'Rescues are not available yet.', profile};
  const job = recoveryJobOf(profile, {enabled});
  if (!job) return {ok: false, reason: 'There is no car to recover.', profile};
  const wallet = Number.isFinite(profile?.credits) ? Math.max(0, Math.floor(profile.credits)) : 0;
  const total = Math.min(1_000_000_000, wallet + jobPay(job, mode) + (clean ? jobCleanBonus(job, mode) : 0));
  const stored = setMissions({...profile, credits: total}, {...missionsOf(profile), wreck: null}, {enabled: true});
  return {ok: true, profile: stored.profile, paid: total - wallet, job};
}

// ---- the wildlife count (docs/HELI_WILDLIFE.md section 4) -----------------
// One a play day on its own line below the car jobs, so dayJobs and its
// fingerprints are untouched: "Count the <species> at <course>" for Sarah. The
// rules, the square and the pay are heli-survey.js's. It is on the board only
// with the wildlife switch on, and until it is finished that play day.

// "Count the moose at Tremblant Woods".
export function surveyTitle(job) {
  const place = destinationsFor({summitRun: true})[job.courseId]?.name ?? job.courseId;
  return `Count the ${surveyName(job.species)} at ${place}`;
}

// Today's count job from a profile, or null: switch off, or already finished today.
export function surveyJobOf(profile, {enabled, summitRun = false} = {}) {
  if (enabled !== true) return null;
  const heli = heliOf(profile), day = heli.playDay.count;
  if (heli.survey?.day === day && heli.survey.done === true) return null;
  return surveyJob(day, {summitRun});
}

// The pilot reports to Sarah: pay by how near the estimate is, add one to the
// wildlife counts, and mark today's count done. The run must be for the job on
// the board today, so a count can never pay twice, on a replay or a second
// press. Pay is the same in Assisted and Real, capped like every credit change.
export function finishSurvey(profile, run, {enabled, summitRun = false} = {}) {
  if (enabled !== true) return {ok: false, reason: 'The wildlife count is not available yet.', profile};
  const job = surveyJobOf(profile, {enabled, summitRun});
  if (!job) return {ok: false, reason: 'There is no count to report.', profile};
  if (!isSurveyRun(run)) return {ok: false, reason: SURVEY_NOT_A_RUN, profile};
  const plan = run.plan;
  if (run.jobId !== job.id || plan?.jobId !== job.id || plan.courseId !== job.courseId || plan.species !== job.species)
    return {ok: false, reason: "That count is not today's job.", profile};
  const report = reportSurvey(run);
  if (!report.ok) return {ok: false, reason: report.reason, profile};
  const wallet = Number.isFinite(profile?.credits) ? Math.max(0, Math.floor(profile.credits)) : 0;
  const total = Math.min(1_000_000_000, wallet + report.pay);
  const missions = missionsOf(profile);
  const stored = setMissions({...profile, credits: total},
    {...missions, wildlifeCounts: (Number.isSafeInteger(missions.wildlifeCounts) ? missions.wildlifeCounts : 0) + 1}, {enabled: true});
  const done = {...stored.profile, heli: {...heliOf(stored.profile), survey: {day: heliOf(profile).playDay.count, done: true}}};
  return {ok: true, profile: done, paid: total - wallet, job, report};
}

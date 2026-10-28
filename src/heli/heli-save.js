// The helicopter's save field and its credit rules (docs/HELICOPTER.md, 9).
// Pure functions: no screen, no clock, no random. A profile goes in and a new
// profile comes out; nothing is changed in place. Dates are passed in.
import {CARS, COURSE} from '../config.js';
import {CLOSURE, buybackPrice, playDayOf} from '../course-closures.js';

export const HELI_SAVE_VERSION = 1;
export const HELI_MONEY = Object.freeze({tankKg: 400, creditsPerKg: 1.5, hardLanding: 150, crash: 800,
  fuelTruck: 300, cargoLight: 150, cargoHeavy: 400, cargoWreck: 900, dropPerMetre: 100});
export const HELI_LESSONS = Object.freeze(['liftoff', 'hover', 'landing', 'carry']);

const MAX_COUNT = 1_000_000;
const MAX_CREDITS = 1_000_000_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[a-z0-9:_-]+$/;
const NOT_AVAILABLE = 'The helicopter is not available yet.';
const REPAIRS = Object.freeze({hardLanding: HELI_MONEY.hardLanding, crash: HELI_MONEY.crash,
  cargoLight: HELI_MONEY.cargoLight, cargoHeavy: HELI_MONEY.cargoHeavy, cargoWreck: HELI_MONEY.cargoWreck});
// Fuel is counted in tenths of a kilogram so prices never pick up rounding noise.
const TANK_TENTHS = HELI_MONEY.tankKg * 10;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) ? Math.max(0, Math.min(MAX_COUNT, value)) : 0;
const validId = value => typeof value === 'string' && value.length >= 1 && value.length <= 80 && ID_PATTERN.test(value);
const validCourse = value => typeof value === 'string' && COURSE.some(stage => stage.id === value);
// A car can stand on a course or on the Table, the pilot's air-only mesa, which is no registry course (MAP-SECRETS).
// Calls, rescues, jobs and scars still name courses only.
const validPlace = value => validCourse(value) || value === 'the-table';
const copyPlainFields = value => {
  const copy = {};
  for (const [key, field] of Object.entries(value)) {
    if (key === '__proto__' || field === undefined) continue;
    try { copy[key] = structuredClone(field); } catch { /* not save data */ }
  }
  return copy;
};
const validCar = value => typeof value === 'string' && Object.hasOwn(CARS, value);
const tenthsOf = kg => Math.max(0, Math.min(TANK_TENTHS, Math.round(Number(kg) * 10)));
// 1.5 credits per kilogram is 0.15 credits per tenth, rounded up to a whole credit.
// `rate` is the price in tenths of a credit per kilogram (15 for the home pump).
const priceOfTenths = (tenths, rate = 15) => Math.ceil(tenths * rate / 100);

export function createHeli() {
  return {version: HELI_SAVE_VERSION, fuelKg: 0,
    lessons: {liftoff: false, hover: false, landing: false, carry: false},
    playDay: {last: null, count: 0}, jobs: {day: 0, taken: null, done: []},
    carsAt: {}, refuels: 0, flights: 0};
}

// Every field this game knows, so only a newer game's fields are copied as they are.
const KNOWN_KEYS = new Set([...Object.keys(createHeli()), 'missions', 'fire', 'burnt', 'scars', 'bucket', 'skins', 'dirt', 'survey', 'ski', 'map', 'returnLoads', 'logbook']);

export function normalizeHeli(value) {
  if (!isObject(value) || value.version !== HELI_SAVE_VERSION) return createHeli();
  const heli = createHeli();
  heli.fuelKg = Number.isFinite(value.fuelKg) ? tenthsOf(value.fuelKg) / 10 : 0;
  const lessons = isObject(value.lessons) ? value.lessons : {};
  for (const lesson of HELI_LESSONS) heli.lessons[lesson] = lessons[lesson] === true;
  const playDay = isObject(value.playDay) ? value.playDay : {};
  heli.playDay = {last: typeof playDay.last === 'string' && DAY_PATTERN.test(playDay.last) ? playDay.last : null,
    count: count(playDay.count)};
  const jobs = isObject(value.jobs) ? value.jobs : {};
  heli.jobs = {day: count(jobs.day), taken: validId(jobs.taken) ? jobs.taken : null,
    done: [...new Set((Array.isArray(jobs.done) ? jobs.done : []).filter(validId))].slice(0, 10)};
  if (isObject(value.carsAt)) {
    for (const [car, course] of Object.entries(value.carsAt))
      if (validCar(car) && validPlace(course)) heli.carsAt[car] = course;
  }
  heli.refuels = count(value.refuels);
  heli.flights = count(value.flights);
  if (isObject(value.returnLoads)) {
    heli.returnLoads = {};
    for (const [place, day] of Object.entries(value.returnLoads))
      if (validPlace(place) && place !== 'tremblant-woods' && Number.isSafeInteger(day) && day >= 0 && day <= MAX_COUNT)
        heli.returnLoads[place] = day;
  }
  if (isObject(value.logbook)) {
    const book = value.logbook, jobs = isObject(book.jobs) ? book.jobs : {};
    heli.logbook = {...copyPlainFields(book), flights: count(book.flights),
      jobs: {...copyPlainFields(jobs), ...Object.fromEntries(['car', 'crate', 'fire', 'rescue', 'ski'].map(k => [k, count(jobs[k])]))},
      visited: [...new Set((Array.isArray(book.visited) ? book.visited : []).filter(id => validPlace(id) || id === 'titan-stadium'))],
      awarded: Math.min(5, count(book.awarded))};
  }
  normalizeFireFields(value, heli);
  normalizeSkinFields(value, heli);
  if (Object.hasOwn(value, 'ski')) { const ski = normalizeSki(value.ski); if (ski) heli.ski = ski; }
  if (Object.hasOwn(value, 'map')) { const map = normalizeMapRecord(value.map); if (map) heli.map = map; }
  // Keys from a newer game are kept as they are (a copy), so going back one
  // release loses nothing (docs/HELI_FIRE.md section 12). A known field that
  // failed its checks is dropped, never copied.
  for (const key of Object.keys(value)) {
    if (KNOWN_KEYS.has(key) || key === '__proto__' || value[key] === undefined) continue;
    try { heli[key] = structuredClone(value[key]); } catch { /* not plain data: dropped */ }
  }
  return heli;
}

// Reads the field without changing the profile. A profile with no field reads as a new helicopter.
export function heliOf(profile) {
  return profile && Object.hasOwn(profile, 'heli') ? normalizeHeli(profile.heli) : createHeli();
}

const credits = profile => Number.isFinite(profile?.credits) ? Math.max(0, Math.floor(profile.credits)) : 0;
const off = profile => ({ok: false, reason: NOT_AVAILABLE, profile});
const failure = (profile, reason) => ({ok: false, reason, profile});
const withHeli = (profile, heli) => ({...profile, heli});

// kg may be Infinity, which means fill up. The first tank is free. pricePerKg is
// the pump's price in credits a kilogram where it is not the home pump's 1.5 (the
// pilot's map has dearer pads, docs/PILOT_MAP.md section 4); left out, nothing changes.
// A price is kept to a tenth of a credit (1.55 reads as 1.6); one that is not a positive number is 1.5.
export function buyFuel(profile, kg, {enabled, pricePerKg} = {}) {
  if (enabled !== true) return off(profile);
  const rate = Number.isFinite(pricePerKg) && pricePerKg > 0 ? Math.max(1, Math.round(pricePerKg * 10)) : 15;
  const heli = heliOf(profile), have = tenthsOf(heli.fuelKg), space = TANK_TENTHS - have;
  if (space <= 0) return failure(profile, 'The tank is full.');
  // Round down to a whole tenth, so asking for 0.19 kg buys 0.1 kg and never more than was asked.
  const asked = Number(kg) > 0 ? Math.floor(Math.min(Number(kg), HELI_MONEY.tankKg) * 10 + 1e-9) : 0;
  const wanted = Math.min(space, asked);
  if (wanted < 1) return failure(profile, 'Choose how much fuel to buy.');
  let tenths = wanted, cost = heli.refuels === 0 ? 0 : priceOfTenths(tenths, rate);
  const wallet = credits(profile);
  if (cost > wallet) {
    // Buy only what the credits pay for.
    tenths = Math.floor(wallet * 100 / rate);
    if (tenths <= 0) return failure(profile, 'You need 1 more credit.');
    cost = priceOfTenths(tenths, rate);
  }
  const bought = {...heli, fuelKg: (have + tenths) / 10, refuels: Math.min(MAX_COUNT, heli.refuels + 1)};
  return {ok: true, profile: {...withHeli(profile, bought), credits: wallet - cost}, kg: tenths / 10, cost,
    partial: tenths < wanted};
}

// Stores the fuel left after a flight.
export function setFuel(profile, kg, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (!Number.isFinite(Number(kg))) return failure(profile, 'Fuel must be a number.');
  return {ok: true, profile: withHeli(profile, {...heliOf(profile), fuelKg: tenthsOf(kg) / 10})};
}

// Takes what the player has and forgives the rest. Credits never go below zero.
export function chargeRepair(profile, amount, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (!Number.isSafeInteger(amount) || amount < 0) return failure(profile, 'A repair is a whole number of credits.');
  const wallet = credits(profile), charged = Math.min(wallet, amount);
  return {ok: true, profile: {...profile, credits: wallet - charged}, charged, forgiven: amount - charged};
}

export function repairCost(kind, {dropMetres = 0} = {}) {
  if (kind === 'drop')
    return Number.isFinite(dropMetres) && dropMetres > 1 ? Math.round(HELI_MONEY.dropPerMetre * dropMetres) : 0;
  if (!Object.hasOwn(REPAIRS, kind)) throw new Error('Unknown repair: ' + kind);
  return REPAIRS[kind];
}

// After an out-of-fuel landing. The truck always fills the tank, so nobody is stranded.
// It is not a pump purchase, so the refuel count does not change.
export function fuelTruck(profile, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  const heli = heliOf(profile), addedTenths = TANK_TENTHS - tenthsOf(heli.fuelKg);
  const charge = chargeRepair(profile, HELI_MONEY.fuelTruck + priceOfTenths(addedTenths), {enabled});
  return {ok: true, profile: withHeli(charge.profile, {...heli, fuelKg: HELI_MONEY.tankKg}),
    kg: addedTenths / 10, charged: charge.charged, forgiven: charge.forgiven};
}

export function notePlayDay(profile, dateString, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (typeof dateString !== 'string' || !DAY_PATTERN.test(dateString)) return failure(profile, 'That is not a date.');
  const heli = heliOf(profile);
  if (heli.playDay.last === dateString) return {ok: true, newDay: false, profile};
  const playDay = {last: dateString, count: Math.min(MAX_COUNT, heli.playDay.count + 1)};
  return {ok: true, newDay: true, profile: withHeli(profile, healed({...heli, playDay}))};
}

// A new play day forgets burns that have healed: a burnt course after 60
// play days, a scar after 40 (docs/HELI_FIRE.md sections 8.4 and 8.5), and a
// wreck job after 3 (docs/HELI_RESCUE.md section 10).
function healed(heli) {
  const today = heli.playDay.count, next = {...heli};
  if (heli.missions?.wreck && today - heli.missions.wreck.day > WRECK_DAYS) next.missions = {...heli.missions, wreck: null};
  if (isObject(heli.burnt)) next.burnt = Object.fromEntries(Object.entries(heli.burnt)
    .filter(([, entry]) => today - entry.day < CLOSURE.healedDay));
  if (Array.isArray(heli.scars)) next.scars = heli.scars.filter(scar => today - scar.day < CLOSURE.scarHealedDay);
  return next;
}

export function finishLesson(profile, lesson, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (!HELI_LESSONS.includes(lesson)) return failure(profile, 'That is not a lesson.');
  const heli = heliOf(profile);
  return {ok: true, profile: withHeli(profile, {...heli, lessons: {...heli.lessons, [lesson]: true}})};
}

export function placeCar(profile, carId, courseId, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (!validCar(carId) || !validPlace(courseId)) return failure(profile, 'That car or course is not known.');
  const heli = heliOf(profile);
  return {ok: true, profile: withHeli(profile, {...heli, carsAt: {...heli.carsAt, [carId]: courseId}})};
}

// Where a car stands before the helicopter has ever moved it: the home pad's course, except for the
// Sirena, which the Lab trucks to Pacific Canyon for the Coast Cup (docs/THE_DEEP.md 6.2).
export const FIRST_PLACE = Object.freeze({falcone_sirena: 'pacific-canyon'});
export function carAt(profile, carId, fallback = FIRST_PLACE[carId] ?? 'tremblant-woods') {
  const heli = heliOf(profile);
  return validCar(carId) && Object.hasOwn(heli.carsAt, carId) ? heli.carsAt[carId] : fallback;
}

export function countFlight(profile, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  const heli = heliOf(profile);
  return {ok: true, profile: withHeli(profile, {...heli, flights: Math.min(MAX_COUNT, heli.flights + 1)})};
}

// ---- dispatch board jobs -------------------------------------------------
// heli.jobs is {day, taken, done}: the play day the board was last used, the
// job in hand and the jobs finished that day. A job taken on an earlier play
// day is out of date (the board has new jobs), so it does not block a new one.

// Takes a job from today's board. One job at a time; a finished job is not
// offered again the same day.
export function takeJob(profile, jobId, day, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (!validId(jobId) || !Number.isSafeInteger(day) || day < 0) return failure(profile, 'That job is not on the board.');
  const heli = heliOf(profile), sameDay = heli.jobs.day === day;
  const done = sameDay ? heli.jobs.done : [], taken = sameDay ? heli.jobs.taken : null;
  if (done.includes(jobId)) return failure(profile, 'That job is done for today.');
  if (taken === jobId) return {ok: true, already: true, profile};
  if (taken) return failure(profile, 'Finish or drop the job you have first.');
  return {ok: true, already: false, profile: withHeli(profile, {...heli, jobs: {day, taken: jobId, done: [...done]}})};
}

// Hands the job in hand back to the board; it can be taken again today.
export function dropJob(profile, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  const heli = heliOf(profile);
  if (!heli.jobs.taken) return {ok: true, dropped: false, profile};
  return {ok: true, dropped: true, profile: withHeli(profile, {...heli, jobs: {...heli.jobs, taken: null, done: [...heli.jobs.done]}})};
}

// Pays for the job in hand and marks it done for the day. Pay is income, so
// unlike a repair it can only raise the credits (to the same cap as the rest
// of the save).
export function finishJob(profile, jobId, pay, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  if (!Number.isSafeInteger(pay) || pay < 0) return failure(profile, 'Pay is a whole number of credits.');
  const heli = heliOf(profile);
  if (!validId(jobId) || heli.jobs.taken !== jobId) return failure(profile, 'That is not the job in hand.');
  const wallet = credits(profile), total = Math.min(MAX_CREDITS, wallet + pay);
  const jobs = {...heli.jobs, taken: null, done: [...new Set([...heli.jobs.done, jobId])].slice(-10)};
  return {ok: true, profile: {...withHeli(profile, {...heli, jobs}), credits: total}, paid: total - wallet};
}

// ---- H2 Fire (docs/HELI_FIRE.md sections 7, 8 and 12) ----------------------
// Every field is optional: it appears the first time it is used, so an H1
// save stays exactly as it was. Every helper takes {enabled}, the
// forest-fire switch (effective only with the helicopter switch on).

export const FIRE_MONEY = Object.freeze({firePay: 1500, bucketRepair: Object.freeze([0, 100, 250, 600])});
export const MISSION_KINDS = Object.freeze(['fire']);
export const BADGES = Object.freeze(['firefighter']);
// H4 Rescue (docs/HELI_RESCUE.md section 10). These are what a save may hold;
// MISSION_KINDS stays the list of kinds the engine offers, so storing a
// rescue field offers nothing by itself.
export const RESCUE_KINDS = Object.freeze(['hiker', 'avalanche', 'hoist', 'supply']);
export const RESCUE_STAGES = Object.freeze(['fly', 'found', 'hold', 'carry']);
export const RESCUE_BADGES = Object.freeze([...BADGES, 'rescue']);
export const RESCUE_COUNTS = Object.freeze(['hoists', 'searches', 'supplies', 'rescued']);
// A wreck job stays on the board for 3 play days, then goes (section 5.3).
export const WRECK_DAYS = 3;
const SAVED_KINDS = Object.freeze([...MISSION_KINDS, ...RESCUE_KINDS]);
const MAX_CONDITION = 2;
const CRATES = 3;
// H3 Wildlife and skins (docs/HELI_WILDLIFE.md section 10). What a save may
// hold; nothing here earns, buys or draws a skin (SKIN-RULES does).
export const SKIN_KINDS = Object.freeze(['fire', 'medevac', 'rescue', 'wildlife', 'supply', 'tv']);
export const DIRT_KINDS = Object.freeze(['dust', 'mud', 'soot', 'salt']);
export const DIRT_MAX = 100;
export const WILDLIFE_COUNTS = Object.freeze(['wildlifeCounts', 'cameraFlights']);
export const BUCKET_DAMAGE = Object.freeze(['whole', 'dented', 'torn', 'ruined']);
// Sarah's regrowth news for a burnt course, in order (section 8.4): a burn
// remembers the last one heard, so each plays once.
export const BURN_NEWS = Object.freeze(['reopen', 'shoots', 'fireweed']);
export const MAX_SCARS = 4;
// A fire holds at most 80 burning and burnt cells; damp lasts at most 2 steps.
export const MAX_FIRE_CELLS = 80;
const MAX_DAMP_STEPS = 2;
const MAX_RETARDANT_LITRES = 1000;
const TREATED_LITRES = 150;
const FIRE_OFF = 'Forest fires are not available yet.';
// A cell is (i + 512) x 1024 + (j + 512) for grid column i and row j.
const MAX_CELL = 1024 * 1024 - 1;
const validCell = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_CELL;
const seed32 = value => Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff ? value : 0;
const tenth = (value, max) => Number.isFinite(value) ? Math.round(Math.max(0, Math.min(max, value)) * 10) / 10 : 0;

// A 32-bit FNV-1a hash of strings and numbers, for the mission and fire
// seeds (section 3.1). Parts are kept apart, so ('ab', 'c') and ('a', 'bc')
// differ.
export function heliHash(...parts) {
  let hash = 2166136261;
  for (const part of parts) {
    const text = String(part);
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    hash = Math.imul(hash ^ 0x1f, 16777619);
  }
  return hash >>> 0;
}

// The mission engine's record before it arms: no seed, nothing counted.
export function createMissions() {
  return {seed: 0, draws: 0, need: 0, count: 0, last: null, call: null,
    quiet: {untilDay: 0, engineSeconds: 0}, firesOut: 0, badges: []};
}

function normalizeCall(call) {
  if (!isObject(call) || !SAVED_KINDS.includes(call.kind) || !validId(call.id) || !validCourse(call.courseId)) return null;
  const out = {kind: call.kind, id: call.id, courseId: call.courseId, day: count(call.day), answered: call.answered === true};
  // Flights since a rescue call came (section 3.3): only a call that has the count keeps it.
  if (Number.isSafeInteger(call.flights)) out.flights = count(call.flights);
  return out;
}

// The rescue in hand (section 10). Kyle, 15 October: it saves `condition`
// (0 unhurt, 1 hurt, 2 badly hurt), never the bumps. A record that cannot say
// what, where and how far along it is reads as none.
const step = (value, max) => Number.isSafeInteger(value) ? Math.max(0, Math.min(max, value)) : 0;
function normalizeRescue(value) {
  if (!isObject(value) || !RESCUE_KINDS.includes(value.kind) || !validId(value.id) || !validCourse(value.courseId)
    || !RESCUE_STAGES.includes(value.stage)) return null;
  const crates = Array.isArray(value.crates) ? value.crates : [];
  return {kind: value.kind, id: value.id, courseId: value.courseId, seed: seed32(value.seed),
    clockSeconds: tenth(value.clockSeconds, MAX_COUNT), stage: value.stage,
    crates: Array.from({length: CRATES}, (_, i) => step(crates[i], 2)), condition: step(value.condition, MAX_CONDITION)};
}

// A wrecked car waiting for the recovery job (section 5.3). Where it lies must
// be real numbers, or the job could not place it.
const MAX_METRES = 100_000;
const metres = value => Number.isFinite(value) && Math.abs(value) <= MAX_METRES ? Math.round(value * 10) / 10 : null;
function normalizeWreck(value) {
  if (!isObject(value) || !validCourse(value.courseId) || !validCar(value.carId) || !validDay(value.day)) return null;
  const x = metres(value.x), z = metres(value.z);
  return x === null || z === null ? null : {courseId: value.courseId, carId: value.carId, x, z, day: value.day};
}

function normalizeMissions(value) {
  const quiet = isObject(value.quiet) ? value.quiet : {};
  const out = {seed: seed32(value.seed), draws: count(value.draws), need: Math.min(count(value.need), 99), count: count(value.count),
    last: SAVED_KINDS.includes(value.last) ? value.last : null,
    call: normalizeCall(value.call),
    quiet: {untilDay: count(quiet.untilDay), engineSeconds: tenth(quiet.engineSeconds, MAX_COUNT)},
    firesOut: count(value.firesOut),
    badges: [...new Set((Array.isArray(value.badges) ? value.badges : []).filter(badge => RESCUE_BADGES.includes(badge)))]};
  // The H4 fields appear only once a save has them, so an H2 save reads back
  // exactly as it was written.
  if (Object.hasOwn(value, 'rescue')) out.rescue = normalizeRescue(value.rescue);
  for (const name of RESCUE_COUNTS) if (Number.isSafeInteger(value[name])) out[name] = count(value[name]);
  if (Object.hasOwn(value, 'wreck')) out.wreck = normalizeWreck(value.wreck);
  // The H3 counts, the same way: kept only when stored as whole numbers.
  for (const name of WILDLIFE_COUNTS) if (Number.isSafeInteger(value[name])) out[name] = count(value[name]);
  return out;
}

const cellList = list => [...new Set((Array.isArray(list) ? list : []).filter(validCell))].sort((a, b) => a - b);
function cellPairs(list, value) {
  const seen = new Set(), out = [];
  for (const pair of Array.isArray(list) ? list : []) {
    if (!Array.isArray(pair) || !validCell(pair[0]) || seen.has(pair[0])) continue;
    seen.add(pair[0]);
    out.push([pair[0], value(pair[1])]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

function normalizeFire(value) {
  if (!isObject(value) || !validId(value.id) || !validCourse(value.courseId)) return null;
  const burnt = cellList(value.burnt).slice(0, MAX_FIRE_CELLS);
  const gone = new Set(burnt);
  const burning = cellPairs(value.burning, p => tenth(p, 100)).filter(([cell, p]) => p > 0 && !gone.has(cell))
    .slice(0, MAX_FIRE_CELLS - burnt.length);
  const lit = new Set([...gone, ...burning.map(([cell]) => cell)]);
  const damp = cellPairs(value.damp, steps => Number.isSafeInteger(steps) ? Math.max(1, Math.min(MAX_DAMP_STEPS, steps)) : 1)
    .filter(([cell]) => !lit.has(cell)).slice(0, MAX_FIRE_CELLS);
  // The Lab's retardant (heli-fire.js applyRetardant): litres on each forest cell, kept only once some has landed.
  // Cells that are fully treated (150 litres, heli-fire.js RETARDANT) are kept before partly coated ones, so the cap
  // never turns a treated cell back into one that can burn.
  const coated = cellPairs(value.retardant, litres => tenth(litres, MAX_RETARDANT_LITRES)).filter(([cell, litres]) => litres > 0 && !lit.has(cell));
  const retardant = [...coated.filter(([, litres]) => litres >= TREATED_LITRES), ...coated.filter(([, litres]) => litres < TREATED_LITRES)]
    .slice(0, MAX_FIRE_CELLS).sort((a, b) => a[0] - b[0]);
  return {id: value.id, courseId: value.courseId, seed: seed32(value.seed), startDay: count(value.startDay),
    steps: count(value.steps), engineSeconds: tenth(value.engineSeconds, MAX_COUNT), burning, burnt, damp,
    ...(retardant.length ? {retardant} : {})};
}

// A burn or scar with a broken day is dropped, never moved to day 0, so the
// loaded save reads the same as course-closures.js reads the stored one.
const validDay = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_COUNT;

function normalizeBurnt(value) {
  const out = {};
  for (const [courseId, entry] of Object.entries(value))
    if (validCourse(courseId) && isObject(entry) && validDay(entry.day)) {
      out[courseId] = {day: entry.day, boughtBack: entry.boughtBack === true};
      if (BURN_NEWS.includes(entry.heard)) out[courseId].heard = entry.heard;
    }
  return out;
}

const normalizeScars = value => value.filter(scar => isObject(scar) && validCourse(scar.courseId) && validDay(scar.day))
  .map(scar => ({courseId: scar.courseId, day: scar.day, cells: cellList(scar.cells).slice(0, MAX_FIRE_CELLS)}))
  .slice(-MAX_SCARS);

const bucketDamage = value => Number.isSafeInteger(value?.damage) && value.damage >= 0 && value.damage <= 3 ? value.damage : 0;

// The H2 fields of a stored helicopter, each only when it is there.
function normalizeFireFields(value, heli) {
  if (isObject(value.missions)) heli.missions = normalizeMissions(value.missions);
  if (Object.hasOwn(value, 'fire')) heli.fire = normalizeFire(value.fire);
  if (isObject(value.burnt)) heli.burnt = normalizeBurnt(value.burnt);
  if (Array.isArray(value.scars)) heli.scars = normalizeScars(value.scars);
  if (isObject(value.bucket)) heli.bucket = {damage: bucketDamage(value.bucket)};
}

// The H3 fields of a stored helicopter, each only when it is there and an
// object (section 10). Unknown skins are dropped; a worn skin that is not
// owned reads as stock; a fresh skin is owned and not the one worn.
export const RANK_SKIN_KINDS = Object.freeze(['rank-student', 'rank-private', 'rank-commercial', 'rank-mountain', 'rank-chief']);
const skinList = list => [...new Set((Array.isArray(list) ? list : []).filter(kind => SKIN_KINDS.includes(kind) || RANK_SKIN_KINDS.includes(kind)))];
function normalizeSkins(value) {
  const owned = skinList(value.owned);
  const worn = owned.includes(value.worn) ? value.worn : 'stock';
  return {owned, worn, fresh: skinList(value.fresh).filter(kind => owned.includes(kind) && kind !== worn)};
}
const dirtLevel = value => Number.isSafeInteger(value) ? Math.max(0, Math.min(DIRT_MAX, value)) : 0;
const normalizeDirt = value => Object.fromEntries(DIRT_KINDS.map(kind => [kind, dirtLevel(value[kind])]));
const normalizeSurvey = value => ({day: count(value.day), done: value.done === true});
function normalizeSkinFields(value, heli) {
  if (isObject(value.skins)) heli.skins = normalizeSkins(value.skins);
  if (isObject(value.dirt)) heli.dirt = normalizeDirt(value.dirt);
  if (isObject(value.survey)) heli.survey = normalizeSurvey(value.survey);
}

const fireOff = profile => ({ok: false, reason: FIRE_OFF, profile});

// ---- Heli-skiing (docs/HELI_SKIING.md sections 7 and 9) ------------------------------------------------------------
// profile.heli.ski = {version: 1, best: {<run>: number}, medal: {<run>: 1..3}, paid: {<run>: 1..3}, stashes: [<id>]},
// optional: an older save has none and never gains one until something is skied. `best` is the best time (seconds, less is
// better) on a timed run or the best score (points, more is better) on a judged one; `medal` the best medal (1 bronze,
// 2 silver, 3 gold); `paid` the highest medal already paid for. Zero entries are not stored. Names this game does not
// know (a later game's runs and stashes) are kept as they are and never paid.
export const SKI_RUNS = Object.freeze(['slalom', 'gs', 'moguls', 'aerials', 'powder']);
const SKI_TIMED = Object.freeze(['slalom', 'gs']);
const SKI_JUDGED = Object.freeze(['moguls', 'aerials']);
export const SKI_STASHES = Object.freeze(['north-shelf', 'ridge-pocket', 'lower-meadow']);
// What the medals pay in all, by medal (none, bronze, silver, gold): 150, then 150 more, then 200 more. A stash pays 100, once.
export const SKI_MONEY = Object.freeze({medalTotal: Object.freeze([0, 150, 300, 500]), stash: 100});
const SKI_SAVE_VERSION = 1;
const MAX_SKI_NAMES = 64;
const NOT_SKIING = 'Heli-skiing is not available yet.';
const SKI_NEWER = 'This skiing progress belongs to another version.';
const SKI_KEYS = new Set(['version', 'best', 'medal', 'paid', 'stashes']);
const hundredth = value => Math.round(value * 100) / 100;
const tenthOf = value => Math.round(value * 10) / 10;
const SKI_BEST_MAX = 1_000_000;

// A version this game cannot read because it is later than 1 (a later game's number, even a text or fractional one).
const laterVersion = version => ['number', 'string', 'bigint'].includes(typeof version) && Number(version) > SKI_SAVE_VERSION;

// A newer game's record is returned exactly as it was (and never written over); null when there is none to keep.
// The names this game knows are never cut to make room for a later game's: only the unknown ones are capped.
function normalizeSki(value) {
  if (!isObject(value)) return null;
  if (laterVersion(value.version)) {
    try { return structuredClone(value); } catch { return value; }
  }
  if (value.version !== SKI_SAVE_VERSION) return null;
  const ski = {version: SKI_SAVE_VERSION, best: {}, medal: {}, paid: {}, stashes: []};
  const skiName = name => validId(name) && name !== '__proto__';
  const known = new Set([...SKI_RUNS, ...SKI_STASHES]);
  const capped = (list, nameOf) => {
    const usable = list.filter(item => skiName(nameOf(item)));
    return [...usable.filter(item => known.has(nameOf(item))), ...usable.filter(item => !known.has(nameOf(item))).slice(0, MAX_SKI_NAMES)];
  };
  const names = map => capped(isObject(map) ? Object.entries(map) : [], ([name]) => name);
  for (const [run, number] of names(value.best)) {
    if (typeof number !== 'number' || !Number.isFinite(number) || !(number > 0) || number > SKI_BEST_MAX) continue;
    const kept = SKI_JUDGED.includes(run) ? tenthOf(number) : hundredth(number);
    if (kept > 0) ski.best[run] = kept;
  }
  const whole = number => Number.isSafeInteger(number) && number >= 1 && number <= 3 ? number : 0;
  for (const [run, number] of names(value.paid)) if (whole(number)) ski.paid[run] = whole(number);
  for (const [run, number] of names(value.medal)) if (whole(number)) ski.medal[run] = whole(number);
  // A medal that was paid for was earned.
  for (const [run, number] of Object.entries(ski.paid)) if (!(ski.medal[run] >= number)) ski.medal[run] = number;
  ski.stashes = capped([...new Set(Array.isArray(value.stashes) ? value.stashes : [])], id => id);
  for (const key of Object.keys(value)) {
    if (SKI_KEYS.has(key) || key === '__proto__' || value[key] === undefined) continue;
    try { ski[key] = structuredClone(value[key]); } catch { /* not plain data: dropped */ }
  }
  return ski;
}

// ---- The pilot's map (docs/PILOT_MAP.md section 6, MAP-SECRETS) ------------------------------------------------------
// profile.heli.map = {version: 1, seen: [<place>], found: [<secret>], table: boolean}, optional: an older save has none and
// never gains one until something is found. Names this game does not know (a later game's places and secrets) are kept
// as they are and mean nothing. A later version of the record is returned exactly as it was and every write over it is
// refused, as is a write over a later helicopter (map-secrets.js does the writing and reading; this is the save's shape).
export const MAP_SAVE_VERSION = 1;
const MAP_KEYS = new Set(['version', 'seen', 'found', 'table']);
const MAX_MAP_NAMES = 128;
const MAP_NEWER = 'This map belongs to another version.';
function normalizeMapRecord(value) {
  if (!isObject(value)) return null;
  if (laterVersion(value.version)) {
    try { return structuredClone(value); } catch { return value; }
  }
  if (value.version !== MAP_SAVE_VERSION) return null;
  const names = list => [...new Set((Array.isArray(list) ? list : []).filter(id => validId(id) && id !== '__proto__'))].slice(0, MAX_MAP_NAMES);
  const map = {version: MAP_SAVE_VERSION, seen: names(value.seen), found: names(value.found), table: value.table === true};
  for (const key of Object.keys(value)) {
    if (MAP_KEYS.has(key) || key === '__proto__' || value[key] === undefined) continue;
    try { map[key] = structuredClone(value[key]); } catch { /* not plain data: dropped */ }
  }
  return map;
}
// The record this game can read: a version 1 record, or an empty one (none stored, or a later game's).
export function mapRecordOf(profile) {
  const map = heliOf(profile).map;
  return map && map.version === MAP_SAVE_VERSION ? map : {version: MAP_SAVE_VERSION, seen: [], found: [], table: false};
}
// Why a write over the map record must be refused (a later game's record, or a later game's helicopter), or null.
export function mapBlocked(profile) {
  const stored = isObject(profile) && isObject(profile.heli) ? profile.heli : null;
  if (stored && laterVersion(stored.version)) return MAP_NEWER;
  const map = heliOf(profile).map;
  return map && map.version !== MAP_SAVE_VERSION ? MAP_NEWER : null;
}
// The profile with this map record in its helicopter, or the same profile with a reason when the write is refused.
export function writeMapRecord(profile, map, extra = {}) {
  const reason = mapBlocked(profile);
  if (reason) return {ok: false, reason, profile};
  return {ok: true, profile: {...profile, ...extra, heli: {...heliOf(profile), map: normalizeMapRecord({...map, version: MAP_SAVE_VERSION})}}};
}

const createSki = () => ({version: SKI_SAVE_VERSION, best: {}, medal: {}, paid: {}, stashes: []});
// What has been skied (an empty record for a save with none, or with a newer game's record that this game cannot read).
export function skiOf(profile) {
  const ski = heliOf(profile).ski;
  return ski && ski.version === SKI_SAVE_VERSION ? ski : createSki();
}

const skiOff = profile => ({ok: false, reason: NOT_SKIING, profile});
// Writing is refused over a record this game cannot read: a later game's ski record, or a later game's helicopter.
function skiBlocked(profile) {
  const stored = isObject(profile) && isObject(profile.heli) ? profile.heli : null;
  if (stored && laterVersion(stored.version)) return SKI_NEWER;
  const ski = heliOf(profile).ski;
  return ski && ski.version !== SKI_SAVE_VERSION ? SKI_NEWER : null;
}
function paidProfile(profile, heli, ski, pay) {
  const wallet = credits(profile);
  return {...profile, credits: Math.min(MAX_CREDITS, wallet + pay), heli: {...heli, ski}};
}

// A finished run: result is {time, medal} for the timed runs (slalom, gs) and {points, medal} for the judged ones (moguls,
// aerials), the medal being the ski rules' own (ski-score.js timedMedal and judgedMedal, 0 to 3). Keeps the best time or
// score, raises the medal, and pays the difference up to that medal once (150, 300, 500 in all). Powder has no result.
// Returns {ok, profile, paid, improved, raised, medal}.
export function recordRun(profile, run, result, {enabled} = {}) {
  if (enabled !== true) return skiOff(profile);
  const blocked = skiBlocked(profile);
  if (blocked) return failure(profile, blocked);
  const timed = SKI_TIMED.includes(run), judged = SKI_JUDGED.includes(run);
  if (!timed && !judged) return failure(profile, run === 'powder' ? 'The powder run has no time or score.' : 'That is not a run.');
  const value = isObject(result) ? result[timed ? 'time' : 'points'] : undefined, medal = isObject(result) ? result.medal : undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > SKI_BEST_MAX || (timed && value === 0) ||
      !Number.isSafeInteger(medal) || medal < 0 || medal > 3) return failure(profile, 'That is not a result.');
  const heli = heliOf(profile), ski = skiOf(profile), kept = timed ? hundredth(value) : tenthOf(value);
  const before = ski.best[run], improved = before === undefined || (timed ? kept < before : kept > before);
  const next = {...ski, best: {...ski.best}, medal: {...ski.medal}, paid: {...ski.paid}};
  if (improved && kept > 0) next.best[run] = kept;
  const oldMedal = ski.medal[run] ?? 0, newMedal = Math.max(oldMedal, medal);
  if (newMedal > 0) next.medal[run] = newMedal;
  const owed = Math.max(0, SKI_MONEY.medalTotal[newMedal] - SKI_MONEY.medalTotal[ski.paid[run] ?? 0]);
  if (owed > 0) next.paid[run] = newMedal;
  return {ok: true, profile: paidProfile(profile, heli, next, owed), paid: owed, improved: improved && kept > 0, raised: newMedal > oldMedal, medal: newMedal};
}

// A powder stash found: 100 credits, once for each of the three.
export function findStash(profile, id, {enabled} = {}) {
  if (enabled !== true) return skiOff(profile);
  const blocked = skiBlocked(profile);
  if (blocked) return failure(profile, blocked);
  if (!SKI_STASHES.includes(id)) return failure(profile, 'That is not a stash.');
  const heli = heliOf(profile), ski = skiOf(profile);
  if (ski.stashes.includes(id)) return {ok: true, profile, paid: 0, found: false};
  return {ok: true, profile: paidProfile(profile, heli, {...ski, stashes: [...ski.stashes, id]}, SKI_MONEY.stash), paid: SKI_MONEY.stash, found: true};
}

export const missionsOf = profile => heliOf(profile).missions ?? createMissions();
export const fireOf = profile => heliOf(profile).fire ?? null;
export const bucketDamageOf = profile => heliOf(profile).bucket?.damage ?? 0;

// Stores the mission engine's record (heli-missions.js makes it).
export function setMissions(profile, missions, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  if (!isObject(missions)) return failure(profile, 'That is not a mission record.');
  return {ok: true, profile: withHeli(profile, {...heliOf(profile), missions: normalizeMissions(missions)})};
}

// Stores the fire burning now (heli-fire.js makes it), or null when there is none.
export function setFire(profile, fire, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const stored = fire === null ? null : normalizeFire(fire);
  if (fire !== null && !stored) return failure(profile, 'That is not a fire record.');
  return {ok: true, profile: withHeli(profile, {...heliOf(profile), fire: stored})};
}

// A burn or scar is dated on a play day that has come: never later than today.
const dayOk = (heli, day) => validDay(day) && day <= heli.playDay.count;
const withBurn = (heli, courseId, day) => ({...heli, burnt: {...heli.burnt, [courseId]: {day, boughtBack: false}}});
const withScar = (heli, courseId, day, cells) => {
  const scar = {courseId, day, cells: cellList(cells).slice(0, MAX_FIRE_CELLS)};
  return scar.cells.length ? {...heli, scars: [...(heli.scars ?? []), scar].slice(-MAX_SCARS)} : heli;
};

// The course burns on a play day (section 8.1). Use loseFire for a fire in the save.
export function burnCourse(profile, courseId, day, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const heli = heliOf(profile);
  if (!validCourse(courseId) || !dayOk(heli, day)) return failure(profile, 'That course or day is not known.');
  return {ok: true, profile: withHeli(profile, withBurn(heli, courseId, day))};
}

// Burnt cells kept as a scar; the oldest of more than four goes (section 8.5).
export function addScar(profile, courseId, day, cells, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const heli = heliOf(profile);
  if (!validCourse(courseId) || !dayOk(heli, day) || !Array.isArray(cells)) return failure(profile, 'That scar is not valid.');
  const next = withScar(heli, courseId, day, cells);
  return {ok: true, profile: next === heli ? profile : withHeli(profile, next)};
}

// The fire in the save is out (section 7): in one new profile it pays 1,500
// credits (capped like every credit change), leaves its burnt cells as a
// scar dated today, leaves the save, and the mission record counts it and
// gives the firefighter badge with the first. The fire's id must match, so
// it can never pay twice.
export function putOutFire(profile, fireId, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const heli = heliOf(profile), fire = heli.fire;
  if (!fire || fire.id !== fireId) return failure(profile, 'That fire is not burning.');
  if (fire.burning.length) return failure(profile, 'That fire is still burning.');
  const missions = heli.missions ?? createMissions(), firstBadge = !missions.badges.includes('firefighter');
  const counted = {...missions, firesOut: Math.min(MAX_COUNT, missions.firesOut + 1),
    badges: firstBadge ? [...missions.badges, 'firefighter'] : missions.badges};
  const next = {...withScar(heli, fire.courseId, heli.playDay.count, fire.burnt), fire: null, missions: counted};
  const wallet = credits(profile), total = Math.min(MAX_CREDITS, wallet + FIRE_MONEY.firePay);
  return {ok: true, profile: {...withHeli(profile, next), credits: total}, paid: total - wallet, firstBadge, firesOut: counted.firesOut};
}

// The fire in the save is lost: the course burns today and the fire leaves
// the save. No pay and no charge.
export function loseFire(profile, fireId, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const heli = heliOf(profile), fire = heli.fire;
  if (!fire || fire.id !== fireId) return failure(profile, 'That fire is not burning.');
  return {ok: true, profile: withHeli(profile, {...withBurn(heli, fire.courseId, heli.playDay.count), fire: null}), courseId: fire.courseId};
}

// Sarah's regrowth news was heard for a burnt course. Only forward: an
// earlier or repeated piece of news changes nothing.
export function hearBurnNews(profile, courseId, news, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const heli = heliOf(profile), entry = heli.burnt?.[courseId];
  if (!entry || !BURN_NEWS.includes(news)) return failure(profile, 'That course has no burn, or that is not regrowth news.');
  if (BURN_NEWS.indexOf(news) <= BURN_NEWS.indexOf(entry.heard)) return {ok: true, profile, already: true};
  return {ok: true, profile: withHeli(profile, {...heli, burnt: {...heli.burnt, [courseId]: {...entry, heard: news}}}), already: false};
}

// Buying a burnt course back early: a purchase, so the whole price or nothing.
export function buyBack(profile, courseId, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const heli = heliOf(profile), price = buybackPrice({heli}, courseId, playDayOf({heli}), {enabled});
  if (price === null) return failure(profile, 'That course is open.');
  const wallet = credits(profile);
  const short = price - wallet;
  if (short > 0) return failure(profile, `You need ${short.toLocaleString('en-US')} more credit${short === 1 ? '' : 's'}.`);
  const burnt = {...heli.burnt, [courseId]: {...heli.burnt[courseId], boughtBack: true}};
  return {ok: true, profile: {...withHeli(profile, {...heli, burnt}), credits: wallet - price}, price};
}

// A bucket hit: damage only gets worse until it is repaired (section 5.1).
export function damageBucket(profile, damage, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  if (!Number.isSafeInteger(damage) || damage < 0 || damage > 3) return failure(profile, 'That is not a bucket state.');
  const heli = heliOf(profile), now = heli.bucket?.damage ?? 0;
  if (damage <= now) return {ok: true, worse: false, profile};
  return {ok: true, worse: true, profile: withHeli(profile, {...heli, bucket: {damage}})};
}

// The repair at the pad: like every H1 repair it takes what the player has
// and forgives the rest, so nobody is left without a bucket.
export function repairBucket(profile, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const heli = heliOf(profile), damage = heli.bucket?.damage ?? 0;
  if (damage === 0) return {ok: true, repaired: false, charged: 0, forgiven: 0, profile};
  const charge = chargeRepair(profile, FIRE_MONEY.bucketRepair[damage], {enabled});
  return {ok: true, repaired: true, charged: charge.charged, forgiven: charge.forgiven,
    profile: withHeli(charge.profile, {...heli, bucket: {damage: 0}})};
}

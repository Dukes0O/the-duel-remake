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
const validCar = value => typeof value === 'string' && Object.hasOwn(CARS, value);
const tenthsOf = kg => Math.max(0, Math.min(TANK_TENTHS, Math.round(Number(kg) * 10)));
// 1.5 credits per kilogram is 0.15 credits per tenth, rounded up to a whole credit.
const priceOfTenths = tenths => Math.ceil(tenths * 15 / 100);

export function createHeli() {
  return {version: HELI_SAVE_VERSION, fuelKg: 0,
    lessons: {liftoff: false, hover: false, landing: false, carry: false},
    playDay: {last: null, count: 0}, jobs: {day: 0, taken: null, done: []},
    carsAt: {}, refuels: 0, flights: 0};
}

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
      if (validCar(car) && validCourse(course)) heli.carsAt[car] = course;
  }
  heli.refuels = count(value.refuels);
  heli.flights = count(value.flights);
  normalizeFireFields(value, heli);
  // Keys from a newer game are kept as they are, so going back one release
  // loses nothing (docs/HELI_FIRE.md section 12).
  for (const key of Object.keys(value))
    if (!Object.hasOwn(heli, key) && key !== '__proto__' && value[key] !== undefined) heli[key] = value[key];
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

// kg may be Infinity, which means fill up. The first tank is free.
export function buyFuel(profile, kg, {enabled} = {}) {
  if (enabled !== true) return off(profile);
  const heli = heliOf(profile), have = tenthsOf(heli.fuelKg), space = TANK_TENTHS - have;
  if (space <= 0) return failure(profile, 'The tank is full.');
  // Round down to a whole tenth, so asking for 0.19 kg buys 0.1 kg and never more than was asked.
  const asked = Number(kg) > 0 ? Math.floor(Math.min(Number(kg), HELI_MONEY.tankKg) * 10 + 1e-9) : 0;
  const wanted = Math.min(space, asked);
  if (wanted < 1) return failure(profile, 'Choose how much fuel to buy.');
  let tenths = wanted, cost = heli.refuels === 0 ? 0 : priceOfTenths(tenths);
  const wallet = credits(profile);
  if (cost > wallet) {
    // Buy only what the credits pay for.
    tenths = Math.floor(wallet * 20 / 3);
    if (tenths <= 0) return failure(profile, 'You need 1 more credit.');
    cost = priceOfTenths(tenths);
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
// play days, a scar after 40 (docs/HELI_FIRE.md sections 8.4 and 8.5).
function healed(heli) {
  const today = heli.playDay.count, next = {...heli};
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
  if (!validCar(carId) || !validCourse(courseId)) return failure(profile, 'That car or course is not known.');
  const heli = heliOf(profile);
  return {ok: true, profile: withHeli(profile, {...heli, carsAt: {...heli.carsAt, [carId]: courseId}})};
}

export function carAt(profile, carId, fallback = 'tremblant-woods') {
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
export const BUCKET_DAMAGE = Object.freeze(['whole', 'dented', 'torn', 'ruined']);
export const MAX_SCARS = 4;
// A fire holds at most 80 burning and burnt cells; damp lasts at most 2 steps.
export const MAX_FIRE_CELLS = 80;
const MAX_DAMP_STEPS = 2;
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

function normalizeMissions(value) {
  const call = value.call;
  const quiet = isObject(value.quiet) ? value.quiet : {};
  return {seed: seed32(value.seed), draws: count(value.draws), need: Math.min(count(value.need), 99), count: count(value.count),
    last: MISSION_KINDS.includes(value.last) ? value.last : null,
    call: isObject(call) && MISSION_KINDS.includes(call.kind) && validId(call.id) && validCourse(call.courseId)
      ? {kind: call.kind, id: call.id, courseId: call.courseId, day: count(call.day), answered: call.answered === true} : null,
    quiet: {untilDay: count(quiet.untilDay), engineSeconds: tenth(quiet.engineSeconds, MAX_COUNT)},
    firesOut: count(value.firesOut),
    badges: [...new Set((Array.isArray(value.badges) ? value.badges : []).filter(badge => BADGES.includes(badge)))]};
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
  return {id: value.id, courseId: value.courseId, seed: seed32(value.seed), startDay: count(value.startDay),
    steps: count(value.steps), engineSeconds: tenth(value.engineSeconds, MAX_COUNT), burning, burnt, damp};
}

function normalizeBurnt(value) {
  const out = {};
  for (const [courseId, entry] of Object.entries(value))
    if (validCourse(courseId) && isObject(entry)) out[courseId] = {day: count(entry.day), boughtBack: entry.boughtBack === true};
  return out;
}

const normalizeScars = value => value.filter(scar => isObject(scar) && validCourse(scar.courseId))
  .map(scar => ({courseId: scar.courseId, day: count(scar.day), cells: cellList(scar.cells).slice(0, MAX_FIRE_CELLS)}))
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

const fireOff = profile => ({ok: false, reason: FIRE_OFF, profile});

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

// A fire put out pays 1,500 credits, capped like every other credit change
// (section 7). The mission record counts the fire and gives the badge.
export function payFire(profile, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  const wallet = credits(profile), total = Math.min(MAX_CREDITS, wallet + FIRE_MONEY.firePay);
  return {ok: true, profile: {...profile, credits: total}, paid: total - wallet};
}

// A fire lost: the course burns on this play day (section 8.1).
export function burnCourse(profile, courseId, day, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  if (!validCourse(courseId) || !Number.isSafeInteger(day) || day < 0) return failure(profile, 'That course or day is not known.');
  const heli = heliOf(profile);
  return {ok: true, profile: withHeli(profile, {...heli, burnt: {...heli.burnt, [courseId]: {day: Math.min(MAX_COUNT, day), boughtBack: false}}})};
}

// A fire put out leaves its burnt cells as a scar; the oldest of more than four goes.
export function addScar(profile, courseId, day, cells, {enabled} = {}) {
  if (enabled !== true) return fireOff(profile);
  if (!validCourse(courseId) || !Number.isSafeInteger(day) || day < 0 || !Array.isArray(cells)) return failure(profile, 'That scar is not valid.');
  const heli = heliOf(profile), scar = {courseId, day: Math.min(MAX_COUNT, day), cells: cellList(cells).slice(0, MAX_FIRE_CELLS)};
  if (!scar.cells.length) return {ok: true, profile};
  return {ok: true, profile: withHeli(profile, {...heli, scars: [...(heli.scars ?? []), scar].slice(-MAX_SCARS)})};
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

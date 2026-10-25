// The Lab's save field, `profile.lab` (docs/LAB.md section 9), and every rule that writes it.
// Pure functions: a profile goes in and a new profile comes out; nothing is changed in place.
// Every function needs the `lab` switch (pass `{flags}`); with it off the profile is returned as it was.
import {CARS, COURSE} from '../config.js';
import {LAB_LESSONS, FREE_REWARDS, TUNE_SETTING_OF, TUNNEL_LESSONS, lessonOpenState} from './lab-lessons.js';

export const LAB_SAVE_VERSION = 1;
export const TUNE_SETTINGS = Object.freeze(['pressure', 'wing', 'brakes', 'springs', 'fuel']);
export const TUNED_BONUS = 400;
const MAX_CREDITS = 1_000_000_000;
const ID_PATTERN = /^[a-z0-9-]{1,40}$/;
// A stock lap is only judged against laps under the same rules (tyre-slip, engine-curve): its key is `car|course`, or
// `car|course|rules` for a race latched with rules, the rule names joined by `+` in alphabetical order. Names this
// game does not know (a later game's rules) are kept as they are and mean nothing here.
const RULES_PATTERN = /^[A-Za-z0-9_-]{1,24}(\+[A-Za-z0-9_-]{1,24}){0,7}$/;
// The most stock laps a save keeps: every car on every course under every rule set fits many times over.
const MAX_STOCK_LAPS = 4096;
export const stockKey = (carId, courseId, rules = '') => rules ? `${carId}|${courseId}|${rules}` : `${carId}|${courseId}`;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = (value, low, high, fallback) => Number.isSafeInteger(value) ? Math.max(low, Math.min(high, value)) : fallback;
const validCar = value => typeof value === 'string' && Object.hasOwn(CARS, value);
const validCourse = value => typeof value === 'string' && COURSE.some(stage => stage.id === value);
const credits = profile => Number.isFinite(profile?.credits) ? Math.max(0, Math.floor(profile.credits)) : 0;
const trueMap = value => {
  const map = {};
  if (isObject(value)) for (const [key, flag] of Object.entries(value)) if (flag === true && ID_PATTERN.test(key)) map[key] = true;
  return map;
};

export function createLab() {
  return {version: LAB_SAVE_VERSION, done: {}, owned: {}, ring: 0, ringBest: 0, cable: 15, tune: {}, stockLaps: {},
    tunedBonus: [], secret: {}};
}
const KNOWN_KEYS = new Set(Object.keys(createLab()));

// Every key is optional. A newer game's version is returned exactly as it was (and never written over);
// newer keys inside this version are kept as copies, so going back one release loses nothing.
export function normalizeLab(value) {
  if (isObject(value) && Number.isSafeInteger(value.version) && value.version > LAB_SAVE_VERSION) return value;
  if (!isObject(value) || value.version !== LAB_SAVE_VERSION) return createLab();
  const lab = createLab();
  lab.done = trueMap(value.done);
  lab.owned = trueMap(value.owned);
  lab.ringBest = whole(value.ringBest, 0, 3, 0);
  lab.ring = Math.min(lab.ringBest, whole(value.ring, 0, 3, 0));
  lab.cable = value.cable === 25 ? 25 : 15;
  if (isObject(value.tune)) {
    for (const [car, row] of Object.entries(value.tune)) {
      if (!validCar(car) || !isObject(row)) continue;
      lab.tune[car] = Object.fromEntries(TUNE_SETTINGS.map(name =>
        [name, Number.isSafeInteger(row[name]) && Math.abs(row[name]) <= 2 ? row[name] : 0]));
    }
  }
  if (isObject(value.stockLaps)) {
    for (const [key, seconds] of Object.entries(value.stockLaps)) {
      const [car, course, rules, extra] = key.split('|');
      if (extra === undefined && (rules === undefined || RULES_PATTERN.test(rules)) && validCar(car) && validCourse(course) &&
          Number.isFinite(seconds) && seconds > 0 && Object.keys(lab.stockLaps).length < MAX_STOCK_LAPS) lab.stockLaps[key] = seconds;
    }
  }
  lab.tunedBonus = [...new Set((Array.isArray(value.tunedBonus) ? value.tunedBonus : []).filter(validCourse))];
  if (isObject(value.secret) && value.secret.reverse === true) lab.secret = {reverse: true};
  for (const key of Object.keys(value)) {
    if (KNOWN_KEYS.has(key) || key === '__proto__' || value[key] === undefined) continue;
    try { lab[key] = structuredClone(value[key]); } catch { /* not plain data: dropped */ }
  }
  return lab;
}

// Reads the field without changing the profile. A profile with no field reads as an empty Lab.
export function labOf(profile) {
  return profile && Object.hasOwn(profile, 'lab') ? normalizeLab(profile.lab) : createLab();
}

const failure = (profile, reason) => ({ok: false, reason, profile});
// {lab} when the Lab (and, for tuning, `lab-tuning`) is on and this game can use the saved field, else {refusal} to hand back.
export function labReady(profile, flags, {tuning = false} = {}) {
  if (flags?.enabled?.('lab') !== true) return {refusal: failure(profile, 'The Lab is not available yet.')};
  // Tuning (settings, stock laps, the tuned-lap bonus) has its own switch, so the race feel is judged on its own.
  if (tuning && flags.enabled('lab-tuning') !== true) return {refusal: failure(profile, 'Tuning is not available yet.')};
  if (!isObject(profile)) return {refusal: failure(profile, 'Choose a player first.')};
  const lab = labOf(profile);
  if (lab.version !== LAB_SAVE_VERSION) return {refusal: failure(profile, 'This Lab progress belongs to another version.')};
  return {lab};
}
export const withLab = (profile, lab, extra = {}) => ({...profile, ...extra, lab});

// Marks a lesson passed (retaking one is fine), grants its free rewards, and for Projectile motion
// moves the drop ring down one when the pass was made with the best ring held (ring: the index used).
export function passLesson(profile, id, {flags, ring} = {}) {
  const {lab, refusal} = labReady(profile, flags);
  if (refusal) return refusal;
  const row = LAB_LESSONS.find(item => item.id === id);
  if (!row) return failure(profile, 'That lesson does not exist.');
  const state = lessonOpenState(profile, id, flags);
  if (!state.open) return failure(profile, state.note);
  const next = {...lab, done: {...lab.done, [id]: true}, owned: {...lab.owned}};
  for (const reward of FREE_REWARDS[id] ?? []) next.owned[reward] = true;
  if (id === 'projectile') {
    const used = Number.isSafeInteger(ring) ? ring : lab.ringBest;
    if (used === lab.ringBest && lab.ringBest < 3) { next.ringBest = lab.ringBest + 1; next.ring = next.ringBest; }
  }
  return {ok: true, reason: '', profile: withLab(profile, next)};
}

// The drop ring in use: 0 to 3 (12, 8, 5 m, none), any ring already earned.
export function setRing(profile, index, {flags} = {}) {
  const {lab, refusal} = labReady(profile, flags);
  if (refusal) return refusal;
  if (!Number.isSafeInteger(index) || index < 0 || index > lab.ringBest) return failure(profile, 'You have not earned that ring.');
  return {ok: true, reason: '', profile: withLab(profile, {...lab, ring: index})};
}

// The cable for the next flight: 15 m, or 25 m once Long cable is owned.
export function setCable(profile, metres, {flags} = {}) {
  const {lab, refusal} = labReady(profile, flags);
  if (refusal) return refusal;
  if (metres !== 15 && metres !== 25) return failure(profile, 'The cable is 15 or 25 metres.');
  if (metres === 25 && lab.owned['long-cable'] !== true) return failure(profile, 'Buy Long cable first.');
  return {ok: true, reason: '', profile: withLab(profile, {...lab, cable: metres})};
}

// One tuning step, -2 to +2, for one setting of one car. Each setting opens with its wind-tunnel lesson.
export function setTune(profile, carId, setting, step, {flags} = {}) {
  const {lab, refusal} = labReady(profile, flags, {tuning: true});
  if (refusal) return refusal;
  if (!validCar(carId)) return failure(profile, 'Choose a car.');
  if (CARS[carId].electric === true && setting === 'fuel' || CARS[carId].fanGrip && setting === 'wing')
    return failure(profile, 'This car has no setting for that.');
  const lessonId = TUNNEL_LESSONS.find(name => TUNE_SETTING_OF[name] === setting);
  if (!lessonId) return failure(profile, 'That is not a tuning setting.');
  if (!Number.isSafeInteger(step) || Math.abs(step) > 2) return failure(profile, 'A setting has five steps, -2 to +2.');
  if (lab.done[lessonId] !== true) return failure(profile, 'Pass the wind-tunnel lesson first.');
  const row = {...Object.fromEntries(TUNE_SETTINGS.map(name => [name, 0])), ...lab.tune[carId], [setting]: step};
  return {ok: true, reason: '', profile: withLab(profile, {...lab, tune: {...lab.tune, [carId]: row}})};
}

// Keeps the best (lowest) stock Time Trial lap for a car on a course, under the rules the race was latched with ('' for none).
export function recordStockLap(profile, carId, courseId, seconds, {flags, rules = ''} = {}) {
  const {lab, refusal} = labReady(profile, flags, {tuning: true});
  if (refusal) return refusal;
  if (!validCar(carId) || !validCourse(courseId)) return failure(profile, 'Choose a car and a course.');
  if (!Number.isFinite(seconds) || seconds <= 0) return failure(profile, 'A lap needs a time above zero.');
  if (rules !== '' && (typeof rules !== 'string' || !RULES_PATTERN.test(rules))) return failure(profile, 'Those rules are not known.');
  const key = stockKey(carId, courseId, rules), best = lab.stockLaps[key];
  if (best !== undefined && best <= seconds) return {ok: true, reason: '', profile};
  if (best === undefined && Object.keys(lab.stockLaps).length >= MAX_STOCK_LAPS) return failure(profile, 'There is no more room for stock laps.');
  return {ok: true, reason: '', profile: withLab(profile, {...lab, stockLaps: {...lab.stockLaps, [key]: seconds}})};
}

// The tuned-lap bonus: 400 credits, once per course (section 5.3). The caller has checked the 1% rule.
export function payTunedBonus(profile, courseId, {flags} = {}) {
  const {lab, refusal} = labReady(profile, flags, {tuning: true});
  if (refusal) return refusal;
  if (!validCourse(courseId)) return failure(profile, 'Choose a course.');
  if (lab.tunedBonus.includes(courseId)) return failure(profile, 'That course has paid its bonus.');
  return {ok: true, reason: '', bonus: TUNED_BONUS,
    profile: withLab(profile, {...lab, tunedBonus: [...lab.tunedBonus, courseId]}, {credits: Math.min(MAX_CREDITS, credits(profile) + TUNED_BONUS)})};
}

// The fan's REVERSE switch, once all five wind-tunnel lessons are passed (section 6).
export function markSecret(profile, {flags} = {}) {
  const {lab, refusal} = labReady(profile, flags);
  if (refusal) return refusal;
  if (!TUNNEL_LESSONS.every(id => lab.done[id] === true)) return failure(profile, 'There is nothing to find yet.');
  if (lab.secret.reverse === true) return {ok: true, reason: '', profile};
  return {ok: true, reason: '', profile: withLab(profile, {...lab, secret: {reverse: true}})};
}

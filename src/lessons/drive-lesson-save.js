// Optional lesson progress. Pure profile operations; no storage or race state.
import {CARS} from '../config.js';

// Lesson order, and the upgrade each pass gives (section 12.9). Lessons 2 to 4 are optional keys in the
// maps below: absent in older saves, written only when that lesson is first finished.
export const DRIVE_LESSON_ORDER = Object.freeze(['corner', 'line', 'gears', 'snow']);
export const DRIVE_LESSON_UPGRADE = Object.freeze({corner: 'brakes', line: 'handling', gears: 'engine', snow: 'tires'});
const REWARD_CREDITS = 600;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const empty = () => ({version: 1, done: {corner: false}, best: {corner: null}, rewarded: {corner: false}});
const failure = (profile, reason) => ({ok: false, changed: false, profile, reason, reward: null});

export function normalizeDrivingLessons(value) {
  // A newer version belongs to that build. Preserve it without trying to use it.
  if (object(value) && Number.isSafeInteger(value.version) && value.version > 1) return value;
  if (!object(value) || value.version !== 1) return empty();
  const done = object(value.done) ? value.done : {};
  const best = object(value.best) ? value.best : {};
  const rewarded = object(value.rewarded) ? value.rewarded : {};
  // Lesson 1 is always present. Lessons 2 to 4 are checked only when saved; an absent key stays absent.
  const checked = {done: {...done, corner: done.corner === true}, best: {...best, corner: validBest(best.corner)},
    rewarded: {...rewarded, corner: rewarded.corner === true}};
  for (const id of DRIVE_LESSON_ORDER.slice(1)) {
    if (Object.hasOwn(done, id)) checked.done[id] = done[id] === true;
    if (Object.hasOwn(best, id)) checked.best[id] = validBest(best[id]);
    if (Object.hasOwn(rewarded, id)) checked.rewarded[id] = rewarded[id] === true;
  }
  return {...value, version: 1, ...checked};
}

const validBest = value => Number.isFinite(value) && value >= 0 ? value : null;

// Whether a lesson can be played now. Corner is always open, line follows corner, gears follows line and
// waits for the engine-curve switch ("Opens later"), and snow follows gears, or line while gears is not open.
export function driveLessonAccess(drivingLessons, id, {engineCurve = false} = {}) {
  const index = DRIVE_LESSON_ORDER.indexOf(id);
  if (index < 0) return {open: false, reason: 'That driving lesson is not available.'};
  const done = normalizeDrivingLessons(drivingLessons).done;
  if (id === 'gears' && engineCurve !== true) return {open: false, reason: 'Opens later'};
  const before = id === 'snow' && engineCurve !== true ? 'line' : DRIVE_LESSON_ORDER[index - 1];
  if (before && done[before] !== true) return {open: false, reason: 'Finish the earlier lesson first.'};
  return {open: true, reason: ''};
}

function invalid(profile, id, carId) {
  if (!object(profile)) return 'Choose a player first.';
  if (!DRIVE_LESSON_ORDER.includes(id)) return 'That driving lesson is not available.';
  if (profile.drivingLessons != null && profile.drivingLessons.version !== 1)
    return 'This lesson progress belongs to another version.';
  if (typeof carId !== 'string' || !Object.hasOwn(CARS, carId) ||
      !Array.isArray(profile.unlockedCars) || !profile.unlockedCars.includes(carId))
    return 'Choose an unlocked car.';
  return '';
}

export function grantDriveLessonReward(profile, id, carId) {
  const reason = invalid(profile, id, carId);
  if (reason) return failure(profile, reason);
  const lessons = normalizeDrivingLessons(profile.drivingLessons);
  if (!lessons.done[id]) return failure(profile, 'Complete the lesson first.');
  if (lessons.rewarded[id]) return {ok: true, changed: false, profile, reason: '', reward: null};
  const levels = profile.upgrades?.[carId] ?? {};
  const type = DRIVE_LESSON_UPGRADE[id];
  const level = CARS[carId].factoryMaxed ? 3 :
    Math.max(0, Math.min(3, Math.floor(Number.isFinite(levels[type]) ? levels[type] : 0)));
  const reward = level >= 3 ? {kind: 'credits', credits: REWARD_CREDITS} : {kind: type, carId, level: level + 1};
  const paid = level >= 3
    ? {...profile, credits: Math.min(1_000_000_000, Math.max(0, profile.credits || 0) + REWARD_CREDITS)}
    : {...profile, upgrades: {...profile.upgrades, [carId]: {...levels, [type]: level + 1}}};
  return {ok: true, changed: true, reason: '', reward,
    profile: {...paid, drivingLessons: {...lessons, rewarded: {...lessons.rewarded, [id]: true}}}};
}

export function finishDriveLesson(profile, id, marginSeconds, carId, {engineCurve = false} = {}) {
  const reason = invalid(profile, id, carId);
  if (reason) return failure(profile, reason);
  if (!Number.isFinite(marginSeconds) || marginSeconds <= 0)
    return failure(profile, 'A completed challenge needs a positive winning margin.');
  const lessons = normalizeDrivingLessons(profile.drivingLessons);
  // A lesson that is already done can be retaken whatever the order says; a new one must be open.
  const access = driveLessonAccess(profile.drivingLessons, id, {engineCurve});
  if (!lessons.done[id] && !access.open) return failure(profile, access.reason);
  const best = Math.max(lessons.best[id] ?? 0, marginSeconds);
  const changed = !lessons.done[id] || lessons.best[id] !== best;
  const finished = changed ? {...profile, drivingLessons: {...lessons,
    done: {...lessons.done, [id]: true}, best: {...lessons.best, [id]: best}}} : profile;
  const granted = grantDriveLessonReward(finished, id, carId);
  return {...granted, changed: changed || granted.changed};
}

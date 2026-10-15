// Optional lesson progress. Pure profile operations; no storage or race state.
import {CARS} from '../config.js';

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
  return {...value, version: 1,
    done: {...done, corner: done.corner === true},
    best: {...best, corner: Number.isFinite(best.corner) && best.corner >= 0 ? best.corner : null},
    rewarded: {...rewarded, corner: rewarded.corner === true}};
}

function invalid(profile, id, carId) {
  if (!object(profile)) return 'Choose a player first.';
  if (id !== 'corner') return 'That driving lesson is not available.';
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
  const brakes = CARS[carId].factoryMaxed ? 3 :
    Math.max(0, Math.min(3, Math.floor(Number.isFinite(levels.brakes) ? levels.brakes : 0)));
  const reward = brakes >= 3 ? {kind: 'credits', credits: 600} : {kind: 'brakes', carId, level: brakes + 1};
  const paid = brakes >= 3
    ? {...profile, credits: Math.min(1_000_000_000, Math.max(0, profile.credits || 0) + 600)}
    : {...profile, upgrades: {...profile.upgrades, [carId]: {...levels, brakes: brakes + 1}}};
  return {ok: true, changed: true, reason: '', reward,
    profile: {...paid, drivingLessons: {...lessons, rewarded: {...lessons.rewarded, [id]: true}}}};
}

export function finishDriveLesson(profile, id, marginSeconds, carId) {
  const reason = invalid(profile, id, carId);
  if (reason) return failure(profile, reason);
  if (!Number.isFinite(marginSeconds) || marginSeconds <= 0)
    return failure(profile, 'A completed challenge needs a positive winning margin.');
  const lessons = normalizeDrivingLessons(profile.drivingLessons);
  const best = Math.max(lessons.best[id] ?? 0, marginSeconds);
  const changed = !lessons.done[id] || lessons.best[id] !== best;
  const finished = changed ? {...profile, drivingLessons: {...lessons,
    done: {...lessons.done, [id]: true}, best: {...lessons.best, [id]: best}}} : profile;
  const granted = grantDriveLessonReward(finished, id, carId);
  return {...granted, changed: changed || granted.changed};
}

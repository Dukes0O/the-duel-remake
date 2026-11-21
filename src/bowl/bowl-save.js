// Bowl career records and rewards. These pure profile operations do not touch
// the race, storage, or another part of the player's career.

import {secretOf} from './bowl-secrets.js';
import {isSchoolTrick} from './bowl-school.js';

export const BOWL_EVENTS = Object.freeze([
  'car-crush', 'freestyle', 'side-by-side', 'last-truck-rolling',
]);

const MAX_SCRAP = 1_000_000_000;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 180;
const uniqueIds = value => [...new Set((Array.isArray(value) ? value : []).filter(validId))];

function bowlOf(profile) {
  const saved = object(profile?.bowl) ? profile.bowl : {};
  const bestScores = {};
  if (object(saved.bestScores)) for (const [event, score] of Object.entries(saved.bestScores)) {
    if (BOWL_EVENTS.includes(event) && Number.isSafeInteger(score) && score >= 0)
      bestScores[event] = score;
  }
  return {
    ...saved,
    version: 1,
    bestScores,
    nightsWon: [...new Set((Array.isArray(saved.nightsWon) ? saved.nightsWon : [])
      .filter(night => Number.isSafeInteger(night) && night >= 1 && night <= 5))],
    trophies: uniqueIds(saved.trophies),
    paintOwned: uniqueIds(saved.paintOwned),
    boltOnsOwned: uniqueIds(saved.boltOnsOwned),
    settledNights: uniqueIds(saved.settledNights),
  };
}

const result = (profile, changed = false, reason) => ({
  ok: reason === undefined, changed, profile, ...(reason === undefined ? {} : {reason}),
});
const ownsNewerBowl = profile => Number.isSafeInteger(profile?.bowl?.version) && profile.bowl.version > 1;
// The purse goes into the Wasteland wallet, which only a version 1 career may be written to (as armor kits and crew do).
const ownsNewerWasteland = profile => Number.isSafeInteger(profile?.wasteland?.version) && profile.wasteland.version > 1;

export function foundBowlTricks(profile) {
  return uniqueIds(profile?.bowl?.foundTricks).filter(id => secretOf(id));
}
export function recordBowlSecret(profile, kind) {
  if (!object(profile) || profile.bowl != null && !object(profile.bowl) ||
      profile.bowl?.foundTricks != null && !Array.isArray(profile.bowl.foundTricks) || ownsNewerBowl(profile) || !secretOf(kind)) return result(profile, false, 'Unknown Bowl record.');
  const found = foundBowlTricks(profile);
  if (found.includes(kind)) return result(profile);
  return result({...profile, bowl: {...profile.bowl, foundTricks: [...(Array.isArray(profile.bowl?.foundTricks) ? profile.bowl.foundTricks : []), kind]}}, true);
}

export function bowlSchoolRecord(profile) {
  const record = profile?.bowl?.school;
  if (!object(record) || record.version !== 1) return {offered: false, completed: []};
  return {offered: record.offered === true, completed: uniqueIds(record.completed).filter(isSchoolTrick)};
}

export function recordBowlSchool(profile, {offered = false, completed = []} = {}) {
  const bowl = profile?.bowl, school = bowl?.school;
  if (!object(profile) || (bowl != null && !object(bowl)) || ownsNewerBowl(profile) ||
      (school != null && (!object(school) || school.version !== 1 ||
        (school.completed != null && !Array.isArray(school.completed)))) ||
      !Array.isArray(completed) || completed.some(kind => !isSchoolTrick(kind))) {
    return result(profile, false, 'Unknown Trick School record.');
  }
  const current = bowlSchoolRecord(profile);
  const nextOffered = current.offered || offered === true || completed.length > 0;
  const added = [...new Set(completed)].filter(kind => !current.completed.includes(kind));
  if (nextOffered === current.offered && !added.length) return result(profile);
  return result({...profile, bowl: {...bowl, school: {...school, version: 1, offered: nextOffered,
    completed: [...(school?.completed ?? []), ...added]}}}, true);
}

export function recordBowlScore(profile, event, score) {
  if (ownsNewerBowl(profile)) return result(profile, false, 'This Bowl save belongs to a newer version of the game.');
  if (!BOWL_EVENTS.includes(event) || !Number.isSafeInteger(score) || score < 0)
    return result(profile, false, 'Choose a Bowl event and a whole, non-negative score.');
  const bowl = bowlOf(profile), previous = bowl.bestScores[event] ?? -1;
  if (score <= previous) return result(profile);
  return result({...profile, bowl: {...bowl, bestScores: {...bowl.bestScores, [event]: score}}}, true);
}

// Pay each of the five show nights at most once. A loss remains retryable.
// Scrap uses the existing Wasteland wallet; only permanent Bowl awards live
// in profile.bowl.
export function settleBowlNight(profile, {night, won, scrap = 0, trophy = null,
    paint = null, boltOns = []} = {}) {
  if (ownsNewerBowl(profile)) return result(profile, false, 'This Bowl save belongs to a newer version of the game.');
  if (!Number.isSafeInteger(night) || night < 1 || night > 5 || typeof won !== 'boolean' ||
      !Number.isSafeInteger(scrap) || scrap < 0 || scrap > MAX_SCRAP ||
      (trophy !== null && !validId(trophy)) || (paint !== null && !validId(paint)) ||
      !Array.isArray(boltOns) || boltOns.some(id => !validId(id)))
    return result(profile, false, 'Choose a valid night and prize.');
  if (!won) return result(profile);
  if (ownsNewerWasteland(profile)) return result(profile, false, 'This Wasteland save belongs to a newer version of the game.');

  const bowl = bowlOf(profile), key = `night:${night}`;
  if (bowl.settledNights.includes(key)) return result(profile);
  const oldScrap = Number.isSafeInteger(profile?.wasteland?.scrap) && profile.wasteland.scrap >= 0
    ? Math.min(profile.wasteland.scrap, MAX_SCRAP) : 0;
  const wasteland = {...(object(profile?.wasteland) ? profile.wasteland : {}),
    scrap: Math.min(MAX_SCRAP, oldScrap + scrap)};
  return result({...profile, wasteland, bowl: {
    ...bowl,
    nightsWon: [...new Set([...bowl.nightsWon, night])],
    trophies: trophy === null ? bowl.trophies : uniqueIds([...bowl.trophies, trophy]),
    paintOwned: paint === null ? bowl.paintOwned : uniqueIds([...bowl.paintOwned, paint]),
    boltOnsOwned: uniqueIds([...bowl.boltOnsOwned, ...boltOns]),
    settledNights: [...bowl.settledNights, key],
  }}, true);
}

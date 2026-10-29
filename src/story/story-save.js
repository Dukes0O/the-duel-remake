// The Kogane Invitation's save (docs/story/kogane-invitation.md section 9). Pure profile operations; no storage,
// no race state. Optional field: read only when already saved, never created by loading, only by the first write.
// A newer version is kept exactly as it is and no step is shown or written against it.
import {CARS} from '../config.js';

export const KOGANE_SKYLINE = 'nissan_skyline_gtr_r34';
export const KOGANE_STEPS = Object.freeze(['invite', 'lesson', 'supplies', 'duel', 'ana', 'done']);
export const KOGANE_DUEL_LEVELS = Object.freeze(['easy', 'medium', 'hard']);
const FLAGS = Object.freeze(['read', 'lesson', 'supplies', 'ana']);

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const empty = () => ({version: 1, kogane: {}});
const newer = story => object(story) && Number.isSafeInteger(story.version) && story.version > 1;
const failure = (profile, reason) => ({ok: false, changed: false, profile, reason});
const NEWER = 'This story belongs to a newer version of the game.';

export function normalizeStory(value) {
  // A newer version belongs to that build. Keep it exactly, without trying to use it.
  if (newer(value)) return value;
  if (!object(value) || value.version !== 1) return empty();
  const kogane = object(value.kogane) ? {...value.kogane} : {};
  // Only the names already saved are checked; an absent name stays absent. Unknown names are kept.
  for (const flag of FLAGS) if (Object.hasOwn(kogane, flag)) kogane[flag] = kogane[flag] === true;
  if (Object.hasOwn(kogane, 'duel') && !KOGANE_DUEL_LEVELS.includes(kogane.duel)) delete kogane.duel;
  return {...value, version: 1, kogane};
}

// The player's story as saved, read only. A player with none reads as an empty story; nothing is added to the profile.
export function storyOf(profile) {
  return Object.hasOwn(profile ?? {}, 'story') ? normalizeStory(profile.story) : empty();
}

export const storyIsNewer = profile => newer(profile?.story);

// Where the player is in the chain. The first step not yet marked. null for a story from a newer game: nothing is shown.
export function koganeStep(profile) {
  const story = storyOf(profile);
  if (newer(story)) return null;
  const k = story.kogane;
  if (k.read !== true) return 'invite';
  if (k.lesson !== true) return 'lesson';
  if (k.supplies !== true) return 'supplies';
  if (!KOGANE_DUEL_LEVELS.includes(k.duel)) return 'duel';
  if (k.ana !== true) return 'ana';
  return 'done';
}

function write(profile, change) {
  if (!object(profile)) return failure(profile, 'Choose a player first.');
  if (storyIsNewer(profile)) return failure(profile, NEWER);
  const story = storyOf(profile);
  const next = change(story.kogane);
  if (typeof next === 'string') return failure(profile, next);
  if (next === null) return {ok: true, changed: false, profile, reason: ''};
  return {ok: true, changed: true, reason: '',
    profile: {...profile, story: {...story, kogane: {...story.kogane, ...next}}}};
}

// A flag only rises. `need` names the earlier mark that must be set; a save that skips a step is not repaired,
// but no writer follows the skip.
function raise(profile, flag, need, why) {
  return write(profile, kogane => {
    if (need && !(need === 'duel' ? KOGANE_DUEL_LEVELS.includes(kogane.duel) : kogane[need] === true)) return why;
    return kogane[flag] === true ? null : {[flag]: true};
  });
}

export const readKoganeLetter = profile => raise(profile, 'read');
export const markKoganeLesson = profile => raise(profile, 'lesson');
export const markKoganeSupplies = profile => raise(profile, 'supplies', 'lesson', 'Finish the driving lesson first.');
export const markKoganeAna = profile => raise(profile, 'ana', 'duel', 'Win the duel first.');

// The hardest CPU level won. Only moves easy to medium to hard.
export function markKoganeDuel(profile, level) {
  if (!KOGANE_DUEL_LEVELS.includes(level)) return failure(profile, 'Choose a duel level.');
  return write(profile, kogane => {
    if (kogane.supplies !== true) return 'Deliver the supplies first.';
    const had = KOGANE_DUEL_LEVELS.indexOf(kogane.duel);
    return KOGANE_DUEL_LEVELS.indexOf(level) > had ? {duel: level} : null;
  });
}

// Adds the car. A no-op when owned (`owned` says so). The car only exists while the `nissan-skyline` switch is on.
export function grantKoganeSkyline(profile) {
  if (!object(profile)) return failure(profile, 'Choose a player first.');
  if (!Object.hasOwn(CARS, KOGANE_SKYLINE)) return failure(profile, 'This car is not in this build.');
  if (Array.isArray(profile.unlockedCars) && profile.unlockedCars.includes(KOGANE_SKYLINE))
    return {ok: true, changed: false, profile, reason: '', owned: true};
  return {ok: true, changed: true, reason: '', owned: false,
    profile: {...profile, unlockedCars: [...(Array.isArray(profile.unlockedCars) ? profile.unlockedCars : []), KOGANE_SKYLINE]}};
}

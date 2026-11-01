// The stories' save (docs/story/kogane-invitation.md section 9, docs/story/wasteland-water-road.md section 9). Pure profile
// operations; no storage, no race state. Optional field: read only when already saved, never created by loading, only by
// the first write. A newer version is kept exactly as it is and no step is shown or written against it.
//
// Many stories, one field: `profile.story = {version: 1, <key>: {...}}`. A story registers itself once (`registerStory`) with its key,
// its steps and its writers, and then the shared rules below apply to it exactly as they do to Kogane: the field is made by the
// first write, marks only rise (each writer's own rule), unknown names inside a story and unknown stories are kept, and a
// newer version is never touched. Kogane registers itself at the bottom of this file.
import {CARS} from '../config.js';

export const KOGANE_SKYLINE = 'nissan_skyline_gtr_r34';
export const KOGANE_STEPS = Object.freeze(['invite', 'lesson', 'supplies', 'duel', 'ana', 'done']);
export const KOGANE_DUEL_LEVELS = Object.freeze(['easy', 'medium', 'hard']);
const FLAGS = Object.freeze(['read', 'lesson', 'supplies', 'ana']);

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const newer = story => object(story) && Number.isSafeInteger(story.version) && story.version > 1;
const failure = (profile, reason) => ({ok: false, changed: false, profile, reason});
const NEWER = 'This story belongs to a newer version of the game.';

// ---- The registry --------------------------------------------------------------------------------------------------------
// A story is registered with data and small pure functions:
//   key       'kogane', 'water'...: the name inside `profile.story` (lower case letters, digits and dashes)
//   steps     the step names, in order (for the story's own screens and tests)
//   normalize (entry) => entry: checks the saved names it knows and keeps the rest. Gets a copy; absent means `{}`.
//   stepOf    (entry) => the step the player is at, a name from `steps`
//   writers   {name: (entry, ...args) => change}: each returns the names to set (an object), a refusal (a string) or null
//             for "nothing to change". Run them with `writeStory(profile, key, name, ...args)`.
const STORIES = new Map();

export function registerStory({key, steps, normalize = entry => entry, stepOf, writers = {}} = {}) {
  if (typeof key !== 'string' || !/^[a-z][a-z0-9-]*$/.test(key)) throw new Error(`A story needs a key of lower case letters, digits and dashes, not ${JSON.stringify(key)}.`);
  if (STORIES.has(key)) throw new Error(`The story "${key}" is already registered.`);
  if (!Array.isArray(steps) || !steps.length || !steps.every(step => typeof step === 'string' && step)) throw new Error(`The story "${key}" needs a list of step names.`);
  if (typeof stepOf !== 'function' || typeof normalize !== 'function') throw new Error(`The story "${key}" needs a stepOf and a normalize function.`);
  if (!object(writers) || !Object.values(writers).every(writer => typeof writer === 'function')) throw new Error(`The story "${key}" has a writer that is not a function.`);
  STORIES.set(key, Object.freeze({key, steps: Object.freeze([...steps]), normalize, stepOf, writers: Object.freeze({...writers})}));
}
// Takes a story out again (for tests that register a throwaway story).
export const unregisterStory = key => STORIES.delete(key);
export const registeredStories = () => [...STORIES.values()];
export const storyDefinition = key => STORIES.get(key) ?? null;

const empty = () => {
  const story = {version: 1};
  for (const def of STORIES.values()) story[def.key] = def.normalize({});
  return story;
};

export function normalizeStory(value) {
  // A newer version belongs to that build. Keep it exactly, without trying to use it.
  if (newer(value)) return value;
  if (!object(value) || value.version !== 1) return empty();
  // Every registered story reads as a whole entry; unknown stories and unknown names are kept as they are.
  const story = {...value, version: 1};
  for (const def of STORIES.values()) story[def.key] = def.normalize(object(value[def.key]) ? {...value[def.key]} : {});
  return story;
}

// The player's story as saved, read only. A player with none reads as an empty story; nothing is added to the profile.
export function storyOf(profile) {
  return Object.hasOwn(profile ?? {}, 'story') ? normalizeStory(profile.story) : empty();
}

export const storyIsNewer = profile => newer(profile?.story);

// Where the player is in one story's chain. null for a story from a newer game, or one that is not registered: nothing is shown.
export function storyStepOf(profile, key) {
  const def = STORIES.get(key);
  if (!def) return null;
  const story = storyOf(profile);
  if (newer(story)) return null;
  return def.stepOf(story[key]);
}

// The one write every story uses. The profile it is given is never changed; the result carries the new one.
export function writeStory(profile, key, writerName, ...args) {
  const def = STORIES.get(key);
  if (!def || !Object.hasOwn(def.writers, writerName)) return failure(profile, 'This story step is not in this build.');
  if (!object(profile)) return failure(profile, 'Choose a player first.');
  if (storyIsNewer(profile)) return failure(profile, NEWER);
  const story = storyOf(profile);
  const next = def.writers[writerName](story[key], ...args);
  if (typeof next === 'string') return failure(profile, next);
  if (next === null) return {ok: true, changed: false, profile, reason: ''};
  // Only the story written is added: another registered story stays absent until its own first write.
  const saved = object(profile.story) && profile.story.version === 1 ? profile.story : {};
  return {ok: true, changed: true, reason: '',
    profile: {...profile, story: {...saved, version: 1, [key]: {...story[key], ...next}}}};
}

// ---- Kogane --------------------------------------------------------------------------------------------------------------
function normalizeKogane(kogane) {
  // Only the names already saved are checked; an absent name stays absent. Unknown names are kept.
  for (const flag of FLAGS) if (Object.hasOwn(kogane, flag)) kogane[flag] = kogane[flag] === true;
  if (Object.hasOwn(kogane, 'duel') && !KOGANE_DUEL_LEVELS.includes(kogane.duel)) delete kogane.duel;
  return kogane;
}

// Where the player is in the chain. The first step not yet marked.
function koganeStepOf(k) {
  if (k.read !== true) return 'invite';
  if (k.lesson !== true) return 'lesson';
  if (k.supplies !== true) return 'supplies';
  if (!KOGANE_DUEL_LEVELS.includes(k.duel)) return 'duel';
  if (k.ana !== true) return 'ana';
  return 'done';
}

// A flag only rises. `need` names the earlier mark that must be set; a save that skips a step is not repaired,
// but no writer follows the skip.
const raise = (flag, need, why) => kogane => {
  if (need && !(need === 'duel' ? KOGANE_DUEL_LEVELS.includes(kogane.duel) : kogane[need] === true)) return why;
  return kogane[flag] === true ? null : {[flag]: true};
};

registerStory({
  key: 'kogane',
  steps: KOGANE_STEPS,
  normalize: normalizeKogane,
  stepOf: koganeStepOf,
  writers: {
    read: raise('read'),
    lesson: raise('lesson'),
    supplies: raise('supplies', 'lesson', 'Finish the driving lesson first.'),
    ana: raise('ana', 'duel', 'Win the duel first.'),
    // The hardest CPU level won. Only moves easy to medium to hard.
    duel: (kogane, level) => {
      if (kogane.supplies !== true) return 'Deliver the supplies first.';
      const had = KOGANE_DUEL_LEVELS.indexOf(kogane.duel);
      return KOGANE_DUEL_LEVELS.indexOf(level) > had ? {duel: level} : null;
    },
  },
});

export const koganeStep = profile => storyStepOf(profile, 'kogane');

export const readKoganeLetter = profile => writeStory(profile, 'kogane', 'read');
export const markKoganeLesson = profile => writeStory(profile, 'kogane', 'lesson');
export const markKoganeSupplies = profile => writeStory(profile, 'kogane', 'supplies');
export const markKoganeAna = profile => writeStory(profile, 'kogane', 'ana');

export function markKoganeDuel(profile, level) {
  if (!KOGANE_DUEL_LEVELS.includes(level)) return failure(profile, 'Choose a duel level.');
  return writeStory(profile, 'kogane', 'duel', level);
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

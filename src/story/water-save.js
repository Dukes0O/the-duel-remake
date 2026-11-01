// The Water Road's save (docs/story/wasteland-water-road.md section 9). Pure
// profile operations; no storage, no race state. `profile.story.water` is
// optional: read only when saved, made by the first write (the shared rules of
// story-save.js). Marks only rise. A chapter is done when its warlord is beaten
// in `profile.wasteland` (read, never copied), so the ladder's progress is the
// story's progress. Nothing here touches scrap, XP, hold or warlord records.
import {WARLORD_LADDER} from '../warlords.js';
import {registerStory, storyOf, storyIsNewer, writeStory} from './story-save.js';

export const WATER_KEY = 'water';

// Chapter n (1 to 8) belongs to WARLORD_LADDER[n - 1]. Each job is one game in a
// mode the player already knows; the Baron's chapter is his fight alone.
const JOBS = [
  {kind: 'race', mode: 'wasteland', courses: ['pacific-canyon', 'red-mesa']},
  {kind: 'arena', mode: 'fuel-run', venueId: 'scrapdome', rank: 6, flag: 'fuel-run'},
  {kind: 'arena', mode: 'bounty-hunt', venueId: 'scrapdome', rank: 9, flag: 'bounty-hunt'},
  {kind: 'arena', mode: 'ambush-alley', venueId: 'pit', rank: 12, flag: 'ambush-alley'},
  {kind: 'arena', mode: 'last-car-rolling', venueId: 'scrapdome'},
  {kind: 'race', mode: 'wasteland', courses: ['alpine-serpent']},
  {kind: 'arena', mode: 'convoy-raid', venueId: 'salt-flats', rank: 9, flag: 'convoy-raid'},
  null,
];
export const WATER_CHAPTERS = Object.freeze([
  Object.freeze({n: 0, id: 'well', warlordId: null, job: null}),
  ...JOBS.map((job, index) => Object.freeze({n: index + 1, id: WARLORD_LADDER[index], warlordId: WARLORD_LADDER[index],
    job: job && Object.freeze({...job, ...(job.courses ? {courses: Object.freeze([...job.courses])} : {})})})),
]);
const JOB_IDS = WATER_CHAPTERS.filter(chapter => chapter.job).map(chapter => chapter.warlordId);
// V.'s notes come after chapters 1 to 7; the Baron's chapter ends with Vesper herself.
export const WATER_NOTE_COUNT = 7;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const defeated = (profile, id) => profile?.wasteland?.warlords?.[id]?.defeated === true ||
  Array.isArray(profile?.wasteland?.warlords?.defeated) && profile.wasteland.warlords.defeated.includes(id);

function normalizeWater(water) {
  // Only names already saved are checked; an absent name stays absent; unknown names are kept.
  for (const flag of ['read', 'end']) if (Object.hasOwn(water, flag)) water[flag] = water[flag] === true;
  if (Object.hasOwn(water, 'jobs')) water.jobs = Array.isArray(water.jobs)
    ? water.jobs.filter((id, index, list) => typeof id === 'string' && id && list.indexOf(id) === index) : [];
  // A higher count is kept as saved: a later build may show more notes (chapter 9).
  if (Object.hasOwn(water, 'notes') && !(Number.isSafeInteger(water.notes) && water.notes >= 0)) delete water.notes;
  return water;
}

registerStory({
  key: WATER_KEY,
  steps: ['note', 'road', 'end'],
  normalize: normalizeWater,
  // Only the saved marks: where the chapters stand is read from the ladder (waterChapter).
  stepOf: water => water.read !== true ? 'note' : water.end !== true ? 'road' : 'end',
  writers: {
    read: water => water.read === true ? null : {read: true},
    job: (water, id) => {
      if (water.read !== true) return 'Read Hollis\'s note first.';
      if (!JOB_IDS.includes(id)) return 'That chapter has no job.';
      const jobs = water.jobs ?? [];
      return jobs.includes(id) ? null : {jobs: [...jobs, id]};
    },
    notes: (water, count) => {
      if (!Number.isSafeInteger(count) || count < 0 || count > WATER_NOTE_COUNT) return 'Choose how many notes were shown.';
      return count > (water.notes ?? 0) ? {notes: count} : null;
    },
    end: water => water.read !== true ? 'Read Hollis\'s note first.' : water.end === true ? null : {end: true},
  },
});

// The player's Water Road marks as saved (read only; an absent field reads as empty).
// A newer game's story reads as empty here: nothing is shown from it and nothing written.
export const waterOf = profile => (storyIsNewer(profile) ? null : storyOf(profile)[WATER_KEY]) ?? {};

// A chapter is done: chapter 0 when the note is read, the others when their warlord is beaten.
export function waterChapterDone(profile, n) {
  const chapter = WATER_CHAPTERS[n];
  if (!chapter) return false;
  return chapter.warlordId ? defeated(profile, chapter.warlordId) : waterOf(profile).read === true;
}
// A chapter's job is done when it was won as the story's job, or the warlord is already beaten.
export function waterJobDone(profile, n) {
  const chapter = WATER_CHAPTERS[n];
  if (!chapter?.job) return false;
  return defeated(profile, chapter.warlordId) || (waterOf(profile).jobs ?? []).includes(chapter.warlordId);
}
// A chapter opens when the one before is done.
export const waterChapterOpen = (profile, n) => n === 0 || n > 0 && n < WATER_CHAPTERS.length && waterChapterDone(profile, n - 1);
// The first chapter not done, or WATER_CHAPTERS.length when all eight warlords are beaten. null for a newer story.
export function waterChapter(profile) {
  if (storyIsNewer(profile)) return null;
  const at = WATER_CHAPTERS.findIndex(chapter => !waterChapterDone(profile, chapter.n));
  return at === -1 ? WATER_CHAPTERS.length : at;
}
// V.'s notes earned: one after each of chapters 1 to 7 that is done.
export const waterNotesDue = profile => WATER_CHAPTERS.slice(1, WATER_NOTE_COUNT + 1)
  .filter(chapter => waterChapterDone(profile, chapter.n)).length;

export const readWaterNote = profile => writeStory(profile, WATER_KEY, 'read');
// Marks a chapter's job won, once the chapter before it is done.
export function markWaterJob(profile, warlordId) {
  if (storyIsNewer(profile)) return writeStory(profile, WATER_KEY, 'job', warlordId);
  const chapter = WATER_CHAPTERS.find(item => item.warlordId === warlordId);
  if (!chapter?.job) return {ok: false, changed: false, profile, reason: 'That chapter has no job.'};
  if (!waterChapterOpen(profile, chapter.n)) return {ok: false, changed: false, profile, reason: 'Finish the chapter before first.'};
  return writeStory(profile, WATER_KEY, 'job', warlordId);
}
export const markWaterNotes = (profile, count) => writeStory(profile, WATER_KEY, 'notes', count);
// Hollis's end lines, once all eight warlords are beaten.
export function markWaterEnd(profile) {
  if (storyIsNewer(profile)) return writeStory(profile, WATER_KEY, 'end');
  if (waterChapter(profile) !== WATER_CHAPTERS.length) return {ok: false, changed: false, profile, reason: 'Beat Baron Blackiron first.'};
  return writeStory(profile, WATER_KEY, 'end');
}

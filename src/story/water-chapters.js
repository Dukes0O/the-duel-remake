// The Water Road's chapters (docs/story/wasteland-water-road.md section 9), as data only. Reading them registers no story:
// the story itself is registered by src/story/water-save.js, which re-exports this list. Code that needs only the
// chapters (src/story/water-easy.js, read inside the race and fight rules) imports them from here, so loading the game
// never registers the Water Road as a side effect (the night check of 28 November 2026).
import {WARLORD_LADDER} from '../warlords.js';

// Chapter n (1 to 9) belongs to WARLORD_LADDER[n - 1]. Each job is one game in a
// mode the player already knows; the Baron's chapter and Magnus's (chapter 9) are
// their fights alone.
const JOBS = [
  {kind: 'race', mode: 'wasteland', courses: ['pacific-canyon', 'red-mesa']},
  {kind: 'arena', mode: 'fuel-run', venueId: 'scrapdome', rank: 6, flag: 'fuel-run'},
  {kind: 'arena', mode: 'bounty-hunt', venueId: 'scrapdome', rank: 9, flag: 'bounty-hunt'},
  {kind: 'arena', mode: 'ambush-alley', venueId: 'pit', rank: 12, flag: 'ambush-alley'},
  {kind: 'arena', mode: 'last-car-rolling', venueId: 'scrapdome'},
  {kind: 'race', mode: 'wasteland', courses: ['alpine-serpent']},
  {kind: 'arena', mode: 'convoy-raid', venueId: 'salt-flats', rank: 9, flag: 'convoy-raid'},
  null,
  null,
];
export const WATER_CHAPTERS = Object.freeze([
  Object.freeze({n: 0, id: 'well', warlordId: null, job: null}),
  ...JOBS.map((job, index) => Object.freeze({n: index + 1, id: WARLORD_LADDER[index], warlordId: WARLORD_LADDER[index],
    job: job ? Object.freeze({...job, ...(job.courses ? {courses: Object.freeze([...job.courses])} : {})}) : null})),
]);

import {makeRng} from '../rng.js';
import {WATER_CHAPTERS} from './water-save.js';

export const WATER_EASY_RACES = Object.freeze({paceMin: .65, paceMax: 1.6});

export function waterRacePace(duel) {
  return waterEasy(duel) && !duel.state.arena
    ? makeRng(duel.seed ^ 0x77617465).range(WATER_EASY_RACES.paceMin, WATER_EASY_RACES.paceMax) : 1;
}

// A run marker, never a saved setting. Ordinary events and other difficulties
// keep their released rules, even after a story rematch or NEXT CIRCUIT.
export function waterEasy(duel, mark = duel.waterRoadJob) {
  const state = duel.state;
  if (!mark || duel.waterRoadJob !== mark || state.cpuDifficulty !== 'easy' ||
      state.mode !== 'wasteland' || !duel.featureFlags.enabled('water-road')) return false;
  const chapter = WATER_CHAPTERS.find(chapter => chapter.id === mark);
  if (!chapter) return false;
  if (state.arena?.mode === 'warlord') return state.arena.warlordId === chapter.warlordId;
  const job = chapter.job;
  return job?.kind === 'arena'
    ? state.arena?.mode === job.mode && state.arena.venueId === job.venueId
    : job?.kind === 'race' && !state.arena && job.courses.includes(duel.course?.def.id);
}

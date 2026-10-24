// The Falcone Sirena as a car (docs/THE_DEEP.md 6.2 and 12): where it is in the story, and the Coast Cup.
// Pure: no storage, no clock. The raise and its pay are deep-sirena.js; the restore is the Lab's (LAB-RESTORE adds
// the car to `unlockedCars`); this module only reads them and settles the cup.
import {normalizeDeep} from './deep-discovery.js';
import {recordCoastCup} from './deep-sirena.js';

export const SIRENA_CAR = 'falcone_sirena';
export const COAST_CUP_COURSE = 'pacific-canyon';
// Modes the cup counts in: the ordinary ones, like the Deep's own finish counter, and the Grand Prix.
const CUP_MODES = Object.freeze(['duel', 'timetrial', 'grandprix']);

// 'wreck' (not raised yet), 'waiting' (raised, not restored: the garage shows it under a sheet, "Needs the Lab"),
// 'restored' (the Lab has made it the player's car) or 'cupDone' (the Coast Cup finished in it).
export function sirenaState(profile) {
  const deep = normalizeDeep(profile?.deep);
  if (deep.coastCup === true) return 'cupDone';
  if (Array.isArray(profile?.unlockedCars) && profile.unlockedCars.includes(SIRENA_CAR)) return 'restored';
  return (deep.raised ?? []).includes('sirena-car') ? 'waiting' : 'wreck';
}

// A counted finish (any place) on Pacific Canyon in the Sirena pays the cup, once. `finish` is what the settlement
// already knows: {enabled (the-deep), valid (a valid, non-qualifying, non-practice finish), eventId, car, mode}.
// Returns {profile, paid, events}: paid is 0 and the profile the very same object when nothing counts.
export function settleCoastCup(profile, finish = {}) {
  const none = {profile, paid: 0, events: []};
  if (finish.enabled !== true || finish.valid !== true || finish.car !== SIRENA_CAR ||
      finish.eventId !== COAST_CUP_COURSE || !CUP_MODES.includes(finish.mode)) return none;
  if (!Array.isArray(profile?.unlockedCars) || !profile.unlockedCars.includes(SIRENA_CAR)) return none;
  const cup = recordCoastCup(profile, {enabled: true});
  return cup.ok && cup.paid > 0 ? {profile: cup.profile, paid: cup.paid, events: cup.events} : none;
}

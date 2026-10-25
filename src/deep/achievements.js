import {getPaintState} from '../paint-presets.js';

const SIRENA = 'falcone_sirena';
const resultIds = ['wreck-racer', 'coast-cup-as-found', 'coast-cup-restored'];
const definitions = [
  ['raised-from-the-deep', 'Raised from the Deep', 'Something lies beyond the old boat ramp.', 'Raised the Falcone Sirena from the sea.'],
  ['she-runs-again', 'She runs again', 'A patient pair of hands can wake an old engine.', 'Got the Sirena running again.'],
  ['wreck-racer', 'Wreck racer', 'An old racer still has a finish line to cross.', 'Finished a race in the Sea wreck finish.'],
  ['coast-cup-as-found', 'Coast Cup as found', 'Let the coast see her as she is.', 'Won at Pacific Canyon in the Sea wreck finish.'],
  ['restored', 'Restored', 'There is colour beneath the years.', 'Owns the Restored 1966 finish.'],
  ['coast-cup-restored', 'Coast Cup restored', 'Bring a little old glory back to the coast.', 'Won at Pacific Canyon in the Restored 1966 finish.'],
];

// Optional and bounded: old profiles never gain a field on load.
export function normalizeAchievements(value) {
  const rows = [];
  for (const row of Array.isArray(value) ? value : []) {
    if (resultIds.includes(row?.id) && Number.isSafeInteger(row.at) && row.at > 0 &&
        row.at <= 8640000000000000 && !rows.some(saved => saved.id === row.id))
      rows.push({id: row.id, at: row.at});
  }
  return rows;
}

export function achievementShelf(profile, {enabled = false, labEnabled = false} = {}) {
  if (!enabled) return [];
  const owned = profile?.unlockedCars?.includes(SIRENA) === true;
  const restored = owned && getPaintState(profile, SIRENA, {labEnabled: true, deepEnabled: true}).owned.includes('restored-1966');
  const facts = {
    'raised-from-the-deep': profile?.deep?.raised?.includes('sirena-car') === true,
    'she-runs-again': owned,
    restored,
  };
  const recorded = normalizeAchievements(profile?.achievements);
  return definitions.filter((_, index) => labEnabled || index === 0).map(([id, name, hint, how]) => {
    const result = recorded.find(row => row.id === id);
    return {id, name, hint, how, earned: facts[id] === true || !!result, at: result?.at ?? null};
  });
}

// Called only inside settlement, after its validity and duplicate guards.
export function recordRaceAchievements(profile, result, {valid = false, eventId, at} = {}) {
  if (!valid || result.deepEnabled !== true || result.labEnabled !== true ||
      result.car !== SIRENA || !profile.unlockedCars?.includes(SIRENA)) return profile;
  const ids = [];
  if (result.raceFinish === 'sea-wreck') ids.push('wreck-racer');
  if (result.won === true && eventId === 'pacific-canyon' && ['duel', 'timetrial', 'grandprix'].includes(result.mode)) {
    if (result.raceFinish === 'sea-wreck') ids.push('coast-cup-as-found');
    if (result.raceFinish === 'restored-1966') ids.push('coast-cup-restored');
  }
  const rows = normalizeAchievements(profile.achievements);
  const added = ids.filter(id => !rows.some(row => row.id === id)).map(id => ({id, at}));
  return added.length ? {...profile, achievements: normalizeAchievements([...rows, ...added])} : profile;
}

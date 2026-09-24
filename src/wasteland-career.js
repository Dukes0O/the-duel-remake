// Career rules are independent of the renderer and browser storage.
export const TERRITORIES = Object.freeze({
  sal: {name: 'Sawtooth Sal', courses: ['pacific-canyon', 'red-mesa']},
  dustmonger: {name: 'The Dustmonger', courses: ['high-country', 'ridge-rally']},
  mirage: {name: 'Mother Mirage', courses: ['azure-riviera']},
  gunn: {name: 'Gearhead Gunn', courses: ['eifel-crown']},
  kettle: {name: 'Kettle Kingpin', courses: ['titan-arena'], venues: ['scrapdome']},
  vultures: {name: 'The Twin Vultures', courses: ['alpine-serpent']},
  tollkeeper: {name: 'The Tollkeeper', courses: ['neon-docks'], venues: ['salt-flats']},
  blackiron: {name: 'Baron Blackiron', courses: ['harbor-highlands', 'cloudbreak-skyway']},
});

const courseTerritories = new Map(Object.entries(TERRITORIES)
  .flatMap(([id, territory]) => territory.courses.map(course => [course, id])));

export const territoryForCourse = courseId => courseTerritories.get(courseId) ?? null;
const count = (value, maximum) => Number.isSafeInteger(value) && value > 0
  ? Math.min(value, maximum) : 0;

export function scrapForResult(result, {finished = false, won = false} = {}) {
  if (!finished || result?.mode !== 'wasteland' ||
      result?.combatRewardsEnabled !== true) return 0;
  return 80 + (won ? 120 : 0) + count(result.hitsLanded, 10) * 15 +
    count(result.wrecksCaused, 4) * 60 + count(result.salvageCollected, 3) * 25;
}

export function applyWastelandResult(wasteland, result, courseId,
    {finished = false, won = false} = {}) {
  if (wasteland?.version !== 1 || wasteland.discoveredGate !== true ||
      result?.mode !== 'wasteland' || result?.combatRewardsEnabled !== true ||
      !finished) return {wasteland, scrapEarned: 0, territory: null};
  const earned = scrapForResult(result, {finished, won});
  const scrap = Math.min(1_000_000_000, (wasteland.scrap || 0) + earned);
  const territory = won ? territoryForCourse(courseId) : null;
  const territories = {...wasteland.territories};
  if (territory) {
    const previous = territories[territory] || {hold: 0, claimed: false};
    territories[territory] = {...previous,
      hold: Math.min(100, previous.hold + 25)};
  }
  return {wasteland: {...wasteland, scrap, territories},
    scrapEarned: scrap - (wasteland.scrap || 0), territory};
}

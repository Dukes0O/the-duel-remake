// FAR-RAIN: where it rains. View only: nothing here reads or writes a race rule.
//
// Rain belongs to a region, and each region has its own switch in src/feature-flags.js, so that one place can be
// opened to players without another. A race course is never a region: rain is only ever drawn in a world job, and a
// released course id is refused outright, so every released course stays exactly as it is.
//
// Which region the player is in comes from, in this order: `state.weatherRegion` (for a region that sets it itself),
// the current world-job step's `region`, then the arena's `region`. A step may also ask for `weather: 'rain'` or
// `weather: 'rain-night'` in a region that does not always rain.
export const RAIN_REGIONS = Object.freeze({
  // The far side of The Teeth (docs/story/the-far-side.md): it has always rained there.
  'far-side': Object.freeze({switch: 'far-rain', always: true}),
});
export const RAIN_WEATHERS = Object.freeze(['rain', 'rain-night']);

export function rainRegion(id) {
  return typeof id === 'string' && Object.hasOwn(RAIN_REGIONS, id) ? RAIN_REGIONS[id] : null;
}

// Where the state says the player is, read only.
export function rainPlace(state, course) {
  if (!state || state.status === 'menu' || state.status === 'heli' || state.deepJourney?.committed) return null;
  const arena = state.arena;
  if (arena?.mode !== 'world-job') return null;
  const job = arena.worldJob?.job;
  const step = job?.steps?.[job.stepIndex] ?? null;
  return {
    regionId: state.weatherRegion ?? step?.region ?? arena.region ?? null,
    weather: step?.weather ?? arena.weather ?? null,
    courseId: course?.def?.id ?? null,
  };
}

// True when the rain should fall here. `enabled` is the switch test (featureFlags.enabled); `released` is the set of
// released course ids. `forcedRegion` is the QA harness's region, used in place of the one the state gives.
export function rainWanted(place, {enabled = () => false, released = new Set(), forcedRegion = null} = {}) {
  if (!place) return false;
  if (place.courseId != null && released.has(place.courseId)) return false;
  const region = rainRegion(forcedRegion ?? place.regionId);
  if (!region || !enabled(region.switch)) return false;
  return region.always === true || RAIN_WEATHERS.includes(place.weather);
}

export function rainAtNight(place) {
  return place?.weather === 'rain-night';
}

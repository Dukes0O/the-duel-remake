import {TERRITORIES} from './wasteland-career.js';

const details = Object.freeze({
  sal: {reward: 'Side Saws'},
  dustmonger: {reward: 'Smoke Screen'},
  mirage: {reward: 'Decoy Drone'},
  gunn: {},
  kettle: {},
  vultures: {},
  tollkeeper: {},
  blackiron: {},
});

export const WARLORDS = Object.freeze(Object.fromEntries(
  Object.entries(TERRITORIES).map(([id, territory]) => [id, Object.freeze({
    id,
    name: territory.name,
    territoryId: id,
    courses: Object.freeze([...territory.courses]),
    venues: Object.freeze([...(territory.venues ?? [])]),
    ...details[id],
  })]),
));

// A fight belongs here only after its complete implementation ships. The
// territory map uses this list instead of trusting progress saved by a newer build.
export const BUILT_WARLORD_IDS = Object.freeze([]);

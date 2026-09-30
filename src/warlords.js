import {TERRITORIES} from './wasteland-career.js';

const details = Object.freeze({
  sal: {reward: 'Side Saws', rewardBuilt: true, car: 'banshee_muscle', brain: 'rammer',
    taunt: 'Let us see how long those doors last.'},
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

// Only formats with a playable entry belong here. Signature moves and reward
// settlement have their own cards; a saved future defeat never builds a fight.
export const BUILT_WARLORD_IDS = Object.freeze(['sal']);

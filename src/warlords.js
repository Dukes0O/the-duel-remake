import {TERRITORIES} from './wasteland-career.js';

const details = Object.freeze({
  sal: {reward: 'Side Saws', rewardBuilt: true, rewardKit: 'side-saws', car: 'banshee_muscle',
    brain: 'rammer', taunt: 'Let us see how long those doors last.'},
  dustmonger: {reward: 'Smoke Screen', rewardBuilt: true, rewardWeapon: 'smoke',
    car: 'dusthawk_rally', brain: 'gunner', taunt: 'Follow me into the dust. I dare you.'},
  mirage: {reward: 'Decoy Drone'},
  gunn: {},
  kettle: {reward: 'Titan warlord kit and Tusk', rewardBuilt: true,
    rewardKit: 'warlord', rewardKitCar: 'titan_monster', rewardCrew: 'tusk',
    car: 'titan_monster', brain: 'rammer', taunt: 'Stand still. It hurts less.'},
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
// Ladder order sets warlord pay (docs/SCRAPDOME.md section 5).
export const WARLORD_LADDER = Object.freeze([
  'sal', 'dustmonger', 'mirage', 'gunn', 'kettle', 'vultures', 'tollkeeper', 'blackiron',
]);

export const BUILT_WARLORD_IDS = Object.freeze(['sal', 'dustmonger', 'kettle']);

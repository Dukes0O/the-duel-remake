import {TERRITORIES} from './wasteland-career.js';

const details = Object.freeze({
  sal: {reward: 'Side Saws', rewardBuilt: true, rewardKit: 'side-saws', car: 'banshee_muscle',
    brain: 'rammer', taunt: 'Let us see how long those doors last.'},
  dustmonger: {reward: 'Smoke Screen', rewardBuilt: true, rewardWeapon: 'smoke',
    car: 'dusthawk_rally', brain: 'gunner', taunt: 'Follow me into the dust. I dare you.'},
  mirage: {reward: 'Decoy Drone', rewardBuilt: true, rewardWeapon: 'decoy', car: 'aurora_gt', brain: 'gunner',
    taunt: 'Which one of me are you looking at?'},
  gunn: {venue: 'pit', reward: 'Rocket Pods and turret look', rewardBuilt: true,
    rewardWeapon: 'rockets', rewardKit: 'turret-look',
    car: 'stuttgart_959s', brain: 'kiter', taunt: 'Keep driving. My turret can keep up.'},
  kettle: {reward: 'Titan warlord kit and Tusk', rewardBuilt: true,
    rewardKit: 'warlord', rewardKitCar: 'titan_monster', rewardCrew: 'tusk',
    car: 'titan_monster', brain: 'rammer', taunt: 'Stand still. It hurts less.'},
  // Two buggies fighting as a pair (docs/SCRAPDOME.md section 5). The Dusthawk
  // Rally is the lightest car with the right look until a buggy model exists.
  // Armor is 0.9 times (not the usual 1.5); phase two follows their second wreck.
  vultures: {venue: 'pit', reward: 'Jax grapple +10 m', rewardBuilt: true,
    rewardGear: Object.freeze({crew: 'jax', id: 'grapple-reach', metres: 10}),
    car: 'dusthawk_rally', brain: 'hunter', armorScale: .9, phaseTwoWrecks: 2,
    team: Object.freeze([Object.freeze({car: 'dusthawk_rally', brain: 'hunter', name: 'Vulture One'}),
      Object.freeze({car: 'dusthawk_rally', brain: 'hunter', name: 'Vulture Two'})]),
    taunt: 'Two of us. One of you. Do the math.'},
  tollkeeper: {venue: 'salt-flats', format: 'convoy-raid',
    vehicleName: 'Armored tanker',
    car: 'stuttgart_959s', brain: 'convoy-rig', armorScale: 1,
    reward: 'Convoy kit', rewardBuilt: true, rewardKit: 'warlord', rewardKitAnyCar: true,
    team: Object.freeze([Object.freeze({car: 'stuttgart_959s', brain: 'convoy-rig', name: 'Tollkeeper'}),
      Object.freeze({car: 'dusthawk_rally', brain: 'guard', name: 'Escort One'}),
      Object.freeze({car: 'aurora_gt', brain: 'guard', name: 'Escort Two'})]),
    taunt: 'This road has a price.'},
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

export const BUILT_WARLORD_IDS = Object.freeze(['sal', 'dustmonger', 'mirage', 'gunn', 'kettle', 'vultures', 'tollkeeper']);

// Jax's grapple reaches this much farther once the Twin Vultures are beaten.
// Earned means the saved defeat itself, as with the Side Saws; the crew
// system (CREW-02) reads this when Jax becomes active.
export function jaxGrappleBonusMetres(profile) {
  return profile?.wasteland?.warlords?.vultures?.defeated === true ? WARLORDS.vultures.rewardGear.metres : 0;
}

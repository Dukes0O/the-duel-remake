// OPEN-BURNED-PEN's placements at the Rats' Nest: the spots its beats name beside the Nest's own (the look's layout and
// OPEN-BURNED-SCOUT's lookouts), the guard's round, and the people in the pen while the growers are held. The Nest's look
// and cut ground stay unchanged. Every spot is in the site's metres, as the layout's are.
import {LAND} from '../../scablands-names.js';
import {RATS_NEST_LAYOUT} from '../looks/rats-nest-look.js';
import {buildBurnedScout} from './burned-scout.js';
import burned from '../../../story/threads/content/burned-camp.js';

const SPOTS = {
  // Inside the ring of wrecks, between the gate and the growers.
  'pen-inside': {x: 1, z: -24},
  // Just outside the ring on the east side, where a break-out slips out between two wrecks.
  'pen-slip': {x: 11.8, z: -28},
  // The player's car at the end of the row of buggies, with the wheels off one side.
  'held-car': {x: 14, z: 35.3, heading: Math.PI},
  // Three hiding places a break-out passes on the way to the drain: by a wreck, by a lean-to and by a wreck.
  'hide-1': {x: 13.6, z: -19.5},
  'hide-2': {x: 12.4, z: -4},
  'hide-3': {x: 15.5, z: 15.5},
  // Where the six buggies stand when they come out of their bays, a car's length in front of them.
  ...Object.fromEntries(RATS_NEST_LAYOUT.bays.map((bay, index) => [`bay-front-${index + 1}`, {x: bay.x, z: bay.z - 7.8, heading: Math.PI}])),
};
export const BURNED_PEN = Object.freeze({spots: Object.freeze(Object.fromEntries(Object.entries(SPOTS).map(([id, spot]) =>
  [id, Object.freeze(spot)])))});

// The guard is the storyline's: his round is a routine like anybody's (section 13), written in the drain's rule, and the
// same row walks his figure here, on the land's clock, so that the lamp and the man are in one place.
export const PEN_GUARD = burned.beats.drain.mission.rule.guards[0];

const spotOf = id => BURNED_PEN.spots[id] ?? RATS_NEST_LAYOUT.spots[id];
// A Nest spot as a place in the land, the way OPEN-BURNED-SCOUT writes its people.
export function nestPlace(id, land = LAND) {
  const {nest} = buildBurnedScout(land), base = land.at('boneyard'), spot = spotOf(id);
  return ['boneyard', nest.x - base.x + spot.x, nest.z - base.z + spot.z];
}

// The growers sit in the pen while the Road Rats hold them. Finch and two growers are gone once they came out with
// the player; Finch alone once he broke out.
const HELD = ['sign', 'clues', 'scout', 'rim', 'alone', 'drain', 'pen', 'waiting', 'ransom', 'break-out', 'offer', 'home', 'rescue'];
const CAPTIVES = [['marigold', 'captive-2'], ['finch', 'captive-9'], ['grower-1', 'captive-1'], ['grower-2', 'captive-3'],
  ['grower-3', 'captive-6']];
export function penPeople(world) {
  const record = world.open.threads['burned-camp'];
  if (!record || record.end || record.cast?.enemy !== 'road-rats' || !HELD.includes(record.beat) ||
      !world.ledger.marks.includes('burned-camp/burned')) return [];
  const marks = world.ledger.marks;
  const drained = marks.includes('burned-camp/drain-out'), broke = marks.includes('burned-camp/broke-out');
  // Those waved along on a break-out (`waved-along-1` to `-3`) come out with Finch, the first grower first.
  const waved = ['grower-1', 'grower-2', 'grower-3'].filter((_, index) => marks.includes('burned-camp/waved-along-' + (index + 1)));
  const gone = new Set([...(drained ? ['finch', 'grower-1', 'grower-2'] : []), ...(broke ? ['finch', ...waved] : [])]);
  const captives = CAPTIVES.filter(([id]) => !gone.has(id)).map(([id, spot]) => ({id: 'pen/' + id, figure: id, talk: null,
    routine: {day: {kind: 'post', at: nestPlace(spot), yaw: RATS_NEST_LAYOUT.spots[spot].heading, task: 'sit'}}}));
  const {round, pace} = PEN_GUARD;
  const guard = {id: 'pen/guard', figure: 'road-rat-lamp', talk: null, routine: {pace, day: {...round,
    stops: round.stops.map(stop => ({...stop, at: nestPlace(stop.at[1])}))}}};
  return [...captives, guard];
}

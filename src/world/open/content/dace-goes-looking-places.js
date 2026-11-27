import story from '../../../story/threads/content/dace-goes-looking.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {LAND} from '../../scablands-names.js';

export const DACE_ID = story.id;
export const daceMark = id => DACE_ID + '/' + id;
export const daceMarked = (world, id) => world.ledger.marks.includes(daceMark(id));
export const daceMorning = part => ['dawn', 'day'].includes(part ?? 'day');

const spots = {
  pickup: LAND.at('tin-town', -4, -40),
  dace: LAND.at('tin-town', -1.7, -40),
  moss: LAND.at('tin-town', -7.8, -37.8),
  rell: LAND.at('tin-town', 2, -35),
  wim: LAND.at('tin-town', 3.7, -36),
  radiator: LAND.at('tin-town', -2.65, -37.9),
  spare: LAND.at('tin-town', -2.65, -42),
  radio: LAND.at('tin-town', -2.65, -39.8),
  key: LAND.at('tin-town', -6.3, -41.75),
  get hearth() { return NIGHT_2_SITES.hearthFront.position; },
  get gate() { return NIGHT_2_SITES.gate; },
  start: LAND.at('tin-town', -25, 105),
  'first-fork': LAND.at('tin-town', -25, 315),
  'gate-at-dusk': LAND.at('tin-town', -25, 75),
  'his-tracks': LAND.at('tin-town', -25, 430),
  hill: LAND.between('tin-town', 'boneyard', .24, 19, 132),
  stones: LAND.between('tin-town', 'boneyard', .4, 30, 73),
  rocks: LAND.between('tin-town', 'boneyard', .47, 38, 33),
  walking: LAND.between('tin-town', 'boneyard', .33, 38, 66),
  den: LAND.at('boneyard', -162, -903),
};

export const DACE_PLACES = Object.freeze(spots);
const person = id => ({id, figure: id, home: 'tin-town', talk: id});
export const DACE_CAST = Object.freeze(['dace', 'moss', 'rell', 'wim', 'auntie-solder'].map(person));

export function dacePeople(world, morning, mission) {
  const record = world.open.threads[DACE_ID];
  if (!record) return [];
  if (record.end) {
    const waitingReport = record.end === 'never-asked' && world.ledger.night - record.began >= story.sign.lastsNights + 2 &&
      !daceMarked(world, 'later/rell-on-dace-waiting');
    return waitingReport ? [{...DACE_CAST[2], position: LAND.at('tin-town', -22, 58)}] : [];
  }
  const {beat, began} = record;
  const sign = beat === 'sign' && world.ledger.night - began < story.sign.lastsNights && morning;
  if (sign || ['asking', 'ready', 'radio-check', 'telling', 'leaving', 'key'].includes(beat)) {
    return DACE_CAST.filter(row => row.id !== 'auntie-solder').map(row => sign && row.id === 'dace' ?
      {...row, position: spots.pickup, elevation: 1.22, task: 'sit'} : {...row, position: spots[row.id]});
  }
  if (beat === 'search' && mission?.id === DACE_ID + '/fetch' && mission.state.phase === 'pickup')
    return [{...DACE_CAST[0], position: mission.state.route.pickup}];
  if (['hearth', 'late', 'he-took-it', 'he-stayed', 'key-was-taken'].includes(beat))
    return DACE_CAST.filter(row => row.id !== 'moss' && (beat !== 'late' || row.id !== 'dace'))
      .map((row, index) => ({...row, position: LAND.at('tin-town', 26.25 + index * 1.35, 8.375)}));
  if (['away', 'call', 'late', 'search', 'together', 'he-took-it'].includes(beat))
    return [{id: 'dace', absent: true}];
  return [];
}

export function daceStop(rule) {
  // The authored conditions on these lines are also the order in which the
  // trouble happened. Keep route selection and the spoken account in agreement.
  const lines = story.beats.search.mission.lines;
  const reason = ['hill', 'stones', 'rocks', 'the-place'].find((_, index) => rule.ask(lines[index].when));
  return {reason: reason ?? 'walking', walking: rule.ask({fact: 'mark', id: daceMark('walked')})};
}

export function daceRescuePlaces(rule, site) {
  const {reason, walking} = daceStop(rule);
  const truck = reason === 'the-place' ? site : spots[reason];
  const at = reason === 'rocks' || walking ? spots[walking ? 'walking' : 'rocks'] : truck;
  return {reason, truck, at, walking};
}

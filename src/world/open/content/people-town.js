import {checkFact} from '../facts.js';
import {checkPerson, requireSound} from '../check-tables.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {LAND} from '../../scablands-names.js';

const at = (east, south) => ['tin-town', east, south];
const post = (east, south, task = 'stand') => ({kind: 'post', at: at(east, south), task});
const wander = (east, south, radius) => ({kind: 'wander', around: at(east, south), radius, pause: [4, 9]});
const track = (...stops) => ({kind: 'track', loop: true, stops: stops.map(([east, south, seconds = 0, task = 'stand', travelTask, yaw]) =>
  ({at: at(east, south), seconds, task, travelTask, yaw}))});
const inside = {fact: 'mark', id: 'walkers-inside'};
const resident = (id, day, dusk, dark, needs) => ({id, figure: id, home: 'tin-town',
  routine: {day, dusk, dark}, talk: id, needs});
const background = (id, day, dusk, dark) => ({...resident(id, day, dusk, dark), talk: null});

const centre = LAND.at('tin-town');
const offset = ({x, z}) => [x - centre.x, z - centre.z];
const hearth = [26.25, 8.375];
const kiln = [31, 7];
const store = offset(NIGHT_2_SITES.storeApproach.position);
const pump = offset(NIGHT_2_SITES.pump.position);
const gate = offset(NIGHT_2_SITES.gate);
// Waypoints use the open lanes between the service yard, the pump and the gate.
const middle = [11, 14];
const northLane = [2, -28];
const southLane = [-14, 37];
const washingLines = [16.25, -53];

export const TOWN_PEOPLE = Object.freeze(requireSound([
  resident('auntie-solder',
    track([...hearth, 40, 'cook'], middle, [10.5, 28], [...store, 20], [17, 14], [18, -15], northLane,
      [...pump, 15], [-20, -20], southLane, [...gate, 20, 'stand', undefined, 0], [-4, 36], [13, 23]),
    post(...hearth, 'cook'), post(25.5, 9.5, 'sleep')),
  resident('cinder',
    track([...kiln, 60, 'cook', 'haul-sack'], [16, 7, 0, 'stand', 'haul-sack'],
      [12, 23, 0, 'stand', 'haul-sack'], [...store, 8, 'haul-sack'], [13, 16], [17, 7]),
    post(...kiln, 'bank-kiln'), post(29.5, 8.5, 'sleep')),
  resident('rell', track([-12, -29, 24], [-12, -34, 10]), post(-12, -32), post(-12, -35, 'sit'), inside),
  resident('dace', track([-20, -32, 15], [-20, -27, 8]), wander(-20, -31, 2), post(-20, -34, 'sit'), inside),
  resident('wim', wander(-7, -34, 2), wander(-7, -35, 1.4), post(-7, -36, 'sleep'), inside),
], row => [...checkPerson(row), ...(row.needs ? checkFact(row.needs) : [])], 'Tin Town routines'));

// These ambient figures have no ledger or dialogue entries.
export const TOWN_BACKGROUND = Object.freeze([
  background('tin-cook',
    track([7, 20], [24, 11, 18, 'cook'], [19, 3], [12, 11], [13, 24], [27, 18, 10]),
    post(24, 11, 'cook'), post(24, 13, 'sleep')),
  background('tin-porter',
    track([-9, 35, 0, 'stand', 'haul-sack'], [-23, 58, 12, 'haul-sack'], [-8, 29],
      [27, 19, 10, 'haul-sack', 'haul-sack']),
    post(-23, 58, 'sit'), post(25, 17, 'sleep')),
  background('tin-child',
    track([5, -54], [...washingLines, 8], [6, -54], [5, -34], [-17, -36, 10, 'carry-bucket', 'carry-bucket'],
      [-4, -30, 0, 'stand', 'carry-bucket'], [3, -32]),
    wander(-19, -36, 2), post(-18, -34, 'sleep')),
]);

// The remaining eight walkers have figures but no ledger IDs. They are
// background cast whose presence follows Rell's table row.
export const WALKER_COMPANIONS = Object.freeze(Array.from({length: 8}, (_, index) => {
  const id = 'walker-' + (index + 1);
  const east = -29 + (index % 4) * 4;
  const south = -22 + Math.floor(index / 4) * 6;
  return {...resident(id, track([east, south, 20], [east, south + 1.5, 10]),
    post(east, south + 1), post(east, south, 'sit'), inside), talk: null};
}));

import {checkFact} from '../facts.js';
import {checkPerson, requireSound} from '../check-tables.js';

const at = (east, south) => ['tin-town', east, south];
const post = (east, south, task = 'stand') => ({kind: 'post', at: at(east, south), task});
const wander = (east, south, radius) => ({kind: 'wander', around: at(east, south), radius, pause: [4, 9]});
const track = (...stops) => ({kind: 'track', loop: true, stops: stops.map(([east, south, seconds, task = 'stand']) =>
  ({at: at(east, south), seconds, task}))});
const inside = {fact: 'mark', id: 'walkers-inside'};
const resident = (id, day, dusk, dark, needs) => ({id, figure: id, home: 'tin-town',
  routine: {day, dusk, dark}, talk: id, needs});

export const TOWN_PEOPLE = Object.freeze(requireSound([
  resident('auntie-solder', track([26.25, 8.375, 24], [24, 9, 8]), post(26.25, 8.375), post(25.5, 9.5, 'sit')),
  resident('cinder', track([28.5, 8.5, 20], [31, 7, 18]), wander(30, 8, 1.5), post(29.5, 8.5)),
  resident('rell', track([-12, -29, 24], [-12, -34, 10]), post(-12, -32), post(-12, -35, 'sit'), inside),
  resident('dace', track([-20, -32, 15], [-20, -27, 8]), wander(-20, -31, 2), post(-20, -34, 'sit'), inside),
  resident('wim', wander(-7, -34, 2), wander(-7, -35, 1.4), post(-7, -36, 'sleep'), inside),
], row => [...checkPerson(row), ...(row.needs ? checkFact(row.needs) : [])], 'Tin Town routines'));

// The remaining eight walkers have figures but no ledger IDs. They are
// background cast whose presence follows Rell's table row.
export const WALKER_COMPANIONS = Object.freeze(Array.from({length: 8}, (_, index) => {
  const id = 'walker-' + (index + 1);
  const east = -29 + (index % 4) * 4;
  const south = -22 + Math.floor(index / 4) * 6;
  return {...resident(id, track([east, south, 20], [east, south + 1.5, 10]),
    post(east, south + 1), post(east, south, 'sit'), inside), talk: null};
}));

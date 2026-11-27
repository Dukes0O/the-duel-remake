import {checkPerson, requireSound} from '../check-tables.js';
import {MARKET_FIGURES} from './market-day-places.js';

const there = (home, spot) => [home, spot];
const post = (home, spot, action = 'stand') => ({kind: 'post', at: there(home, spot), action});
const track = (home, stops, action = 'walk') => ({kind: 'track', action,
  stops: stops.map(([spot, seconds, move, action]) => ({at: there(home, spot), seconds, move, action}))});
const wander = (home, spot, radius) => ({kind: 'wander', around: there(home, spot), radius, pause: [2, 5]});
const person = (id, home, day, dusk, dark, other = {}) => ({id, figure: id, home, routine: {day, dusk, dark}, ...other});
const glasshouse = 'glasshouse', radio = 'radio-hill';
const stove = wander(glasshouse, 'stove', 8);
const sleep = post(glasshouse, 'tent', 'sleep');

export const SITES_PEOPLE = Object.freeze(requireSound([
  person('marigold', glasshouse, track(glasshouse, [['marigold', 5], ['frames', 5], ['pump', 5], ['tent', 5]]), stove, sleep),
  person('finch', glasshouse, track(glasshouse, [['cart', 4], ['pump', 5], ['row-end', 8]], 'push-cart'), stove, sleep),
  person('grower-1', glasshouse, post(glasshouse, 'hoe-1', 'hoe'), stove, post(glasshouse, 'stove', 'sit')),
  person('grower-2', glasshouse, track(glasshouse, [['tent', 6, 'carry-frame'], ['frames', 5], ['hoe-2', 12, 'walk', 'sit']]), stove, sleep),
  person('grower-3', glasshouse, track(glasshouse, [['tent-west', 6, 'carry-frame'], ['frames-west', 5], ['hoe-3', 12, 'walk', 'hoe']]), stove, sleep),
  person('hetty', radio, track(radio, [['door', 115], ['lookout', 12]]), post(radio, 'door', 'sit'), post(radio, 'door', 'sit')),
  person('bern', radio, track(radio, [['generator', 8], ['mast', 10], ['door', 7]]), post(radio, 'bench', 'sit'), post(radio, 'bed', 'sleep')),
  person('gasket', 'bus-ring', post('bus-ring', 'gasket', 'stand'), post('bus-ring', 'table', 'sit'),
    post('bus-ring', 'bunk', 'sleep'), {figure: MARKET_FIGURES.gasket}),
], checkPerson, 'Camp people'));

export const campPeople = site => SITES_PEOPLE.filter(person => person.home === site);

// The approved same-level Mall route. All coordinates are relative to the existing Dead Mall landmark.
import {LAND} from '../../scablands-names.js';
import dryPump from '../../../story/threads/content/dry-pump.js';

const mall = (x, z) => ['dead-mall', x, z];
export const DRY_PUMP_SPOTS = Object.freeze(Object.fromEntries(Object.entries({
  'car-park': [68, -19], 'east-front': [58, -24], 'north-side': [30, -32], 'south-side': [37, 32],
  gallery: [31, -23], hall: [42, -17], fountain: [39.5, -4], 'staff-door': [41, 8],
  'penny-pipe': [44, 11], 'shoe-shop': [60, -4], 'tunnel-door': [41, 29],
  'lamp-west': [47, -9], 'lamp-east': [55, 4], 'truck-east': [68, 31], 'truck-north': [45, -38],
}).map(([id, point]) => [id, LAND.at(...mall(...point))])));

export const DRY_PUMP_SOLIDS = Object.freeze([
  // Broken walls, three shop fronts, the low fountain and the backs of four dead lorries.
  ['west-wall', 25, -7, .6, 16, 3.5], ['north-wall', 45, -23, 9, .55, 2.8],
  ['east-wall', 64, -8, .6, 10, 3.2], ['shoe-wall', 59, 2, 5, .55, 2.6],
  ['shop-one', 38, -19, 2.8, .5, 2.5], ['shop-two', 50, -19, 2.8, .5, 2.5],
  ['fountain', 43, -4, 2.6, 2.4, .85], ['staff-west', 38, 13, .55, 6, 2.7],
  ['staff-east', 48, 13, .55, 5, 2.7], ['staff-north', 45, 7, 3, .48, 2.7],
  ['lorry-one', 32, 25, 1.35, 3.3, 2.3], ['lorry-two', 35.5, 25, 1.35, 3.3, 2.3],
  ['lorry-three', 46, 26, 1.35, 3.3, 2.3], ['lorry-four', 49.5, 26, 1.35, 3.3, 2.3],
].map(([id, x, z, halfX, halfZ, height]) => ({id: 'dry-pump/' + id, kind: id.startsWith('lorry') ? 'wreck' : 'building',
  shape: 'box', ...LAND.at(...mall(x, z)), halfX, halfZ, height})));

const valve = ['dead-mall', 'shoe-shop'];
const staff = ['dead-mall', 'staff-door'];
const park = ['dead-mall', 'car-park'];
// Each cone takes four seconds to pass the shopfront. Their centres pass 24 seconds apart.
const lamps = ['lamp-west', 'lamp-east'].map((name, i) => {
  const lamp = DRY_PUMP_SPOTS[name], shop = DRY_PUMP_SPOTS['shoe-shop'];
  const bearing = Math.atan2(shop.x - lamp.x, shop.z - lamp.z);
  return {at: ['dead-mall', name], turnsIn: 48, phase: bearing / (Math.PI * 2) - (2 + 24 * i) / 48};
});

export const DRY_PUMP_MISSIONS = Object.freeze({
  'dry-pump/mall': {rule: {lamps, coneDegrees: 30, range: 18, seenSeconds: 2, caughtSeconds: 6,
    cover: ['dead-mall', 'fountain'], coverRadius: 4.25}},
  'dry-pump/mall/hall': {by: 'foot', rule: {destination: staff, within: 2.4,
    retreat: ['dead-mall', 'east-front'], escape: 'ran-out', success: 'not-seen', spotted: 'seen'}},
  'dry-pump/mall/shoe-shop': {by: 'foot', rule: {pickup: valve, destination: staff, within: 2.4,
    success: 'not-seen', spotted: 'seen', caught: 'caught', eject: ['dead-mall', 'east-front']}},
  'dry-pump/mall/road-out': {by: 'car', enemy: 'ash-men', rule: {road: true, destination: park, within: 12,
    riders: [['dead-mall', 'truck-east'], ['dead-mall', 'truck-north']], pursuitMetres: 2000,
    success: 'clear', spotted: 'outrun', wrecked: 'wrecked'}},
  'dry-pump/second-trip': {by: 'foot', rule: {lamps, coneDegrees: 30, range: 18, seenSeconds: 2, caughtSeconds: 6,
    cover: ['dead-mall', 'fountain'], coverRadius: 4.25, pickup: valve, destination: ['dead-mall', 'penny-pipe'],
    within: 2.4, wrenchSeconds: 10, success: 'brought-down', spotted: 'seen-and-brought-down', caught: 'caught',
    eject: ['dead-mall', 'east-front']}},
});

const post = (id, figure, x, z, task) => {
  const work = {kind: 'post', at: mall(x, z), task};
  return {id, figure, home: 'dead-mall', routine: {day: work, dusk: work, dark: work}, talk: id};
};
export const DRY_PUMP_PEOPLE = Object.freeze([
  post('mr-penny', 'walker-3', 42, 10, 'stand'),
  post('clinker', 'clinker', 47.85, -9, 'sit'),
  post('slack', 'clinker', 55.85, 4, 'sit'),
  {id: 'nan-tallow', figure: 'moss', home: 'tin-town', talk: 'nan-tallow',
    routine: {day: {kind: 'post', at: ['tin-town', -9, -33], task: 'stand'}}},
]);

export const DRY_PUMP_TALK = Object.freeze(dryPump.later);
export const mallPlace = place => Array.isArray(place) && place[0] === 'dead-mall' ? DRY_PUMP_SPOTS[place[1]] : null;

export const DRY_PUMP_CAMP = Object.freeze({id: 'bus-ring', at: ['ridge', -1900, -1600],
  spots: {pump: {x: 3, z: 0}, door: {x: 0, z: 0}, lookout: {x: -3, z: 9}}});

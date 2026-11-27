// The open Scablands' register (docs/story/open-scablands.md, section 12): every people, person, group, place, site,
// scarce thing and word under one id and one name. A table or a storyline that uses a name not listed here is refused
// by src/world/open/check-tables.js, so that two writers cannot give one thing two names. Adding a row here is how a
// new name comes into the game.
import {FEUD_WORDS, STORY_PEOPLE} from '../../story/people.js';
import {SCABLANDS_PLACES} from '../scablands.js';

export {FEUD_WORDS};
export const FRIEND_WORDS = Object.freeze(['Cold', 'Wary', 'Strangers', 'Friendly', 'Sworn']);

// A people has a word for the player. A group can also come to a checkpoint, and a group with `feud` keeps a feud.
// A person belongs to a people (`of`).
const people = (id, extra = {}) => Object.freeze({id, name: STORY_PEOPLE[id], kind: 'people', ...extra});
const person = (id, of, extra = {}) => Object.freeze({id, name: STORY_PEOPLE[id], kind: 'person', of, ...extra});
export const NAMES = Object.freeze([
  people('tin-town', {leader: 'auntie-solder'}),
  person('auntie-solder', 'tin-town'), person('cinder', 'tin-town'), person('odessa', 'tin-town'),
  person('moss', 'tin-town'), person('dot', 'tin-town'),
  people('walkers', {leader: 'rell'}),
  person('rell', 'walkers'), person('dace', 'walkers'), person('wim', 'walkers'),
  people('glasshouse', {leader: 'marigold', thing: 'her glass frames'}),
  person('marigold', 'glasshouse'), person('finch', 'glasshouse'),
  person('grower-1', 'glasshouse'), person('grower-2', 'glasshouse'), person('grower-3', 'glasshouse'),
  people('radio-hill', {leader: 'hetty', thing: 'the set'}),
  person('hetty', 'radio-hill'), person('bern', 'radio-hill'),
  people('bus-ring', {leader: 'gasket', thing: 'their tools'}),
  person('gasket', 'bus-ring'),
  people('deck-folk', {leader: 'captain-imre'}),
  person('captain-imre', 'deck-folk'), person('fathom', 'deck-folk'), person('sprat', 'deck-folk'),
  person('kedge', 'deck-folk'), person('wick', 'deck-folk'),
  people('ash-men', {group: true, feud: true, leader: 'old-smoke'}),
  person('old-smoke', 'ash-men'), person('clinker', 'ash-men'), person('slack', 'ash-men'),
  people('road-rats', {group: true, feud: true, leader: 'sump'}),
  person('sump', 'road-rats'), person('lug', 'road-rats'), person('parrot', 'road-rats'),
  people('water-men', {group: true, feud: true, leader: 'mrs-vane'}),
  person('mrs-vane', 'water-men'), person('miss-pell', 'water-men'),
  people('traders', {group: true}),
  person('nan-tallow', 'traders'), person('tally', 'traders'),
  people('seaview', {leader: 'mr-penny', thing: 'his keys'}),
  person('mr-penny', 'seaview'),
  people('travellers', {group: true}),
  person('sumps-rider', 'road-rats'),
]);
const byId = new Map(NAMES.map(row => [row.id, row]));
// tools/test-open-shared.mjs holds this list to src/story/people.js, name for name.

export const PEOPLES = Object.freeze(NAMES.filter(row => row.kind === 'people').map(row => row.id));
export const PERSONS = Object.freeze(NAMES.filter(row => row.kind === 'person').map(row => row.id));
export const GROUPS = Object.freeze(NAMES.filter(row => row.group).map(row => row.id));
export const FEUD_GROUPS = Object.freeze(NAMES.filter(row => row.feud).map(row => row.id));
// The Ash Men's feud is the one a ledger has kept since Night 2, under the old name `feud`.
export const OLD_FEUD_GROUP = 'ash-men';

// The eight places that are always on the map.
export const PLACES = Object.freeze(SCABLANDS_PLACES.map(place => place.id));
export const TIN_TOWN_SPOTS = Object.freeze(['hearth', 'yard', 'gate', 'board', 'store', 'forge-yard', 'kiln']);

// Sites: places a player has to find (section 16). A site's first stage is its kind.
export const SITE_KINDS = Object.freeze(['camp', 'well', 'ruin', 'lookout', 'den']);
export const SITE_STAGES = Object.freeze([...SITE_KINDS, 'outpost', 'town', 'burned', 'rebuilt', 'empty']);
const site = (id, name, kind, peopleId = null) => Object.freeze({id, name, kind, people: peopleId});
export const SITES = Object.freeze([
  site('glasshouse', 'The Glasshouse', 'camp', 'glasshouse'),
  site('radio-hill', 'Radio Hill', 'camp', 'radio-hill'),
  site('bus-ring', 'The Bus Ring', 'camp', 'bus-ring'),
  site('sweet-seep', 'The Sweet Seep', 'well'),
  site('deep-sign', 'The Deep Sign', 'well'),
  site('hangar', 'The Hangar', 'ruin'),
  site('crows-step', "The Crow's Step", 'lookout'),
  site('rats-nest', "The Rats' Nest", 'den', 'road-rats'),
  site('grey-camp', 'The Grey Camp', 'den', 'ash-men'),
  // Sites that the storylines written in full bring in.
  site('sumps-gate', "Sump's Gate", 'den', 'road-rats'),
  site('the-pocket', 'The Pocket', 'den', 'road-rats'),
  site('bell-buoy', 'The Bell Buoy', 'lookout'),
]);
const siteById = new Map(SITES.map(row => [row.id, row]));

export const STOCKS = Object.freeze(['embers', 'gas']);
// What a hold can stop (section 15).
export const HOLD_SYSTEMS = Object.freeze(['checkpoints', 'signs', 'services', 'routines']);
// Storylines (section 18).
export const THREAD_KINDS = Object.freeze(['trouble', 'find', 'need', 'feud', 'stranger', 'build', 'rival']);
export const SIGN_KINDS = Object.freeze(['smoke', 'flare', 'glow', 'lights', 'tracks', 'wreckage', 'thing', 'call',
  'words', 'find', 'stranger', 'notice']);
export const CAST_SOURCES = Object.freeze(['sites', 'groups', 'peoples', 'persons']);
export const PARTS_OF_DAY = Object.freeze(['dawn', 'day', 'dusk', 'dark']);
export const ROUTINE_KINDS = Object.freeze(['track', 'wander', 'post']);

export const nameRow = id => byId.get(id) ?? null;
export const siteRow = id => siteById.get(id) ?? null;
export const isPeople = id => byId.get(id)?.kind === 'people';
export const isPerson = id => byId.get(id)?.kind === 'person';
export const isGroup = id => byId.get(id)?.group === true;
export const keepsFeud = id => byId.get(id)?.feud === true;
export const isSite = id => siteById.has(id);
export const isPlace = id => PLACES.includes(id);
// The name a player reads, for a people, a person, a site or a place.
export function nameOf(id) {
  return byId.get(id)?.name ?? siteById.get(id)?.name ?? SCABLANDS_PLACES.find(place => place.id === id)?.name ?? null;
}

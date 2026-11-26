// The open Scablands' record, in memory (docs/story/open-scablands.md, sections 12, 16 and 17): what the open land
// knows beside the ledger. Card OPEN-STATE saves it; nothing here reads or writes a save.
//
// A WORLD is what every rule of the open land reads. It is plain data and is never changed in place:
//   {seed, ledger, open, scrap, town}
//   seed    the save's seed, for named draws
//   ledger  the ledger of src/story/ledger.js
//   open    the record below
//   scrap   the scrap the player carries
//   town    what the town's sim lets the land read, or null: {has: ['well', ...]}
import {createLedger} from '../../story/ledger.js';
import {FEUD_GROUPS, FEUD_WORDS, OLD_FEUD_GROUP, siteRow} from './register.js';
import {SCABLANDS_LAYOUT} from '../scablands.js';

export const OPEN_RECORD_VERSION = 1;
// Driven ground (section 16): the land as squares 500 m across, 28 from west to east and 20 from north to south.
export const GROUND_SQUARE = 500, GROUND_COLUMNS = 28, GROUND_ROWS = 20;
export function squareAt(x, z) {
  const column = Math.floor((x + SCABLANDS_LAYOUT.halfWidth) / GROUND_SQUARE);
  const row = Math.floor((z + SCABLANDS_LAYOUT.halfDepth) / GROUND_SQUARE);
  return column < 0 || column >= GROUND_COLUMNS || row < 0 || row >= GROUND_ROWS ? null : row * GROUND_COLUMNS + column;
}
export const MOST_FAVOURS = 2;

export function newOpenRecord({seed = 0} = {}) {
  return {
    version: OPEN_RECORD_VERSION,
    landSeed: seed >>> 0,   // places the sites; kept as its own number (Kyle, 21 November 2026)
    found: [],              // site ids, in the order found; it never shrinks
    stages: {},             // site id -> stage, once it has changed from the site's kind
    favours: {},            // people id -> favours owed to the player, 0 to MOST_FAVOURS
    feuds: {},              // group id -> feud word, for every group but the Ash Men, whose feud the ledger keeps
    threads: {},            // storyline id -> {beat, began, cast, end}
    crossings: {},          // checkpoint id -> times crossed
    resting: [],            // checkpoints that have brought somebody since the last banked hearth
    car: {dirt: 0, armour: null}, // dirt from 0 clean to 1 caked; null armour until the first drive
    routines: {},           // routine id -> offer, learner, share, lesson load, running state and tally
    driven: [],             // squares of ground the player has driven over (squareAt), in the order driven
    journal: [],            // every change made by an open effect, with the choice and the night that caused it
  };
}

export function newWorld({seed = 0, night = 1, embers = 0, gas = 0, scrap = 0, town = null} = {}) {
  return {seed: seed >>> 0, ledger: createLedger({seed: seed >>> 0, night, embers, gas}), open: newOpenRecord({seed}),
    scrap, town};
}

// What a site has become. Until something changes it, a site's stage is its kind.
export function stageOf(world, siteId) {
  return world.open.stages[siteId] ?? siteRow(siteId)?.kind ?? null;
}

// A group's feud word, or null for a group that keeps no feud (traders, travellers).
export function feudOf(world, groupId) {
  if (!FEUD_GROUPS.includes(groupId)) return null;
  if (groupId === OLD_FEUD_GROUP) return world.ledger.feud;
  return world.open.feuds[groupId] ?? FEUD_WORDS[0];
}

export const favoursOf = (world, peopleId) => world.open.favours[peopleId] ?? 0;
export const wordOf = (world, id) => world.ledger.words[id] ?? 'Strangers';
export const threadOf = (world, id) => world.open.threads[id] ?? null;
export const isFound = (world, siteId) => world.open.found.includes(siteId);
export const isDriven = (world, square) => world.open.driven.includes(square);

// Old open saves can omit the routine, the clock and the outing stamp.
export function readableRoutine(record, learnerIds) {
  const count = value => Number.isSafeInteger(value) && value >= 0;
  const stamp = value => value === null || (count(value) && value > 0);
  const load = value => count(value) && value <= 60;
  if (record && typeof record === 'object' && !Array.isArray(record) && !Object.hasOwn(record, 'handRuns'))
    return typeof record.offered === 'boolean' && learnerIds.includes(record.learner) &&
      Number.isFinite(record.share) && record.share >= .6 && record.share <= .85 && load(record.lessonLoad) &&
      typeof record.running === 'boolean' && count(record.tally);
  const tally = record?.tally;
  const delivery = record?.lastDelivery;
  return record !== null && typeof record === 'object' && !Array.isArray(record) &&
    count(record.handRuns) && typeof record.offered === 'boolean' && stamp(record.offeredNight) &&
    stamp(record.refusedNight) && (record.learner === null || learnerIds.includes(record.learner)) &&
    typeof record.lessonPending === 'boolean' && (!record.lessonPending || record.learner !== null) &&
    (!Object.hasOwn(record, 'startAfterLesson') || (typeof record.startAfterLesson === 'boolean' &&
      (!record.startAfterLesson || record.lessonPending))) &&
    (record.share === null ? record.lessonLoad === null && !record.running :
      Number.isFinite(record.share) && record.share >= .6 && record.share <= .85 &&
      load(record.lessonLoad) && record.learner !== null) &&
    typeof record.running === 'boolean' && stamp(record.handNight) && stamp(record.deliveredNight) &&
    count(tally?.runs) && count(tally?.gas) && count(tally?.embers) &&
    (delivery === null || (stamp(delivery?.night) && delivery.night !== null &&
      load(delivery.gas) && count(delivery.embers) && load(delivery.byHand) && count(delivery.handEmbers)));
}

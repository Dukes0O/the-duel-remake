// OPEN-STATE: optional versioned story record. Work with profile values only;
// App owns the switch, job outcome, player identity and storage write.
import {registerStory, writeStory} from '../../story/story-save.js';
import {savedLedger} from '../../story/ledger-save.js';
import {rememberWorldFound} from '../world-save.js';
import {GROUND_COLUMNS, GROUND_ROWS, OPEN_RECORD_VERSION} from './open-record.js';

const MAX_SCRAP = 1_000_000_000; // normalizeWasteland's wallet ceiling
export const OPEN_JOURNAL_LIMIT = 512; // saved rows; progress takes priority over this target
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
const unavailable = 'This open land cannot be read by this version of the game.';
const failure = (profile, reason) => ({ok: false, changed: false, profile, reason});

function readable(entry) {
  return entry?.version === OPEN_RECORD_VERSION && count(entry.landSeed) && entry.landSeed <= 0xffffffff &&
    Array.isArray(entry.found) && entry.found.every(id => typeof id === 'string') &&
    object(entry.stages) && object(entry.favours) && object(entry.feuds) && object(entry.threads) &&
    object(entry.crossings) && Array.isArray(entry.resting) &&
    object(entry.car) && Number.isFinite(entry.car.dirt) && entry.car.dirt >= 0 && entry.car.dirt <= 1 &&
    (entry.car.armour == null || (Number.isFinite(entry.car.armour) && entry.car.armour >= 0)) &&
    (!Object.hasOwn(entry, 'routines') || object(entry.routines)) &&
    Array.isArray(entry.driven) && entry.driven.every(square => count(square) && square < GROUND_COLUMNS * GROUND_ROWS) &&
    Array.isArray(entry.journal) && entry.journal.every(object);
}

registerStory({
  key: 'open',
  steps: ['begin', 'keeping'],
  stepOf: entry => readable(entry) ? 'keeping' : 'begin',
  writers: {settle: (entry, record) => same(entry, record) ? null : record},
});

export function savedOpenRecord(profile) {
  const record = profile?.story?.open;
  return profile?.story?.version === 1 && readable(record) ? record : null;
}

// Rule inputs stay exact: thread-rule reads arrivals, director reads starts,
// site-view reads burns, and effects/sites/buildings/checkpoints read current
// choice ids. Keep all thread and burn rows, plus the last banked night and
// everything newer. Unknown rows also survive. The recollection page and
// replay read the separate ledger, which this helper never touches.
// Summaries are audit counts by choice prefix and inclusive night range;
// they have no choiceId/night and cannot impersonate an applied choice.
export function compactOpenJournal(record, bankedNight, {atBank = false} = {}) {
  if (!atBank && record.journal.length <= OPEN_JOURNAL_LIMIT)
    return {record, overflow: 0};
  const audit = new Set(['find', 'site', 'favour', 'scrap', 'town', 'feud']);
  const summaries = new Map(), kept = [];
  const older = night => count(night) && night < bankedNight;
  const ordered = record.journal.map((row, index) => ({row, index})).sort((a, b) =>
    (a.row.fromNight ?? a.row.night ?? Infinity) - (b.row.fromNight ?? b.row.night ?? Infinity) || a.index - b.index);
  const folded = new Set();
  for (const {row, index} of ordered) {
    const summary = row.type === 'summary' && typeof row.choicePrefix === 'string' &&
      count(row.entries) && count(row.fromNight) && row.fromNight <= row.toNight && older(row.toNight);
    if (!summary && !(audit.has(row.type) && older(row.night) && typeof row.choiceId === 'string' &&
      !(row.type === 'site' && row.after === 'burned'))) continue;
    // Repeat counters occur both as /3 (services) and -3 (recoveries/runs).
    const prefix = summary ? row.choicePrefix : row.choiceId.replace(/([/-])\d+(?=\/|$)/g, '$1');
    const first = summary ? row.fromNight : row.night, last = summary ? row.toNight : row.night;
    const previous = summaries.get(prefix);
    summaries.set(prefix, {type: 'summary', choicePrefix: prefix,
      fromNight: Math.min(previous?.fromNight ?? first, first), toNight: Math.max(previous?.toNight ?? last, last),
      entries: (previous?.entries ?? 0) + (summary ? row.entries : 1)});
    folded.add(index);
  }
  // The relative order of every exact row matters to findLast rule readers.
  record.journal.forEach((row, index) => { if (!folded.has(index)) kept.push(row); });
  const journal = [...summaries.values(), ...kept];
  const next = same(journal, record.journal) ? record : {...record, journal};
  return {record: next, overflow: Math.max(0, journal.length - OPEN_JOURNAL_LIMIT)};
}

export function openScrapBalance(profile) {
  const amount = profile?.wasteland?.scrap;
  return Number.isFinite(amount) ? Math.max(0, Math.min(Math.floor(amount), MAX_SCRAP)) : 0;
}

export function spendScrap(profile, amount, reason) {
  const price = count(amount) ? amount : 0;
  const balance = openScrapBalance(profile);
  const taken = Math.min(balance, price);
  return {
    profile: taken ? {...profile, wasteland: {...profile.wasteland, scrap: balance - taken}} : profile,
    taken, owed: price - taken, reason,
  };
}

export function settleOpenWorld(profile, world, {atStart = null, savedAtStart = null} = {}) {
  if (!object(profile) || !readable(world?.open) || !count(world.scrap)) return failure(profile, unavailable);
  const story = profile.story;
  const ledgerBefore = savedLedger(profile);
  const recordBefore = savedOpenRecord(profile);
  if (Object.hasOwn(profile, 'story') && (!object(story) || story.version !== 1 ||
    (Object.hasOwn(story, 'ledger') && !ledgerBefore) || (Object.hasOwn(story, 'open') && !recordBefore)))
    return failure(profile, unavailable);

  // Refuse stale ledger or record writes. A separate wallet gain can still
  // survive settlement when the open run can be paid for in full.
  if (savedAtStart && (!same(ledgerBefore, savedAtStart.ledger) || !same(recordBefore, savedAtStart.open)))
    return failure(profile, 'The saved open land has changed.');
  const delta = world.scrap - (atStart?.scrap ?? openScrapBalance(profile));
  let next = profile;
  if (delta < 0) {
    const spent = spendScrap(profile, -delta, 'open-world');
    if (spent.owed) return failure(profile, 'The scrap carried at the start is no longer available.');
    next = spent.profile;
  } else if (delta > 0) {
    const scrap = Math.min(MAX_SCRAP, openScrapBalance(profile) + delta);
    next = {...profile, wasteland: {...profile.wasteland, scrap}};
  }

  const ledger = {version: 1, ...world.ledger};
  if (!savedLedger({story: {version: 1, ledger}})) return failure(profile, unavailable);
  const found = [...new Set([...(recordBefore?.found ?? []), ...world.open.found])];
  const bankedNight = ledger.history.reduce((last, row) => row.type === 'night' &&
    row.choiceId === 'bank/' + row.night && count(row.night) && row.night < ledger.night ? Math.max(last, row.night) : last, 0);
  const compacted = compactOpenJournal({...recordBefore, ...world.open, found}, bankedNight);
  const record = compacted.record;
  if (compacted.overflow) console.warn('Open journal target exceeded; all progress is kept.',
    {entries: record.journal.length, target: OPEN_JOURNAL_LIMIT});
  const written = writeStory(next, 'open', 'settle', structuredClone(record));
  if (!written.ok) return failure(profile, written.reason);
  next = written.profile;
  if (!same(ledgerBefore, ledger)) next = {...next, story: {...next.story, ledger: structuredClone(ledger)}};
  for (const site of found) next = rememberWorldFound(next, site);
  return {ok: true, changed: next !== profile, profile: next, reason: ''};
}

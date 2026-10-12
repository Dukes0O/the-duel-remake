import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COURSE } from '../src/config.js';
import { featureFlags } from '../src/feature-flags.js';
import { COURSE_PRICES, isCourseUnlocked, purchaseCourse } from '../src/course-access.js';
import { courseAccessPanel } from '../src/course-access-ui.js';
import { createProfile, eventKey, loadPlayers, normalizeProfile, stageEventId, PLAYERS_KEY, PROFILE_KEY } from '../src/progression.js';
import { supportsCombat } from '../src/combat.js';
import { loadLeaderboard, LEADERBOARD_KEY } from '../src/leaderboard.js';
import { loadGhosts, GHOST_KEY } from '../src/ghost.js';

// RELEASE-TREMBLANT: Tremblant Woods joins the course list while its switch is on.
// This pins what must not move when a course is added: the earlier events keep their
// place and id, no old save gains or loses anything, and the new course is a paid unlock.

const EARLIER_EVENTS = Object.freeze([
  'pacific-canyon', 'high-country', 'harbor-highlands', 'titan-arena', 'midnight-chase', 'ridge-rally',
  'titan-stunt-trial', 'neon-drift-trial', 'timberline-rush', 'eifel-crown', 'alpine-serpent',
  'azure-riviera', 'red-mesa', 'neon-docks', 'cloudbreak-skyway', 'titan-freestyle',
]);
let checks = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const ok = (value, label) => { assert.ok(value, label); checks++; };

// 1. The earlier sixteen events keep their positions and ids; Tremblant is appended.
equal(COURSE.slice(0, EARLIER_EVENTS.length).map(event => event.id), EARLIER_EVENTS, 'earlier events keep their order and ids');
equal(COURSE.slice(EARLIER_EVENTS.length).map(event => event.id), ['tremblant-woods'], 'Tremblant Woods is appended after them');
ok(featureFlags.enabled('tremblant-woods'), 'the released switch is on for players, with no URL flag');
ok(!featureFlags.enabled('panorama-ridge') && !featureFlags.enabled('harbour-lights'), 'the other two circuits stay off');
EARLIER_EVENTS.forEach((id, index) => equal(stageEventId(index), id, `event ${index} still saves as ${id}`));

// 2. Records are keyed by event id, so Tremblant's records never meet an older event's.
const tremblant = COURSE.findIndex(event => event.id === 'tremblant-woods');
const key = eventKey({ stageIndex: tremblant, seed: 1989, laps: COURSE[tremblant].laps });
ok(key.startsWith('tremblant-woods|layout:'), `Tremblant records have their own key: ${key}`);
ok(COURSE.every((event, index) => index === tremblant || !eventKey({ stageIndex: index, seed: 1989, laps: event.laps }).startsWith('tremblant-woods|')),
  'no other event shares the Tremblant key');

// 3. Price and access: a paid unlock, shown on the course screen, never granted to old saves.
equal(COURSE_PRICES['tremblant-woods'], 1600, 'Tremblant Woods costs 1,600 credits');
const fresh = createProfile();
ok(!isCourseUnlocked(fresh, 'tremblant-woods'), 'a new profile has Tremblant locked');
const poor = purchaseCourse({ ...fresh, credits: 1599 }, 'tremblant-woods');
ok(!poor.ok && poor.profile.credits === 1599, 'one credit short cannot buy it');
const rich = { ...fresh, credits: 2000 };
const bought = purchaseCourse(rich, 'tremblant-woods');
ok(bought.ok && bought.cost === 1600 && bought.profile.credits === 400, 'buying charges exactly 1,600 credits');
equal(bought.profile.courses.unlocked, [...rich.courses.unlocked, 'tremblant-woods'].filter(id => COURSE.some(event => event.id === id)),
  'buying adds only Tremblant Woods to the unlocked list');
ok(isCourseUnlocked(bought.profile, 'tremblant-woods') && isCourseUnlocked(bought.profile, 'pacific-canyon'), 'the purchase unlocks it and keeps the free course');
const unowned = courseAccessPanel(fresh, 0, '');
ok(/Tremblant Woods/.test(unowned) && /1,?600 CR/.test(unowned), 'the course screen lists Tremblant Woods with its price');
ok(!/UNLOCKED<\/span><h3>Tremblant Woods/.test(unowned), 'the course screen shows it as locked until bought');
const owned = courseAccessPanel(bought.profile, tremblant, '');
ok(/UNLOCKED<\/span><h3>Tremblant Woods/.test(owned), 'after buying, the course screen shows it as unlocked');

// 4. Every historical save fixture loads exactly as before: no course gained or lost, records and ghosts intact.
const fixtureDir = new URL('./fixtures/saves/', import.meta.url);
const files = readdirSync(fileURLToPath(fixtureDir)).filter(name => name.endsWith('.json')).sort();
const memory = initial => {
  const values = new Map(Object.entries(initial).map(([name, value]) => [name, JSON.stringify(value)]));
  return { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: name => values.get(String(name)) ?? null, setItem: (name, value) => values.set(String(name), String(value)),
    removeItem: name => values.delete(String(name)), clear: () => values.clear() };
};
for (const file of files) {
  const fixture = JSON.parse(readFileSync(new URL(file, fixtureDir), 'utf8'));
  const storage = memory(fixture.storage);
  const players = loadPlayers(storage);
  const rawRegistry = fixture.storage[PLAYERS_KEY];
  const rawPlayers = rawRegistry?.players ?? [{ id: 'player-1', profile: fixture.storage[PROFILE_KEY] }];
  for (const rawPlayer of rawPlayers) {
    const loaded = players.players.find(player => player.id === rawPlayer.id).profile;
    equal(isCourseUnlocked(loaded, 'tremblant-woods'), !!rawPlayer.profile.courses?.unlocked?.includes('tremblant-woods'), `${fixture.shape}/${rawPlayer.id}: a save owns Tremblant Woods only if it saved it`);
    if (rawPlayer.profile.courses) {
      equal(loaded.courses.unlocked, COURSE.map(event => event.id).filter(id => rawPlayer.profile.courses.unlocked.includes(id)),
        `${fixture.shape}/${rawPlayer.id}: the unlocked list is exactly the saved one`);
    }
    equal(loaded.credits, rawPlayer.profile.credits, `${fixture.shape}/${rawPlayer.id}: credits unchanged`);
  }
  const rawBoard = fixture.storage[LEADERBOARD_KEY];
  if (rawBoard) {
    const board = loadLeaderboard(storage);
    equal(board.entries.map(row => row.eventKey), rawBoard.entries.map(row => row.eventKey), `${fixture.shape}: record keys unchanged`);
    equal(board.entries.map(row => row.timeSec), rawBoard.entries.map(row => row.timeSec), `${fixture.shape}: record times unchanged`);
  }
  const rawGhosts = fixture.storage[GHOST_KEY];
  if (rawGhosts) equal(loadGhosts(storage).records.map(row => row.key), rawGhosts.records.map(row => row.key), `${fixture.shape}: ghost keys unchanged`);
}

// 5. Pure race: the circuits do not host Mad Max Duel, raiders or the UFO. Rival Duel stays.
ok(!supportsCombat(COURSE[tremblant]) && COURSE[tremblant].hasRival, 'Tremblant has a rival but no Mad Max Duel');
equal(COURSE.filter(supportsCombat).length, 11, 'eleven combat courses, as before');

// 6. An unfinished race is saved by course id as well as position, and found by id first.
const race = extra => ({ runId: 'run-x', car: 'falcone_f42', ...extra });
const load = activeRace => normalizeProfile({ version: 2, credits: 100, activeRace }).activeRace;
equal(load(race({ stageIndex: 3, key: 'run-x:3' }))?.stageId, 'titan-arena', 'an old save with only a position resumes the course at that position');
equal(load(race({ stageIndex: tremblant, stageId: 'tremblant-woods' }))?.stageIndex, tremblant, 'a new save resumes Tremblant');
equal(load(race({ stageIndex: 0, stageId: 'tremblant-woods' }))?.stageId, 'tremblant-woods', 'the id wins over a stale position');
equal(load(race({ stageIndex: 3, stageId: 'no-such-course' }))?.stageId, 'titan-arena', 'an unknown id falls back to the position');
equal(load(race({ stageIndex: 999, stageId: 'no-such-course' })), null, 'an unknown id and position is dropped, as before');
{
  // A course inserted before Tremblant moves it one place; the saved race must still find it.
  const savedAtPosition = tremblant, inserted = { ...COURSE[0], id: 'inserted-before-tremblant' };
  COURSE.splice(tremblant, 0, inserted);
  try {
    const moved = load(race({ stageIndex: savedAtPosition, stageId: 'tremblant-woods' }));
    equal([moved.stageIndex, moved.stageId, moved.key], [tremblant + 1, 'tremblant-woods', `run-x:${tremblant + 1}`], 'after a course is inserted before it, the saved race still resumes Tremblant');
    equal(load(race({ stageIndex: savedAtPosition }))?.stageId, 'inserted-before-tremblant', 'an old save with only a position keeps its old meaning (nothing to go on)');
  } finally { COURSE.splice(tremblant, 1); }
}
// An older build reads only the fields it knows, so the extra stageId is ignored there.
const written = load(race({ stageIndex: tremblant, stageId: 'tremblant-woods' }));
equal(Object.keys(written).sort(), ['car', 'cpuDifficulty', 'driverId', 'key', 'pendingPoliceFineCount', 'pendingPoliceFines', 'runId', 'stageId', 'stageIndex'], 'the only new field is stageId');

console.log(`Release Tremblant: ${checks} order, record key, price, course screen and ${files.length} old-save checks passed.`);

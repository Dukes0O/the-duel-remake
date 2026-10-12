import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COURSE } from '../src/config.js';
import { ALL_CIRCUITS, circuitsEnabled } from '../src/circuits/index.js';
import { featureFlags } from '../src/feature-flags.js';
import { COURSE_PRICES, isCourseUnlocked, purchaseCourse } from '../src/course-access.js';
import { courseAccessPanel } from '../src/course-access-ui.js';
import { createProfile, eventKey, loadPlayers, normalizeProfile, stageEventId, PLAYERS_KEY, PROFILE_KEY } from '../src/progression.js';
import { supportsCombat } from '../src/combat.js';
import { loadLeaderboard, LEADERBOARD_KEY } from '../src/leaderboard.js';
import { loadGhosts, GHOST_KEY } from '../src/ghost.js';

// RELEASE-TREMBLANT, RELEASE-TREMBLANT-SNOW and RELEASE-HARBOUR: Tremblant Woods, then Tremblant Snow, then Harbour Lights join the course list while their switches are on.
// This pins what must not move when a course is added: the earlier events keep their
// place and id, no old save gains or loses anything, and each new course is a paid unlock.

const EARLIER_EVENTS = Object.freeze([
  'pacific-canyon', 'high-country', 'harbor-highlands', 'titan-arena', 'midnight-chase', 'ridge-rally',
  'titan-stunt-trial', 'neon-drift-trial', 'timberline-rush', 'eifel-crown', 'alpine-serpent',
  'azure-riviera', 'red-mesa', 'neon-docks', 'cloudbreak-skyway', 'titan-freestyle',
]);
let checks = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const ok = (value, label) => { assert.ok(value, label); checks++; };

// 1. The earlier sixteen events keep their positions and ids; Tremblant Woods, then Tremblant Snow, are appended.
equal(COURSE.slice(0, EARLIER_EVENTS.length).map(event => event.id), EARLIER_EVENTS, 'earlier events keep their order and ids');
equal(COURSE.slice(EARLIER_EVENTS.length).map(event => event.id), ['tremblant-woods', 'tremblant-snow', 'harbour-lights'], 'Tremblant Woods is appended after them, then Tremblant Snow, then Harbour Lights last');
equal([COURSE.findIndex(event => event.id === 'tremblant-woods'), COURSE.findIndex(event => event.id === 'tremblant-snow'), COURSE.findIndex(event => event.id === 'harbour-lights')], [16, 17, 18],
  'Tremblant Woods and Tremblant Snow keep the places they have in the live build (17th and 18th on the menu); Harbour Lights is 19th');
ok(featureFlags.enabled('tremblant-woods') && featureFlags.enabled('tremblant-snow') && featureFlags.enabled('harbour-lights'), 'the released switches are on for players, with no URL flag');
ok(!featureFlags.enabled('panorama-ridge'), 'Panorama Ridge stays off');

// 1b. ALL_CIRCUITS is in release order, so reordering it did not move anything for a player. With only the switches that
// were live before Harbour Lights (Tremblant Woods and Tremblant Snow), the circuits on COURSE are exactly what the live
// build shows: the same two, in the same order, right after the sixteen earlier events.
equal(ALL_CIRCUITS.map(circuit => circuit.id), ['tremblant-woods', 'tremblant-snow', 'harbour-lights', 'panorama-ridge'], 'circuits are listed in release order');
const liveSwitches = new Set(['tremblant-woods', 'tremblant-snow']);
equal(circuitsEnabled({ enabled: name => liveSwitches.has(name) }).map(circuit => circuit.id), ['tremblant-woods', 'tremblant-snow'], "with the live build's switches the course list is identical to the live build's");
equal(circuitsEnabled({ enabled: name => liveSwitches.has(name) || name === 'panorama-ridge' }).map(circuit => circuit.id), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'], 'a circuit released later goes after the released ones');
equal(circuitsEnabled({ enabled: name => name === 'harbour-lights' || liveSwitches.has(name) }).map(circuit => circuit.id), ['tremblant-woods', 'tremblant-snow', 'harbour-lights'], 'turning on Harbour Lights only adds it at the end');
EARLIER_EVENTS.forEach((id, index) => equal(stageEventId(index), id, `event ${index} still saves as ${id}`));

// 2. Records are keyed by event id, so Tremblant's records never meet an older event's.
const tremblant = COURSE.findIndex(event => event.id === 'tremblant-woods');
const key = eventKey({ stageIndex: tremblant, seed: 1989, laps: COURSE[tremblant].laps });
ok(key.startsWith('tremblant-woods|layout:'), `Tremblant records have their own key: ${key}`);
ok(COURSE.every((event, index) => index === tremblant || !eventKey({ stageIndex: index, seed: 1989, laps: event.laps }).startsWith('tremblant-woods|')),
  'no other event shares the Tremblant key');
const snow = COURSE.findIndex(event => event.id === 'tremblant-snow');
equal(snow, tremblant + 1, 'Tremblant Snow sits right after Tremblant Woods');
const snowKey = eventKey({ stageIndex: snow, seed: 1989, laps: COURSE[snow].laps });
ok(snowKey.startsWith('tremblant-snow|layout:'), `Tremblant Snow records have their own key: ${snowKey}`);
ok(COURSE.every((event, index) => index === snow || !eventKey({ stageIndex: index, seed: 1989, laps: event.laps }).startsWith('tremblant-snow|')),
  'no other event shares the Tremblant Snow key');
equal(stageEventId(snow), 'tremblant-snow', 'position 17 saves as tremblant-snow');
const harbour = COURSE.findIndex(event => event.id === 'harbour-lights');
equal(harbour, COURSE.length - 1, 'Harbour Lights is the last entry on the course list');
equal(harbour, snow + 1, 'Harbour Lights sits right after Tremblant Snow');
const harbourKey = eventKey({ stageIndex: harbour, seed: 1989, laps: COURSE[harbour].laps });
ok(harbourKey.startsWith('harbour-lights|layout:'), `Harbour Lights records have their own key: ${harbourKey}`);
ok(COURSE.every((event, index) => index === harbour || !eventKey({ stageIndex: index, seed: 1989, laps: event.laps }).startsWith('harbour-lights|')),
  'no other event shares the Harbour Lights key');
equal(stageEventId(harbour), 'harbour-lights', 'position 18 saves as harbour-lights');

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
ok(!isCourseUnlocked(bought.profile, 'tremblant-snow'), 'buying Tremblant Woods does not give Tremblant Snow');
equal(COURSE_PRICES['tremblant-snow'], 1800, 'Tremblant Snow costs 1,800 credits');
ok(!isCourseUnlocked(fresh, 'tremblant-snow'), 'a new profile has Tremblant Snow locked');
const snowPoor = purchaseCourse({ ...fresh, credits: 1799 }, 'tremblant-snow');
ok(!snowPoor.ok && snowPoor.profile.credits === 1799, 'one credit short cannot buy Tremblant Snow');
const snowBought = purchaseCourse({ ...fresh, credits: 2500 }, 'tremblant-snow');
ok(snowBought.ok && snowBought.cost === 1800 && snowBought.profile.credits === 700, 'buying Tremblant Snow charges exactly 1,800 credits');
equal(snowBought.profile.courses.unlocked, [...fresh.courses.unlocked, 'tremblant-snow'].filter(id => COURSE.some(event => event.id === id)),
  'buying adds only Tremblant Snow to the unlocked list');
ok(!isCourseUnlocked(snowBought.profile, 'tremblant-woods') && isCourseUnlocked(snowBought.profile, 'pacific-canyon'), 'Tremblant Snow does not give Tremblant Woods and keeps the free course');
ok(isCourseUnlocked(bought.profile, 'tremblant-woods') && isCourseUnlocked(bought.profile, 'pacific-canyon'), 'the purchase unlocks it and keeps the free course');
equal(COURSE_PRICES['harbour-lights'], 1800, 'Harbour Lights costs 1,800 credits (docs/CIRCUITS.md section 7)');
ok(!isCourseUnlocked(fresh, 'harbour-lights'), 'a new profile has Harbour Lights locked');
const harbourPoor = purchaseCourse({ ...fresh, credits: 1799 }, 'harbour-lights');
ok(!harbourPoor.ok && harbourPoor.profile.credits === 1799, 'one credit short cannot buy Harbour Lights');
const harbourBought = purchaseCourse({ ...fresh, credits: 2500 }, 'harbour-lights');
ok(harbourBought.ok && harbourBought.cost === 1800 && harbourBought.profile.credits === 700, 'buying Harbour Lights charges exactly 1,800 credits');
equal(harbourBought.profile.courses.unlocked, [...fresh.courses.unlocked, 'harbour-lights'].filter(id => COURSE.some(event => event.id === id)),
  'buying adds only Harbour Lights to the unlocked list');
ok(!isCourseUnlocked(harbourBought.profile, 'tremblant-woods') && !isCourseUnlocked(harbourBought.profile, 'tremblant-snow') && isCourseUnlocked(harbourBought.profile, 'pacific-canyon'),
  'Harbour Lights does not give either Tremblant course and keeps the free course');
ok(!isCourseUnlocked(snowBought.profile, 'harbour-lights') && !isCourseUnlocked(bought.profile, 'harbour-lights'), 'buying a Tremblant course does not give Harbour Lights');
const unowned = courseAccessPanel(fresh, 0, '');
ok(/Tremblant Woods/.test(unowned) && /1,?600 CR/.test(unowned), 'the course screen lists Tremblant Woods with its price');
ok(!/UNLOCKED<\/span><h3>Tremblant Woods/.test(unowned), 'the course screen shows it as locked until bought');
const owned = courseAccessPanel(bought.profile, tremblant, '');
ok(/UNLOCKED<\/span><h3>Tremblant Woods/.test(owned), 'after buying, the course screen shows it as unlocked');
ok(/Tremblant Snow/.test(unowned) && /1,?800 CR/.test(unowned), 'the course screen lists Tremblant Snow with its price');
ok(!/UNLOCKED<\/span><h3>Tremblant Snow/.test(unowned), 'the course screen shows Tremblant Snow as locked until bought');
ok(/UNLOCKED<\/span><h3>Tremblant Snow/.test(courseAccessPanel(snowBought.profile, snow, '')), 'after buying, the course screen shows Tremblant Snow as unlocked');
ok(/Harbour Lights/.test(unowned) && /1,?800 CR/.test(unowned), 'the course screen lists Harbour Lights with its price');
ok(!/UNLOCKED<\/span><h3>Harbour Lights/.test(unowned), 'the course screen shows Harbour Lights as locked until bought');
ok(/UNLOCKED<\/span><h3>Harbour Lights/.test(courseAccessPanel(harbourBought.profile, harbour, '')), 'after buying, the course screen shows Harbour Lights as unlocked');

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
    for (const id of ['tremblant-woods', 'tremblant-snow', 'harbour-lights']) {
      equal(isCourseUnlocked(loaded, id), !!rawPlayer.profile.courses?.unlocked?.includes(id), `${fixture.shape}/${rawPlayer.id}: a save owns ${id} only if it saved it`);
    }
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
ok(!supportsCombat(COURSE[snow]) && COURSE[snow].hasRival && COURSE[snow].noCombat === true, 'Tremblant Snow has a rival but no Mad Max Duel');
ok(!supportsCombat(COURSE[harbour]) && COURSE[harbour].hasRival && COURSE[harbour].noCombat === true, 'Harbour Lights has a rival but no Mad Max Duel');
equal(COURSE.filter(supportsCombat).length, 11, 'eleven combat courses, as before');

// 6. An unfinished race is saved by course id as well as position, and found by id first.
const race = extra => ({ runId: 'run-x', car: 'falcone_f42', ...extra });
const load = activeRace => normalizeProfile({ version: 2, credits: 100, activeRace }).activeRace;
equal(load(race({ stageIndex: 3, key: 'run-x:3' }))?.stageId, 'titan-arena', 'an old save with only a position resumes the course at that position');
equal(load(race({ stageIndex: tremblant, stageId: 'tremblant-woods' }))?.stageIndex, tremblant, 'a new save resumes Tremblant');
equal(load(race({ stageIndex: 0, stageId: 'tremblant-woods' }))?.stageId, 'tremblant-woods', 'the id wins over a stale position');
equal(load(race({ stageIndex: snow, stageId: 'tremblant-snow' }))?.stageIndex, snow, 'a new save resumes Tremblant Snow');
equal(load(race({ stageIndex: tremblant, stageId: 'tremblant-snow' }))?.stageIndex, snow, 'the id wins over a stale position for Tremblant Snow too');
equal(load(race({ stageIndex: harbour, stageId: 'harbour-lights' }))?.stageIndex, harbour, 'a new save resumes Harbour Lights');
equal(load(race({ stageIndex: tremblant, stageId: 'harbour-lights' }))?.stageIndex, harbour, 'the id wins over a stale position for Harbour Lights too');
equal(load(race({ stageIndex: tremblant, stageId: 'tremblant-woods' }))?.stageId, 'tremblant-woods', 'a saved unfinished Tremblant race still resumes Tremblant, now that Harbour Lights exists');
equal(load(race({ stageIndex: 3, stageId: 'no-such-course' })), null, 'a course id this build does not have drops the race instead of resuming whatever sits at that position');
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

console.log(`Release Tremblant, Tremblant Snow and Harbour Lights: ${checks} order, record key, price, course screen and ${files.length} old-save checks passed.`);

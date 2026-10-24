import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COURSE } from '../src/config.js';
import { ALL_CIRCUITS, circuitsEnabled } from '../src/circuits/index.js';
import { featureFlags } from '../src/feature-flags.js';
import { COURSE_PRICES, isCourseUnlocked, purchaseCourse } from '../src/course-access.js';
import { createProfile, eventKey, loadPlayers, normalizeProfile, stageEventId, PLAYERS_KEY, PROFILE_KEY } from '../src/progression.js';
import { supportsCombat } from '../src/combat.js';
import { courseAccessPanel } from '../src/course-access-ui.js';
import { GRAND_PRIX_COURSES } from '../src/race-field.js';
import { loadLeaderboard, LEADERBOARD_KEY } from '../src/leaderboard.js';
import { loadGhosts, GHOST_KEY } from '../src/ghost.js';

// RELEASE-TREMBLANT, RELEASE-TREMBLANT-SNOW, RELEASE-HARBOUR and RELEASE-PANORAMA: Tremblant Woods, Tremblant Snow, Harbour Lights, then Panorama Ridge join the course list while their switches are on.
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
const released = CIRCUIT_MANIFESTS.filter(manifest => manifest.state === 'on').map(manifest => manifest.id);
equal(COURSE.slice(EARLIER_EVENTS.length).map(event => event.id), released, 'enabled circuits append in declared release order');
equal(ALL_CIRCUITS.map(circuit => circuit.id), CIRCUIT_MANIFESTS.map(manifest => manifest.id), 'registered circuits retain release order');
for (const manifest of CIRCUIT_MANIFESTS) {
  equal(featureFlags.enabled(manifest.flag), manifest.state === 'on', 'production follows the declared course state');
  const enabled = new Set([...released, manifest.flag]);
  equal(circuitsEnabled({enabled: name => enabled.has(name)}).map(circuit => circuit.id),
    CIRCUIT_MANIFESTS.filter(item => enabled.has(item.flag)).map(item => item.id), 'explicit selections preserve release order');
}
EARLIER_EVENTS.forEach((id, index) => equal(stageEventId(index), id, `event ${index} still saves as ${id}`));

// 2. Records are keyed by event id, so Tremblant's records never meet an older event's.
const tremblant = COURSE.findIndex(event => event.id === 'tremblant-woods');
const key = eventKey({ stageIndex: tremblant, seed: 1989, laps: COURSE[tremblant].laps });
ok(key.startsWith('tremblant-woods|layout:'), `Tremblant records have their own key: ${key}`);
ok(COURSE.every((event, index) => index === tremblant || !eventKey({ stageIndex: index, seed: 1989, laps: event.laps }).startsWith('tremblant-woods|')),
  'no other event shares the Tremblant key');
const snow = COURSE.findIndex(event => event.id === 'tremblant-snow');
const snowKey = eventKey({ stageIndex: snow, seed: 1989, laps: COURSE[snow].laps });
ok(snowKey.startsWith('tremblant-snow|layout:'), `Tremblant Snow records have their own key: ${snowKey}`);
ok(COURSE.every((event, index) => index === snow || !eventKey({ stageIndex: index, seed: 1989, laps: event.laps }).startsWith('tremblant-snow|')),
  'no other event shares the Tremblant Snow key');
equal(stageEventId(snow), 'tremblant-snow', 'position 17 saves as tremblant-snow');
const harbour = COURSE.findIndex(event => event.id === 'harbour-lights');
const harbourKey = eventKey({ stageIndex: harbour, seed: 1989, laps: COURSE[harbour].laps });
ok(harbourKey.startsWith('harbour-lights|layout:'), `Harbour Lights records have their own key: ${harbourKey}`);
ok(COURSE.every((event, index) => index === harbour || !eventKey({ stageIndex: index, seed: 1989, laps: event.laps }).startsWith('harbour-lights|')),
  'no other event shares the Harbour Lights key');
equal(stageEventId(harbour), 'harbour-lights', 'position 18 saves as harbour-lights');
const panorama = COURSE.findIndex(event => event.id === 'panorama-ridge');
equal([tremblant, snow, harbour, panorama], [16, 17, 18, 19], 'the released courses keep their places (Tremblant Woods 17th, Tremblant Snow 18th, Harbour Lights 19th) and Panorama Ridge is 20th');
const panoramaReleaseIds = ['tremblant-woods', 'tremblant-snow', 'harbour-lights', 'panorama-ridge'];
equal(COURSE.slice(EARLIER_EVENTS.length, panorama + 1).map(row => row.id), panoramaReleaseIds, 'the four earlier released circuits retain their exact public prefix');
const panoramaRelease = circuitsEnabled({enabled: flag => panoramaReleaseIds.includes(flag)}).map(row => row.id);
equal(panoramaRelease, panoramaReleaseIds, 'the historical Panorama release catalog retains its exact order');
equal(EARLIER_EVENTS.length + panoramaRelease.indexOf('panorama-ridge'), EARLIER_EVENTS.length + panoramaRelease.length - 1, 'Panorama is last in its historical release catalog');
equal(COURSE.filter(event => ['summit-run', 'ardennes-forest', 'summit-time-attack'].includes(event.id)).map(event => event.id), ['summit-run', 'ardennes-forest', 'summit-time-attack'], 'the approved Summit parent and solo child retain their declared positions around released Ardennes');
const liveBeforePanorama = new Set(['tremblant-woods', 'tremblant-snow', 'harbour-lights']);
equal(circuitsEnabled({ enabled: name => liveBeforePanorama.has(name) }).map(circuit => circuit.id), ['tremblant-woods', 'tremblant-snow', 'harbour-lights'],
  "with the switches that were live before Panorama Ridge the course list is identical to the live build's");
const panoramaKey = eventKey({ stageIndex: panorama, seed: 1989, laps: COURSE[panorama].laps });
ok(panoramaKey.startsWith('panorama-ridge|layout:'), `Panorama Ridge records have their own key: ${panoramaKey}`);
ok(COURSE.every((event, index) => index === panorama || !eventKey({ stageIndex: index, seed: 1989, laps: event.laps }).startsWith('panorama-ridge|')),
  'no other event shares the Panorama Ridge key');
equal(stageEventId(panorama), 'panorama-ridge', 'position 19 saves as panorama-ridge');

// 3. Every enabled paid course has isolated access. Literal prices and named UI checks belong to each course suite.
const paidReleased = released.filter(id => COURSE_PRICES[id] > 0);
for (const id of paidReleased) {
  const fresh = createProfile(), price = COURSE_PRICES[id];
  ok(!isCourseUnlocked(fresh, id), 'a new profile has the paid course locked');
  const poor = purchaseCourse({...fresh, credits: price - 1}, id);
  ok(!poor.ok && poor.profile.credits === price - 1, 'one credit short cannot buy it');
  const rich = {...fresh, credits: price + 400}, bought = purchaseCourse(rich, id);
  ok(bought.ok && bought.cost === price && bought.profile.credits === 400, 'buying charges exactly the registered price');
  equal(bought.profile.courses.unlocked, [...fresh.courses.unlocked, id].filter(value => COURSE.some(event => event.id === value)), 'only the bought course is added');
  ok(isCourseUnlocked(bought.profile, 'pacific-canyon'), 'buying keeps the free course');
  for (const other of paidReleased.filter(value => value !== id)) ok(!isCourseUnlocked(bought.profile, other), 'buying never grants another paid course');
  equal(isCourseUnlocked(bought.profile, 'summit-time-attack'), id === 'summit-run', 'only buying the Summit parent grants its no-pay solo child');
}

// 3b. Panorama Ridge in particular: a paid unlock at exactly 1,600 credits, shown on the course screen.
equal(COURSE_PRICES['panorama-ridge'], 1600, 'Panorama Ridge costs 1,600 credits (docs/CIRCUITS.md section 7)');
{
  const fresh = createProfile();
  const poor = purchaseCourse({ ...fresh, credits: 1599 }, 'panorama-ridge');
  ok(!poor.ok && poor.profile.credits === 1599, 'one credit short cannot buy Panorama Ridge');
  const bought = purchaseCourse({ ...fresh, credits: 2500 }, 'panorama-ridge');
  ok(bought.ok && bought.cost === 1600 && bought.profile.credits === 900, 'buying Panorama Ridge charges exactly 1,600 credits');
  equal(bought.profile.courses.unlocked, [...fresh.courses.unlocked, 'panorama-ridge'].filter(id => COURSE.some(event => event.id === id)), 'buying adds only Panorama Ridge to the unlocked list');
  ok(['tremblant-woods', 'tremblant-snow', 'harbour-lights'].every(id => !isCourseUnlocked(bought.profile, id)) && isCourseUnlocked(bought.profile, 'pacific-canyon'),
    'Panorama Ridge gives none of the other paid courses and keeps the free course');
  for (const id of ['tremblant-woods', 'tremblant-snow', 'harbour-lights'])
    ok(!isCourseUnlocked(purchaseCourse({ ...fresh, credits: 2500 }, id).profile, 'panorama-ridge'), `buying ${id} does not give Panorama Ridge`);
  const unowned = courseAccessPanel(fresh, 0, '');
  ok(/Panorama Ridge/.test(unowned) && /1,?600 CR/.test(unowned), 'the course screen lists Panorama Ridge with its price');
  ok(!/UNLOCKED<\/span><h3>Panorama Ridge/.test(unowned), 'the course screen shows Panorama Ridge as locked until bought');
  ok(/UNLOCKED<\/span><h3>Panorama Ridge/.test(courseAccessPanel(bought.profile, panorama, '')), 'after buying, the course screen shows Panorama Ridge as unlocked');
}

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
    for (const id of released) {
      equal(isCourseUnlocked(loaded, id), !!rawPlayer.profile.courses?.unlocked?.includes(id === 'summit-time-attack' ? 'summit-run' : id), `${fixture.shape}/${rawPlayer.id}: a save owns ${id} only by its saved entitlement or the solo child's saved parent`);
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

// 5. All circuits remain race-only; only the accepted solo Summit child has no rival.
for (const definition of ALL_CIRCUITS) {
  ok(!supportsCombat(definition) && definition.noCombat === true, 'registered circuits are race-only');
  if (definition.id === 'summit-time-attack') {
    const manifest = CIRCUIT_MANIFESTS.find(row => row.id === definition.id);
    equal([definition.flag, definition.defaultMode, definition.laps, definition.grandPrixLaps, definition.fieldSize, definition.hasRival, definition.noTraffic],
      ['summit-run', 'timetrial', 1, 1, 1, false, true], 'Attack is the exact solo Time Trial exception');
    equal([manifest.state, manifest.price, manifest.releaseOrder, manifest.grandPrix, manifest.unlock],
      ['on', 0, 6, false, {kind: 'owned-course', defaultEventId: 'summit-run'}], 'Attack shares only parent ownership and released admission');
    ok(!GRAND_PRIX_COURSES.includes(definition.id), 'Attack is never a Grand Prix event');
  } else ok(definition.hasRival, 'every other registered circuit retains its rival');
}
ok(!supportsCombat(COURSE[panorama]) && COURSE[panorama].hasRival && COURSE[panorama].noCombat === true, 'Panorama Ridge has a rival but no Mad Max Duel');
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
equal(load(race({ stageIndex: panorama, stageId: 'panorama-ridge' }))?.stageIndex, panorama, 'a new save resumes Panorama Ridge');
equal(load(race({ stageIndex: tremblant, stageId: 'panorama-ridge' }))?.stageIndex, panorama, 'the id wins over a stale position for Panorama Ridge too');
equal(load(race({ stageIndex: harbour, stageId: 'harbour-lights' }))?.stageId, 'harbour-lights', 'a saved unfinished Harbour Lights race still resumes Harbour Lights, now that Panorama Ridge exists');
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

console.log(`Release Tremblant, Tremblant Snow, Harbour Lights and Panorama Ridge: ${checks} order, record key, price, course screen and ${files.length} old-save checks passed.`);

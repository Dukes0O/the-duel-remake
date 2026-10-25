import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile, normalizeProfile, settleRace} from '../src/progression.js';
import {COURSE} from '../src/config.js';
import {achievementShelf, normalizeAchievements} from '../src/achievements.js';
import {achievementsPanel} from '../src/screen-trophies.js';
import {readFileSync, readdirSync} from 'node:fs';
import {App} from '../src/app.js';
import {ownTestCourses} from './career-fixture.mjs';

const on = {enabled: true, labEnabled: true};
const car = 'falcone_sirena';
const profile = () => ({...createProfile(), unlockedCars: [...createProfile().unlockedCars, car],
  cosmetics: {[car]: {owned: ['factory', 'sea-wreck'], selected: 'sea-wreck'}},
  deep: {version: 1, raised: ['sirena-car']}});
const race = (extra = {}) => ({runId: 'achievement-run', stageIndex: COURSE.findIndex(c => c.id === 'pacific-canyon'),
  car, mode: 'duel', cpuDifficulty: 'medium', difficulty: 'casual', seed: 1989,
  laps: 2, timeSec: 190, completed: true, won: true, deepEnabled: true, labEnabled: true,
  raceFinish: 'sea-wreck', ...extra});

test('shelf gates and derived progress are read-only, including legacy restored cars', () => {
  const p = profile(), before = JSON.stringify(p);
  assert.equal(achievementsPanel(p), '');
  assert.equal(achievementShelf(p, {enabled: true}).length, 1);
  const rows = achievementShelf(p, on);
  assert.deepEqual(rows.filter(r => r.earned).map(r => r.id), ['raised-from-the-deep', 'she-runs-again']);
  assert.ok(rows.every(r => r.at === null));
  assert.match(achievementsPanel(p, on), /Date not recorded/);
  assert.match(achievementsPanel(p, on), /An old racer still has a finish line/);
  assert.equal(JSON.stringify(p), before);
  delete p.cosmetics;
  assert.equal(achievementShelf(p, on).find(r => r.id === 'restored').earned, true);
  assert.equal(Object.hasOwn(normalizeProfile(p), 'achievements'), false);
});

test('valid settled finishes record once, survive load, and leave rewards unchanged', () => {
  const p = profile(), result = race();
  const settled = settleRace(p, result), plain = settleRace(p, {...result, labEnabled: false});
  assert.equal(settled.profile.credits, plain.profile.credits);
  assert.deepEqual(settled.profile.achievements.map(r => r.id), ['wreck-racer', 'coast-cup-as-found']);
  assert.ok(settled.profile.achievements.every(r => r.at === settled.profile.history.at(-1).at));
  const loaded = normalizeProfile(JSON.parse(JSON.stringify(settled.profile)));
  assert.deepEqual(loaded.achievements, settled.profile.achievements);
  assert.equal(settleRace(loaded, result).awarded, false);
  const again = settleRace(loaded, race({runId: 'again'}));
  assert.deepEqual(again.profile.achievements, loaded.achievements);
  const restored = settleRace(again.profile, race({runId: 'restored', raceFinish: 'restored-1966'}));
  assert.equal(restored.profile.achievements.length, 3);
  assert.match(achievementsPanel(restored.profile, on), /<time datetime=/);
  // One player's finished save never grants another player progress.
  assert.equal(achievementShelf(createProfile(), on).some(r => r.earned), false);
});

test('losing finishes earn Wreck racer; quitting, practice, qualifying and flags do not', () => {
  const loss = settleRace(profile(), race({won: false}));
  assert.deepEqual(loss.profile.achievements.map(r => r.id), ['wreck-racer']);
  for (const extra of [{completed: false, won: false}, {abandoned: true}, {qualifying: true},
    {practice: true}, {deepEnabled: false}, {labEnabled: false}, {raceFinish: 'factory'},
    {car: 'falcone_f42'}, {timeSec: 0}]) {
    assert.equal(Object.hasOwn(settleRace(profile(), race(extra)).profile, 'achievements'), false, JSON.stringify(extra));
  }
  const elsewhere = settleRace(profile(), race({stageIndex: COURSE.findIndex(c => c.id === 'high-country')}));
  assert.deepEqual(elsewhere.profile.achievements.map(r => r.id), ['wreck-racer']);
});

test('any race includes combat, Summit Time Attack and Grand Prix without career pay', () => {
  for (const extra of [{mode: 'wasteland'}, {mode: 'timetrial', laps: 1, stageIndex: COURSE.findIndex(c => c.id === 'summit-time-attack')},
    {mode: 'grandprix', position: 1, fieldSize: 8}, {mode: 'grandprix', position: 8, fieldSize: 8, grandPrixCareerEnabled: true, won: false}]) {
    const result = settleRace(profile(), race(extra));
    assert.ok(result.profile.achievements?.some(r => r.id === 'wreck-racer'), JSON.stringify(extra));
    if (extra.mode === 'grandprix' && !extra.grandPrixCareerEnabled) {
      assert.equal(result.awarded, false);
      assert.equal(result.achievementsAwarded, true);
      assert.equal(result.reward, 0);
    }
  }
});

test('historical fixture loading adds no achievements and invalid entries are bounded', () => {
  for (const file of readdirSync(new URL('./fixtures/saves/', import.meta.url)).filter(f => f.endsWith('.json'))) {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/' + file, import.meta.url), 'utf8'));
    for (const player of fixture.storage?.['the-duel-players-v2']?.players ?? []) {
      const bytes = JSON.stringify(player.profile);
      assert.equal(Object.hasOwn(normalizeProfile(player.profile), 'achievements'), false, file);
      assert.equal(JSON.stringify(player.profile), bytes);
    }
  }
  assert.deepEqual(normalizeAchievements([null, {id: 'unknown', at: 1}, {id: 'wreck-racer', at: -1},
    {id: 'wreck-racer', at: 8640000000000001}, {id: 'wreck-racer', at: 123}, {id: 'wreck-racer', at: 456}]),
  [{id: 'wreck-racer', at: 123}]);
});

test('App records the race-start finish through the no-pay GP path and reloads it', () => {
  const memory = new Map(), previous = globalThis.localStorage;
  globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value)};
  try {
    const app = ownTestCourses(new App());
    app._switches = () => ({enabled: name => ['the-deep', 'lab', 'grand-prix'].includes(name)});
    app.profile = {...app.profile, ...profile(), courses: app.profile.courses};
    app._saveProfile();
    assert.equal(app.startCampaign({startStage: race().stageIndex, car, mode: 'grandprix', cpuDifficulty: 'medium'}), true);
    assert.equal(app._racePaint.id, 'sea-wreck');
    // A later save selection cannot rewrite the finish used for this race.
    app.profile = {...app.profile, cosmetics: {...app.profile.cosmetics,
      [car]: {owned: ['factory', 'sea-wreck', 'restored-1966'], selected: 'restored-1966'}}};
    app._saveProfile();
    const state = app.duel.state;
    state.qualifying = {phase: 'complete'};
    state.results = {completed: true, won: true, position: 1, fieldSize: 8, timeSec: 190, laps: state.lapsTotal};
    app._settleResult(state.results, state);
    assert.deepEqual(app.profile.achievements.map(r => r.id), ['wreck-racer', 'coast-cup-as-found']);
    assert.deepEqual(new App().profile.achievements, app.profile.achievements);
    assert.equal(state.results.creditReward, 0);
    app.duel.dispose?.();
  } finally { globalThis.localStorage = previous; }
});

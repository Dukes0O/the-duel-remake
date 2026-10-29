import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {readFileSync, readdirSync} from 'node:fs';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {CIRCUIT_MANIFESTS, circuitDefinitions} from '../src/circuit-manifests.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {ownTestCourses, testCourseAccess} from './career-fixture.mjs';
import * as career from '../src/grand-prix-career.js';
import * as field from '../src/race-field.js';
import {createProfile, normalizeProfile, settleRace, loadPlayers, savePlayers,
  PLAYERS_KEY, CPU_REWARDS, DRIVING_MILESTONES} from '../src/progression.js';

// Actual pre-card sources, not a new-code round trip or copied pay/roster model.
async function previous(file) {
  const source = execFileSync('git', ['show', `0f9be837:${file}`], {encoding: 'utf8'})
    .replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, from, path, quote) =>
      from + new URL(path, new URL('../'+file, import.meta.url)).href + quote);
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const oldProgression = await previous('src/progression.js');
const oldField = await previous('src/race-field.js');
const fixtures = new URL('./fixtures/saves/', import.meta.url);
function storageFor(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)};
}
const profile = () => ({...createProfile(), credits: 5000, courses: testCourseAccess(),
  milestones: Object.keys(DRIVING_MILESTONES)});
const gpResult = (extra = {}) => ({runId: 'podium-test', stageIndex: 0,
  mode: 'grandprix', grandPrixCareerEnabled: true, completed: true, won: false,
  position: 2, fieldSize: 8, laps: 3, seed: 1989, timeSec: 300, car: 'falcone_f42',
  driverId: 'club', difficulty: 'casual', cpuDifficulty: 'medium', clean: false, ...extra});

test('one exact immutable membership source preserves both existing field exports', () => {
  assert.equal(career.GRAND_PRIX_COURSES, field.GRAND_PRIX_COURSES);
  assert.equal(career.grandPrixCourse, field.grandPrixCourse);
  assert.equal(Object.isFrozen(career.GRAND_PRIX_COURSES), true);
  // The old formula reads today's manifests and appends a slotted replacement
  // twice. Preserve its exact membership and order, with each course once.
  assert.deepEqual(career.GRAND_PRIX_COURSES, [...new Set(oldField.GRAND_PRIX_COURSES)]);
  assert.equal(new Set(career.GRAND_PRIX_COURSES).size, career.GRAND_PRIX_COURSES.length);
  for (const definition of [...COURSE, ...CIRCUIT_MANIFESTS, {id: 'unknown'}, null])
    assert.equal(career.grandPrixCourse(definition), oldField.grandPrixCourse(definition));
});

test('empty prospective getter defaults never infer history, wins or inherited data', () => {
  const plain = createProfile();
  assert.equal(JSON.stringify(plain), JSON.stringify(oldProgression.createProfile()));
  assert.equal(Object.hasOwn(plain, 'grandPrixPodiums'), false);
  assert.deepEqual(career.getGrandPrixPodiums(plain), []);
  const historical = {...plain, circuitWins: ['pacific-canyon'],
    history: [{key: 'old:0', eventId: 'pacific-canyon', won: true, position: 1, reward: 900}]};
  assert.deepEqual(career.getGrandPrixPodiums(historical), []);
  assert.equal(Object.hasOwn(normalizeProfile(historical), 'grandPrixPodiums'), false);
  const inherited = Object.assign(Object.create({grandPrixPodiums: ['pacific-canyon']}), plain);
  assert.deepEqual(career.getGrandPrixPodiums(inherited), []);
  assert.equal(Object.hasOwn(normalizeProfile(inherited), 'grandPrixPodiums'), false);
});

for (const file of readdirSync(fixtures).filter(name => name.endsWith('.json')).sort()) {
  test(`${file}: all historical normalized and round-trip bytes remain exact`, () => {
    const fixture = JSON.parse(readFileSync(new URL(file, fixtures), 'utf8'));
    const storage = storageFor(fixture.storage), oldStorage = storageFor(fixture.storage);
    const raw = Object.fromEntries(Object.keys(fixture.storage).map(key => [key, storage.getItem(key)]));
    const players = loadPlayers(storage);
    assert.equal(JSON.stringify(players), JSON.stringify(oldProgression.loadPlayers(oldStorage)));
    assert.ok(players.players.every(player => !Object.hasOwn(player.profile, 'grandPrixPodiums')));
    for (const [key, bytes] of Object.entries(raw)) assert.equal(storage.getItem(key), bytes);
    assert.equal(savePlayers(players, storage), true);
    assert.equal(oldProgression.savePlayers(oldProgression.loadPlayers(oldStorage), oldStorage), true);
    assert.equal(storage.getItem(PLAYERS_KEY), oldStorage.getItem(PLAYERS_KEY));
    assert.equal(JSON.stringify(loadPlayers(storage)), JSON.stringify(players));
    for (const [key, bytes] of Object.entries(raw)) if (key !== PLAYERS_KEY)
      assert.equal(storage.getItem(key), bytes, 'old profile/record/ghost keys are untouched');
  });
}

test('optional owned podium fields normalize known ids in first-occurrence order', () => {
  const disabled = CIRCUIT_MANIFESTS.find(manifest => manifest.id === 'panorama-ridge' && manifest.grandPrix);
  assert.ok(disabled, 'the authored Panorama Grand Prix manifest is known');
  const heldOff = createFeatureFlags({storage: null, qa: false, search: '',
    overrides: {[disabled.flag]: false}});
  assert.equal(heldOff.enabled(disabled.flag), false);
  assert.equal(circuitDefinitions(heldOff).some(stage => stage.id === disabled.id), false,
    'the supported runtime filter excludes the explicitly held-off circuit');
  assert.ok(career.GRAND_PRIX_COURSES.includes(disabled.id),
    'immutable known membership retains the held-off authored id');
  const source = {...createProfile(), grandPrixPodiums: ['high-country', disabled.id,
    'high-country', 'pacific-canyon', '', null, 4, {}, 'UNKNOWN', 'unknown', ' pacific-canyon']};
  const bytes = JSON.stringify(source), expected = ['high-country', disabled.id, 'pacific-canyon'];
  assert.deepEqual(career.getGrandPrixPodiums(source), expected);
  assert.deepEqual(normalizeProfile(source).grandPrixPodiums, expected);
  assert.equal(JSON.stringify(source), bytes);
  const read = career.getGrandPrixPodiums(source); read.push('harbor-highlands');
  assert.deepEqual(career.getGrandPrixPodiums(source), expected, 'getter shares no mutable array');
  for (const value of [null, undefined, {}, 'pacific-canyon', 8, true]) {
    const normalized = normalizeProfile({...createProfile(), grandPrixPodiums: value});
    assert.equal(Object.hasOwn(normalized, 'grandPrixPodiums'), true);
    assert.deepEqual(normalized.grandPrixPodiums, []);
  }
});

test('valid prospective top-three GP settlements record once and survive memory reload', () => {
  let current = profile();
  const storage = storageFor();
  const events = COURSE.map((stage, stageIndex) => ({stage, stageIndex}))
    .filter(({stage}) => field.grandPrixCourse(stage) && !stage.practice);
  assert.ok(events.length >= 9);
  for (const {stage, stageIndex} of events) for (const position of [1, 2, 3]) {
    const result = gpResult({runId: `podium-${stage.id}-${position}`, stageIndex, position,
      won: position === 1, laps: stage.grandPrixLaps ?? 3});
    const before = JSON.stringify(current), settled = settleRace(current, result);
    assert.equal(settled.awarded, true);
    assert.equal(JSON.stringify(current), before);
    assert.equal(settled.profile.grandPrixPodiums.filter(id => id === stage.id).length, 1);
    current = settled.profile;
    assert.equal(savePlayers({version: 2, activePlayerId: 'owner',
      players: [{id: 'owner', name: 'Podium Owner', profile: current}]}, storage), true);
    current = loadPlayers(storage).players[0].profile;
    assert.equal(settleRace(current, result).profile, current, 'reload retains duplicate keys');
  }
  assert.deepEqual(current.grandPrixPodiums, events.map(({stage}) => stage.id));
});

test('invalid, non-member, off, practice, abandoned and duplicate requests add nothing', () => {
  const practice = COURSE.findIndex(stage => stage.practice);
  const nonMember = COURSE.findIndex(stage => !field.grandPrixCourse(stage) && !stage.practice);
  assert.ok(practice >= 0 && nonMember >= 0);
  const variations = [
    ...[4, 5, 6, 7, 8].map(position => ({position})),
    {position: 0}, {position: 9}, {position: 2.5}, {position: NaN},
    {fieldSize: 2, position: 3}, {position: 2, won: true},
    {grandPrixCareerEnabled: false}, {grandPrixCareerEnabled: undefined},
    {qualifying: true}, {practice: true}, {abandoned: true}, {completed: false},
    {timeout: true}, {timeSec: 0}, {timeSec: NaN}, {laps: 7}, {car: 'missing'},
    {driverId: 'missing'}, {runId: ''}, {stageIndex: -1},
    {stageIndex: practice}, {stageIndex: nonMember, laps: COURSE[nonMember].grandPrixLaps ?? 3},
    ...['duel', 'timetrial', 'wasteland'].map(mode => ({mode, laps: COURSE[0].laps || 2})),
  ];
  for (const extra of variations) {
    const before = profile(), bytes = JSON.stringify(before);
    assert.equal(Object.hasOwn(settleRace(before, gpResult(extra)).profile, 'grandPrixPodiums'), false);
    assert.equal(JSON.stringify(before), bytes);
  }
  const payload = gpResult();
  for (const field of ['settledResults', 'wasteland']) {
    const before = profile(), key = `${payload.runId}:${payload.stageIndex}`;
    if (field === 'wasteland') before.wasteland = {...before.wasteland, settledResults: [key]};
    else before.settledResults = [key];
    assert.equal(settleRace(before, payload).profile, before);
  }
});

test('only the prospective set differs from actual pre-card settlement bytes and pay', () => {
  const clock = Date.now; Date.now = () => 123456;
  try {
    for (const cpuDifficulty of Object.keys(CPU_REWARDS)) for (let position = 1; position <= 8; position++)
      for (const extra of [{}, {snowmen: 12, difficulty: 'pro'}, {clean: true}]) {
        const before = profile(), payload = gpResult({cpuDifficulty, position, won: position === 1, ...extra});
        const actual = settleRace(before, payload), legacy = oldProgression.settleRace(before, payload);
        if (position <= 3) {
          assert.deepEqual(actual.profile.grandPrixPodiums, ['pacific-canyon']);
          const comparable = {...actual, profile: {...actual.profile}};
          delete comparable.profile.grandPrixPodiums;
          assert.equal(JSON.stringify(comparable), JSON.stringify(legacy));
        } else assert.equal(JSON.stringify(actual), JSON.stringify(legacy));
      }
    for (const extra of [{grandPrixCareerEnabled: false}, {qualifying: true}, {practice: true},
      {abandoned: true}, {completed: false}, {position: 2, won: true}, {car: 'missing'}]) {
      const before = profile(), payload = gpResult(extra);
      assert.equal(JSON.stringify(settleRace(before, payload)), JSON.stringify(oldProgression.settleRace(before, payload)));
    }
    const capped = {...profile(), credits: 999999990}, payload = gpResult();
    const actual = settleRace(capped, payload), legacy = oldProgression.settleRace(capped, payload);
    assert.equal(actual.reward, 10);
    assert.equal(actual.profile.credits, 1000000000);
    assert.deepEqual(actual.profile.grandPrixPodiums, ['pacific-canyon']);
    const comparable = {...actual, profile: {...actual.profile}};
    delete comparable.profile.grandPrixPodiums;
    assert.equal(JSON.stringify(comparable), JSON.stringify(legacy));
  } finally { Date.now = clock; }
});

test('native App classification settles owned podiums per named player and preserves duplicate bytes', () => {
  const storageBefore = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const cancelBefore = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  const storage = storageFor();
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
  globalThis.cancelAnimationFrame ??= () => {};
  const apps = [];
  try {
    const app = new App(); apps.push(app);
    ownTestCourses(app);
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: true,
      overrides: {'grand-prix': true, 'grand-prix-career': true}});
    const finish = (stageIndex, position) => {
      assert.equal(app.startCampaign({startStage: stageIndex, mode: 'grandprix',
        car: 'falcone_f42', cpuDifficulty: 'medium', seed: 1989}), true);
      const state = app.duel.state;
      Object.assign(state, {status: 'racing', stageTimeSec: 300, lapStartedAt: 300,
        racePenaltySec: 0, s: app.duel.raceLength, completedLaps: state.lapsTotal,
        lap: state.lapsTotal, currentLap: state.lapsTotal,
        lapTimes: Array(state.lapsTotal).fill(100), lateral: 0});
      state.opponents.forEach((opponent, i) => Object.assign(opponent,
        i < position - 1 ? {completedLaps: state.lapsTotal, lapStartedAt: 280+i, lapTimes: [90, 90, 100+i]}
          : {completedLaps: 0, s: 0}));
      assert.equal(app.duel._finishStage(), true);
      assert.equal(state.results.position, position, 'the native field classifies the podium');
      assert.ok(state.results.creditReward > 0);
      assert.ok(app.profile.grandPrixPodiums.includes(COURSE[stageIndex].id));
      const bytes = storage.getItem(PLAYERS_KEY), profileBytes = JSON.stringify(app.profile);
      app.duel.emit({stageResult: state.results});
      assert.equal(storage.getItem(PLAYERS_KEY), bytes);
      assert.equal(JSON.stringify(app.profile), profileBytes);
      app.returnToMenu();
    };
    finish(0, 2);
    const owner = app.player.id;
    assert.equal(app.addPlayer('Other Podium QA').ok, true);
    assert.equal(Object.hasOwn(app.profile, 'grandPrixPodiums'), false);
    ownTestCourses(app);
    finish(1, 3);
    const other = app.player.id, loaded = loadPlayers(storage);
    assert.deepEqual(loaded.players.find(player => player.id === owner).profile.grandPrixPodiums, ['pacific-canyon']);
    assert.deepEqual(loaded.players.find(player => player.id === other).profile.grandPrixPodiums, ['high-country']);
    app.selectPlayer(owner);
    assert.deepEqual(app.profile.grandPrixPodiums, ['pacific-canyon']);
    const fresh = new App(); apps.push(fresh);
    assert.deepEqual(fresh.profile.grandPrixPodiums, ['pacific-canyon']);
    assert.ok(app.leaderboard.entries.every(entry => !Object.hasOwn(entry, 'grandPrixPodiums')));
    assert.ok(app.ghosts.records.every(entry => !Object.hasOwn(entry, 'grandPrixPodiums')));
  } finally {
    for (const app of apps) app.dispose();
    if (storageBefore) Object.defineProperty(globalThis, 'localStorage', storageBefore); else delete globalThis.localStorage;
    if (cancelBefore) Object.defineProperty(globalThis, 'cancelAnimationFrame', cancelBefore); else delete globalThis.cancelAnimationFrame;
  }
});

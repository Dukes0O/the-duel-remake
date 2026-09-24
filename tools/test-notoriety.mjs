import assert from 'node:assert/strict';
import test from 'node:test';
import {COURSE} from '../src/config.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, normalizeProfile, settleRace} from '../src/progression.js';
import {combatNotoriety, rankForXp, MAX_NOTORIETY_RANK} from '../src/notoriety.js';

const result = (overrides = {}) => ({
  runId: 'notoriety-race', stageIndex: 0, car: 'falcone_f42',
  mode: 'wasteland', combatRewardsEnabled: true,
  difficulty: 'casual', cpuDifficulty: 'easy',
  completed: true, won: true, timeSec: 180, laps: 2,
  hitsLanded: 4, wrecksCaused: 1,
  ...overrides,
});

test('rank costs rise by 150 XP per rank and stop at 30', () => {
  assert.equal(rankForXp(0), 1);
  assert.equal(rankForXp(399), 1);
  assert.equal(rankForXp(400), 2);
  assert.equal(rankForXp(949), 2);
  assert.equal(rankForXp(950), 3);
  assert.equal(rankForXp(72_499), 29);
  assert.equal(rankForXp(72_500), MAX_NOTORIETY_RANK);
  assert.equal(rankForXp(1_000_000_000), MAX_NOTORIETY_RANK);
  assert.equal(rankForXp(NaN), 1);
});

test('owned hits, caused wrecks, finish and win add XP once per combat stage', () => {
  const first = settleRace(createProfile(), result());
  assert.equal(first.notorietyEarned, 590);
  assert.deepEqual(first.notorietyBreakdown, {
    hit: 40, wreck: 150, onFootKnockdown: 0, rpgDirectHit: 0,
    footAmbushHit: 0, raiderKnockdown: 0, finish: 100, win: 300,
  });
  assert.equal(first.profile.wasteland.xp, 590);
  assert.equal(first.profile.wasteland.rank, 2);
  assert.deepEqual(first.profile.wasteland.settledResults, ['notoriety-race:0']);
  assert.equal(first.profile.history.at(-1).notorietyXp, 590);
  assert.equal(settleRace(first.profile, result()).awarded, false);

  const saved = normalizeProfile(first.profile);
  assert.equal(saved.wasteland.xp, 590);
  assert.equal(saved.wasteland.rank, 2);
  assert.equal(settleRace(saved, result()).awarded, false);
  const second = settleRace(saved, result({
    stageIndex: 1, won: false, hitsLanded: 2, wrecksCaused: 0,
  }));
  assert.equal(second.notorietyEarned, 120);
  assert.equal(second.profile.wasteland.xp, 710);
  assert.deepEqual(second.profile.wasteland.settledResults,
    ['notoriety-race:0', 'notoriety-race:1']);
});

test('old profiles start at zero XP and long settlement keys survive save reload', () => {
  const old = normalizeProfile({version: 2, credits: 200,
    weapons: {levels: {ufo: 2}}, settledResults: ['old:0']});
  assert.equal(old.wasteland.xp, 0);
  assert.equal(old.wasteland.rank, 1);
  assert.equal(old.wasteland.weapons.levels.ufo, 2);
  const longRun = 'r'.repeat(120);
  const earned = settleRace(old, result({runId: longRun, hitsLanded: 0, wrecksCaused: 0}));
  assert.equal(earned.notorietyEarned, 400);
  const saved = normalizeProfile(earned.profile);
  assert.ok(saved.wasteland.settledResults.includes(longRun + ':0'));
  assert.equal(settleRace(saved, result({runId: longRun})).awarded, false);
  assert.equal(normalizeProfile({...old, wasteland: {...old.wasteland,
    xp: 950, rank: 1}}).wasteland.rank, 3,
  'load derives rank from earned XP, not a stale saved number');
});

test('ordinary, flag-off, practice and unfinished races earn no Notoriety', () => {
  const practice = COURSE.findIndex(stage => stage.practice);
  for (const override of [
    {mode: 'duel'}, {mode: 'timetrial'},
    {combatRewardsEnabled: false},
    {stageIndex: practice},
    {completed: false}, {completed: false, timeout: true},
    {completed: false, abandoned: true},
  ]) {
    const settled = settleRace(createProfile(), result(override));
    assert.equal(settled.profile.wasteland.xp, 0);
    assert.equal(settled.profile.wasteland.rank, 1);
    assert.equal(settled.profile.wasteland.settledResults.length, 0);
    assert.equal(Object.hasOwn(settled, 'notorietyEarned'), false);
  }
});

test('future on-foot actions need explicit player-owned events, never generic knockdowns', () => {
  const events = [
    {id: 'fighter-1', type: 'onFootKnockdown', owner: 'player', source: 'onFoot'},
    {id: 'fighter-1', type: 'onFootKnockdown', owner: 'player', source: 'onFoot'},
    {id: 'shot-1', type: 'rpgDirectHit', owner: 'player', source: 'onFoot'},
    {id: 'shot-1', type: 'footAmbushHit', owner: 'player', source: 'onFoot'},
    {id: 'raider-1', type: 'raiderKnockdown', owner: 'player', source: 'onFoot'},
    {id: 'cpu-1', type: 'onFootKnockdown', owner: 'cpu', source: 'onFoot'},
    {id: 'vehicle-1', type: 'rpgDirectHit', owner: 'player', source: 'car'},
    {id: 'unknown', type: 'unlisted', owner: 'player', source: 'onFoot'},
    {type: 'onFootKnockdown', owner: 'player', source: 'onFoot'},
  ];
  const settled = settleRace(createProfile(), result({
    won: false, hitsLanded: 0, wrecksCaused: 0,
    knockdowns: 999, notorietyEvents: events,
  }));
  assert.equal(settled.notorietyEarned, 300);
  assert.equal(settled.notorietyBreakdown.onFootKnockdown, 60);
  assert.equal(settled.notorietyBreakdown.rpgDirectHit, 40);
  assert.equal(settled.notorietyBreakdown.footAmbushHit, 75);
  assert.equal(settled.notorietyBreakdown.raiderKnockdown, 25);
  assert.equal(combatNotoriety(result({completed: false, notorietyEvents: events}),
    {finished: false, won: false}), null);
});

test('malformed or extreme counters cannot overflow XP or bypass the rank cap', () => {
  for (const bad of [-1, 1.5, '3', NaN, Infinity, null]) {
    const settled = settleRace(createProfile(), result({
      won: false, hitsLanded: bad, wrecksCaused: bad,
    }));
    assert.equal(settled.notorietyEarned, 100);
  }
  const almostFull = createProfile();
  almostFull.wasteland.xp = 999_999_990;
  almostFull.wasteland.rank = 30;
  const capped = settleRace(almostFull, result({
    hitsLanded: Number.MAX_SAFE_INTEGER,
    wrecksCaused: Number.MAX_SAFE_INTEGER,
  }));
  assert.equal(capped.notorietyEarned, 10);
  assert.equal(capped.profile.wasteland.xp, 1_000_000_000);
  assert.equal(capped.profile.wasteland.rank, 30);
});

test('the real App saves combat XP once when a flagged Mad Max race ends', () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }});
  try {
    const app = new App();
    app.duel.featureFlags = createFeatureFlags({
      overrides: {wasteland2: true}, storage: null, qa: false,
    });
    assert.equal(app.startCampaign({mode: 'wasteland', startStage: 0}), true);
    const state = app.duel.state;
    state.status = 'racing';
    state.stageTimeSec = 180;
    state.s = app.duel.raceLength;
    state.completedLaps = state.lapsTotal;
    state.lapTimes = Array(state.lapsTotal).fill(90);
    state.combat.scoring.hitsLanded = 2;
    state.combat.scoring.wrecksCaused = 1;
    if (state.rival) state.rival.finishTime = null;
    assert.equal(app.duel._finishStage(), true);
    assert.equal(app.profile.wasteland.xp, 570);
    assert.equal(app.profile.wasteland.rank, 2);
    app.duel.emit({stageResult: state.results});
    assert.equal(app.profile.wasteland.xp, 570);
    assert.equal(new App().profile.wasteland.xp, 570);
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  }
});

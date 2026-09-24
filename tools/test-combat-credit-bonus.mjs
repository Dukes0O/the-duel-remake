import assert from 'node:assert/strict';
import test from 'node:test';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {createProfile, normalizeProfile, settleRace, CPU_REWARDS} from '../src/progression.js';
import {createResultsScreen} from '../src/screen-results.js';

const finish = (overrides = {}) => ({
  runId: 'save01-race', stageIndex: 0, car: 'falcone_f42',
  mode: 'wasteland', combatRewardsEnabled: true,
  difficulty: 'casual', cpuDifficulty: 'easy',
  completed: true, won: true, timeSec: 180, laps: 2,
  hitsLanded: 4, wrecksCaused: 1, ...overrides,
});
const wallet = credits => ({...createProfile(), credits});

test('completed combat wins earn hits and wrecks, capped before Manual doubling', () => {
  const win = settleRace(wallet(100), finish());
  assert.equal(win.breakdown.base, CPU_REWARDS.easy);
  assert.equal(win.breakdown.combat, 140);
  assert.equal(win.reward, CPU_REWARDS.easy + 140);
  assert.equal(win.profile.credits, 100 + win.reward);

  const capped = settleRace(wallet(0), finish({
    cpuDifficulty: 'hard', hitsLanded: Number.MAX_SAFE_INTEGER,
    wrecksCaused: Number.MAX_SAFE_INTEGER, difficulty: 'pro',
  }));
  assert.equal(capped.breakdown.combat, 375);
  assert.equal(capped.breakdown.manual, CPU_REWARDS.hard + 375);
  assert.equal(capped.reward, 2 * (CPU_REWARDS.hard + 375));
});

test('completed combat losses can earn a bonus without taking banked credits', () => {
  for (const difficulty of ['casual', 'pro']) {
    const loss = settleRace(wallet(500), finish({
      won: false, difficulty, hitsLanded: 2, wrecksCaused: 1,
    }));
    assert.equal(loss.breakdown.base, 0);
    assert.equal(loss.breakdown.combat, 120);
    assert.equal(loss.breakdown.manual, difficulty === 'pro' ? 120 : 0);
    assert.equal(loss.charge, 0);
    assert.equal(loss.reward, difficulty === 'pro' ? 240 : 120);
    assert.equal(loss.profile.credits, 500 + loss.reward);
  }
});

test('timeout and abandonment pay no combat bonus and never debit the combat wallet', () => {
  for (const result of [
    finish({won: false, completed: false, timeout: true}),
    finish({won: false, completed: false, abandoned: true}),
  ]) {
    const settled = settleRace(wallet(500), result);
    assert.equal(settled.reward, 0);
    assert.equal(settled.charge, 0);
    assert.equal(settled.profile.credits, 500);
    assert.equal(settled.breakdown.combat || 0, 0);
  }
});

test('flag-off and ordinary races keep the old loss charge and reward shape', () => {
  for (const result of [
    finish({combatRewardsEnabled: false, won: false}),
    finish({mode: 'duel', won: false}),
  ]) {
    const settled = settleRace(wallet(500), result);
    assert.equal(settled.charge, 300);
    assert.equal(settled.reward, -300);
    assert.equal(settled.profile.credits, 200);
    assert.equal(Object.hasOwn(settled.breakdown, 'combat'), false);
  }
});

test('invalid stats pay zero; credits and bonus history survive normalization once', () => {
  for (const count of [-1, 1.5, '5', NaN, Infinity, null]) {
    const invalid = settleRace(wallet(0), finish({hitsLanded: count, wrecksCaused: count}));
    assert.equal(invalid.breakdown.combat, 0);
  }
  const first = settleRace(wallet(40), finish());
  const saved = normalizeProfile(first.profile);
  assert.equal(saved.credits, 40 + first.reward);
  assert.equal(saved.history.at(-1).breakdown.combat, 140);
  const repeat = settleRace(saved, finish());
  assert.equal(repeat.awarded, false);
  assert.equal(repeat.profile.credits, saved.credits);
  assert.equal(repeat.profile.history.length, 1);
});

test('the real App passes the feature switch and displays the awarded bonus', () => {
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
    state.stageCrashes = 1;
    state.combat.scoring.hitsLanded = 4;
    state.combat.scoring.wrecksCaused = 1;
    if (state.rival) state.rival.finishTime = null;
    assert.equal(app.duel._finishStage(), true);
    assert.equal(state.results.creditBreakdown.combat, 140);
    const creditsAfter = app.profile.credits;
    app.duel.emit({stageResult: state.results});
    assert.equal(app.profile.credits, creditsAfter);
    assert.equal(new App().profile.credits, creditsAfter);

    const modal = createResultsScreen({
      app, profile: () => app.profile,
      credits: value => String(Math.floor(value || 0)),
      escapeHTML: value => String(value),
      time: value => Number(value || 0).toFixed(2),
      arrow: '',
    });
    assert.ok(modal(state).includes('COMBAT BONUS +140'));
    assert.ok(!modal(state).includes('undefined +'));
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  }
});

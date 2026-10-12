import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {installTestDriver} from './race-field-balance.mjs';
import {ownTestCourses} from './career-fixture.mjs';
import {createResultsScreen} from '../src/screen-results.js';
import {createLeaderboardScreen} from '../src/screen-leaderboard.js';
import {loadLeaderboard, createLeaderboard, recordFinish} from '../src/leaderboard.js';
import {loadGhosts} from '../src/ghost.js';
import {createProfile, loadProfile, PLAYERS_KEY, settleRace, CPU_REWARDS, DRIVING_MILESTONES} from '../src/progression.js';

const legacyPlayer = {id: 'legacy-compare', name: 'Legacy Driver'};
const legacyFinish = {stageIndex: 0, completed: true, won: true, seed: 1989, laps: 2,
  timeSec: 120, mode: 'duel', car: 'falcone_f42', driverId: 'club',
  difficulty: 'casual', cpuDifficulty: 'medium'};
const legacyDuel = recordFinish(createLeaderboard(), legacyFinish, legacyPlayer);
assert.equal(legacyDuel.recorded, true);
const slowerTrial = recordFinish(legacyDuel.board, {...legacyFinish, mode: 'timetrial', timeSec: 130}, legacyPlayer);
assert.equal(slowerTrial.recorded, false, 'legacy slower TimeTrial cannot create a second mode-discriminated row');
assert.equal(slowerTrial.board.entries.length, 1, 'legacy deduplication remains exact');

const ratios = [1, .75, .55, .40, .30, .20, .15, .10];
const profile = () => ({...createProfile(), credits: 5000,
  milestones: Object.keys(DRIVING_MILESTONES)});
const result = (cpu, position, extra = {}) => ({runId: `gp-${cpu}-${position}`, stageIndex: 0,
  mode: 'grandprix', grandPrixCareerEnabled: true, completed: true, won: position === 1,
  position, fieldSize: 8, laps: 3, seed: 1989, timeSec: 300, car: 'falcone_f42',
  driverId: 'club', difficulty: 'casual', cpuDifficulty: cpu, clean: false, ...extra});
let checks = 0;
for (const [cpu, base] of Object.entries(CPU_REWARDS)) for (let position = 1; position <= 8; position++) {
  const before = profile(), payload = result(cpu, position), settled = settleRace(before, payload);
  const expected = Math.round(base * ratios[position - 1]);
  assert.equal(settled.reward, expected, `${cpu} position ${position} pays the approved share`);
  assert.equal(settled.charge, 0, 'a completed GP has no Duel loss charge');
  assert.equal(settled.profile.credits, before.credits + expected, 'wallet gets only actual earned credits');
  const repeated = settleRace(settled.profile, payload);
  assert.equal(repeated.reward, 0, 'the same run/stage cannot pay again');
  assert.equal(repeated.profile, settled.profile, 'duplicate settlement preserves the exact profile');
  checks += 5;
}
for (const position of [0, 9, -1, 2.5, NaN, Infinity]) {
  const before = profile(), settled = settleRace(before, result('medium', position));
  assert.equal(settled.profile, before, 'malformed position cannot change the wallet or history'); checks++;
}
for (const extra of [{grandPrixCareerEnabled: false}, {qualifying: true},
  {position: 2, won: true}, {position: 8, fieldSize: 6}]) {
  const before = profile(), settled = settleRace(before, result('medium', 1, extra));
  assert.equal(settled.profile, before, 'off/qualifying/forged win cannot settle'); checks++;
}
const abandoned = settleRace(profile(), result('medium', 4, {completed: false, abandoned: true}));
assert.equal(abandoned.reward, 0, 'abandoning keeps saved credits');
assert.equal(abandoned.charge, 0, 'abandoning has no loss charge'); checks += 2;
const manual = settleRace(profile(), result('medium', 3, {difficulty: 'pro'}));
assert.equal(manual.reward, 1100, 'Pro doubles positive third-place earnings'); checks++;
const clean = settleRace(profile(), result('medium', 1, {clean: true}));
assert.equal(clean.reward, 1100, 'existing clean-win bonus stays eligible'); checks++;
const snowmen = settleRace(profile(), result('medium', 8, {snowmen: 12, difficulty: 'pro'}));
assert.equal(snowmen.reward, 450, 'ten snowmen pay25 each without doubling their fixed pay'); checks++;
assert.equal(FEATURE_STATES['grand-prix-career'], 'dev', 'the new pay slice stays off in production');
assert.equal(createFeatureFlags({storage: null, qa: false, search: '?flags=grand-prix-career'}).enabled('grand-prix-career'), false);
assert.equal(createFeatureFlags({storage: null, qa: true, search: '?flags=grand-prix-career'}).enabled('grand-prix-career'), true);
checks += 3;
console.log(`Grand Prix pay: ${checks} pure settlement checks passed.`);
if (process.argv.includes('--pure-only')) process.exit(0);

// Original legal driver, native grid-to-finish and actual settlement, in memory only.
const storageBefore = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const cancelBefore = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
const nativeReports = [];
try {
  for (const enabled of [false, true]) {
    const memory = new Map();
    globalThis.localStorage = {getItem: key => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key)};
    globalThis.cancelAnimationFrame ??= () => {};
    const app = new App();
    try {
      ownTestCourses(app);
      app.duel.featureFlags = createFeatureFlags({storage: null, qa: false, search: '',
        overrides: {'grand-prix': true, 'grand-prix-career': enabled}});
      assert.ok(app.startCampaign({startStage: 0, mode: 'grandprix', seed: 1989,
        fieldSeed: 1000, car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium'}));
      app.autopilot = true; app._scriptedCrashDone = true; installTestDriver(app);
      const wallet = app.profile.credits, fingerprint = createHash('sha256');
      for (let tick = 0; tick < 60000 && ['countdown', 'racing'].includes(app.duel.state.status); tick++) {
        app.advance(1 / 60, 1 / 60);
        const state = app.duel.state;
        fingerprint.update(JSON.stringify([state.s, state.lateral, state.speedMph, state.completedLaps,
          state.opponents.map(car => [car.s, car.lateral, car.speedMph, car.finished])]));
      }
      const state = app.duel.state, finish = state.results;
      assert.equal(state.completedLaps, 3, 'actual legal controls complete the GP');
      assert.equal(state.status, 'stage_result');
      assert.equal(app.ghostPose, null, 'best-lap recording never displays a GP ghost');
      if (!enabled) {
        assert.equal(app.profile.credits, wallet, 'flag-off GP wallet stays exact');
        assert.equal(app.leaderboard.entries.filter(row => row.mode === 'grandprix').length, 0);
        assert.equal(app.ghosts.records.filter(row => row.mode === 'grandprix').length, 0);
      } else {
        assert.ok(finish.creditReward > 0, 'a genuine completed GP pays its position');
        assert.equal(app.profile.credits, wallet + finish.creditReward);
        assert.equal(finish.creditCharge, 0);
        assert.ok(loadLeaderboard(globalThis.localStorage).entries.some(row => row.mode === 'grandprix' && row.laps === 3));
        assert.ok(loadGhosts(globalThis.localStorage).records.some(row => row.mode === 'grandprix' && row.laps === 1));
        const bankedBytes = memory.get(PLAYERS_KEY);
        assert.equal(typeof bankedBytes, 'string', 'native settlement actually saved the named-player registry');
        const settledBytes = JSON.stringify(app.profile);
        app._settleResult(finish, state);
        assert.equal(JSON.stringify(app.profile), settledBytes, 'native duplicate event cannot pay twice');
        assert.equal(memory.get(PLAYERS_KEY), bankedBytes, 'native duplicate leaves banked bytes exact');
        assert.equal(loadProfile(globalThis.localStorage).credits, app.profile.credits, 'earned wallet survives reload');
        const screen = createResultsScreen({app, profile: () => app.profile, credits: String,
          escapeHTML: String, time: String, arrow: ''})(state);
        assert.ok(screen.includes('POSITION PAY') && screen.includes('CREDITS EARNED'), 'native result shows earned credits');
        assert.ok(screen.includes(String(finish.creditReward)), 'actual earned amount is in the result');
        const board = createLeaderboardScreen({app, boardFilter: {stage: 0, mode: 'grandprix', driverId: 'club'},
          credits: String, escapeHTML: String, time: String})();
        assert.ok(board.includes('GRAND PRIX') && board.includes('3 LAPS'), 'native GP record is selectable and visible');
      }
      nativeReports.push({enabled, fingerprint: fingerprint.digest('hex'), position: finish.position,
        timeSec: finish.timeSec, reward: finish.creditReward, wallet: app.profile.credits});
    } finally {app.dispose();}
  }
  assert.equal(nativeReports[0].fingerprint, nativeReports[1].fingerprint, 'pay/records do not change the actual race trace');
} finally {
  if (storageBefore) Object.defineProperty(globalThis, 'localStorage', storageBefore); else delete globalThis.localStorage;
  if (cancelBefore) Object.defineProperty(globalThis, 'cancelAnimationFrame', cancelBefore); else delete globalThis.cancelAnimationFrame;
}
console.log('Native Grand Prix pay:', JSON.stringify(nativeReports));


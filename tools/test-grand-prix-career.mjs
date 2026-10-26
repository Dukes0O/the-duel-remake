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
import {GrandPrixLapRecorder, createGhostStore, storeGhost, findGhost, normalizeGhostStore, loadGhosts, GHOST_KEY, GhostRecorder, ghostKey, MAX_GHOST_BYTES, MAX_GHOSTS} from '../src/ghost.js';
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
const check = (value, message) => {assert.ok(value, message); checks++;};
const equal = (a, b, message) => {assert.deepEqual(a, b, message); checks++;};
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
const ceilingProfile = {...profile(), credits: 999999990};
const ceiling = settleRace(ceilingProfile, result('medium', 2));
assert.equal(ceiling.reward, 10, 'positive GP pay banks only available wallet room');
assert.equal(ceiling.profile.credits, 1000000000, 'positive GP pay respects the existing wallet ceiling');
assert.equal(ceiling.charge, 0);
assert.equal(settleRace(ceiling.profile, result('medium', 2)).profile, ceiling.profile, 'ceiling settlement is still once-only'); checks += 4;
const snowmen = settleRace(profile(), result('medium', 8, {snowmen: 12, difficulty: 'pro'}));
assert.equal(snowmen.reward, 450, 'ten snowmen pay25 each without doubling their fixed pay'); checks++;
const snowmanScreen = createResultsScreen({app: {_switches: () => ({enabled: key => key === 'grand-prix-career'})},
  profile: () => snowmen.profile, credits: String, escapeHTML: String, time: String, arrow: ''})({
    status: 'stage_result', stageIndex: 0, results: {...result('medium', 8), grandPrix: true,
      stageName: 'Pacific Canyon', snowmen: 12,
      field: [{position: 1, name: 'Winner', car: 'falcone_f42', gapSec: 0},
        {position: 8, name: 'You', car: 'falcone_f42', you: true, gapSec: 10}],
      creditPositionReward: snowmen.breakdown.base,
      creditReward: snowmen.reward, creditBreakdown: snowmen.breakdown}});
assert.ok(snowmanScreen.includes('SNOWMEN</span><b>12</b>'), 'result shows the actual hit count');
assert.ok(snowmanScreen.includes('SNOWMEN +250'), 'paid snowmen display their named capped bonus');
assert.ok(!snowmanScreen.includes('undefined'), 'every paid bonus has a visible label'); checks += 3;
assert.equal(FEATURE_STATES['grand-prix-career'], 'on', 'Grand Prix career is released');
assert.equal(createFeatureFlags({storage: null, qa: false}).enabled('grand-prix-career'), true, 'production pays without URL flags');
assert.equal(createFeatureFlags({storage: null, qa: false, search: '?flags=grand-prix-career'}).enabled('grand-prix-career'), true);
assert.equal(createFeatureFlags({storage: null, qa: true, search: '?flags=grand-prix-career'}).enabled('grand-prix-career'), true);
checks += 4;
// New GP admission cannot spend the budget by deleting existing Time Trial ghosts.
const storagePlayer = {id: 'storage-fixture', name: 'Storage Driver'};
const storageContext = {playerId: storagePlayer.id, stageIndex: 0, seed: 1989, laps: 2,
  car: 'falcone_f42', mode: 'timetrial', difficulty: 'casual', cpuDifficulty: 'medium'};
const storageRecorder = new GhostRecorder(storageContext);
const storageState = {...storageContext, playerId: storagePlayer.id, driverId: 'club',
  status: 'racing', racePenaltySec: 0, lateral: 0, speedMph: 80};
for (let i = 0; i <= 1200; i++) {
  storageState.stageTimeSec = i / 10; storageState.s = COURSE[0].lengthU * 2 * i / 1200;
  storageRecorder.observe(storageState);
}
const storageTT = storageRecorder.finish({...storageContext, timeSec: 120,
  completed: true, won: true}, storageState, storagePlayer);
check(storageTT, 'capacity fixture is a valid old Time Trial recording');
const byteLength = value => new TextEncoder().encode(JSON.stringify(value)).length;
const storageRows = Array.from({length: MAX_GHOSTS}, (_, i) => {
  const options = {...storageTT, playerId: `prior-${i}`};
  return {...options, key: ghostKey(options.playerId, options), recordedAt: i, lastUsedAt: i};
});
const gpStorage = {...storageTT, mode: 'grandprix', laps: 1,
  raceLength: COURSE[0].lengthU, timeSec: 90, recordedAt: 9999, lastUsedAt: 9999,
  samples: storageTT.samples.map(row => [Math.round(row[0] * .75), Math.round(row[1] / 2), ...row.slice(2)])};
gpStorage.key = ghostKey(gpStorage.playerId, gpStorage);
const oldLayout = {...storageTT, layoutVersion: storageTT.layoutVersion - 1};
oldLayout.key = ghostKey(oldLayout.playerId, oldLayout, oldLayout.layoutVersion, oldLayout.driverSignature);
// Damaged old-layout sample containers cannot hide valid current/archive ghosts.
const legacyWithoutLength = {...oldLayout}; delete legacyWithoutLength.raceLength;
const validMixed = {version: 1, records: [storageTT], archivedRecords: [legacyWithoutLength]};
const validMixedBytes = JSON.stringify(normalizeGhostStore(validMixed));
for (const samples of [{}, 42, 'damaged', true, null]) {
  const damagedLegacy = {...legacyWithoutLength, samples};
  const mixed = {version: 1, records: [storageTT, damagedLegacy], archivedRecords: [legacyWithoutLength]};
  const original = JSON.stringify(mixed);
  const normalized = normalizeGhostStore(mixed);
  equal(JSON.stringify(normalized), validMixedBytes, 'damaged legacy samples retain exact valid current/archive records');
  equal(JSON.stringify(mixed), original, 'damaged legacy rejection never mutates caller bytes');
  const disposableStorage = {getItem: key => key === GHOST_KEY ? original : null};
  equal(JSON.stringify(loadGhosts(disposableStorage)), validMixedBytes,
    'public load keeps valid mixed-store ghosts accessible despite one damaged legacy row');
}
const countStore = normalizeGhostStore({version: 1, records: storageRows, archivedRecords: [oldLayout]});
equal(countStore.archivedRecords.length, 1, 'count fixture retains a valid historical recording');
equal(countStore.records.length, 12, 'count fixture retains all twelve old ghosts');
const countBytes = JSON.stringify(countStore), countAdmission = storeGhost(countStore, gpStorage);
check(!countAdmission.saved && countAdmission.reason === 'capacity', 'thirteenth GP ghost is visibly rejected');
equal(JSON.stringify(countAdmission.store), countBytes, 'GP count rejection retains every old store byte');
const denseSamples = (timeSec, length) => Array.from({length: 1800}, (_, i) =>
  [Math.round(i * timeSec * 1000 / 1799), Math.round(i * length * 100 / 1799),
    17999, 399999, 9999, 4999, 0, 999999, 799999, 799999, 15]);
const byteRows = storageRows.map(row => ({...row, samples: denseSamples(row.timeSec, row.raceLength)}));
const byteRecords = [];
for (const row of byteRows) {
  const candidate = {version: 1, records: [...byteRecords, row], archivedRecords: []};
  if (byteLength(candidate) > MAX_GHOST_BYTES) break;
  byteRecords.push(row);
}
const byteStore = normalizeGhostStore({version: 1, records: byteRecords, archivedRecords: []});
equal(byteStore.records.length, byteRecords.length, 'byte fixture preserves valid old recordings below budget');
const denseGP = {...gpStorage, samples: denseSamples(gpStorage.timeSec, gpStorage.raceLength)};
check(byteStore.records.length < MAX_GHOSTS && byteLength({version: 1,
  records: [...byteStore.records, denseGP], archivedRecords: []}) > MAX_GHOST_BYTES,
  'byte fixture reaches the byte cap before the count cap');
const beforeBytes = JSON.stringify(byteStore), byteAdmission = storeGhost(byteStore, denseGP);
check(!byteAdmission.saved && byteAdmission.reason === 'capacity', 'over-budget GP ghost is visibly rejected');
equal(JSON.stringify(byteAdmission.store), beforeBytes, 'GP byte rejection retains every old store byte');
const sessionApp = {_switches: () => createFeatureFlags({storage: null,
  overrides: {'grand-prix-career': true}}), menuStage: 0, getMenuSeed: () => 1989, duel: {state: storageState},
  profile: createProfile(), cpuDifficulty: 'medium', player: storagePlayer,
  ghosts: countStore, grandPrixGhostCandidate: gpStorage};
equal(App.prototype.getGrandPrixGhostRecord.call(sessionApp), gpStorage,
  'session-only GP candidate stays usable for later Team Room query');
check(!App.prototype.getGrandPrixGhostRecord.call(sessionApp, {seed: 42}),
  'session-only GP candidate cannot cross event context');

const player = {id: 'lap-fixture', name: 'Lap Driver'};
const context = { playerId: player.id, stageIndex: 0, seed: 1989, laps: 1,
  car: 'falcone_f42', mode: 'grandprix', difficulty: 'casual', cpuDifficulty: 'medium' };
const recorder = new GrandPrixLapRecorder(context, 4000);
const state = { ...context, status: 'racing', driverId: 'club', stageTimeSec: 0,
  racePenaltySec: 0, s: -26, lateral: 2.6, headingError: 0, slipAngle: 0,
  crashSpin: 0, airHeight: 0, speedMph: 80 };
recorder.observe(state);
for (let tick = 1; tick <= 900; tick++) {
  state.stageTimeSec = tick / 10; state.s = -26 + 4026 * tick / 900;
  recorder.observe(state);
}
state.s = 4000.1; state.stageTimeSec = 90.01; state.lapStartedAt = 90;
const lap = recorder.complete(state, { lapCompleted: 1, lapTimeSec: 90, assisted: false }, player);
check(lap && lap.mode === 'grandprix' && lap.laps === 1, 'native first GP lap creates a separate best-lap ghost');
equal(lap.samples[0][1], -2600, 'grid start is retained honestly');
equal(lap.samples.at(-1)[1], 400000, 'native crossing ends at the line');
let ghosts = storeGhost(createGhostStore(), lap).store;
check(findGhost(ghosts, player.id, context), 'GP best lap can feed Team Room');
check(!findGhost(ghosts, player.id, { ...context, mode: 'timetrial', laps: 2 }), 'TT cannot load GP best lap');
equal(normalizeGhostStore(ghosts).records.length, 1, 'GP best lap survives normalization');
for (let tick = 1; tick <= 800; tick++) {
  state.stageTimeSec = 90 + tick / 10; state.s = 4000 + 4000 * tick / 800;
  recorder.observe(state);
}
state.stageTimeSec = 170.01; state.s = 8000.1; state.lapStartedAt = 170;
const second = recorder.complete(state, { lapCompleted: 2, lapTimeSec: 80, assisted: false }, player);
check(second && second.timeSec === 80, 'flying second lap uses only its own clock');
equal(second.samples[0].slice(0, 2), [0, 0], 'flying lap starts on its actual prior crossing');
check(storeGhost(ghosts, second).saved, 'quicker lap replaces GP mode best');
check(!recorder.complete(state, { qualifyingLap: true, lapCompleted: 3, lapTimeSec: 80 }, player), 'qualifying laps stay outside GP best');
check(!recordFinish(createLeaderboard(), {...context, runId: 'partial', completed: true,
  won: true, timeSec: 90}, player).recorded, 'a partial one-lap GP cannot enter full-race records');
const invalidRecorder = new GrandPrixLapRecorder(context, 4000);
invalidRecorder.observe({...state, s: 0, stageTimeSec: 0});
invalidRecorder.observe({...state, s: 4000, stageTimeSec: .01});
check(invalidRecorder.recorder.invalid, 'impossible teleport makes a GP lap capture invalid');
check(!invalidRecorder.complete({...state, s: 4000, stageTimeSec: 90, lapStartedAt: 90},
  {lapCompleted: 1, lapTimeSec: 90, assisted: false}, player), 'invalid GP capture cannot create a ghost');

console.log(`Grand Prix pay: ${checks} pure settlement and ghost safety checks passed.`);
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


import assert from 'node:assert/strict';
import { COURSE, CARS } from '../src/config.js';
import { createLeaderboardScreen } from '../src/screen-leaderboard.js';
import { App } from '../src/app.js';
import { createFeatureFlags } from '../src/feature-flags.js';
import { installTestDriver } from './race-field-balance.mjs';
import { ownTestCourses } from './career-fixture.mjs';
import { Duel } from '../src/game.js';
import { createProfile, eventKey, isValidFinish } from '../src/progression.js';
import { normalizeRaceSettings } from '../src/race-settings.js';
import { grandPrixCourse, gridPose } from '../src/race-field.js';
import { createLeaderboard, recordFinish, saveLeaderboard, loadLeaderboard, getLeaderboard } from '../src/leaderboard.js';
import { GrandPrixLapRecorder, createGhostStore, storeGhost, findGhost, normalizeGhostStore, GhostRecorder, ghostKey, MAX_GHOST_BYTES, MAX_GHOSTS } from '../src/ghost.js';
import { testCourseAccess } from './career-fixture.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
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
const sessionApp = {menuStage: 0, getMenuSeed: () => 1989, duel: {state: storageState},
  profile: createProfile(), cpuDifficulty: 'medium', player: storagePlayer,
  ghosts: countStore, grandPrixGhostCandidate: gpStorage};
equal(App.prototype.getGrandPrixGhostRecord.call(sessionApp), gpStorage,
  'session-only GP candidate stays usable for later Team Room query');
check(!App.prototype.getGrandPrixGhostRecord.call(sessionApp, {seed: 42}),
  'session-only GP candidate cannot cross event context');
if (process.argv.includes('--storage-only')) {
  console.log(`Grand Prix storage: ${checks} checks passed.`); process.exit(0);
}

const ids = ['pacific-canyon', 'high-country', 'harbor-highlands', 'eifel-crown',
  'alpine-serpent', 'azure-riviera', 'red-mesa', 'neon-docks', 'cloudbreak-skyway'];
const profile = { ...createProfile(), courses: testCourseAccess() };
const start = (stageIndex, mode, flag = true, cpuDifficulty = 'medium') => {
  const duel = new Duel({ seed: 1989, featureFlags: { 'grand-prix': flag } });
  duel.startCampaign({ startStage: stageIndex, mode, seed: 1989, fieldSeed: 4242,
    cpuDifficulty, difficulty: 'casual', car: 'falcone_f42' });
  return duel;
};
// Claude check-in5: staging changes only Azure GP's grid, never its lap origin.
const azureIndex = COURSE.findIndex(stage => stage.id === 'azure-riviera');
for (const cpu of ['easy', 'medium', 'hard']) {
  const duel = start(azureIndex, 'grandprix', true, cpu), state = duel.state;
  const actors = [{actor: state, slot: state.field.playerSlot},
    ...state.opponents.map(actor => ({actor, slot: actor.field.slot}))].sort((a, b) => a.slot - b.slot);
  equal(actors.map(({actor}) => [actor.s, actor.lateral]),
    Array.from({length: 8}, (_, slot) => {const pose = gridPose(slot);return [pose.s - 400, pose.lateral];}),
    `${cpu}: all eight Azure GP racers stage400m before the old grid`);
  equal(state.prevS, state.s, `${cpu}: player previous position starts at the staged grid`);
  for (const {actor} of actors) {
    const frame = duel.course.at(actor.s);
    check(Number.isFinite(frame.x) && Number.isFinite(frame.z), `${cpu}: actual staged road position is finite`);
    check(Math.abs(actor.lateral) + (CARS[actor.car].collision?.halfWidth ?? 1.1) <
      duel.course.roadHalfWidthAt(actor.s), `${cpu}: actual staged vehicle fits the road`);
  }
  const oldPlayer = gridPose(state.field.playerSlot);
  equal(duel.course.length - state.s, duel.course.length - oldPlayer.s + 400,
    `${cpu}: only first lap gains400m of starting travel`);
  equal(duel._lapGates, [.25, .5, .75].map(part => part * duel.course.length),
    `${cpu}: timing gates keep the old zero origin`);
  const line = duel.course.worldAt(0), legacy = start(azureIndex, 'timetrial');
  equal(line, legacy.course.worldAt(0), `${cpu}: visible course line remains the old physical zero`);
  // Exercise native admission on either side of the unchanged finish threshold.
  Object.assign(state, {status: 'racing', stageTimeSec: 100, speedMph: 80,
    prevS: duel.course.length - .1, s: duel.course.length + .1,
    prevLateral: 0, lateral: 0, nextLapGate: duel._lapGates.length});
  duel._advanceLaps(state, 1 / 60);
  equal(state.completedLaps, 1, `${cpu}: native lap admission still crosses the old zero line`);
  Object.assign(state, {stageTimeSec: 200, prevS: duel.course.length * 2 - .2,
    s: duel.course.length * 2 - .1, nextLapGate: duel._lapGates.length});
  duel._advanceLaps(state, 1 / 60);
  equal(state.completedLaps, 1, `${cpu}: lap two waits for exactly one circuit after the old line`);
  state.prevS = state.s;state.s = duel.course.length * 2 + .1;
  duel._advanceLaps(state, 1 / 60);
  equal(state.completedLaps, 2, `${cpu}: following lap finishes at the unchanged next line`);
}
for (const id of ids.filter(id => id !== 'azure-riviera')) {
  const state = start(COURSE.findIndex(stage => stage.id === id), 'grandprix').state;
  equal([state.s, state.lateral], Object.values(gridPose(state.field.playerSlot)), `${id}: player grid remains exact`);
  for (const actor of state.opponents) equal([actor.s, actor.lateral], Object.values(gridPose(actor.field.slot)),
    `${id}: computer grid remains exact`);
}
for (const mode of ['duel', 'timetrial']) {
  const duel = start(azureIndex, mode);
  equal([duel.state.s, duel.state.lateral, duel.state.lapsTotal], [0, 0, 2], `${mode}: Azure start and laps remain exact`);
  equal(duel.state.field, undefined, `${mode}: no Grand Prix staging field`);
}
if (process.argv.includes('--grid-only')) {
  console.log(`Grand Prix grid regression: ${checks} checks passed.`);process.exit(0);
}

for (const id of ids) {
  const index = COURSE.findIndex(stage => stage.id === id), stage = COURSE[index];
  check(grandPrixCourse(stage), `${id} offers Grand Prix`);
  equal(normalizeRaceSettings({ eventId: id, mode: 'grandprix' }, profile).mode, 'grandprix', `${id}: preference round trip`);
  const duel = start(index, 'grandprix'), state = duel.state;
  equal([state.mode, state.field?.size, state.opponents.length, state.lapsTotal],
    ['grandprix', 8, 7, 3], `${id}: full field and three laps`);
  equal([state.traffic.length, duel.course.features.radarTraps.length, !!state.police.pursuit,
    state.police.triggered], [0, 0, false, false], `${id}: pure race`);
  for (let slot = 0; slot < 8; slot++) {
    const pose = gridPose(slot), frame = duel.course.at(pose.s);
    check(Number.isFinite(frame.x) && Number.isFinite(frame.z), `${id}: slot ${slot} has a finite road position`);
    check(Math.abs(pose.lateral) + (CARS.falcone_f42.collision?.halfWidth ?? 1.1) < duel.course.roadHalfWidthAt(pose.s), `${id}: grid slot fits`);
  }
  for (const mode of ['duel', 'timetrial', 'wasteland']) {
    const off = start(index, mode, false), on = start(index, mode);
    off.setInput({ throttle: 1 }); on.setInput({ throttle: 1 });
    for (let tick = 0; tick < 360; tick++) { off.step(1 / 60); on.step(1 / 60); }
    equal(on.state, off.state, `${id}: ${mode} remains exact with Grand Prix enabled`);
  }
  equal(start(index, 'grandprix', false).state.mode, 'duel', `${id}: switch gates the mode`);
}
for (const stage of COURSE.filter(stage => !ids.includes(stage.id) && stage.stage < 16)) {
  check(!grandPrixCourse(stage), `${stage.id}: objective and off-road events excluded`);
}

const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)) };
const player = { id: 'test-player', name: 'Test Driver' };
const base = { stageIndex: 0, completed: true, won: true, seed: 1989,
  timeSec: 120, laps: 2, car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium' };
const grand = { ...base, mode: 'grandprix', laps: 3, timeSec: 180 };
check(isValidFinish(grand), 'three-lap Grand Prix finish is valid');
check(!isValidFinish({ ...grand, laps: 2 }), 'two laps cannot complete Grand Prix');
const duelKey = eventKey({ ...base, mode: 'duel' });
equal(duelKey, 'pacific-canyon|layout:4|seed:1989|laps:2', 'existing event key stays exact');
check(eventKey(grand) !== eventKey({ ...grand, mode: 'duel' }), 'Grand Prix key is separate even at the same lap count');
let board = createLeaderboard();
for (const row of [{ ...base, mode: 'duel' }, { ...base, mode: 'timetrial', timeSec: 115 }, grand]) {
  const added = recordFinish(board, row, player);
  check(added.recorded, `${row.mode} finish records independently`); board = added.board;
}
equal(board.entries.length, 3, 'all three modes coexist');
check(saveLeaderboard(board, storage), 'memory-only leaderboard save');
board = loadLeaderboard(storage);
equal(board.entries.length, 3, 'all mode records survive reload');
for (const mode of ['duel', 'timetrial', 'grandprix']) {
  const rows = getLeaderboard(board, { eventId: COURSE[0].id, mode });
  equal(rows.map(row => row.mode), [mode], `${mode} query cannot mix modes`);
}
console.log(`Existing Grand Prix: ${checks} eligibility, grid, legacy replay and per-mode record checks passed.`);

const boardFilter = {stage: 0, car: '', driverId: 'club', mode: 'grandprix'};
const screen = createLeaderboardScreen({app: {leaderboard: board, player,
  grandPrixAvailable: () => true, getMenuSeed: () => 1989, getMenuRouteLabel: () => 'Route A'},
  boardFilter, escapeHTML: value => String(value), credits: value => String(value),
  time: value => `${value} seconds`});
check(screen().includes('180 seconds') && screen().includes('GRAND PRIX'), 'GP score filter shows actual own three-lap record');
check(!screen().includes('115 seconds'), 'GP score filter keeps Time Trial times separate');
boardFilter.mode = '';
check(screen().includes('115 seconds') && !screen().includes('180 seconds'), 'default All existing modes keeps original two-lap event key');

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
console.log(`Existing Grand Prix: ${checks} checks including best-lap ghosts passed.`);

// Real input, lap admission and App writes in disposable memory.
const priorStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const priorCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
let app;
try {
  globalThis.localStorage = storage;
  globalThis.cancelAnimationFrame ??= () => {};
  app = new App(); ownTestCourses(app);
  app.duel.featureFlags = createFeatureFlags({storage: null, qa: false, search: '', overrides: {'grand-prix': true}});
  const wallet = app.profile.credits;
  app.startCampaign({startStage: 0, seed: 1989, fieldSeed: 4242, mode: 'grandprix',
    car: 'falcone_f42', cpuDifficulty: 'medium', difficulty: 'casual'});
  app.autopilot = true; app._scriptedCrashDone = true; installTestDriver(app);
  for (let tick = 0; tick < 24000 && ['countdown', 'racing'].includes(app.duel.state.status); tick++)
    app.advance(1 / 60, 1 / 60);
  check(app.duel.state.results?.completed, 'native App finishes three-lap GP');
  equal(app.profile.credits, wallet, 'GP records do not settle pay or loss charges');
  check(app.leaderboard.entries.some(row => row.mode === 'grandprix' && row.laps === 3), 'native finish records GP');
  check(app.ghosts.records.some(row => row.mode === 'grandprix' && row.laps === 1), 'native admitted lap saves own GP ghost');
  check(!app.ghostPose && app.ghostStatus === 'none', 'GP never displays a ghost among the field');
  app.returnToMenu();
  check(!app.grandPrixLapRecorder, 'menu clears unfinished lap recording');
  // Actual Azure input-driven crossings distinguish staging from a flying lap.
  if (process.argv.includes('--azure-ghost-only')) {
    app.dispose();app = new App();ownTestCourses(app);
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: false, search: '',
      overrides: {'grand-prix': true}});
    check(app.startCampaign({startStage: azureIndex, seed: 1989, fieldSeed: 1000,
      mode: 'grandprix', car: 'falcone_f42', cpuDifficulty: 'medium', difficulty: 'casual'}),
      'real Azure GP starts in disposable memory');
    app.autopilot = true;app._scriptedCrashDone = true;installTestDriver(app);
    const stagedS = app.duel.state.s, nativeLaps = [];
    let priorRecorderInvalid = false, firstSampleS = null, previousLapClock = 0;
    const stopObserving = app.duel.onChange((live, event) => {
      if (!event.lapCompleted) return;
      const saved = app.ghosts.records.find(row => row.mode === 'grandprix' && row.eventId === 'azure-riviera');
      nativeLaps.push({lap: event.lapCompleted, seconds: event.lapTimeSec,
        exactSeconds: live.lapStartedAt - previousLapClock,
        assisted: event.assisted, recorderInvalid: priorRecorderInvalid,
        savedStart: saved?.samples[0][1] ?? null, savedSeconds: saved?.timeSec ?? null});
      previousLapClock = live.lapStartedAt;
    });
    try {
      for (let tick = 0; tick < 24000 && ['countdown', 'racing'].includes(app.duel.state.status) &&
          nativeLaps.length < 2; tick++) {
        const capture = app.grandPrixLapRecorder?.recorder;
        priorRecorderInvalid = capture?.invalid ?? false;
        if (!nativeLaps.length && capture?.samples.length) firstSampleS ??= capture.samples[0][1];
        app.advance(1 / 60, 1 / 60);
      }
      equal(nativeLaps.length, 2, 'two genuine Azure lap crossings reach the real recorder');
      equal(firstSampleS, Math.round(stagedS * 100), 'the first capture honestly starts on the staged grid');
      check(firstSampleS < -4000, 'staging exceeds the unchanged40m GP admission bound');
      check(!nativeLaps[0].assisted && !nativeLaps[0].recorderInvalid,
        'first lap exclusion is independent of assistance or malformed capture');
      equal(nativeLaps[0].savedStart, null, 'the longer staged lap is excluded by current ghost admission');
      equal(app.duel.state.lapTimes[0], nativeLaps[0].seconds, 'the first actual lap time is retained');
      check(!nativeLaps[1].assisted && !nativeLaps[1].recorderInvalid,
        'the next genuine flying lap is clean');
      equal(nativeLaps[1].savedStart, 0, 'the real flying lap saves from the old timing line');
      equal(nativeLaps[1].savedSeconds, nativeLaps[1].exactSeconds, 'saved flying lap uses its actual unrounded crossing clocks');
      equal(+nativeLaps[1].exactSeconds.toFixed(3), nativeLaps[1].seconds, 'native lap event retains its exact millisecond-rounding contract');
      console.log('Azure actual recorder witness:', JSON.stringify({stagedS, firstSampleS, nativeLaps}));
    } finally { stopObserving(); }
    app.returnToMenu();
  }
} finally {
  app?.dispose();
  if (priorStorage) Object.defineProperty(globalThis, 'localStorage', priorStorage); else delete globalThis.localStorage;
  if (priorCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', priorCancel); else delete globalThis.cancelAnimationFrame;
}
console.log(`Existing Grand Prix: ${checks} checks including native App records passed.`);

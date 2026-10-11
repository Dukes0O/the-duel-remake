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
import { GrandPrixLapRecorder, createGhostStore, storeGhost, findGhost, normalizeGhostStore } from '../src/ghost.js';
import { testCourseAccess } from './career-fixture.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const ids = ['pacific-canyon', 'high-country', 'harbor-highlands', 'eifel-crown',
  'alpine-serpent', 'azure-riviera', 'red-mesa', 'neon-docks', 'cloudbreak-skyway'];
const profile = { ...createProfile(), courses: testCourseAccess() };
const start = (stageIndex, mode, flag = true) => {
  const duel = new Duel({ seed: 1989, featureFlags: { 'grand-prix': flag } });
  duel.startCampaign({ startStage: stageIndex, mode, seed: 1989, fieldSeed: 4242,
    cpuDifficulty: 'medium', difficulty: 'casual', car: 'falcone_f42' });
  return duel;
};
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
} finally {
  app?.dispose();
  if (priorStorage) Object.defineProperty(globalThis, 'localStorage', priorStorage); else delete globalThis.localStorage;
  if (priorCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', priorCancel); else delete globalThis.cancelAnimationFrame;
}
console.log(`Existing Grand Prix: ${checks} checks including native App records passed.`);

import assert from 'node:assert/strict';
import { COURSE, CARS } from '../src/config.js';
import { Duel } from '../src/game.js';
import { createProfile, eventKey, isValidFinish } from '../src/progression.js';
import { normalizeRaceSettings } from '../src/race-settings.js';
import { grandPrixCourse, gridPose } from '../src/race-field.js';
import { createLeaderboard, recordFinish, saveLeaderboard, loadLeaderboard, getLeaderboard } from '../src/leaderboard.js';
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

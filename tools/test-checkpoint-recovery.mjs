import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { ROAD_SHOULDER_WIDTH } from '../src/config.js';

for (const mode of ['duel', 'wasteland', 'timetrial']) {
  const duel = new Duel({ seed: 1989 });
  duel.startCampaign({ startStage: 0, mode, cpuDifficulty: 'medium' });
  const state = duel.state, gate = duel._lapGates[0];
  const legalLimit = duel.course.roadHalfWidthAt(gate) + ROAD_SHOULDER_WIDTH;
  const resets = [];
  state.status = 'racing'; state.traffic = [];
  duel.onChange((current, event) => {
    if (event.checkpointReset) resets.push({ s: current.s, nextLapGate: current.nextLapGate });
  });
  Object.assign(state, { prevS: gate - .5, s: gate + .5,
    prevLateral: -8.2688, lateral: -8.2688, speedMph: 100, nextLapGate: 0 });
  duel._advanceLaps(state, 1 / 60);
  assert.equal(state.nextLapGate, 0, `${mode}: crossing 0.0188 m outside the shoulder does not earn a gate`);
  assert.equal(resets.length, 1, `${mode}: invalid physical crossing recovers at once`);
  assert.ok(state.s >= gate - 2 && state.s < gate,
    `${mode}: recovery leaves the missed gate directly ahead`);
  Object.assign(state, { prevS: gate - .5, s: gate + .5,
    prevLateral: -(legalLimit - .01), lateral: -(legalLimit - .01), speedMph: 100 });
  duel._advanceLaps(state, 1 / 60);
  assert.equal(state.nextLapGate, 1, `${mode}: legal near-edge recrossing earns the first gate`);
  assert.equal(resets.length, 1, `${mode}: legal recrossing does not reset again`);
  Object.assign(state, { prevS: gate - .5, s: gate + .5,
    prevLateral: -8.2688, lateral: -8.2688, speedMph: 100, nextLapGate: 0 });
  duel._advanceLaps(state, 1 / 60, true);
  assert.equal(state.s, gate + .5, `${mode}: crash-time noReset leaves recovery to the impact path`);
  assert.equal(resets.length, 1, `${mode}: crash-time noReset sends no checkpoint reset`);
}

globalThis.cancelAnimationFrame ??= () => {};
const previousStorage = globalThis.localStorage, memory = new Map();
globalThis.localStorage = {
  get length() { return memory.size; },
  key(index) { return [...memory.keys()][index] ?? null; },
  getItem(key) { return memory.get(key) ?? null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};
try {
  const app = new App(), events = [];
  app.startCampaign({ startStage: 0, seed: 1989, mode: 'wasteland',
    car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium' });
  app.autopilot = true; app._scriptedCrashDone = true;
  const gate = app.duel._lapGates[0];
  app.duel.onChange((state, event) => {
    if (event.checkpointReset) events.push({ type: 'reset', time: state.stageTimeSec, s: state.s });
    if (event.lapCheckpoint) events.push({ type: 'checkpoint', gate: event.lapCheckpoint });
    if (event.lapCompleted) events.push({ type: 'lap', lap: event.lapCompleted });
  });
  for (let frame = 0; frame < 30 * 600 &&
    !['stage_result', 'gameover', 'complete'].includes(app.duel.state.status); frame++) {
    app.advance(1 / 30, 1 / 30);
  }
  const state = app.duel.state, resets = events.filter(event => event.type === 'reset');
  assert.equal(state.results?.completed, true, 'the full Medium race completes');
  assert.equal(resets.length, 1, 'the real crossbow shove causes one missed first gate');
  assert.ok(resets[0].time < 20 && resets[0].s >= gate - 2 && resets[0].s < gate,
    'the race retries the missed gate promptly instead of losing a full lap');
  assert.deepEqual(events.filter(event => event.type === 'checkpoint').map(event => event.gate),
    [1, 2, 3, 1, 2, 3], 'both laps still cross every checkpoint in order');
  assert.deepEqual(events.filter(event => event.type === 'lap').map(event => event.lap),
    [1, 2], 'both laps still complete normally');
  console.log(JSON.stringify({ raceTime: state.results.timeSec, resets, checkpointEvents: events.length }));
  app.dispose();
} finally {
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
}

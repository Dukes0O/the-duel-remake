import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { DRIVE, ROAD_SHOULDER_WIDTH } from '../src/config.js';

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

  // A race can still reach the finish after a discontinuity or an earlier
  // missed gate. A finish reset should put that required crossing nearby.
  const finish = duel.course.length, missed = duel._lapGates[1];
  duel._obstacles = () => [];
  state.rival = null;
  Object.assign(state, { completedLaps: 0, nextLapGate: 1,
    prevS: finish - .5, s: finish + .5, prevLateral: 0, lateral: 0, speedMph: 100 });
  duel._advanceLaps(state, 1 / 60);
  assert.equal(state.nextLapGate, 1, `${mode}: finish cannot award a missed gate`);
  assert.ok(state.s >= missed - 12 && state.s < missed,
    `${mode}: retry is just before the first missed gate`);
  assert.equal(state.prevS, state.s, `${mode}: recovery cannot sweep through the gate`);
  Object.assign(state, { prevS: missed - .5, s: missed + .5,
    prevLateral: 0, lateral: 0, speedMph: 100 });
  duel._advanceLaps(state, 1 / 60);
  assert.equal(state.nextLapGate, 2, `${mode}: gate still needs a legal physical crossing`);

  Object.assign(state, { nextLapGate: duel._lapGates.length,
    prevS: finish - .5, s: finish + .5, prevLateral: 12, lateral: 12, speedMph: 100 });
  duel._advanceLaps(state, 1 / 60);
  assert.ok(state.s >= finish - 12 && state.s < finish,
    `${mode}: off-road finish gets a nearby retry`);
  assert.equal(state.nextLapGate, duel._lapGates.length,
    `${mode}: finish retry keeps validated gate history`);

  Object.assign(state, { nextLapGate: 1, prevS: finish - 200, s: finish + .5,
    prevLateral: 0, lateral: 0, speedMph: 100 });
  duel._advanceLaps(state, 1 / 60);
  assert.ok(state.s < missed - 100,
    `${mode}: an implausible jump does not gain a close recovery`);
}

// A missed gate can be crowded on all three standard reset lines. Recovery
// must find an actual gap instead of falling back into one of those cars.
{
  const duel = new Duel({ seed: 1989 });
  duel.startCampaign({ startStage: 0, mode: 'wasteland', cpuDifficulty: 'medium' });
  const state = duel.state, gate = duel._lapGates[0], origin = gate - 1;
  state.status = 'racing'; state.rival = null;
  state.traffic = [0, 10, 22, 40, 70, 110].flatMap(back =>
    [-DRIVE.laneOffset, DRIVE.laneOffset, 0].map(lateral => ({ s: origin - back, lateral, alive: true })));
  duel._obstacles = () => [];
  Object.assign(state, { s: origin, prevS: origin, lateral: 0, speedMph: 0, nextLapGate: 0 });
  duel._safeReset(state);
  assert.ok(state.s >= origin - 60, 'crowded checkpoint recovery stays within a short retry');
  assert.ok(state.traffic.every(car =>
    Math.abs(duel.relativeS(car.s, state.s) - state.s) >= 12 ||
    Math.abs(car.lateral - state.lateral) >= 2.5),
  'crowded checkpoint recovery never spawns on a traffic car');
  // A clear distant preset must not win over a closer gap between presets.
  state.traffic = state.traffic.filter(car => car.s !== origin - 110);
  Object.assign(state, { s: origin, prevS: origin, lateral: 0 });
  duel._safeReset(state);
  assert.ok(state.s >= origin - 60,
    'checkpoint recovery prefers a nearby gap to the 110-metre preset');
  // Even heavier synthetic congestion should not choose the occupied center.
  state.traffic = [0, 10, 22, 40, 54, 70, 90, 110].flatMap(back =>
    [-DRIVE.laneOffset, DRIVE.laneOffset, 0].map(lateral => ({ s: origin - back, lateral, alive: true })));
  Object.assign(state, { s: origin, prevS: origin, lateral: 0 });
  duel._safeReset(state);
  assert.ok(state.s >= origin - 150, 'saturated checkpoint recovers within 150 metres');
  assert.ok(state.traffic.every(car =>
    Math.abs(duel.relativeS(car.s, state.s) - state.s) >= 12 ||
    Math.abs(car.lateral - state.lateral) >= 2.5),
  'saturated checkpoint recovery remains clear of traffic');
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
  app.duel.onChange((state, event) => {
    if (event.checkpointReset) events.push({ type: 'reset', time: state.stageTimeSec, s: state.s,
      completedLaps: state.completedLaps, nextLapGate: state.nextLapGate });
    if (event.lapCheckpoint) events.push({ type: 'checkpoint', gate: event.lapCheckpoint });
    if (event.lapCompleted) events.push({ type: 'lap', lap: event.lapCompleted });
  });
  for (let frame = 0; frame < 30 * 600 &&
    !['stage_result', 'gameover', 'complete'].includes(app.duel.state.status); frame++) {
    app.advance(1 / 30, 1 / 30);
  }
  const state = app.duel.state, resets = events.filter(event => event.type === 'reset');
  assert.equal(state.results?.completed, true, 'the full Medium race completes');
  assert.equal(resets.length, 1, 'the real crossbow shove causes one missed gate');
  // Balance changes decide where the shove lands, so measure the retry against
  // the gate actually missed, on its own lap, rather than assuming lap one.
  const lapStart = resets[0].completedLaps * app.duel.course.length;
  const missedGate = lapStart + app.duel._lapGates[resets[0].nextLapGate];
  assert.ok(Number.isFinite(missedGate), 'the reset names a real lap gate');
  assert.ok(resets[0].s >= missedGate - 2 && resets[0].s < missedGate,
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

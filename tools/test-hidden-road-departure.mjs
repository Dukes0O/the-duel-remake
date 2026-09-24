import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { createFeatureFlags } from '../src/feature-flags.js';
import { GhostRecorder, loadGhosts } from '../src/ghost.js';
import { loadLeaderboard } from '../src/leaderboard.js';
import { activePlayer, loadPlayers } from '../src/progression.js';

// Every storage operation in this process uses this synthetic in-memory map.
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
globalThis.cancelAnimationFrame = () => {}; // No animation loop runs in these headless App fixtures.
let checks = 0;
const failures = [];
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
const angle = x => Math.atan2(Math.sin(x), Math.cos(x));
function place(app, progress, speed = 35) {
  const duel = app.duel, p = duel.course.hiddenRoad.poseAt(progress);
  Object.assign(duel.state, { s: p.s, prevS: p.s, lateral: p.lateral, prevLateral: p.lateral,
    speedMph: speed, headingError: angle(p.heading - duel.course.at(p.s).heading),
    yawVelocity: 0, steerVisual: 0, slipAngle: 0, groundHeight: p.y, airborne: false,
    airHeight: 0, impactTimer: 0, pushVelocity: 0 });
}
function start(app) {
  app.startCampaign({ startStage: 0, mode: 'timetrial', seed: 1989, car: 'falcone_f42', difficulty: 'casual' });
  app.advance(3.1);
  Object.assign(app.duel.state, { traffic: [], opponents: [], rival: null });
}
function makeApp() {
  memory.clear();
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({ storage: null, overrides: { 'hidden-road': true } });
  app.profile.credits = 2000;
  app.profile.unlockedCars.push('aurora_gt');
  app._saveProfile();
  start(app);
  // Seed a valid saved best/leaderboard/ghost through existing production APIs,
  // rather than relying on malformed sentinel records surviving normalization.
  const s = app.duel.state;
  const context = { playerId: app.player.id, stageIndex: 0, seed: s.seed, laps: s.lapsTotal,
    car: s.car, mode: s.mode, difficulty: s.difficulty, cpuDifficulty: s.cpuDifficulty,
    driverId: s.driverId, upgrades: { ...s.upgrades } };
  const recorder = new GhostRecorder(context);
  for (let i = 0; i <= 900; i++) recorder.observe({ ...s, status: 'racing',
    stageTimeSec: i / 5, s: app.duel.raceLength * i / 900, lateral: 0, speedMph: 80 });
  app.ghostRecorder = recorder;
  Object.assign(s, { status: 'racing', stageTimeSec: 180, s: app.duel.raceLength,
    lateral: 0, completedLaps: s.lapsTotal, lap: s.lapsTotal, currentLap: s.lapsTotal,
    lapTimes: [90, 90], racePenaltySec: 0 });
  app.duel._finishStage();
  assert.ok(app.leaderboard.entries.length > 0, 'fixture has a valid saved record');
  assert.ok(app.ghosts.records.length > 0, 'fixture has a valid saved ghost');
  app.returnToMenu();
  start(app);
  return app;
}
function bank(app) {
  return structuredClone({ credits: app.profile.credits, personalBests: app.profile.personalBests,
    unlockedCars: app.profile.unlockedCars, upgrades: app.profile.upgrades,
    milestones: app.profile.milestones, wasteland: app.profile.wasteland,
    leaderboard: app.leaderboard, ghosts: app.ghosts });
}
function savedContent(value) {
  const copy = structuredClone(value);
  for (const record of copy.ghosts?.records ?? []) delete record.lastUsedAt;
  return copy;
}
function depart(app) {
  const events = [];
  const unsubscribe = app.duel.onChange((_s, e) => { if (e.hiddenRoadDeparted) events.push(e.hiddenRoadDeparted); });
  place(app, 149.9);
  app.advance(.1);
  unsubscribe();
  assert.equal(app.duel.state.status, 'exploring');
  assert.equal(events.length, 1, 'actual App crossing emits departure once');
  return events[0];
}
function choice(app) {
  place(app, app.duel.course.hiddenRoad.length - 59);
  for (let i = 0; i < 1800 && app.duel.state.hiddenRoadJourney?.phase !== 'choice'; i++) app.advance(1 / 120);
  assert.equal(app.duel.state.hiddenRoadJourney?.phase, 'choice');
}

check('departure uses abandonment: preserve bank, records, unlocks and ghosts; discard unbanked/fines', () => {
  const app = makeApp(), s = app.duel.state;
  s.speedMph = 110;
  app.duel._ticket({ limitMph: 55 });
  app.duel.ackTicket();
  assert.ok(app.profile.activeRace.pendingPoliceFines > 0);
  s.score = 1700; s.policeEscapes = 3;
  const before = bank(app), historyCount = app.profile.history.length;
  const event = depart(app);
  assert.deepEqual(bank(app), before, 'abandonment cannot alter prior earnings or records');
  assert.equal(app.profile.history.length, historyCount + 1);
  const result = app.profile.history.at(-1);
  assert.equal(result.abandoned, true);
  assert.equal(result.reward, 0);
  assert.equal(result.charge, 0);
  assert.equal(app.profile.activeRace, null);
  assert.equal(app.ghostRecorder, null, 'unfinished attempt no longer records');
  app.duel.emit({ hiddenRoadDeparted: event });
  assert.equal(app.profile.history.length, historyCount + 1);
  assert.deepEqual(savedContent(bank(app)), savedContent(before));
  assert.equal(activePlayer(loadPlayers()).profile.credits, before.credits);
  assert.deepEqual(loadLeaderboard(), before.leaderboard);
  assert.deepEqual(loadGhosts(), before.ghosts);
  app.dispose();
});

check('before the point of no return the active race is not settled', () => {
  const app = makeApp(), before = app.profile.history.length;
  place(app, 100);
  app.advance(.3);
  assert.equal(app.duel.state.status, 'racing');
  assert.equal(app.profile.history.length, before);
  assert.ok(app.profile.activeRace);
  app.dispose();
});

check('invalid, duplicate, stale-run and wrong-player departure callbacks cannot settle', () => {
  const app = makeApp();
  assert.equal(typeof app._settleHiddenRoadDeparture, 'function');
  const s = app.duel.state, before = bank(app), historyCount = app.profile.history.length;
  app._settleHiddenRoadDeparture({ journeyId: 'not-this-journey' }, s);
  assert.equal(app.profile.history.length, historyCount, 'unearned departure rejected');
  const event = depart(app), oldState = { ...s, hiddenRoadJourney: structuredClone(s.hiddenRoadJourney) };
  app._settleHiddenRoadDeparture(event, s);
  app.restart();
  const restartedHistory = app.profile.history.length;
  app._settleHiddenRoadDeparture(event, oldState);
  app._settleHiddenRoadDeparture(event, app.duel.state);
  assert.equal(app.profile.history.length, restartedHistory, 'old journey cannot abandon the new countdown');
  assert.deepEqual(savedContent(bank(app)), savedContent(before));
  app.returnToMenu();
  const originalId = app.player.id;
  app.addPlayer('Independent explorer');
  const other = structuredClone(app.profile);
  app._settleHiddenRoadDeparture(event, oldState);
  assert.deepEqual(app.profile, other, 'other player is unchanged');
  app.selectPlayer(originalId);
  assert.deepEqual(savedContent(bank(app)), savedContent(before));
  app.dispose();
});

for (const action of ['menu', 'restart']) check(`${action} after departure clears held inputs without settling twice`, () => {
  const app = makeApp();
  depart(app);
  const historyCount = app.profile.history.length, credits = app.profile.credits;
  app.keys = { KeyW: true, Space: true };
  app.duel.setInput({ throttle: 1, steer: 1, boost: true, shiftUp: true });
  app.togglePause();
  assert.equal(app.duel.state.paused, true, 'exploration supports pause');
  const frozen = structuredClone(app.duel.state.hiddenRoadJourney);
  app.advance(.5);
  assert.deepEqual(app.duel.state.hiddenRoadJourney, frozen);
  assert.deepEqual(app.keys, {});
  assert.equal(app.duel.state.input.throttle, 0);
  assert.equal(app.duel.state.input.boost, false);
  app.requestNavigation(action);
  assert.equal(app.duel.state.status, action === 'menu' ? 'menu' : 'countdown');
  assert.equal(app.duel.state.paused, false);
  assert.equal(app.profile.history.length, historyCount);
  assert.equal(app.profile.credits, credits);
  assert.equal(app.duel.state.hiddenRoadJourney?.departed ?? false, false, 'navigation retires the old journey');
  assert.equal(app.duel.state.input.steer, 0);
  app.dispose();
});

for (const selected of ['enter', 'turn-back']) check(`${selected} is queued by App and grants no unbuilt persistent discovery`, () => {
  const app = makeApp();
  depart(app);
  choice(app);
  const saved = structuredClone(app.profile), events = [];
  app.duel.onChange((_s, e) => { if (e.hiddenRoadArrived) events.push(e); });
  assert.equal(typeof app.chooseHiddenRoad, 'function');
  assert.equal(app.chooseHiddenRoad(selected), true);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'choice');
  assert.deepEqual(app.keys, {});
  app.advance(4);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, selected === 'enter' ? 'arrived' : 'turned-back');
  assert.equal(events.length, selected === 'enter' ? 1 : 0);
  assert.deepEqual(app.profile, saved, 'EGG-04 owns persistent discovery; invitation only changes journey');
  app.returnToMenu();
  assert.equal(app.duel.state.status, 'menu');
  app.dispose();
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Hidden Road departure: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;

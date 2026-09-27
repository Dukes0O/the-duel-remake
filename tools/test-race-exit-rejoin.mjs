import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { COURSE } from '../src/config.js';
import { createFeatureFlags } from '../src/feature-flags.js';
import { Duel } from '../src/game.js';

// GATE-REJOIN (Kyle, 26 September 2026): leaving the race up the Hidden Road
// or over the Muddy Hollow ridge pauses it. Driving back rejoins the race
// where you left it; only driving through the Rustwall gate abandons it.
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
globalThis.cancelAnimationFrame = () => {};
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
function makeApp() {
  memory.clear();
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({ storage: null, overrides: { 'hidden-road': true } });
  app.startCampaign({ startStage: 0, mode: 'wasteland', seed: 1989, car: 'falcone_f42', difficulty: 'casual' });
  app.advance(3.1);
  Object.assign(app.duel.state, { traffic: [] });
  return app;
}
function depart(app) {
  place(app, 149.9);
  app.advance(.1);
  assert.equal(app.duel.state.status, 'exploring', 'the spur departure pauses the race');
}
// Reversing back down the dirt road toward the course.
function reverseBack(app) {
  place(app, 110, -12);
  for (let i = 0; i < 30 && app.duel.state.status === 'exploring'; i++) app.advance(1 / 60);
}
function toChoice(app) {
  place(app, app.duel.course.hiddenRoad.length - 59);
  for (let i = 0; i < 1800 && app.duel.state.hiddenRoadJourney?.phase !== 'choice'; i++) app.advance(1 / 120);
  assert.equal(app.duel.state.hiddenRoadJourney?.phase, 'choice');
}
const opponent = state => state.opponents?.[0] ?? state.rival;

check('leaving up the Hidden Road pauses the race without abandoning it', () => {
  const app = makeApp(), history = app.profile.history.length;
  depart(app);
  const clock = app.duel.state.stageTimeSec;
  app.advance(1);
  assert.equal(app.duel.state.stageTimeSec, clock, 'the race clock is paused while exploring');
  assert.equal(app.profile.history.length, history, 'no abandoned result yet');
  assert.ok(app.profile.activeRace, 'the race is still active');
  app.dispose();
});

check('reversing back to the course rejoins the race: clock, rival and combat run again', () => {
  const app = makeApp(), history = app.profile.history.length;
  const rival = opponent(app.duel.state);
  assert.ok(rival, 'the Mad Max Duel has an opponent');
  depart(app);
  const events = [];
  app.duel.onChange((_s, e) => { if (e.hiddenRoadRejoined) events.push(e.hiddenRoadRejoined); });
  reverseBack(app);
  const s = app.duel.state;
  assert.equal(s.status, 'racing', 'back on the course the race resumes');
  assert.equal(events.length, 1, 'rejoining is announced once');
  assert.equal(s.hiddenRoadJourney.departed, false);
  const clock = s.stageTimeSec, rivalS = rival.s;
  app.advance(1);
  assert.ok(s.stageTimeSec > clock + .9, 'the race clock runs again');
  assert.ok(rival.s > rivalS + 1, 'the opponent drives again');
  assert.equal(app.profile.history.length, history, 'rejoining records no result');
  assert.ok(app.profile.activeRace);
  depart(app);
  assert.equal(s.hiddenRoadJourney.departed, true, 'the road can be taken again');
  app.dispose();
});

check('turning back at the gate and driving back rejoins the race', () => {
  const app = makeApp(), history = app.profile.history.length;
  depart(app);
  toChoice(app);
  assert.equal(app.chooseHiddenRoad('turn-back'), true);
  app.advance(.5);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'turned-back');
  reverseBack(app);
  assert.equal(app.duel.state.status, 'racing');
  assert.equal(app.profile.history.length, history);
  app.dispose();
});

check('driving through the gate abandons the race once, preserving the bank', () => {
  const app = makeApp(), history = app.profile.history.length, credits = app.profile.credits;
  depart(app);
  toChoice(app);
  assert.equal(app.profile.history.length, history, 'the invitation itself abandons nothing');
  assert.equal(app.chooseHiddenRoad('enter'), true);
  app.advance(4);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'arrived');
  assert.equal(app.profile.history.length, history + 1);
  const result = app.profile.history.at(-1);
  assert.equal(result.abandoned, true);
  assert.equal(result.reward, 0);
  assert.equal(result.charge, 0);
  assert.equal(app.profile.activeRace, null);
  assert.equal(app.profile.credits, credits);
  app.advance(1);
  assert.equal(app.profile.history.length, history + 1, 'settled only once');
  app.dispose();
});

check('crossing back over the Muddy Hollow ridge rejoins the race', () => {
  const index = COURSE.findIndex(course => course.id === 'high-country');
  const duel = new Duel({ seed: 1989, featureFlags: { 'muddy-hollow': true, 'titan-climb': true } });
  duel.startCampaign({ car: 'titan_monster', startStage: index, discoveredGate: true,
    opponentCount: 0, mode: 'timetrial', difficulty: 'casual' });
  Object.assign(duel.state, { status: 'racing', countdown: 0, traffic: [], opponents: [],
    impactTimer: 0 });
  const zone = duel.course.muddyHollow, boundary = zone.departureBoundary;
  const at = lateral => {
    const x = zone.frame.origin.x + Math.cos(zone.frame.heading) * lateral;
    const z = zone.frame.origin.z - Math.sin(zone.frame.heading) * lateral;
    return duel.course.nearest(x, z, zone.frame.s);
  };
  const move = (from, to, speed) => {
    const a = at(from), b = at(to);
    Object.assign(duel.state, { prevS: a.s, prevLateral: a.lateral, s: b.s, lateral: b.lateral,
      speedMph: speed, airborne: false, airHeight: 0, prevAirHeight: 0,
      headingError: angle(zone.frame.heading + (speed >= 0 ? Math.PI / 2 : -Math.PI / 2) -
        duel.course.at(b.s).heading) });
    duel.step(1 / 60);
  };
  move(boundary.lateral - .5, boundary.lateral + .5, 20);
  assert.equal(duel.state.status, 'exploring', 'crossing the ridge pauses the race');
  const events = [];
  duel.onChange((_s, e) => { if (e.muddyHollowRejoined) events.push(e); });
  move(boundary.lateral - 11, boundary.lateral - 13, 20);
  assert.equal(duel.state.status, 'racing', 'back across the ridge the race resumes');
  assert.equal(events.length, 1);
  const clock = duel.state.stageTimeSec;
  for (let i = 0; i < 60; i++) duel.step(1 / 60);
  assert.ok(duel.state.stageTimeSec > clock + .9, 'the race clock runs again');
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Race exit and rejoin: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;

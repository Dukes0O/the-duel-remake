import assert from 'node:assert/strict';
import { createDriftState, stepDrift, finishDrift, DRIFT_SCORING } from '../src/drift-scoring.js';
import { App } from '../src/app.js';
import { COURSE } from '../src/config.js';

let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const near = (a, b, message) => check(Math.abs(a - b) < 1e-7, message);
function sample(s, metres, extra = {}) {
  return { prevS: s, s: s + metres, from: { x: 0, z: s }, to: { x: 0, z: s + metres },
    speedMph: 100, slipAngle: .14, headingError: .1, yawVelocity: .3, mainRoad: true, preparedRoute: false,
    status: 'racing', impactTimer: 0, airborne: false, airHeight: 0, ...extra };
}
function run(partition, { seconds = 6, slipAngle = .14, state = createDriftState(), metresPerSecond = 35 } = {}) {
  let elapsed = 0, index = 0, current = state.lastS;
  while (elapsed < seconds - 1e-9) {
    const dt = Math.min(partition[index++ % partition.length], seconds - elapsed), distance = metresPerSecond * dt;
    state = stepDrift(state, sample(current, distance, { slipAngle }), dt); current += distance; elapsed += dt;
  }
  return state;
}
{
  const a = run([1 / 120]), b = run([1 / 30]), c = run([1 / 144, .018, .05]);
  near(a.chainScore, b.chainScore, 'distance scoring is unchanged when a constant slide is partitioned at30FPS');
  near(a.chainScore, c.chainScore, 'mixed frame partitions preserve the same distance and multiplier integral');
  near(a.driftMeters, 210, 'only actual forward metres are scored');
  check(a.bankedScore === 0 && a.multiplier === DRIFT_SCORING.maxMultiplier, 'an active chain stays unbanked and its multiplier caps');
  check(a.chainScore <= a.driftMeters * DRIFT_SCORING.maxPointsPerMetre, 'even a long chain stays within its per-distance scoring budget');
  const snapshot = structuredClone(a); stepDrift(a, sample(a.lastS, .25), 1 / 120);
  assert.deepEqual(a, snapshot); checks++;
  const banked = run([1 / 120], { seconds: .7, slipAngle: 0, state: a });
  near(banked.bankedScore, a.chainScore, 'a stable straight banks the accumulated score after the grace');
  check(banked.chainScore === 0 && banked.multiplier === 1 && banked.bestChain === banked.bankedScore, 'banking resets the chain and remembers its best value');
  const grace = run([1 / 120], { seconds: .3, slipAngle: 0, state: a });
  check(grace.bankedScore === 0 && grace.chainScore === a.chainScore, 'short straight links preserve the chain');
  const stopped = stepDrift(a, sample(a.lastS, 0, { speedMph: 0, slipAngle: 0 }), .25);
  check(stopped.bankedScore === 0 && stopped.straightSec === 0, 'parking cannot bank a chain as a stable straight');
  const done = finishDrift(a, { completed: true });
  near(done.bankedScore, a.chainScore, 'a validated completed run can bank its final active slide');
  near(finishDrift(done, { completed: true }).bankedScore, done.bankedScore, 'repeated finish calls cannot bank twice');
  check(finishDrift(a, { completed: false }).bankedScore === 0, 'an unfinished event loses its unbanked chain');
}
for (const [label, flags] of [
  ['hit', { hit: true }], ['wall', { hit: true, speedMph: 90 }], ['crash', { impactTimer: 1 }], ['reset', { reset: true }],
  ['rough dirt', { mainRoad: false }], ['flight', { airborne: true }], ['air clearance', { airHeight: 1 }],
  ['reverse', { headingError: Math.PI }], ['spin', { yawVelocity: 4 }], ['uncontrolled slide', { slipAngle: .8 }],
]) {
  const active = run([1 / 120], { seconds: 1 }), stopped = stepDrift(active, sample(active.lastS, .25, flags), 1 / 120);
  check(stopped.chainScore === 0 && stopped.bankedScore === 0 && stopped.lastEvent?.type === 'lost', `${label} drops unbanked points instead of farming a chain`);
}
{
  let state = run([1 / 120], { seconds: 2 }); const visited = state.visitedTo;
  state = stepDrift(state, sample(state.lastS, -20, { reset: true }), 1 / 120);
  check(state.visitedTo === visited && state.chainScore === 0, 'recovery never rewinds the visited scoring frontier');
  state = run([1 / 120], { seconds: .5, state });
  check(state.chainScore === 0 && state.visitedTo === visited, 're-driving the same segment cannot earn points');
  state = run([1 / 120], { seconds: .2, state });
  check(state.chainScore > 0 && state.driftMeters <= visited + 4.51, 'only new metres beyond the prior frontier score again');
  const lap = createDriftState({ lapLength: 100, laps: 2, startS: 90 });
  const crossed = run([1 / 120], { seconds: 1, state: lap });
  near(crossed.driftMeters, 35, 'a second validated lap can score new absolute progress across the seam');
  let dirt = createDriftState();
  for (let i = 0; i < 100; i++) dirt = stepDrift(dirt, sample(i * .25, .25, { mainRoad: false }), 1 / 120);
  check(dirt.chainScore === 0 && dirt.visitedTo === 25, 'off-road travel consumes its visited interval without scoring');
  const gravel = stepDrift(createDriftState(), sample(0, .25, { mainRoad: false, preparedRoute: true }), 1 / 120);
  check(gravel.chainScore > 0, 'a legal prepared branch supports controlled drift scoring');
  const still = run([1 / 120], { seconds: 3, metresPerSecond: 0 });
  check(still.chainScore === 0 && still.driftMeters === 0, 'claimed speed and wheel slip without physical travel earn nothing');
}
{
  const active = run([1 / 120], { seconds: 1 });
  const teleport = stepDrift(active, sample(active.lastS, 500), 1 / 120);
  check(teleport.chainScore === 0 && teleport.lastEvent?.reason === 'reset', 'an implausible pose jump drops the chain');
  for (const dt of [NaN, Infinity, -1, 1]) check(stepDrift(active, sample(active.lastS, .25), dt).chainScore === 0, 'untrusted time values cannot score');
  for (const value of [NaN, Infinity, -Infinity]) check(stepDrift(active, sample(active.lastS, .25, { slipAngle: value }), 1 / 120).chainScore === 0, 'non-finite driving values cannot score');
  for (const extra of [{ airHeight: NaN }, { impactTimer: Infinity }, { impactTimer: -1 }]) check(stepDrift(active, sample(active.lastS, .25, extra), 1 / 120).chainScore === 0, 'invalid clearance and impact state cannot bypass eligibility');
  const corrupt = stepDrift({ bankedScore: Infinity, chainScore: NaN, visitedTo: Infinity, lapLength: NaN, laps: -1 }, null, NaN);
  check(Object.values(corrupt).filter(value => typeof value === 'number').every(Number.isFinite), 'corrupt restored scoring state stays finite and bounded');
  const saturated = finishDrift({ ...createDriftState({ lapLength: 100, laps: 1 }), bankedScore: 1190, chainScore: 1200 }, { completed: true });
  check(saturated.bankedScore === 1200, 'restored pending and banked points share one finite race-distance budget');
  const frozen = finishDrift(active, { completed: true });
  near(stepDrift(frozen, sample(frozen.lastS, .25), 1 / 120).bankedScore, frozen.bankedScore, 'a finished score cannot resume collecting points');
}

// Read-only observer of the existing Banshee city demo. Capture every actual
// physics step, rather than skipping intermediate poses at display frames.
const city = COURSE.findIndex(event => event.kind === 'chase'), captures = [];
for (const fps of [30, 144]) {
  const app = new App(); app.autopilot = true; app.duel.startCampaign({ startStage: city, seed: 1989, cpuDifficulty: 'hard' }); app._scriptedCrashDone = true;
  const d = app.duel, original = d.step.bind(d); let score = createDriftState({ lapLength: d.course.length, laps: 2 }), flags = {};
  let qualifyingSeconds = 0, maxSlip = 0;
  d.onChange((_, event) => { if (event.crash || event.scrape) flags.hit = true; if (event.boundaryReset || event.checkpointReset || event.recovered) flags.reset = true; });
  d.step = dt => {
    const previous = d.state.s, from = d.course.worldAt(previous, d.state.lateral); flags = {};
    original(dt); const s = d.state, surface = d._drivingSurface(s.s, s.lateral);
    score = stepDrift(score, { prevS: previous, s: s.s, from, to: d.course.worldAt(s.s, s.lateral), speedMph: s.speedMph,
      slipAngle: s.slipAngle, headingError: s.headingError, yawVelocity: s.yawVelocity, mainRoad: surface.mainRoad,
      preparedRoute: surface.road && surface.preparedGravel, status: s.status, impactTimer: s.impactTimer,
      airborne: s.airborne, airHeight: s.airHeight, ...flags }, dt);
    if (Math.abs(s.slipAngle) >= DRIFT_SCORING.minSlip && s.status === 'racing') qualifyingSeconds += dt;
    maxSlip = Math.max(maxSlip, Math.abs(s.slipAngle));
  };
  let frames = 0;
  while (!['stage_result', 'gameover'].includes(d.state.status) && frames++ < fps * 240) app.advance(1 / fps);
  score = finishDrift(score, { completed: d.state.results?.completed === true });
  captures.push({ fps, timeSec: d.state.results?.timeSec, completed: d.state.results?.completed, score: +score.bankedScore.toFixed(3),
    bestChain: +score.bestChain.toFixed(3), driftMeters: +score.driftMeters.toFixed(3), qualifyingSeconds: +qualifyingSeconds.toFixed(3), maxSlip: +maxSlip.toFixed(3), majorCrashes: d.state.majorCrashes });
}
check(captures.every(run => run.completed && run.majorCrashes === 0), 'the read-only scoring observer leaves the normal city demo intact');
assert.deepEqual({ ...captures[0], fps: 0 }, { ...captures[1], fps: 0 }); checks++;
console.log(JSON.stringify({ cityBaseline: captures }));
console.log(`Drift scoring: ${checks} checks passed.`);

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { App } from '../src/app.js';
import { COURSE, DEFAULT_CPU_DIFFICULTY } from '../src/config.js';
import { DEFAULT_DRIVER, driverModifierSignature } from '../src/drivers.js';
import { EXPANSION_COURSES } from '../src/expansion-courses.js';

// Real App input -> fixed-step Duel physics, real traffic/rival and colliders.
// The only driving fixture override skips the demo's deliberate shoulder visit;
// it does not move the car, alter handling, remove obstacles or award progress.
// Each race gets a fresh in-memory account. No browser/user saves are available.
const baselineOnly = process.argv.includes('--baseline');
const diagnoseContacts = process.argv.includes('--diagnose');
const requestedCourse = process.argv.find(value => value.startsWith('--course='))?.slice(9);
const selectedCourses = EXPANSION_COURSES.filter(course => !requestedCourse || course.id === requestedCourse);
assert(selectedCourses.length, 'Select a real expansion course ID');
const cars = baselineOnly ? ['falcone_f42'] : ['falcone_f42', 'stuttgart_959s'];
const difficulties = baselineOnly ? ['casual'] : ['casual', 'pro'];
const frameRates = baselineOnly ? [30] : [30, 144];
const failures = [], reports = [];
let checks = 0;
const check = (condition, label) => { checks++; if (!condition) failures.push(label); };
const round = value => +value.toFixed(3);
const started = performance.now();

function run(course, car, difficulty, fps) {
  const memory = new Map();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
  const app = new App();
  // Track-line physics fixture owns every course explicitly; access/purchase
  // rules have a separate suite. This memory-only setup changes no handling.
  app.profile.courses={version:1,unlocked:COURSE.map(course=>course.id)};
  app._saveProfile();
  const stageIndex = COURSE.findIndex(item => item.id === course.id);
  assert(stageIndex >= 0);
  assert(app.startCampaign({ startStage: stageIndex, seed: 1989, mode: 'duel', car, difficulty, cpuDifficulty: DEFAULT_CPU_DIFFICULTY, driverId: DEFAULT_DRIVER }));
  app.autopilot = true;
  app._scriptedCrashDone = true;
  const d = app.duel, metrics = { steps: 0, finite: true, airtime: 0, peakHeight: 0, peakAt: null, checkpointResets: 0, boundaryResets: 0, events: [] };
  let contact = null;
  if (diagnoseContacts) {
    const originalContact = d._vehicleContact.bind(d);
    const pose = actor => ({ role: actor === d.state ? 'player' : actor === d.state.rival ? 'rival' : actor === d.state.police.pursuit ? 'police' : `traffic-${d.state.traffic.indexOf(actor)}`,
      s: actor.s, phase: d.course.phase(actor.s), lateral: actor.lateral, speedMph: actor.speedMph, dir: actor.dir || 1,
      headingError: actor.headingError || 0, slipAngle: actor.slipAngle || 0, pushVelocity: actor.pushVelocity || 0,
      prevS: actor.prevS, prevLateral: actor.prevLateral, airHeight: actor.airHeight || 0,
      yielding: !!actor.yieldingToPlayer, input: actor.input ? { ...actor.input } : undefined });
    d._vehicleContact = (a, b, reason) => {
      const previous = contact; contact = { reason, a: pose(a), b: pose(b) };
      try { return originalContact(a, b, reason); } finally { contact = previous; }
    };
  }
  const inputs = createHash('sha256'), motion = createHash('sha256');
  const observe = d.step.bind(d);
  d.step = dt => {
    const wasRacing = d.state.status === 'racing';
    observe(dt);
    const s = d.state;
    // Read every physics tick, not every display frame, to compare flight peaks
    // and steering exactly at 30 and 144 FPS without changing simulation order.
    metrics.steps++;
    const values = [s.s, s.lateral, s.speedMph, s.revs, s.stageTimeSec, s.headingError, s.yawVelocity, s.airHeight, s.impactTimer];
    metrics.finite &&= values.every(Number.isFinite);
    if (wasRacing && s.airborne) metrics.airtime += dt;
    if (s.airHeight > metrics.peakHeight) { metrics.peakHeight = s.airHeight; metrics.peakAt = round(d.course.phase(s.s)); }
    if (wasRacing) {
      inputs.update(JSON.stringify([s.input.throttle, s.input.brake, s.input.steer, s.input.boost, s.gear]));
      motion.update(JSON.stringify(values));
    }
  };
  d.onChange((s, event) => {
    if (event.checkpointReset) metrics.checkpointResets++;
    if (event.boundaryReset) metrics.boundaryResets++;
    if (event.crash || event.checkpointReset || event.boundaryReset) metrics.events.push({ type: event.crash || (event.checkpointReset ? 'checkpoint-reset' : 'boundary-reset'), at: round(d.course.phase(s.s)), s: round(s.s), lateral: round(s.lateral), speed: round(s.speedMph), time: round(s.stageTimeSec), lap: s.completedLaps + 1, ...(diagnoseContacts ? { contact } : {}) });
  });
  let frames = 0;
  while (!['stage_result', 'gameover', 'complete'].includes(d.state.status) && frames++ < fps * 600) app.advance(1 / fps, 1 / fps);
  const s = d.state;
  const report = { course: course.id, car, transmission: difficulty === 'casual' ? 'Auto' : 'Manual', fps,
    status: s.status, completed: s.results?.completed === true, won: s.results?.won === true, laps: s.completedLaps,
    time: s.results?.timeSec ?? round(s.stageTimeSec), crashes: s.stageCrashes, checkpointResets: metrics.checkpointResets,
    boundaryResets: metrics.boundaryResets, airtime: round(metrics.airtime), peakHeight: round(metrics.peakHeight), peakAt: metrics.peakAt,
    endS: round(s.s), endLateral: round(s.lateral), endSpeed: round(s.speedMph), nextLapGate: s.nextLapGate,
    inputHash: inputs.digest('hex'), motionHash: motion.digest('hex'), events: metrics.events };
  const label = `${course.id}/${car}/${difficulty}/${fps}`;
  check(s.driverId === DEFAULT_DRIVER && driverModifierSignature(s.driverId, car) === '', `${label}: neutral driver`);
  check(s.car === car && s.difficulty === difficulty && s.cpuDifficulty === DEFAULT_CPU_DIFFICULTY, `${label}: requested car/transmission/CPU actually ran`);
  check(metrics.finite, `${label}: finite physical state on every tick`);
  check(s.status === 'stage_result' && report.completed && s.completedLaps === 2, `${label}: completes both real laps`);
  check(report.won, `${label}: demo line beats the default CPU`);
  check(metrics.checkpointResets === 0, `${label}: never skips an ordinary lap checkpoint`);
  check(metrics.boundaryResets === 0, `${label}: remains inside the recovery boundary`);
  console.log(JSON.stringify(report));
  return report;
}

for (const course of selectedCourses) for (const car of cars) for (const difficulty of difficulties) {
  const pair = frameRates.map(fps => run(course, car, difficulty, fps));
  reports.push(...pair);
  if (pair.length === 2) {
    const [a, b] = pair, label = `${course.id}/${car}/${difficulty}`;
    // The outer frame that contains the finish may include a few extra frozen
    // result ticks. Compare the useful input/physics sequence below, while the
    // scalar race result must remain display-rate independent.
    for (const key of ['status', 'completed', 'won', 'laps', 'time', 'crashes', 'checkpointResets', 'boundaryResets', 'airtime', 'peakHeight', 'peakAt']) check(a[key] === b[key], `${label}: ${key} is identical at 30/144 FPS`);
    check(a.inputHash === b.inputHash, `${label}: same per-tick steering/pedal/gear sequence at 30/144 FPS`);
    check(a.motionHash === b.motionHash, `${label}: same per-tick motion at 30/144 FPS`);
  }
}
console.log(`Expansion driving: ${reports.filter(run => run.completed).length}/${reports.length} completed, ${reports.filter(run => run.won).length} won; ${checks} checks, ${failures.length} failures; ${((performance.now() - started) / 1000).toFixed(3)}s. Memory-only accounts; forced demo shoulder excursion skipped.`);
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }

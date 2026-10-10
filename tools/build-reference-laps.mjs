// Deterministic Team Room references, built with the production App driver.
// All storage and completion overrides belong to a disposable Node fixture.
import {COURSE} from '../src/config.js';
import {getRouteVariants, supportsRouteVariants} from '../src/route-variants.js';
import {lapCrossing as crossing, compactLapTrace, lapSectorTimes, analyseLap} from '../src/track-analysis.js';
import {mkdirSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REFERENCE_POLICY = Object.freeze({
  car: 'stuttgart_959s', driver: 'club', cpu: 'medium', fixtureVersion: 1,
  warmupLaps: 1, timedLaps: 2, sampleMetres: 20,
});

export function referenceTargets(definitions = COURSE) {
  return definitions.filter(definition => definition.closed !== false).flatMap(definition => {
    const routes = supportsRouteVariants(definition) ? getRouteVariants(definition)
      : [{id: 'fixed', seed: definition.layoutSeed ?? 1989}];
    return routes.map(route => ({key: `${definition.id}|${route.id}`,
      eventId: definition.id, route: route.id, seed: route.seed}));
  });
}

export function selectReferenceLap(run) {
  const {length, trace, lapTimes, completedLaps, assistedLaps = []} = run;
  if (!Number.isFinite(length) || length <= 0 || completedLaps < 3 ||
      !Array.isArray(lapTimes) || lapTimes.length < 3 ||
      lapTimes.slice(0, 3).some(time => !Number.isFinite(time) || time <= 0) ||
      !Array.isArray(trace) || !trace.length ||
      trace.some(row => !Number.isFinite(row.s) || !Number.isFinite(row.t) || !Number.isFinite(row.mph)))
    throw Error('Reference needs three complete valid native laps.');
  // Validate both timed laps are actually present even when the earlier one
  // wins. A partial third lap must never publish a seemingly complete result.
  crossing(trace, length); crossing(trace, length * 2); crossing(trace, length * 3);
  const candidates = [1, 2].filter(lap => !assistedLaps[lap]);
  if (!candidates.length) throw Error('Both timed reference laps are assisted.');
  const lap = candidates.reduce((best, index) => lapTimes[index] < lapTimes[best] ? index : best);
  const startS = lap * length, endS = startS + length;
  const startTime = lapTimes.slice(0, lap).reduce((sum, seconds) => sum + seconds, 0);
  const start = crossing(trace, startS), end = crossing(trace, endS);
  const rows = [start, ...trace.filter(row => row.s > startS && row.s < endS), end]
    .map(row => ({...row, s: row.s - startS, t: row.t - startTime}));
  // Native completed-lap timestamps are authoritative at the two lines;
  // native observations between them retain their actual elapsed times.
  rows[0].t = 0; rows.at(-1).t = lapTimes[lap];
  return {lap, length, lapMs: Math.round(lapTimes[lap] * 1000), trace: rows};
}

export function referenceTrace(lap) {
  return compactLapTrace(lap);
}

export function referenceSectorTimes(lap, sectors) {
  return lapSectorTimes(lap, sectors);
}

export async function withReferenceApp(run, {AppClass} = {}) {
  if (typeof window !== 'undefined') throw Error('Reference builds use an isolated Node fixture.');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
  const rows = new Map();
  const storage = {get length() { return rows.size; }, key: index => [...rows.keys()][index] ?? null,
    getItem: key => rows.get(String(key)) ?? null,
    setItem: (key, value) => rows.set(String(key), String(value)),
    removeItem: key => rows.delete(String(key)), clear: () => rows.clear()};
  let app;
  try {
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: storage});
    if (!previousCancel)
      Object.defineProperty(globalThis, 'cancelAnimationFrame', {configurable: true, value() {}});
    const Constructor = AppClass ?? (await import('../src/app.js')).App;
    app = new Constructor();
    return await run(app);
  } finally {
    try { app?.dispose(); }
    finally {
      if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
      else delete globalThis.localStorage;
      if (previousCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', previousCancel);
      else delete globalThis.cancelAnimationFrame;
    }
  }
}

// Native course methods must keep their original receiver: practice affects
// width, ground, free-heading driving and boost. Only the native lap/finish
// guards receive completion metadata. Nothing here changes a physical step.
function completionCourse(course) {
  const view = Object.create(course);
  Object.defineProperty(view, 'def', {value: {...course.def, practice: false, laps: 3}});
  Object.defineProperty(view, 'raceLength', {value: course.length * 3});
  for (let owner = course; owner && owner !== Object.prototype; owner = Object.getPrototypeOf(owner)) {
    for (const name of Object.getOwnPropertyNames(owner)) {
      if (name === 'constructor' || Object.hasOwn(view, name)) continue;
      const member = Object.getOwnPropertyDescriptor(owner, name);
      if (typeof member.value === 'function') Object.defineProperty(view, name, {value: member.value.bind(course)});
    }
  }
  return view;
}

export function installReferenceFixture(app, target) {
  const duel = app.duel, state = duel.state, course = duel.course;
  if (state.car !== REFERENCE_POLICY.car) throw Error(`Reference car fell back to ${state.car}.`);
  if (course.def.id !== target.eventId) throw Error('Reference fixture started another course.');
  const completion = Object.create(duel);
  Object.defineProperty(completion, 'course', {value: completionCourse(course)});
  // Native legal-crossing tests, recovery and event delivery use the original
  // physical course and native Duel state, never a second simulation.
  for (const name of ['_surface', '_safeReset', '_callout', 'emit'])
    if (typeof duel[name] === 'function') Object.defineProperty(completion, name, {value: duel[name].bind(duel)});
  const originals = new Map(['_advanceLaps', '_finishStage', '_police'].map(name =>
    [name, {descriptor: Object.getOwnPropertyDescriptor(duel, name), method: duel[name]}]));
  const nativeAdvance = duel._advanceLaps, nativeFinish = duel._finishStage;
  duel._advanceLaps = function(...args) { return nativeAdvance.apply(completion, args); };
  duel._finishStage = function(...args) { return nativeFinish.apply(completion, args); };
  duel._police = () => {};
  Object.assign(state, {lapsTotal: 3, objective: null, timeLimitSec: null, timeRemaining: null,
    drift: null, checkpointRush: null, traffic: [], opponents: [], rival: null, combat: null});
  state.police.pursuit = null;
  let disposed = false;
  return {course, completion,
    overrides: ['lapsTotal=3', 'objective/deadline disabled', 'opponents/traffic/weapons absent',
      'police/radar disabled', 'completion-only practice:false/laps:3 course view'],
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [name, original] of originals) {
        if (original.descriptor) Object.defineProperty(duel, name, original.descriptor);
        else delete duel[name];
      }
    },
  };
}

export function startReferenceApp(app, target) {
  const startStage = COURSE.findIndex(definition => definition.id === target.eventId);
  if (startStage < 0) throw Error(`Unknown reference event: ${target.eventId}`);
  app.profile = {...app.profile, courses: {version: 1, unlocked: COURSE.map(course => course.id)}};
  app._saveProfile();
  const options = {startStage, seed: target.seed, mode: 'duel', car: REFERENCE_POLICY.car,
    driverId: REFERENCE_POLICY.driver, cpuDifficulty: REFERENCE_POLICY.cpu,
    difficulty: 'casual', opponentCount: 0, upgrades: {}};
  if (!app.startCampaign(options)) throw Error(`Reference event would not start: ${target.key}`);
  // Production App intentionally uses 1989 for fixed menu events. CIRCUITS
  // 7b.1 requires layoutSeed for the fixed reference. Restart this disposable
  // Duel through its native API with the validated setup and required seed.
  app.duel.startCampaign(options);
  const state = app.duel.state;
  if (state.seed !== target.seed || state.driverId !== REFERENCE_POLICY.driver ||
      state.cpuDifficulty !== REFERENCE_POLICY.cpu || Object.values(state.upgrades).some(level => level !== 0))
    throw Error(`Reference setup differs from the fixed policy: ${target.key}`);
  app.autopilot = true;
  app._scriptedCrashDone = true;
  return {options, fixture: installReferenceFixture(app, target)};
}

export async function buildReferenceRecord(target, {maxSeconds = 720, AppClass} = {}) {
  return withReferenceApp(async app => {
    const {fixture} = startReferenceApp(app, target);
    try {
      const {state, course} = app.duel, trace = [];
      const observe = () => trace.push({s: state.s, t: state.stageTimeSec + state.racePenaltySec,
        mph: Math.max(0, state.speedMph), gear: state.gear,
        throttle: state.input.throttle, brake: state.input.brake, lateral: state.lateral});
      observe();
      for (let frame = 0; frame < maxSeconds * 30 && state.completedLaps < 3; frame++) {
        if (!['countdown', 'racing'].includes(state.status)) break;
        app.advance(1 / 30, 1 / 30);
        if (state.stageTimeSec > trace.at(-1).t || state.completedLaps >= 3) observe();
      }
      const lap = selectReferenceLap({length: course.length, trace, lapTimes: state.lapTimes,
        completedLaps: state.completedLaps, assistedLaps: state.assistedLaps});
      const metrics = analyseLap(course, {trace: lap.trace, lapMs: lap.lapMs, route: target.route});
      return {eventId: target.eventId, route: target.route, seed: target.seed,
        car: REFERENCE_POLICY.car, driver: REFERENCE_POLICY.driver, cpu: REFERENCE_POLICY.cpu,
        fixtureVersion: REFERENCE_POLICY.fixtureVersion, ...metrics};
    } catch (error) {
      throw Error(`${target.key}: ${error.message} (native laps ${app.duel.state.completedLaps}/3, status ${app.duel.state.status})`, {cause: error});
    } finally { fixture.dispose(); }
  }, {AppClass});
}

export async function buildReferenceSet({targets = referenceTargets(), run = buildReferenceRecord, onRecord = () => {}} = {}) {
  const records = {};
  for (const target of targets) {
    records[target.key] = await run(target);
    onRecord(target, records[target.key]);
  }
  return records;
}

async function main() {
  const args = process.argv.slice(2), event = args.find(arg => arg.startsWith('--event='))?.slice(8);
  const route = args.find(arg => arg.startsWith('--route='))?.slice(8), probe = args.includes('--probe');
  if ((event || route) && !probe) throw Error('A filtered reference run needs --probe; partial data cannot be published.');
  const targets = referenceTargets().filter(target => (!event || target.eventId === event) && (!route || target.route === route));
  if (!targets.length) throw Error('No reference target matched.');
  const records = await buildReferenceSet({targets,
    onRecord: (target, record) => console.log(`${target.key}: ${record.lapMs} ms, ${record.trace.length} samples, ${record.courseFingerprint}`)});
  if (probe) return;
  const output = fileURLToPath(new URL('../src/generated/reference-laps.json', import.meta.url));
  mkdirSync(dirname(output), {recursive: true});
  writeFileSync(`${output}.tmp`, `${JSON.stringify(records)}\n`);
  renameSync(`${output}.tmp`, output);
  console.log(`Built ${targets.length} complete reference records.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => { console.error(error.message); process.exitCode = 1; });

import assert from 'node:assert/strict';
import {COURSE} from '../src/config.js';
import {
  REFERENCE_POLICY, referenceTargets, selectReferenceLap, referenceTrace,
  referenceSectorTimes, withReferenceApp, installReferenceFixture, buildReferenceSet, startReferenceApp,
} from './build-reference-laps.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };

equal(REFERENCE_POLICY, {car: 'stuttgart_959s', driver: 'club', cpu: 'medium',
  fixtureVersion: 1, warmupLaps: 1, timedLaps: 2, sampleMetres: 20}, 'Reference policy matches CIRCUITS 7b.1');
const definitionsBefore = JSON.stringify(COURSE);
const targets = referenceTargets(COURSE);
equal(targets.length, 24, 'Every current closed event/route receives its own reference');
equal(targets.filter(target => target.eventId === 'pacific-canyon').map(target => [target.route, target.seed]),
  [['route_a', 1989], ['route_b', 42], ['route_c', 17]], 'Legacy routes retain their real seeds');
check(targets.some(target => target.eventId === 'titan-freestyle' && target.route === 'fixed'), 'Closed playground is included');
equal(new Set(targets.map(target => target.key)).size, targets.length, 'Record keys do not collide');
equal(referenceTargets([{id: 'authored-fixture', closed: true, layoutSeed: 9012}]),
  [{key: 'authored-fixture|fixed', eventId: 'authored-fixture', route: 'fixed', seed: 9012}],
  'Authored fixed events use their layout seed');
equal(referenceTargets([{id: 'open-road', closed: false, layoutSeed: 1}]), [], 'Open roads do not become cyclic references');
equal(JSON.stringify(COURSE), definitionsBefore, 'Target discovery does not edit global definitions');
const fakeTargets = targets.slice(0, 2), visited = [];
const completeSet = await buildReferenceSet({targets: fakeTargets, run: async target => {
  visited.push(target.key); return {eventId: target.eventId, route: target.route, lapMs: 8000};
}});
equal(Object.keys(completeSet), fakeTargets.map(target => target.key), 'Reference set preserves every requested route key');
equal(visited, fakeTargets.map(target => target.key), 'Reference routes build sequentially');
await assert.rejects(() => buildReferenceSet({targets: fakeTargets, run: async target => {
  if (target === fakeTargets[1]) throw Error('Incomplete native lap');
  return {lapMs: 8000};
}}), /Incomplete native lap/); checks++;

// Native traces use absolute distance/time. This independent linear fixture
// makes seam interpolation and selection numerically checkable.
const length = 100;
const run = {length, completedLaps: 3, lapTimes: [10, 8, 9], assistedLaps: [false, false, false],
  trace: [
    {s: 0, t: 0, mph: 20, gear: 1}, {s: 100, t: 10, mph: 40, gear: 2},
    {s: 150, t: 14, mph: 60, gear: 3}, {s: 200, t: 18, mph: 40, gear: 2},
    {s: 250, t: 22.5, mph: 55, gear: 3}, {s: 300, t: 27, mph: 40, gear: 2},
  ]};
const runBefore = JSON.stringify(run);
const selected = selectReferenceLap(run);
equal(selected.lap, 1, 'Warm-up is ignored and the quicker completed flying lap is selected');
equal(selected.lapMs, 8000, 'Lap time is the native completed lap time');
equal(selected.trace.map(row => [row.s, row.t]), [[0, 0], [50, 4], [100, 8]], 'Selected lap is rebased exactly at its start');
equal(referenceTrace(selected), [[0, 64], [20, 77], [40, 90], [60, 90], [80, 77]],
  'Compact trace is sampled by distance every 20 m and stores kph, not mph');
equal(referenceSectorTimes(selected, [{startS: 0, endS: 25}, {startS: 25, endS: 75}, {startS: 75, endS: 100}]),
  [2000, 4000, 2000], 'Sector times come from actual crossing timestamps');
equal(JSON.stringify(run), runBefore, 'Selection and sampling do not modify the native trace');

const equalTimes = {...run, lapTimes: [10, 8, 8]};
equal(selectReferenceLap(equalTimes).lap, 1, 'A tie keeps the earlier completed flying lap');
for (const incomplete of [
  {...run, completedLaps: 2}, {...run, lapTimes: [10, 8]},
  {...run, trace: run.trace.slice(0, -1)}, {...run, lapTimes: [10, NaN, 9]},
  {...run, assistedLaps: [false, true, true]},
]) {
  assert.throws(() => selectReferenceLap(incomplete), /complete|valid|assisted/i); checks++;
}
// Samples straddling each line must interpolate, not move the car or invent
// a zero-speed endpoint. Actual lap counters/times remain the authority.
const across = {...run, trace: [
  {s: 0, t: 0, mph: 20, gear: 1}, {s: 90, t: 9, mph: 35, gear: 2},
  {s: 110, t: 11, mph: 45, gear: 2}, {s: 190, t: 17, mph: 45, gear: 2},
  {s: 210, t: 19, mph: 35, gear: 2}, {s: 310, t: 28, mph: 40, gear: 2},
]};
const interpolated = selectReferenceLap(across);
equal([interpolated.trace[0].s, interpolated.trace[0].mph, interpolated.trace.at(-1).s, interpolated.trace.at(-1).mph],
  [0, 40, 100, 40], 'Line crossings are interpolated from native observations');

// Prove that disposable storage replaces, never reads, the outer storage
// accessor, and that a thrown error restores its exact descriptor.
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const previousCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
let outerReads = 0, disposed = 0;
const sentinel = {configurable: true, enumerable: false, set: undefined,
  get() { outerReads++; throw Error('Do not read outer storage'); }};
Object.defineProperty(globalThis, 'localStorage', sentinel);
class MemoryApp {
  constructor() { globalThis.localStorage.setItem('fixture', 'private'); }
  dispose() { disposed++; }
}
try {
  await assert.rejects(() => withReferenceApp(async () => { throw Error('fixture stopped'); }, {AppClass: MemoryApp}), /fixture stopped/);
  equal(outerReads, 0, 'Reference lifecycle never reads real/outer storage');
  equal(disposed, 1, 'Failed fixture is disposed exactly once');
  equal(Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), sentinel, 'Exact storage accessor is restored after failure');
  equal(Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame'), previousCancel, 'Temporary animation global is restored');
} finally {
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
  else delete globalThis.localStorage;
}

// A completion-only facade must not make the native physical step see the
// playground as a road race. Surfaces deliberately depend on practice here.
const physicalDefinition = Object.freeze({id: 'practice-fixture', closed: true, practice: true, laps: 2});
const physicalCourse = {def: physicalDefinition, length: 100, raceLength: 200,
  features: {lapGates: [], radarTraps: [{s: 30}], ramps: [{start: 40, end: 60}]},
  surfaceAt() { return {roadHalfWidth: this.def.practice ? 24 : 7, road: true}; },
  groundAt() { return {x: 1, y: this.def.practice ? 9 : 0, z: 2}; }};
let advances = 0, finishes = 0;
const duel = {course: physicalCourse, state: {car: 'stuttgart_959s', practice: true, lapsTotal: 2,
  objective: {}, timeLimitSec: 50, timeRemaining: 50, drift: {}, checkpointRush: {},
  traffic: [{}], opponents: [{}], rival: {}, combat: {}, police: {pursuit: {active: true}}},
  _lapGates: [25, 50, 75],
  _surface() { return this.course.surfaceAt(); },
  _advanceLaps(actor, dt) {
    advances++;
    equal(this.course.def.practice, false, 'Only native lap completion sees practice:false');
    equal(this.state.practice, true, 'Physical player practice remains true');
    equal(this._surface().roadHalfWidth, 24, 'Native lap legality reads the original physical road width');
    equal(this.course.groundAt().y, 9, 'Completion facade preserves native ground geometry');
    equal(this._lapGates, [25, 50, 75], 'Ordered native gates remain unchanged');
    equal(dt, 1 / 30, 'Actual fixed step reaches native lap completion');
  },
  _finishStage() { finishes++; equal(this.course.def.practice, false, 'Only finish completion sees practice:false'); },
  _police() { throw Error('Reference fixture must not run police'); },
};
const fixture = installReferenceFixture({duel}, {eventId: 'practice-fixture'});
equal(duel.course, physicalCourse, 'Fixture keeps the actual native course object');
equal(duel.course.def, physicalDefinition, 'Fixture never replaces physical definition');
equal(duel.state.practice, true, 'Fixture never changes native practice driving');
equal(duel.state.lapsTotal, 3, 'Only lap completion target extends to three');
equal([duel.state.objective, duel.state.timeLimitSec, duel.state.timeRemaining, duel.state.drift, duel.state.checkpointRush],
  [null, null, null, null, null], 'Objective/deadline completion is neutralized in disposable state');
equal([duel.state.traffic, duel.state.opponents, duel.state.rival, duel.state.combat, duel.state.police.pursuit],
  [[], [], null, null, null], 'The reference fixture contains no traffic, opponents, weapons or pursuit');
duel._advanceLaps(duel.state, 1 / 30);
duel._finishStage();
duel._police();
equal([advances, finishes], [1, 1], 'Facade delegates each completion call once');
equal(duel.course.features.radarTraps, [{s: 30}], 'Physical course data is not deleted to disable radar');
fixture.dispose();
check(duel._police.toString().includes('must not run police'), 'Disposal restores the native instance methods');

if (process.argv.includes('--native')) {
  const {Duel} = await import('../src/game.js');
  const {courseFingerprint} = await import('../src/track-analysis.js');
  const target = targets.find(row => row.eventId === 'titan-freestyle');
  await withReferenceApp(async app => {
    const {options, fixture: nativeFixture} = startReferenceApp(app, target);
    try {
      const direct = new Duel({seed: target.seed});
      direct.startCampaign(options);
      Object.assign(direct.state, {objective: null, timeLimitSec: null, timeRemaining: null,
        drift: null, checkpointRush: null, traffic: [], opponents: [], rival: null, combat: null});
      direct.state.police.pursuit = null;
      direct._police = () => {};
      equal(courseFingerprint(app.duel.course), courseFingerprint(direct.course),
        'Native completion fixture uses the same physical geometry as the direct Duel');
      equal(app.duel.course.def, COURSE[options.startStage], 'Native fixture retains the real definition object');
      check(app.duel.state.practice && app.duel.course.def.practice, 'Native playground keeps both physical practice flags');
      const physicalKeys = ['s', 'lateral', 'speedMph', 'gear', 'headingError', 'yawVelocity',
        'groundHeight', 'terrainPitch', 'terrainRoll', 'airborne', 'airHeight', 'roughness', 'boost'];
      for (let step = 0; step < 720; step++) {
        const input = {throttle: 1, brake: 0, steer: step < 500 ? 0 : .12, boost: false};
        app.duel.setInput(input); direct.setInput(input);
        app.duel.step(1 / 120); direct.step(1 / 120);
      }
      equal(Object.fromEntries(physicalKeys.map(key => [key, app.duel.state[key]])),
        Object.fromEntries(physicalKeys.map(key => [key, direct.state[key]])),
        '720 native physical steps remain exact with the completion-only facade');
      check(app.duel.state.s > 0, 'Parity probe actually drove the native playground');
      equal(JSON.stringify(COURSE), definitionsBefore, 'Native fixture never edits global course definitions');
    } finally { nativeFixture.dispose(); }
  });
}

console.log(`Reference laps: ${checks} checks.`);

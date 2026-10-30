import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import {getRouteVariants, supportsRouteVariants} from '../src/route-variants.js';
import {publishReferenceSet} from './build-reference-laps.mjs';
import assert from 'node:assert/strict';
import {COURSE} from '../src/config.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {Course} from '../src/course.js';
import {courseFingerprint, analyseTrack, cornerId} from '../src/track-analysis.js';
import {
  REFERENCE_POLICY, referenceTargets, selectReferenceLap, referenceTrace,
  referenceSectorTimes, withReferenceApp, installReferenceFixture, buildReferenceSet, startReferenceApp, runReferenceWorker,
} from './build-reference-laps.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };

equal(REFERENCE_POLICY, {car: 'stuttgart_959s', driver: 'club', cpu: 'medium',
  fixtureVersion: 1, warmupLaps: 1, timedLaps: 2, sampleMetres: 20}, 'Reference policy matches CIRCUITS 7b.1');
const definitionsBefore = JSON.stringify(COURSE);
// Published records follow the installed definition of a slotted course.
// A dev replacement gets its own new reference in C3, before it is released.
const definitions = [...new Map([...ALL_CIRCUITS, ...COURSE].map(row => [row.id, row])).values()];
const targets = referenceTargets();
const expectedKeys = definitions.filter(definition => definition.closed !== false).flatMap(definition =>
  (supportsRouteVariants(definition) ? getRouteVariants(definition).map(route => route.id) : ['fixed']).map(route => definition.id + '|' + route));
equal(targets.map(target => target.key).sort(), expectedKeys.sort(), 'Every closed event and actual route has exactly one reference target');
check(ALL_CIRCUITS.filter(definition=>definition.closed!==false).every(definition => targets.some(target => target.eventId === definition.id &&
  target.seed === (definition.layoutSeed ?? 1989))), 'Authored circuits retain their declared layout seed or native fixed fallback while switches are off');
equal(targets.filter(target => target.eventId === 'pacific-canyon').map(target => [target.route, target.seed]),
  [['route_a', 1989], ['route_b', 42], ['route_c', 17]], 'Legacy routes retain their real seeds');
check(targets.some(target => target.eventId === 'titan-freestyle' && target.route === 'fixed'), 'Closed playground is included');
equal(new Set(targets.map(target => target.key)).size, targets.length, 'Record keys do not collide');
equal(referenceTargets([{id: 'authored-fixture', closed: true, layoutSeed: 9012}]),
  [{key: 'authored-fixture|fixed', eventId: 'authored-fixture', route: 'fixed', seed: 9012}],
  'Authored fixed events use their layout seed');
equal(referenceTargets([{id: 'open-road', closed: false, layoutSeed: 1}]), [], 'Open roads do not become cyclic references');
equal(JSON.stringify(COURSE), definitionsBefore, 'Target discovery does not edit global definitions');
const nativeCatalog = await runReferenceWorker({catalogOnly: true});
check(ALL_CIRCUITS.every(definition => nativeCatalog.events.includes(definition.id)),
  'Fresh worker enables authored circuits in the actual native COURSE registry');
// All four circuits are released (state on): Tremblant Woods, Tremblant Snow, Harbour Lights and Panorama Ridge. A circuit still in development would be a real dev switch reached through the QA query.
check(nativeCatalog.flags.every(row => row.enabled && row.state === CIRCUIT_MANIFESTS.find(manifest => manifest.flag === row.name)?.state),
  'Fresh worker enables every circuit switch: released ones are on, any circuit still in development is a real dev switch through the supported QA query');
equal(nativeCatalog.storageLength, 0, 'Worker begins with empty memory-only storage');
equal(JSON.stringify(COURSE), definitionsBefore, 'Worker does not change the parent native catalog');
await assert.rejects(() => runReferenceWorker({targets: [{key: 'missing|fixed', eventId: 'missing', route: 'fixed', seed: 1989}]}),
  /Unknown reference event/); checks++;
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

// Every new variant must enter through its actual unlock rule: found from the air (the pilot's map record).
for (const definition of ALL_CIRCUITS.filter(d => CIRCUIT_MANIFESTS.find(m => m.id === d.id)?.unlock?.kind === 'spotted-from-air')) {
  const previousLength = COURSE.length;
  // A parent still behind its own switch (Kogane Pass) joins the list for this check too, since the variant opens only with it.
  const parent = ALL_CIRCUITS.find(d => d.id === CIRCUIT_MANIFESTS.find(m => m.id === definition.id).unlock.defaultEventId);
  if (!COURSE.includes(parent)) COURSE.push(parent);
  if (!COURSE.includes(definition)) COURSE.push(definition);
  try {
    await withReferenceApp(async app => {
      const parentId = CIRCUIT_MANIFESTS.find(m => m.id === definition.id).unlock.defaultEventId;
      const target = {eventId: definition.id, key: definition.id + '|fixed', route: 'fixed', seed: 1989};
      app.profile = {...app.profile, grandPrixPodiums: ['tremblant-woods'], heli: undefined,
        courses: {version: 1, unlocked: [parentId]}};
      const {fixture: eligible} = startReferenceApp(app, target);
      try {
        equal(app.duel.course.def.id, definition.id, 'Actual production variant admission succeeds with earned parent fixture');
        check(app.profile.heli.map.found.includes(definition.id), 'Fixture has the variant in the pilot\'s found list');
        check(app.profile.grandPrixPodiums.includes('tremblant-woods'), 'Existing profile results are preserved');
      } finally {eligible.dispose();}
    });
  } finally {while (COURSE.length > previousLength) COURSE.pop();}
}

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

const rebuild = 'Run node tools/build-reference-laps.mjs to rebuild all native references.';
const {referenceLap, referenceKey, REFERENCE_LAPS} = await import('../src/reference-laps.js')
  .catch(error => {throw Error(`Missing bundled reference laps. ${rebuild}`, {cause: error});});
equal(referenceKey('pacific-canyon', 'route_b'), 'pacific-canyon|route_b', 'Runtime loader preserves explicit route identity');
equal(referenceLap('not-a-course'), null, 'Unknown runtime references are absent rather than invented');
equal(Object.keys(REFERENCE_LAPS).sort(), targets.map(target => target.key).sort(), `Exactly every native closed event/route must be present. ${rebuild}`);
for (const target of targets) {
  const record = referenceLap(target.eventId, target.route);
  const definition = definitions.find(row => row.id === target.eventId), course = new Course(definition, target.seed);
  equal(record.courseFingerprint, courseFingerprint(course, {route: target.route}), `${target.key} reference is stale. ${rebuild}`);
  equal([record.eventId, record.route, record.seed, record.car, record.driver, record.cpu, record.fixtureVersion],
    [target.eventId, target.route, target.seed, REFERENCE_POLICY.car, REFERENCE_POLICY.driver, REFERENCE_POLICY.cpu, 1],
    `${target.key} must retain the approved fixed policy`);
  equal(record.sectorMs.length, 3, `${target.key} has exactly three measured sectors`);
  equal(record.sectorMs.reduce((sum, value) => sum + value, 0), record.lapMs, `${target.key} sector times sum to its actual lap`);
  check(record.lapMs > 0 && record.sectorMs.every(value => Number.isInteger(value) && value > 0), `${target.key} has positive measured times`);
  equal(record.trace.length, Math.ceil(course.length / 20), `${target.key} covers the whole lap at 20 m steps`);
  check(record.trace.every(([distance, kph], index) => distance === index * 20 && Number.isInteger(kph) && kph >= 0),
    `${target.key} stores ordered distance/kph samples`);
  equal(record.corners.map(corner => corner.id), analyseTrack(course).corners.map(cornerId),
    `${target.key} corner identities follow native geometry`);
  check(record.corners.every(corner => ['s', 'brakeS', 'entryKph', 'minKph', 'exitKph', 'gear', 'elapsedMs']
    .every(key => Number.isFinite(corner[key])) && corner.gear >= 1 && corner.elapsedMs > 0),
    `${target.key} corner metrics are measured, including elapsed time and displayed gear`);
  check(Object.isFrozen(record) && Object.isFrozen(record.trace[0]), `${target.key} bundled reference cannot be mutated by a view`);
}

console.log(`Reference laps: ${checks} checks.`);

// Per-course publication must remain complete and atomic, without native reruns.
{
  const rows=Object.fromEntries(Object.entries(REFERENCE_LAPS).filter(([key])=>key.startsWith('pacific-canyon|')));
  const writes=[],renames=[],directories=[];
  const output=new URL('../.qa-dist/reference-publication-fixture/',import.meta.url);
  const operations={output,makeDirectory:path=>directories.push(path),write:(path,bytes)=>writes.push([path,bytes]),rename:(from,to)=>renames.push([from,to])};
  await assert.rejects(async()=>publishReferenceSet({'pacific-canyon|route_a':rows['pacific-canyon|route_a']},operations),/every route/);
  equal(writes,[],'a partial route set cannot publish any course');
  equal(publishReferenceSet(rows,operations),1,'complete event publishes just its own course file');
  equal(writes.length,1,'one course uses one atomic temporary file');
  equal(renames.length,1,'completed data replaces the course file atomically');
  equal(JSON.parse(writes[0][1]),rows,'publisher preserves every measured record value');
}

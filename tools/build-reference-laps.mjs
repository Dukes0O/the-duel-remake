import {MAX_GHOST_SAMPLES} from '../src/ghost.js';
import {referenceLap} from '../src/reference-laps.js';
import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
// Deterministic Team Room references, built with the production App driver.
// All storage and completion overrides belong to a disposable Node fixture.
import {COURSE} from '../src/config.js';
import {useRacingLine} from './track-script-drive.mjs';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {courseHasWinterSurfaces} from '../src/race-surfaces.js';
import {getRouteVariants, supportsRouteVariants} from '../src/route-variants.js';
import {lapCrossing as crossing, compactLapTrace, lapSectorTimes, analyseLap} from '../src/track-analysis.js';
import {mkdirSync, renameSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {heliOf} from '../src/heli/heli-save.js';

export const REFERENCE_POLICY = Object.freeze({
  car: 'stuttgart_959s', driver: 'club', cpu: 'medium', fixtureVersion: 1,
  warmupLaps: 1, timedLaps: 2, sampleMetres: 20,
});

export function referenceTargets(definitions = [...new Map([...COURSE, ...ALL_CIRCUITS]
  .map(definition => [definition.id, definition])).values()]) {
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


// Keep observed native poses from the chosen flying lap. Only its two line
// crossings interpolate neighbouring observations, as the timing trace does.
export function referencePoseSamples(lap, nativeTrace) {
  const fields = ['lateral', 'heading', 'airHeight', 'mph'];
  const optional = ['groundHeight','terrainPitch','terrainRoll'];
  const startS = lap.lap * lap.length;
  const poseAt = distance => {
    let index = nativeTrace.findIndex(row => row.s >= distance);
    if (index < 0) throw Error('Missing native pose at the lap line.');
    const b = nativeTrace[index], a = Math.abs(b.s - distance) < 1e-6 ? b : nativeTrace[index - 1];
    if (!a || !fields.every(key => Number.isFinite(a[key]) && Number.isFinite(b[key])))
      throw Error('Reference needs complete native pose fields.');
    const blend = a === b ? 0 : (distance - a.s) / (b.s - a.s);
    if (!(blend >= 0 && blend <= 1)) throw Error('Invalid native pose crossing.');
    const pose = Object.fromEntries(fields.map(key => [key, a[key] + (b[key] - a[key]) * blend]));
    for (const key of optional) {
      if ([a[key],b[key]].some(value => value != null && !Number.isFinite(value)))
        throw Error('Invalid optional native pose field.');
      pose[key] = Number.isFinite(a[key]) && Number.isFinite(b[key]) ?
        a[key] + (b[key]-a[key])*blend : null;
    }
    pose.heading = a.heading + Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading)) * blend;
    pose.tumble = !!a.tumble;
    return pose;
  };
  const rows = [], interval = Math.max(.2, lap.lapMs / 1000 / (MAX_GHOST_SAMPLES - 2));
  let next = 0;
  for (let index = 0; index < lap.trace.length; index++) {
    const row = lap.trace[index], final = index === lap.trace.length - 1;
    if (!final && rows.length && row.t < next) continue;
    const pose = poseAt(startS + row.s);
    const packed = [Math.round(row.t * 1000), Math.round(row.s * 100), Math.round(pose.lateral * 100),
      Math.round(pose.heading * 10000), Math.round(Math.max(0, pose.airHeight) * 100),
      Math.round(Math.max(0, pose.mph) * 10), 0];
    const flags = (pose.groundHeight != null ? 1 : 0) | (pose.terrainPitch != null ? 2 : 0) |
      (pose.terrainRoll != null ? 4 : 0) | (pose.tumble ? 8 : 0);
    if (flags) packed.push(Math.round((pose.groundHeight ?? 0)*100),
      Math.round((pose.terrainPitch ?? 0)*10000),Math.round((pose.terrainRoll ?? 0)*10000),flags);
    if (rows.length && (packed[0] <= rows.at(-1)[0] || packed[1] < rows.at(-1)[1]))
      throw Error('Native reference pose clock or distance is not increasing.');
    rows.push(packed);next = row.t + interval;
  }
  return rows;
}

export function retainReferencePoses(stored, rebuilt) {
  const unchanged = ['eventId', 'route', 'seed', 'car', 'driver', 'cpu', 'fixtureVersion',
    'courseFingerprint', 'lapMs', 'sectorMs', 'trace', 'corners'];
  const difference = unchanged.find(key => JSON.stringify(stored?.[key]) !== JSON.stringify(rebuilt?.[key]));
  const samples = rebuilt?.poseSamples;
  if (difference || !Array.isArray(samples) || samples.length < 12 ||
      samples.some(row => !Array.isArray(row) || ![7,11].includes(row.length) || !row.every(Number.isFinite)))
    return {record:stored,attached:false,reason:difference || 'missing native poses'};
  return {record:{...stored,poseSamples:samples},attached:true};
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

export function referenceDriver(target) {
  return CIRCUIT_MANIFESTS.find(row=>row.id===target.eventId)?.driver ??
    {car:REFERENCE_POLICY.car,driverId:REFERENCE_POLICY.driver,controller:'standard',skill:.95};
}

export function startReferenceApp(app, target) {
  const driver = referenceDriver(target);
  const startStage = COURSE.findIndex(definition => definition.id === target.eventId);
  if (startStage < 0) throw Error(`Unknown reference event: ${target.eventId}`);
  const unlock = CIRCUIT_MANIFESTS.find(row => row.id === target.eventId)?.unlock;
  app.profile = {...app.profile, courses: {version: 1, unlocked: COURSE.map(course => course.id)},
    ...(unlock?.kind === 'default-gp-podium' ? {grandPrixPodiums:
      [...new Set([...(app.profile.grandPrixPodiums ?? []), unlock.defaultEventId])]} : {}),
    // A variant found from the air enters through the pilot's map record, as a player's save would hold it.
    ...(unlock?.kind === 'spotted-from-air' ? {heli: {...heliOf(app.profile), map: {version: 1, seen: [], found: [target.eventId], table: false}}} : {})};
  app._saveProfile();
  const options = {startStage, seed: target.seed, mode: 'duel', car: driver.car,
    driverId: driver.driverId, cpuDifficulty: REFERENCE_POLICY.cpu,
    difficulty: 'casual', opponentCount: 0, upgrades: {},
    // A course with snow or ice offers the tyre choice on the setup: the reference drives on winter tyres there.
    ...(courseHasWinterSurfaces(COURSE[startStage]) ? {tyre: 'winter'} : {})};
  if (!app.startCampaign(options)) throw Error(`Reference event would not start: ${target.key}`);
  // Production App intentionally uses 1989 for fixed menu events. CIRCUITS
  // 7b.1 requires layoutSeed for the fixed reference. Restart this disposable
  // Duel through its native API with the validated setup and required seed.
  app.duel.startCampaign(options);
  const state = app.duel.state;
  if (state.seed !== target.seed || state.driverId !== driver.driverId ||
      state.cpuDifficulty !== REFERENCE_POLICY.cpu || Object.values(state.upgrades).some(level => level !== 0))
    throw Error(`Reference setup differs from the fixed policy: ${target.key}`);
  app.autopilot = true;
  app._scriptedCrashDone = true;
  // Claude 11 October: authored roads use the existing circuit driver at its
  // Medium skill. Legacy roads retain the standard App driver unchanged.
  if (app.duel.course.script && app.duel.course.racingLine) useRacingLine(app, driver.skill);
  return {options, fixture: installReferenceFixture(app, target)};
}

export async function buildReferenceRecord(target, {maxSeconds = 720, AppClass, retainPoses = false} = {}) {
  return withReferenceApp(async app => {
    const {fixture} = startReferenceApp(app, target);
    try {
      const {state, course} = app.duel, trace = [];
      const observe = () => trace.push({s: state.s, t: state.stageTimeSec + state.racePenaltySec,
        mph: Math.max(0, state.speedMph), gear: state.gear,
        throttle: state.input.throttle, brake: state.input.brake, lateral: state.lateral,
        heading: state.headingError + (state.slipAngle || 0) + (state.crashSpin || 0), airHeight: state.airHeight,
        groundHeight: state.groundHeight, terrainPitch: state.terrainPitch, terrainRoll: state.terrainRoll, tumble: !!state.tumble});
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
        car: referenceDriver(target).car, driver: referenceDriver(target).driverId, cpu: REFERENCE_POLICY.cpu,
        fixtureVersion: REFERENCE_POLICY.fixtureVersion, ...metrics, ...(retainPoses ? {poseSamples: referencePoseSamples(lap, trace)} : {})};
    } catch (error) {
      throw Error(`${target.key}: ${error.message} (native laps ${app.duel.state.completedLaps}/3, status ${app.duel.state.status})`, {cause: error});
    } finally { fixture.dispose(); }
  }, {AppClass});
}

// Load the production registry only after its supported QA flags are active.
// A separate process avoids cached imports and gives it no real save storage.
export async function runReferenceWorker({targets = referenceTargets(), catalogOnly = false, retainPoses = false, flags = []} = {}) {
  if(!Array.isArray(flags)||flags.some(flag=>flag!=='tyre-slip')) throw Error('Unsupported reference flags.');
  const script = `
    const request = JSON.parse(process.argv[1]), rows = new Map();
    globalThis.__DUEL_QA__ = true;
    globalThis.location = {search: '?flags=' + request.flags.join(',')};
    globalThis.localStorage = {get length(){return rows.size}, key:i=>[...rows.keys()][i]??null,
      getItem:key=>rows.get(String(key))??null, setItem:(key,value)=>rows.set(String(key),String(value)),
      removeItem:key=>rows.delete(String(key)), clear:()=>rows.clear()};
    const recipe = await import(request.recipe);
    const {COURSE} = await import(request.config);
    const {featureFlags} = await import(request.switches);
    const result = request.catalogOnly ? {events:COURSE.map(row=>row.id), storageLength:localStorage.length,
      flags:request.flags.map(name=>({name,state:featureFlags.state(name),enabled:featureFlags.enabled(name)}))}
      : await recipe.buildReferenceSet({targets:request.targets,retainPoses:request.retainPoses});
    process.stdout.write(JSON.stringify(result));
  `;
  const request = {targets, catalogOnly, retainPoses, flags: [...new Set([...ALL_CIRCUITS.map(circuit => circuit.flag), ...flags])],
    recipe: import.meta.url, config: new URL('../src/config.js', import.meta.url).href,
    switches: new URL('../src/feature-flags.js', import.meta.url).href};
  try {
    const {stdout} = await promisify(execFile)(process.execPath,
      ['--input-type=module', '-e', script, JSON.stringify(request)], {maxBuffer: 16 * 1024 * 1024});
    return JSON.parse(stdout);
  } catch (error) {
    const detail = error.stderr?.match(/^Error: (.+)$/m)?.[1] ?? error.message;
    throw Error(`Native reference worker failed: ${detail}`, {cause: error});
  }
}

export async function buildReferenceSet({targets = referenceTargets(), run = buildReferenceRecord, onRecord = () => {}, retainPoses = false, flags = []} = {}) {
  // A course still behind its switch that stands in for a released one (a `slot`) is also built in the worker, where its switch is on.
  const replacedBySwitch = target => ALL_CIRCUITS.some(circuit => circuit.id === target.eventId && COURSE.some(definition => definition.id === circuit.id && definition !== circuit));
  if (run === buildReferenceRecord && (flags.length || targets.some(target => !COURSE.some(definition => definition.id === target.eventId) || replacedBySwitch(target)))) {
    // Reject typos here rather than recursively starting another worker.
    const known = new Set(referenceTargets().map(target => target.eventId));
    const missing = targets.find(target => !known.has(target.eventId));
    if (missing) throw Error(`Unknown reference event: ${missing.eventId}`);
    const records = await runReferenceWorker({targets,retainPoses,flags});
    for (const target of targets) onRecord(target, records[target.key]);
    return records;
  }
  const records = {};
  for (const target of targets) {
    records[target.key] = await run(target,{retainPoses});
    onRecord(target, records[target.key]);
  }
  return records;
}

export function publishReferenceSet(records, {output= new URL('../src/generated/reference-laps/',import.meta.url),
  makeDirectory=mkdirSync,write=writeFileSync,rename=renameSync}={}) {
  const groups=new Map();
  for(const [key,record]of Object.entries(records)) {
    if(key!==`${record.eventId}|${record.route}`)throw Error('Reference record key differs from its event/route.');
    if(!groups.has(record.eventId))groups.set(record.eventId,{});
    groups.get(record.eventId)[key]=record;
  }
  const targets=referenceTargets();
  for(const [id,rows]of groups) {
    const expected=targets.filter(row=>row.eventId===id).map(row=>row.key).sort();
    if(!expected.length||JSON.stringify(Object.keys(rows).sort())!==JSON.stringify(expected))
      throw Error('Reference publish needs every route for '+id);
  }
  makeDirectory(output,{recursive:true});
  for(const [id,rows]of groups) {
    const path=fileURLToPath(new URL(id+'.json',output));
    write(path+'.tmp',JSON.stringify(rows)+'\n');rename(path+'.tmp',path);
  }
  return groups.size;
}

async function main() {
  const args = process.argv.slice(2), event = args.find(arg => arg.startsWith('--event='))?.slice(8);
  const route = args.find(arg => arg.startsWith('--route='))?.slice(8), probe = args.includes('--probe');
  const posesOnly = args.includes('--poses-only');
  const flags=args.find(arg=>arg.startsWith('--flags='))?.slice(8).split(',') ?? [];
  if(flags.length&&!probe) throw Error('Switch-on references need --probe; existing published laps must stay unchanged.');
  if (route && !probe) throw Error('A filtered reference run needs --probe; partial data cannot be published.');
  const targets = referenceTargets().filter(target => (!event || target.eventId === event) && (!route || target.route === route));
  if (!targets.length) throw Error('No reference target matched.');
  const records = await buildReferenceSet({targets,retainPoses:posesOnly,flags,
    onRecord: (target, record) => console.log(`${target.key}: ${record.lapMs} ms, ${record.trace.length} samples, ${record.courseFingerprint}`)});
  if (probe) return;
  if (posesOnly) {
    const retained = {}, changedEvents = new Set();
    for (const target of targets) {
      const result = retainReferencePoses(referenceLap(target.eventId, target.route), records[target.key]);
      if (!result.record) throw Error('Stored reference missing: ' + target.key);
      retained[target.key] = result.record;
      if (result.attached) changedEvents.add(target.eventId);
      console.log(target.key + ': ' + (result.attached ? 'native team poses retained' : 'no team ghost (' + result.reason + ')'));
    }
    const changed = Object.fromEntries(Object.entries(retained).filter(([,row]) => changedEvents.has(row.eventId)));
    if (changedEvents.size) publishReferenceSet(changed);
    console.log('Updated native pose data for ' + changedEvents.size + ' events; stored reference timings unchanged.');
  } else {
    publishReferenceSet(records);
    console.log(`Built ${targets.length} complete reference records.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => { console.error(error.message); process.exitCode = 1; });

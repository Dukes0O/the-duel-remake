import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {racingLineFor, LINE} from '../src/race-lines.js';
import {courseFingerprint} from '../src/track-analysis.js';
import {buildEnvironment, disposeTree} from '../src/world.js';
import {pavedShoulderWidthAt} from '../src/road-surface.js';
import { COURSE, CARS } from '../src/config.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import { createLeaderboardScreen } from '../src/screen-leaderboard.js';
import { App } from '../src/app.js';
import { createFeatureFlags } from '../src/feature-flags.js';
import { installTestDriver } from './race-field-balance.mjs';
import { ownTestCourses } from './career-fixture.mjs';
import { Duel } from '../src/game.js';
import { createProfile, eventKey, isValidFinish } from '../src/progression.js';
import { normalizeRaceSettings } from '../src/race-settings.js';
import { grandPrixCourse, gridPose, courseForGrandPrix } from '../src/race-field.js';
import { createLeaderboard, recordFinish, saveLeaderboard, loadLeaderboard, getLeaderboard } from '../src/leaderboard.js';
import { GrandPrixLapRecorder, createGhostStore, storeGhost, findGhost, normalizeGhostStore, loadGhosts, GHOST_KEY, GhostRecorder, ghostKey, MAX_GHOST_BYTES, MAX_GHOSTS } from '../src/ghost.js';
import { testCourseAccess } from './career-fixture.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
// New GP admission cannot spend the budget by deleting existing Time Trial ghosts.
const storagePlayer = {id: 'storage-fixture', name: 'Storage Driver'};
const storageContext = {playerId: storagePlayer.id, stageIndex: 0, seed: 1989, laps: 2,
  car: 'falcone_f42', mode: 'timetrial', difficulty: 'casual', cpuDifficulty: 'medium'};
const storageRecorder = new GhostRecorder(storageContext);
const storageState = {...storageContext, playerId: storagePlayer.id, driverId: 'club',
  status: 'racing', racePenaltySec: 0, lateral: 0, speedMph: 80};
for (let i = 0; i <= 1200; i++) {
  storageState.stageTimeSec = i / 10; storageState.s = COURSE[0].lengthU * 2 * i / 1200;
  storageRecorder.observe(storageState);
}
const storageTT = storageRecorder.finish({...storageContext, timeSec: 120,
  completed: true, won: true}, storageState, storagePlayer);
check(storageTT, 'capacity fixture is a valid old Time Trial recording');
const byteLength = value => new TextEncoder().encode(JSON.stringify(value)).length;
const storageRows = Array.from({length: MAX_GHOSTS}, (_, i) => {
  const options = {...storageTT, playerId: `prior-${i}`};
  return {...options, key: ghostKey(options.playerId, options), recordedAt: i, lastUsedAt: i};
});
const gpStorage = {...storageTT, mode: 'grandprix', laps: 1,
  raceLength: COURSE[0].lengthU, timeSec: 90, recordedAt: 9999, lastUsedAt: 9999,
  samples: storageTT.samples.map(row => [Math.round(row[0] * .75), Math.round(row[1] / 2), ...row.slice(2)])};
gpStorage.key = ghostKey(gpStorage.playerId, gpStorage);
const oldLayout = {...storageTT, layoutVersion: storageTT.layoutVersion - 1};
oldLayout.key = ghostKey(oldLayout.playerId, oldLayout, oldLayout.layoutVersion, oldLayout.driverSignature);
// Damaged old-layout sample containers cannot hide valid current/archive ghosts.
const legacyWithoutLength = {...oldLayout}; delete legacyWithoutLength.raceLength;
const validMixed = {version: 1, records: [storageTT], archivedRecords: [legacyWithoutLength]};
const validMixedBytes = JSON.stringify(normalizeGhostStore(validMixed));
for (const samples of [{}, 42, 'damaged', true, null]) {
  const damagedLegacy = {...legacyWithoutLength, samples};
  const mixed = {version: 1, records: [storageTT, damagedLegacy], archivedRecords: [legacyWithoutLength]};
  const original = JSON.stringify(mixed);
  const normalized = normalizeGhostStore(mixed);
  equal(JSON.stringify(normalized), validMixedBytes, 'damaged legacy samples retain exact valid current/archive records');
  equal(JSON.stringify(mixed), original, 'damaged legacy rejection never mutates caller bytes');
  const disposableStorage = {getItem: key => key === GHOST_KEY ? original : null};
  equal(JSON.stringify(loadGhosts(disposableStorage)), validMixedBytes,
    'public load keeps valid mixed-store ghosts accessible despite one damaged legacy row');
}
const countStore = normalizeGhostStore({version: 1, records: storageRows, archivedRecords: [oldLayout]});
equal(countStore.archivedRecords.length, 1, 'count fixture retains a valid historical recording');
equal(countStore.records.length, 12, 'count fixture retains all twelve old ghosts');
const countBytes = JSON.stringify(countStore), countAdmission = storeGhost(countStore, gpStorage);
check(!countAdmission.saved && countAdmission.reason === 'capacity', 'thirteenth GP ghost is visibly rejected');
equal(JSON.stringify(countAdmission.store), countBytes, 'GP count rejection retains every old store byte');
const denseSamples = (timeSec, length) => Array.from({length: 1800}, (_, i) =>
  [Math.round(i * timeSec * 1000 / 1799), Math.round(i * length * 100 / 1799),
    17999, 399999, 9999, 4999, 0, 999999, 799999, 799999, 15]);
const byteRows = storageRows.map(row => ({...row, samples: denseSamples(row.timeSec, row.raceLength)}));
const byteRecords = [];
for (const row of byteRows) {
  const candidate = {version: 1, records: [...byteRecords, row], archivedRecords: []};
  if (byteLength(candidate) > MAX_GHOST_BYTES) break;
  byteRecords.push(row);
}
const byteStore = normalizeGhostStore({version: 1, records: byteRecords, archivedRecords: []});
equal(byteStore.records.length, byteRecords.length, 'byte fixture preserves valid old recordings below budget');
const denseGP = {...gpStorage, samples: denseSamples(gpStorage.timeSec, gpStorage.raceLength)};
check(byteStore.records.length < MAX_GHOSTS && byteLength({version: 1,
  records: [...byteStore.records, denseGP], archivedRecords: []}) > MAX_GHOST_BYTES,
  'byte fixture reaches the byte cap before the count cap');
const beforeBytes = JSON.stringify(byteStore), byteAdmission = storeGhost(byteStore, denseGP);
check(!byteAdmission.saved && byteAdmission.reason === 'capacity', 'over-budget GP ghost is visibly rejected');
equal(JSON.stringify(byteAdmission.store), beforeBytes, 'GP byte rejection retains every old store byte');
const sessionApp = {menuStage: 0, getMenuSeed: () => 1989, duel: {state: storageState},
  profile: createProfile(), cpuDifficulty: 'medium', player: storagePlayer,
  ghosts: countStore, grandPrixGhostCandidate: gpStorage};
equal(App.prototype.getGrandPrixGhostRecord.call(sessionApp), gpStorage,
  'session-only GP candidate stays usable for later Team Room query');
check(!App.prototype.getGrandPrixGhostRecord.call(sessionApp, {seed: 42}),
  'session-only GP candidate cannot cross event context');
if (process.argv.includes('--storage-only')) {
  console.log(`Grand Prix storage: ${checks} checks passed.`); process.exit(0);
}

// The authored Harbour four-lap event must remain valid through records and UI.
const priorCourseCount = COURSE.length;
let harbourIndex = COURSE.findIndex(def => def.id === HARBOUR_LIGHTS.id);
if (harbourIndex < 0) harbourIndex = COURSE.push(HARBOUR_LIGHTS) - 1;
const harbourStorageBefore = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const harbourCancelBefore = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
const harbourMemory = new Map();
let harbourApp;
try {
  globalThis.localStorage = {getItem: key => harbourMemory.get(key) ?? null,
    setItem: (key, value) => harbourMemory.set(key, String(value)),
    removeItem: key => harbourMemory.delete(key)};
  globalThis.cancelAnimationFrame ??= () => {};
  const finishContext = {stageIndex: harbourIndex, mode: 'grandprix', completed: true,
    laps: courseForGrandPrix(HARBOUR_LIGHTS).laps, seed: 1989, timeSec: 480,
    car: 'falcone_f42', driverId: 'club', difficulty: 'casual', cpuDifficulty: 'medium'};
  equal(finishContext.laps, 4, 'actual authored Harbour GP asks for four laps');
  check(isValidFinish(finishContext), 'authored Harbour four-lap completion is valid');
  check(!isValidFinish({...finishContext, laps: 3}), 'three laps cannot complete Harbour GP');
  check(!isValidFinish({...finishContext, stageIndex: 0}), 'malformed Pacific four-lap GP cannot finish');
  check(!recordFinish(createLeaderboard(), {...finishContext, stageIndex: 0},
    {id: 'malformed-four', name: 'Malformed Driver'}).recorded,
    'malformed Pacific four-lap GP cannot enter records');
  check(eventKey({stageIndex: harbourIndex, mode: 'grandprix'}).includes('|laps:4|mode:grandprix'),
    'default Harbour GP key derives its authored count');
  harbourApp = new App(); ownTestCourses(harbourApp);
  harbourApp.duel.featureFlags = createFeatureFlags({storage: null, qa: false, search: '',
    overrides: {'grand-prix': true}});
  check(harbourApp.startCampaign({startStage: harbourIndex, mode: 'grandprix', seed: 1989,
    fieldSeed: 1000, car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium'}),
    'native Harbour GP starts in disposable memory');
  harbourApp.autopilot = true; harbourApp._scriptedCrashDone = true; installTestDriver(harbourApp);
  for (let tick = 0; tick < 60000 && ['countdown', 'racing'].includes(harbourApp.duel.state.status); tick++)
    harbourApp.advance(1 / 60, 1 / 60);
  equal(harbourApp.duel.state.completedLaps, 4, 'native legal controls finish all four Harbour laps');
  check(harbourApp.leaderboard.entries.some(row => row.eventId === HARBOUR_LIGHTS.id && row.laps === 4),
    'native Harbour finish records the actual four-lap race');
  const reloaded = loadLeaderboard(globalThis.localStorage);
  check(reloaded.entries.some(row => row.eventId === HARBOUR_LIGHTS.id && row.laps === 4),
    'Harbour record survives memory-only save and reload');
  const harbourScreen = createLeaderboardScreen({app: {leaderboard: reloaded, player: harbourApp.player,
    grandPrixAvailable: () => true, getMenuSeed: () => 1989, getMenuRouteLabel: () => 'Fixed route'},
    boardFilter: {stage: harbourIndex, car: '', driverId: 'club', mode: 'grandprix'},
    escapeHTML: String, credits: String, time: value => `${value} seconds`})();
  check(harbourScreen.includes('4 LAPS') && harbourScreen.includes('All 4 laps count'),
    'Harbour GP record is visible with the actual lap-count description');
  const emptyHarbourScreen = createLeaderboardScreen({app: {leaderboard: createLeaderboard(),
    player: harbourApp.player, grandPrixAvailable: () => true, getMenuSeed: () => 1989,
    getMenuRouteLabel: () => 'Fixed route'}, boardFilter: {stage: harbourIndex, mode: 'grandprix'},
    escapeHTML: String, credits: String, time: String})();
  check(emptyHarbourScreen.includes('Finish all 4 laps'), 'empty Harbour GP board asks for four laps');
} finally {
  harbourApp?.dispose();
  COURSE.length = priorCourseCount;
  if (harbourStorageBefore) Object.defineProperty(globalThis, 'localStorage', harbourStorageBefore);
  else delete globalThis.localStorage;
  if (harbourCancelBefore) Object.defineProperty(globalThis, 'cancelAnimationFrame', harbourCancelBefore);
  else delete globalThis.cancelAnimationFrame;
}
if (process.argv.includes('--harbour-records-only')) {
  console.log(`Authored Grand Prix records: ${checks} checks passed.`); process.exit(0);
}

const ids = ['pacific-canyon', 'high-country', 'harbor-highlands', 'eifel-crown',
  'alpine-serpent', 'azure-riviera', 'red-mesa', 'neon-docks', 'cloudbreak-skyway'];
const profile = { ...createProfile(), courses: testCourseAccess() };
const start = (stageIndex, mode, flag = true, cpuDifficulty = 'medium') => {
  const duel = new Duel({ seed: 1989, featureFlags: { 'grand-prix': flag } });
  duel.startCampaign({ startStage: stageIndex, mode, seed: 1989, fieldSeed: 4242,
    cpuDifficulty, difficulty: 'casual', car: 'falcone_f42' });
  return duel;
};
// Claude check-in5: staging changes only Azure GP's grid, never its lap origin.
const azureIndex = COURSE.findIndex(stage => stage.id === 'azure-riviera');
// Claude check-in7: one immutable GP-only entry patch, every actual width consumer.
const azureDef = COURSE[azureIndex], azureCatalog = JSON.stringify(azureDef);
const widenedDef = courseForGrandPrix(azureDef), baselineAzure = new Course(azureDef, 1989);
check(!!widenedDef.grandPrixEntryWidth && Object.isFrozen(widenedDef.grandPrixEntryWidth), 'GP entry width metadata is immutable');
equal(widenedDef.grandPrixEntryWidth, {start: 225, peak: 260, end: 295, halfWidth: 1},
  'only the approved225-260-295m one-metre-per-edge patch is installed');
equal(widenedDef.fieldFollow, {wallRoom: 1,
  firstLap: {margin: 5, reaction: .5, closeIn: .8, wallRoom: 1.4}},
  'Azure GP reuses only the approved Harbour first-lap gap and wall room');
check(Object.isFrozen(widenedDef.fieldFollow) && Object.isFrozen(widenedDef.fieldFollow.firstLap),
  'Azure GP following metadata and its first-lap overlay are immutable');
check(Object.isFrozen(widenedDef.fieldPace), 'Azure GP difficulty pace overlay is immutable');
const widenedAzure = new Course(widenedDef, 1989);
equal(widenedAzure.samples, baselineAzure.samples, 'GP entry width cannot change actual road center or elevation');
for (const [s, extra] of [[224, 0], [225, 0], [242.5, .5], [260, 1], [277.5, .5], [295, 0], [296, 0]]) {
  equal(widenedAzure.roadHalfWidthAt(s), baselineAzure.roadHalfWidthAt(s) + extra, 'actual entry width at' + s);
  equal(widenedAzure.roadHalfWidthAt(s + widenedAzure.length), widenedAzure.roadHalfWidthAt(s), 'width repeats at lap seam');
  equal(pavedShoulderWidthAt(widenedAzure, s), widenedAzure.roadHalfWidthAt(s), 'actual shoulder uses identical GP width');
}
for (let s = 0; s < widenedAzure.length; s += 5) {
  const increase = widenedAzure.roadHalfWidthAt(s) - baselineAzure.roadHalfWidthAt(s);
  check(increase >= 0 && increase <= 1, 'GP widening never narrows or exceeds one metre per edge');
  if (s <= 225 || s >= 295) equal(increase, 0, 'GP widening stays strictly inside approved entry');
}
const increaseAt = s => widenedAzure.roadHalfWidthAt(s) - baselineAzure.roadHalfWidthAt(s);
for (const boundary of [225, 260, 295]) {
  check(Math.abs(increaseAt(boundary + .001) - increaseAt(boundary)) / .001 < .000003,
    'entry taper meets each boundary with smooth zero slope');
  check(Math.abs(increaseAt(boundary) - increaseAt(boundary - .001)) / .001 < .000003,
    'entry taper has the same smooth incoming slope');
}
for (const side of [-1, 1]) {
  const offset = side * (baselineAzure.roadHalfWidthAt(260) + .5);
  check(!baselineAzure.surfaceAt(260, offset).road && widenedAzure.surfaceAt(260, offset).road,
    'actual road surface admits only the newly widened entry on both sides');
}
const widenedLine = racingLineFor(widenedAzure);
for (let i = 0; i < widenedLine.count; i++) {
  check(Math.abs(widenedLine.offset[i]) <= widenedAzure.roadHalfWidthAt(i * widenedLine.step) - LINE.margin + 1e-9,
    'actual shared racing line stays inside its widened road margin');
}
check(Array.from(widenedLine.offset).some((value, i) => value !== racingLineFor(baselineAzure).offset[i]),
  'native racing line actually consumes the extra entry room');
check(courseFingerprint(widenedAzure) !== courseFingerprint(baselineAzure),
  'GP width changes its actual geometry fingerprint honestly');
equal(JSON.stringify(azureDef), azureCatalog, 'GP wrapper preserves frozen Azure catalog bytes');
for (const def of COURSE.filter(def => grandPrixCourse(def) && def.id !== 'azure-riviera')) {
  const gpDef = courseForGrandPrix(def);
  check(!gpDef.grandPrixEntryWidth, 'other GP courses have no Azure width metadata');
  equal(gpDef.fieldFollow, def.fieldFollow, 'other GP courses retain their authored following defaults');
  const legacy = new Course(def, 1989), gp = new Course(gpDef, 1989);
  for (const s of [0, 225, 260, 295, legacy.length - 1])
    equal(gp.roadHalfWidthAt(s), legacy.roadHalfWidthAt(s), 'other GP widths remain exact');
}
for (const mode of ['duel', 'timetrial']) {
  const legacy = start(azureIndex, mode);
  check(!legacy.course.def.grandPrixEntryWidth, mode + ': Azure has no GP patch');
  equal(legacy.course.def.fieldFollow, azureDef.fieldFollow, mode + ': Azure following defaults remain exact');
  equal(legacy.course.def.fieldPace, azureDef.fieldPace, mode + ': GP pace cannot leak into legacy mode');
  equal(legacy.course.def.fieldAggression, azureDef.fieldAggression, mode + ': GP aggression cannot leak into legacy mode');
  for (const s of [225, 242.5, 260, 277.5, 295])
    equal(legacy.course.roadHalfWidthAt(s), baselineAzure.roadHalfWidthAt(s), mode + ': width remains exact');
}
// Real world mesh/shader construction in the existing headless texture fixture.
// These disposable textures are unit-test inputs, never native art evidence.
const originalLoad = THREE.TextureLoader.prototype.load, originalDocument = globalThis.document;
const canvasContext = new Proxy({createImageData: (w, h) => ({data: new Uint8ClampedArray(w * h * 4)}),
  measureText: () => ({width: 40}), createLinearGradient: () => ({addColorStop() {}})},
  {get: (target, key) => target[key] ?? (() => {})});
let widthWorld;
try {
  THREE.TextureLoader.prototype.load = () => new THREE.Texture();
  globalThis.document = {createElement: () => ({getContext: () => canvasContext})};
  widthWorld = buildEnvironment(widenedAzure);
  const shoulders = widthWorld.children.filter(node => node.material?.name === 'Textured paved-road shoulder');
  equal(shoulders.length, 2, 'actual world constructs both widened shoulders');
  for (const mesh of shoulders) {
    const edge = mesh.geometry.attributes.shoulderEdge, uv = mesh.geometry.attributes.uv;
    check(edge && edge.count === uv.count, 'actual GP shoulder has a road-edge attribute for every vertex');
    for (let i = 0; i < uv.count; i++)
      check(Math.abs(edge.getX(i) - widenedAzure.roadHalfWidthAt(uv.getY(i) * 10)) < .00003,
        'actual shoulder vertices retain the shared width across passing lanes and GP entry');
    const shader = {uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <map_fragment>'};
    mesh.material.onBeforeCompile(shader);
    check(shader.vertexShader.includes('attribute float shoulderEdge;') &&
      shader.vertexShader.includes('shoulderWidth=shoulderEdge'), 'actual GP shoulder shader reads its real edge');
    check(!shader.vertexShader.includes('shoulderWidth+=3.5'), 'GP vertex width never double-adds passing lanes');
  }
} finally {
  if (widthWorld) disposeTree(widthWorld);
  THREE.TextureLoader.prototype.load = originalLoad;
  if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
}
// Explicit staged policy, not rejection as an accidental malformed recording.
const entryPlayer = {id: 'entry-ghost', name: 'Entry Driver'};
const entryContext = {...storageContext, playerId: entryPlayer.id, stageIndex: azureIndex, mode: 'grandprix', laps: 1};
const stagedRecorder = new GrandPrixLapRecorder(entryContext, azureDef.lengthU);
const stagedState = {...entryContext, driverId: 'club', status: 'racing', stageTimeSec: 0,
  racePenaltySec: 0, s: -426, lateral: 2.6, speedMph: 80};
stagedRecorder.observe(stagedState);
check(stagedRecorder.stagedFirstLap, 'actual initial Azure setback is explicitly classified as staged');
for (let tick = 1; tick <= 1000; tick++) {
  stagedState.stageTimeSec = tick / 10; stagedState.s = -426 + (azureDef.lengthU + 426) * tick / 1000;
  stagedRecorder.observe(stagedState);
}
stagedState.lapStartedAt = 100;
check(!stagedRecorder.recorder.invalid, 'honest staged recording stays clean and bounded');
equal(stagedRecorder.recorder.samples[0][1], -42600, 'staged capture keeps its actual initial position');
equal(stagedRecorder.complete(stagedState, {lapCompleted: 1, lapTimeSec: 100, assisted: false}, entryPlayer), null,
  'staged first lap alone deliberately has no best-lap ghost');
equal(stagedRecorder.startedAt, 100, 'staged first lap crossing time is preserved');
check(!stagedRecorder.stagedFirstLap, 'staged policy ends at the actual first crossing');
for (let tick = 1; tick <= 800; tick++) {
  stagedState.stageTimeSec = 100 + tick / 10; stagedState.s = azureDef.lengthU + azureDef.lengthU * tick / 800;
  stagedRecorder.observe(stagedState);
}
stagedState.lapStartedAt = 180;
const entryFlying = stagedRecorder.complete(stagedState, {lapCompleted: 2, lapTimeSec: 80, assisted: false}, entryPlayer);
check(entryFlying && entryFlying.timeSec === 80, 'later clean Azure flying lap retains its original ghost');
equal(entryFlying.samples[0].slice(0, 2), [0, 0], 'later Azure capture starts at the original line');
for (let tick = 1; tick <= 700; tick++) {
  stagedState.stageTimeSec = 180 + tick / 10; stagedState.s = 2 * azureDef.lengthU + azureDef.lengthU * tick / 700;
  stagedRecorder.observe(stagedState);
}
stagedState.lapStartedAt = 250;
const entryThird = stagedRecorder.complete(stagedState, {lapCompleted: 3, lapTimeSec: 70, assisted: false}, entryPlayer);
check(entryThird && entryThird.timeSec === 70, 'third clean Azure lap also retains its own flying ghost');
equal(entryThird.samples[0].slice(0, 2), [0, 0], 'third lap keeps the original timing-line origin');
check(!findGhost(storeGhost(createGhostStore(), entryThird).store, 'other-player', entryContext),
  'the later flying ghost remains isolated to its actual player');
const nonstaged = new GrandPrixLapRecorder(entryContext, azureDef.lengthU);
nonstaged.observe({...stagedState, s: -26, stageTimeSec: 0});
check(!nonstaged.stagedFirstLap, 'ordinary Azure grid capture is not excluded by course id alone');
const normalState = {...stagedState, s: -26, stageTimeSec: 0};
for (let tick = 1; tick <= 900; tick++) {
  normalState.stageTimeSec = tick / 10; normalState.s = -26 + (azureDef.lengthU + 26) * tick / 900;
  nonstaged.observe(normalState);
}
normalState.lapStartedAt = 90;
check(nonstaged.complete(normalState, {lapCompleted: 1, lapTimeSec: 90, assisted: false}, entryPlayer),
  'an unstaged Azure first lap remains eligible under original admission guards');
const unrelated = new GrandPrixLapRecorder({...entryContext, stageIndex: 0}, COURSE[0].lengthU);
unrelated.observe({...stagedState, stageIndex: 0, s: -426, stageTimeSec: 0});
check(!unrelated.stagedFirstLap, 'other courses cannot acquire the Azure staged policy');
if (process.argv.includes('--entry-focused')) {
  console.log('GP entry width/ghost: ' + checks + ' checks passed.'); process.exit(0);
}
for (const cpu of ['easy', 'medium', 'hard']) {
  const duel = start(azureIndex, 'grandprix', true, cpu), state = duel.state;
  const actors = [{actor: state, slot: state.field.playerSlot},
    ...state.opponents.map(actor => ({actor, slot: actor.field.slot}))].sort((a, b) => a.slot - b.slot);
  equal(actors.map(({actor}) => [actor.s, actor.lateral]),
    Array.from({length: 8}, (_, slot) => {const pose = gridPose(slot);return [pose.s - 400, pose.lateral];}),
    `${cpu}: all eight Azure GP racers stage400m before the old grid`);
  equal(state.prevS, state.s, `${cpu}: player previous position starts at the staged grid`);
  for (const {actor} of actors) {
    const frame = duel.course.at(actor.s);
    check(Number.isFinite(frame.x) && Number.isFinite(frame.z), `${cpu}: actual staged road position is finite`);
    check(Math.abs(actor.lateral) + (CARS[actor.car].collision?.halfWidth ?? 1.1) <
      duel.course.roadHalfWidthAt(actor.s), `${cpu}: actual staged vehicle fits the road`);
  }
  const oldPlayer = gridPose(state.field.playerSlot);
  equal(duel.course.length - state.s, duel.course.length - oldPlayer.s + 400,
    `${cpu}: only first lap gains400m of starting travel`);
  equal(duel._lapGates, [.25, .5, .75].map(part => part * duel.course.length),
    `${cpu}: timing gates keep the old zero origin`);
  const line = duel.course.worldAt(0), legacy = start(azureIndex, 'timetrial');
  equal(line, legacy.course.worldAt(0), `${cpu}: visible course line remains the old physical zero`);
  // Exercise native admission on either side of the unchanged finish threshold.
  Object.assign(state, {status: 'racing', stageTimeSec: 100, speedMph: 80,
    prevS: duel.course.length - .1, s: duel.course.length + .1,
    prevLateral: 0, lateral: 0, nextLapGate: duel._lapGates.length});
  duel._advanceLaps(state, 1 / 60);
  equal(state.completedLaps, 1, `${cpu}: native lap admission still crosses the old zero line`);
  Object.assign(state, {stageTimeSec: 200, prevS: duel.course.length * 2 - .2,
    s: duel.course.length * 2 - .1, nextLapGate: duel._lapGates.length});
  duel._advanceLaps(state, 1 / 60);
  equal(state.completedLaps, 1, `${cpu}: lap two waits for exactly one circuit after the old line`);
  state.prevS = state.s;state.s = duel.course.length * 2 + .1;
  duel._advanceLaps(state, 1 / 60);
  equal(state.completedLaps, 2, `${cpu}: following lap finishes at the unchanged next line`);
}
for (const id of ids.filter(id => id !== 'azure-riviera')) {
  const state = start(COURSE.findIndex(stage => stage.id === id), 'grandprix').state;
  equal([state.s, state.lateral], Object.values(gridPose(state.field.playerSlot)), `${id}: player grid remains exact`);
  for (const actor of state.opponents) equal([actor.s, actor.lateral], Object.values(gridPose(actor.field.slot)),
    `${id}: computer grid remains exact`);
}
for (const mode of ['duel', 'timetrial']) {
  const duel = start(azureIndex, mode);
  equal([duel.state.s, duel.state.lateral, duel.state.lapsTotal], [0, 0, 2], `${mode}: Azure start and laps remain exact`);
  equal(duel.state.field, undefined, `${mode}: no Grand Prix staging field`);
}
if (process.argv.includes('--grid-only')) {
  console.log(`Grand Prix grid regression: ${checks} checks passed.`);process.exit(0);
}

for (const id of ids) {
  const index = COURSE.findIndex(stage => stage.id === id), stage = COURSE[index];
  check(grandPrixCourse(stage), `${id} offers Grand Prix`);
  equal(normalizeRaceSettings({ eventId: id, mode: 'grandprix' }, profile).mode, 'grandprix', `${id}: preference round trip`);
  const duel = start(index, 'grandprix'), state = duel.state;
  equal([state.mode, state.field?.size, state.opponents.length, state.lapsTotal],
    ['grandprix', 8, 7, 3], `${id}: full field and three laps`);
  equal([state.traffic.length, duel.course.features.radarTraps.length, !!state.police.pursuit,
    state.police.triggered], [0, 0, false, false], `${id}: pure race`);
  for (let slot = 0; slot < 8; slot++) {
    const pose = gridPose(slot), frame = duel.course.at(pose.s);
    check(Number.isFinite(frame.x) && Number.isFinite(frame.z), `${id}: slot ${slot} has a finite road position`);
    check(Math.abs(pose.lateral) + (CARS.falcone_f42.collision?.halfWidth ?? 1.1) < duel.course.roadHalfWidthAt(pose.s), `${id}: grid slot fits`);
  }
  for (const mode of ['duel', 'timetrial', 'wasteland']) {
    const off = start(index, mode, false), on = start(index, mode);
    off.setInput({ throttle: 1 }); on.setInput({ throttle: 1 });
    for (let tick = 0; tick < 360; tick++) { off.step(1 / 60); on.step(1 / 60); }
    equal(on.state, off.state, `${id}: ${mode} remains exact with Grand Prix enabled`);
  }
  equal(start(index, 'grandprix', false).state.mode, 'duel', `${id}: switch gates the mode`);
}
for (const stage of COURSE.filter(stage => !ids.includes(stage.id) && stage.stage < 16)) {
  check(!grandPrixCourse(stage), `${stage.id}: objective and off-road events excluded`);
}

const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)) };
const player = { id: 'test-player', name: 'Test Driver' };
const base = { stageIndex: 0, completed: true, won: true, seed: 1989,
  timeSec: 120, laps: 2, car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium' };
const grand = { ...base, mode: 'grandprix', laps: 3, timeSec: 180 };
check(isValidFinish(grand), 'three-lap Grand Prix finish is valid');
check(!isValidFinish({ ...grand, laps: 2 }), 'two laps cannot complete Grand Prix');
const duelKey = eventKey({ ...base, mode: 'duel' });
equal(duelKey, 'pacific-canyon|layout:4|seed:1989|laps:2', 'existing event key stays exact');
check(eventKey(grand) !== eventKey({ ...grand, mode: 'duel' }), 'Grand Prix key is separate even at the same lap count');
let board = createLeaderboard();
for (const row of [{ ...base, mode: 'duel' }, { ...base, mode: 'timetrial', timeSec: 115 }, grand]) {
  const added = recordFinish(board, row, player);
  check(added.recorded, `${row.mode} finish records independently`); board = added.board;
}
equal(board.entries.length, 3, 'all three modes coexist');
check(saveLeaderboard(board, storage), 'memory-only leaderboard save');
board = loadLeaderboard(storage);
equal(board.entries.length, 3, 'all mode records survive reload');
for (const mode of ['duel', 'timetrial', 'grandprix']) {
  const rows = getLeaderboard(board, { eventId: COURSE[0].id, mode });
  equal(rows.map(row => row.mode), [mode], `${mode} query cannot mix modes`);
}
console.log(`Existing Grand Prix: ${checks} eligibility, grid, legacy replay and per-mode record checks passed.`);

const boardFilter = {stage: 0, car: '', driverId: 'club', mode: 'grandprix'};
const screen = createLeaderboardScreen({app: {leaderboard: board, player,
  grandPrixAvailable: () => true, getMenuSeed: () => 1989, getMenuRouteLabel: () => 'Route A'},
  boardFilter, escapeHTML: value => String(value), credits: value => String(value),
  time: value => `${value} seconds`});
check(screen().includes('180 seconds') && screen().includes('GRAND PRIX'), 'GP score filter shows actual own three-lap record');
check(!screen().includes('115 seconds'), 'GP score filter keeps Time Trial times separate');
boardFilter.mode = '';
check(screen().includes('115 seconds') && !screen().includes('180 seconds'), 'default All existing modes keeps original two-lap event key');

const context = { playerId: player.id, stageIndex: 0, seed: 1989, laps: 1,
  car: 'falcone_f42', mode: 'grandprix', difficulty: 'casual', cpuDifficulty: 'medium' };
const recorder = new GrandPrixLapRecorder(context, 4000);
const state = { ...context, status: 'racing', driverId: 'club', stageTimeSec: 0,
  racePenaltySec: 0, s: -26, lateral: 2.6, headingError: 0, slipAngle: 0,
  crashSpin: 0, airHeight: 0, speedMph: 80 };
recorder.observe(state);
for (let tick = 1; tick <= 900; tick++) {
  state.stageTimeSec = tick / 10; state.s = -26 + 4026 * tick / 900;
  recorder.observe(state);
}
state.s = 4000.1; state.stageTimeSec = 90.01; state.lapStartedAt = 90;
const lap = recorder.complete(state, { lapCompleted: 1, lapTimeSec: 90, assisted: false }, player);
check(lap && lap.mode === 'grandprix' && lap.laps === 1, 'native first GP lap creates a separate best-lap ghost');
equal(lap.samples[0][1], -2600, 'grid start is retained honestly');
equal(lap.samples.at(-1)[1], 400000, 'native crossing ends at the line');
let ghosts = storeGhost(createGhostStore(), lap).store;
check(findGhost(ghosts, player.id, context), 'GP best lap can feed Team Room');
check(!findGhost(ghosts, player.id, { ...context, mode: 'timetrial', laps: 2 }), 'TT cannot load GP best lap');
equal(normalizeGhostStore(ghosts).records.length, 1, 'GP best lap survives normalization');
for (let tick = 1; tick <= 800; tick++) {
  state.stageTimeSec = 90 + tick / 10; state.s = 4000 + 4000 * tick / 800;
  recorder.observe(state);
}
state.stageTimeSec = 170.01; state.s = 8000.1; state.lapStartedAt = 170;
const second = recorder.complete(state, { lapCompleted: 2, lapTimeSec: 80, assisted: false }, player);
check(second && second.timeSec === 80, 'flying second lap uses only its own clock');
equal(second.samples[0].slice(0, 2), [0, 0], 'flying lap starts on its actual prior crossing');
check(storeGhost(ghosts, second).saved, 'quicker lap replaces GP mode best');
check(!recorder.complete(state, { qualifyingLap: true, lapCompleted: 3, lapTimeSec: 80 }, player), 'qualifying laps stay outside GP best');
console.log(`Existing Grand Prix: ${checks} checks including best-lap ghosts passed.`);

// Real input, lap admission and App writes in disposable memory.
const priorStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const priorCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
let app;
try {
  globalThis.localStorage = storage;
  globalThis.cancelAnimationFrame ??= () => {};
  app = new App(); ownTestCourses(app);
  app.duel.featureFlags = createFeatureFlags({storage: null, qa: false, search: '', overrides: {'grand-prix': true}});
  const wallet = app.profile.credits;
  app.startCampaign({startStage: 0, seed: 1989, fieldSeed: 4242, mode: 'grandprix',
    car: 'falcone_f42', cpuDifficulty: 'medium', difficulty: 'casual'});
  app.autopilot = true; app._scriptedCrashDone = true; installTestDriver(app);
  for (let tick = 0; tick < 24000 && ['countdown', 'racing'].includes(app.duel.state.status); tick++)
    app.advance(1 / 60, 1 / 60);
  check(app.duel.state.results?.completed, 'native App finishes three-lap GP');
  equal(app.profile.credits, wallet, 'GP records do not settle pay or loss charges');
  check(app.leaderboard.entries.some(row => row.mode === 'grandprix' && row.laps === 3), 'native finish records GP');
  check(app.ghosts.records.some(row => row.mode === 'grandprix' && row.laps === 1), 'native admitted lap saves own GP ghost');
  check(!app.ghostPose && app.ghostStatus === 'none', 'GP never displays a ghost among the field');
  app.returnToMenu();
  check(!app.grandPrixLapRecorder, 'menu clears unfinished lap recording');
  // Actual Azure input-driven crossings distinguish staging from a flying lap.
  if (process.argv.includes('--azure-ghost-only')) {
    app.dispose();app = new App();ownTestCourses(app);
    app.duel.featureFlags = createFeatureFlags({storage: null, qa: false, search: '',
      overrides: {'grand-prix': true}});
    check(app.startCampaign({startStage: azureIndex, seed: 1989, fieldSeed: 1000,
      mode: 'grandprix', car: 'falcone_f42', cpuDifficulty: 'medium', difficulty: 'casual'}),
      'real Azure GP starts in disposable memory');
    app.autopilot = true;app._scriptedCrashDone = true;installTestDriver(app);
    const stagedS = app.duel.state.s, nativeLaps = [];
    let priorRecorderInvalid = false, firstSampleS = null, previousLapClock = 0;
    const stopObserving = app.duel.onChange((live, event) => {
      if (!event.lapCompleted) return;
      const saved = app.ghosts.records.find(row => row.mode === 'grandprix' && row.eventId === 'azure-riviera');
      nativeLaps.push({lap: event.lapCompleted, seconds: event.lapTimeSec,
        exactSeconds: live.lapStartedAt - previousLapClock,
        assisted: event.assisted, recorderInvalid: priorRecorderInvalid,
        savedStart: saved?.samples[0][1] ?? null, savedSeconds: saved?.timeSec ?? null});
      previousLapClock = live.lapStartedAt;
    });
    try {
      for (let tick = 0; tick < 24000 && ['countdown', 'racing'].includes(app.duel.state.status) &&
          nativeLaps.length < 2; tick++) {
        const capture = app.grandPrixLapRecorder?.recorder;
        priorRecorderInvalid = capture?.invalid ?? false;
        if (!nativeLaps.length && capture?.samples.length) firstSampleS ??= capture.samples[0][1];
        app.advance(1 / 60, 1 / 60);
      }
      equal(nativeLaps.length, 2, 'two genuine Azure lap crossings reach the real recorder');
      equal(firstSampleS, Math.round(stagedS * 100), 'the first capture honestly starts on the staged grid');
      check(firstSampleS < -4000, 'staging exceeds the unchanged40m GP admission bound');
      check(!nativeLaps[0].assisted && !nativeLaps[0].recorderInvalid,
        'first lap exclusion is independent of assistance or malformed capture');
      equal(nativeLaps[0].savedStart, null, 'the longer staged lap is excluded by current ghost admission');
      equal(app.duel.state.lapTimes[0], nativeLaps[0].seconds, 'the first actual lap time is retained');
      check(!nativeLaps[1].assisted && !nativeLaps[1].recorderInvalid,
        'the next genuine flying lap is clean');
      equal(nativeLaps[1].savedStart, 0, 'the real flying lap saves from the old timing line');
      equal(nativeLaps[1].savedSeconds, nativeLaps[1].exactSeconds, 'saved flying lap uses its actual unrounded crossing clocks');
      equal(+nativeLaps[1].exactSeconds.toFixed(3), nativeLaps[1].seconds, 'native lap event retains its exact millisecond-rounding contract');
      console.log('Azure actual recorder witness:', JSON.stringify({stagedS, firstSampleS, nativeLaps}));
    } finally { stopObserving(); }
    app.returnToMenu();
  }
} finally {
  app?.dispose();
  if (priorStorage) Object.defineProperty(globalThis, 'localStorage', priorStorage); else delete globalThis.localStorage;
  if (priorCancel) Object.defineProperty(globalThis, 'cancelAnimationFrame', priorCancel); else delete globalThis.cancelAnimationFrame;
}
console.log(`Existing Grand Prix: ${checks} checks including native App records passed.`);

import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {createProfile, normalizeProfile, settleRace, stageEventId, PLAYERS_KEY, loadPlayers, activePlayer} from '../src/progression.js';
import {needsCareerMigration, backupBeforeMigration, captureCareer} from '../src/career-backup.js';

// Synthetic storage only. No browser origin or real save is read.
const values = new Map();
const storage = {getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key)};
globalThis.localStorage = storage;
globalThis.cancelAnimationFrame = () => {};
let checks = 0;
const failures = [];
async function check(name, run) {
  checks++;
  try { await run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
const historyRow = (key, changes = {}) => ({key, eventId: stageEventId(0), won: false,
  completed: true, timeSec: 180, reward: 0, car: 'falcone_f42', ...changes});
const finish = (runId, changes = {}) => ({runId, stageIndex: 0, won: false, completed: true,
  timeSec: 180, laps: 2, car: 'falcone_f42', mode: 'timetrial', seed: 1989,
  difficulty: 'casual', cpuDifficulty: 'medium', ...changes});
function makeApp() {
  values.clear();
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'hidden-road': true}});
  return app;
}
function start(app) {
  app.startCampaign({startStage: 0, mode: 'timetrial', seed: 1989, car: 'falcone_f42', difficulty: 'casual'});
  app.advance(3.1);
  Object.assign(app.duel.state, {traffic: [], opponents: [], rival: null});
}
function place(app, progress) {
  const duel = app.duel, p = duel.course.hiddenRoad.poseAt(progress);
  const angle = p.heading - duel.course.at(p.s).heading;
  Object.assign(duel.state, {s: p.s, prevS: p.s, lateral: p.lateral, prevLateral: p.lateral,
    speedMph: 35, headingError: Math.atan2(Math.sin(angle), Math.cos(angle)), slipAngle: 0,
    yawVelocity: 0, groundHeight: p.y, airHeight: 0, airborne: false, impactTimer: 0});
}
function invitation(app) {
  place(app, 151); app.advance(.02);
  assert.equal(app.duel.state.status, 'exploring');
  place(app, app.duel.course.hiddenRoad.length - 59);
  for (let i = 0; i < 1200 && app.duel.state.hiddenRoadJourney.phase !== 'choice'; i++) app.advance(1 / 120);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'choice');
}
function discover(app) {
  app.profile.wasteland.discoveredGate = true;
  app._saveProfile();
}

await check('strict additive fields preserve unknown Wasteland data and future versions', () => {
  const unknown = {owner: 'future feature', numbers: [1, 2]};
  const normalized = normalizeWasteland({version: 1, discoveredGate: 'true', pacificFinishes: 1.5, unknown});
  assert.equal(normalized.discoveredGate, false);
  assert.equal(normalized.pacificFinishes, 0);
  assert.deepEqual(normalized.unknown, unknown);
  assert.equal(normalizeWasteland({discoveredGate: true, pacificFinishes: 90}).pacificFinishes, 10);
  assert.equal(normalizeWasteland({pacificFinishes: -2}).pacificFinishes, 0);
  const future = {version: 8, discoveredGate: 'future', pacificFinishes: {opaque: true}, unknown};
  assert.deepEqual(normalizeWasteland(future), future);
});
await check('history migration counts distinct valid completed Pacific wins and losses only', () => {
  const profile = createProfile();
  delete profile.wasteland.pacificFinishes;
  profile.history = [historyRow('win', {won: true}), historyRow('loss'), historyRow('loss'),
    historyRow('quit', {abandoned: true}), historyRow('timeout', {completed: false}),
    historyRow('wrong', {eventId: stageEventId(1)}), historyRow('bad-time', {timeSec: NaN})];
  assert.equal(normalizeProfile(profile).wasteland.pacificFinishes, 2);
  profile.wasteland.pacificFinishes = 7;
  assert.equal(normalizeProfile(profile).wasteland.pacificFinishes, 7, 'valid saved count outranks retained history');
});
await check('missing additive fields trigger verified pre-write backup; backup failure leaves bytes intact', async () => {
  values.clear();
  const profile = createProfile();
  delete profile.wasteland.discoveredGate; delete profile.wasteland.pacificFinishes;
  storage.setItem(PLAYERS_KEY, JSON.stringify({version: 2, activePlayerId: 'test', players: [{id: 'test', name: 'Test', profile: {...profile, raceSettings: {}}}]}));
  const before = captureCareer(storage), records = new Map();
  assert.equal(needsCareerMigration(storage), true);
  const copy = await backupBeforeMigration(storage, {async save(record) {records.set(record.id, structuredClone(record));}, async load(id) {return records.get(id);}});
  assert.deepEqual(copy.entries, before);
  assert.deepEqual(captureCareer(storage), before);
  await assert.rejects(backupBeforeMigration(storage, {async save() {throw new Error('backup blocked');}, async load() {return null;}}));
  assert.deepEqual(captureCareer(storage), before);
});
await check('completed races count once, saturate at ten, and exclude abandoned/timeouts/other courses', () => {
  let profile = createProfile();
  for (let i = 0; i < 12; i++) {
    const result = finish(`complete-${i}`, {won: i % 2 === 0});
    profile = settleRace(profile, result).profile;
    const once = profile.wasteland.pacificFinishes;
    profile = settleRace(profile, result).profile;
    assert.equal(profile.wasteland.pacificFinishes, once);
    assert.equal(once, Math.min(i + 1, 10));
  }
  for (const changes of [{abandoned: true}, {completed: false}, {stageIndex: 1}]) {
    const before = createProfile();
    const after = settleRace(before, finish('excluded', changes)).profile;
    assert.equal(after.wasteland.pacificFinishes, 0);
  }
});
await check('actual invitation discovers before Turn back; persists after reload without bank changes', () => {
  const app = makeApp(); start(app);
  const credits = app.profile.credits;
  invitation(app);
  assert.equal(app.profile.wasteland.discoveredGate, true);
  assert.equal(app.getHiddenRoadDiscovery().discoveredGate, true);
  assert.equal(app.chooseHiddenRoad('turn-back'), true); app.advance(.1);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'turned-back');
  assert.equal(app.profile.credits, credits);
  assert.equal(activePlayer(loadPlayers()).profile.wasteland.discoveredGate, true);
  app.returnToMenu(); app.dispose();
  const reloaded = new App();
  assert.equal(reloaded.profile.wasteland.discoveredGate, true); reloaded.dispose();
});
await check('discovery rejects unearned, stale, wrong-player and flag-off callbacks; duplicates do not write', () => {
  const app = makeApp(); start(app);
  assert.equal(typeof app._discoverHiddenRoadGate, 'function');
  const original = app.duel.state;
  const event = {journeyId: original.hiddenRoadJourney.id, phase: 'choice'};
  assert.equal(app._discoverHiddenRoadGate(event, original), false);
  invitation(app);
  let writes = 0; const save = app._saveProfile.bind(app); app._saveProfile = () => {writes++; return save();};
  assert.equal(app._discoverHiddenRoadGate(event, original), false);
  assert.equal(writes, 0);
  app.returnToMenu(); app.addPlayer('Separate driver'); start(app);
  const current = app.duel.state;
  const before = structuredClone(app.profile);
  assert.equal(app._discoverHiddenRoadGate(event, original), false);
  assert.equal(app._discoverHiddenRoadGate({journeyId: -1, phase: 'choice'}, current), false);
  assert.deepEqual(app.profile, before);
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'hidden-road': false}});
  assert.equal(app._discoverHiddenRoadGate(event, original), false);
  app.dispose();
});
await check('named-player discovery snapshots stay isolated and immutable', () => {
  const app = makeApp(); discover(app);
  const firstId = app.player.id, first = app.getHiddenRoadDiscovery();
  assert.ok(Object.isFrozen(first)); assert.equal(first.discoveredGate, true);
  app.addPlayer('No discovery');
  const second = app.getHiddenRoadDiscovery();
  assert.equal(second.discoveredGate, false); assert.notEqual(second.playerId, firstId);
  assert.equal(first.discoveredGate, true);
  app.selectPlayer(firstId); assert.equal(app.getHiddenRoadDiscovery().discoveredGate, true);
  app.dispose();
});
await check('direct visit, restart and interrupted menu preserve the complete saved profile and records', () => {
  const app = makeApp(); discover(app);
  const before = structuredClone(app.profile), records = structuredClone(app.leaderboard), ghosts = structuredClone(app.ghosts);
  assert.equal(typeof app.visitWasteland, 'function');
  assert.equal(app.visitWasteland(), true);
  assert.equal(app.duel.state.status, 'exploring');
  assert.ok(app.duel.state.hiddenRoadVisit);
  assert.equal(app.runId == null, true); assert.equal(app.ghostRecorder == null, true);
  assert.equal(app.profile.activeRace, null);
  app.advance(1); app.restart(); app.advance(8);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'arrived');
  assert.deepEqual(app.profile, before); assert.deepEqual(app.leaderboard, records); assert.deepEqual(app.ghosts, ghosts);
  app.returnToMenu(); assert.equal(app.duel.state.status, 'menu');
  assert.equal(app.duel.state.hiddenRoadVisit == null, true);
  assert.deepEqual(app.profile, before); app.dispose();
});
await check('direct visit rejects undiscovered, flag-off and in-race entry', () => {
  const app = makeApp(); assert.equal(typeof app.visitWasteland, 'function');
  assert.equal(app.visitWasteland(), false); discover(app);
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'hidden-road': false}});
  assert.equal(app.visitWasteland(), false);
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'hidden-road': true}});
  start(app); assert.equal(app.visitWasteland(), false); app.dispose();
});
await check('discovered scenic driver gets safe takeover and automatic passage without invitation', () => {
  const app = makeApp(); discover(app); start(app);
  const phases = []; app.duel.onChange((_state, event) => {if (event.hiddenRoadPhase) phases.push(event.hiddenRoadPhase.phase);});
  place(app, 151); app.advance(.02); place(app, app.duel.course.hiddenRoad.length - 59);
  app.advance(12);
  assert.equal(app.duel.state.hiddenRoadJourney.phase, 'arrived');
  assert.ok(phases.includes('arriving') && phases.includes('opening') && phases.includes('entering'));
  assert.equal(phases.includes('choice'), false);
  assert.equal(app.profile.wasteland.discoveredGate, true); app.dispose();
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Hidden Road discovery: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;

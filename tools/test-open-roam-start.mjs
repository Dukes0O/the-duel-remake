// OPEN-SHARED: the job of being out in the open, started through the real App. Every profile here is in memory.
import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {OPEN_ROAM_ID} from '../src/world/open/roam-job.js';
import {isHeld} from '../src/world/open/holds.js';
import {NIGHT_2_SITES} from '../src/world/jobs/night-2-sites.js';
import {beginLedger} from '../src/story/ledger-save.js';
import {worldForProfile} from '../src/world/open/open-world.js';
import {settleOpenWorld} from '../src/world/open/open-save.js';
import {newHome} from '../src/world/open/home-rule.js';

const memory = new Map();
globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)};
globalThis.cancelAnimationFrame = () => {};
const on = {enabled: id => ['hidden-road', 'story-choices', 'crew-gear', 'warlord-cards'].includes(id)};
const off = {enabled: id => ['hidden-road', 'crew-gear', 'warlord-cards'].includes(id)};

function freshApp(night) {
  memory.clear();
  const app = new App();
  app.audio.unlock = () => {};
  const begun = beginLedger({...app.profile,
    wasteland: {...app.profile.wasteland, discoveredGate: true, scrap: 120}},
  {seed: app.seed, night, embers: 4});
  assert(begun.ok);
  app.profile = begun.profile;
  assert(app._saveProfile());
  return app;
}

const app = freshApp(1);

// The button is on the Story Wall only with the switch on.
const wall = flags => yardHomeScreen({profile: app.profile, playerName: app.player.name, escapeHTML: String, panel: 'cards', featureFlags: flags});
assert.match(wall(on), /data-action="story-open-roam"/);
assert.match(wall(on), /Go out into the Scablands/);
assert.doesNotMatch(wall(off), /story-open-roam/);

app.duel.featureFlags = on;
assert(app.visitWasteland());
app.advance(8);
assert(app.isYardHomeActive());

// With the switch off no roam job can start.
app.duel.featureFlags = off;
assert.equal(app.startOpenRoam(), false);
assert.notEqual(app.duel.state.arena?.mode, 'world-job');

// With it on, the player is on foot at the hearth, the car is at the gate, and the job carries the open state.
app.duel.featureFlags = on;
assert(app.startOpenRoam());
let state = app.duel.state;
const worldJob = state.arena.worldJob;
assert.equal(worldJob.definition.id, OPEN_ROAM_ID);
assert.equal(state.onFoot, true);
assert(Math.hypot(state.fighter.x - NIGHT_2_SITES.hearthFront.position.x, state.fighter.z - NIGHT_2_SITES.hearthFront.position.z) < 2);
assert.equal(worldJob.open.world.scrap, 120);
assert.deepEqual(worldJob.open.holds, [], 'being out in the open holds nothing');
assert.equal(isHeld(worldJob.open.holds, 'checkpoints'), false);
assert.equal(worldJob.night2, undefined);

// Night 1 has no eligible storyline. A minute out in the open changes nothing while the clock runs.
const before = structuredClone(worldJob.open.world);
assert.equal(before.ledger.night, 1);
app.advance(60);
state = app.duel.state;
assert.equal(state.status, 'racing');
assert.equal(state.arena.worldJob.job.done, false);
assert(state.arena.worldJob.open.seconds > 50, 'the open land is stepped beside the job');
assert.deepEqual(state.arena.worldJob.open.world, before);
assert.deepEqual(state.arena.worldJob.open.events, []);

// Leaving from the pause menu ends it, as it ends any world job.
assert.equal(app.leaveWorldJob(), true);
assert.equal(app.duel.state.status, 'arena_result');

// Starting at home on night 2 counts as entering Tin Town. The director records eligibility and the stranger's arrival once.
const night2 = freshApp(2);
night2.duel.featureFlags = on;
assert(night2.visitWasteland());
night2.advance(8);
assert(night2.isYardHomeActive());
assert(night2.startOpenRoam());
const night2Job = night2.duel.state.arena.worldJob;
assert.equal(night2.duel.state.onFoot, true);
assert(Math.hypot(night2.duel.state.fighter.x - NIGHT_2_SITES.hearthFront.position.x,
  night2.duel.state.fighter.z - NIGHT_2_SITES.hearthFront.position.z) < 2);
const expected = structuredClone(night2Job.open.world);
assert.equal(expected.ledger.night, 2);
const choiceId = 'threads/director/2/region-runaway-tin-town';
const marks = ['runaway/director/eligible-2', choiceId];
assert(marks.every(id => !expected.ledger.marks.includes(id)));
expected.ledger.marks.push(...marks);
expected.ledger.history.push(...marks.map(key => ({type: 'mark', key, choiceId, night: 2})));
expected.open.threads.runaway = {beat: 'prints', began: 2, cast: {}, end: null};
expected.open.journal.push({type: 'thread', key: 'runaway', before: null,
  after: {beat: 'prints', end: null}, choiceId, night: 2});
night2.advance(5); // The start countdown finishes before the open land is stepped.
assert.deepEqual(night2Job.open.world, expected, 'entering Tin Town records only Runaway eligibility and arrival');
night2.advance(55);
assert.equal(night2.duel.state.status, 'racing');
assert.equal(night2Job.job.done, false);
assert(night2Job.open.seconds > 50);
assert.deepEqual(night2Job.open.world, expected, 'the rest of the first minute adds no marks or other changes');
assert.deepEqual(night2Job.open.events, []);
assert.equal(night2.leaveWorldJob(), true);

// HOME-GROUND-3: the flatbed belongs to an outing, never to the saved garage car.
const flatbedApp = freshApp(1);
const homeFlags = {enabled: id => id === 'home-ground' || on.enabled(id)};
flatbedApp.duel.featureFlags = homeFlags;
assert(flatbedApp.visitWasteland());
flatbedApp.advance(8);
const flatbedWall = () => yardHomeScreen({profile: flatbedApp.profile, playerName: 'Test', escapeHTML: String,
  panel: 'cards', featureFlags: flatbedApp.duel.featureFlags});
assert.doesNotMatch(flatbedWall(), /story-open-flatbed/, 'no truck outing before he owns ground');
assert.equal(flatbedApp.startOpenRoam('flatbed'), false);
const beforeHome = worldForProfile(flatbedApp.profile, flatbedApp.seed);
const withHome = {...beforeHome, open: {...beforeHome.open, home: newHome('Test Ground')}};
const kept = settleOpenWorld(flatbedApp.profile, withHome, {atStart: beforeHome});
assert(kept.ok);
flatbedApp.profile = kept.profile;
assert(flatbedApp._saveProfile());
flatbedApp.duel.featureFlags = on;
assert.doesNotMatch(flatbedWall(), /story-open-flatbed/, 'the home switch gates the button');
assert.equal(flatbedApp.startOpenRoam('flatbed'), false, 'the home switch gates the action');
flatbedApp.duel.featureFlags = homeFlags;
assert.match(flatbedWall(), /Go out in Tin Town's flatbed/);
assert.equal(flatbedApp.startOpenRoam('fire-truck'), false, 'the home outing offers only its flatbed');
const savedBeforeOuting = JSON.stringify(flatbedApp.profile);
assert(flatbedApp.startOpenRoam('flatbed'));
const flatbedJob = flatbedApp.duel.state.arena.worldJob;
assert.equal(flatbedJob.definition.vehicle, 'flatbed');
assert.equal(flatbedJob.vehicle.id, 'flatbed', 'the truck starts with the town switch off');
assert.equal(flatbedApp.duel.state.onFoot, true, 'the existing foot entry controls remain in use');
assert.equal(flatbedJob.open.world.vehicle, undefined, 'the vehicle selection is not world progress');
assert.equal(JSON.stringify(flatbedApp.profile), savedBeforeOuting, 'selecting the truck leaves the saved profile alone');

console.log('test-open-roam-start: ok');

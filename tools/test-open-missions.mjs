import assert from 'node:assert/strict';
import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import burned from '../src/story/threads/content/burned-camp.js';
import {placeForThread} from '../src/story/scenes/burned-camp.js';
import {isHeld, takeHold} from '../src/world/open/holds.js';
import {RATS_NEST_LAYOUT} from '../src/world/open/looks/rats-nest-look.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {isFound} from '../src/world/open/open-record.js';
import {abandonOpenMission, missionsPart} from '../src/world/open/parts/missions.js';
import {threadsPart} from '../src/world/open/parts/threads.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {LAND} from '../src/world/scablands-names.js';
import {walkThread} from './thread-crossings.mjs';
import {pageSource, pageFunctions} from './scenarios/open-burned-scout.mjs';

const scout = burned.beats.scout.mission;
const cast = {camp: 'glasshouse', enemy: 'road-rats'};
const world = applyEffects(sampleWorld('after-the-smoke'), {id: 'fixture/follow', effects: [
  {type: 'thread', id: burned.id, to: 'scout', cast},
]}).world;
const begin = () => beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world}});
const nest = sitePosition('rats-nest', world.open.landSeed);
// These two lookout posts and the hill between them and the hidden car are test geometry only.
const spots = {...RATS_NEST_LAYOUT.spots, 'lookout-1': {x: 100, z: 100, range: 500},
  'lookout-2': {x: 150, z: 100, range: 500}};
const sitePositions = {'rats-nest': {position: nest, spots}};
const scenePoint = place => placeForThread(place, cast, {sitePositions});
const start = scenePoint(['@camp', 'tracks-away']);
const via = scenePoint(scout.rule.via);
const hollow = scenePoint(scout.rule.destination);
const visible = LAND.at('boneyard', nest.x - LAND.at('boneyard').x + 130, nest.z - LAND.at('boneyard').z + 70);
const hidden = scenePoint(['rats-nest', 'drain-out']);
const ground = (x, z) => (z > nest.z + 42 && z < nest.z + 56 ? 22 : 0);
const parts = [threadsPart, missionsPart];
const frame = (open, point, dt = 1, extra = {}) => stepOpenLand(open, {
  player: {position: point}, carPosition: point, openRoam: true, checkpointsEnabled: true,
  sitePositions, missionHeightAt: ground, ...extra,
}, dt, parts);
const held = open => ['checkpoints', 'signs'].every(system => isHeld(open.holds, system));
const beat = open => open.world.open.threads[burned.id].beat;
const marks = open => open.world.ledger.marks;
const completed = out => out.events.find(event => event.type === 'threadMissionOutcome')?.outcome;
const decision = out => out.requests.find(request => request.type === 'talk')?.scene.choices.map(option => option.id.split('/').at(-1));

assert.equal(FEATURE_STATES['story-choices'], 'dev');
assert.equal(createFeatureFlags({qa: false, storage: null, search: ''}).enabled('story-choices'), false);
assert.equal(frame(begin(), start, 10, {checkpointsEnabled: false}).events.length, 0);
const missing = frame(begin(), start, 1, {sitePositions: {'rats-nest': {position: nest, spots: RATS_NEST_LAYOUT.spots}}});
if (!scout.rule.lookoutSpots.every(([, name]) => RATS_NEST_LAYOUT.spots[name])) {
  assert.equal(missing.events.length, 0, 'a missing post cannot silently make the mission unseen');
  assert.equal(held(missing.open), false);
}

const started = frame(begin(), start);
assert.equal(started.events[0].type, 'threadMission');
assert.equal(started.requests.find(request => request.type === 'missionLookouts').posts.length, 2);
assert.ok(held(started.open));
const approached = frame(started.open, via);
assert.ok(approached.requests.some(row => row.text?.includes('bean pods')));
const keptOut = frame(approached.open, hidden, 12);
assert.ok(held(keptOut.open));
assert.equal(keptOut.events.length, 0);
assert.deepEqual(keptOut.open.parts.missions.active.state.sight, [0, 0]);
const unseen = frame(keptOut.open, hollow);
assert.equal(completed(unseen), 'unseen');
assert.equal(held(unseen.open), false);
assert.ok(unseen.requests.some(request => request.type === 'missionLookouts' && !request.posts.length));
let rim = frame(unseen.open, hollow);
assert.equal(beat(rim.open), 'rim');
assert.equal(isFound(rim.open.world, 'rats-nest'), false);
assert.ok(!marks(rim.open).includes('burned-camp/seen'));

const almost = frame(approached.open, visible, 7.99);
assert.equal(almost.events.length, 0);
assert.equal(frame(almost.open, visible, .01, {onFoot: true}).events[0].type, 'threadMissionSpotted',
  'getting out does not hide an exposed car');
const brokenSight = frame(almost.open, hidden);
assert.equal(frame(brokenSight.open, visible, 7.99).events.length, 0, 'a break in sight resets the clock');
const seen = frame(almost.open, visible, .01, {road: {id: 'passing-convoy'}});
assert.deepEqual(seen.events.map(event => [event.type, event.cue]), [['threadMissionSpotted', 'open.lookout.flare']]);
assert.ok(!seen.requests.some(request => request.type === 'riders'), 'a convoy can still be clearing the road');
const sent = frame(seen.open, visible);
const riders = sent.requests.find(request => request.type === 'riders');
assert.equal(riders.id, scout.id);
assert.equal(riders.group, 'road-rats');
assert.equal(riders.vehicles.length, 2);
const fighting = frame(sent.open, hollow, 1, {road: {id: scout.id}, missionRidersFighting: true});
assert.equal(completed(fighting), undefined);
assert.ok(held(fighting.open));
assert.equal(fighting.requests.filter(request => request.type === 'riders').length, 0);
for (const extra of [{road: {id: scout.id}, missionRidersFighting: false}, {}]) {
  const done = frame(fighting.open, hollow, 1, extra);
  assert.equal(completed(done), 'seen');
  assert.equal(held(done.open), false);
  const result = frame(done.open, hollow).open;
  assert.equal(beat(result), 'rim');
  assert.ok(marks(result).includes('burned-camp/seen'));
  assert.equal(result.world.scrap, world.scrap);
}

for (const interrupt of [{missionLeaving: true}, {combatWrecking: true}, {openRoam: false}]) {
  const otherHold = takeHold(started.open.holds, 'other-job', ['signs']);
  const left = frame({...started.open, holds: otherHold}, hidden, 1, interrupt);
  assert.deepEqual(left.events.map(event => event.type), ['threadMissionCancelled']);
  assert.equal(completed(left), undefined);
  assert.equal(isHeld(left.open.holds, 'checkpoints'), false);
  assert.ok(isHeld(left.open.holds, 'signs'), 'another holder keeps its hold');
  assert.equal(beat(left.open), 'scout');
  assert.deepEqual(frame(left.open, hidden).open.world, left.open.world);
}
// An externally ended storyline cannot keep another mission from starting.
const redirected = {...started.open, world: applyEffects(started.open.world, {id: 'fixture/redirect', effects: [
  {type: 'thread', id: burned.id, end: 'left'},
]}).world};
const cancelled = frame(redirected, hidden);
assert.equal(cancelled.events[0].type, 'threadMissionCancelled');
assert.equal(frame(cancelled.open, hidden).open.parts.threads.mission, null);

const discarded = abandonOpenMission(started.open);
assert.equal(held(discarded), false);
assert.equal(discarded.parts.missions.active, undefined);
assert.equal(discarded.world, started.open.world);
const reentered = beginOpenLand({id: 'open-roam', steps: [{kind: 'roam'}], open: {world: discarded.world}});
assert.equal(frame(reentered, start).events[0].type, 'threadMission', 'a fresh outing has to begin at the trail again');

const inspect = (open, spot, extra = {}) => frame(open, scenePoint(['rats-nest', spot]), 1, {onFoot: true, ...extra});
rim = inspect(rim.open, 'rim-north');
const north = inspect(rim.open, 'rim-north');
assert.equal(north.events[0].cue, 'open.scout.seen');
assert.ok(marks(north.open).includes('burned-camp/found/north-end'));
assert.ok(marks(north.open).includes('burned-camp/found-rats-nest'));
assert.equal(isFound(north.open.world, 'rats-nest'), true);
const early = inspect(north.open, 'rim-north', {interact: true});
assert.deepEqual(decision(early), ['rim-alone', 'rim-home']);
const forgedEarlyDrain = inspect(early.open, 'rim-north', {
  jobEvents: [{type: 'talkChoice', id: 'burned-camp/rim/decision/rim-drain'}],
});
assert.equal(beat(forgedEarlyDrain.open), 'rim');
const middle = inspect(early.open, 'rim-middle');
assert.equal(middle.events[0].cue, 'open.scout.seen');
assert.ok(marks(middle.open).includes('burned-camp/found/middle'));
assert.equal(frame(middle.open, scenePoint(['rats-nest', 'rim-south'])).events.length, 0, 'the rim is on foot');
const south = inspect(middle.open, 'rim-south');
assert.equal(south.events[0].cue, 'open.scout.seen');
assert.ok(marks(south.open).includes('burned-camp/found/south-end'));
assert.ok(marks(south.open).includes('burned-camp/counted-six'));
assert.ok(marks(south.open).includes('burned-camp/knows-drain'));
const choices = inspect(south.open, 'rim-south', {interact: true});
assert.deepEqual(decision(choices), ['rim-alone', 'rim-drain', 'rim-home']);
for (const branch of ['alone', 'drain', 'home']) {
  const chosen = inspect(choices.open, 'rim-south', {jobEvents: [{type: 'talkChoice', id: 'burned-camp/rim/decision/rim-' + branch}]});
  assert.equal(beat(chosen.open), branch);
  assert.equal(chosen.open.world.scrap, world.scrap);
}

assert.deepEqual(walkThread(burned).faults, [
  'The beat "alone" has no way out and is not an end. OPEN-BURNED-PEN builds the fight alone in Scene 4.',
  'The beat "drain" has no way out and is not an end. OPEN-BURNED-PEN builds the drain in Scene 4.',
  'The beat "home" has no way out and is not an end. OPEN-BURNED-RESCUE builds Scene 5 on this beat.',
]);

for (const name of Object.keys(pageFunctions)) new Function('return ' + pageSource(name, {}, [], 'test'));
console.log('test-open-missions: passed');

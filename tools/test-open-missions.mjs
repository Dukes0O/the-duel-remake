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
import {BURNED_SCOUT, SCOUT_RATS, scoutPeople, scoutTrail, scoutGullyRoute} from '../src/world/open/content/burned-scout.js';
import {lookoutSees} from '../src/world/open/content/mission-kinds.js';
import {installSiteGround} from '../src/world/open/site-ground.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {createJobSolidGrid, pushOutOfSolids} from '../src/world/scablands-solids.js';
import {peoplePart} from '../src/world/open/parts/people.js';
import {createStoryPeople, STORY_FIGURES} from '../src/world/jobs/story-people.js';
import {createSignView} from '../src/world/open/sign-view.js';
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

// The real authored approach, including every segment between its rows, is hidden from both posts.
const releaseGround = installSiteGround(world.open.landSeed);
try {
  const realSites = {glasshouse: sitePosition('glasshouse', world.open.landSeed),
    'rats-nest': {position: nest, spots: {...RATS_NEST_LAYOUT.spots, ...BURNED_SCOUT.spots}}};
  const realFrame = (open, point, dt = 1) => frame(open, point, dt,
    {sitePositions: realSites, missionHeightAt: scablandsSurfaceHeightAt});
  const realStart = placeForThread(['@camp', 'tracks-away'], cast, {sitePositions: realSites});
  let drive = realFrame(begin(), realStart);
  assert.equal(drive.events[0].type, 'threadMission', 'authored posts start the mission without test geometry');
  const heaps = drive.requests.find(row => row.type === 'solids');
  assert.equal(heaps.solids.length, 2, 'both wreck heaps are solid');
  for (const post of BURNED_SCOUT.lookouts) assert.ok(Math.hypot(post.x - nest.x, post.z - nest.z) > RATS_NEST_LAYOUT.radius);
  drive = realFrame(drive.open, scoutGullyRoute[0]);
  for (let i = 1; i < scoutGullyRoute.length; i++) {
    const a = scoutGullyRoute[i - 1], b = scoutGullyRoute[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    let previous = a;
    const steps = Math.ceil(length / 2);
    for (let j = 1; j <= steps; j++) {
      const point = {x: a.x + (b.x - a.x) * j / steps, z: a.z + (b.z - a.z) * j / steps};
      assert.ok(BURNED_SCOUT.lookouts.every(post => !lookoutSees(post, point)), `hidden gully segment ${i}, sample ${j}`);
      assert.equal(stepMover(previous, point, {solids: false}).blocked, false, `driveable gully segment ${i}, sample ${j}`);
      drive = realFrame(drive.open, point, length / steps / 10);
      assert.ok(!drive.events.some(event => event.type === 'threadMissionSpotted'));
      previous = point;
    }
  }
  assert.equal(held(drive.open), false);
  assert.equal(beat(drive.open), 'rim');
  assert.ok(!marks(drive.open).includes('burned-camp/seen'));
  const plain = LAND.at('boneyard', -80, -1450);
  assert.ok(BURNED_SCOUT.lookouts.some(post => lookoutSees(post, plain)), 'the plain road is watched');
  const spotted = realFrame(realFrame(realFrame(begin(), realStart).open, via).open, plain, 8);
  assert.equal(spotted.events[0].type, 'threadMissionSpotted');
  assert.equal(spotted.requests.find(row => row.type === 'riders').vehicles.length, 2);

  const grid = createJobSolidGrid();
  grid.setOpenSolids('rats-nest', RATS_NEST_LAYOUT.solids.map(row => ({...row,
    x: nest.x + row.x, z: nest.z + row.z, base: scablandsSurfaceHeightAt(nest.x + row.x, nest.z + row.z)})));
  const crowdRows = scoutPeople();
  assert.ok(SCOUT_RATS.length >= 10 && SCOUT_RATS.length <= 14);
  assert.ok(crowdRows.every(row => row.talk === null && !Object.hasOwn(STORY_FIGURES, row.id)));
  const peopleView = {openRoam: true, checkpointsEnabled: true, peopleGrid: grid,
    missionLookoutPosts: BURNED_SCOUT.lookouts};
  let crowd = stepOpenLand(begin(), peopleView, 0, [peoplePart]).open;
  const placed = crowd.parts.people.cast.filter(person => person.id.startsWith('scout-'));
  assert.equal(placed.length, SCOUT_RATS.length + 2);
  assert.equal(createStoryPeople(placed).length, placed.length, 'distinct background IDs reuse rider figures');
  for (const row of placed.filter(person => person.id.startsWith('scout-rat-'))) {
    const point = row.position;
    assert.ok(!pushOutOfSolids(point.x, point.z, row.radius, grid, point.y).hit, row.id + ' is clear of yard solids');
    const plan = crowdRows.find(person => person.id === row.id).routine.day;
    const origin = LAND.at(...(plan.at ?? plan.stops[0].at));
    assert.ok(Math.hypot(point.x - origin.x, point.z - origin.z) < .01, row.id + ' stands at its row');
  }
  for (let tick = 0; tick < 40; tick++) crowd = stepOpenLand(crowd, peopleView, .5, [peoplePart]).open;
  assert.deepEqual(crowd.world, begin().world, 'background routines write no ledger entries');
  assert.equal(stepOpenLand(begin(), {...peopleView, checkpointsEnabled: false}, 0, [peoplePart])
    .open.parts.people.cast.some(person => person.id.startsWith('scout-')), false);

  const trailRows = scoutTrail(realSites.glasshouse);
  assert.deepEqual(trailRows.pods.at(-1), via, 'pods end at the bridge');
  assert.ok(Math.hypot(trailRows.tracks.at(-1).x - nest.x, trailRows.tracks.at(-1).z - nest.z) < 95);
  const visuals = createSignView(), worldJob = {open: spotted.open};
  const beforeDraw = structuredClone(spotted.open);
  visuals.update(worldJob, plain, 0);
  const flare = visuals.group.getObjectByName('Scouting lookout flare');
  const light = visuals.group.getObjectByName('Scouting flare light');
  assert.equal(flare.visible, true, 'a flare is drawn even while signs are held');
  assert.equal(flare.position.x, spotted.events[0].position.x, 'the flare starts at the watcher');
  assert.equal(visuals.group.children.filter(row => row.name === 'Scouting lookout wreck heap').length, 2);
  assert.ok(visuals.group.getObjectByName('Scouting tyre tracks'));
  assert.ok(visuals.group.getObjectByName('Scouting bean pods'));
  for (const age of [1, 3.6]) {
    worldJob.open = {...spotted.open, seconds: spotted.open.seconds + age};
    visuals.update(worldJob, plain, age);
    assert.ok(light.position.y > 0, 'the flare climbs');
  }
  const peak = light.position.y;
  worldJob.open = {...spotted.open, seconds: spotted.open.seconds + 6};
  visuals.update(worldJob, plain, 6);
  assert.ok(light.position.y < peak, 'the flare falls');
  worldJob.open = {...spotted.open, seconds: spotted.open.seconds + 8};
  visuals.update(worldJob, plain, 8);
  assert.equal(flare.visible, false, 'an old event cannot restart the flare');
  assert.deepEqual(spotted.open, beforeDraw, 'the sign view does not change mission state');
  visuals.dispose();
} finally {
  releaseGround();
}

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

// `home` has had ways out since OPEN-ASH-FOLD put the Ash Men's choices there; OPEN-BURNED-RESCUE builds the Road Rats'.
assert.deepEqual(walkThread(burned).faults, [
  'The beat "alone" has no way out and is not an end. OPEN-BURNED-PEN builds the fight alone in Scene 4.',
  'The beat "drain" has no way out and is not an end. OPEN-BURNED-PEN builds the drain in Scene 4.',
]);

for (const name of Object.keys(pageFunctions)) new Function('return ' + pageSource(name, {}, [], 'test'));
console.log('test-open-missions: passed');

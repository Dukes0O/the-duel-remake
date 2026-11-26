import assert from 'node:assert/strict';
import {castThread} from '../src/story/threads/cast.js';
import {directThreads} from '../src/story/threads/director.js';
import {firstBeat, threadRule} from '../src/story/threads/thread-rule.js';
import {checkThread, requireSound} from '../src/world/open/check-tables.js';
import {threadTalkRows} from '../src/world/open/content/talk-threads.js';
import {isHeld, takeHold} from '../src/world/open/holds.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {createThreadsPart} from '../src/world/open/parts/threads.js';
import {LAND} from '../src/world/scablands-names.js';
import {placeForThread} from '../src/story/scenes/burned-camp.js';

const storyline = (id, kind = 'trouble', options = {}) => ({
  id, kind, title: 'A sample storyline', reads: ['found', 'word', 'night'], writes: ['mark'],
  cast: {camp: {from: 'sites', where: {all: [{fact: 'found'}, {fact: 'word', atLeast: 'Friendly'}]}}},
  starts: {when: {fact: 'night', atLeast: 2}},
  sign: {kind: 'smoke', at: '@camp', lastsNights: 2},
  beats: {sign: {when: 'sign-seen', thoughts: ['That is {camp.leader} out there.'], next: 'finish'},
    finish: {effects: [{type: 'mark', id: `${id}/completed`}], next: 'done'}},
  ends: ['done'], ignored: {afterNights: 4, next: 'done'}, ...options,
});
const main = storyline('test-one');
const helped = sampleWorld('helped-camp');
const isAt = (x, z) => ({player: {position: {x, z}}, groundRegion: 'salt-pan'});
const context = (world = helped, extra = {}) => ({world, placeAt: placeForThread, ...extra});
const apply = (world, choices) => choices.reduce((current, choice) => applyEffects(current, choice).world, world);
const choose = (world, id, effects) => applyEffects(world, {id, effects}).world;
const placed = LAND.at('ships-in-sand', 2000, 700);

assert.deepEqual(checkThread(main), []);
for (const key of ['reads', 'writes', 'cast', 'starts', 'sign', 'beats', 'ends', 'ignored']) {
  const missing = {...main};
  delete missing[key];
  assert.throws(() => requireSound([missing], checkThread, 'Storylines'), new RegExp(key));
}
const cast = world => castThread(main, world, {ask: threadRule(main, context(world)).ask, placeAt: placeForThread});
assert.deepEqual(cast(helped), {camp: 'glasshouse'});
assert.deepEqual(cast(sampleWorld('helped-camp')), cast(helped));
assert.equal(cast(sampleWorld('nothing-found')), null);
const other = choose(sampleWorld('first-night'), 'fixture/other-camp', [
  {type: 'find', site: 'radio-hill'}, {type: 'word', person: 'radio-hill', set: 'Sworn'},
]);
assert.deepEqual(cast(other), {camp: 'radio-hill'});

const stories = [main, storyline('test-two'), storyline('test-three', 'need'), storyline('test-four', 'find')];
const start = (world, occasion, extra) => apply(world, directThreads(stories, context(world, extra), occasion));
let world = start(helped, 'hearth');
const [first] = Object.keys(world.open.threads);
assert.equal(world.open.threads[first].beat, 'sign');
assert.equal(world.open.threads[first].began, 3);
assert.deepEqual(start(world, 'hearth'), world);
world = start(world, 'region-flats');
const ids = Object.keys(world.open.threads);
assert.equal(ids.length, 2);
assert.notEqual(stories.find(thread => thread.id === ids[0]).kind, stories.find(thread => thread.id === ids[1]).kind);
world = start(world, 'region-sand');
assert.equal(Object.keys(world.open.threads).length, 2);
assert.deepEqual(start(helped, 'hearth', {view: {lastNight: 3}}), helped);
assert.deepEqual(start(helped, 'hearth', {holds: takeHold([], 'mission', ['signs'])}), helped);

const definition = {id: 'open-roam', steps: [{kind: 'roam'}], open: {world: helped}};
const part = createThreadsPart([main]);
function tellAgain() {
  let {open} = stepOpenLand(beginOpenLand(definition), isAt(placed.x + 160, placed.z), 1, [part]);
  assert.equal(open.world.open.threads[main.id]?.beat, firstBeat(main));
  let next = stepOpenLand(open, isAt(placed.x + 160, placed.z), 2, [part]);
  assert.equal(next.requests.length, 0, 'two seconds of smoke do not count');
  next = stepOpenLand(next.open, isAt(placed.x + 160, placed.z), 1, [part]);
  assert.equal(next.requests[0].text, 'That is Marigold out there.');
  next = stepOpenLand(next.open, isAt(placed.x + 160, placed.z), 1, [part]);
  assert.equal(next.open.world.open.threads[main.id].end, 'done');
  assert.ok(next.open.world.ledger.marks.includes('test-one/completed'));
  return next.open.world;
}
assert.deepEqual(tellAgain(), tellAgain(), 'the same input sequence yields the same ledger and open record');
assert.deepEqual(helped, sampleWorld('helped-camp'), 'the rules leave their input world alone');

const spoken = storyline('test-spoken', 'find', {sign: {kind: 'words', by: 'dot', at: 'tin-town'}});
assert.equal(threadTalkRows([spoken]).dot[0].scene, 'test-spoken/heard-sign');
for (const [thread, jobEvents] of [[spoken, [{type: 'talkChoice', id: 'test-spoken/heard-sign'}]],
  [storyline('test-call', 'find', {sign: {kind: 'call', at: 'tin-town'}}), []]]) {
  const part = createThreadsPart([thread]);
  const world = choose(helped, 'fixture/start', [{type: 'thread', id: thread.id, to: 'sign', cast: {camp: 'glasshouse'}}]);
  const open = beginOpenLand({...definition, open: {world}});
  const point = LAND.at('tin-town');
  const next = stepOpenLand(open, {...isAt(point.x, point.z), jobEvents}, 1, [part]);
  assert.equal(next.open.world.open.threads[thread.id].beat, 'finish');
}

const mission = storyline('test-mission', 'trouble', {cast: {}, sign: {kind: 'call', at: 'tin-town'}, beats: {work: {
  mission: {id: 'test-mission/job', kind: 'reach', holds: ['checkpoints', 'signs'], outcomes: {home: {next: 'done'}}},
}}});
const missionWorld = choose(helped, 'fixture/mission', [{type: 'thread', id: mission.id, to: 'work'}]);
let open = beginOpenLand({...definition, open: {world: missionWorld}});
({open} = stepOpenLand(open, {}, 1, [createThreadsPart([mission])]));
assert.ok(isHeld(open.holds, 'checkpoints') && isHeld(open.holds, 'signs'));
({open} = stepOpenLand(open, {jobEvents: [{type: 'threadMissionOutcome', id: 'test-mission/job', outcome: 'home'}]}, 1,
  [createThreadsPart([mission])]));
assert.equal(open.world.open.threads[mission.id].end, 'done');
assert.equal(isHeld(open.holds, 'signs'), false);
console.log('test-open-threads: passed');

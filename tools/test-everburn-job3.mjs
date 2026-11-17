import assert from 'node:assert/strict';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {BELLOWS_RULE, BELLOWS_LINES, bellowsPay, bellowsSentence,
  stepBellowsLoad, bellowsAshBox, stepBellowsAsh, bellowsThiefSpeedKmh,
  bellowsBlockingSide, stepBellowsPursuit, stepBellowsEnding} from '../src/world/jobs/bellows-rule.js';

// Job 3.2: speed, attempted passes and each sack's six-second road-width box.
assert.equal(bellowsThiefSpeedKmh(200, false), 195);
assert.equal(bellowsThiefSpeedKmh(130, false), 125);
assert.equal(bellowsThiefSpeedKmh(200, true), 60);
for (const [along, side, expected] of [
  [-30, -2, -1], [-30, 2, 1], [-30.01, 2, 0], [0, 2, 1], [0.01, 2, 0], [-5, 0, 0],
]) assert.equal(bellowsBlockingSide(along, side), expected);
const cloud = Object.freeze(bellowsAshBox('first', {x: 10, z: 20, heading: 0.7}, 12));
assert.deepEqual(cloud, {id: 'first', x: 10, z: 20, yaw: 0.7,
  length: 30, width: 12, remaining: 6});
const aged = stepBellowsAsh([cloud], 5);
assert.equal(aged[0].remaining, 1);
assert.equal(cloud.remaining, 6);
assert.deepEqual(stepBellowsAsh(aged, 1), []);
console.log('PASS Run Him Down: road speed, passing side and ash box lifetime.');

// Job 3.3 and 3.6: snapshots of contacts and loads, never a driving script.
const tick = (state = {}, facts = {}, dt = 0) => stepBellowsLoad(state, facts, dt);
assert.equal(tick().state.bellows, 100);
assert.equal(tick({}, {}, 10).state.bellows, 100);
const scorched = tick({}, {flameContact: true}, 2);
assert.equal(scorched.state.bellows, 70);
assert.deepEqual(scorched.events, [{type: 'say', lineId: 'bellows.warning'}]);
assert.equal(tick(scorched.state, {flameContact: true}, 10).state.bellows, 0);
assert.equal(tick(scorched.state, {flameContact: true}, 1).events.length, 0);
assert.equal(tick({}, {behindMetres: 100}).events[0].lineId, 'bellows.warning');
assert.equal(tick({}, {behindMetres: 100.01}).events.length, 0);
assert.equal(tick({}, {behindMetres: -1}).events.length, 0);
assert.equal(BELLOWS_LINES.warning, 'Cinder: Not the flamethrower! Leather burns.');

const hard = {carContact: true, carGapMetres: 3, meetingKmh: 20};
assert.equal(tick({}, {...hard, meetingKmh: 19.99}).state.knocks, 0);
let state = tick({}, hard).state;
assert.equal(state.knocks, 1);
assert.equal(tick(state, hard, 10).state.knocks, 1);
state = tick(state, {carGapMetres: 8}).state;
assert.equal(tick(state, hard).state.knocks, 1, 'Eight metres still holds the meeting.');
state = tick(state, {carGapMetres: 8.01}).state;
state = tick(state, hard).state;
assert.equal(state.knocks, 2);
state = tick(state, {carGapMetres: 9}).state;
const stopped = tick(state, hard);
assert.equal(stopped.state.knocks, BELLOWS_RULE.stopKnocks);
assert.equal(stopped.state.thiefStopped, true);
assert.equal(stopped.events.at(-1).type, 'thiefStopped');
assert.deepEqual(tick(stopped.state, {flameContact: true}, 9).state, stopped.state);
const soft = tick({}, {...hard, meetingKmh: 1}).state;
assert.equal(tick(soft, hard).state.knocks, 0, 'A soft touch must separate before a new knock.');
const wall = {solidContact: true, solidImpactKmh: 20};
state = tick({}, wall).state;
assert.equal(state.knocks, 1);
assert.equal(tick(state, wall).state.knocks, 1);
state = tick(state, {}).state;
assert.equal(tick(state, wall).state.knocks, 2);
assert.equal(tick({}, {...hard, ...wall}).state.knocks, 1);
assert.equal(tick({}, {...wall, solidImpactKmh: 19.99}).state.knocks, 0);
for (const [condition, pay, sentence] of [
  [100, 120, 'The bellows came back whole.'], [80, 120, 'The bellows came back whole.'],
  [79.99, 80, 'The bellows will patch.'], [40, 80, 'The bellows will patch.'],
  [39.99, 50, 'The bellows are scorched.'], [0, 50, 'The bellows are scorched.'],
]) {
  assert.equal(bellowsPay(condition), pay);
  assert.equal(bellowsSentence(condition), sentence);
}
const before = Object.freeze({bellows: 90, knocks: 1});
assert.deepEqual(tick(before, hard), tick(before, hard));
assert.deepEqual(before, {bellows: 90, knocks: 1});
// Flame costs depend on elapsed contact time, not how many frames are drawn.
let partitioned = {};
for (let frame = 0; frame < 120; frame++)
  partitioned = tick(partitioned, {flameContact: true}, 1 / 120).state;
assert(Math.abs(partitioned.bellows - tick({}, {flameContact: true}, 1).state.bellows) < 1e-9);
assert.equal(tick({}, {flameContact: true}, 0).state.bellows, 100);
const softWall = tick({}, {...wall, solidImpactKmh: 1}).state;
assert.equal(tick(softWall, wall).state.knocks, 0, 'Leaning against a solid is one meeting too.');
console.log('PASS Run Him Down: load, warning, separate meetings, three knocks and result boundaries.');

// Job 3.2 and 3.5: rules snapshots cross sack marks and reach the furnace.
const roadFacts = {roadMetres: 0, roadWidthMetres: 28, furnaceMetres: 1000,
  sackPoints: [{x: 10, z: 20, heading: 1}, {x: 30, z: 40, heading: 2}]};
const pursue = (state, facts = {}, dt = 0) => stepBellowsPursuit(state, {...roadFacts, ...facts}, dt);
assert.equal(pursue({}, {roadMetres: 799.99}).state.clouds.length, 0);
let pursuit = pursue({}, {roadMetres: 800});
assert.deepEqual(pursuit.state.sacksThrown, [0]);
assert.deepEqual(pursuit.events, [{type: 'thiefAsh', id: 'thief-ash-0'}]);
assert.equal(pursuit.state.clouds[0].width, 28);
const firstSack = pursuit.state;
pursuit = pursue(firstSack, {roadMetres: 800}, 6);
assert.deepEqual(pursuit.events, []);
assert.deepEqual(pursuit.state.clouds, []);
assert.equal(firstSack.clouds[0].remaining, 6, 'Stepping must not age the earlier snapshot.');
pursuit = pursue(pursuit.state, {roadMetres: 1600});
assert.deepEqual(pursuit.state.sacksThrown, [0, 1]);
assert.equal(pursuit.state.clouds[0].x, 30);
assert.equal(pursue({}, {roadMetres: 2000}).state.clouds.length, 2);
assert.equal(pursue({}, {furnaceMetres: 400.01}).requests.length, 0);
pursuit = pursue(pursuit.state, {furnaceMetres: 400});
assert.deepEqual(pursuit.requests, [{type: 'bellowsRiders'}]);
assert.equal(pursue(pursuit.state, {furnaceMetres: 100}).requests.length, 0);
assert.equal(pursue(pursuit.state, {furnaceMetres: 30.01}).events.length, 0);
const loadedChase = {...pursuit.state, bellows: 37, knocks: 2, meetingHeld: true, solidHeld: true};
const restarted = pursue(loadedChase, {furnaceMetres: 30});
assert.equal(restarted.state.bellows, 37);
assert.equal(restarted.state.knocks, 2);
assert.equal(restarted.state.ridersStarted, true);
assert.deepEqual(restarted.state.sacksThrown, [0, 1]);
assert.deepEqual(restarted.state.clouds, []);
assert.equal(restarted.state.meetingHeld, false);
assert.equal(restarted.state.solidHeld, false);
assert.deepEqual(restarted.requests, [{type: 'say', lineId: 'bellows.restart'},
  {type: 'bellowsRestart', leadMetres: 150}]);
assert.equal(pursue({...loadedChase, thiefStopped: true}, {furnaceMetres: 0}).requests.length, 0);
console.log('PASS Run Him Down: two sacks, furnace riders and restart preserve the load.');

// Job 3.6: the player must collect the bellows; proximity while walking or
// driving through the circle cannot bank the load or send the furnace away.
const endingFacts = {onFoot: false, playerSpeedKmh: 0, carGapMetres: 8};
const end = (state, facts = {}, dt = 0) => stepBellowsEnding(state, {...endingFacts, ...facts}, dt);
assert.equal(end({}).complete, false);
const captured = {thiefStopped: true, bellows: 70, knocks: 3};
for (const facts of [{onFoot: true}, {playerSpeedKmh: 1}, {playerSpeedKmh: -1}, {carGapMetres: 8.01}]) {
  const waiting = end(captured, facts, 9);
  assert.equal(waiting.complete, false);
  assert.equal(waiting.state.bellowsLoaded, undefined);
  assert.deepEqual(waiting.requests, [{type: 'bellowsThiefFlee'}]);
}
let ending = end(captured, {}, 0);
assert.equal(ending.complete, false);
assert.deepEqual(ending.events, [{type: 'bellowsLoaded'}]);
assert.deepEqual(ending.requests, [{type: 'bellowsThiefFlee'}, {type: 'bellowsFurnaceLeave'},
  {type: 'say', lineId: 'story.ember.cinder.22'}]);
ending = end(ending.state, {}, 8.99);
assert.equal(ending.complete, false);
assert.deepEqual(ending.requests, []);
ending = end(ending.state, {}, .01);
assert.equal(ending.complete, true);
assert.deepEqual(ending.events, [{type: 'bellowsArrived', bellows: 70, knocks: 3,
  pay: 80, sentence: 'The bellows will patch.'}]);
assert.deepEqual(end(ending.state, {}, 10).events, []);
const lateCollection = end(end(captured, {carGapMetres: 100}, 20).state);
assert.equal(lateCollection.complete, true);
assert.equal(lateCollection.events.filter(event => event.type === 'bellowsArrived').length, 1);
assert.deepEqual(end(Object.freeze(captured)), end(Object.freeze(captured)));
console.log('PASS Run Him Down: theft escape, collection, furnace departure and nine-second ending.');

// Exercise the ordinary job engine with snapshots, without a driver. The
// bellows chase must not inherit the old health, contact or leash shortcuts.
const chaseStep = {kind: 'chase', bellows: true, targetId: 'thief',
  path: [{position: {x: 0, z: 0}}, {position: {x: 2000, z: 0}}]};
const chaseView = {onFoot: false, speedKmh: 0, carPosition: {x: 0, z: 0},
  player: {position: {x: 0, z: 0}},
  actors: [{id: 'thief', health: 0, position: {x: 3, z: 0}}], contact: 'thief',
  bellows: {...roadFacts, playerTopSpeedKmh: 200}};
let chase = createJob({steps: [chaseStep]}, 17);
const missing = stepJob(chase, {...chaseView, actors: []}, 100);
assert.equal(missing.done, false);
assert.equal(missing.stepState.bellows, undefined);
assert.equal(missing.requests.find(request => request.type === 'follow').speed, 0);
chase = stepJob(chase, chaseView);
assert.equal(chase.done, false, 'Health zero and proximity cannot stop the thief.');
assert.equal(chase.stepState.knocks, 0);
assert.equal(chase.requests.find(request => request.type === 'follow').speed, 195 / 3.6);
assert.equal(chase.requests.find(request => request.type === 'follow').actorId, 'thief');
chase = stepJob(chase, {...chaseView, carPosition: {x: -10000, z: 0}});
assert.equal(chase.failedStep, false, 'The bellows chase has no old distance leash.');
const warning = stepJob(chase, {...chaseView,
  bellows: {...chaseView.bellows, flameContact: true}}, 1);
assert.equal(warning.stepState.bellows, 85);
assert(warning.requests.some(request => request.type === 'say' && request.lineId === 'bellows.warning'));
for (let knock = 0; knock < 3; knock++) {
  chase = stepJob(chase, {...chaseView, bellows: {...chaseView.bellows, ...hard}});
  assert.equal(chase.stepState.knocks, knock + 1);
  if (knock < 2) chase = stepJob(chase, {...chaseView, carPosition: {x: -10, z: 0}});
}
assert.equal(chase.done, false);
assert.equal(chase.stepState.bellowsLoaded, true);
assert.equal(chase.requests.find(request => request.type === 'follow').speed, 0);
assert(chase.requests.some(request => request.type === 'bellowsThiefFlee'));
chase = stepJob(chase, chaseView, 9);
assert.equal(chase.done, true);
assert(chase.events.some(event => event.type === 'bellowsArrived' && event.knocks === 3));
assert(chase.events.some(event => event.type === 'done'));
assert.equal(chaseView.actors[0].health, 0, 'The rule never writes into an actor snapshot.');
let retry = stepJob(createJob({steps: [chaseStep]}), {...chaseView,
  bellows: {...chaseView.bellows, flameContact: true, furnaceMetres: 30}}, 2);
assert.equal(retry.failedStep, false, 'Restarting the route must not reset the job state.');
assert.equal(retry.stepState.bellows, 70);
assert(retry.requests.some(request => request.type === 'bellowsRestart' && request.leadMetres === 150));
assert(retry.requests.some(request => request.type === 'say' && request.lineId === 'bellows.warning'));
assert(retry.stepState.lineQueue.includes('bellows.restart'), 'The warning stays ahead of the restart caption.');
retry = stepJob(retry, chaseView, 2.2);
assert(retry.requests.some(request => request.type === 'say' && request.lineId === 'bellows.restart'));
const finalKnock = createJob({steps: [chaseStep]});
finalKnock.stepState = {bellows: 70, knocks: 2};
retry = stepJob(finalKnock, {...chaseView,
  bellows: {...chaseView.bellows, ...hard, furnaceMetres: 30}});
assert.equal(retry.stepState.thiefStopped, true);
assert.equal(retry.stepState.bellows, 70);
assert(!retry.requests.some(request => request.type === 'bellowsRestart'),
  'A third knock wins before the same step can restart at the furnace.');
console.log('PASS Run Him Down: existing chase engine uses knocks, captions, collection and hold.');

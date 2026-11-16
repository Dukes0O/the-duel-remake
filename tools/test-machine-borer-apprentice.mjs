import assert from 'node:assert/strict';
import {borerCutLesson} from '../src/machines/borer.js';
import {borerWatchingWords, canSendBorer, sendBorer, createDigSandbox, createDigSandboxForApp, importDigTunnels, rememberDigTunnel, stepDigSandbox, watchBorerCut} from '../src/machines/dig-sandbox.js';
import {canDelegate, recordBorerLesson} from '../src/town/town-apprentices.js';

const sim = createDigSandbox();
const town = sim.apprenticeTown;
const cut = (errorM, stalls, pace, distanceM = 100, reachedDaylight = true) =>
  borerCutLesson({mouthY:0, y:errorM, distanceM, reachedDaylight, stallCount:stalls, allowedCutM:distanceM / pace});
assert.equal(town.people[0].name, 'Pim');
assert.equal(recordBorerLesson(town, 'pim', cut(1, 2, .5, 99)), null);
assert.equal(recordBorerLesson(town, 'pim', cut(1, 2, .5, 100, false)), null);
assert.equal(town.borerLessons.length, 0);
assert.equal(recordBorerLesson(town, 'pim', cut(1, 2, .5)), null);
assert.equal(canDelegate(town, 'pim', 'bore'), false);
const record = recordBorerLesson(town, 'pim', cut(3, 4, .9));
assert.equal(canDelegate(town, 'pim', 'bore'), true);
assert.equal(record.errorM, 2);
assert.equal(record.stallsPer100M, 3);
assert.ok(Math.abs(record.rate - .7) < 1e-9);
assert.equal(record.taughtBy, 'player');
recordBorerLesson(town, 'pim', cut(.25, 5, .8));
assert.equal(record.errorM, .25);
assert.equal(record.stallsPer100M, 3);
assert.equal(record.rate, .8);
const easy = {people:[{id:'pim', name:'Pim'}]};
recordBorerLesson(easy, 'pim', cut(2, 1, .2), {easy:true});
const safe = recordBorerLesson(easy, 'pim', cut(4, 3, .4), {easy:true});
assert.equal(safe.errorM, .5);
assert.equal(safe.rate, .8);
const easyVisit = createDigSandboxForApp({player:{id:'lesson-easy'}, cpuDifficulty:'easy'});
const normalVisit = createDigSandboxForApp({player:{id:'lesson-normal'}, cpuDifficulty:'medium'});
assert.equal(easyVisit.easy, true);
assert.equal(easyVisit.playerId, 'lesson-easy');
assert.equal(normalVisit.easy, false);
for (const visit of [easyVisit, normalVisit]) {
  recordBorerLesson(visit.apprenticeTown, 'pim', cut(2, 1, .2), {easy:visit.easy});
  recordBorerLesson(visit.apprenticeTown, 'pim', cut(4, 3, .4), {easy:visit.easy});
}
assert.equal(easyVisit.apprenticeTown.apprenticeships[0].errorM, .5);
assert.equal(easyVisit.apprenticeTown.apprenticeships[0].rate, .8);
assert.equal(normalVisit.apprenticeTown.apprenticeships[0].errorM, 3);
assert.ok(Math.abs(normalVisit.apprenticeTown.apprenticeships[0].rate - .3) < 1e-9);
// The visit retains a finished tunnel once, and ignores unfinished work.
const visit = importDigTunnels(createDigSandbox({playerId:'second-cut'}), [
  {start:{x:0,y:0,z:0}, end:{x:0,y:0,z:100}, radius:3, startOpen:true, endOpen:true},
]);
assert.equal(rememberDigTunnel(visit), visit);
const completed = rememberDigTunnel({...visit, borer:{...visit.borer, reachedDaylight:true}});
assert.deepEqual(completed.completedTunnels, [visit.tunnels]);
assert.equal(rememberDigTunnel(completed), completed);
assert.equal(completed.apprenticeTown, visit.apprenticeTown);
// Driving clear of daylight frees the same machine for a second hand cut.
let leaving = {...completed, ground:{...completed.ground, refusal:()=>null}, activeMachine:'borer', mode:'drive',
  borer:{...completed.borer, started:true, finished:true, reachedDaylight:true,
    distanceM:100, travelM:100, x:0, z:100, heading:0, outsideM:0}};
leaving = stepDigSandbox(leaving, {controls:{forward:1}}, 5);
assert.equal(leaving.borer.finished, true, 'Mabel can still reverse into the mouth while close to it.');
leaving = stepDigSandbox(leaving, {controls:{forward:1}}, 7);
assert.equal(leaving.borer.started, false);
assert.equal(leaving.borer.finished, false);
assert.equal(leaving.borer.distanceM, 0);
assert.deepEqual(leaving.borer.segments, []);
assert.equal(leaving.completedTunnels[0], visit.tunnels);
assert.equal(leaving.apprenticeTown, visit.apprenticeTown);
const beforeTurn = leaving.borer.heading;
leaving = stepDigSandbox(leaving, {controls:{forward:1, steer:1}}, 1);
assert.notEqual(leaving.borer.heading, beforeTurn, 'Mabel can turn toward another face.');
console.log('Borer apprentice lessons: eligibility, averages, improvement and Easy passed.');

// Watching words follow this cut's events, not the total distance or a stall alone.
let watching = {};
const start = {started:false, stalled:false, distanceM:0, slope:0};
assert.deepEqual(borerWatchingWords({...sim, borerWatching:watching}), [
  'Pim is riding with you. Cut two tunnels and Pim can cut the rest.',
  'Pim can run her now. At a face, choose Send Pim.',
]);
watching = watchBorerCut(watching, start, start, {distanceM:100, riseM:1});
assert.equal(watching.survey, true);
watching = watchBorerCut(watching, {...start, started:true, stalled:true},
  {...start, started:true, stalled:true}, null);
assert.equal(watching.freedStall, undefined);
watching = watchBorerCut(watching, {...start, started:true, stalled:true},
  {...start, started:true, stalled:false}, null);
assert.equal(watching.freedStall, true);
watching = watchBorerCut(watching, {...start, started:true},
  {...start, started:true, distanceM:49, slope:Math.atan(.01)}, null);
assert.equal(watching.heldGrade, undefined);
watching = watchBorerCut(watching, {...start, started:true, distanceM:49},
  {...start, started:true, distanceM:50, slope:Math.atan(.01)}, null, true);
assert.equal(watching.heldGrade, true);
assert.equal(watching.daylight, true);
const words = borerWatchingWords({...sim, borerWatching:watching});
for (const action of ['read the survey', 'free a stall', 'hold a grade', 'come out to daylight'])
  assert.ok(words.includes(`Pim has seen you ${action}.`));
let missed = watchBorerCut({}, start, start, {distanceM:100, riseM:0});
missed = watchBorerCut(missed, {...start, started:true}, {...start, started:true, distanceM:49}, null);
missed = watchBorerCut(missed, {...start, started:true, distanceM:49},
  {...start, started:true, distanceM:50, slope:Math.atan(.021)}, null);
assert.equal(missed.heldGrade, undefined);
assert.equal(missed.gradeMetres, 0);
const shown = stepDigSandbox({...createDigSandbox(), activeMachine:'borer', mode:'drive'},
  {borerSurvey:{distanceM:100, riseM:1}}, 1/60);
assert.equal(shown.borerWatching.survey, true);
assert.deepEqual(leaving.borerWatching, {}, 'A new cut starts with no observations.');
console.log('Borer watching words: survey, stall, grade, daylight and reset passed.');

const secondCut = borerWatchingWords({...sim, borerWatching:watching,
  apprenticeTown:{...town, apprenticeships:[], borerLessons:[town.borerLessons[0]]}});
assert.ok(secondCut.includes('Pim: The far side is 100 m on and 1.0 m higher.'));

// Sending keeps a surveyed line in a normal town work order.
const faceGround = {...sim.ground, heightAt:(x,z)=>z >= 1 && z <= 120 ? 10 : 0, refusal:()=>null};
const sendStart = {...createDigSandbox({ground:faceGround}), activeMachine:'borer',
  borer:{...sim.borer, x:0, y:0, z:0, heading:0}};
const line = {x:0, y:0, z:0, heading:0, distanceM:120, riseM:6};
assert.equal(canSendBorer(sendStart, line), false, 'An untaught apprentice cannot be sent.');
recordBorerLesson(sendStart.apprenticeTown, 'pim', cut(0, 0, 1));
recordBorerLesson(sendStart.apprenticeTown, 'pim', cut(0, 0, 1));
assert.equal(canSendBorer(sendStart, null), false, 'A survey is required.');
assert.equal(canSendBorer(sendStart, {...line, x:1}), false, 'A survey must belong to this face.');
assert.equal(canSendBorer({...sendStart, ground:{...faceGround, refusal:()=> 'Blocked'}}, line), false);
assert.equal(canSendBorer({...sendStart, ground:{...faceGround, heightAt:()=>0}}, line), false);
assert.equal(canSendBorer(sendStart, line), true);
const sent = sendBorer(sendStart, line);
assert.equal(sent.boreOrders.length, 1);
assert.deepEqual(sent.boreOrders[0].mouth, {x:0,y:0,z:0});
assert.equal(sent.boreOrders[0].grade, .05);
assert.equal(sent.boreOrders[0].stages[0].kind, 'bore');
assert.equal(sent.boreOrders[0].stages[0].amount, 120);
assert.equal(sent.boreOrders[0].personId, 'pim');
assert.equal(sendBorer(sent, line), sent, 'The same face cannot be sent twice.');
const another = {...sent, borer:{...sent.borer, x:20}};
const queued = sendBorer(another, {...line, x:20});
assert.deepEqual(queued.boreOrders.map(order=>order.id), ['bore-1','bore-2']);
console.log('Borer sending: teaching, survey, face, refusal and order queue passed.');

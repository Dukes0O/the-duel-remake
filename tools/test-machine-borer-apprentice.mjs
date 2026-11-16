import assert from 'node:assert/strict';
import {borerApprenticeControls, borerCutLesson, borerSurvey, createBorerState, stepBorer} from '../src/machines/borer.js';
import {boreBoard, boreBoardWords, borerLandRefusal, borerSpoilRefusal, borerWatchingWords, canSendBorer, sendBorer, closeDigSandbox, createDigSandbox, createDigSandboxForApp, importDigTunnels, rememberDigTunnel, stepDelegatedBore, stepDigSandbox, toggleBoreLever, visitBore, switchDigMachine, watchBorerCut} from '../src/machines/dig-sandbox.js';
import {createGroundTunnels} from '../src/world/ground-tunnels.js';
import {createGroundEdit} from '../src/world/ground-edit.js';
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

const boardSim = {...queued, activeBoreId:'bore-1', boreStallSeconds:20,
  borer:{...queued.borer, y:2, stallCount:2},
  boreOrders:queued.boreOrders.map((order, i) => i ? order : {...order,
    stages:order.stages.map(stage => ({...stage, completed:20}))})};
const [workingRow, waitingRow] = boreBoard(boardSim);
assert.equal(workingRow.name, 'Pim');
assert.equal(workingRow.done, 20);
assert.equal(workingRow.remaining, 100);
assert.equal(workingRow.drift, 1);
assert.equal(workingRow.stalls, 2);
assert.ok(workingRow.minutes > 100 / .5 / 60);
assert.match(boreBoardWords(workingRow), /Pim is cutting.*20.0 m cut.*100.0 m to go.*1.0 m above.*2 stalls.*minutes to daylight/);
assert.match(boreBoardWords(waitingRow), /Pim is waiting/);
const finishedRow = boreBoard({...boardSim, boreOrders:[{...boardSim.boreOrders[0], status:'finished',
  result:{distanceM:121, offLevelM:.4, stalls:3}}]})[0];
assert.match(boreBoardWords(finishedRow), /Pim finished 121.0 m, 0.4 m off level/);
console.log('Bore board: working, waiting and finished orders passed.');

// The order records only ground cut by Mabel, and a stall costs 20 seconds.
const workGround = {
  heightAt:(x,z)=>Math.abs(x)<10 && z>=6 && z<125 ? 8 : 0,
  materialAt:()=> 'rock', refusal:()=>null,
  cut:(_shape,_height,_depth,{length})=>({ok:true,volume:length,volumes:{rock:length}}),
  fill:()=>({ok:true}),
};
let work = {town:sendStart.apprenticeTown, order:sent.boreOrders[0], borer:createBorerState(), ground:workGround};
assert.equal(stepDelegatedBore(work, 0).order, work.order);
for (let i=0;i<600;i++) work={...work,...stepDelegatedBore(work,1/60)};
assert.ok(Math.abs(work.borer.distanceM - 5)<1e-6);
assert.ok(Math.abs(work.order.stages[0].completed - work.borer.distanceM)<1e-8);
assert.equal(work.order.status, 'working');
const stalledBorer = stepBorer(createBorerState(), {thrust:1}, workGround, 'rock', 2).state;
assert.equal(stalledBorer.stalled, true);
let paused = {...work, borer:stalledBorer, stallSeconds:20};
for (let i=0;i<1200;i++) paused={...paused,...stepDelegatedBore(paused,1/60)};
assert.equal(paused.borer.distanceM, stalledBorer.distanceM);
assert.ok(paused.stallSeconds < 1e-8);
paused={...paused,...stepDelegatedBore(paused,1/60)};
assert.ok(paused.borer.distanceM > stalledBorer.distanceM);
console.log('Delegated bore: real cutting, measured progress and stall delay passed.');

// A learned mistake uses the real overload and stall, then costs 20 seconds.
const mistakeTown = {...work.town, apprenticeships:work.town.apprenticeships.map(record =>
  ({...record, stallsPer100M:100}))};
let mistake = {town:mistakeTown, order:{...sent.boreOrders[0], stages:sent.boreOrders[0].stages.map(stage=>({...stage}))},
  borer:createBorerState(), ground:workGround};
for (let i=0; i<300; i++) mistake={...mistake,...stepDelegatedBore(mistake,1/60)};
assert.equal(mistake.borer.stallCount, 1, 'A learned mistake stalls the real cutter.');
assert.equal(mistake.order.learnedStalls, 1);
assert.ok(mistake.stallSeconds > 18);
const stalledAt = mistake.borer.distanceM;
for (let i=0; i<1000; i++) mistake={...mistake,...stepDelegatedBore(mistake,1/60)};
assert.equal(mistake.borer.distanceM, stalledAt, 'The apprentice waits before cutting again.');
for (let i=0; i<300; i++) mistake={...mistake,...stepDelegatedBore(mistake,1/60)};
assert.ok(mistake.borer.distanceM > stalledAt, 'Work resumes after the stall.');
console.log('Delegated bore: learned stalls use the cutter and pause work.');

// The Dig advances the queued cutter even while the excavator is selected.
let background = {...sent, activeMachine:'excavator'};
const stopped = stepDigSandbox(background, {controls:{}}, 0);
assert.equal(stopped.boreOrders[0].stages[0].completed, 0);
background = stepDigSandbox(background, {controls:{}}, 2);
assert.equal(background.activeMachine, 'excavator');
assert.ok(background.borer.distanceM > 0, 'Mabel cuts while another machine is active.');
assert.ok(Math.abs(background.boreOrders[0].stages[0].completed - background.borer.distanceM) < 1e-8);
assert.ok(background.tunnels.segments.length > 0, 'The real cut extends the tunnel index.');
const beforeBorer = background.borer.distanceM;
background = stepDigSandbox({...background, activeMachine:'borer'}, {controls:{forward:1}}, 1);
assert.ok(background.borer.distanceM > beforeBorer);
assert.ok(background.borer.distanceM - beforeBorer < 1, 'Player controls do not drive Mabel twice.');
console.log('Delegated bore runs in the Dig beside the selected machine.');

const visited = visitBore({...background, activeMachine:'excavator', cameraIndex:2}, background.activeBoreId);
assert.equal(visited.activeMachine, 'borer');
assert.equal(visited.mode, 'work');
assert.equal(visited.cameraIndex, 0);
assert.equal(visited.borer, background.borer, 'Visiting keeps the working face.');
assert.equal(visitBore(background, 'missing'), background, 'Only the working bore can be visited.');
const selectedMabel = switchDigMachine({...background, activeMachine:'paver'});
assert.equal(selectedMabel.activeMachine, 'borer');
assert.equal(selectedMabel.mode, 'work', 'Choosing Mabel visits the working bore.');
let takeover = toggleBoreLever(visited);
assert.equal(takeover.borePlayerAtLever, true);
const beforeTakeover = takeover.borer.distanceM;
const beforeOrder = takeover.boreOrders[0].stages[0].completed;
takeover = stepDigSandbox(takeover, {controls:{forward:1/3, directLever:true}}, 5);
const playerCut = takeover.borer.distanceM - beforeTakeover;
assert.ok(playerCut > 0, 'The player cuts while holding the lever.');
assert.ok(Math.abs(takeover.boreOrders[0].stages[0].completed - beforeOrder - playerCut) < 1e-7,
  'The player cutting advances the same order.');
takeover = toggleBoreLever(takeover);
assert.equal(takeover.borePlayerAtLever, false);
const beforeReturn = takeover.borer.distanceM;
takeover = stepDigSandbox(takeover, {}, 5);
assert.ok(takeover.borer.distanceM > beforeReturn, 'The apprentice resumes at the same face.');
assert.ok(Math.abs(takeover.boreOrders[0].stages[0].completed - takeover.borer.distanceM) < 1e-7);
console.log('Taking and returning the lever keeps one bore and one order.');

// A real cutting step reports drift once even while the excavator is selected.
let drifting = {...background, activeMachine:'excavator', borer:{...background.borer, y:background.borer.y + 1.2}};
drifting = stepDigSandbox(drifting, {}, 1/60);
const driftCall = drifting.events.find(event => event.type === 'bore-call');
assert.equal(driftCall?.cue, 'borer.call');
assert.match(driftCall.message, /^Pim: We're .* off the line at .* Come and set her straight\.$/);
assert.equal(drifting.boreOrders[0].driftCalled, true);
drifting = stepDigSandbox(drifting, {}, 1/60);
assert.equal(drifting.events.filter(event => event.type === 'bore-call').length, 0);
console.log('A drift call is made once while another machine is selected.');

// The cutter finds a high exit on real editable ground and calls only once.
const lipGround = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z < 6 ? 0 : z < 30 ? 8 : -2});
let lipWork = {town:work.town, order:{...sent.boreOrders[0], stages:sent.boreOrders[0].stages.map(stage=>({...stage}))},
  borer:createBorerState(), ground:lipGround};
const lipCalls = [];
for (let i=0; i<200 && !lipWork.order.highExitCalled; i++) {
  const result = stepDelegatedBore(lipWork, 1);
  lipCalls.push(...result.events.filter(event => event.type === 'bore-call'));
  lipWork = {...lipWork, ...result};
}
assert.equal(lipWork.order.highExitCalled, true);
assert.equal(lipCalls.length, 1);
assert.equal(lipCalls[0].cue, 'borer.call');
const lipHeight = lipCalls[0].message.match(/^Pim: She is (\d+\.\d) m up the face\./);
assert.ok(lipHeight && Number(lipHeight[1]) > 1);
const lipAgain = stepDelegatedBore(lipWork, 1);
assert.equal(lipAgain.events.filter(event => event.type === 'bore-call').length, 0);
console.log('High exit: real ground triggers one call.');


// Compare a sent bore with the same hands on the real cutter and real mesa.
let mesa = createDigSandbox({playerId:'apprentice-mesa-sent'});
const parked = mesa.borer;
const x = parked.x + 30 * Math.sin(parked.heading), z = parked.z + 30 * Math.cos(parked.heading);
const mouth = {x, z, y:mesa.ground.heightAt(x,z), heading:parked.heading};
mesa = {...mesa, activeMachine:'borer', borer:createBorerState(mouth)};
recordBorerLesson(mesa.apprenticeTown, 'pim', cut(0, 0, 1));
recordBorerLesson(mesa.apprenticeTown, 'pim', cut(0, 0, 1));
const mesaSurvey = {...borerSurvey(mesa.ground, mesa.borer), ...mouth};
mesa = sendBorer(mesa, mesaSurvey);
assert.equal(mesa.boreOrders.length, 1, 'The real mesa face accepts the survey.');
mesa = {...mesa, activeMachine:'excavator'};
const handGroundBase = createDigSandbox({playerId:'apprentice-mesa-hand'}).ground;
const handGround = {...handGroundBase, refusal:shape=>borerLandRefusal(shape,handGroundBase),
  spoilRefusal:shape=>borerSpoilRefusal(shape,handGroundBase)};
let hand = createBorerState(mouth);
const handTunnels = createGroundTunnels([], {heightAt:(px,pz)=>handGround.heightAt(px,pz)});
const apprentice = mesa.apprenticeTown.apprenticeships[0];
const order = mesa.boreOrders[0];
const daylightCalls = [];
for (let second=0; second<900 && mesa.boreOrders[0].status !== 'finished'; second++) {
  const watchDaylight = mesa.borer.distanceM > mesaSurvey.distanceM - 40;
  if (!watchDaylight) mesa = stepDigSandbox(mesa, {controls:{}}, 1);
  for (let frame=0; frame<60; frame++) {
    if (watchDaylight) {
      mesa = stepDigSandbox(mesa, {controls:{}}, 1/60);
      daylightCalls.push(...mesa.events.filter(event => event.type === 'bore-daylight'));
    }
    const oldCount = hand.segments.length;
    const previousDistance = hand.distanceM;
    const hands = borerApprenticeControls(hand, order, apprentice, 1/60);
    const result = stepBorer(hand, {...hands, tunnels:handTunnels,
      tunnelsIncludeCurrent:hand.started, mutableSegments:true}, handGround, null, 1/60);
    hand = result.state;
    if (hand.distanceM !== previousDistance || result.events.some(event=>event.type === 'daylight' || event.type === 'breakthrough')) {
      if (oldCount) handTunnels.extendLast(hand.segments[oldCount-1]);
      for (let i=oldCount; i<hand.segments.length; i++) handTunnels.extendLast(hand.segments[i],true);
    }
  }
}
assert.equal(mesa.boreOrders[0].status, 'finished', `Mesa bore stopped: ${mesa.borer.message}`);
assert.equal(mesa.activeMachine, 'excavator');
assert.equal(daylightCalls.length, 1);
assert.equal(daylightCalls[0].cue, 'borer.daylight');
assert.match(daylightCalls[0].message, /^Pim: Daylight\. She is through, .* m off level\.$/);
assert.equal(mesa.tunnels.mouths.length, 2);
assert.equal(hand.reachedDaylight, true);
assert.ok(Math.abs(hand.distanceM - mesa.borer.distanceM) < .1);
assert.ok(Math.abs(hand.y - mesa.borer.y) < .1);
assert.deepEqual(mesa.boreOrders[0].result, {distanceM:mesa.borer.distanceM,
  offLevelM:Math.abs(mesa.borer.y-mouth.y), stalls:mesa.borer.stallCount});
for (const cell of mesa.borer.spoilBank.cells)
  assert.ok(Math.abs(mesa.ground.heightAt(cell.x,cell.z) - handGround.heightAt(cell.x,cell.z)) < .1,
    'The hand cut and sent cut leave the same spoil.');
for (let distance=0; distance<=mesa.borer.distanceM; distance+=5) {
  const px=x + distance*Math.sin(mouth.heading), pz=z + distance*Math.cos(mouth.heading);
  assert.ok(Math.abs(mesa.ground.heightAt(px,pz) - handGround.heightAt(px,pz)) < .1,
    'The hand cut and sent cut leave the same ground.');
}
const closedAt = background.boreOrders[0].stages[0].completed;
closeDigSandbox();
assert.equal(background.boreOrders[0].stages[0].completed, closedAt, 'Closing does not advance an unfinished order.');
console.log('Real mesa: sent and hand cuts reach daylight with matching ground and spoil.');

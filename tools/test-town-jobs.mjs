// TOWN-JOBS-2: the town's jobs that are not fights (docs/board/cards/TOWN-JOBS-2.md). The rules of the five step kinds (tow,
// repair, fence, clear, hold) and of the Road Rats are proved here without driving: each step is fed plain views.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {TOW_RULE, TOW_CUES, towLine, towSnapSpeed, stepTow} from '../src/world/jobs/steps/tow.js';
import {REPAIR_CUES, repairLine, repairSeconds, stepRepair} from '../src/world/jobs/steps/repair.js';
import {FENCE_RULE, FENCE_CUES, fenceLine, fenceLoadKg, fenceSeconds, stepFence} from '../src/world/jobs/steps/fence.js';
import {CLEAR_RULE, CLEAR_CUES, CLEAR_WRECKS, clearCount, clearLine, clearWrecks, stepClear} from '../src/world/jobs/steps/clear.js';
import {HOLD_CUES, holdGauge, holdLine, holdRadius, stepHold} from '../src/world/jobs/steps/hold.js';
import {RATS_RULE, ratsCount, ratsGiveUpSeconds, stepRats} from '../src/world/jobs/town-rats.js';
import {worldHudStep} from '../src/world/world-hud.js';
import {SOUND_BANK} from '../src/sound-bank.js';

const place = (id, x, z, radius = 12) => ({id, position:{x, z}, radius});
const view = (x, z, extra = {}) => ({player:{position:{x, z}}, speedKmh:0, hitKmh:0, difficulty:'medium', onFoot:false, actors:[], ...extra});
// Feed one step the same view for some seconds; returns the last state and every event and request seen.
function run(stepper, step, state, seconds, viewFor, {tick = .1, seed = 7} = {}) {
  let current = state, events = [], requests = [], complete = false;
  for (let t = 0; t < seconds - 1e-9 && !complete; t += tick) {
    const out = stepper(step, current, typeof viewFor === 'function' ? viewFor(t, current) : viewFor, tick, seed);
    current = out.state; events = events.concat(out.events ?? []); requests = requests.concat(out.requests ?? []); complete = out.complete === true;
  }
  return {state:current, events, requests, complete};
}
const types = result => result.events.map(event => event.type);
const said = result => result.requests.filter(request => request.type === 'say').map(request => request.lineId);
const plainSentence = line => {
  assert.ok(line.length <= 260, line);
  assert.doesNotMatch(line, /—|–| - /, `no dashes: ${line}`);
  assert.match(line, /^[A-Z0-9"'].*[.?!]$/, `a whole sentence: ${line}`);
};

// ---- tow ------------------------------------------------------------------------------------------------------------------
const towStep = {kind:'tow', id:'tow', load:'dead-van', loadTonnes:2, origin:place('van', 500, 0, 6), hookRadius:6, destination:place('yard', 0, 0, 12),
  hookLineId:'l.hook', snapLineId:'l.snap', slowLineId:'l.slow'};
const hooked = () => run(stepTow, towStep, {}, 4, view(500, 3)).state;

test('tow: hold still beside the dead van and it is hooked on, and its weight is the rig\'s', () => {
  const far = run(stepTow, towStep, {}, 2, view(400, 0));
  assert.equal(far.state.phase, 'out', 'not beside it yet');
  assert.equal(far.state.loadKg, 0);
  const moving = run(stepTow, towStep, {}, 5, view(500, 3, {speedKmh:8}));
  assert.equal(moving.state.phase, 'out', 'rolling past does not hook it');
  const result = run(stepTow, towStep, {}, 4, view(500, 3));
  assert.equal(result.state.phase, 'towing');
  assert.deepEqual(types(result), ['towHooked']);
  assert.equal(result.state.loadKg, 2000, 'two tonnes on the hook');
  assert.ok(said(result).includes('l.hook'));
});

test('tow: slowly it stays on; too fast for too long, or one hard knock, and the hook lets go where it is', () => {
  const limitKmh = towSnapSpeed(towStep) * 3.6;
  assert.equal(Math.round(limitKmh), 32, 'the 20 miles an hour towing rule');
  assert.ok(towSnapSpeed(towStep, 'easy') > towSnapSpeed(towStep), 'Easy lets it go faster');
  // Driving home at 28 km/h for a minute: still hooked, and the van follows on its chain.
  let x = 500;
  const steady = run(stepTow, towStep, hooked(), 60, () => { x -= 28 / 3.6 * .1; return view(x, 3, {speedKmh:28}); });
  assert.equal(steady.state.phase, 'towing');
  assert.ok(Math.abs(Math.hypot(steady.state.towed.x - x, steady.state.towed.z - 3) - TOW_RULE.ropeMetres) < .5, 'the van is a chain behind');
  // A burst over the limit shorter than the swing time is forgiven.
  const burst = run(stepTow, towStep, hooked(), 1, view(480, 3, {speedKmh:45}));
  assert.equal(burst.state.phase, 'towing');
  assert.equal(burst.state.swinging, true);
  assert.match(towLine(towStep, burst.state), /^It is swinging behind you\. Slow down below 32 km\/h\.$/);
  // Kept up, it lets go: no load on the rig, the marker back on the van, and it can be hooked again.
  const fast = run(stepTow, towStep, hooked(), 3, view(480, 3, {speedKmh:45}));
  assert.equal(fast.state.phase, 'out');
  assert.equal(fast.state.loadKg, 0);
  assert.equal(fast.events.find(event => event.type === 'towSnapped').cause, 'speed');
  assert.ok(said(fast).includes('l.snap'));
  const marker = fast.requests.filter(request => request.type === 'marker').at(-1).place.position;
  assert.deepEqual(marker, fast.state.towed, 'the marker is where the van came off');
  const again = run(stepTow, towStep, fast.state, 4, view(fast.state.towed.x, fast.state.towed.z + 3));
  assert.equal(again.state.phase, 'towing');
  assert.equal(again.state.snaps, 1);
  // One hard knock does it at once; Easy needs a harder one.
  const knock = stepTow(towStep, hooked(), view(490, 3, {speedKmh:20, hitKmh:35}), .1);
  assert.equal(knock.events[0].cause, 'knock');
  assert.equal(stepTow(towStep, hooked(), view(490, 3, {speedKmh:20, hitKmh:35, difficulty:'easy'}), .1).state.phase, 'towing');
});

test('tow: stop at the destination and it is unhooked, and the step reports once', () => {
  const home = run(stepTow, towStep, hooked(), 1, view(4, 2));
  assert.equal(home.state.phase, 'unhooking');
  const done = run(stepTow, towStep, home.state, 5, view(4, 2));
  assert.equal(done.complete, true);
  const delivered = done.events.filter(event => event.type === 'towDelivered');
  assert.equal(delivered.length, 1);
  assert.deepEqual(delivered[0].result, {kind:'tow', load:'dead-van', snaps:0, sentence:'You towed it home, and the hook never let go.'});
  assert.equal(done.state.loadKg, 0);
  const seenAgain = stepTow(towStep, done.state, view(4, 2), .1);
  assert.equal(seenAgain.complete, true);
  assert.equal(seenAgain.events.length, 0, 'a closing line holds the job; the tow does not report twice');
});

// ---- hold -----------------------------------------------------------------------------------------------------------------
const holdStep = {kind:'hold', id:'fill', place:{...place('tank', 0, 0, 12), name:"Deck Town's tank"}, gauge:{label:'litres pumped', total:5600, seconds:40},
  tank:{startL:5600, pumpLpm:600}, arriveLineId:'l.arrive', outLineId:'l.out', backLineId:'l.back', sayAt:[{progress:.5, lineId:'l.half'}]};

test('hold: the gauge fills only while the truck is stopped in the ring, and the tank empties as it fills', () => {
  const rolling = run(stepHold, holdStep, {}, 5, view(0, 3, {speedKmh:10}));
  assert.equal(rolling.state.share, 0, 'driving through the ring fills nothing');
  assert.match(holdLine(holdStep, rolling.state), /^Drive to Deck Town's tank and stop inside the ring\.$/);
  const half = run(stepHold, holdStep, {}, 20, view(0, 3));
  assert.ok(Math.abs(half.state.share - .5) < .01);
  assert.equal(half.state.tankL, 2800, 'half the water has gone, and with it half its weight');
  assert.deepEqual(types(half), ['holdStarted']);
  assert.deepEqual(said(half), ['l.arrive', 'l.half']);
  assert.match(holdLine(holdStep, half.state), /^Hold still\. 2,800 of 5,600 litres pumped\.$/);
  assert.deepEqual(holdGauge(holdStep, half.state), {label:'litres pumped', value:2800, total:5600, share:half.state.share});
});

test('hold: pushed out of the ring nothing is lost, and it carries on when the truck is back and stopped', () => {
  const half = run(stepHold, holdStep, {}, 20, view(0, 3));
  const out = run(stepHold, holdStep, half.state, 10, view(40, 0, {speedKmh:6}));
  assert.equal(out.state.share, half.state.share, 'the gauge waits');
  assert.deepEqual(types(out), ['holdPaused']);
  assert.deepEqual(said(out), ['l.out']);
  assert.match(holdLine(holdStep, out.state), /^Get back in the ring and stop\. 2,800 of 5,600 litres pumped\.$/);
  const back = run(stepHold, holdStep, out.state, 30, view(2, 2));
  assert.equal(back.complete, true);
  assert.deepEqual(types(back), ['holdResumed', 'holdDone']);
  assert.ok(said(back).includes('l.back'));
  assert.equal(back.state.tankL, 0);
  assert.equal(back.events.at(-1).result.total, 5600);
  assert.equal(back.events.at(-1).result.outs, 1);
  assert.equal(stepHold(holdStep, back.state, view(2, 2), .1).events.length, 0, 'it reports once');
  assert.ok(holdRadius(holdStep, 'easy') > holdRadius(holdStep), 'the ring is wider on Easy');
  // keepOutside turns the ring round: the gauge fills while the vehicle stays outside the inner ring.
  const magnet = {kind:'hold', place:place('magnet', 0, 0, 20), keepOutside:true, outerRadius:80, gauge:{label:'seconds held', total:10, seconds:10}};
  assert.equal(run(stepHold, magnet, {}, 5, view(0, 10, {speedKmh:20})).state.share, 0);
  assert.ok(run(stepHold, magnet, {}, 5, view(0, 40, {speedKmh:20})).state.share > .4);
});

// ---- Road Rats ------------------------------------------------------------------------------------------------------------
const rat = (key, index, x, z, health = 100) => ({id:`ambush:${key}:${index}`, position:{x, z}, health});

test('rats: they come once, stop the work while one stands near, and go when beaten or when they give up', () => {
  const rats = {id:'gang', count:3, lineId:'l.rats', goneLineId:'l.gone'};
  assert.equal(ratsCount(rats), 3);
  assert.equal(ratsCount(rats, 'easy'), 2, 'one fewer on Easy');
  assert.equal(ratsCount({count:1}, 'easy'), 1, 'never fewer than one');
  assert.ok(ratsGiveUpSeconds(rats, 'easy') < ratsGiveUpSeconds(rats));
  const gang = {key:'gang', place:place('stop', 10, 0)};
  const first = stepRats(rats, {}, view(0, 0), .1, gang);
  assert.deepEqual(first.requests[0], {type:'spawnWave', ambush:true, key:'ambush:gang', n:3, at:gang.place, direction:{x:0, z:1}});
  assert.equal(first.events[0].cue, 'raider.warning');
  assert.equal(first.stopping, true);
  const near = stepRats(rats, first.state, view(0, 0, {actors:[rat('gang', 0, 12, 0), rat('gang', 1, 300, 0)]}), .1, gang);
  assert.equal(near.standing, 1, 'only a Rat within 30 m stops the work');
  assert.equal(near.stopping, true);
  assert.equal(near.requests.length, 0, 'they are asked for once');
  const far = stepRats(rats, first.state, view(0, 0, {actors:[rat('gang', 0, 200, 0)]}), .1, gang);
  assert.equal(far.stopping, false);
  const beaten = stepRats(rats, first.state, view(0, 0, {actors:[rat('gang', 0, 12, 0, 0), rat('gang', 1, 14, 0, 0)]}), .1, gang);
  assert.equal(beaten.events[0].how, 'beaten');
  assert.deepEqual(beaten.requests.map(request => request.type), ['clearWave', 'say']);
  assert.equal(stepRats(rats, beaten.state, view(0, 0, {actors:[rat('gang', 0, 12, 0)]}), .1, gang).stopping, false, 'gone is gone');
  // Waiting works too: after the give-up time they leave on their own.
  let state = first.state, gone = null;
  for (let t = 0; t < RATS_RULE.giveUpSeconds + 1 && !gone; t += .5) {
    const out = stepRats(rats, state, view(0, 0, {actors:[rat('gang', 0, 12, 0)]}), .5, gang);
    state = out.state; gone = out.events.find(event => event.type === 'ratsGone') ?? null;
  }
  assert.equal(gone.how, 'gave-up');
});

// ---- repair ---------------------------------------------------------------------------------------------------------------
const repairStep = {kind:'repair', id:'patch', requiresExit:true, carPlace:place('park', 0, 0, 14), jointName:'joint', seconds:2,
  joints:[place('j1', 10, 0, 3), place('j2', 16, 0, 3), place('j3', 22, 0, 3)], exitCarLineId:'l.exit', jointLineId:'l.joint', downLineId:'l.down'};
const onFoot = (x, z, extra = {}) => view(0, 0, {onFoot:true, fighter:{position:{x, z}}, ...extra});

test('repair: park, get out, and hold F at each joint in turn; what is done to a joint is kept', () => {
  const driving = run(stepRepair, repairStep, {}, 1, view(60, 0, {speedKmh:30}));
  assert.equal(driving.state.phase, 'drive');
  const parked = run(stepRepair, repairStep, {}, 1, view(3, 0));
  assert.equal(parked.state.phase, 'exit');
  assert.ok(said(parked).includes('l.exit'), 'told to get out');
  const walked = run(stepRepair, repairStep, parked.state, 3, onFoot(10, 1));
  assert.equal(walked.state.index, 0, 'standing at the joint without F does nothing');
  assert.match(repairLine(repairStep, walked.state), /^Walk to the next joint and hold F\. Three joints to go\.$/);
  const part = run(stepRepair, repairStep, walked.state, 1, onFoot(10, 1, {interact:true}));
  assert.ok(part.state.turn > .9 && part.state.index === 0);
  assert.deepEqual(types(part), ['repairStarted']);
  const away = run(stepRepair, repairStep, part.state, 2, onFoot(13, 5));
  assert.equal(away.state.turn, part.state.turn, 'a nut half undone is still half undone');
  const one = run(stepRepair, repairStep, away.state, 1.1, onFoot(10, 1, {interact:true}));
  assert.equal(one.state.index, 1);
  assert.deepEqual(types(one), ['repairJoint']);
  assert.ok(said(one).includes('l.joint'));
  assert.equal(run(stepRepair, repairStep, one.state, 3, onFoot(22, 0, {interact:true})).state.index, 1, 'the joints are done in order');
  assert.ok(repairSeconds(repairStep, 'easy') < repairSeconds(repairStep));
  // On Easy the wrench turns without F held.
  assert.equal(run(stepRepair, repairStep, one.state, 2, onFoot(16, 0, {difficulty:'easy'})).state.index, 2);
});

test('repair: knocked down, the driver gets up at the same joint and keeps the finished ones; Rats stop the work', () => {
  const start = run(stepRepair, repairStep, {}, 1, onFoot(10, 0)).state;
  const one = run(stepRepair, repairStep, start, 2.1, onFoot(10, 0, {interact:true}));
  const part = run(stepRepair, repairStep, one.state, 1, onFoot(16, 0, {interact:true}));
  const down = run(stepRepair, repairStep, part.state, 1, onFoot(16, 0, {interact:true, fighter:{position:{x:16, z:0}, knockedDown:true}}));
  assert.equal(down.state.index, 1, 'the finished joint is kept');
  assert.equal(down.state.turn, 0, 'the turns on this joint are lost');
  assert.deepEqual(types(down), ['repairDown'], 'said once however long the driver is down');
  assert.ok(said(down).includes('l.down'));
  const up = run(stepRepair, repairStep, down.state, 5, state => onFoot(state < 2.5 ? 16 : 22, 0, {interact:true}));
  assert.equal(up.complete, true);
  const done = up.events.find(event => event.type === 'repairDone');
  assert.equal(done.result.downs, 1);
  assert.equal(done.result.sentence, 'You fixed all three joints, and got knocked down once.');
  // With Rats: they come when the first joint is begun, and no wrench turns while one stands near.
  const withRats = {...repairStep, rats:{id:'pipe-rats', count:2}};
  const begun = run(stepRepair, withRats, start, .5, onFoot(10, 0, {interact:true}));
  assert.ok(begun.requests.some(request => request.type === 'spawnWave' && request.key === 'ambush:pipe-rats'));
  const stopped = run(stepRepair, withRats, begun.state, 5, onFoot(10, 0, {interact:true, actors:[rat('pipe-rats', 0, 20, 0)]}));
  assert.equal(stopped.state.index, 0);
  assert.equal(stopped.state.stopped, 'rats');
  assert.match(repairLine(withRats, stopped.state), /^Road Rats are shooting\./);
  const clear = run(stepRepair, withRats, stopped.state, 3, onFoot(10, 0, {interact:true, actors:[rat('pipe-rats', 0, 20, 0, 0)]}));
  assert.equal(clear.state.index, 1, 'with the Rat down the work goes on');
});

// ---- fence ----------------------------------------------------------------------------------------------------------------
const fenceStep = {kind:'fence', id:'fence', stops:[place('north', 0, -30, 10), place('east', 30, 0, 10), place('south', 0, 30, 10), place('west', -30, 0, 10)],
  dropLineId:'l.drop'};

test('fence: a bundle comes off at each stop while the truck holds still, and the truck gets lighter', () => {
  assert.equal(fenceLoadKg(fenceStep), 4 * FENCE_RULE.bundleKg);
  assert.ok(fenceLoadKg(fenceStep) <= 9000, 'four sides of fence fit on the supply truck');
  const rolling = run(stepFence, fenceStep, {}, 8, view(0, -30, {speedKmh:9}));
  assert.equal(rolling.state.index, 0, 'driving through a ring drops nothing');
  assert.equal(rolling.state.loadKg, 2400);
  const first = run(stepFence, fenceStep, {}, 6, view(2, -29));
  assert.equal(first.state.index, 1);
  assert.equal(first.state.loadKg, 1800);
  assert.deepEqual(types(first), ['fenceDropped']);
  assert.match(fenceLine(fenceStep, first.state), /^Drive to the next stop and hold still in the ring\. Three stops to go\.$/);
  assert.equal(run(stepFence, fenceStep, first.state, 8, view(0, 30)).state.index, 1, 'the stops are done in order');
  let state = first.state, events = [];
  for (const stop of fenceStep.stops.slice(1)) { const out = run(stepFence, fenceStep, state, 6, view(stop.position.x, stop.position.z)); state = out.state; events = events.concat(out.events); }
  assert.equal(state.loadKg, 0);
  assert.equal(events.at(-1).type, 'fenceDone');
  assert.equal(events.at(-1).result.sentence, 'The fence is down at all four stops.');
  assert.ok(fenceSeconds(fenceStep, 'easy') < fenceSeconds(fenceStep));
});

test('fence: Rats at a stop keep the fence on the truck until they are beaten or give up', () => {
  const stops = fenceStep.stops.map((stop, index) => index === 1 ? {...stop, rats:{id:'fence-rats', count:2, alertMetres:40}} : stop);
  const step = {...fenceStep, stops};
  const far = run(stepFence, step, {}, 7, view(-6, -30));
  assert.equal(far.state.index, 1);
  assert.equal(far.requests.some(request => request.type === 'spawnWave'), false, 'not while the truck is far from their stop');
  const coming = run(stepFence, step, far.state, 1, view(30, -35, {speedKmh:30}));
  assert.ok(coming.requests.some(request => request.type === 'spawnWave' && request.key === 'ambush:fence-rats-1'), 'they come out as the truck gets near');
  const stuck = run(stepFence, step, coming.state, 8, view(30, 0, {actors:[rat('fence-rats-1', 0, 40, 5)]}));
  assert.equal(stuck.state.index, 1);
  assert.match(fenceLine(step, stuck.state), /^Road Rats are in the way\./);
  const easy = run(stepFence, step, coming.state, 30, view(30, 0, {difficulty:'easy', actors:[rat('fence-rats-1', 0, 40, 5)]}));
  assert.equal(easy.state.index, 2, 'on Easy a driver who only waits is through in under half a minute');
  assert.ok(types(easy).includes('ratsGone'));
});

// ---- clear ----------------------------------------------------------------------------------------------------------------
const clearStep = {kind:'clear', id:'clear', place:place('block', 500, 0), line:[{x:0, z:0}, {x:1000, z:0}], wrecks:6, easyWrecks:4, spreadMetres:60};

test('clear: the wrecks are laid out from the seed, on the road, and fewer of them on Easy', () => {
  const wrecks = clearWrecks(clearStep, 11);
  assert.deepEqual(wrecks, clearWrecks(clearStep, 11), 'repeatable from the seed');
  assert.notDeepEqual(wrecks, clearWrecks(clearStep, 12));
  assert.equal(wrecks.length, 6);
  assert.equal(clearCount(clearStep, 'easy'), 4);
  for (const wreck of wrecks) {
    assert.ok(Math.abs(wreck.z) < CLEAR_RULE.halfWidth, 'on the road');
    assert.ok(wreck.x > 465 && wreck.x < 535, 'inside the blocked stretch');
    assert.ok(CLEAR_WRECKS.some(kind => kind.kg === wreck.kg));
  }
  for (const a of wrecks) for (const b of wrecks) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 2, 'no two on top of each other');
});

test('clear: a wreck is shoved ahead of the nose until it is past the road\'s edge, and what is pushed is weight', () => {
  const start = stepClear(clearStep, {}, view(0, 0), .1, 11);
  const target = start.state.wrecks[0];
  // Drive at it across the road at walking pace: it goes ahead of the nose and off the far edge.
  let z = target.z - 8, state = start.state, events = [], pushedKg = 0;
  for (let t = 0; t < 40 && !state.wrecks[0].cleared; t += .1) {
    z += 9 / 3.6 * .1;
    const out = stepClear(clearStep, state, view(target.x, z, {speedKmh:9}), .1, 11);
    state = out.state; events = events.concat(out.events); pushedKg = Math.max(pushedKg, state.loadKg);
  }
  assert.equal(state.wrecks[0].cleared, 'off');
  assert.ok(Math.abs(state.wrecks[0].z) >= CLEAR_RULE.halfWidth + target.radius - .01, 'the whole of it is past the edge');
  assert.deepEqual(events.map(event => event.type), ['clearPush', 'clearOff']);
  assert.equal(pushedKg, Math.round(target.kg * CLEAR_RULE.friction), 'steel dragged over dirt resists with six tenths of its weight');
  assert.equal(state.loadKg, 0, 'and nothing is pushed once it is off');
  assert.match(clearLine(clearStep, state), /Five wrecks to go\.$/);
});

test('clear: a wreck met fast is flattened where it lies, and the road is clear when every wreck is off or flat', () => {
  let state = stepClear(clearStep, {}, view(0, 0), .1, 11).state, events = [];
  for (const wreck of state.wrecks) {
    const out = stepClear(clearStep, state, view(wreck.x - 1, wreck.z, {speedKmh:45}), .1, 11);
    state = out.state; events = events.concat(out.events);
  }
  assert.equal(state.wrecks.every(wreck => wreck.cleared === 'crushed'), true);
  const done = events.at(-1);
  assert.equal(done.type, 'clearDone');
  assert.equal(done.result.sentence, 'You flattened six wrecks.');
  // Slower than the crush speed it only pushes; on Easy the crush speed is lower.
  const slow = stepClear(clearStep, stepClear(clearStep, {}, view(0, 0), .1, 11).state, view(state.wrecks[0].x - 1, state.wrecks[0].z, {speedKmh:35}), .1, 11);
  assert.deepEqual(slow.events.map(event => event.type), ['clearPush']);
  assert.ok(CLEAR_RULE.easyCrushKmh < CLEAR_RULE.crushKmh);
});

// ---- all five -------------------------------------------------------------------------------------------------------------
test('the job engine runs the five kinds, the screen has a line for each, and every event names a sound that exists', () => {
  const steps = [towStep, repairStep, fenceStep, clearStep, holdStep];
  assert.doesNotThrow(() => createJob({id:'five', steps}));
  let job = createJob({id:'hold-only', steps:[holdStep]}, 3);
  for (let t = 0; t < 45 && !job.done; t += .1) job = stepJob(job, view(0, 2), .1);
  assert.equal(job.done, true, 'a hold runs to its end on the engine');
  for (const step of steps) {
    const hud = worldHudStep(step, {stepState:{}});
    plainSentence(hud.line);
    assert.ok(hud.target, `${step.kind} has a marker for the compass`);
  }
  const lines = [towLine(towStep, {phase:'hooking'}), towLine(towStep, {phase:'towing'}), towLine(towStep, {phase:'out', snaps:1}), towLine(towStep, {phase:'unhooking'}),
    repairLine(repairStep, {phase:'exit'}), repairLine(repairStep, {phase:'work', index:2, working:true}), repairLine(repairStep, {phase:'work', index:3}),
    fenceLine(fenceStep, {index:3, dropping:true}), fenceLine(fenceStep, {index:4}), clearLine(clearStep, {}), clearLine(clearStep, {wrecks:[]}),
    holdLine(holdStep, {arrived:true, stopped:'rats'}), holdLine({...holdStep, keepOutside:true}, {arrived:true})];
  for (const line of lines) plainSentence(line);
  for (const cues of [TOW_CUES, REPAIR_CUES, FENCE_CUES, CLEAR_CUES, HOLD_CUES, {came:'raider.warning', gone:'rider.breaks-off'}])
    for (const cue of Object.values(cues)) assert.ok(SOUND_BANK[cue], cue);
});

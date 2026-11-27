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

test('clear: a wreck is carried on the nose until it is past the road\'s edge, and what is pushed is weight', () => {
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
  // Backing away from a wreck, or driving past its side, leaves it where it is.
  const beside = stepClear(clearStep, start.state, view(start.state.wrecks[1].x, start.state.wrecks[1].z - 4), .1, 11);
  const backed = stepClear(clearStep, beside.state, view(start.state.wrecks[1].x, start.state.wrecks[1].z - 4.3, {speedKmh:5}), .1, 11);
  assert.deepEqual([backed.state.wrecks[1].x, backed.state.wrecks[1].z], [start.state.wrecks[1].x, start.state.wrecks[1].z], 'a wreck is pushed, never pulled');
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

// ==== The jobs ==============================================================================================================
// Chapters 11 to 16 as jobs of the town (src/town/content/jobs.js, src/world/jobs/town-jobs.js): when each opens, what it is
// made of, what its result does to the town exactly once, and that a town saved before this card loads as it was.
// Each job is then run ten times on Easy by a seeded child-pace driver against the real engine and the real step rules.
import {readFileSync} from 'node:fs';
import {createTown, serializeTown, deserializeTown} from '../src/town/town-state.js';
import {townCalendarAt} from '../src/town/town-calendar.js';
import {stepTown, raiseTownReport} from '../src/town/index.js';
import {stockpileAt} from '../src/town/town-goods.js';
import {getTownNext} from '../src/town/town-chapters.js';
import {TOWN_CAPTIONS} from '../src/town/content/lines.js';
import {OUTPOSTS_WORLD} from '../src/town/content/outposts-world.js';
import {OUTPOST_CHAPTERS} from '../src/town/content/neighbours.js';
import {TOWN_CHAPTER_JOBS, TOWN_REPEAT_JOBS, TOWN_JOB_ROWS} from '../src/town/content/jobs.js';
import {townMissionResult, townMissionDropCell} from '../src/town/town-missions.js';
import {townMissionCardModel, townMissionCardMarkup} from '../src/town/ui/town-mission-card.js';
import {openTownJobs, townJobDefinition, townJobResult, townChapterJobOpen} from '../src/world/jobs/town-jobs.js';
import {jobForRun} from '../src/world/jobs/job-vehicle.js';
import {keepTownStepResults} from '../src/world/jobs/town-step-results.js';
import {douseAim} from '../src/world/jobs/steps/douse.js';
import {makeRng} from '../src/rng.js';

const YEAR_TICKS = 24 * 30 * 12;
// A town in a given year with the named chapters done and facts true. Act 1's own driving chapter is always behind it.
function townAt(year, {done = [], known = {}, seed = 77} = {}) {
  const town = createTown(seed, 'Jobs test');
  town.tick = BigInt(YEAR_TICKS * (year - 1));
  town.calendar = townCalendarAt(town.tick);
  town.story = {facts:{pitsDug:true, wellBuilt:true, salvageDelivered:true, ...known},
    completed:Object.fromEntries(['town.act1.twelve', 'town.act1.water', 'town.act1.salvage', ...done].map(id => [id, true]))};
  return town;
}
const ACT2 = ['town.act2.dot-flour', 'town.act2.dot-fire', 'town.act2.quill', 'town.act2.tam', 'town.act2.imre', 'town.act2.pim'];
// The town in which a chapter job is the one open.
function townFor(jobId, seed = 77) {
  const row = TOWN_JOB_ROWS.find(item => item.id === jobId), index = ACT2.indexOf(row.chapter);
  if (!row.chapter) {
    // A job that comes round again: every neighbour met, the tower running, and the report it answers on the table.
    const town = townAt(9, {done:ACT2, known:{towerRunning:true}, seed});
    if (row.opens.report === 'dust-storm') raiseTownReport(town, 'dust-storm', {dustStorm:true});
    return town;
  }
  return townAt(8, {done:ACT2.slice(0, index), known:row.needsFact ? {[row.needsFact]:true} : {}, seed});
}
const definitionOf = (jobId, seed = 5, ember = {}) => townJobDefinition(townFor(jobId, 70 + seed), jobId, {seed, ember});

test('the neighbours\' jobs open one at a time, in the story\'s order, when their year has come', () => {
  assert.equal(townChapterJobOpen(townAt(2)), null, 'Dot calls in Year 3');
  assert.deepEqual(openTownJobs(townAt(2)).map(job => job.id), ['town-salvage-run'], 'a town before the neighbours is as it was');
  assert.deepEqual(openTownJobs(townAt(3)).map(job => job.id), ['town-flour-run', 'town-salvage-run']);
  assert.equal(getTownNext(townAt(3), OUTPOST_CHAPTERS).chapter.id, 'town.act2.dot-flour', 'the neighbours\' NEXT line names the same chapter');
  // Chapter 12 is two jobs: the fire first, the fence when the fire is out.
  const dot = townAt(4, {done:ACT2.slice(0, 1)});
  assert.equal(townChapterJobOpen(dot).id, 'town-dot-fire');
  dot.story.facts.dotFireOut = true;
  assert.equal(townChapterJobOpen(dot).id, 'town-dot-fence');
  assert.equal(townChapterJobOpen(townAt(4, {done:ACT2.slice(0, 2)})), null, 'Miss Quill calls in Year 5');
  const order = ACT2.map((chapter, index) => townChapterJobOpen(townAt(8, {done:ACT2.slice(0, index)})).id);
  assert.deepEqual(order, ['town-flour-run', 'town-dot-fire', 'town-chalk-run', 'town-goats', 'town-water-run', 'town-water-crane']);
  assert.equal(townChapterJobOpen(townAt(9, {done:ACT2})), null, 'and then they are all friends');
  // The town's own first haul comes before any neighbour.
  const early = townAt(3); delete early.story.completed['town.act1.salvage']; delete early.story.facts.salvageDelivered;
  assert.deepEqual(openTownJobs(early).map(job => job.id), ['town-haul-salvage']);
});

test('every job is built from its row and the land, runs on the engine, and stands clear of the building it visits', () => {
  for (const row of TOWN_CHAPTER_JOBS) {
    const town = townFor(row.id), definition = townJobDefinition(town, row.id, {seed:9});
    assert.ok(definition, row.id);
    assert.doesNotThrow(() => createJob(definition, 9), row.id);
    assert.equal(definition.kind, 'town-job');
    assert.equal(definition.chapter, row.chapter);
    assert.deepEqual(townJobDefinition(town, row.id, {seed:9}).steps, definition.steps, 'repeatable from the town and the seed');
    assert.ok(definition.captions[row.resultLineId], `${row.id} has its closing words`);
    // Every ring a truck stops in is outside the outpost's own walls, and within 60 m of it.
    const outpost = definition.layout.outposts.outposts.find(item => item.id === row.outpostId), world = OUTPOSTS_WORLD.find(item => item.id === row.outpostId);
    const reach = Math.hypot(Math.max(Math.abs(world.bounds[0]), Math.abs(world.bounds[2])), Math.max(Math.abs(world.bounds[1]), Math.abs(world.bounds[3])));
    const rings = definition.steps.flatMap(step => [step.drop, step.pile, step.place, step.carPlace, ...(step.stops ?? []), ...(step.water ?? [])]).filter(Boolean)
      .filter(ring => Math.hypot(ring.position.x - outpost.x, ring.position.z - outpost.z) < 200);
    assert.ok(rings.length >= 1, `${row.id} goes to ${row.outpostId}`);
    for (const ring of rings) {
      const away = Math.hypot(ring.position.x - outpost.x, ring.position.z - outpost.z);
      assert.ok(away > reach + 3 && away <= 60, `${row.id}: ${ring.id} is ${away.toFixed(0)} m from the middle of ${row.outpostId}`);
    }
  }
  assert.equal(townJobDefinition(townAt(2), 'town-flour-run'), null, 'a job that is not open has no definition');
  // The numbers the card promised: ten sacks of 50 kg out, and a tanker's own 5,600 litres.
  const flour = definitionOf('town-flour-run').steps[0];
  assert.equal(flour.maxKg, 500);
  assert.ok(flour.pile.kg > flour.maxKg, 'there are spare sacks at home');
  const water = definitionOf('town-water-run');
  assert.equal(water.vehicle, 'water-tanker');
  assert.equal(water.steps[0].tank.startL, 5600);
  assert.equal(definitionOf('town-dot-fence').steps[0].stops.filter(stop => stop.rats).length, 2);
  assert.equal(definitionOf('town-dot-fire', 5, {smokeBeaten:true}).steps[0].afterStartLineId, 'dot.fire.cinder', 'Cinder speaks if she has joined');
  assert.equal(definitionOf('town-dot-fire').steps[0].afterStartLineId, undefined);
});

test('the mission card has plain words for every job, and every line a job says exists', () => {
  for (const row of TOWN_JOB_ROWS) {
    assert.ok(TOWN_CAPTIONS[row.card.lineId], `${row.id}: ${row.card.lineId}`);
    for (const line of [...row.card.facts, row.card.later]) plainSentence(line);
    assert.ok(row.card.facts.length >= 3 && row.card.facts.length <= 5, `${row.id} says three to five things`);
  }
  for (const row of TOWN_CHAPTER_JOBS) {
    const town = townFor(row.id), card = townMissionCardModel(town);
    assert.equal(card.jobId, row.id);
    assert.equal(card.title, row.name);
    assert.match(townMissionCardMarkup(card), /GO YOURSELF/);
    for (const [id, text] of Object.entries(townJobDefinition(town, row.id).captions)) {
      assert.ok(TOWN_CAPTIONS[id], id);
      // Imre's line begins with a number in words, which the town's captions write in lower case (question 6 on the card's question page).
      plainSentence(text.replace(/^[^:]+: /, '').replace(/^[a-z]/, letter => id === 'imre.won' ? letter.toUpperCase() : letter));
    }
  }
  for (const [id, line] of Object.entries(TOWN_CAPTIONS)) if (/^(dot|quill|tam|imre|pim|town\.(patch|clear|rescue|fuel|raid))\./.test(id)) plainSentence(line.text.replace('{aground}', 'Thirty-eight'));
});

const jobResult = (jobId, amounts, runId = `run-${jobId}`) => ({runId, jobId, kind:'job', amounts});

test('a job\'s result changes the town exactly once: the chapter, the neighbour, and what came home', () => {
  // Chapter 11: pies on the pile, Dot thinks better of the town, the chapter is done and the next one is named.
  const town = townFor('town-flour-run'), cell = townMissionDropCell(town);
  const flour = jobResult('town-flour-run', {sacks:10, pies:120});
  assert.equal(townMissionResult(town, flour).settled, true);
  assert.equal(stockpileAt(town, cell).pie, 120);
  assert.equal(town.story.completed['town.act2.dot-flour'], true);
  assert.equal(town.story.facts.piesHome, true);
  assert.equal(town.outposts.dot.standing, 10);
  for (let i = 0; i < 3; i++) assert.equal(townMissionResult(town, flour).settled, false, 'the same run never counts twice');
  assert.equal(stockpileAt(town, cell).pie, 120);
  assert.equal(town.outposts.dot.standing, 10);
  assert.equal(townChapterJobOpen(town).id, 'town-dot-fire');
  // Chapter 12: the fire leaves the fact the fence waits for; the fence puts Dot under the town's protection and ends the chapter.
  assert.equal(townMissionResult(town, jobResult('town-dot-fire', {saved:1, waterL:2400})).settled, true);
  assert.equal(town.story.facts.dotFireOut, true);
  assert.notEqual(town.story.completed['town.act2.dot-fire'], true, 'the fire alone does not end the chapter');
  assert.equal(townChapterJobOpen(town).id, 'town-dot-fence');
  assert.equal(townMissionResult(town, jobResult('town-dot-fence', {stops:4})).settled, true);
  assert.equal(town.outposts.dot.protected, true);
  assert.equal(town.story.completed['town.act2.dot-fire'], true);
  // The rest of Act 2, each with its fact.
  for (const [jobId, amounts, fact] of [['town-chalk-run', {kg:320}, 'schoolSupplied'], ['town-goats', {saltKg:200, goats:7}, 'goatsHome'],
    ['town-water-run', {litres:5600}, 'saltTraded'], ['town-water-crane', {bolts:3}, 'trainSeen']]) {
    assert.equal(townMissionResult(town, jobResult(jobId, amounts)).settled, true, jobId);
    assert.equal(town.story.facts[fact], true, fact);
  }
  assert.deepEqual(ACT2.map(chapter => town.story.completed[chapter]), ACT2.map(() => true));
  assert.equal(town.missions.totals['town-goats'].goats, 7);
  assert.equal(town.missions.totals['town-water-run'].litres, 5600);
  // A run that brought nothing home is recorded, and the chapter stays open.
  const empty = townFor('town-flour-run');
  assert.equal(townMissionResult(empty, jobResult('town-flour-run', {sacks:0, pies:0})).settled, true);
  assert.notEqual(empty.story.completed['town.act2.dot-flour'], true);
});

test('only a clear result is taken, and a refused one changes nothing', () => {
  const town = townFor('town-flour-run'), before = serializeTown(town);
  for (const bad of [{sacks:11, pies:0}, {sacks:-1, pies:0}, {sacks:1.5, pies:0}, {sacks:10, pies:999}, {goats:3}, {sacks:'10', pies:0}, null])
    assert.equal(townMissionResult(town, jobResult('town-flour-run', bad, 'run-bad')).ok, false, JSON.stringify(bad));
  assert.equal(townMissionResult(town, jobResult('town-no-such-job', {})).ok, false);
  assert.equal(townMissionResult(town, {...jobResult('town-flour-run', {sacks:10, pies:120}), runId:''}).ok, false);
  assert.equal(serializeTown(town), before);
  // An unfinished job hands the town nothing.
  const definition = townJobDefinition(town, 'town-flour-run');
  assert.equal(townJobResult({definition, job:{done:false}, townResults:{}}, 'run-x'), null);
  assert.equal(townJobResult({definition, job:{done:true}, townResults:{out:{deliveredKg:500}}}, 'run-x'), null, 'half a trade is not a trade');
  assert.deepEqual(townJobResult({definition, job:{done:true}, townResults:{out:{deliveredKg:450}, back:{deliveredKg:54}}}, 'run-x'),
    {runId:'run-x', jobId:'town-flour-run', kind:'job', amounts:{sacks:9, pies:108}});
});

test('a town saved before this card loads unchanged, reading the jobs writes nothing, and the new records survive a save', () => {
  const fixture = readFileSync(new URL('./fixtures/town/town-v1.json', import.meta.url), 'utf8');
  const old = deserializeTown(fixture), before = serializeTown(old);
  openTownJobs(old); townMissionCardModel(old); townChapterJobOpen(old);
  for (const row of TOWN_JOB_ROWS) townJobDefinition(old, row.id);
  assert.equal(serializeTown(old), before, 'reading the jobs and the card writes nothing to an old town');
  for (const row of TOWN_CHAPTER_JOBS) {
    const town = townFor(row.id), untouched = serializeTown(town);
    openTownJobs(town); townMissionCardModel(town); townJobDefinition(town, row.id);
    assert.equal(serializeTown(town), untouched, `${row.id}: opening and building it writes nothing`);
  }
  const town = townFor('town-flour-run');
  for (let i = 0; i < 30; i++) stepTown(town);
  townMissionResult(town, jobResult('town-flour-run', {sacks:10, pies:120}, 'run-save'));
  townMissionResult(town, jobResult('town-dot-fire', {saved:1, waterL:1800}, 'run-save-2'));
  townMissionResult(town, jobResult('town-dot-fence', {stops:4}, 'run-save-3'));
  const loaded = deserializeTown(serializeTown(town));
  assert.deepEqual(loaded, town);
  assert.equal(townMissionResult(loaded, jobResult('town-flour-run', {sacks:10, pies:120}, 'run-save')).settled, false, 'settled before the save is settled after it');
  assert.equal(loaded.outposts.dot.protected, true);
  assert.equal(townChapterJobOpen(loaded).id, 'town-chalk-run', 'and the school is next');
});

// ---- The child-pace driver ---------------------------------------------------------------------------------------------------
// A seeded driver at a child's pace, run against the real job engine and the real step rules (question 1 on the card's
// question page). It is a point with a heading: it cruises at 36 to 46 km/h, pulls away and brakes as a loaded truck does,
// steers late and unevenly, speeds for a few seconds now and then, and takes a knock of up to 40 km/h every minute or so.
// It reads only what a player reads (the marker and the step's own state), stops in rings, holds H at a fire and F at a
// joint (letting go now and then), and meets Rats as the game's raiders behave: they stand where they are asked for, stop the
// work while they are near, knock a driver on foot down now and then, fall to a car that drives at them, and are taken away
// when the step sends them away. A win is a job that ends and whose one result the town accepts.
const DT = .1, HOME = {x:26, z:15};
const at = value => value?.position ?? value ?? {};
function childRun(definition, seed, {difficulty = 'easy', minutes = 45} = {}) {
  const rng = makeRng(seed * 977 + 13);
  let job = createJob(definition, definition.seed ?? seed);
  const car = {x:HOME.x, z:HOME.z, heading:0, mps:0};
  const cruise = (36 + rng.int(0, 10)) / 3.6, waitsForRats = rng.float() < .5, careful = rng.float() < .5;
  let pushing = null, chosen = null;
  let onFoot = false, walker = null, downFor = 0, marker = null, follow = null, results = {}, actors = [], lastKmh = 0;
  let nextKnock = 30 + rng.float() * 60, speedingUntil = -1, nextSpeeding = 40 + rng.float() * 40, wobble = 0, nextWobble = 0, letGoUntil = -1, nextLetGo = 4 + rng.float() * 4;
  const heard = [], said = [];
  let t = 0;
  const gapTo = point => Math.hypot(at(point).x - car.x, at(point).z - car.z);
  // Drive toward a point at a wanted speed (m/s); `stopWithin` is the distance inside which the driver stops.
  const drive = (point, {stopWithin = 0, top = cruise, crawl = false} = {}) => {
    const target = at(point), distance = gapTo(target);
    if (t >= nextWobble) { wobble = (rng.float() - .5) * .3; nextWobble = t + .25; }
    const want = Math.atan2(target.x - car.x, target.z - car.z) + (distance > 15 ? wobble : 0);
    let turn = want - car.heading;
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn < -Math.PI) turn += 2 * Math.PI;
    const rate = Math.max(.6, car.mps / 9);
    car.heading += Math.max(-rate * DT, Math.min(rate * DT, turn));
    const speeding = t < speedingUntil ? 1.25 : 1;
    let speed = distance <= stopWithin ? 0 : Math.min((crawl ? 12 / 3.6 : top) * speeding, Math.max(1.7, (distance - stopWithin) * .125));
    if (Math.abs(turn) > 1.2) speed = Math.min(speed, distance < 20 ? 1 : 3);
    car.mps = speed > car.mps ? Math.min(speed, car.mps + 1.2 * DT) : Math.max(speed, car.mps - 3.5 * DT);
    car.x += Math.sin(car.heading) * car.mps * DT; car.z += Math.cos(car.heading) * car.mps * DT;
  };
  const stop = () => { car.mps = Math.max(0, car.mps - 3.5 * DT); car.x += Math.sin(car.heading) * car.mps * DT; car.z += Math.cos(car.heading) * car.mps * DT; };
  const standing = () => actors.filter(actor => actor.rat && actor.health > 0);
  for (; t < minutes * 60 && !job.done; t += DT) {
    const step = job.steps[job.stepIndex], state = job.stepState;
    if (t >= nextSpeeding) { speedingUntil = t + 4; nextSpeeding = t + 40 + rng.float() * 40; }
    const ratsNear = standing().filter(actor => Math.hypot(actor.position.x - (walker ?? car).x, actor.position.z - (walker ?? car).z) <= 30);
    let spray = false, interact = false;
    // -- what the driver does this tick --
    if (onFoot) {
      if (downFor > 0) downFor -= DT;
      else if (marker) {
        const target = at(marker), distance = Math.hypot(target.x - walker.x, target.z - walker.z);
        if (distance > 1) { walker.x += (target.x - walker.x) / distance * 3 * DT; walker.z += (target.z - walker.z) / distance * 3 * DT; }
        if (t >= nextLetGo) { letGoUntil = t + .6; nextLetGo = t + 4 + rng.float() * 4; }
        interact = distance <= 2 && t >= letGoUntil;
        // A Rat near a driver on foot knocks them down now and then.
        if (ratsNear.length && rng.float() < .05 * DT * ratsNear.length) downFor = 2.5;
      }
    } else if (step.kind === 'haul') {
      if (state.phase === 'loading' && !state.full) stop();
      else if (state.phase === 'loading') drive(step.drop);
      else if (state.phase === 'unloading') stop();
      else drive(state.phase === 'carry' ? step.drop : step.pile, {stopWithin:(state.phase === 'carry' ? step.drop : step.pile).radius * .5});
    } else if (step.kind === 'douse') {
      const fire = step.buildings.find(building => building.id === state.markId) ?? step.buildings[0], water = step.water.find(point => point.id === state.markId);
      if (water) { if (gapTo(water) <= 4) stop(); else drive(water, {stopWithin:3}); }
      else {
        drive(fire, {stopWithin:fire.radius + 8});
        spray = gapTo(fire) <= fire.radius + 14 && douseAim(fire, car, car.heading, difficulty) > 0;
      }
    } else if (step.kind === 'repair' && state.phase !== 'drive' && state.phase !== undefined) {
      stop();
      if (car.mps === 0) { onFoot = true; walker = {x:car.x, z:car.z}; }
    } else if (ratsNear.length && !waitsForRats && ['hold', 'fence', 'escort'].includes(step.kind)) {
      drive(ratsNear[0].position, {top:8});
    } else if (step.kind === 'clear' && state.wrecks) {
      // The driver picks the nearest wreck and stays with it until it is dealt with.
      const left = state.wrecks.filter(item => !item.cleared);
      const wreck = left.find(item => item.id === chosen) ?? left.reduce((best, item) => !best || gapTo(item) < gapTo(best) ? item : best, null);
      if (wreck?.id !== chosen) { chosen = wreck?.id ?? null; pushing = null; }
      if (!wreck) stop();
      else if (!careful) {
        // The quick way: straight at it without slowing, which flattens it.
        const distance = gapTo(wreck) || 1;
        drive({x:wreck.x + (wreck.x - car.x) / distance * 200, z:wreck.z + (wreck.z - car.z) / distance * 200});
      } else {
        // The careful way: line up on the road's middle side of the wreck, then push it over the nearer edge, steering to keep
        // it going outward.
        const line = step.line, dx = line.at(-1).x - line[0].x, dz = line.at(-1).z - line[0].z, length = Math.hypot(dx, dz) || 1;
        const nx = dz / length, nz = -dx / length, side = ((wreck.x - line[0].x) * nx + (wreck.z - line[0].z) * nz) >= 0 ? 1 : -1;
        const staging = {x:wreck.x - nx * side * 10, z:wreck.z - nz * side * 10};
        if (gapTo(staging) < 4) pushing = wreck.id;
        else if (gapTo(wreck) > 14) pushing = null;
        if (pushing !== wreck.id) drive(staging, {top:6});
        else drive({x:wreck.x + nx * side * 8, z:wreck.z + nz * side * 8}, {crawl:true});
      }
    } else if (step.kind === 'escort' || step.kind === 'chase') {
      const truck = actors.find(actor => actor.id === (step.actorId ?? step.targetId));
      if (truck) drive(truck.position, {stopWithin:step.kind === 'escort' ? 14 : 0, top:step.kind === 'chase' ? cruise * 1.05 : cruise});
      else drive(marker ?? HOME);
    } else if (marker) {
      const radius = at(marker) === marker ? 4 : marker.radius ?? 8, inside = gapTo(marker) <= radius * .5;
      if (inside) stop(); else drive(marker, {stopWithin:radius * .4});
    } else stop();
    // A Rat that a car drives at goes down (the mode's run-down rule: within 2.2 m at 4 m/s or more).
    if (!onFoot && car.mps >= 4) for (const actor of standing()) if (Math.hypot(actor.position.x - car.x, actor.position.z - car.z) <= 2.2) actor.health = 0;
    // -- the world moves --
    if (follow) {
      // Only the current step's own truck moves, as in the mode: a truck whose step is over stays where it stopped.
      const actor = step.actor ? actors.find(item => item.id === follow.actorId && item.id === step.actor.id) : null;
      const path = (step.actor?.path ?? []).map(at);
      if (actor && path.length) {
        const index = Math.min(actor.pathIndex ?? 0, path.length - 1), target = path[index], distance = Math.hypot(target.x - actor.position.x, target.z - actor.position.z);
        const travel = Math.max(0, follow.speed ?? 0) * DT;
        if (distance <= travel || distance < .01) {
          actor.position = {x:target.x, z:target.z};
          actor.pathIndex = Math.min(index + 1, path.length - 1);
          if (index >= path.length - 1) actor.atDestination = true;
        } else { actor.position.x += (target.x - actor.position.x) / distance * travel; actor.position.z += (target.z - actor.position.z) / distance * travel; }
        // Rats standing within 30 m of an escorted truck wear her down (the mode's rule: 1.5 a second each on Easy, 5 on Medium).
        if (step.kind === 'escort') for (const rat of standing()) if (Math.hypot(rat.position.x - actor.position.x, rat.position.z - actor.position.z) <= 30)
          actor.health = Math.max(0, actor.health - (difficulty === 'easy' ? 1.5 : 5) * DT);
      }
    }
    const kmh = car.mps * 3.6;
    let hitKmh = 0;
    if (!onFoot && kmh > 15 && t >= nextKnock) { hitKmh = 8 + rng.float() * 32; nextKnock = t + 30 + rng.float() * 60; car.mps = Math.max(0, car.mps - hitKmh / 3.6 * .5); }
    const target = step.targetId ? actors.find(actor => actor.id === step.targetId) : null;
    const contact = target && Math.hypot(target.position.x - car.x, target.position.z - car.z) <= (step.contactRadius ?? 3) ? target.id : null;
    const view = {player:{position:{x:car.x, z:car.z}, speed:onFoot ? 0 : kmh / 1.609344}, speedKmh:onFoot ? 0 : kmh, hitKmh, severeHit:false, difficulty, onFoot,
      fighter:onFoot ? {position:{x:walker.x, z:walker.z}, knockedDown:downFor > 0} : null, carPosition:{x:car.x, z:car.z}, interact, controls:{spray}, heading:car.heading,
      roughness:0, actors:actors.map(actor => ({id:actor.id, position:{...actor.position}, health:actor.health, pathIndex:actor.pathIndex, atDestination:actor.atDestination,
        pathProgress:actor.atDestination ? 1 : 0})), contact, waveCleared:[]};
    lastKmh = kmh;
    job = stepJob(job, view, DT);
    results = keepTownStepResults(results, step, job.events);
    heard.push(...job.events.map(event => event.type));
    for (const request of job.requests) {
      if (request.type === 'marker') marker = request.place ?? null;
      else if (request.type === 'say' && request.lineId) said.push(request.lineId);
      else if (request.type === 'follow') follow = {...request, actorId:request.actorId ?? step.actorId ?? step.targetId};
      else if (request.type === 'spawnWave' && request.ambush && !actors.some(actor => actor.key === request.key)) {
        const place = at(request.at);
        for (let i = 0; i < request.n; i++) actors.push({id:`${request.key}:${i}`, key:request.key, rat:true, health:100,
          position:{x:place.x + (i % 2 ? -6 : 6), z:place.z + (i - (request.n - 1) / 2) * 2}});
      } else if (request.type === 'clearWave') actors = actors.filter(actor => actor.key !== request.key);
    }
    // A step's own truck appears where its road begins.
    const next = job.steps[job.stepIndex];
    if (next?.actor && !actors.some(actor => actor.id === next.actor.id)) {
      const start = at(next.actor.start ?? next.actor.path[0]);
      actors.push({id:next.actor.id, health:next.actor.health ?? 100, position:{x:start.x, z:start.z}, pathIndex:0});
    }
    if (job.stepIndex !== job.steps.indexOf(step) && onFoot && next && next.kind !== 'repair') { onFoot = false; walker = null; }
  }
  return {won:job.done, job, definition, results, heard, said, minutes:t / 60, actors,
    result:job.done ? townJobResult({definition, job, townResults:results, actors}, `child-${definition.id}-${seed}`) : null};
}

// Ten runs of one job on Easy; at least eight must end with a result the town accepts.
function proveOnEasy(jobId, {makeDefinition = seed => definitionOf(jobId, seed), check = () => {}} = {}) {
  const runs = Array.from({length:10}, (_, index) => childRun(makeDefinition(index + 1), index + 1));
  const settled = runs.map(run => run.result ? townMissionResult(townFor(jobId), run.result) : null);
  const wins = runs.filter((run, index) => run.won && settled[index]?.settled === true).length;
  console.log(`child pace on Easy, ${jobId}: ${wins} of 10 in ${runs.map(run => run.minutes.toFixed(1)).join(', ')} minutes.`);
  assert.ok(wins >= 8, `${jobId}: ${wins} of 10`);
  check(runs);
  return runs;
}

test('child pace on Easy: the flour run and the chalk run are won at least 8 times in 10', () => {
  proveOnEasy('town-flour-run', {check(runs) {
    const best = runs.find(run => run.won);
    assert.ok(best.result.amounts.sacks >= 1 && best.result.amounts.sacks <= 10);
    assert.equal(best.result.amounts.pies % 12, 0, 'pies come by the dozen');
    for (const line of ['dot.flour.dot', 'dot.flour.won', 'dot.flour.pies']) assert.ok(best.said.includes(line), line);
    assert.ok(runs.every(run => run.minutes < 30), 'out and back in under half an hour at a child\'s pace');
  }});
  proveOnEasy('town-chalk-run', {check(runs) {
    assert.ok(runs.find(run => run.won).said.includes('quill.bo'), 'Bo asks if he can drive it');
  }});
});

test('child pace on Easy: Dot\'s fire is put out and the Rats are seen off, then her fence goes up, at least 8 times in 10', () => {
  proveOnEasy('town-dot-fire', {check(runs) {
    assert.ok(runs.filter(run => run.result?.amounts.saved === 1).length >= 8, 'the diner is saved');
    assert.ok(runs.some(run => run.heard.includes('ratsCame')) && runs.some(run => run.heard.includes('ratsGone')));
    assert.ok(runs.some(run => run.heard.filter(type => type === 'ratsGone').length && run.actors.length === 0), 'the Rats are gone at the end');
  }});
  proveOnEasy('town-dot-fence', {check(runs) {
    assert.ok(runs.every(run => !run.won || run.result.amounts.stops === 4));
    assert.ok(runs.some(run => run.heard.filter(type => type === 'ratsCame').length === 2), 'Rats at two of the four stops');
  }});
});

test('child pace on Easy: the goats come down, once in the lent show truck; the tanker fills Deck Town; Pim\'s crane swings', () => {
  // "Up to the goats" must never stop a driver: with neither the Titan nor the rally car, Big Mo's show truck is lent for the run.
  const owned = ['falcone_f42'], profile = JSON.stringify({cars:owned, chosen:'falcone_f42'});
  const lentRun = jobForRun(definitionOf('town-goats', 1), {chosenCar:'falcone_f42', owns:id => owned.includes(id)});
  assert.equal(lentRun.refused, null);
  assert.equal(lentRun.car, 'titan_monster');
  assert.equal(lentRun.job.vehicleLent.lineId, null, 'the loan is not said twice');
  assert.equal(JSON.stringify({cars:owned, chosen:'falcone_f42'}), profile, 'a loan writes nothing');
  proveOnEasy('town-goats', {makeDefinition:seed => seed === 1 ? lentRun.job : jobForRun(definitionOf('town-goats', seed), {chosenCar:'dusthawk_rally', owns:() => true}).job,
    check(runs) {
      assert.ok(runs[0].won, 'the lent truck finishes it');
      assert.ok(runs[0].said.includes('tam.tam.lent') && !runs[0].said.includes('tam.tam'), 'the lent line is said in place of the other');
      assert.ok(runs[1].said.includes('tam.tam') && !runs[1].said.includes('tam.tam.lent'), 'an owner hears the ordinary line');
      assert.ok(runs.filter(run => run.won).every(run => run.result.amounts.goats >= 1 && run.result.amounts.goats <= 8));
    }});
  // Running the lent definition again for a driver who now owns the rally car chooses afresh, with the job's own line back.
  const again = jobForRun(lentRun.job, {chosenCar:'dusthawk_rally', owns:() => true});
  assert.equal(again.car, 'dusthawk_rally');
  assert.equal(again.job.steps[0].startLineId, 'tam.tam');
  assert.equal(again.job.vehicleLent, undefined);
  proveOnEasy('town-water-run', {check(runs) {
    assert.ok(runs.filter(run => run.won).every(run => run.result.amounts.litres === 5600));
    assert.ok(runs.find(run => run.won).said.includes('imre.salt'));
  }});
  proveOnEasy('town-water-crane', {check(runs) {
    assert.ok(runs.filter(run => run.won).every(run => run.result.amounts.bolts === 3));
    for (const line of ['pim.fix', 'pim.crane', 'pim.night', 'pim.hook']) assert.ok(runs.find(run => run.won).said.includes(line), line);
  }});
});

// ---- The one scripted drive ------------------------------------------------------------------------------------------------
// The water run, driven for real through the game's physics and the World Job mode: the tanker from the truck bay down the
// Salt Road to Deck Town at a child's pace, stopped in the ring until the pump has emptied it. It proves the new steps are
// joined to the game: the marker, the weight of the water on the truck, the result kept for the town.
import {Duel} from '../src/game.js';
import {setScablandsTownLayout, clearScablandsTownLayout} from '../src/world/scablands-ground.js';
import {cleanupWorldJobLoan} from '../src/arena/modes/world-job.js';
import {routeFor, nearestOnLine} from '../src/world/scablands-ways.js';
import {wrapHeading} from '../src/offroad-physics.js';

test('the water run is driven for real: a full tanker to Deck Town, lighter as it empties, and the town gets its result', () => {
  const seed = 1, step = 1 / 120, town = townFor('town-water-run', seed), definition = townJobDefinition(town, 'town-water-run', {seed});
  const duel = new Duel({seed:1989 + seed, featureFlags:{'wasteland-town':true}});
  duel.state.wastelandGateDiscovered = true;
  setScablandsTownLayout(definition.layout);
  try {
    assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', job:definition}), true);
    duel.state.cpuDifficulty = 'easy';
    while (duel.state.status === 'countdown') duel.step(step);
    const worldJob = () => duel.state.arena.worldJob;
    assert.equal(worldJob().vehicle.id, 'water-tanker');
    const fullMass = worldJob().vehicle.massKg;
    assert.equal(worldJob().vehicle.tankL, 5600, 'she sets off full');
    const pose = () => { const s = duel.state, p = duel.course.worldAt(s.s, s.lateral); return {x:p.x, z:p.z, heading:duel.course.at(s.s).heading + s.headingError}; };
    const rng = makeRng(seed * 977 + 13), cruise = 38 + rng.int(0, 6), ring = definition.steps[0].place;
    const path = routeFor([{road:'salt-road'}], {start:pose(), destination:ring.position});
    const late = [], heard = [], markers = [];
    let steer = 0, arrivedAt = null, halfMass = null;
    for (let t = 0; t < 1500 && duel.state.status === 'racing'; t += step) {
      const state = worldJob().job.stepState, p = pose();
      late.push(p); if (late.length > 24) late.shift();
      const seen = late[0], near = nearestOnLine(path, seen.x, seen.z);
      let ahead = near.along + 22, sum = 0, target = path.at(-1);
      for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i], b = path[i + 1], span = Math.hypot(b.x - a.x, b.z - a.z);
        if (sum + span >= ahead) { const k = (ahead - sum) / span; target = {x:a.x + (b.x - a.x) * k, z:a.z + (b.z - a.z) * k}; break; }
        sum += span;
      }
      const error = wrapHeading(Math.atan2(target.x - seen.x, target.z - seen.z) - seen.heading);
      const distance = Math.hypot(ring.position.x - p.x, ring.position.z - p.z), kmh = duel.state.speedMph * 1.609344;
      const speed = state.arrived ? 0 : Math.min(cruise, distance < ring.radius * .5 ? 0 : Math.max(6, distance * .45));
      if (state.arrived) arrivedAt ??= duel.state.stageTimeSec;
      if (state.share >= .5) halfMass ??= worldJob().vehicle.massKg;
      if (Math.round(t / step) % 30 === 0) steer = -error * 2 + (rng.float() - .5) * .2;
      duel.setInput({throttle:kmh < speed - 2 ? 1 : 0, brake:kmh > speed + 3 || speed === 0 && kmh > .3 ? 1 : 0, steer:Math.max(-1, Math.min(1, steer)), boost:false});
      duel.step(step);
      heard.push(...worldJob().job.events.map(event => event.type));
      if (worldJob().marker && !markers.length) markers.push(worldJob().marker);
    }
    const job = worldJob();
    assert.equal(duel.state.arena.result?.winnerId, 'player', `the job is won (${(duel.state.stageTimeSec / 60).toFixed(1)} minutes, share ${job.job.stepState.share})`);
    console.log(`the water run, driven: ${(arrivedAt / 60).toFixed(1)} minutes to Deck Town, ${(duel.state.stageTimeSec / 60).toFixed(1)} in all.`);
    assert.ok(arrivedAt < 10 * 60, 'Deck Town in under ten minutes at a child\'s pace');
    assert.ok(heard.includes('holdStarted') && heard.includes('holdDone'));
    assert.equal(markers[0].id, 'deck-town', 'the marker is the ring at Deck Town');
    assert.ok(halfMass < fullMass - 2500 && job.vehicle.massKg < fullMass - 5500, `the water is weight: ${fullMass} kg full, ${halfMass} kg half empty, ${job.vehicle.massKg} kg empty`);
    assert.equal(job.vehicle.tankL, 0);
    assert.equal(job.townSentence, '5,600 litres pumped.');
    const result = townJobResult(job, 'drive-water');
    assert.deepEqual(result, {runId:'drive-water', jobId:'town-water-run', kind:'job', amounts:{litres:5600}});
    assert.equal(townMissionResult(town, result).settled, true);
    assert.equal(town.story.completed['town.act2.imre'], true);
  } finally { cleanupWorldJobLoan(duel); clearScablandsTownLayout(); }
});

// ==== Section 7's jobs that come round again ==================================================================================
import {stepEscort} from '../src/world/jobs/steps/escort.js';

test('the jobs that come round again open from the town\'s own facts, and stay away for their days once done', () => {
  const young = townAt(9, {done:ACT2});
  assert.deepEqual(openTownJobs(young).map(job => job.id), ['town-road-clear', 'town-fuel-escort', 'town-truck-raid', 'town-salvage-run']);
  const piped = townAt(9, {done:ACT2, known:{towerRunning:true}});
  assert.ok(openTownJobs(piped).some(job => job.id === 'town-pipe-patch'), 'a leak needs pipes');
  assert.equal(openTownJobs(townAt(2)).some(job => TOWN_REPEAT_JOBS.some(row => row.id === job.id)), false, 'none before the neighbours');
  // The rescue is open only while a dust storm's report is unanswered, and bringing them home answers it.
  assert.equal(openTownJobs(piped).some(job => job.id === 'town-storm-rescue'), false);
  const stormy = townFor('town-storm-rescue');
  assert.equal(openTownJobs(stormy)[0].id, 'town-storm-rescue', 'people out in the dust come first');
  assert.equal(townMissionResult(stormy, jobResult('town-storm-rescue', {people:3})).settled, true);
  assert.equal(stormy.reports.find(report => report.eventId === 'dust-storm').unanswered, false);
  assert.equal(stormy.reports.find(report => report.eventId === 'dust-storm').answerId, 'shelter');
  assert.equal(openTownJobs(stormy).some(job => job.id === 'town-storm-rescue'), false);
  // Done today, the road is clear for 120 days and then blocked again.
  const town = townFor('town-road-clear');
  assert.equal(townMissionResult(town, jobResult('town-road-clear', {wrecks:6})).settled, true);
  assert.equal(openTownJobs(town).some(job => job.id === 'town-road-clear'), false);
  town.tick += BigInt(24 * 119);
  assert.equal(openTownJobs(town).some(job => job.id === 'town-road-clear'), false);
  town.tick += BigInt(24);
  assert.equal(openTownJobs(town).some(job => job.id === 'town-road-clear'), true);
  assert.deepEqual(town.missions.totals['town-road-clear'], {runs:1, lastTick:String(BigInt(YEAR_TICKS * 8)), wrecks:6});
});

test('what the road fights bring home goes on the town\'s pile: fuel by the litre, loot by the kilogram', () => {
  const town = townFor('town-fuel-escort'), cell = townMissionDropCell(town);
  assert.equal(townMissionResult(town, jobResult('town-fuel-escort', {fuelL:1700, stolen:0})).settled, true);
  assert.equal(stockpileAt(town, cell).fuel, 1700);
  assert.equal(townMissionResult(town, jobResult('town-truck-raid', {lootKg:3000})).settled, true);
  assert.equal(stockpileAt(town, cell).salvage, 3000);
  for (const bad of [{fuelL:2001, stolen:0}, {fuelL:100, stolen:2}, {lootKg:3001}])
    assert.equal(townMissionResult(town, jobResult('town-fuel-escort', bad, 'run-bad-fuel')).ok, false, JSON.stringify(bad));
  const loaded = deserializeTown(serializeTown(town));
  assert.deepEqual(loaded, town);
  for (const row of TOWN_REPEAT_JOBS) {
    const fresh = townFor(row.id), before = serializeTown(fresh), definition = townJobDefinition(fresh, row.id, {seed:4});
    assert.ok(definition, row.id);
    assert.doesNotThrow(() => createJob(definition, 4));
    assert.deepEqual(townJobDefinition(fresh, row.id, {seed:4}).steps, definition.steps, 'repeatable from the town and the seed');
    const card = townMissionCardModel(fresh);
    assert.equal(serializeTown(fresh), before, `${row.id}: opening and building it writes nothing`);
    if (openTownJobs(fresh)[0].id === row.id) assert.equal(card.title, row.name);
    for (const [id, text] of Object.entries(definition.captions)) { assert.ok(TOWN_CAPTIONS[id], id); plainSentence(text.replace(/^[^:]+: /, '')); }
  }
  assert.equal(townJobDefinition(townFor('town-fuel-escort'), 'town-fuel-escort').side, 'defend');
  assert.equal(townJobDefinition(townFor('town-truck-raid'), 'town-truck-raid').side, 'attack', 'the same fight from the other side');
});

test('a fuel truck hurt badly enough is taken: the escort ends there and the job goes on as a chase', () => {
  const definition = townJobDefinition(townFor('town-fuel-escort'), 'town-fuel-escort', {seed:2}), [escort, chase] = definition.steps;
  const truckAt = (health, extra = {}) => ({id:'fuel-truck', position:{...at(escort.path[3])}, health, pathIndex:4, ...extra});
  const fine = stepEscort(escort, {}, view(0, 0, {actors:[truckAt(80)]}), .1);
  assert.equal(fine.complete, false);
  assert.equal(fine.goto, undefined);
  const taken = stepEscort(escort, fine.state, view(0, 0, {actors:[truckAt(30)]}), .1);
  assert.equal(taken.complete, true);
  assert.equal(taken.goto, 'chase');
  assert.deepEqual(taken.events.map(event => event.type), ['escortStolen']);
  assert.ok(taken.requests.some(request => request.type === 'say' && request.lineId === 'town.fuel.stolen'));
  assert.deepEqual(taken.closingLines, [], 'nobody says the fuel is in');
  assert.equal(stepEscort(escort, taken.state, view(0, 0, {actors:[truckAt(60)]}), .1).goto, 'chase', 'taken is taken');
  // On the engine: arriving whole ends the job without the chase; being taken goes to it.
  let job = createJob(definition, 2);
  for (let t = 0; t < 30 && !job.done; t += .1) job = stepJob(job, view(0, 0, {actors:[truckAt(90, {atDestination:true})]}), .1);
  assert.equal(job.done, true, 'home whole: no chase');
  job = createJob(definition, 2);
  for (let t = 0; t < 30 && job.stepIndex === 0; t += .1) job = stepJob(job, view(0, 0, {actors:[truckAt(20)]}), .1);
  assert.equal(job.steps[job.stepIndex].id, 'chase');
  assert.equal(chase.targetId, 'fuel-truck');
  // What the town gets is the fuel she still has.
  const done = {definition, job:{done:true}, townResults:{escort:{kind:'escort', stolen:true}}, actors:[{id:'fuel-truck', health:24}]};
  assert.deepEqual(townJobResult(done, 'run-fuel').amounts, {fuelL:480, stolen:1});
  assert.deepEqual(townJobResult({...done, townResults:{}, actors:[{id:'fuel-truck', health:85}]}, 'run-fuel').amounts, {fuelL:1700, stolen:0});
});

test('child pace on Easy: the rescue in the dust, the pipe patch and the road clear are won at least 8 times in 10', () => {
  proveOnEasy('town-storm-rescue', {check(runs) {
    assert.ok(runs.filter(run => run.won).every(run => run.result.amounts.people === 3));
    assert.ok(runs.find(run => run.won).said.includes('town.rescue.one'));
  }});
  proveOnEasy('town-pipe-patch', {check(runs) {
    assert.ok(runs.filter(run => run.won).every(run => run.result.amounts.joints === 3));
    assert.ok(runs.every(run => run.heard.includes('ratsCame')), 'the Rats come every time');
    assert.ok(runs.some(run => run.heard.includes('repairDown')), 'and somebody gets knocked down and still finishes');
  }});
  proveOnEasy('town-road-clear', {check(runs) {
    assert.ok(runs.filter(run => run.won).every(run => run.result.amounts.wrecks === 4), 'four wrecks on Easy');
    assert.ok(runs.some(run => run.heard.includes('clearOff')) && runs.some(run => run.heard.includes('clearCrushed')), 'pushed off by some, flattened by others');
  }});
});

test('child pace on Easy: the fuel escort and the truck raid are won at least 8 times in 10; on Medium a taken truck is caught', () => {
  proveOnEasy('town-fuel-escort', {check(runs) {
    assert.ok(runs.filter(run => run.won).every(run => run.result.amounts.fuelL > 0 && run.result.amounts.fuelL <= 2000));
    assert.ok(runs.some(run => run.heard.includes('ratsCame') === false && run.said.includes('town.fuel.raid')), 'the Rats by the road are the escort\'s own ambushes');
  }});
  proveOnEasy('town-truck-raid', {check(runs) {
    assert.ok(runs.filter(run => run.won).every(run => run.result.amounts.lootKg === 3000));
    assert.ok(runs.find(run => run.won).said.includes('town.raid.stopped'));
  }});
  // Medium: a driver who only follows lets the Rats hurt her until they take her, then chases her down and gets some of it back.
  const taken = Array.from({length:6}, (_, index) => childRun(definitionOf('town-fuel-escort', index + 1), index + 1, {difficulty:'medium'}))
    .find(run => run.heard.includes('escortStolen'));
  assert.ok(taken, 'on Medium the truck is taken from a driver who does not fight');
  assert.equal(taken.won, true, 'and the chase is won');
  assert.equal(taken.result.amounts.stolen, 1);
  assert.ok(taken.result.amounts.fuelL > 0 && taken.result.amounts.fuelL <= 600, `some of it comes home (${taken.result.amounts.fuelL} L)`);
  assert.ok(taken.said.includes('town.fuel.stolen') && taken.said.includes('town.fuel.back') && !taken.said.includes('town.fuel.won'));
});

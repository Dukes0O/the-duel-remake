// Slow Ride rules, without a scripted drive or persistent storage.
import assert from 'node:assert/strict';
import {EVERBURN_JOBS, REMADE_EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {GAS_LOAD_RULE, GAS_LOAD_LINES, gasLoadBlocks} from '../src/world/jobs/gas-load-rule.js';
import {burnBarricades} from '../src/world/jobs/barricade.js';
import {createKnowledge, jobFacts, learn} from '../src/world/scablands-map.js';
import {alongPath, metresAtPlace} from '../src/world/jobs/steps/escort.js';
import {stepEscort} from '../src/world/jobs/steps/escort.js';
import {worldHudModel, drawGasGauge} from '../src/world/world-hud.js';
import {Duel} from '../src/game.js';
import {worldJobHitTargets} from '../src/arena/modes/world-job.js';

const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-slow-ride');
const step = definition.steps[0], road = ROAD_NET.road('tin-road');
assert.equal(REMADE_EVERBURN_JOBS.includes(definition.id), false, 'Unfinished job stays hidden.');
assert.equal(step.gasLoad, true);
assert.deepEqual(step.path.map(place => ({x: place.position.x, z: place.position.z})), road.points);
assert.equal(step.speed * 3.6, GAS_LOAD_RULE.speedKmh);
assert.ok(Math.abs(Math.hypot(step.carStart.x - step.path[0].position.x,
  step.carStart.z - step.path[0].position.z) - 60) < .1);
const truck = {id: step.actorId, health: 100, position: step.path[0].position, pathIndex: 1};
let job = createJob(definition, 7);
const tick = (position, speedKmh = 0, onFoot = false, dt = .1) => {
  job = stepJob(job, {player: {position}, speedKmh, onFoot, actors: [truck]}, dt);
  return job.requests;
};
const followSpeed = requests => requests.find(request => request.type === 'follow')?.speed;
assert.equal(followSpeed(tick(step.carStart)), 0, 'Bess waits before the meeting.');
assert.equal(job.stepState.gasMeeting, undefined);
assert.equal(job.stepState.gas, 100, 'The tank starts full before the meeting.');
assert.equal(job.stepState.holes, 0);
assert.equal(followSpeed(tick(step.meeting.position, 10)), 0, 'Driving through does not start it.');
assert.equal(job.stepState.gasMeeting, undefined);
tick(step.meeting.position, 0, true);
assert.equal(job.stepState.gasMeeting, undefined, 'Walking into the ring does not start it.');
const heard = [];
let requests = tick(step.meeting.position);
for (let i = 0; i < 110; i++) {
  heard.push(...requests.filter(request => request.type === 'say').map(request => request.lineId));
  if (!job.stepState.gasLoaded) assert.equal(followSpeed(requests), 0, 'Bess waits for all four lines.');
  requests = tick(step.meeting.position);
}
assert.deepEqual(heard, [...Object.keys(GAS_LOAD_LINES), 'story.ember.moss.1']);
assert.equal(job.stepState.gasLoaded, true);
assert.equal(followSpeed(requests), 32 / 3.6);
assert.ok(!requests.some(request => request.type === 'say'), 'The meeting does not repeat.');
console.log('Slow Ride: meeting and Tin Road checks passed.');

// The HUD reads the transient tank state, in the same place as the bellows.
for (const onFoot of [true, false]) {
  for (const [gas, holes] of [[undefined, undefined], [100, 0], [79, 1], [40, 2], [0, 3]]) {
    const stepState = Object.freeze(gas === undefined ? {} : {gas, holes});
    const worldJob = {job: {steps: [step], stepIndex: 0, stepState}, actors: [truck]};
    const before = JSON.stringify(worldJob);
    const hud = worldHudModel({worldJob, onFoot});
    assert.deepEqual(hud.gas, {value: gas ?? 100, max: 100, holes: holes ?? 0});
    assert.equal(hud.truck, null, 'Gas replaces health only for Slow Ride.');
    const removed = [], properties = {}, attributes = {};
    const gauge = {style: {setProperty: (key, value) => {properties[key] = value;}},
      classList: {remove: (...names) => removed.push(...names)},
      setAttribute: (key, value) => {attributes[key] = value;}};
    const bar = {style: {}}, label = {}, note = {};
    drawGasGauge(hud.gas, gauge, bar, label, note);
    assert.equal(label.textContent, 'GAS');
    assert.equal(bar.style.width, `${(gas ?? 100).toFixed(1)}%`);
    assert.equal(note.textContent, `${gas ?? 100} / 100. ${holes ?? 0} ${(holes ?? 0) === 1 ? 'hole' : 'holes'} open.`);
    assert.equal(attributes['aria-label'], `Gas is ${gas ?? 100} out of 100. ${holes ?? 0} ${(holes ?? 0) === 1 ? 'hole' : 'holes'} open.`);
    assert.deepEqual(removed, ['is-out', 'is-losing', 'is-flashing']);
    assert.equal(properties['--ember-glow'], ((gas ?? 100) / 100).toFixed(2));
    assert.equal(JSON.stringify(worldJob), before, 'The gauge never changes the tank.');
  }
}
const oldEscort = {...step, gasLoad: false};
const oldHud = worldHudModel({worldJob: {job: {steps: [oldEscort], stepIndex: 0, stepState: {}}, actors: [truck]}});
assert.deepEqual(oldHud.truck, {value: 100, max: 100});
assert.equal(oldHud.gas, null);
assert.equal(worldHudModel().gas, null);
const emptyHealth = {...truck, health: 0};
const moving = stepEscort(step, {gasLoaded: true, gas: 73, holes: 1}, {actors: [emptyHealth]}, .1);
assert.equal(moving.state.gas, 73);
assert.equal(moving.state.holes, 1);
assert.equal(followSpeed(moving.requests), step.speed, 'The obsolete health rule cannot stop Slow Ride.');
assert.equal(stepEscort(oldEscort, {}, {actors: [emptyHealth]}, .1).state.rested, true,
  'The shared escort still rests at zero health.');
console.log('Slow Ride: gas gauge and health isolation checks passed.');

const total = metresAtPlace(step.path, step.path.length - 1);
assert.equal(step.blocks.length, 3);
for (const [index, block] of step.blocks.entries()) {
  assert.ok(Math.abs(block.metres / total - GAS_LOAD_RULE.blockShares[index]) < 1e-10);
  assert.ok(Math.abs(alongPath(step.path, block).metres - block.metres) < 1e-8);
  assert.equal(block.car, index === 1);
}
assert.deepEqual(step.barriers.map(barrier => barrier.id), [step.blocks[0].id, step.blocks[2].id]);
assert.equal(step.waitingActors[0].id, step.blocks[1].id);
assert.equal(step.waitingActors[0].gasBlockCar, true);
assert.equal(step.waitingActors[1].gasBlockRider, true);
const knowledge = createKnowledge();
learn(knowledge, {car:step.carStart, ...jobFacts({job:{steps:[step], stepIndex:0}})});
assert.equal(knowledge.barricades.size, 3, 'All blocks are on the map from the start.');
const flame = id => ({id, kind:'barricade', burnable:true, flame:true});
let blocks = {gasLoaded:true};
const blockTick = (along, dt, facts = {}) => {
  const out = gasLoadBlocks(step, blocks, facts, along, dt);
  blocks = out.state;
  return out;
};
const first = step.blocks[0];
assert.equal(blockTick(first.metres - 30, 1).speed, 5, 'The mover is capped before the stop.');
assert.equal(blockTick(first.metres - 25, .1).speed, 0);
assert.equal(blocks.stoppedBlock, first.id);
for (let second = 0; second < 3; second++) {
  const out = blockTick(first.metres - 25, 1, {thingsHit:[flame(first.id), flame(first.id)]});
  assert.equal(out.events.length, 0, 'Multiple flame contacts cannot burn faster.');
}
const burnt = blockTick(first.metres - 25, 1, {thingsHit:[flame(first.id)]});
assert.deepEqual(burnt.events, [{type:'burn', id:first.id}]);
assert.equal(burnt.speed, 0);
for (let second = 0; second < 7; second++) assert.equal(blockTick(first.metres - 25, 1).speed, 0);
assert.equal(blockTick(first.metres - 25, 1).speed, step.speed, 'Moving off takes eight seconds after removal.');
const parked = step.blocks[1];
blockTick(0, .1, {carContacts:[{id:parked.id, kmh:19.99}]});
assert.ok(!blocks.clearedBlocks.includes(parked.id));
blockTick(0, .1, {carContacts:[{id:parked.id, kmh:20}]});
assert.ok(blocks.clearedBlocks.includes(parked.id));
blocks = {gasLoaded:true};
const clearEarly = blockTick(0, 4, {thingsHit:step.barriers.map(barrier => flame(barrier.id)),
  carContacts:[{id:parked.id, kmh:20}]});
assert.equal(clearEarly.state.clearedBlocks.length, 3);
for (let along = 0; along < total; along += step.speed) {
  assert.equal(blockTick(along, 1).speed, step.speed, 'Cleared early means Bess never stops.');
  assert.equal(blocks.stoppedBlock, null);
}
const hotDelivery = burnBarricades(step.barriers, {}, [flame(first.id)], 0);
assert.deepEqual(hotDelivery.events, [{type:'burn', id:first.id}], 'Hot Delivery keeps its immediate burn.');
assert.deepEqual(burnBarricades(step.barriers, {}, [{...flame(first.id), flame:false}], 10, 4).events, []);
console.log('Slow Ride: blocks, burn times, hard knocks, map and moving-off checks passed.');

// Step the existing simulation at staged contacts. This is no drive route.
const duel = new Duel({seed:7, featureFlags:{'hidden-road':true, arsenal:true}});
duel.state.wastelandGateDiscovered = true;
assert.equal(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:7,
  cpuDifficulty:'easy', opponents:[], job:definition}), true);
duel.state.status = 'racing';
duel.setInput({throttle:0, brake:1, steer:0});
const world = duel.state.arena.worldJob;
world.job.stepState = {gasLoaded:true, gas:100, holes:0};
duel.step(.01);
assert.equal(world.solidGrid.barricades.length, 2, 'Both timber blocks use the existing solid grid.');
const parkedActor = world.actors.find(actor => actor.id === parked.id);
assert.ok(parkedActor?.renderCar, 'The parked driver is a real car actor.');
assert.ok(worldJobHitTargets(duel).some(target => target.id === first.id && target.burnable));
const knock = kmh => {
  world.carContacts = [{actor:parkedActor, kmh, nx:Math.sin(parked.heading), nz:Math.cos(parked.heading)}];
  duel.step(.01);
};
knock(19.99);
assert.equal(parkedActor.ramRetreat, undefined, 'A soft touch leaves the parked car in place.');
assert.ok(!world.job.stepState.clearedBlocks.includes(parked.id));
duel.state.worldJobThingsHit = [{id:parked.id, flame:true, damage:100}];
duel.step(.01);
assert.equal(parkedActor.health, 100, 'Flame cannot replace the designed hard knock.');
knock(20);
assert.ok(world.job.stepState.clearedBlocks.includes(parked.id));
assert.ok(parkedActor.ramRetreat, 'The knocked driver uses the existing ram retreat.');
assert.ok(parkedActor.speed > 0, 'The knocked car drives away.');
const fenceHit = flame(first.id);
for (let tick = 0; tick < 481; tick++) {
  duel.state.worldJobThingsHit = [fenceHit];
  duel.step(1 / 120);
}
assert.ok(world.job.stepState.burntBarricades.includes(first.id));
assert.equal(world.solidGrid.barricades.length, 1, 'The burnt block leaves the shared solid grid.');
console.log('Slow Ride: shared car contacts, retreat, flame targets and solids checks passed.');

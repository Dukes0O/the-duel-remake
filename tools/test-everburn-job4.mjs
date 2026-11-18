// Slow Ride rules, without a scripted drive or persistent storage.
import assert from 'node:assert/strict';
import {EVERBURN_JOBS, REMADE_EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {GAS_LOAD_RULE, GAS_LOAD_LINES} from '../src/world/jobs/gas-load-rule.js';
import {stepEscort} from '../src/world/jobs/steps/escort.js';
import {worldHudModel, drawGasGauge} from '../src/world/world-hud.js';

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

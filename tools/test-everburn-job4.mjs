// Slow Ride rules, without a scripted drive or persistent storage.
import assert from 'node:assert/strict';
import {EVERBURN_JOBS, REMADE_EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {GAS_LOAD_RULE, GAS_LOAD_LINES} from '../src/world/jobs/gas-load-rule.js';

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

import assert from 'node:assert/strict';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {worldHudModel} from '../src/world/world-hud.js';

const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-hot-delivery');
const step = definition.steps[0], pickup = step.pickup.place.position;
assert.equal(Math.hypot(step.carStart.x - step.origin.position.x, step.carStart.z - step.origin.position.z), 40);
assert.ok(Math.abs(step.carStart.heading - Math.PI / 2) < 1e-9);
let job = createJob(definition, 19);
const view = (x, z, speedKmh = 0) => ({player: {position: {x, z}}, speedKmh});
const hud = () => worldHudModel({worldJob: {job, definition}, player: {x: step.carStart.x, z: step.carStart.z}});
job = stepJob(job, view(step.carStart.x, step.carStart.z), 5);
assert.equal(job.stepState.loaded, undefined);
assert.equal(hud().ember, null);
assert.equal(hud().target.id, 'cinder');
job = stepJob(job, view(pickup.x, pickup.z, 10), 1);
assert.equal(job.stepState.pickingUp, undefined);
job = stepJob(job, view(pickup.x + 8.1, pickup.z), 1);
assert.equal(job.stepState.pickingUp, undefined);
job = stepJob(job, view(pickup.x + 7.9, pickup.z), .1);
const lines = job.requests.filter(request => request.type === 'say').map(request => request.lineId);
for (let i = 0; i < 100 && !job.stepState.loaded; i++) {
  job = stepJob(job, view(pickup.x, pickup.z), .1);
  lines.push(...job.requests.filter(request => request.type === 'say').map(request => request.lineId));
  if (!job.stepState.loaded) assert.equal(hud().ember, null);
}
assert.deepEqual(lines, step.pickup.lines);
assert.equal(job.stepState.loaded, true);
assert.ok(hud().ember.value > 99);
assert.equal(hud().target.id, 'tin-town');
console.log('Hot Delivery pickup: start, stop, three lines and ember passed.');

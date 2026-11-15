import assert from 'node:assert/strict';
import * as THREE from 'three';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {worldHudModel, worldMapFrame} from '../src/world/world-hud.js';
import {brazierSpotsFor, createBraziers, createCinderFigure} from '../src/world/ember-pot.js';
import {LAND} from '../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {pushOutOfSolids} from '../src/world/scablands-solids.js';
import {riverDepthAt} from '../src/world/scablands-regions.js';

const definition = EVERBURN_JOBS.find(job => job.id === 'everburn-hot-delivery');
const step = definition.steps[0], pickup = step.pickup.place.position;
assert.deepEqual(step.braziers.map(b => b.id), ['yard-brazier', 'halfway-brazier', 'wash-brazier']);
for (const [index, brazier] of step.braziers.entries()) {
  const p = brazier.position, named = LAND.at(['yard', 'safe-road', 'the-wash'][index]);
  assert.ok(Math.hypot(p.x - named.x, p.z - named.z) <= 9.000001);
  assert.equal(p.y, scablandsSurfaceHeightAt(p.x, p.z));
  assert.equal(pushOutOfSolids(p.x, p.z, 1, undefined, p.y).hit, null);
}
assert.ok(riverDepthAt(step.braziers[2].position.x, step.braziers[2].position.z) > 0);
for (let i = 0; i < 3; i++) {
  assert.deepEqual({x:step.braziers[i].position.x, z:step.braziers[i].position.z}, brazierSpotsFor(step)[i]);
}
const braziers = createBraziers(3);
braziers.place(step.braziers.map(b => b.position));
braziers.group.updateMatrixWorld(true);
assert.equal(braziers.group.children.length, 3);
for (const [index, stand] of braziers.group.children.entries()) {
  const position = step.braziers[index].position;
  assert.deepEqual(stand.position.toArray(), [position.x, position.y, position.z]);
  const smoke = stand.getObjectByName('Brazier smoke column');
  assert.ok(smoke);
  const bounds = new THREE.Box3().setFromObject(smoke);
  assert.ok(Math.abs(bounds.min.y - position.y) < 1e-9);
  assert.ok(Math.abs(bounds.max.y - position.y - 40) < 1e-9);
  assert.ok(Math.abs((bounds.min.x + bounds.max.x) / 2 - position.x) < 1e-9);
  assert.ok(Math.abs((bounds.min.z + bounds.max.z) / 2 - position.z) < 1e-9);
}
braziers.dispose();
const figure = createCinderFigure();
assert.equal(figure.name, 'Cinder at the yard gate');
assert.ok(figure.children.some(child => child.isMesh));
assert.ok(Math.hypot(pickup.x - brazierSpotsFor(step)[0].x, pickup.z - brazierSpotsFor(step)[0].z) < 3);
assert.equal(Math.hypot(step.carStart.x - step.origin.position.x, step.carStart.z - step.origin.position.z), 40);
assert.ok(Math.abs(step.carStart.heading - Math.PI / 2) < 1e-9);
let job = createJob(definition, 19);
const view = (x, z, speedKmh = 0) => ({player: {position: {x, z}}, speedKmh});
const hud = () => worldHudModel({worldJob: {job, definition}, player: {x: step.carStart.x, z: step.carStart.z}});
job = stepJob(job, view(step.carStart.x, step.carStart.z), 5);
assert.equal(job.stepState.loaded, undefined);
assert.equal(hud().ember, null);
assert.equal(hud().target.id, 'cinder');
const worldJob = {job, definition, actors: [{id: 'rider', ambushKey: 'camp', position: {x: pickup.x, z: pickup.z}}]};
const state = {s: 0, lateral: 0, arena: {mode: 'world-job', worldJob}};
const course = {worldAt: () => ({x: step.carStart.x, z: step.carStart.z, heading: step.carStart.heading})};
const frame = () => worldMapFrame({state, course, model: worldHudModel({worldJob}), knowledge: {}, picture: {}, canvas: null});
assert.equal(frame().target.id, 'cinder');
assert.deepEqual(frame().actors, []);
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
worldJob.job = job;
assert.equal(frame().actors.length, 1);
assert.ok(hud().ember.value > 99);
assert.equal(hud().target.id, 'tin-town');
// Exercise the real job step with each brazier, including interrupted stops and an out ember.
job.stepState = {...job.stepState, ember: 0, out: true};
for (const brazier of step.braziers) {
  const {x, z} = brazier.position;
  job = stepJob(job, view(x + 8.1, z), 3);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
  job = stepJob(job, view(x, z), 2);
  job = stepJob(job, view(x, z, -2), 1);
  job = stepJob(job, view(x, z), 2);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
  const before = job.stepState.ember;
  const wasOut = job.stepState.out;
  job = stepJob(job, view(x, z), 1);
  assert.ok(Math.abs(job.stepState.ember - Math.min(100, before - (wasOut ? 0 : step.ember.coldPerSecond) + 25)) < 1e-9);
  assert.equal(job.stepState.out, false);
  assert.deepEqual(job.events.filter(event => event.type === 'emberRelit').map(event => event.place), [brazier.id]);
  job = stepJob(job, view(x, z), 4);
  assert.ok(!job.events.some(event => event.type === 'emberRelit'));
}
assert.deepEqual(job.stepState.scoopedBraziers, step.braziers.map(b => b.id));
assert.equal(job.stepState.relights, 1);
console.log('Hot Delivery pickup: start, stop, three lines and ember passed.');

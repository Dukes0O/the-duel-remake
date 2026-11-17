import assert from 'node:assert/strict';
import {worldHudModel, worldHudStep} from '../src/world/world-hud.js';
import {EMBER_SCOOP, EMBER_RULE} from '../src/world/jobs/ember-rule.js';
import {stepCarry} from '../src/world/jobs/steps/carry.js';

{
  const fire = {id:'test-fire', position:{x:0,z:0}};
  const step = {kind:'carry', ember:EMBER_RULE, destination:{position:{x:100,z:0}}, braziers:[fire]};
  const worldJob = {job:{steps:[step], stepIndex:0, stepState:{loaded:true, ember:0, out:true}}};
  const model = (x, speedKmh = 0) => worldHudModel({worldJob, player:{x,z:0}, speedKmh});
  assert.equal(model(60).line, 'Stop beside the fire for three seconds to relight the pot.');
  assert.notEqual(model(60.01).line, model(60).line);
  const view = {player:{position:{x:0,z:0}}, speedKmh:0};
  worldJob.job.stepState = stepCarry(step, worldJob.job.stepState, view, EMBER_SCOOP.seconds - .01).state;
  assert.equal(worldJob.job.stepState.out, true);
  assert.equal(model(0).line, 'Relighting: hold still.');
  assert.equal(model(0, 2).line, 'Stop beside the fire for three seconds to relight the pot.');
  assert.equal(model(20).line, 'Stop beside the fire for three seconds to relight the pot.');
  worldJob.job.stepState = stepCarry(step, worldJob.job.stepState, view, .01).state;
  assert.equal(worldJob.job.stepState.out, false);
  assert.notEqual(model(0).line, 'Relighting: hold still.');
}

const place = (id, x, z, name = id) => ({id, name, position: {x, z}});
const target = place('tin-town', 10, 0, 'Tin Town');
const actors = [{id: 'raider', position: {x: 4, z: 0}}, {id: 'truck', position: {x: 3, z: 2}}];
const cases = [
  [{kind: 'reach', place: target}, 'Drive to Tin Town', target],
  [{kind: 'carry', load: 'ember', destination: target}, 'Carry ember to Tin Town', target],
  [{kind: 'chase', targetId: 'raider', actor: {id: 'raider'}}, 'Catch raider', actors[0]],
  [{kind: 'escort', actorId: 'truck', actor: {id: 'Big Bess'}, destination: target}, 'Keep Big Bess safe to Tin Town', target],
  [{kind: 'onfoot', places: [target], returnToCar: place('car', 0, 0)}, 'Walk to Tin Town', target],
  [{kind: 'heist', takeId: 'valve-key', zone: target, escapePlace: place('car', 0, 0)}, 'Take valve key', target],
  [{kind: 'rescue', people: [place('prospector', 6, 0)], home: target}, 'Rescue prospector', place('prospector', 6, 0)],
  [{kind: 'defend', place: target}, 'Defend Tin Town', target],
  [{kind: 'explore', finds: [place('flag', 8, 0, 'survey flag')]}, 'Find survey flag', place('flag', 8, 0, 'survey flag')],
];
for (const [step, line, expectedTarget] of cases) {
  const view = worldHudStep(step, {actors, inventory: [], found: []}, [target]);
  assert.equal(view.line, line, `${step.kind} line`);
  assert.deepEqual(view.target, {id: expectedTarget.id ?? null,
    name: expectedTarget.name ?? expectedTarget.id?.replaceAll('-', ' ') ?? 'the marked place',
    x: expectedTarget.position?.x ?? expectedTarget.x, z: expectedTarget.position?.z ?? expectedTarget.z}, `${step.kind} marker`);
  const point = expectedTarget.position ?? expectedTarget;
  const bearing = (Math.atan2(point.x, point.z) * 180 / Math.PI + 360) % 360;
  const model = worldHudModel({worldJob: {definition: {}, actors, inventory: [],
    job: {steps: [step], stepIndex: 0}}, player: {x: 0, z: 0}, places: [target]});
  assert.equal(model.bearing, bearing, `${step.kind} compass bearing`);
  assert.equal(model.arrow, bearing, `${step.kind} compass arrow`);
}

assert.equal(worldHudStep(cases[5][0], {stepState: {phase: 'return'}}, [target]).line, 'Carry valve key to your car', 'heist changes from taking the key to returning to the car');
assert.equal(worldHudStep(cases[5][0], {stepState: {phase: 'escape'}}, [target]).line, 'Drive to car', 'heist points to its escape goal after reaching the car');
assert.equal(worldHudStep(cases[4][0], {stepState: {index: 1}}, [target]).line, 'Return to your car', 'on-foot steps move to the car after the last marked place');
assert.equal(worldHudStep(cases[6][0], {stepState: {rescued: 1}}, [target]).line, 'Bring everyone to Tin Town', 'rescue points home after collecting the required passengers');
assert.equal(worldHudStep(cases[7][0], {found: ['tin-town']}, [target]).line, 'Defend Tin Town', 'defence line does not change when location is found');
const explore = worldHudStep(cases[8][0], {found: ['flag'], stepState: {index: 1}}, [target]);
assert.equal(explore.line, 'Explore the Scablands', 'exploration names its completed state');
assert.equal(explore.target, null);

const job = {definition: {finds: [place('crate', 0, 10, 'Old crate')]}, actors, inventory: [],
  job: {steps: [{kind: 'reach', place: target}], stepIndex: 0}};
const before = JSON.stringify(job);
const model = worldHudModel({worldJob: job, player: {x: 0, z: 0},
  found: ['crate'], places: [target]});
assert.equal(model.line, 'Drive to Tin Town');
assert.equal(model.bearing, 90);
assert.equal(model.arrow, 90);
assert.deepEqual(model.finds.map(item => [item.id, item.found]), [['crate', true]]);
assert.equal(JSON.stringify(job), before, 'HUD model reads job and find state without changing it');
console.log('PASS world-hud: next lines, goal markers, compass bearing, and read-only found ticks for each job step kind');

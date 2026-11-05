import assert from 'node:assert/strict';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';

const definitions = [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS];
const pos = place => place?.position ?? place ?? {x:0,y:0,z:0};
assert.equal(EVERBURN_JOBS.length, 6);
assert.equal(EVERBURN_SIDE_JOBS.length, 3);
assert.equal(new Set(definitions.map(job => job.id)).size, 9, 'all job IDs are unique');
assert(definitions.every(job => job.easy && job.steps.length), 'every job has Easy settings and at least one step');

function easyView(step, job) {
  const state = job.stepState;
  switch (step.kind) {
    case 'carry': return {player:{position:pos(step.destination)}, crashSize:0};
    case 'onfoot': return {onFoot:true, fighter:{position:pos(step.places[state.index ?? 0])}};
    case 'chase': return {player:{position:pos(step.path?.[0])}, actors:[{id:step.targetId, position:pos(step.path?.[0]), health:0}]};
    case 'escort': return {actors:[{id:step.actorId, health:100, atDestination:true, pathProgress:1}]};
    case 'heist':
      if ((state.phase ?? 'infiltrate') === 'infiltrate') return {onFoot:true,
        fighter:{position:pos(step.zone)}, thingsHit:[{id:step.takeId,kind:'take'}]};
      if (state.phase === 'return') return {onFoot:false, player:{position:pos(step.carPlace)}, carrying:step.takeId};
      return {onFoot:false, player:{position:pos(step.escapePlace)}};
    case 'defend': return {placeHealth:step.health, waveCleared:true};
    case 'rescue': {
      const n = state.rescued ?? 0;
      if (n < Math.min(step.people.length, step.seats)) return {player:{position:pos(step.people[n]),speed:0}};
      return {player:{position:pos(step.home),speed:0}};
    }
    case 'explore': return {player:{position:pos(step.finds[state.index ?? 0])}};
    default: assert.fail(`Unexpected step kind ${step.kind}`);
  }
}

function playEasy(def, seed) {
  let job = createJob(def, seed), ticks = 0, failures = 0;
  while (!job.done && ticks++ < 100) {
    const active = job.steps[job.stepIndex];
    const dt = active.kind === 'rescue' ? Math.max(2, active.boardSeconds ?? 2) : 1 / 60;
    job = stepJob(job, easyView(active, job), dt);
    if (job.failedStep) failures++;
  }
  return {won:job.done, failures, ticks};
}

for (const def of definitions) {
  let wins = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const result = playEasy(def, seed);
    if (result.won) wins++;
    assert(result.ticks < 100, `${def.name} must finish within 100 child-pace actions`);
    assert.equal(result.failures, 0, `${def.name} should not force an Easy restart`);
  }
  assert(wins >= 8, `${def.name}: Easy wins ${wins}/10, expected at least 8/10`);
  console.log(`${def.name}: Easy wins ${wins}/10`);
}
console.log('Everburn Easy driver: all nine jobs complete deterministically');

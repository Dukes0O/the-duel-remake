import assert from 'node:assert/strict';
import { createJob, stepJob } from '../src/world/jobs/job-engine.js';

const pos = (x, z = 0) => ({ x, y: 0, z });
const tick = (job, view = {}, dt = 1 / 60) => stepJob(job, view, dt);
function advance(job, views, dt = 1 / 60) { for (const view of views) job = tick(job, view, dt); return job; }

// Reach gates on foot when requested and completes only inside its radius.
let job = createJob({ lineId: 'go', steps: [{ kind: 'reach', place: { id: 'gate', position: pos(2) }, radius: 1, onFoot: true }] }, 9);
job = tick(job, { player: { position: pos(0) }, onFoot: true });
assert.equal(job.done, false);
job = tick(job, { player: { position: pos(2) }, onFoot: true });
assert.equal(job.done, true);
assert.equal(job.lineId, 'go');
assert(job.events.some(event => event.type === 'done'));

// Carry spills on a hard crash and restarts this step; burnable barriers emit a deterministic event.
job = createJob({ steps: [{ kind: 'carry', load: 'ember', origin: pos(0), destination: pos(10), crashLimit: 5, burnable: true }] }, 1);
let next = tick(job, { player: { position: pos(0) }, crashSize: 6 });
assert.equal(next.failedStep, true);
assert(next.events.some(event => event.type === 'spilled'));
job = tick(next, { player: { position: pos(10) }, thingsHit: [{ id: 'fence', kind: 'barricade', burnable: true }] });
assert(job.events.some(event => event.type === 'burn'));
assert.equal(job.done, true);

// Chase warns and restarts when the leash is broken, then catches by health or contact.
job = createJob({ steps: [{ kind: 'chase', targetId: 'runner', leashDistance: 20, path: [pos(0)] }] });
next = tick(job, { player: { position: pos(0) }, actors: [{ id: 'runner', position: pos(30), health: 1 }] });
assert.equal(next.failedStep, true);
assert(next.events.some(event => event.type === 'say'));
job = tick(next, { player: { position: pos(0) }, actors: [{ id: 'runner', position: pos(2), health: 0 }] });
assert.equal(job.done, true);

// Escort gets one rest at zero health; the next breakdown restarts its leg.
job = createJob({ steps: [{ kind: 'escort', actorId: 'bess', path: [pos(0)], destination: pos(10) }] });
next = tick(job, { actors: [{ id: 'bess', health: 0 }] });
assert(next.events.some(event => event.type === 'rest'));
job = tick(next, { actors: [{ id: 'bess', health: 0 }] });
assert.equal(job.failedStep, true);
job = tick(job, { actors: [{ id: 'bess', health: 40, pathProgress: 1 }] });
assert.equal(job.done, true);

// On-foot steps restart after a knockdown and count each lit or used place.
job = createJob({ steps: [{ kind: 'onfoot', places: [{ id: 'lamp', position: pos(1), action: 'light' }] }] });
next = tick(job, { onFoot: true, fighter: { position: pos(0), knockedDown: true } });
assert.equal(next.failedStep, true);
job = tick(next, { onFoot: true, fighter: { position: pos(1) } });
assert.equal(job.done, true);
assert(job.events.some(event => event.type === 'lit'));

// Heist alarm adds a wave but never fails; the taken load leaves at 70% walking speed.
job = createJob({ steps: [{ kind: 'heist', takeId: 'key', zone: { position: pos(0), radius: 3 }, carPlace: pos(10), escapePlace: pos(20), walkSpeed: 10, lamps: undefined }] });
next = tick(job, { onFoot: true, fighter: { position: pos(0) }, lamps: [{ position: pos(-1), direction: { x: 1, z: 0 }, range: 5 }] });
assert.equal(next.failedStep, false);
assert(next.events.some(event => event.type === 'alarm'));
job = tick(next, { onFoot: true, fighter: { position: pos(0) }, thingsHit: [{ id: 'key', kind: 'take' }] });
assert(job.events.some(event => event.type === 'taken'));
job = tick(job, { onFoot: true, fighter: { position: pos(5) }, carrying: 'key' });
assert(job.requests.some(request => request.type === 'follow' && request.speed === 7));
job = tick(job, { onFoot: false, player: { position: pos(10) }, carrying: 'key' });
job = tick(job, { onFoot: false, player: { position: pos(20) }, carrying: 'key' });
assert.equal(job.done, true);

// Rescue waits while stopped, boards at most the available seats and returns home.
job = createJob({ steps: [{ kind: 'rescue', people: [{ id: 'one', position: pos(0) }, { id: 'two', position: pos(1) }, { id: 'three', position: pos(2) }], seats: 2, boardSeconds: 2, home: pos(10) }] });
job = tick(job, { player: { position: pos(0), speed: 0 } }, 1);
job = tick(job, { player: { position: pos(0), speed: 0 } }, 1);
assert(job.events.some(event => event.type === 'rescued'));
job = tick(job, { player: { position: pos(1), speed: 0 } }, 2);
assert.equal(job.stepState.rescued, 2);
job = tick(job, { player: { position: pos(10), speed: 0 } });
assert.equal(job.done, true);

// Defence restarts the failed wave and advances only when a wave clears.
job = createJob({ steps: [{ kind: 'defend', place: pos(0), health: 10, waveCount: 2 }] });
next = tick(job, { placeHealth: 0 });
assert.equal(next.failedStep, true);
assert(next.events.some(event => event.type === 'waveRestarted'));
job = tick(next, { placeHealth: 10, waveCleared: true });
assert.equal(job.stepState.wave, 1);
job = tick(job, { placeHealth: 10, waveCleared: true });
assert.equal(job.done, true);

// Explore visits all finds in order and has no failure path, even after knockdown.
job = createJob({ steps: [{ kind: 'explore', finds: [{ id: 'flag', position: pos(0), hint: 'north' }, { id: 'crate', position: pos(10) }] }] });
job = tick(job, { player: { position: pos(0) }, fighter: { knockedDown: true } });
assert(job.events.some(event => event.type === 'found' && event.id === 'flag'));
assert.equal(job.failedStep, false);
job = tick(job, { player: { position: pos(10) } });
assert.equal(job.done, true);

function replay(fps) {
  let state = createJob({ steps: [
    { kind: 'rescue', people: [{ id: 'p', position: pos(0) }], boardSeconds: 1, home: pos(1) },
    { kind: 'explore', finds: [{ id: 'f', position: pos(2) }] },
  ] }, 12345);
  const events = [];
  const dt = 1 / fps;
  for (let frame = 0; frame < fps; frame++) { state = tick(state, { player: { position: pos(0), speed: 0 } }, dt); events.push(...state.events); }
  state = tick(state, { player: { position: pos(1), speed: 0 } }, dt); events.push(...state.events);
  state = tick(state, { player: { position: pos(2), speed: 0 } }, dt); events.push(...state.events);
  return { done: state.done, stepIndex: state.stepIndex, events };
}
assert.deepEqual(replay(30), replay(60));
assert.deepEqual(replay(60), replay(144));

assert.throws(() => createJob({ steps: [{ kind: 'missing' }] }), /Unknown job step/);
assert.throws(() => tick(createJob({ steps: [] }), {}, -1), /non-negative/);
console.log('World job engine: all step scenarios and repeatability checks passed');

import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {pageFunctions, pageSource} from './scenarios/story-talk.mjs';
import {speechPlacement, talkCameraPose} from '../src/story/talk-view.js';
import {Duel} from '../src/game.js';
import {startTalk, actOnTalk, talkScreen} from '../src/story/talk.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';

const give = {id: 'gift', words: 'Take one. No terms.',
  effects: [{type: 'stock', stock: 'embers', by: -1}, {type: 'mark', id: 'gift-on-the-road'}],
  plain: {stock: 'embers', before: 4, after: 3, secret: 'dace-might-steal'}, thought: 'Kindness travels.'};
const askEffects = [{type: 'mark', id: 'knows-the-ford'}];
const scene = {stocks: {embers: 4, feud: 3},
  lines: [{speaker: 'rell', words: 'One ember.'}, {speaker: 'auntie-solder', words: 'Four nights.', radio: true}],
  thoughts: ['Three nights left.', 'It freezes tonight.'],
  questions: [{id: 'road', words: 'Which road?', lines: [{speaker: 'rell', words: 'The ford.', low: true}], effects: askEffects},
    {id: 'camp', needs: ['road'], words: 'Where do you camp?', lines: [{speaker: 'rell', words: 'At the Wash.'}]}],
  choices: [give, {id: 'locked', needs: ['apprentice'], words: 'Send the apprentice.', effects: []}]};
const advance = {type: 'advance'};
const select = index => ({type: 'select', index});

let run = startTalk(scene);
const screen = () => talkScreen(scene, run);
function act(action) {
  const result = actOnTalk(scene, run, action);
  run = result.state;
  return result.choice;
}
assert.equal(screen().line.speaker, 'rell');
assert.deepEqual(screen().history.map(line => line.words), ['One ember.']);
assert.deepEqual(screen().options, []);
act(select(0));
assert.equal(run.phase, 'lines');
act(advance);
assert.equal(screen().line.radio, true);
act(advance);
assert.deepEqual(screen().thoughts, ['Three nights left.']);
act(advance);
assert.deepEqual(screen().thoughts, scene.thoughts);
act(advance);
assert.deepEqual(screen().options.map(opt => opt.words), ['Which road?', give.words]);
assert.deepEqual(screen().options[1], {kind: 'say', words: give.words, plain: {stock: 'embers', before: 4, after: 3}, thought: give.thought});
assert.deepEqual(screen().stocks, {embers: 4});
assert.doesNotMatch(JSON.stringify(screen()), /apprentice|secret|dace-might-steal|gift-on-the-road|knows-the-ford|feud/);
assert.equal(act(select(2)), undefined);
assert.equal(act(select(0)), undefined);
assert.equal(screen().line.low, true);
assert.deepEqual(screen().stocks, {embers: 4});
act(advance);
assert.deepEqual(screen().options.map(opt => opt.words), ['Where do you camp?', give.words]);
assert(talkScreen(scene, run, ['apprentice']).options.some(opt => opt.words === 'Send the apprentice.'));
assert.deepEqual(act(select(1)), {id: give.id, effects: give.effects, asked: ['road'], questionEffects: askEffects});
assert.equal(act(select(1)), undefined);
assert.throws(() => startTalk({...scene, thoughts: ['x'.repeat(261)]}), /260/);

const fixture = {id: 'gate-talk', steps: [{kind: 'talk', scene, branches: {gift: 'after-the-gift'}},
  {kind: 'reach', id: 'other-path', place: {position: {x: 0, y: 0, z: 0}}},
  {kind: 'reach', id: 'after-the-gift', place: {position: {x: 100, y: 0, z: 100}}}]};
let job = createJob(fixture);
for (const action of [null, advance, advance, advance, advance, select(1)]) job = stepJob(job, {talkAction: action}, 0);
assert.equal(job.stepIndex, 2);
assert.equal(job.talkResult.id, 'gift');
assert.deepEqual(job.talkResult.effects, give.effects);

const duel = new Duel({seed: 19, featureFlags: {enabled: key => ['hidden-road', 'story-choices'].includes(key)}});
duel.state.wastelandGateDiscovered = true;
const args = {venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed: 19, opponents: [], job: fixture};
const off = new Duel({seed: 19});
off.state.wastelandGateDiscovered = true;
assert.equal(off.startArenaEvent(args), false);
assert.equal(duel.startArenaEvent(args), true);
duel.state.countdown = 0;
duel.step(.01);
duel.setInput({throttle: 1, boost: true});
duel.state.speedMph = 20;
const world = duel.state.arena.worldJob;
const locationAndClocks = () => [duel.state.s, duel.state.lateral, duel.state.stageTimeSec, duel.state.totalTimeSec, world.clockSec];
const frozen = locationAndClocks();
duel.step(.02);
const firstScreen = world.job.stepState.screen;
assert.equal(world.storySpeaker, 'rell');
for (let tick = 0; tick < 240; tick++) duel.step(1 / 60);
assert.deepEqual(locationAndClocks(), frozen);
function send(action, expected = world.job.stepState.screen) {
  assert.equal(duel.talkInput(action, expected), true);
  assert.equal(duel.talkInput(action, expected), false);
  duel.step(.01);
}
send(advance);
assert.equal(world.storySpeaker, null, 'the radio line is not attached to a person in the world');
assert.equal(duel.talkInput(advance, firstScreen), false, 'a stale input cannot skip a new line');
for (let tick = 0; tick < 3; tick++) send(advance);
assert.deepEqual(world.job.stepState.screen.options.map(item => item.words), ['Which road?', give.words]);
send(select(1));
assert.deepEqual(locationAndClocks(), frozen);
assert.equal(world.job.talkResult.id, 'gift');
assert.equal(world.job.stepIndex, 2);
duel.step(.02);
assert(duel.state.stageTimeSec > frozen[2]);
// Keyboard state must cross the mode boundary safely even if the old driving
// key was held on entry and released under the speech bubble.
const memory = new Map();
globalThis.localStorage = {getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v))};
globalThis.window = new EventTarget();
window.location = {search: ''};
globalThis.Element = class {};
globalThis.cancelAnimationFrame = () => {};
const app = new App();
app.audio.unlock = () => {};
app.duel.featureFlags = duel.featureFlags;
app.profile = {...app.profile, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
app.duel.state.wastelandGateDiscovered = true;
const oneChoice = {kind: 'talk', scene: {choices: [{id: 'leave', words: 'Go.'}]}};
assert.equal(app.duel.startArenaEvent({...args, job: {steps: [oneChoice, fixture.steps[2]]}}), true);
app.duel.state.countdown = 0;
app.duel.step(.01);
function key(type, code) {
  window.dispatchEvent(Object.assign(new Event(type, {cancelable: true}), {code, repeat: false}));
}
key('keydown', 'KeyW');
app._applyInput(.02);
assert.equal(app.duel.state.input.throttle, 1);
app.duel.step(.02);
assert(!app.keys.KeyW && app.duel.state.input.throttle === 0, 'entry clears car and keyboard input');
key('keyup', 'KeyW');
const appWorld = app.duel.state.arena.worldJob;
assert(app.duel.talkInput(select(0), appWorld.job.stepState.screen));
app.duel.step(.02);
app._applyInput(.02);
assert.equal(app.duel.state.input.throttle, 0, 'the car does not drive after leaving the conversation');
app.dispose();

for (const [x, y] of [[0, 0], [320, 200], [100, 150]]) {
  const p = speechPlacement({x, y}, 320, 200, 160, 44);
  assert(p.left >= 0 && p.left + 160 <= 320 && p.top >= 0 && p.top + 44 <= 200);
  assert(Math.abs(p.left + p.tail - Math.max(10, Math.min(310, x))) <= 4);
}
const shot = talkCameraPose({x: 0, y: 0, z: 0}, {x: 0, y: 1.6, z: 4}, true);
assert(shot.position.z < 0 && shot.position.x > 0 && shot.target.z === 4);
for (const name of Object.keys(pageFunctions)) pageSource(name);
console.log('Story talk passed. Dialogue order, questions, hidden effects, branch selection and frozen world verified.');

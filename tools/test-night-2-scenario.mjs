import assert from 'node:assert/strict';
import {setImmediate as turn} from 'node:timers/promises';
import {advanceNight2Dialogue, pageSource} from './scenarios/story-night-2.mjs';

// Use the scenario's actual page expressions. The game may already have
// accepted a click while the menu or WebGL render still shows the old frame.
const scene = {id: 'gate'};
const rendered = {hidden: false, dataset: {}, text: '', querySelectorAll: () => []};
const world = {job: {steps: [scene], stepIndex: 0, stepState: {}}};
const stage = {status: 'menu'};
const button = {textContent: 'Create temporary player ready for Night 2', hidden: false, disabled: false};
let panel = [], ticks = 0, advanceModelAt = Infinity, advanceFrameAt = Infinity, revision = 0;
const words = ['First line.', 'Repeat this line.', 'Repeat this line.', 'Last line.'];
const clicked = [];
const setState = (phase, index) => {
  world.job.stepState.screen = phase === 'thoughts' ? {phase, thoughts: words.slice(0, index + 1)} : {phase, line: {words: words[index]}};
};
const showFrame = (phase, index) => {
  rendered.dataset = {phase, scene: 'gate', turn: String(++revision)};
  rendered.text = words[index];
};
let phase = 'lines', index = 0, waitingPolls = 0;
const continueButton = {click() {
  assert.equal(rendered.text, words[index], 'the scenario clicks the presented line');
  assert.equal(world.talkAction, null, 'one click can be pending');
  clicked.push(index);
  world.talkAction = {type: 'advance'};
  advanceModelAt = ticks + 2;
  advanceFrameAt = ticks + 5;
}};
rendered.querySelector = selector => {
  if (selector === '.story-words') return {textContent: rendered.text};
  if (selector === '.story-thoughts') return {lastElementChild: {textContent: rendered.text}};
  if (selector === '.story-talk-controls button:first-child') return continueButton;
  throw new Error('Unexpected selector ' + selector);
};
globalThis.window = {__qaApp: {duel: {state: stage}}, __render: {}};
globalThis.document = {
  querySelectorAll: selector => selector === 'details button' ? panel : [],
  querySelector: selector => selector === '.story-talk:not([hidden])' ? rendered : null,
};
const context = {
  evaluate: async source => new Function('return (' + source + ')')(),
  async waitFor(source) {
    for (let tries = 0; tries < 100; tries++) {
      if (await this.evaluate(source)) return;
      waitingPolls++;
      await turn();
      ticks++;
      if (ticks === 4) panel = [button];
      if (ticks === advanceModelAt) {
        world.talkAction = null;
        if (++index < words.length) setState(phase, index);
      }
      if (ticks === advanceFrameAt && index < words.length) showFrame(phase, index);
    }
    throw new Error('Fixture timed out for ' + source);
  },
};
assert.equal(await context.evaluate(pageSource('ready')), false);
await context.waitFor(pageSource('ready'));
assert.equal(ticks, 4, 'the ready predicate waits for the late-mounted button');
button.disabled = true;
assert.equal(await context.evaluate(pageSource('ready')), false);
button.disabled = false;
stage.arena = {worldJob: world};
for (phase of ['lines', 'thoughts']) {
  index = 0;
  advanceModelAt = advanceFrameAt = Infinity;
  clicked.length = 0;
  world.talkAction = null;
  setState(phase, index);
  showFrame(phase, index);
  assert.equal(await context.evaluate(pageSource('renderedTurn', 'hearth', phase)), false);
  await advanceNight2Dialogue(context, 'gate', phase, words.length);
  assert.deepEqual(clicked, [0, 1, 2, 3]);
}
assert(waitingPolls >= 34, 'the real scenario waited through delayed model and delayed repaint');
delete globalThis.window;
delete globalThis.document;
console.log(`PASS Night 2 scenario planner: late mount, delayed and stale frames, repeated lines and thoughts, ${waitingPolls} asynchronous waits.`);

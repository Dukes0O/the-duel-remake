import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {TIN_TOWN_GATE} from '../src/world/tin-town-gate.js';
import {mountTalkView} from '../src/story/talk-view.js';

// Native EventTargets and a small document let the game request capture before
// the mounted conversation receives the browser's later pointerlockchange.
class TestElement extends EventTarget {
  constructor(doc) {
    super();
    this.ownerDocument = doc;
    this.children = [];
    this.classList = {add() {}, remove() {}, toggle() {}};
    this.style = {setProperty() {}};
    this.dataset = {};
    this.clientWidth = 800;
    this.clientHeight = 600;
    this.offsetWidth = 120;
    this.offsetHeight = 50;
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute() {}
  closest() { return null; }
  contains(other) { return this === other || this.children.some(node => node.contains?.(other)); }
  focus() { this.ownerDocument.activeElement = this; }
  remove() {}
}

globalThis.Element = TestElement;
globalThis.window = new EventTarget();
globalThis.document = Object.assign(new EventTarget(), {defaultView: window, pointerLockElement: null});
document.createElement = () => new TestElement(document);
document.createTextNode = text => ({textContent: text});
const stage = new TestElement(document), canvas = new TestElement(document), foreign = new TestElement(document);
stage.querySelector = selector => selector === '#view3d canvas' ? canvas : null;
canvas.closest = selector => selector === '#view3d canvas' ? canvas : null;
let grant, releases = 0, pauses = 0;
function lockChanged(element) {
  document.pointerLockElement = element;
  document.dispatchEvent(new Event('pointerlockchange'));
}
canvas.requestPointerLock = () => new Promise(resolve => {
  grant = () => { lockChanged(canvas); resolve(); };
});
document.exitPointerLock = () => { releases++; lockChanged(null); };
const app = Object.create(App.prototype);
Object.assign(app, {keys: {}, audio: {unlock() {}}, _footPointer: {lookX: 0, lookY: 0, fire: false, aim: false}});
app.togglePause = () => { pauses++; app.duel.state.paused = !app.duel.state.paused; };
app._bindKeys();
function requestWhileWalking() {
  assert(app.duel.state.onFoot && app.duel.state.status === 'racing' && !app.duel.state.paused);
  grant = null;
  const down = new Event('mousedown', {cancelable: true});
  Object.defineProperty(down, 'target', {value: canvas});
  Object.assign(down, {button: 0});
  window.dispatchEvent(down);
  assert.equal(typeof grant, 'function', 'the real game input requested the canvas lock');
}

const duel = new Duel({seed: 19, featureFlags: {enabled: id => ['hidden-road', 'story-choices'].includes(id)}});
duel.state.wastelandGateDiscovered = true;
const gate = {...TIN_TOWN_GATE, heading: 0};
const job = {id: 'gate', steps: [
  {kind: 'reach', position: gate, radius: 50, onFoot: true, bellowsFootStart: gate},
  {kind: 'talk', scene: {lines: [{speaker: 'rell', words: 'Wait here.'}]}},
  {kind: 'reach', position: {x: gate.x + 100, z: gate.z}, radius: 1},
]};
assert(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed: 19, opponents: [], job}));
duel.state.countdown = 0;
duel.step(.01);
app.duel = duel;
assert.equal(duel.state.arena.worldJob.job.stepIndex, 0);
requestWhileWalking();
duel.step(.02);
duel.step(.02);
assert.equal(duel.state.arena.worldJob.job.stepIndex, 1);
const page = duel.state.arena.worldJob.job.stepState.screen;
const view = mountTalkView(stage, (action, screen) => duel.talkInput(action, screen));
view.update(page, {x: .5, y: .4});
assert.equal(stage.children[0].hidden, false);
grant();
assert.equal(document.pointerLockElement, null, 'late gameplay capture must release the pointer for the open conversation');
assert.equal(releases, 1);
assert.equal(pauses, 0);
assert.equal(duel.state.paused, false);

view.update(null);
lockChanged(canvas);
view.update(page);
assert.equal(document.pointerLockElement, null, 'capture already held when talk opens also releases');
assert.equal(releases, 2);
lockChanged(foreign);
assert.equal(document.pointerLockElement, foreign, 'another interface keeps its own lock');
view.update(null);
view.update(page);
assert.equal(document.pointerLockElement, foreign, 'opening a conversation preserves a foreign lock');
assert.equal(releases, 2);
assert.equal(pauses, 0);
view.dispose();

// Leave the foreign interface, then capture and release through ordinary game input.
document.pointerLockElement = null;
assert(duel.talkInput({type: 'advance'}, page));
duel.step(.02);
assert.equal(duel.state.arena.worldJob.job.stepIndex, 2);
requestWhileWalking();
grant();
assert.equal(document.pointerLockElement, canvas);
document.exitPointerLock();
assert.equal(pauses, 1, 'manual release outside a conversation still pauses once');
app._inputEvents.abort();
console.log('Story input passed: late, already-held and foreign lock ownership, conversation pause and normal release.');

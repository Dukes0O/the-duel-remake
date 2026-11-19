import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {finishArenaEvent} from '../src/arena/arena-event.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';

let checks=0;const check=(value,label)=>{assert(value,label);checks++;};
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
globalThis.window=new EventTarget();window.location={search:''};
globalThis.Element=class{};
let scheduled=0,cancelled=0;globalThis.requestAnimationFrame=()=>++scheduled;globalThis.cancelAnimationFrame=()=>cancelled++;
const key=code=>{const event=new Event('keydown',{cancelable:true});Object.assign(event,{code,repeat:false});return event;};
const first=new App();let firstUnlocks=0,closed=0;first.audio.unlock=()=>firstUnlocks++;first.audio.context={close:()=>{closed++;return Promise.resolve();}};first.audio.setPaused=paused=>{first.audio.paused=paused;};
first.start();first.onFrame=()=>{};first.getMenuCourse();window.dispatchEvent(key('ArrowUp'));
check(first.keys.ArrowUp&&firstUnlocks===1&&first.running,'live App receives input and owns one frame loop');
const second=new App();let secondUnlocks=0;second.audio.unlock=()=>secondUnlocks++;
first.dispose();check(!first.running&&cancelled===1&&first.onFrame===null,'App disposal stops its frame loop and detaches its HUD callback');
check(first._menuCourses.size===0&&first.ghostRecorder===null&&first.audio.paused&&closed===1,'App disposal releases preview references and closes its audio context');
check(window.__game.duel===second.duel,'disposing an older App cannot remove the newer App debug handle');
window.dispatchEvent(key('ArrowRight'));window.dispatchEvent(new Event('pointerdown'));
check(firstUnlocks===1&&!first.keys.ArrowRight,'disposed keyboard and pointer listeners cannot reactivate audio or input');
check(secondUnlocks===2&&second.keys.ArrowRight,'the current App still receives keyboard and pointer input');
second.dispose();check(window.__game===undefined,'disposing the current owner removes its debug handle');
check(!second.running&&cancelled===2,'a current App without a started loop still disposes safely');
console.log(`App lifecycle: ${checks} frame, input, audio and debug ownership checks passed.`);

// Use the existing real App bindings and EventTarget fixture; no browser or saves.
const originalDocument = globalThis.document;
let requests = 0;
class Canvas extends Element {
  closest(selector) { return selector === '#view3d canvas' ? this : null; }
  requestPointerLock() { requests++; throw Error('Pointer lock refused'); }
}
const canvas = new Canvas();
globalThis.document = new EventTarget();
document.pointerLockElement = null;
const inputApp = Object.create(App.prototype);
Object.assign(inputApp, {
  duel: {state: {onFoot: true, paused: false, status: 'racing'}}, audio: {unlock() {}}, keys: {},
  _footPointer: {lookX: 0, lookY: 0, fire: false, aim: false},
  _keyboardSteering: {reset() {}}, _arenaKeyboardSteering: {reset() {}},
  _keyboardThrottle: {reset() {}}, togglePause() { this.duel.state.paused = true; }
});
inputApp._bindKeys();
const mouse = (type, button, movementX = 0, movementY = 0, target = canvas) => {
  const event = new Event(type, {cancelable: true});
  Object.defineProperty(event, 'target', {value: target});
  Object.assign(event, {button, movementX, movementY});
  window.dispatchEvent(event);
  return event;
};
try {
  const outside = new Element(); outside.closest = () => null;
  assert.equal(inputApp.footMouseHint, 'Click the picture to capture the mouse.');
  assert(!mouse('mousedown', 0, 0, 0, outside).defaultPrevented);
  mouse('mousemove', 0, 400, 400, outside);
  assert.equal(inputApp._footPointer.lookX, 0);
  assert.equal(requests, 0);
  mouse('mousemove', 0, 12, -7);
  check(inputApp._footPointer.lookX === 12 && inputApp._footPointer.lookY === -7,
    'mouse look works over the live canvas before locking or firing a round');
  mouse('mousedown', 2);
  check(requests === 1 && inputApp._footPointer.aim && !inputApp._footPointer.fire,
    'right-click alone activates aim and tries to capture the mouse without shooting');
  assert.match(inputApp.footMouseHint, /unavailable.*picture/);
  mouse('mousedown', 0);
  check(inputApp._footPointer.aim && inputApp._footPointer.fire,
    'left-click fires while the right mouse button remains held');
  mouse('mouseup', 0);
  check(inputApp._footPointer.aim && !inputApp._footPointer.fire,
    'releasing fire preserves the held aim button');
  mouse('mousedown', 0); mouse('mouseup', 2);
  check(!inputApp._footPointer.aim && inputApp._footPointer.fire,
    'releasing aim preserves the held fire button');
  mouse('mouseup', 0);
  const measured = (pixels, target) => {
    inputApp._footPointer.lookX = inputApp._footPointer.lookY = 0;
    for (const delta of pixels) mouse('mousemove', 0, delta, -delta, target);
    return [inputApp._footPointer.lookX, inputApp._footPointer.lookY];
  };
  assert.deepEqual(measured([400], canvas), [400,-400]);
  assert.deepEqual(measured([100,100,100,100], canvas), [400,-400]);
  let pending = 0; canvas.requestPointerLock = () => { pending++; };
  mouse('mousedown', 0); mouse('mousedown', 2);
  assert.equal(pending, 1, 'Clicks during the same pending request keep the original gesture.');
  document.dispatchEvent(new Event('pointerlockerror'));
  assert.match(inputApp.footMouseHint, /unavailable.*picture/);
  mouse('mousedown', 0);
  assert.equal(pending, 2);
  document.pointerLockElement = canvas;
  document.dispatchEvent(new Event('pointerlockchange'));
  assert.equal(inputApp.footMouseHint, 'Esc frees the mouse');
  assert.deepEqual(measured([400], outside), [400,-400]);
  document.exitPointerLock = () => { document.pointerLockElement = null; document.dispatchEvent(new Event('pointerlockchange')); };
  window.dispatchEvent(key('Escape'));
  assert.equal(document.pointerLockElement, null);
  assert.equal(inputApp.duel.state.paused, true);
  assert.equal(inputApp.footMouseHint, '');
  assert.equal(inputApp._footPointer.fire || inputApp._footPointer.aim, false);
  inputApp.duel.state.paused = false;
  assert.equal(inputApp.footMouseHint, 'Click the picture to capture the mouse.');
  // STORY-NIGHT-2-FLOW: with story-choices on, Esc while captured only frees the mouse; Esc once it is free pauses.
  inputApp.duel.featureFlags = {enabled: id => id === 'story-choices'};
  inputApp.activeInputContext = () => 'foot';
  inputApp._inputAction = action => { if (action === 'pause') inputApp.togglePause(); };
  document.pointerLockElement = canvas;
  document.dispatchEvent(new Event('pointerlockchange'));
  assert.equal(inputApp.footMouseHint, 'Esc frees the mouse');
  const freeing = key('Escape'); window.dispatchEvent(freeing);
  assert.equal(document.pointerLockElement, null);
  check(freeing.defaultPrevented && inputApp.duel.state.paused === false,
    'Esc while the picture holds the mouse frees it and the game keeps running');
  window.dispatchEvent(key('Escape'));
  check(inputApp.duel.state.paused === false, 'the same press, arriving again just after the release, does not pause');
  inputApp._footPointerReleasedAt = -Infinity;
  window.dispatchEvent(key('Escape'));
  check(inputApp.duel.state.paused === true, 'Esc once the mouse is free pauses');
  inputApp.duel.state.paused = false;
  delete inputApp.duel.featureFlags; delete inputApp.activeInputContext; delete inputApp._inputAction;
  for (const next of [{paused:true}, {onFoot:false}, {status:'menu'}]) {
    Object.assign(inputApp.duel.state,{onFoot:true, paused:false, status:'racing'});
    mouse('mousedown',0);
    assert.equal(inputApp._footPointer.capture, 'requesting');
    Object.assign(inputApp.duel.state,next);
    const stateBeforeGrant = {...inputApp.duel.state};
    document.pointerLockElement = canvas;
    document.dispatchEvent(new Event('pointerlockchange'));
    assert.equal(document.pointerLockElement, null, 'A late grant must release the game canvas.');
    assert.equal(inputApp._footPointer.capture, null);
    assert.equal(inputApp._footPointer.fire || inputApp._footPointer.aim, false);
    assert.deepEqual(inputApp.duel.state, stateBeforeGrant);
  }
  Object.assign(inputApp.duel.state,{onFoot:true, paused:false, status:'racing'});
  document.pointerLockElement = outside;
  document.dispatchEvent(new Event('pointerlockchange'));
  const otherEscape = key('Escape'); window.dispatchEvent(otherEscape);
  assert.equal(document.pointerLockElement, outside);
  assert.equal(otherEscape.defaultPrevented, false);
  assert.equal(inputApp.duel.state.paused, false);
  document.pointerLockElement = null;
  document.dispatchEvent(new Event('pointerlockchange'));
  inputApp.duel.state.paused = true;
  const look = inputApp._footPointer.lookX;
  mouse('mousedown', 2); mouse('mousemove', 0, 9, 9);
  check(!inputApp._footPointer.aim && inputApp._footPointer.lookX === look,
    'paused gameplay cannot aim, fire or consume mouse look');
  inputApp.duel.state.paused = false;
  inputApp.duel.state.status = 'menu';
  const captures = requests;
  mouse('mousedown', 2); mouse('mousedown', 0); mouse('mousemove', 0, 9, 9);
  check(requests === captures && !inputApp._footPointer.aim && !inputApp._footPointer.fire &&
      inputApp._footPointer.lookX === look,
    'returning to the menu keeps stale onFoot state from capturing or accepting mouse input');
  inputApp.duel.state.status = 'racing';
  mouse('mousedown', 2); mouse('mousedown', 0);
  window.dispatchEvent(new Event('blur'));
  check(!inputApp._footPointer.aim && !inputApp._footPointer.fire && inputApp.duel.state.paused,
    'losing focus clears both held buttons and pauses');
  inputApp._inputEvents.abort(); inputApp.duel.state.paused = false;
  mouse('mousedown', 0);
  check(!inputApp._footPointer.fire, 'disposed mouse handlers cannot fire again');
  // The game can finish a job while the player is still on foot and holding the mouse.
  document.querySelector = () => null;
  for (const lockAtFinish of [canvas, outside]) {
    const app = new App(), duel = app.duel, state = duel.state;
    try {
      duel.featureFlags = createFeatureFlags({storage:null, overrides:{'hidden-road':true,'story-everburn':true,arsenal:true}});
      state.wastelandGateDiscovered = true;
      assert(duel.startArenaEvent({venueId:'scablands', mode:'world-job', car:'falcone_f42', seed:1989, opponents:[], job:EVERBURN_JOBS[2]}));
      Object.assign(state, {status:'racing',countdown:0}); duel.step(1/120);
      assert.equal(state.onFoot, true);
      let releases = 0, pauses = 0;
      const pause = app.togglePause.bind(app);
      app.togglePause = () => { pauses++; pause(); };
      const lock = element => {
        document.pointerLockElement = element;
        document.dispatchEvent(new Event('pointerlockchange'));
      };
      canvas.requestPointerLock = () => lock(canvas);
      document.exitPointerLock = () => { releases++; lock(null); };
      mouse('mousedown', 0); mouse('mousedown', 2);
      assert.equal(app.footMouseHint, 'Esc frees the mouse');
      if (lockAtFinish === outside) lock(outside);
      finishArenaEvent(duel, 'job-complete', 'player');
      assert.equal(state.status, 'arena_result');
      assert.equal(document.pointerLockElement, lockAtFinish === canvas ? null : outside);
      assert.equal(releases, lockAtFinish === canvas ? 1 : 0);
      assert.equal(pauses, 0);
      assert.equal(state.paused, false);
      assert.equal(app.footMouseHint, '');
      assert.equal(!!(app._footPointer.capture || app._footPointer.fire || app._footPointer.aim), false);
    } finally {
      document.pointerLockElement = null;
      app.dispose();
    }
  }
} finally {
  inputApp._inputEvents.abort();
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}
console.log('Mouse aim/fire, pre-shot look, delayed capture and both arena-result lock owners passed.');

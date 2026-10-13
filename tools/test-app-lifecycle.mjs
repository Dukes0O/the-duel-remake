import assert from 'node:assert/strict';
import {App} from '../src/app.js';

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
const mouse = (type, button, movementX = 0, movementY = 0) => {
  const event = new Event(type, {cancelable: true});
  Object.defineProperty(event, 'target', {value: canvas});
  Object.assign(event, {button, movementX, movementY});
  window.dispatchEvent(event);
};
try {
  mouse('mousemove', 0, 12, -7);
  check(inputApp._footPointer.lookX === 12 && inputApp._footPointer.lookY === -7,
    'mouse look works over the live canvas before locking or firing a round');
  mouse('mousedown', 2);
  check(requests === 1 && inputApp._footPointer.aim && !inputApp._footPointer.fire,
    'right-click alone activates aim and tries to capture the mouse without shooting');
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
} finally {
  inputApp._inputEvents.abort();
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
}
console.log('Mouse aim/fire chord and pre-shot look acceptance passed.');

import assert from 'node:assert/strict';
import { INPUT_CONTEXTS, keyboardAction, heldInput, gamepadEdgeActions,
  carGamepadDrive, preventCarKeyDefault } from '../src/input-contexts.js';
import { App } from '../src/app.js';

globalThis.cancelAnimationFrame ??= () => {};

assert.deepEqual(Object.keys(INPUT_CONTEXTS), ['car', 'menu', 'foot', 'photo']);
assert.equal(keyboardAction('car', 'KeyD'), 'camera:chase');
assert.equal(keyboardAction('foot', 'KeyD'), null, 'D strafes on foot and cannot change car camera');
assert.equal(heldInput('foot', 'right', { KeyD: true }), true);
assert.equal(keyboardAction('car', 'Digit1'), 'weapon:ufo');
assert.equal(keyboardAction('foot', 'Digit1'), 'gear:1');
assert.equal(keyboardAction('photo', 'Digit1'), null, 'photo mode cannot fire a car weapon');
assert.equal(keyboardAction('menu', 'Escape'), 'menu-back');
assert.equal(keyboardAction('photo', 'Space'), 'photo-capture');
assert.equal(heldInput('car', 'throttle', { KeyW: true }), true);
assert.equal(heldInput('car', 'throttle', { KeyD: true }), false);
assert.equal(heldInput('car', 'boost', { Space: true }), true);

const pressed = Array(16).fill(false), previous = Array(16).fill(false);
for (const index of [9, 3, 5, 4, 12, 15, 13, 14]) pressed[index] = true;
assert.deepEqual(gamepadEdgeActions('car', pressed, previous), [
  'pause', 'camera-cycle', 'shift-up', 'shift-down',
  'weapon:ufo', 'weapon:bomb', 'weapon:crossbow', 'weapon:star',
], 'simultaneous controller edges retain the existing car action order');
assert.deepEqual(gamepadEdgeActions('car', pressed, pressed), [], 'held buttons cannot retrigger');
assert.deepEqual(gamepadEdgeActions('foot', pressed, previous), [
  'pause', 'gear:1', 'gear:2', 'gear:3',
], 'foot gear buttons cannot fire car weapons');
assert.deepEqual(gamepadEdgeActions('menu', pressed, previous), ['camera-cycle']);

const buttons = Array.from({ length: 16 }, () => ({ value: 0 }));
buttons[7].value = .63;
buttons[6].value = .18;
assert.deepEqual(carGamepadDrive({ axes: [.12], buttons }, pressed),
  { throttle: .63, brake: .18, steer: 0, boost: false });
assert.ok(Math.abs(carGamepadDrive({ axes: [.56], buttons }, pressed).steer - .5) < 1e-12);
assert.equal(preventCarKeyDefault('Space', true), false, 'focused buttons keep their Space click');
assert.equal(preventCarKeyDefault('Space', false), true);
assert.equal(preventCarKeyDefault('ArrowRight'), true);
assert.equal(preventCarKeyDefault('KeyD'), false);

const app = new App();
assert.equal(app.activeInputContext(), 'menu');
app.keys = { ArrowUp: true, ArrowLeft: true };
app._readGamepad = () => ({ throttle: 1, brake: 0, steer: 1, boost: true });
app._applyInput(1 / 60);
assert.equal(app.duel.state.input.throttle, 0, 'menu keys and gamepad cannot drive the car');
assert.equal(app.duel.state.input.steer, 0, 'menu arrows cannot steer the car');
app.keys = { ArrowUp: true };
app.setInputContext('foot');
assert.equal(app.activeInputContext(), 'foot');
assert.deepEqual(app.keys, {}, 'a mode change releases held car keys');
let autopilotCalls = 0;
app.autopilot = true;
app._driveAutopilot = () => { autopilotCalls++; };
app._applyInput(1 / 60);
assert.equal(autopilotCalls, 0, 'foot context cannot drive the car, even in demo mode');
app.setInputContext(null);
assert.equal(app.activeInputContext(), 'menu');
assert.throws(() => app.setInputContext('unknown'), /Unknown input context/);
app.dispose();

console.log('Input contexts: car, menu, foot and photo mappings, controller edges, pedals and focused-button Space passed.');

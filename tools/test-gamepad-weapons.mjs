import assert from 'node:assert/strict';
import { App } from '../src/app.js';

// Exercise the real App adapter without a browser or any player's saves.
const saved = new Map();
globalThis.localStorage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, String(value)),
};
globalThis.window = new EventTarget();
window.location = { search: '' };
globalThis.Element = class {};
globalThis.cancelAnimationFrame = () => {};

const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
const pad = { connected: true, axes: [0], buttons };
let connected = true;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { getGamepads: () => connected ? [pad] : [] },
});

const app = new App();
app.audio.unlock = () => {};
app.audio.setPaused = () => {};
app.startCampaign({ mode: 'wasteland', startStage: 0, seed: 1989 });
app.duel.state.status = 'racing';
app.duel.state.paused = false;
const fired = [];
app.duel.onChange((_, event) => {
  if (event.weaponFired) fired.push(event.weaponFired);
});
let checks = 0;
const equal = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks++;
};
const setButton = (index, pressed) => {
  buttons[index].pressed = pressed;
  buttons[index].value = pressed ? 1 : 0;
};

// Standard gamepads report D-pad Up/Down/Left/Right as buttons 12/13/14/15.
// Map the four weapons clockwise from Up in the keyboard's 1-4 order.
const dpad = [[12, 'ufo'], [15, 'bomb'], [13, 'crossbow'], [14, 'star']];
for (const [button, weapon] of dpad) {
  app.duel.state.combat.cooldowns[weapon] = 0;
  const before = fired.length;
  setButton(button, true);
  equal(app._readGamepad(), { throttle: 0, brake: 0, steer: 0, boost: false },
    `${weapon}: D-pad does not alter driving inputs`);
  equal(fired.slice(before), [weapon], `${weapon}: D-pad fires once on press`);
  for (let poll = 0; poll < 4; poll++) {
    app.duel.state.combat.cooldowns[weapon] = 0;
    app._readGamepad();
  }
  equal(fired.length, before + 1, `${weapon}: holding D-pad does not repeat fire`);
  setButton(button, false);
  app._readGamepad();
  app.duel.state.combat.cooldowns[weapon] = 0;
  setButton(button, true);
  app._readGamepad();
  equal(fired.slice(before), [weapon, weapon], `${weapon}: a second press can fire again`);
  setButton(button, false);
  app._readGamepad();
}

const baseline = fired.length;
app.duel.state.combat.cooldowns.bomb = 0;
app.duel.state.paused = true;
setButton(15, true);
app._readGamepad();
equal(fired.length, baseline, 'D-pad cannot fire while paused');
app.duel.state.paused = false;
app._readGamepad();
equal(fired.length, baseline, 'unpausing a held D-pad does not fire late');
setButton(15, false);
app._readGamepad();

app.startCampaign({ mode: 'duel', startStage: 0, seed: 1989 });
app.duel.state.status = 'racing';
setButton(12, true);
app._readGamepad();
equal(fired.length, baseline, 'D-pad cannot fire weapons outside Wasteland');
setButton(12, false);
app._readGamepad();

connected = false;
setButton(14, true);
app._readGamepad();
equal(fired.length, baseline, 'a disconnected pad cannot fire');
app.dispose();
console.log(`Gamepad weapons: ${checks} memory-only D-pad, press-edge, pause, mode and disconnect checks passed.`);

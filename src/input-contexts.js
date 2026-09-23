import { CAMERA_KEYS } from './camera-views.js';

const cameras = Object.fromEntries(Object.entries(CAMERA_KEYS).map(([key, mode]) => [key, `camera:${mode}`]));
const carKeyboard = Object.freeze({
  Escape: 'pause', KeyP: 'pause', ...cameras,
  Digit1: 'weapon:ufo', Digit2: 'weapon:bomb', Digit3: 'weapon:crossbow', Digit4: 'weapon:star',
  KeyM: 'mute', KeyR: 'restart', KeyE: 'shift-up', KeyQ: 'shift-down',
});
const carGamepad = Object.freeze([
  [9, 'pause'], [3, 'camera-cycle'], [5, 'shift-up'], [4, 'shift-down'],
  [12, 'weapon:ufo'], [15, 'weapon:bomb'], [13, 'weapon:crossbow'], [14, 'weapon:star'],
]);
const carHeld = Object.freeze({
  throttle: Object.freeze(['ArrowUp', 'KeyW']),
  brake: Object.freeze(['ArrowDown', 'KeyS']),
  steerLeft: Object.freeze(['ArrowLeft']),
  steerRight: Object.freeze(['ArrowRight']),
  boost: Object.freeze(['Space']),
});

// Foot and photo controls are reserved here before those modes are built.
// They cannot accidentally fire a car weapon or move the car when activated.
export const INPUT_CONTEXTS = Object.freeze({
  car: Object.freeze({ keyboard: carKeyboard, gamepad: carGamepad, held: carHeld }),
  menu: Object.freeze({ keyboard: Object.freeze({ Escape: 'menu-back', KeyM: 'mute', ...cameras }),
    gamepad: Object.freeze([[1, 'menu-back'], [0, 'menu-confirm'], [3, 'camera-cycle']]), held: Object.freeze({}) }),
  foot: Object.freeze({ keyboard: Object.freeze({ Escape: 'pause', KeyP: 'pause', KeyF: 'enter-car',
    Space: 'jump', Digit1: 'gear:1', Digit2: 'gear:2', Digit3: 'gear:3', KeyR: 'restart' }),
    gamepad: Object.freeze([[9, 'pause'], [2, 'enter-car'], [0, 'jump'], [7, 'fire'], [6, 'aim'],
      [12, 'gear:1'], [15, 'gear:2'], [13, 'gear:3']]),
    held: Object.freeze({ forward: Object.freeze(['KeyW']), back: Object.freeze(['KeyS']),
      left: Object.freeze(['KeyA']), right: Object.freeze(['KeyD']), sprint: Object.freeze(['ShiftLeft']) }) }),
  photo: Object.freeze({ keyboard: Object.freeze({ Escape: 'photo-exit', Space: 'photo-capture',
    ArrowUp: 'photo-forward', ArrowDown: 'photo-back', ArrowLeft: 'photo-left', ArrowRight: 'photo-right' }),
    gamepad: Object.freeze([[1, 'photo-exit'], [0, 'photo-capture']]), held: Object.freeze({}) }),
});

export function keyboardAction(context, code) {
  return INPUT_CONTEXTS[context]?.keyboard[code] ?? null;
}

export function heldInput(context, name, keys) {
  return INPUT_CONTEXTS[context]?.held[name]?.some(code => !!keys[code]) ?? false;
}

export function gamepadEdgeActions(context, pressed, previous) {
  const map = INPUT_CONTEXTS[context]?.gamepad;
  if (!map) return [];
  return map.filter(([index]) => pressed[index] && !previous[index]).map(([, action]) => action);
}

export function carGamepadDrive(pad, pressed) {
  const axis = pad.axes[0] || 0;
  return {
    throttle: pad.buttons[7]?.value || 0,
    brake: pad.buttons[6]?.value || 0,
    steer: Math.abs(axis) < 0.12 ? 0 : Math.sign(axis) * (Math.abs(axis) - 0.12) / 0.88,
    boost: !!pressed[0],
  };
}

export function preventCarKeyDefault(code, targetIsButton = false) {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)
    && !(code === 'Space' && targetIsButton);
}

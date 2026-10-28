import { CAMERA_CYCLE_KEY } from './camera-views.js';

const cameras = Object.freeze({ [CAMERA_CYCLE_KEY]: 'camera-cycle' });
const carKeyboard = Object.freeze({
  Escape: 'pause', KeyP: 'pause', ...cameras,
  Digit1: 'weapon:ufo', Digit2: 'weapon:bomb', Digit3: 'weapon:crossbow', Digit4: 'weapon:star',
  KeyM: 'mute', KeyE: 'shift-up', KeyQ: 'shift-down', KeyH: 'help',
  KeyU: 'deep-surface', // DEEP-EXPLORER: surface from anywhere in the dive
  KeyR: 'deep-ping', // DEEP-SIRENA-VIEW: the sonar; nothing happens unless the car is under water
});
const carGamepad = Object.freeze([
  [9, 'pause'], [8, 'help'], [3, 'camera-cycle'], [5, 'shift-up'], [4, 'shift-down'],
  [12, 'weapon:ufo'], [15, 'weapon:bomb'], [13, 'weapon:crossbow'], [14, 'weapon:star'],
  [1, 'deep-ping'],
]);
const carHeld = Object.freeze({
  throttle: Object.freeze(['ArrowUp', 'KeyW']),
  brake: Object.freeze(['ArrowDown', 'KeyS']),
  steerLeft: Object.freeze(['ArrowLeft']),
  steerRight: Object.freeze(['ArrowRight']),
  boost: Object.freeze(['Space']),
  interact: Object.freeze(['KeyF']),
});

// Foot and photo controls are reserved here before those modes are built.
// They cannot accidentally fire a car weapon or move the car when activated.
export const INPUT_CONTEXTS = Object.freeze({
  car: Object.freeze({ keyboard: carKeyboard, gamepad: carGamepad, held: carHeld }),
  menu: Object.freeze({ keyboard: Object.freeze({ Escape: 'menu-back', KeyM: 'mute', ...cameras }),
    gamepad: Object.freeze([[1, 'menu-back'], [0, 'menu-confirm'], [3, 'camera-cycle']]), held: Object.freeze({}) }),
  foot: Object.freeze({ keyboard: Object.freeze({ Escape: 'pause', KeyP: 'pause', KeyF: 'enter-car', KeyH: 'help',
    Space: 'jump', KeyC: 'foot-camera-cycle', Digit1: 'gear:1', Digit2: 'gear:2', Digit3: 'gear:3' }),
    gamepad: Object.freeze([[9, 'pause'], [8, 'help'], [2, 'enter-car'], [0, 'jump'], [7, 'fire'], [6, 'aim'],
      [12, 'gear:1'], [15, 'gear:2'], [13, 'gear:3']]),
    // On foot the arrows and WASD work like the car: up and down walk, left
    // and right turn (Kyle, 12 October 2026: the fighter could not turn).
    // Q and E strafe. The mouse still looks around.
    held: Object.freeze({ forward: Object.freeze(['KeyW', 'ArrowUp']), back: Object.freeze(['KeyS', 'ArrowDown']),
      turnLeft: Object.freeze(['KeyA', 'ArrowLeft']), turnRight: Object.freeze(['KeyD', 'ArrowRight']),
      left: Object.freeze(['KeyQ']), right: Object.freeze(['KeyE']),
      sprint: Object.freeze(['ShiftLeft', 'ShiftRight']),
      interact: Object.freeze(['KeyF']) }) }),
  // Kestrel One (docs/HELICOPTER.md section 4). W/S collective, arrows
  // cyclic, A/D pedals; H hook, P autopilot, C camera, Esc pause. The race
  // keys never reach the car while this context is active. H2 Fire: R
  // answers the radio (gamepad: the right shoulder, since Y is the camera),
  // and holding H pours while the bucket is fitted.
  heli: Object.freeze({ keyboard: Object.freeze({ Escape: 'pause', KeyH: 'heli-hook', KeyP: 'heli-autopilot',
    KeyC: 'heli-camera', KeyM: 'mute', Enter: 'heli-cruise', KeyR: 'heli-radio',
    KeyN: 'heli-map' /* MAP-VIEW: the pilot's map */ }),
    gamepad: Object.freeze([[9, 'pause'], [2, 'heli-hook'], [3, 'heli-camera'], [1, 'heli-autopilot'], [0, 'heli-cruise'], [5, 'heli-radio']]),
    held: Object.freeze({ liftUp: Object.freeze(['KeyW']), liftDown: Object.freeze(['KeyS']),
      pitchForward: Object.freeze(['ArrowUp']), pitchBack: Object.freeze(['ArrowDown']),
      rollLeft: Object.freeze(['ArrowLeft']), rollRight: Object.freeze(['ArrowRight']),
      yawLeft: Object.freeze(['KeyA']), yawRight: Object.freeze(['KeyD']), pour: Object.freeze(['KeyH']) }) }),
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
    interact: !!pressed[2],
  };
}

const stick = value => Math.abs(value || 0) >= .18 ? value : 0;

export function footGamepadInput(pad, pressed, dt = 1 / 120) {
  const moveX = stick(pad.axes[0]), moveY = stick(pad.axes[1]);
  const lookX = stick(pad.axes[2]), lookY = stick(pad.axes[3]);
  return {
    forward: moveY < 0, back: moveY > 0,
    left: moveX < 0, right: moveX > 0,
    sprint: !!pressed[10], jump: !!pressed[0], interact: !!pressed[2],
    // Fighter look values are mouse-pixel equivalents consumed at 120 Hz.
    lookX: lookX * 850 * dt, lookY: lookY * 850 * dt,
    fire: (pad.buttons[7]?.value || 0) > .2,
    aim: (pad.buttons[6]?.value || 0) > .2,
  };
}

export function footControlInput(keys, pad, pointer = {}) {
  return {
    forward: heldInput('foot', 'forward', keys) || !!pad.forward,
    back: heldInput('foot', 'back', keys) || !!pad.back,
    left: heldInput('foot', 'left', keys) || !!pad.left,
    right: heldInput('foot', 'right', keys) || !!pad.right,
    turnLeft: heldInput('foot', 'turnLeft', keys),
    turnRight: heldInput('foot', 'turnRight', keys),
    sprint: heldInput('foot', 'sprint', keys) || !!pad.sprint,
    jump: !!keys.Space || !!pad.jump,
    interact: heldInput('foot', 'interact', keys) || !!pad.interact,
    lookX: (pointer.lookX || 0) + (pad.lookX || 0),
    lookY: (pointer.lookY || 0) + (pad.lookY || 0),
    fire: !!pointer.fire || !!pad.fire,
    aim: !!pointer.aim || !!pad.aim,
  };
}

export function preventCarKeyDefault(code, targetIsButton = false) {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)
    && !(code === 'Space' && targetIsButton);
}

// Kestrel One's controls from the keyboard, and from a gamepad: left stick
// cyclic, right stick up and down collective, right stick left and right
// pedals (docs/HELICOPTER.md section 4). Each axis is -1..1.
export function heliControls(keys = {}, pad = null) {
  const axis = (plus, minus) => (heldInput('heli', plus, keys) ? 1 : 0) - (heldInput('heli', minus, keys) ? 1 : 0);
  const controls = {lift: axis('liftUp', 'liftDown'), pitch: axis('pitchForward', 'pitchBack'),
    roll: axis('rollRight', 'rollLeft'), yaw: axis('yawRight', 'yawLeft')};
  if (pad?.axes) {
    const choose = (key, value) => { if (Math.abs(value) > Math.abs(controls[key])) controls[key] = value; };
    choose('roll', stick(pad.axes[0]));
    choose('pitch', -stick(pad.axes[1]));
    choose('yaw', stick(pad.axes[2]));
    choose('lift', -stick(pad.axes[3]));
  }
  // Pouring water only while H (or the hook button) is held; absent otherwise.
  if (heldInput('heli', 'pour', keys) || pad?.buttons?.[2]?.pressed === true) controls.pour = true;
  return controls;
}

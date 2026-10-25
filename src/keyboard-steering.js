import {steeringYawAuthority, tyreSlipSteering} from './config.js';

// Keys supply the exact average of their ramp during each simulation step.
// Arenas keep their sharp controls; road input is gentler. Kyle, 14 October 2026:
// the 13 October road curve (30% start, 450 ms rise, 40% less at speed) steered
// too slowly for the car, so it starts at 55%, rises in 300 ms and gives up 30%.
export const KEYBOARD_STEERING_START = .55;
export const KEYBOARD_STEERING_RISE_SEC = .30;
export const KEYBOARD_STEERING_SPEED_DROP = .30;

export function keyboardSteeringDirection(keys) {
  return (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
}

export function keyboardSteeringLimit(speed) {
  const mph = Math.abs(Number.isFinite(speed) ? speed : 0);
  return 1 - KEYBOARD_STEERING_SPEED_DROP * Math.min(1, Math.max(0, (mph - 40) / 80));
}

export function createKeyboardSteering({arena = false} = {}) {
  const start = arena ? .78 : KEYBOARD_STEERING_START;
  const rise = arena ? .2 : KEYBOARD_STEERING_RISE_SEC;
  let direction = 0;
  let held = 0;
  const reset = () => {
    direction = 0;
    held = 0;
  };
  // Integral of the ramp, including any time beyond full authority.
  const area = time => start * time + (1 - start) * (time < rise
    ? time * time / (2 * rise) : time - rise / 2);
  return {
    reset,
    update(next, dt, speed = 0, rules = {}) {
      next = Number.isFinite(next) ? Math.sign(next) : 0;
      if (!next) {
        reset();
        return 0;
      }
      if (!Number.isFinite(dt) || dt <= 0) return 0;
      if (next !== direction) {
        direction = next;
        held = 0;
      }
      const limit = arena ? 1 : keyboardSteeringLimit(speed);
      if (held >= rise) return mapTyreSteering(direction * limit, speed, arena, rules);
      const end = held + dt;
      const average = (area(end) - area(held)) / dt;
      held = Math.min(rise, end);
      return mapTyreSteering(direction * Math.min(1, Math.max(start, average)) * limit, speed, arena, rules);
    },
  };
}

// Apply the approved speed ceiling after averaging the unchanged ramp.
// The race passes its latched rules; merely enabling an experimental switch
// elsewhere cannot change a running adapter. Throttle is a separate path.
function mapTyreSteering(value, speed, arena, rules) {
  const mph = Math.abs(Number.isFinite(speed) ? speed : 0);
  if (rules.tyreSlip !== true || arena || rules.course?.def?.arena === true || mph < 40) return value;
  const {grip = 1, traction = 1, car = null} = rules;
  const old = steeringYawAuthority(mph, grip, traction, car);
  const {steerGain} = tyreSlipSteering({speedMph: mph, grip, traction, car});
  return steerGain > 0 ? value * old / steerGain : 0;
}

export function createKeyboardThrottle() {
  const rise = .6;
  let held = 0;
  const reset = () => { held = 0; };
  const area = time => time < rise ? time * time / (2 * rise) : time - rise / 2;
  return {
    reset,
    update(pressed, dt) {
      if (!pressed) {
        reset();
        return 0;
      }
      if (!Number.isFinite(dt) || dt <= 0) return 0;
      if (held >= rise) return 1;
      const end = held + dt;
      const average = (area(end) - area(held)) / dt;
      held = Math.min(rise, end);
      return Math.min(1, Math.max(0, average));
    },
  };
}

// Keys supply the exact average of their ramp during each simulation step.
// Arenas keep their sharp controls; road input is gentler.
export const KEYBOARD_STEERING_START = .30;
export const KEYBOARD_STEERING_RISE_SEC = .45;

export function keyboardSteeringDirection(keys) {
  return (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
}

export function keyboardSteeringLimit(speed) {
  const mph = Math.abs(Number.isFinite(speed) ? speed : 0);
  return 1 - .4 * Math.min(1, Math.max(0, (mph - 40) / 80));
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
    update(next, dt, speed = 0) {
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
      if (held >= rise) return direction * limit;
      const end = held + dt;
      const average = (area(end) - area(held)) / dt;
      held = Math.min(rise, end);
      return direction * Math.min(1, Math.max(start, average)) * limit;
    },
  };
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

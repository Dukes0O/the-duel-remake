// One key steps through the useful driving views (Kyle, 13 October 2026).
export const CAMERA_CYCLE_KEY = 'KeyC';
export const CAMERA_MODES = Object.freeze(['chase', 'hood', 'wide', 'back']);
export const DIRECTIONAL_CAMERA_MODES = Object.freeze(['back']);

export function normalizeCameraMode(mode) {
  return CAMERA_MODES.includes(mode) ? mode : 'chase';
}

// The back view follows the car's actual heading, including reverse driving.
export function directionalCameraPose(mode, position, heading, tall = false) {
  if (mode !== 'back') return null;
  const reach = tall ? 13 : 10, sin = Math.sin(heading), cos = Math.cos(heading);
  return {
    position: {x: position.x - sin * reach, y: position.y + (tall ? 5.5 : 3.3), z: position.z - cos * reach},
    target: {x: position.x + sin * 3, y: position.y + (tall ? 1.9 : 1.05), z: position.z + cos * 3},
  };
}

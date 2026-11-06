import * as THREE from 'three';

export const MACHINE_CAMERA_MODES = Object.freeze(['chase', 'cab', 'work']);

/** Place a perspective camera around a machine without changing its state. */
export function updateMachineCamera(camera, definition, state, mode = 'chase', look = {}) {
  if (!camera?.position || !definition || !state || !Number.isFinite(state.x) || !Number.isFinite(state.z))
    throw new TypeError('A camera, machine definition and finite machine state are required.');
  const selected = MACHINE_CAMERA_MODES.includes(mode) ? mode : 'chase';
  const heading = Number.isFinite(state.heading) ? state.heading : 0;
  const sin = Math.sin(heading), cos = Math.cos(heading);
  let target;
  if (selected === 'cab') {
    camera.position.set(state.x + sin * 0.35, 2.25, state.z + cos * 0.35);
    target = new THREE.Vector3(state.x + sin * 10, 1.9, state.z + cos * 10);
  } else if (selected === 'work') {
    const tool = Object.values(definition.tools ?? {})[0];
    const local = tool ? new THREE.Vector3(...(tool.offset ?? [0, 0, 2])) : new THREE.Vector3(0, 0, 2);
    target = local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -heading).add(new THREE.Vector3(state.x, 1, state.z));
    const orbit = Number.isFinite(look.orbit) ? look.orbit : 0.55;
    const distance = Math.max(4, Math.min(14, Number.isFinite(look.distance) ? look.distance : 7));
    const height = Math.max(1.5, Math.min(8, Number.isFinite(look.height) ? look.height : 3.2));
    camera.position.set(target.x + Math.sin(heading + orbit) * distance, target.y + height,
      target.z + Math.cos(heading + orbit) * distance);
  } else {
    target = new THREE.Vector3(state.x, 1.1, state.z);
    const distance = Math.max(5, Math.min(18, Number.isFinite(look.distance) ? look.distance : 8));
    camera.position.set(state.x - sin * distance, 3.5, state.z - cos * distance);
  }
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return {mode: selected, target: {x:target.x, y:target.y, z:target.z}};
}

import * as THREE from 'three';

export const MACHINE_CAMERA_MODES = Object.freeze(['chase', 'cab', 'work']);

/** Place a perspective camera around a machine without changing its state. */
export function updateMachineCamera(camera, definition, state, mode = 'chase', look = {}) {
  if (!camera?.position || !definition || !state || !Number.isFinite(state.x) || !Number.isFinite(state.z))
    throw new TypeError('A camera, machine definition and finite machine state are required.');
  const selected = MACHINE_CAMERA_MODES.includes(mode) ? mode : 'chase';
  const heading = Number.isFinite(state.heading) ? state.heading : 0;
  const sin = Math.sin(heading), cos = Math.cos(heading), ground = Number.isFinite(state.y) ? state.y : 0;
  let target;
  if (selected === 'cab') {
    const yaw = heading + (definition.cabTurnsWith ? state.jointAngles?.[definition.cabTurnsWith] ?? 0 : 0);
    const eye = definition.cabEye ?? [0, 2.25, 0.35], s = Math.sin(yaw), c = Math.cos(yaw);
    camera.position.set(state.x + eye[0] * c + eye[2] * s, ground + eye[1], state.z + eye[2] * c - eye[0] * s);
    target = new THREE.Vector3(camera.position.x + s * 10, camera.position.y - 1.2, camera.position.z + c * 10);
  } else if (selected === 'work') {
    const tool = Object.values(definition.tools ?? {})[0];
    const local = tool ? new THREE.Vector3(...(tool.offset ?? [0, 0, 2])) : new THREE.Vector3(0, 0, 2);
    target = look.target ? new THREE.Vector3(look.target.x, look.target.y, look.target.z)
      : local.applyAxisAngle(new THREE.Vector3(0, 1, 0), heading).add(new THREE.Vector3(state.x, ground + 1, state.z));
    const orbit = Number.isFinite(look.orbit) ? look.orbit : 0.55;
    const distance = Math.max(4, Math.min(14, Number.isFinite(look.workDistance) ? look.workDistance : 7));
    const height = Math.max(1.5, Math.min(8, Number.isFinite(look.workHeight) ? look.workHeight : 3.2));
    const yaw = Math.atan2(target.x - state.x, target.z - state.z) + orbit;
    camera.position.set(target.x - Math.sin(yaw) * distance, target.y + height, target.z - Math.cos(yaw) * distance);
  } else {
    const ahead = Number.isFinite(look.ahead) ? look.ahead : 0;
    target = new THREE.Vector3(state.x + sin * ahead, ground + 1.6, state.z + cos * ahead);
    const distance = Math.max(5, Math.min(24, Number.isFinite(look.distance) ? look.distance : 8));
    const height = Number.isFinite(look.height) ? look.height : 3.5;
    camera.position.set(state.x - sin * distance, ground + height, state.z - cos * distance);
  }
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return {mode: selected, target: {x:target.x, y:target.y, z:target.z}};
}

import * as THREE from 'three';

export const TOWN_ZOOM = Object.freeze({street: 28, scablands: 1450});

export function createTownCamera({width = 1, height = 1, target = {x: 0, y: 0, z: 0}, zoom = 0.08} = {}) {
  const camera = new THREE.PerspectiveCamera(48, width / Math.max(1, height), 0.1, 9000);
  const state = {target: new THREE.Vector3(target.x, target.y, target.z), zoom: THREE.MathUtils.clamp(zoom, 0, 1), heading: 0};
  camera.userData.townView = state;
  updateTownCamera(camera);
  return camera;
}

export function updateTownCamera(camera, delta = 0) {
  const state = camera?.userData?.townView;
  if (!state) throw new TypeError('Choose a town camera first.');
  const distance = THREE.MathUtils.lerp(TOWN_ZOOM.street, TOWN_ZOOM.scablands, state.zoom);
  const elevation = THREE.MathUtils.lerp(18, distance * 0.72, state.zoom);
  const horizontal = Math.sqrt(Math.max(0, distance * distance - elevation * elevation));
  const desired = new THREE.Vector3(
    state.target.x + Math.sin(state.heading) * horizontal,
    state.target.y + elevation,
    state.target.z + Math.cos(state.heading) * horizontal,
  );
  if (delta > 0) camera.position.lerp(desired, 1 - Math.exp(-delta * 7));
  else camera.position.copy(desired);
  camera.lookAt(state.target);
  return camera;
}

export function moveTownCamera(camera, {forward = 0, right = 0, turn = 0, zoom = 0, delta = 1 / 60} = {}) {
  const state = camera?.userData?.townView;
  if (!state) throw new TypeError('Choose a town camera first.');
  state.heading += turn * delta * 1.8;
  state.zoom = THREE.MathUtils.clamp(state.zoom + zoom, 0, 1);
  const speed = THREE.MathUtils.lerp(18, 680, state.zoom) * delta;
  state.target.x += (Math.sin(state.heading) * forward + Math.cos(state.heading) * right) * speed;
  state.target.z += (Math.cos(state.heading) * forward - Math.sin(state.heading) * right) * speed;
  updateTownCamera(camera, delta);
  return state;
}

export function resizeTownCamera(camera, width, height) {
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}

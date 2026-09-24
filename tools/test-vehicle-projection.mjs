import assert from 'node:assert/strict';
import * as THREE from 'three';
import {projectVehicleMarkers} from '../src/render3d.js';

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -1);
camera.updateProjectionMatrix();

function vehicle(x, y, z, visible = true) {
  const object = new THREE.Group();
  object.position.set(x, y, z);
  object.visible = visible;
  return object;
}

const markers = projectVehicleMarkers(camera, [
  vehicle(0, -2, -10), vehicle(0, -2, 10),
  vehicle(100, -2, -10), vehicle(0, -2, -10, false),
]);
assert.deepEqual(markers.map(marker => marker.index), [0, 1, 2, 3]);
assert.equal(markers[0].visible, true, 'car ahead has an on-screen marker');
assert.ok(Math.abs(markers[0].x - 0.5) < 1e-6);
assert.ok(Math.abs(markers[0].y - 0.5) < 1e-6);
for (const marker of markers.slice(1)) {
  assert.equal(marker.visible, false, 'behind, off-screen and hidden cars do not draw markers');
  assert.ok(Number.isFinite(marker.x) && Number.isFinite(marker.y));
  assert.ok(marker.x >= 0 && marker.x <= 1 && marker.y >= 0 && marker.y <= 1);
}
console.log('Vehicle projection: visible, behind-camera, off-screen and hidden cases passed.');
